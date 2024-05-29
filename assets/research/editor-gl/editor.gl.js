/**
 * Editor library.
 *
 * Author: minhazav@gmail.com
 */
;
;
//#endregion
//#region Global GL functions
function isGlSupported() {
    var canvas = document.createElement("canvas");
    var gl = canvas.getContext("webgl");
    if (gl) {
        return true;
    }
    return false;
}
function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}
function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}
function setRectangle(gl, x, y, width, height) {
    var x1 = x;
    var x2 = x + width;
    var y1 = y;
    var y2 = y + height;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2,
    ]), gl.STATIC_DRAW);
}
//#endregion
//#region General global functions
// Clips the {@param val} between {@param min} and {@param max}.
function clip(val, min, max) {
    if (val < min)
        return min;
    if (val > max)
        return max;
    return val;
}
// returns scaled dimensions object
function getScaledDimension(imageSize, maxSize) {
    var ratio = imageSize.width / imageSize.height;
    var scaled = {
        width: imageSize.width,
        height: imageSize.height
    };
    if (scaled.width > maxSize.width) {
        scaled.width = maxSize.width;
        scaled.height = scaled.width / ratio;
    }
    if (scaled.height > maxSize.height) {
        scaled.height = maxSize.height;
        scaled.width = scaled.height / ratio;
    }
    return scaled;
}
// Resize the canvas to the display size.
function resizeCanvasToDisplaySize(canvas) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    var displayWidth = canvas.clientWidth;
    var displayHeight = canvas.clientHeight;
    // Check if the canvas is not the same size.
    var needResize = canvas.width !== displayWidth ||
        canvas.height !== displayHeight;
    if (needResize) {
        // Make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
    return needResize;
}
// Resize the canvas data width and height.
function resizeCanvas(canvas) {
    // Reset canvas dimensions.
    var canvasWidth = canvas.width;
    var canvasHeight = Math.ceil(canvasWidth * 3 / 4);
    canvas.height = canvasHeight;
    canvas.dataMaxWidth = canvas.width;
    canvas.dataMaxHeight = canvas.height;
}
// Helper to handle image select change.
function onImageSelectedHelper(files, callback) {
    var reader = new FileReader();
    var file = files[0];
    var img = new Image();
    img.onload = function () {
        callback(img);
    };
    // this is to setup loading the image
    reader.onloadend = function () {
        var srcString = reader.result.toString();
        img.src = srcString;
    };
    // this is to read the file
    reader.readAsDataURL(file);
}
function registerZoomAndPanHandlers(canvas, onZoomOrPanCallback) {
    // Register zoom handler.
    var zoomFactor = 1.0;
    var zoomFactorDelta = 0.2;
    var maxZoomFactor = 8;
    var minZoomFactor = 1 / maxZoomFactor;
    var isMouseDown = false;
    var mouseCoord = { x: -1, y: -1 };
    var offsetFactor = 1;
    var offset = { x: 0, y: 0 };
    canvas.addEventListener("wheel", function (event) {
        if (event.deltaY < 0) {
            // Zoom in.
            zoomFactor += zoomFactorDelta;
        }
        else {
            zoomFactor -= zoomFactorDelta;
        }
        zoomFactor = clip(zoomFactor, minZoomFactor, maxZoomFactor);
        onZoomOrPanCallback(zoomFactor, offset);
    });
    function mouseMove(event) {
        function getCoord(event) {
            var coord = {
                x: event.offsetX,
                y: event.offsetY
            };
            if (coord.x === undefined) {
                coord.x = event.clientX;
                coord.y = event.clientY;
            }
            return coord;
        }
        if (event.type === "mousedown") {
            isMouseDown = true;
        }
        else if (event.type === "mouseup") {
            isMouseDown = false;
        }
        var newCoord = getCoord(event);
        if (isMouseDown) {
            var mouseMovement = {};
            mouseMovement.dx = newCoord.x - mouseCoord.x;
            mouseMovement.dy = newCoord.y - mouseCoord.y;
            offset.x += mouseMovement.dx / offsetFactor;
            offset.y += mouseMovement.dy / offsetFactor;
            onZoomOrPanCallback(zoomFactor, offset);
        }
        mouseCoord = newCoord;
    }
    canvas.addEventListener("click", mouseMove);
    canvas.addEventListener("mousemove", mouseMove);
    canvas.addEventListener("mousedown", mouseMove);
    canvas.addEventListener("mouseup", mouseMove);
    canvas.addEventListener("mouseout", mouseMove);
    canvas.addEventListener("mouseover", mouseMove);
    canvas.addEventListener("mousewheel", mouseMove);
    canvas.addEventListener("DOMMouseScroll", mouseMove); // fire fox
}
var ImageLoader = /** @class */ (function () {
    function ImageLoader(inputElement, onImageLoadedCallback) {
        this.isImageLoaded = false;
        this.listeners = [];
        var $this = this;
        inputElement.addEventListener("change", function (event) {
            var files = inputElement.files;
            onImageSelectedHelper(files, onImageLoadedCallback);
            $this.isImageLoaded = true;
            $this.listeners.forEach(function (listener) {
                listener(true);
            });
        });
    }
    ImageLoader.prototype.registerListeners = function (listener) {
        this.listeners.push(listener);
    };
    ImageLoader.prototype.isLoaded = function () { return this.isImageLoaded; };
    return ImageLoader;
}());
var UiBinder = /** @class */ (function () {
    function UiBinder(bindInfos, target, imageLoader) {
        var _this = this;
        this.isImageLoaded = false;
        this.bindInfos = bindInfos;
        this.target = target;
        this.isImageLoaded = imageLoader.isLoaded();
        imageLoader.registerListeners(function (_) {
            _this.isImageLoaded = true;
        });
    }
    UiBinder.prototype.bind = function () {
        var $this = this;
        this.bindInfos.forEach(function (val) {
            var slider = document.getElementById(val.id);
            slider.addEventListener("input", function () {
                if (!$this.isImageLoaded) {
                    return;
                }
                var value = slider.value;
                var target = $this.target;
                var splitPath = val.path.split("/");
                for (var i = 0; i < splitPath.length - 1; ++i) {
                    var key = splitPath[i];
                    if (!(key in target)) {
                        throw key + " not found in " + i;
                    }
                    target = target[key];
                }
                // to ensure reference.
                target[splitPath[splitPath.length - 1]] = value;
            });
        });
    };
    return UiBinder;
}());
//#endregion
//# sourceMappingURL=editor.gl.js.map