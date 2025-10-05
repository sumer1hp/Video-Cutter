class VideoCutter {
    constructor() {
        this.videoManager = new VideoManager();
        this.markersManager = new MarkersManager();
        this.segmentsManager = new SegmentsManager();
        this.uiManager = new UIManager();
        this.storageManager = new StorageManager();
        this.exportManager = new ExportManager();
        
        this.init();
    }

    async init() {
        this.bindEvents();
        this.loadFromStorage();
        this.updateDisplay();
        
        // Показываем информацию о загрузке FFmpeg
        this.uiManager.showLoading('Загрузка видеодвижка...');
        await this.waitForFFmpeg();
        this.uiManager.hideLoading();
    }

async waitForFFmpeg() {
    // Ждем загрузки FFmpeg до 15 секунд
    const maxWaitTime = 15000;
    const startTime = Date.now();
    
    while (!this.exportManager.isFFmpegLoaded && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!this.exportManager.isFFmpegLoaded) {
        console.warn('⚠️ FFmpeg не загрузился в течение 15 секунд');
        this.uiManager.showError('Не удалось загрузить видеодвижок. Некоторые функции могут быть недоступны.');
    } else {
        console.log('✅ FFmpeg успешно загружен');
    }
}
    bindEvents() {
        // Связываем менеджеры между собой
        this.videoManager.onTimeUpdate = (time) => {
            this.uiManager.updateTimeDisplay(time);
            this.uiManager.updateProgressBar(time, this.videoManager.getDuration());
        };

        this.videoManager.onVideoLoaded = () => {
            this.uiManager.initializeProgressBar();
            this.updateDisplay();
        };

        this.videoManager.onVideoError = (error) => {
            this.uiManager.showError('Ошибка загрузки видео: ' + error);
        };

        // Пользовательские события
        $('#videoFile').on('change', (e) => this.handleVideoLoad(e));
        $('#addStartMarker').on('click', () => this.addMarker('start'));
        $('#addEndMarker').on('click', () => this.addMarker('end'));
        $('#addManualMarker').on('click', () => this.showManualMarkerModal());
        $('#confirmManualMarker').on('click', () => this.addManualMarker());
        $('#saveManualMarker').on('click', () => this.addManualMarkerFromForm());
        $('#cutVideo').on('click', () => this.cutVideo());
        $('#clearAll').on('click', () => this.clearAll());
        $('#exportMarkers').on('click', () => this.exportMarkers());
        $('#importMarkers').on('click', () => this.importMarkers());

        // Прогресс бар
        $('#progressBar').parent().on('click', (e) => this.handleProgressBarClick(e));

        // События из UI Manager
        $(document).on('markerDeleted', (e, id) => {
            this.markersManager.deleteMarker(id);
            this.saveToStorage();
            this.updateDisplay();
        });

        $(document).on('markerClicked', (e, time) => {
            this.videoManager.setCurrentTime(time);
        });

        $(document).on('downloadAllSegments', () => {
            this.downloadAllSegments();
        });

        // Обработка клавиш
        $(document).on('keydown', (e) => this.handleKeyPress(e));

        // Предотвращаем закрытие страницы при обработке
        $(window).on('beforeunload', (e) => {
            if (this.exportManager.isProcessing) {
                e.preventDefault();
                e.returnValue = 'Идет обработка видео. Вы уверены, что хотите покинуть страницу?';
                return e.returnValue;
            }
        });
    }

    handleKeyPress(e) {
        // Пробел для паузы/воспроизведения
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.videoManager.togglePlayPause();
        }
        
        // S для метки начала
        if (e.code === 'KeyS' && e.ctrlKey) {
            e.preventDefault();
            this.addMarker('start');
        }
        
        // E для метки конца
        if (e.code === 'KeyE' && e.ctrlKey) {
            e.preventDefault();
            this.addMarker('end');
        }
    }

    handleVideoLoad(event) {
        try {
            this.videoManager.loadVideo(event);
            this.updateDisplay();
            
            // Сохраняем информацию о файле
            const file = event.target.files[0];
            if (file) {
                this.storageManager.saveVideoInfo({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                });
            }
        } catch (error) {
            this.uiManager.showError('Ошибка загрузки видео: ' + error.message);
        }
    }

    addMarker(type) {
        if (!this.videoManager.isVideoLoaded()) {
            this.uiManager.showError('Пожалуйста, загрузите видео сначала');
            return;
        }

        const time = this.videoManager.getCurrentTime();
        this.markersManager.addMarker(time, type);
        this.saveToStorage();
        this.updateDisplay();
        this.uiManager.showMarkerFeedback(type);
    }

    addManualMarker() {
        const timeInput = $('#manualTimeInput').val();
        const type = $('#markerTypeSelect').val();
        
        if (!this.markersManager.validateTimeFormat(timeInput)) {
            this.uiManager.showError('Пожалуйста, введите время в формате ЧЧ:ММ:СС');
            return;
        }

        const time = this.markersManager.parseTime(timeInput);
        if (time > this.videoManager.getDuration()) {
            this.uiManager.showError('Время метки превышает длительность видео');
            return;
        }

        this.markersManager.addMarker(time, type, timeInput);
        this.saveToStorage();
        this.updateDisplay();
        $('#manualMarkerModal').modal('hide');
        this.uiManager.showMarkerFeedback(type);
    }

    addManualMarkerFromForm() {
        const time = parseFloat($('#manualTime').val());
        const type = $('#manualType').val();

        if (isNaN(time) || time < 0) {
            this.uiManager.showError('Пожалуйста, введите корректное время');
            return;
        }

        const duration = this.videoManager.getDuration();
        if (duration && time > duration) {
            this.uiManager.showError('Время метки превышает длительность видео');
            return;
        }

        this.markersManager.addMarker(time, type);
        this.saveToStorage();
        this.updateDisplay();
        this.uiManager.showMarkerFeedback(type);
        
        // Очистка формы
        $('#manualTime').val('');
    }

    showManualMarkerModal() {
        if (!this.videoManager.isVideoLoaded()) {
            this.uiManager.showError('Пожалуйста, загрузите видео сначала');
            return;
        }
        $('#manualTimeInput').val(this.markersManager.formatTime(this.videoManager.getCurrentTime()));
        $('#manualMarkerModal').modal('show');
    }

    handleProgressBarClick(event) {
        if (!this.videoManager.isVideoLoaded()) return;
        
        const progressBar = $(event.currentTarget);
        const clickPosition = event.offsetX;
        const progressBarWidth = progressBar.width();
        const duration = this.videoManager.getDuration();
        const seekTime = (clickPosition / progressBarWidth) * duration;
        
        this.videoManager.setCurrentTime(seekTime);
    }

    async cutVideo() {
        if (this.markersManager.getMarkersCount() === 0) {
            this.uiManager.showError('Добавьте метки для нарезки видео');
            return;
        }

        const segments = this.segmentsManager.getSegments(this.markersManager.getMarkers());
        
        if (segments.length === 0) {
            this.uiManager.showError('Нет корректных сегментов для нарезки. Убедитесь, что метки начала и конца идут в правильном порядке.');
            return;
        }

        if (!this.exportManager.isFFmpegLoaded) {
            this.uiManager.showError('Видеодвижок еще не загружен. Пожалуйста, подождите...');
            return;
        }

        // Показываем подтверждение для больших видео
        const videoFile = this.videoManager.getVideoFile();
        if (videoFile && videoFile.size > 100 * 1024 * 1024) { // 100MB
            if (!confirm('Видео довольно большое. Нарезка может занять несколько минут. Продолжить?')) {
                return;
            }
        }

        // Начинаем процесс нарезки
        await this.processVideoCutting(segments);
    }

    async processVideoCutting(segments) {
        let results = [];
        
        try {
            this.uiManager.showLoading(`Начинаем нарезку ${segments.length} сегментов...`);
            
            const videoFile = this.videoManager.getVideoFile();
            if (!videoFile) {
                throw new Error('Видеофайл не загружен');
            }

            // Обновляем прогресс
            segments.forEach((segment, index) => {
                this.uiManager.showLoading(`Обработка сегмента ${index + 1} из ${segments.length}...`);
            });

            results = await this.exportManager.processVideoSegments(videoFile, segments);
            
            this.uiManager.hideLoading();
            this.uiManager.showResults(results, segments);
            
        } catch (error) {
            this.uiManager.hideLoading();
            this.uiManager.showError('Ошибка при нарезке видео: ' + error.message);
            console.error('Ошибка нарезки:', error);
        }
    }

    async downloadAllSegments() {
        const segments = this.segmentsManager.getSegments(this.markersManager.getMarkers());
        const videoFile = this.videoManager.getVideoFile();
        
        if (!videoFile) {
            this.uiManager.showError('Видеофайл не загружен');
            return;
        }

        this.uiManager.showLoading('Подготовка всех сегментов к скачиванию...');
        
        try {
            const results = await this.exportManager.processVideoSegments(videoFile, segments);
            
            // Скачиваем каждый сегмент
            results.forEach(result => {
                if (result.success) {
                    this.uiManager.downloadFile(result.outputUrl, result.fileName);
                }
            });
            
            this.uiManager.hideLoading();
            this.uiManager.showSuccess('Все сегменты скачаны!');
            
        } catch (error) {
            this.uiManager.hideLoading();
            this.uiManager.showError('Ошибка при подготовке сегментов: ' + error.message);
        }
    }

    clearAll() {
        if (this.markersManager.getMarkersCount() === 0) {
            return;
        }

        if (confirm('Вы уверены, что хотите удалить все метки?')) {
            this.markersManager.clearMarkers();
            this.saveToStorage();
            this.updateDisplay();
            this.uiManager.showSuccess('Все метки очищены');
        }
    }

    exportMarkers() {
        if (this.markersManager.getMarkersCount() === 0) {
            this.uiManager.showError('Нет меток для экспорта');
            return;
        }

        this.exportManager.exportMarkers(this.markersManager.getMarkers());
        this.uiManager.showSuccess('Метки экспортированы');
    }

    importMarkers() {
        this.exportManager.importMarkers((importedMarkers) => {
            this.markersManager.setMarkers(importedMarkers);
            this.saveToStorage();
            this.updateDisplay();
            this.uiManager.showSuccess('Метки успешно импортированы!');
        });
    }

    updateDisplay() {
        this.uiManager.updateMarkersList(this.markersManager.getMarkers());
        this.uiManager.updateProgressMarkers(
            this.markersManager.getMarkers(), 
            this.videoManager.getDuration()
        );
    }

    saveToStorage() {
        this.storageManager.saveMarkers(this.markersManager.getMarkers());
    }

    loadFromStorage() {
        const savedMarkers = this.storageManager.loadMarkers();
        if (savedMarkers) {
            this.markersManager.setMarkers(savedMarkers);
        }

        const videoInfo = this.storageManager.loadVideoInfo();
        if (videoInfo) {
            // Можно показать информацию о последнем загруженном видео
            console.log('Последнее видео:', videoInfo);
        }
    }

    // Вспомогательные методы
    getStats() {
        return {
            markersCount: this.markersManager.getMarkersCount(),
            segmentsCount: this.segmentsManager.getSegments(this.markersManager.getMarkers()).length,
            videoDuration: this.videoManager.getDuration(),
            videoLoaded: this.videoManager.isVideoLoaded(),
            ffmpegLoaded: this.exportManager.isFFmpegLoaded
        };
    }

    // Метод для отладки
    debug() {
        const stats = this.getStats();
        console.log('VideoCutter Debug:', stats);
        return stats;
    }
}

// Инициализация приложения
$(document).ready(() => {
    // Показываем загрузочный экран
    console.log('🚀 Инициализация Video Cutter...');
    
    // Создаем глобальный объект для отладки
    window.videoCutterApp = new VideoCutter();
    
    // Показываем информацию о приложении
    setTimeout(() => {
        const stats = window.videoCutterApp.getStats();
        console.log('✅ Video Cutter инициализирован:', stats);
        
        // Показываем подсказки
        if (stats.markersCount === 0) {
            console.log('💡 Подсказка: Используйте Ctrl+S для метки начала, Ctrl+E для метки конца');
        }
    }, 1000);
});

// Обработка ошибок
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Service Worker для оффлайн работы (опционально)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('ServiceWorker зарегистрирован');
        })
        .catch(error => {
            console.log('ServiceWorker не зарегистрирован:', error);
        });
}

