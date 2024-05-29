/**
 * Editor library.
 * 
 * Author: minhazav@gmail.com
 */

//#region Global interfaces

// Interface for size.
interface Size {
    width: number;
    height: number;
}

interface OffsetPosition {
    x: number;
    y: number;
};

// Information for binding UI with context.
interface UiBindInfo {
    id: string;
    path: string;
};

type OnImageLoadedCallback = (img: HTMLImageElement) => void;
type OnZoomOrPanCallback = (zoomFactor: number, offset: OffsetPosition) => void;
//#endregion

//#region Global GL functions
function isGlSupported(): boolean {
    let canvas = document.createElement("canvas");
    let gl = canvas.getContext("webgl");
    if (gl) {
        return true;
    }
    return false;
}

function createShader(gl: WebGLRenderingContext, type, source) {
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
  
function createProgram(gl: WebGLRenderingContext,
    vertexShader: WebGLShader, fragmentShader: WebGLShader) {
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

function setRectangle(gl: WebGLRenderingContext, x: number, y: number,
    width: number, height: number) {
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
function clip(val: number, min: number, max: number): number {
    if (val < min) return min;
    if (val > max) return max;
    return val;
}

// returns scaled dimensions object
function getScaledDimension(imageSize: Size, maxSize: Size): Size {
    let ratio = imageSize.width / imageSize.height;
    var scaled = {
        width: imageSize.width,
        height: imageSize.height
    }
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
function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
   
    // Check if the canvas is not the same size.
    const needResize = canvas.width  !== displayWidth ||
                       canvas.height !== displayHeight;
   
    if (needResize) {
      // Make the canvas the same size
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
    }
   
    return needResize;
}

// Resize the canvas data width and height.
function resizeCanvas(canvas: any) {
    // Reset canvas dimensions.
    let canvasWidth = canvas.width;
    let canvasHeight = Math.ceil(canvasWidth * 3/4);
    canvas.height = canvasHeight;
    canvas.dataMaxWidth = canvas.width;
    canvas.dataMaxHeight = canvas.height;
}

// Helper to handle image select change.
function onImageSelectedHelper(files: FileList, callback: OnImageLoadedCallback) {
    var reader  = new FileReader();
    var file = files[0];
    var img = new Image();
    img.onload = function() {
        callback(img);
    }
    // this is to setup loading the image
    reader.onloadend = function () {
        let srcString:string = reader.result.toString();
        img.src = srcString;
    }
    // this is to read the file
    reader.readAsDataURL(file);
}

function registerZoomAndPanHandlers(canvas: HTMLCanvasElement,
    onZoomOrPanCallback: OnZoomOrPanCallback) {
    // Register zoom handler.
    let zoomFactor = 1.0;
    const zoomFactorDelta = 0.2;
    const maxZoomFactor = 8;
    const minZoomFactor = 1 / maxZoomFactor;

    let isMouseDown = false;
    let mouseCoord = {x: -1, y: -1};

    const offsetFactor = 0.5;
    let offset: OffsetPosition = {x: 0, y: 0};

    canvas.addEventListener("wheel", function(event) {
        if (event.deltaY < 0) {
            // Zoom in.
            zoomFactor += zoomFactorDelta;
        } else {
            zoomFactor -= zoomFactorDelta;
        }

        zoomFactor = clip(zoomFactor, minZoomFactor, maxZoomFactor);
        onZoomOrPanCallback(zoomFactor, offset);
    });

    function mouseMove(event) {
        function getCoord(event): OffsetPosition {
            let coord: OffsetPosition = {
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
        } else if (event.type === "mouseup") {
            isMouseDown = false;
        }

        let newCoord = getCoord(event);
        if (isMouseDown) {
            let mouseMovement:any = {};
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
//#endregion

//#region global classes

type OnImageLoadedListener = (isImageLoaded: boolean) => void;

class ImageLoader {
    private isImageLoaded: boolean = false;
    private listeners: Array<OnImageLoadedListener> = [];

    public constructor(
        inputElement: HTMLInputElement,
        onImageLoadedCallback: OnImageLoadedCallback) {
        let $this = this;
        inputElement.addEventListener("change", function(event) {
            var files = inputElement.files;
            onImageSelectedHelper(files, onImageLoadedCallback);
            $this.isImageLoaded = true;

            $this.listeners.forEach(function(listener) {
                listener(true);
            });
        });
    }

    public registerListeners(listener: OnImageLoadedListener) {
        this.listeners.push(listener);
    }

    public isLoaded(): boolean { return this.isImageLoaded; }
}

class UiBinder {
    private isImageLoaded: boolean = false;

    private readonly bindInfos: Array<UiBindInfo>;
    private readonly target: any;

    public constructor(bindInfos: Array<UiBindInfo>, target: any, imageLoader: ImageLoader) {
        this.bindInfos = bindInfos;
        this.target = target;

        this.isImageLoaded = imageLoader.isLoaded();
        imageLoader.registerListeners((_) => {
            this.isImageLoaded = true;
        });
    }

    public bind() {
        let $this = this;
        this.bindInfos.forEach(function(val) {
            let slider = document.getElementById(val.id) as HTMLInputElement;
            slider.addEventListener("input", function() {
                if (!$this.isImageLoaded) {
                    return;
                }
                let value = slider.value;
                let target = $this.target;
                let splitPath = val.path.split("/");
                for (let i = 0; i < splitPath.length - 1; ++i) {
                    let key = splitPath[i];
                    if (!(key in target)) {
                        throw `${key} not found in ${i}`;
                    }
                    target = target[key];
                }
                // to ensure reference.
                target[splitPath[splitPath.length - 1]] = value;
            });
        });
    }
}

//#endregion