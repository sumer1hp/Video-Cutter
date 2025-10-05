class SegmentsManager {
    getSegments(markers) {
        const segments = [];
        let currentStart = null;

        for (const marker of markers) {
            if (marker.type === 'start') {
                currentStart = marker.time;
            } else if (marker.type === 'end' && currentStart !== null) {
                if (marker.time > currentStart) {
                    segments.push({
                        start: currentStart,
                        end: marker.time,
                        duration: marker.time - currentStart,
                        startFormatted: this.formatTime(currentStart),
                        endFormatted: this.formatTime(marker.time)
                    });
                }
                currentStart = null;
            }
        }

        return segments;
    }

    validateSegments(segments) {
        return segments.filter(segment => 
            segment.end > segment.start && 
            segment.duration > 0
        );
    }

    getTotalDuration(segments) {
        return segments.reduce((total, segment) => total + segment.duration, 0);
    }

    formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    formatDuration(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hrs > 0) {
            return `${hrs}ч ${mins}м ${secs}с`;
        } else if (mins > 0) {
            return `${mins}м ${secs}с`;
        } else {
            return `${secs}с`;
        }
    }
}
