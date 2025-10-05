class UIManager {
    constructor() {
        this.loadingModal = new bootstrap.Modal('#loadingModal');
        this.resultsModal = new bootstrap.Modal('#resultsModal');
        this.initEventListeners();
    }

    initEventListeners() {
        $(document).on('markerDeleted', (e, id) => {
            // Событие будет обработано в основном приложении
        });

        $(document).on('markerClicked', (e, time) => {
            // Событие будет обработано в основном приложении
        });

        $('#downloadAllSegments').on('click', () => {
            $(document).trigger('downloadAllSegments');
        });
    }

    updateTimeDisplay(time) {
        $('#currentTime').text(this.formatTime(time));
    }

    updateProgressBar(currentTime, duration) {
        if (duration && duration > 0) {
            const progress = (currentTime / duration) * 100;
            $('#progressBar').css('width', progress + '%');
        }
    }

    initializeProgressBar() {
        this.updateProgressBar(0, 1);
    }

    updateMarkersList(markers) {
        const markersList = $('#markersList');
        markersList.empty();

        if (markers.length === 0) {
            markersList.append('<p class="text-muted">Метки пока не добавлены</p>');
            return;
        }

        markers.forEach(marker => {
            const markerElement = `
                <div class="marker-item ${marker.type}" data-id="${marker.id}">
                    <div>
                        <span class="marker-time">${marker.timestamp}</span>
                        <span class="marker-type ${marker.type}">
                            ${marker.type === 'start' ? '🎬 Начало' : '⏹️ Конец'}
                        </span>
                    </div>
                    <button class="btn btn-sm btn-outline-danger delete-marker" data-id="${marker.id}">×</button>
                </div>
            `;
            markersList.append(markerElement);
        });

        $('.delete-marker').off('click').on('click', (e) => {
            const id = $(e.target).data('id');
            $(document).trigger('markerDeleted', id);
        });
    }

    updateProgressMarkers(markers, duration) {
        const container = $('#markersContainer');
        container.empty();

        if (!duration || duration === 0) return;

        markers.forEach(marker => {
            const position = (marker.time / duration) * 100;
            const markerElement = $('<div>')
                .addClass(`marker ${marker.type}`)
                .css('left', position + '%')
                .attr('data-time', marker.timestamp)
                .attr('title', `${marker.type === 'start' ? 'Начало' : 'Конец'}: ${marker.timestamp}`)
                .on('click', () => {
                    $(document).trigger('markerClicked', marker.time);
                });
            container.append(markerElement);
        });
    }

    showMarkerFeedback(type) {
        const button = type === 'start' ? '#addStartMarker' : '#addEndMarker';
        const originalText = $(button).text();
        const originalClass = type === 'start' ? 'btn-success' : 'btn-danger';
        
        $(button).text('✓ Добавлено!');
        $(button).removeClass(originalClass).addClass('btn-success');
        
        setTimeout(() => {
            $(button).text(originalText);
            $(button).removeClass('btn-success').addClass(originalClass);
        }, 1000);
    }

    showLoading(message = 'Обработка...') {
        $('#loadingMessage').text(message);
        this.loadingModal.show();
    }

    hideLoading() {
        this.loadingModal.hide();
    }

    showResults(results, segments) {
        const successResults = results.filter(r => r.success);
        const failedResults = results.filter(r => !r.success);
        
        let content = `
            <div class="alert alert-success">
                <h6>✅ Успешно обработано: ${successResults.length} из ${results.length} сегментов</h6>
            </div>
        `;

        if (successResults.length > 0) {
            content += `<div class="mb-3"><strong>Готовые сегменты:</strong></div>`;
            successResults.forEach(result => {
                content += `
                    <div class="segment-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                        <div>
                            <strong>Сегмент ${result.index}</strong><br>
                            <small class="text-muted">${result.segment.startFormatted} - ${result.segment.endFormatted}</small>
                        </div>
                        <button class="btn btn-sm btn-success download-segment" 
                                data-url="${result.outputUrl}" 
                                data-filename="${result.fileName}">
                            📥 Скачать (${this.formatFileSize(result.outputSize)})
                        </button>
                    </div>
                `;
            });
        }

        if (failedResults.length > 0) {
            content += `
                <div class="alert alert-warning mt-3">
                    <h6>⚠️ Не удалось обработать: ${failedResults.length} сегментов</h6>
                    ${failedResults.map(r => `<small>Сегмент ${r.index}: ${r.error}</small><br>`).join('')}
                </div>
            `;
        }

        $('#resultsContent').html(content);
        
        // Добавляем обработчики для скачивания отдельных сегментов
        $('.download-segment').on('click', (e) => {
            const url = $(e.target).data('url');
            const filename = $(e.target).data('filename');
            this.downloadFile(url, filename);
        });

        this.resultsModal.show();
    }

    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        alert('❌ ' + message);
    }

    showSuccess(message) {
        // Можно добавить красивые уведомления вместо alert
        console.log('✅ ' + message);
    }
}
