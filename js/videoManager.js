class VideoManager {
    constructor() {
        this.video = document.getElementById('videoPlayer');
        this.currentVideoFile = null;
        this.onTimeUpdate = null;
        this.onVideoLoaded = null;
        this.bindVideoEvents();
    }

    bindVideoEvents() {
        this.video.addEventListener('timeupdate', () => {
            if (this.onTimeUpdate) {
                this.onTimeUpdate(this.getCurrentTime());
            }
        });

        this.video.addEventListener('loadedmetadata', () => {
            if (this.onVideoLoaded) {
                this.onVideoLoaded();
            }
        });
    }

    loadVideo(event) {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            this.video.src = url;
            this.currentVideoFile = file;
        }
    }

    getCurrentTime() {
        return this.video.currentTime;
    }

    setCurrentTime(time) {
        this.video.currentTime = time;
    }

    getDuration() {
        return this.video.duration || 0;
    }

    isVideoLoaded() {
        return this.video.duration > 0;
    }

    getVideoFile() {
        return this.currentVideoFile;
    }

    play() {
        this.video.play();
    }

    pause() {
        this.video.pause();
    }

    getVideoElement() {
        return this.video;
    }
}
