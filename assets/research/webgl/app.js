//#region InputFeed
function InputFeed(videoElement, cameraId) {
    this.videoElement = videoElement;
    this.cameraId = cameraId;
}

InputFeed.prototype.start = function() {
    let $this = this;

    let onMediaStreamReceived = mediaStream => {
        return new Promise((resolve, reject) => {
            $this.localMediaStream = mediaStream;
            let videoElement = $this.videoElement;
            // Attach listeners to video.
            // TODO(mebjas) figure out why this happens on camera change.
            // videoElement.onabort = reject;
            // videoElement.onerror = reject;
            videoElement.onplaying = () => {
                $this.videoWidth = videoElement.clientWidth;
                $this.videoHeight = videoElement.clientHeight;
                resolve();
            }

            videoElement.srcObject = mediaStream;
            videoElement.play();
        });
    }

    return new Promise((resolve, reject) => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const videoConstraints ={ deviceId: { exact: $this.cameraId } };
            navigator.mediaDevices.getUserMedia(
                { audio: false, video: videoConstraints })
                .then(stream => {
                    onMediaStreamReceived(stream)
                        .then(_ => resolve())
                        .catch(reject);
                })
                .catch(err => {
                    reject(`Error getting userMedia, error = ${err}`);
                });
        } else {
            reject("navigator.mediaDevices.getUserMedia not supported.");
        }
    });
}

InputFeed.prototype.stop = function() {
    let $this = this;
    return new Promise((resolve, reject) => {
        let tracksToClose = $this.localMediaStream.getVideoTracks().length;
        let tracksClosed = 0;
        $this.localMediaStream.getVideoTracks().forEach(track => {
            track.stop();
            tracksClosed++;
            if (tracksClosed >= tracksToClose) {
                resolve();
            }
        });
    });
}
//#endregion

//#region OutputFeed
function OutputFeed(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.isRunning = false;
    this.timeout;

    this.canvasElement.width = this.videoElement.width;
    this.canvasElement.height = this.videoElement.height;

    this.fps = 20;
}

OutputFeed.prototype.start = function() {
    let $this = this;
    let width = this.videoElement.videoWidth;
    let height = this.videoElement.videoHeight;
    let context = this.canvasElement.getContext('webgl');
    context.canvas.width = width;
    context.canvas.height = height;

    let foreverProcess = _ => {
        if (!$this.isRunning) {
            return;
        }
        context.drawImage(
            this.videoElement,
            0,
            0,
            width,
            height);

        $this.timeout = setTimeout(foreverProcess, 1000 / $this.fps);
    };

    this.isRunning = true;
    foreverProcess();
}

OutputFeed.prototype.stop = function() {
    let context = this.canvasElement.getContext('webgl');
    let width = this.canvasElement.videoWidth;
    let height = this.canvasElement.videoHeight;
    context.clearRect(0, 0, width, height);

    if (this.timeout) {
        clearTimeout(this.timeout);
    }
    this.isRunning = false;
}

//#endregion

// Method to get cameras supported by the device, requests permission when called.
function getCameras() {
    return new Promise((resolve, reject) => {
        if (navigator.mediaDevices
            && navigator.mediaDevices.enumerateDevices
            && navigator.mediaDevices.getUserMedia) {
            console.log("navigator.mediaDevices used");
            navigator.mediaDevices.getUserMedia(
                { audio: false, video: true })
                .then(stream => {
                    // hacky approach to close any active stream if they are
                    // active.
                    stream.oninactive
                        = _ => console.log("All streams closed");
                    const closeActiveStreams = stream => {
                        const tracks = stream.getVideoTracks();
                        for (var i = 0; i < tracks.length; i++) {
                            const track = tracks[i];
                            track.enabled = false;
                            track.stop();
                            stream.removeTrack(track);
                        }
                    }

                    navigator.mediaDevices.enumerateDevices()
                        .then(devices => {
                            const results = [];
                            for (var i = 0; i < devices.length; i++) {
                                const device = devices[i];
                                if (device.kind == "videoinput") {
                                    results.push({
                                        id: device.deviceId,
                                        label: device.label
                                    });
                                }
                            }
                            console.log(`${results.length} results found`);
                            closeActiveStreams(stream);
                            resolve(results);
                        })
                        .catch(err => {
                            reject(`${err.name} : ${err.message}`);
                        });
                })
                .catch(err => {
                    reject(`${err.name} : ${err.message}`);
                })
        } else if (MediaStreamTrack && MediaStreamTrack.getSources) {
            console.log("MediaStreamTrack.getSources used");
            const callback = sourceInfos => {
                const results = [];
                for (var i = 0; i !== sourceInfos.length; ++i) {
                    const sourceInfo = sourceInfos[i];
                    if (sourceInfo.kind === 'video') {
                        results.push({
                            id: sourceInfo.id,
                            label: sourceInfo.label
                        });
                    }
                }
                console.log(`${results.length} results found`);
                resolve(results);
            }
            MediaStreamTrack.getSources(callback);
        } else {
            console.log("unable to query supported devices.");
            reject("unable to query supported devices.");
        }
    });
}