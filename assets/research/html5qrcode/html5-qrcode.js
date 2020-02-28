(function($) {
    var QRCODE_SUCCESS_CALLBACK_TAG = "QRCODE_SUCCESS_CALLBACK_TAG";
    var QRCODE_ERROR_CALLBACK_TAG = "QRCODE_ERROR_CALLBACK_TAG";
    var VIDEO_ERROR_CALLBACK_TAG = "VIDEO_ERROR_CALLBACK_TAG";
    var TIMEOUT_TAG = "TIMEOUT_TAG";
    var STREAM_TAG = "STREAM_TAG";
    var SOURCE_ID_TAG = "SOURCE_ID_TAG";
    var CAMERA_ID_TAG = "CAMERA_ID_TAG";
    var DEFAULT_HEIGHT = 250;
    var DEFAULT_HEIGHT_OFFSET = 2;
    var DEFAULT_WIDTH = 300;
    var DEFAULT_WIDTH_OFFSET = 2;
    var SCAN_DEFAULT_FPS = 2;

    var cameraIdsInitialized = false;
    var cameraIdCallbacks = [];
    var CAMERA_IDS = [];

    function createVideoElement(width, height) {
        return '<video width="' + width + 'px" height="' + height + 'px"></video>';
    }

    function createCanvasElement(width, height) {
        return '<canvas id="qr-canvas" width="' 
            + (width - DEFAULT_WIDTH_OFFSET) 
            + 'px" height="' 
            + (height - DEFAULT_HEIGHT_OFFSET) 
            + 'px" style="display:none;"></canvas>';
    }

    function getTimeoutFromFps(fps) {
        return 1000 / fps;
    }

    /**
     * Code to initialise the cameraIds field
     */
    function initializeCameraSources (sourceInfos) {
        for (var i = 0; i !== sourceInfos.length; ++i) {
            var sourceInfo = sourceInfos[i];
            if (sourceInfo.kind === 'video') {
                CAMERA_IDS.push(sourceInfo.id);
            }
        }

        cameraIdsInitialized = true;
        for (i = 0; i < cameraIdCallbacks.length; i++) {
            cameraIdCallbacks[i](CAMERA_IDS.length);
        }
        cameraIdCallbacks = [];
    }

    if (typeof MediaStreamTrack === 'undefined' ||
        typeof MediaStreamTrack.getSources === 'undefined') {
        console.log('This browser does not support MediaStreamTrack.\n\nTry Chrome.');
    } else {
        MediaStreamTrack.getSources(initializeCameraSources);
    }

    jQuery.fn.extend({
        /**
         * Initializes QR code scanning on given element.
         *  
         * @param: qrcodeSuccessCallback (function) - callback on success
         *              type: function (qrCodeMessage) {}
         * @param: qrcodeErrorCallback (function) - callback on QR parse error
         *              type: function (errorMessage) {}
         * @param: videoErrorCallback (function) - callback on video error
         *              type: function (errorMessage) {}
         * @param: cameraId (int) - which camera to use (Optional)
         * @param: config extra configurations to tune QR code scanner.
         *          Supported fields:
         *           - fps: expected framerate of qr code scanning. example { fps: 2 } means
         *              the scanning would be done every 500 ms.
         */
        html5_qrcode: function(
            qrcodeSuccessCallback,
            qrcodeErrorCallback,
            videoErrorCallback,
            cameraId,
            config) {
            return this.each(function() {
                // Initialize the callbacks
                qrcodeSuccessCallback = typeof qrcodeSuccessCallback === 'function' 
                    ? qrcodeSuccessCallback
                    : function (ignore) {
                        console.log('QR Code Success callback is undefined or not a function.');
                    }
                qrcodeErrorCallback = qrcodeErrorCallback ? qrcodeErrorCallback : function (error, stream) {}
                videoErrorCallback = typeof videoErrorCallback === 'function' ? videoErrorCallback : function (error) {
                    console.log('Error callback is undefined or not a function.', error);
                }

                cameraId = typeof cameraId != 'undefined' ? cameraId : 0;
                config = config ? config : {};
                config.fps = config.fps ? config.fps : SCAN_DEFAULT_FPS;

                var currentElem = $(this);
                // Empty current item explicitly:
                currentElem.html("");

                $.data(currentElem[0], QRCODE_SUCCESS_CALLBACK_TAG, qrcodeSuccessCallback);
                $.data(currentElem[0], QRCODE_ERROR_CALLBACK_TAG, qrcodeErrorCallback);
                $.data(currentElem[0], VIDEO_ERROR_CALLBACK_TAG, videoErrorCallback);

                if (typeof CAMERA_IDS[cameraId] != 'undefined') {
                    $.data(currentElem[0], SOURCE_ID_TAG, cameraId);
                } else {
                    $.data(currentElem[0], SOURCE_ID_TAG, 0);
                }

                if (typeof CAMERA_IDS[currentElem.data(SOURCE_ID_TAG)] != 'undefined') {
                    $.data(currentElem[0], CAMERA_ID_TAG, CAMERA_IDS[currentElem.data(SOURCE_ID_TAG)]);
                }

                var height = currentElem.height() == null ? DEFAULT_HEIGHT : currentElem.height();
                var width = currentElem.width() == null ? DEFAULT_WIDTH : currentElem.width();
                var vidElem = $(createVideoElement(width, height)).appendTo(currentElem);
                var canvasElem = $(createCanvasElement(width, height)).appendTo(currentElem);

                var video = vidElem[0];
                var canvas = canvasElem[0];
                var context = canvas.getContext('2d');
                var localMediaStream;
                var scan = function() {
                    if (localMediaStream) {
                        context.drawImage(video, 0, 0, width, height);
                        try {
                            qrcode.decode();
                        } catch (exception) {
                            qrcodeErrorCallback(exception, localMediaStream);
                        }

                        $.data(currentElem[0], TIMEOUT_TAG, setTimeout(scan, getTimeoutFromFps(config.fps)));
                    } else {
                        $.data(currentElem[0], TIMEOUT_TAG, setTimeout(scan, getTimeoutFromFps(config.fps)));
                    }
                }; //end snapshot function

                window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
                navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

                var successCallback = function (stream) {
                    video.srcObject = stream;
                    localMediaStream = stream;
                    $.data(currentElem[0], STREAM_TAG, stream);
                    $.data(currentElem[0], TIMEOUT_TAG, setTimeout(scan, getTimeoutFromFps(config.fps)));
                    video.play();
                };

                // Call the getUserMedia method with our callback functions
                if (navigator.getUserMedia) {
                    var qrcodeConfig = { video : true };
                    if (typeof currentElem.data(CAMERA_ID_TAG) != 'undefined') {
                        qrcodeConfig = {
                            video: {
                                optional: [{
                                    sourceId: currentElem.data(CAMERA_ID_TAG)
                                }]
                            }
                        };
                    }

                    navigator.getUserMedia(qrcodeConfig, successCallback, videoErrorCallback);
                } else {
                    videoErrorCallback('Native web camera streaming (getUserMedia) not supported in this browser.');
                }

                qrcode.callback = qrcodeSuccessCallback;
            }); // end of html5_qrcode
        },
        /**
         * Stops streaming QR Code video and scanning.
         */
        html5_qrcode_stop: function() {
            return this.each(function() {
                // stop the stream and cancel timeouts
                $(this).data(STREAM_TAG).getVideoTracks().forEach(function(videoTrack) {
                    videoTrack.stop();
                });

                $(this).children('video').remove();
                $(this).children('canvas').remove();
                clearTimeout($(this).data(TIMEOUT_TAG));
            });
        },
        /**
         * Switches camera if available.
         */
        html5_qrcode_switchCamera: function() {
            return this.each(function() {
                //stop the stream and cancel timeouts
                $(this).html5_qrcode_stop();
                $(this).html5_qrcode(
                    $(this).data(QRCODE_SUCCESS_CALLBACK_TAG),
                    $(this).data(QRCODE_ERROR_CALLBACK_TAG),
                    $(this).data(VIDEO_ERROR_CALLBACK_TAG),
                    ($(this).data(SOURCE_ID_TAG) + 1) % CAMERA_IDS.length
                );
            });
        },
        /**
         * Switches camera if available.
         * 
         * @deprecated use html5_qrcode_switchCamera instead.
         */
        html5_qrcode_changeCamera: function() {
            html5_qrcode_switchCamera();
        },
        /**
         * Gets the count of number of available cameras.
         * 
         * @param callback (function) called when camera count is available.
         *              type: function (cameraCount) {}   
         */
        html5_qrcode_cameraCount: function(callback) {
            if (callback == undefined) {
                return;
            }

            if (cameraIdsInitialized) {
                callback(CAMERA_IDS.length);
            }
            
            cameraIdCallbacks.push(callback);
        }
    });
})(jQuery);