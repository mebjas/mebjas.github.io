
/** Retrieves available cameras */
class CameraDeviceList {
    static getCameras() {
        var supported = navigator.mediaDevices
            && navigator.mediaDevices.enumerateDevices
            && navigator.mediaDevices.getUserMedia;

        return new Promise((resolve, reject) => {
            if (!supported) {
                reject("not supported");
            }

            navigator.mediaDevices.getUserMedia(
                { audio: false, video: true })
                .then(stream => {
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

        });
    }
}

class Viewfinder {
    constructor(vfContainer, cameraDevice) {
        this.container = vfContainer;
        this.cameraDevice = cameraDevice;

        // class properties.
        this.width = vfContainer.clientWidth;
        this.height = vfContainer.clientHeight;
        this.aspectRatio = 1.333334;
    }

    render() {
        var $this = this;
        var isSupported = 
            navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

        var createVideoElement = width => {
            var videoElement = document.createElement('video');
            videoElement.style.width = `${width}px`;
            videoElement.muted = true;
            videoElement.playsInline = true;
            return videoElement;
        }

        var setupVideo = (mediaStream, resolve, reject) => {
            var videoElement = createVideoElement($this.width);
            $this.container.appendChild(videoElement);
            // Attach listeners to video.
            videoElement.onabort = reject;
            videoElement.onerror = reject;
            videoElement.onplaying = () => {
                resolve();
            }

            videoElement.srcObject = mediaStream;
            videoElement.play();

            // Set state
            $this._videoElement = videoElement;  // TODO: Remove if not needed
        }

        var onMediaStreamReceived = (mediaStream, resolve, reject) => {
            $this.__localMediaStream = mediaStream;
            var constraints = {
                aspectRatio : $this.aspectRatio
            }
            var track = mediaStream.getVideoTracks()[0];
            return track.applyConstraints(constraints)
                .then(_ => setupVideo(mediaStream, resolve, reject))
                .catch(_ => setupVideo(mediaStream, resolve, reject));
        }
        
        return new Promise((resolve, reject) => {
            if (!isSupported) {
                reject("Not supported");
            }

            var videoConstraints = {
                deviceId: { exact: $this.cameraDevice.id }
            };
            navigator.mediaDevices.getUserMedia(
                { audio: false, video: videoConstraints })
                .then(stream => onMediaStreamReceived(stream, resolve, reject))
                .catch(err => {
                    reject(`Error getting userMedia, error = ${err}`);
                });
        });
    }

    captureImage() {
        var canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.getContext('2d').drawImage(
            this._videoElement, 0, 0, canvas.width, canvas.height);
        
        var image = document.createElement("img");
        image.src = canvas.toDataURL();
        return image;
    }

    stop() {
        var $this = this;
        return new Promise((resolve, reject) => {
            var tracksToClose = $this.__localMediaStream.getVideoTracks().length;
            var tracksClosed = 0;

            var onAllTracksClosed = _ => {
                $this.__localMediaStream = null;
                $this.container.removeChild($this._videoElement);
                $this._videoElement = null;
                resolve(true);
            }

            $this.__localMediaStream.getVideoTracks().forEach(videoTrack => {
                videoTrack.stop();
                ++tracksClosed;

                if (tracksClosed >= tracksToClose) {
                    onAllTracksClosed();
                }
            });
        });
    }
}

class GalleryButton {
    constructor(galleryButtonContainer, buttonHeight, onClick) {
        this.container = galleryButtonContainer;
        this.buttonHeight = buttonHeight;
        this.onClick = onClick;

        // states
        this.width = galleryButtonContainer.clientWidth;
        this.height = galleryButtonContainer.clientHeight;
    }

    render() {
        var button = document.createElement("div");
        button.style.width = `${this.buttonHeight}px`;
        button.style.height = `${this.buttonHeight}px`;
        button.style.borderColor = "white";
        button.style.borderStyle = "solid";
        button.style.borderWidth = "1px";
        button.style.margin = "auto";
        button.style.borderRadius = `${this.buttonHeight}px`;
        button.style.position = "absolute";
        button.style.top = "50%";
        button.style.left = "50%";
        button.style.transform = "translate(-50%, -50%)";
        button.style.cursor = "pointer";
        button.style.overflowX = "hidden";
        button.style.overflowY = "hidden";
        this.container.appendChild(button);

        button.addEventListener("mouseover", event => {
            button.style.borderColor = "#ff8100";
        });

        button.addEventListener("mouseout", event => {
            button.style.borderColor = "white";
        });

        button.addEventListener("click", this.onClick);
        this.__button = button;
    }

    disable() {
        this.__button.enabled = false;
    }

    enable() {
        this.__button.enabled = true;
    }

    setThumbnail(image) {
        image.style.height = `${this.buttonHeight}px`;
        this.__button.innerHTML = "";
        this.__button.appendChild(image);
    }
}

class ShutterButton {
    constructor(shutterButtonContainer, buttonHeight, onShutterPress) {
        this.container = shutterButtonContainer;
        this.buttonHeight = buttonHeight;
        this.onShutterPress = onShutterPress;

        // states
        this.width = shutterButtonContainer.clientWidth;
        this.height = shutterButtonContainer.clientHeight;
    }

    render() {
        var button = document.createElement("div");
        button.style.width = `${this.buttonHeight}px`;
        button.style.height = `${this.buttonHeight}px`;
        button.style.borderColor = "yellow";
        button.style.borderStyle = "double";
        button.style.borderWidth = "7px";
        button.style.margin = "auto";
        button.style.borderRadius = `${this.buttonHeight}px`;
        button.style.position = "absolute";
        button.style.top = "50%";
        button.style.left = "50%";
        button.style.transform = "translate(-50%, -50%)";
        button.style.cursor = "pointer";
        this.container.appendChild(button);

        button.addEventListener("mouseover", event => {
            button.style.borderColor = "#ff8100";
        });

        button.addEventListener("mouseout", event => {
            button.style.borderColor = "yellow";
        });

        button.addEventListener("click", this.onShutterPress);
        this.__button = button;
    }

    disable() {
        this.__button.enabled = false;
    }

    enable() {
        this.__button.enabled = true;
    }
}

class SwitchButton {
    constructor(switchButtonContainer, buttonHeight, onClick) {
        this.container = switchButtonContainer;
        this.buttonHeight = buttonHeight;
        this.onClick = onClick;

        // states
        this.width = switchButtonContainer.clientWidth;
        this.height = switchButtonContainer.clientHeight;
    }

    render() {
        var button = document.createElement("div");
        button.style.width = `${this.buttonHeight}px`;
        button.style.height = `${this.buttonHeight}px`;
        button.style.margin = "auto";
        button.style.borderRadius = `${this.buttonHeight}px`;
        button.style.position = "absolute";
        button.style.top = "50%";
        button.style.left = "50%";
        button.style.transform = "translate(-50%, -50%)";
        button.style.cursor = "pointer";
        this.container.appendChild(button);

        var image = document.createElement("img");
        image.style.width = "100%";
        image.style.height = "100%";
        image.onload = _ => {
            button.appendChild(image);
        }
        image.src = "/assets/research/html5camera/camera.png";
        button.addEventListener("click", event => this.onClick());
        this.__button = button;
    }

    disable() {
        this.__button.enabled = false;
    }

    enable() {
        this.__button.enabled = true;
    }
}

class SideController {
    constructor(scContainer, onShutterPress, onCameraSwitch) {
        this.container = scContainer;
        this.onShutterPress = onShutterPress;
        this.onCameraSwitch = onCameraSwitch;

        // states
        this.width = scContainer.clientWidth;
        this.height = scContainer.clientHeight;

        this.shutterButtonHeight = 50;
        this.galleryButtonHeight = 40;
        this.switchButtonHeight = 40;
    }

    render() {
        var $this = this;
        this.container.style.padding = `${this.padding}px`;

        var getHeightRatio = height => {
            return height / ($this.shutterButtonHeight 
                + $this.galleryButtonHeight + $this.switchButtonHeight);
        }

        //#region button definitions
        // gallery button
        var galleryButtonContainer = document.createElement("div");
        galleryButtonContainer.style.display = "block";
        galleryButtonContainer.style.position = "relative";
        galleryButtonContainer.style.width = "100%";
        galleryButtonContainer.style.height = (this.height)
            * getHeightRatio(this.galleryButtonHeight) +"px";
        this.container.appendChild(galleryButtonContainer); 

        // shutter button
        var shutterButtonContainer = document.createElement("div");
        shutterButtonContainer.style.display = "block";
        shutterButtonContainer.style.position = "relative";
        shutterButtonContainer.style.width = "100%";
        shutterButtonContainer.style.height = (this.height)
            * getHeightRatio(this.shutterButtonHeight) +"px";
        this.container.appendChild(shutterButtonContainer);

        // switch button
        var switchButtonContainer = document.createElement("div");
        switchButtonContainer.style.display = "block";
        switchButtonContainer.style.position = "relative";
        switchButtonContainer.style.width = "100%";
        switchButtonContainer.style.height = (this.height)
            * getHeightRatio(this.switchButtonHeight) +"px";
        this.container.appendChild(switchButtonContainer);
        //#endregion

        this.shutterButton = new ShutterButton(
            shutterButtonContainer,
            this.shutterButtonHeight,
            _ => $this.__onShutterPress());
        this.shutterButton.render();

        this.galleryButton = new GalleryButton(
            galleryButtonContainer, this.galleryButtonHeight);
        this.galleryButton.render();

        this.switchButton = new SwitchButton(
            switchButtonContainer,
            this.switchButtonHeight,
            _ => $this.__onCameraSwitch());
        this.switchButton.render();
    }

    __onShutterPress() {
        // var $this = this;

        // var disableAllButtons = _ => {
        //     $this.shutterButton.disable();
        //     $this.galleryButton.disable();
        //     $this.switchButton.disable();
        // };
        
        // var enableAllButtons = _ => {
        //     $this.shutterButton.enable();
        //     $this.galleryButton.enable();
        //     $this.switchButton.enable();
        // };

        this.__disableAllButtons();
        var image = this.onShutterPress();
        this.galleryButton.setThumbnail(image);
        this.__enableAllButtons();
    }

    __onCameraSwitch() {
        var $this = this;
        this.__disableAllButtons();
        this.onCameraSwitch()
        .then(_ => {
            $this.__enableAllButtons();
        })
        .catch(_ => {
            $this.__enableAllButtons();
        });
    }

    __disableAllButtons() {
        this.shutterButton.disable();
        this.galleryButton.disable();
        this.switchButton.disable();
    }

    __enableAllButtons() {
        this.shutterButton.enable();
        this.galleryButton.enable();
        this.switchButton.enable();
    }
}

class Camera {
    constructor(cameraDeviceList, cameraContainer) {
        this.cameraDeviceList = cameraDeviceList;
        this.container = cameraContainer;
        this.currentCameraDeviceId = 0;

        // landscape only to begin with
        this.height = 400;
        this.vfAspectRatio = 4 / 3;
        this.vfWidth = this.height * this.vfAspectRatio;
        this.scWidth = 150;
        this.width = this.vfWidth + this.scWidth + 10;
    }

    render() {
        var $this = this;
        this.container.innerHtml = "";
        this.container.style.width = `${this.width}px`;
        this.container.style.height = `${this.height}px`;
        this.container.style.background = "black";
        this.container.style.border = "1px solid black";
        this.container.style.margin = "auto";

        // Viewfinder
        var vfContianer = document.createElement("div");
        vfContianer.style.display = "inline-block";
        vfContianer.style.float = "left";   // TODO: use flex
        vfContianer.style.width = `${this.vfWidth}px`;
        vfContianer.style.height = `${this.height}px`;
        this.__vfContianer = vfContianer;
        this.container.appendChild(vfContianer);

        // Side Contoller
        var scContainer = document.createElement("div");
        scContainer.style.display = "inline-block";
        scContainer.style.float = "right";   // TODO: use flex
        scContainer.style.width = `${this.scWidth}px`;
        scContainer.style.height = `${this.height}px`;
        scContainer.style.height = `${this.height}px`;
        this.container.appendChild(scContainer);

        this.viewfinder = new Viewfinder(
            vfContianer, this.cameraDeviceList[this.currentCameraDeviceId]);
        this.sideController = new SideController(
            scContainer,
            _ => $this.__onShutterPress(),
            _ => $this.__onCameraSwitch());
        
        // render
        return this.viewfinder.render().then(_ => {
            return $this.sideController.render();
        });
    }

    __onShutterPress() {
        // TODO: Switch to promise
        return this.viewfinder.captureImage();
    }

    __onCameraSwitch() {
        var $this = this;
        return this.viewfinder.stop()
            .then(_ => {
                $this.viewfinder = null;
                $this.currentCameraDeviceId++;
                $this.currentCameraDeviceId
                    = $this.currentCameraDeviceId % $this.cameraDeviceList.length;
                
                var cameraDevice = $this.cameraDeviceList[$this.currentCameraDeviceId];
                $this.viewfinder = new Viewfinder($this.__vfContianer, cameraDevice);
                return $this.viewfinder.render();
            })
            .catch(error => {
                console.error(error);
            });
    }
}

/**
 * Top Level Camera Class
 */
class Html5Camera {
    static create(cameraContainer, successCallback, errorCallback) {
        CameraDeviceList.getCameras()
        .then(cameraDeviceList => {
            if (successCallback) {
                successCallback();
            }

            // start camera with devices
            const camera = new Camera(cameraDeviceList, cameraContainer);
            camera.render();
        })
        .catch(error => {
            if (errorCallback) {
                errorCallback(error);
            }
        });
    }
}