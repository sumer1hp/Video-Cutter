class MarkersManager {
    constructor() {
        this.markers = [];
    }

    addMarker(time, type, customTimestamp = null) {
        const marker = {
            id: Date.now() + Math.random(),
            time: time,
            type: type,
            timestamp: customTimestamp || this.formatTime(time)
        };

        this.markers.push(marker);
        this.markers.sort((a, b) => a.time - b.time);
        return marker;
    }

    deleteMarker(id) {
        this.markers = this.markers.filter(marker => marker.id !== id);
    }

    clearMarkers() {
        this.markers = [];
    }

    getMarkers() {
        return this.markers;
    }

    setMarkers(markers) {
        this.markers = markers;
    }

    getMarkersCount() {
        return this.markers.length;
    }

    validateTimeFormat(time) {
        const regex = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/;
        return regex.test(time);
    }

    parseTime(timeString) {
        const parts = timeString.split(':');
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }

    formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    getMarkersByType(type) {
        return this.markers.filter(marker => marker.type === type);
    }

    getLastMarker() {
        return this.markers.length > 0 ? this.markers[this.markers.length - 1] : null;
    }
}
