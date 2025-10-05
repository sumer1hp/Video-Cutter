class StorageManager {
    constructor() {
        this.storageKey = 'videoCutter_';
    }

    saveMarkers(markers) {
        localStorage.setItem(this.storageKey + 'markers', JSON.stringify(markers));
    }

    loadMarkers() {
        const saved = localStorage.getItem(this.storageKey + 'markers');
        return saved ? JSON.parse(saved) : null;
    }

    saveVideoInfo(filename) {
        localStorage.setItem(this.storageKey + 'filename', filename);
    }

    loadVideoInfo() {
        return localStorage.getItem(this.storageKey + 'filename');
    }

    clearStorage() {
        localStorage.removeItem(this.storageKey + 'markers');
        localStorage.removeItem(this.storageKey + 'filename');
    }

    exportAllData() {
        return {
            markers: this.loadMarkers(),
            videoInfo: this.loadVideoInfo(),
            exportDate: new Date().toISOString()
        };
    }

    importAllData(data) {
        if (data.markers) {
            this.saveMarkers(data.markers);
        }
        if (data.videoInfo) {
            this.saveVideoInfo(data.videoInfo);
        }
    }
}
