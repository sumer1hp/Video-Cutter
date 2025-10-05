class ExportManager {
    constructor() {
        this.ffmpeg = null;
        this.isFFmpegLoaded = false;
        this.isLoading = false;
        this.isProcessing = false;
        this.loadFFmpeg();
    }

    async loadFFmpeg() {
        if (this.isLoading) return;
        this.isLoading = true;
        try {
            console.log('🔄 Загружаем FFmpeg из CDN (версия 0.11.6)...');
            await this.loadScript('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');
            if (typeof createFFmpeg === 'undefined') {
                throw new Error('FFmpeg не загрузился из CDN');
            }
            this.ffmpeg = createFFmpeg({
                log: true,
                corePath: 'https://unpkg.com/@ffmpeg/core@0.11.6/dist/ffmpeg-core.js'
            });
            await this.ffmpeg.load();
            this.isFFmpegLoaded = true;
            this.isLoading = false;
            console.log('✅ FFmpeg успешно загружен');
        } catch (error) {
            console.error('❌ Ошибка загрузки FFmpeg:', error);
            this.isFFmpegLoaded = false;
            this.isLoading = false;
            this.showFFmpegError();
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    showFFmpegError() {
        console.error('❌ FFmpeg не удалось загрузить. Проверьте подключение к интернету.');
        if (typeof this.onError === 'function') {
            this.onError('Не удалось загрузить видеодвижок. Убедитесь, что у вас есть интернет, и обновите страницу.');
        }
    }

    async waitForLoad() {
        if (this.isFFmpegLoaded) return true;
        const maxWaitTime = 20000;
        const startTime = Date.now();
        while (!this.isFFmpegLoaded && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return this.isFFmpegLoaded;
    }

    async processVideoSegments(videoFile, segments) {
        if (this.isProcessing) {
            throw new Error('Уже идет обработка видео. Дождитесь завершения.');
        }
        this.isProcessing = true;
        try {
            const isLoaded = await this.waitForLoad();
            if (!isLoaded) {
                throw new Error('FFmpeg не загрузился. Проверьте интернет и обновите страницу.');
            }

            if (videoFile.size > 500 * 1024 * 1024) {
                const shouldContinue = confirm(
                    `Видео очень большое (${this.formatFileSize(videoFile.size)}). ` +
                    `Нарезка может занять несколько минут. Продолжить?`
                );
                if (!shouldContinue) throw new Error('Отменено пользователем');
            }

            const results = [];
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                try {
                    console.log(`🔪 Обрабатываем сегмент ${i + 1}/${segments.length}`);
                    const result = await this.processSingleSegment(videoFile, segment, i + 1);
                    results.push(result);
                } catch (error) {
                    console.error(`❌ Ошибка сегмента ${i + 1}:`, error.message);
                    results.push({
                        success: false,
                        segment: segment,
                        index: i + 1,
                        error: error.message
                    });
                }
            }
            return results;
        } finally {
            this.isProcessing = false;
        }
    }

    async processSingleSegment(videoFile, segment, index) {
        if (!this.ffmpeg) throw new Error('FFmpeg не инициализирован');
        if (segment.duration <= 0) throw new Error('Некорректная длительность сегмента');

        try {
            const arrayBuffer = await this.readFileAsArrayBuffer(videoFile);
            this.ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(arrayBuffer));

            await this.ffmpeg.run(
                '-i', 'input.mp4',
                '-ss', segment.start.toString(),
                '-t', (segment.end - segment.start).toString(),
                '-c', 'copy',
                '-avoid_negative_ts', 'make_zero',
                `segment_${index}.mp4`
            );

            const data = this.ffmpeg.FS('readFile', `segment_${index}.mp4`);
            if (data.length === 0) throw new Error('Пустой результат');

            const blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            return {
                success: true,
                segment: segment,
                index: index,
                outputUrl: url,
                outputSize: blob.size,
                fileName: `segment_${index}_${segment.startFormatted.replace(/:/g, '-')}_to_${segment.endFormatted.replace(/:/g, '-')}.mp4`,
                blob: blob
            };
        } finally {
            this.cleanupFiles([`segment_${index}.mp4`, 'input.mp4']);
        }
    }

    async readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsArrayBuffer(file);
        });
    }

    cleanupFiles(filenames) {
        filenames.forEach(filename => {
            try {
                this.ffmpeg.FS('unlink', filename);
            } catch (e) {
                console.warn(`Не удалён: ${filename}`);
            }
        });
    }

    // Вспомогательные методы
    exportMarkers(markers) {
        const data = JSON.stringify({ markers, exportDate: new Date().toISOString(), version: '1.0' }, null, 2);
        this.downloadFile(data, `video_markers_${this.formatTimestamp()}.json`, 'application/json');
    }

    importMarkers(callback) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const d = JSON.parse(ev.target.result);
                        if (d.markers && Array.isArray(d.markers)) callback(d.markers);
                        else alert('Неверный формат файла');
                    } catch (err) {
                        alert('Ошибка чтения: ' + err.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    downloadSegmentsInfo(segments) {
        const content = segments.map((s, i) =>
            `Сегмент ${i + 1}: ${s.startFormatted} - ${s.endFormatted} (${this.formatDuration(s.duration)})`
        ).join('\n');
        this.downloadFile(content, `video_segments_${this.formatTimestamp()}.txt`, 'text/plain');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}м ${secs}с`;
    }

    formatTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }

    destroy() {
        if (this.ffmpeg) {
            try { this.ffmpeg.exit(); } catch (e) { console.warn('FFmpeg exit error:', e); }
        }
    }
}
