//#region File Selector
var FileSelector = /** @class */ (function () {
    function FileSelector(element, observer) {
        var _this = this;
        this.element = element;
        this.observer = observer;
        this.locked = false;
        var hack = new Image();
        hack.onload = function() {
            _this.observer(hack);
        }
        hack.src = "/assets/research/image-callibration/color_chart-492x600.png";

        this.fileReader = new FileReader();
        this.fileReader.onload
            = function (fr, _) { return _this.loadImage(fr, _); };
        this.element.addEventListener('change', function (_) {
            var file = _this.element.files[0];
            if (file) {
                _this.fileReader.readAsDataURL(file);
            }
        });
    }
    FileSelector.prototype.lock = function () {
        this.element.disabled = true;
        this.locked = true;
    };
    FileSelector.prototype.unlock = function () {
        this.element.disabled = false;
        this.locked = false;
    };
    FileSelector.prototype.isLocked = function () {
        return this.locked;
    };
    FileSelector.prototype.loadImage = function (fr, _) {
        var _this = this;
        var image = new Image();
        image.onload = function (_) {
            if (_this.observer) {
                _this.observer(image);
            }
        };
        image.src = this.fileReader.result;
    };
    return FileSelector;
}());
//#endregion

//#region Logger
var Logger = /** @class */ (function () {
    function Logger(element) {
        var _this = this;
        this.element = element;
    }

    Logger.prototype.render = function() {
        var _this = this;

        //#region Clear button
        var clearLink = document.createElement("a");
        clearLink.innerHTML = "clear";
        clearLink.href = "#clearLogs";
        clearLink.style.marginLeft = "5px";
        clearLink.addEventListener("click", function (_) { return _this.__reset(); });
        this.element.appendChild(clearLink);
        //#endregion

        //#region The logger element
        this.loggerElem = document.createElement("div");
        this.element.appendChild(this.loggerElem);

        this.loggerElem.style.width = "95%";
        this.loggerElem.style.fontSize = "10pt";
        this.loggerElem.style.display = "block";
        this.loggerElem.style.padding = "10px";
        this.loggerElem.style.background = "#000000";
        this.loggerElem.style.color = "#00ff00";
        this.loggerElem.style.maxHeight = "500px";
        this.loggerElem.style.overflow = "auto";
        //#endregion

        this.log("Logs:")
    }

    Logger.prototype.log = function(message) {
        var logElem = document.createElement("div");
        logElem.innerText = `$ ${message}`;
        logElem.style.marginBottom = `5px`;
        this.loggerElem.appendChild(logElem);
    }

    Logger.prototype.__reset = function() {
        this.loggerElem.innerHTML = "<div>Logs:</div>";
    }

    return Logger;
}());
//#endregion

//#region Workspace
var Workspace = /** Class */ (function() {
    function Workspace(element, logger) {
        this.maxWidth = 600;
        this.maxHeight = 800;
        this.element = element;
        this.logger = logger;

        this.imageMat = undefined;
        this.currentWidth = undefined;
        this.currentHeight = undefined;
    }

    Workspace.prototype.renderInitialUi = function () {
        this.element.innerHTML = "Select an image to modify";
    };

    Workspace.prototype.renderImage = function(image) {
        this.__reset();
        var canvasWidth = image.width;
        var canvasHeight = image.height;

        if (canvasWidth > this.maxWidth) {
            canvasHeight = this.maxWidth / canvasWidth * canvasHeight;
            canvasWidth = this.maxWidth;
        }
        if (canvasHeight > this.maxHeight) {
            canvasWidth = this.maxHeight / canvasHeight * canvasWidth;
            canvasHeight = this.maxHeight;
        }

        this.currentWidth = canvasWidth;
        this.currentHeight = canvasHeight;

        console.log("From " + image.width + "x" + image.height + " --> " + canvasWidth + "x" + canvasHeight);
        console.assert(Math.abs((image.width / image.height)
            - (canvasWidth / canvasHeight)) < 0.01, "Incorrect aspect ratio");

        this.__renderCanvas(canvasWidth, canvasHeight);
        this.imageMat = cv.imread(image);
        cv.imshow(this.__getId(), this.imageMat);

        this.logger.log(`Rendered initial canvas at ${this.currentWidth}x${this.currentHeight}`);
    }

    Workspace.prototype.renderMat = function(imageMat) {
        console.assert(imageMat.cols === this.currentWidth);
        console.assert(imageMat.rows === this.currentHeight);
        cv.imshow(this.__getId(), imageMat);
        this.imageMat = imageMat;

        this.logger.log(`Rendered canvas with mat at ${this.currentWidth}x${this.currentHeight}`);
    }

    Workspace.prototype.rotateClockwise = function() {
        // TODO(mebjas): Add support for rotation by any type.
        if (!this.imageMat) {
            throw "The workspace is not rendered yet.";
        }

        console.assert(this.currentWidth !== undefined);
        console.assert(this.currentHeight !== undefined);

        var newWidth = this.currentHeight;
        var newHeight = this.currentWidth;
        let newImageMat = new cv.Mat();
        cv.rotate(this.imageMat, newImageMat, cv.ROTATE_90_CLOCKWISE);
        this.__reset();
        this.__renderCanvas(newWidth, newHeight);
        cv.imshow(this.__getId(), newImageMat);

        this.imageMat = newImageMat;
        this.currentWidth = newWidth;
        this.currentHeight = newHeight;

        this.logger.log("Workspace Rotated clockwise");
    }

    Workspace.prototype.getImageMat = function() {
        if (this.imageMat === undefined) {
            throw "Workspace is not rendered yet.";
        }

        return this.imageMat;
    }

    //#region Private methods
    Workspace.prototype.__reset = function() {
        this.element.innerHTML = "";
    }

    Workspace.prototype.__getId = function() {
        return "workspace_canvas_element";
    }

    Workspace.prototype.__renderCanvas = function (width, height) {
        var canvas = document.createElement('canvas');
        canvas.id = this.__getId();
        canvas.width = width;
        canvas.height = height;
        canvas.style.marginLeft = "auto";
        canvas.style.marginRight = "auto";
        canvas.style.marginTop = "20px";
        canvas.style.border = "1px solid gray";
        this.element.appendChild(canvas);
    };
    //#endregion

    return Workspace;
}());
//#endregion

//#region App
var App = /** @class */ (function () {
    function App(fileSelectorElem, workspaceElem, toolbarElem, loggerElem, footerElem) {
        var _this = this;
        this.logger = new Logger(loggerElem);
        this.workspace = new Workspace(workspaceElem, this.logger);
        this.toolbar = new Toolbar(toolbarElem, this.workspace, footerElem, this.logger);
        // Unused argument.
        var unusedFileSelector = new FileSelector(fileSelectorElem, function (image) {
            _this.onImageLoaded(image);
            _this.toolbar.unlock();
        });
    }
    App.prototype.render = function () {
        this.logger.render();
        this.workspace.renderInitialUi();
    };
    App.prototype.onImageLoaded = function (image) {
        this.workspace.renderImage(image);
        this.toolbar.onImageLoaded();
    };
    return App;
}());
//#endregion

//#region Global functions
var ColorChecker24 = /** Class */ (function() {
    function ColorChecker24(workspace, logger) {
        this.workspace = workspace;
        this.logger = logger;

        this.mat = workspace.getImageMat();
        logger.log(`Got image of size ${this.mat.cols}x${this.mat.rows}`);
    }

    ColorChecker24.prototype.onImageRotated = function() {
        this.mat = this.workspace.getImageMat();
    }

    ColorChecker24.prototype.estimate = function(config) {
        function fillConfig(config) {
            config = config || {};
            config.thresholdMin = config.thresholdMin || 80;
            config.thresholdMax = config.thresholdMax || 255;
            config.contourMinArea = config.contourMinArea || 1000;
            return config;
        }

        //#region initial steps
        config = fillConfig(config);
        this.logger.log(`Config = ${JSON.stringify(config)}`);

        // var matCopy = this.mat.clone();
        var gray = new cv.Mat();
        cv.cvtColor(this.mat, gray, cv.COLOR_RGB2GRAY);
        this.logger.log("rgb -> gray");

        var median = new cv.Mat();
        cv.medianBlur(gray, median, 5);
        delete gray;
        this.logger.log("median");

        var kernel = cv.matFromArray(
            3, 3, cv.CV_32FC1, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
        var sharpened = new cv.Mat();
        cv.filter2D(median, sharpened, -1, kernel);
        delete median;
        this.logger.log("sharpened");

        var threshold = new cv.Mat();
        // TODO(mebjas): make the params via UI.
        cv.threshold(
            sharpened,
            threshold,
            config.thresholdMin,
            config.thresholdMax,
            cv.THRESH_BINARY);
        delete sharpened;
        this.logger.log("thresholding done.");

        var contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(
            threshold, contours, hierarchy, cv.RETR_TREE,
            cv.CHAIN_APPROX_SIMPLE);
        delete threshold;


        var validSquares = new cv.MatVector();
        for (let i = 0; i < contours.size(); ++i) {
            var cnt = contours.get(i);
            var data_length = cv.arcLength(cnt, true);
            var data = new cv.Mat();
            cv.approxPolyDP(cnt, data, 0.02 * data_length, true);
            if (data.rows == 4
                && cv.contourArea(data) > config.contourMinArea
                && cv.isContourConvex(data)) {
                validSquares.push_back(data);
            }
        }
        delete contours;
        //#endregion

        var imageClone = this.mat.clone();
        var color = new cv.Scalar(0, 255, 0, 255);
        cv.drawContours(imageClone, validSquares, -1, color, 2, cv.LINE_8);

        // 1. Figure out the top left rectange.
        // 2. Figure out the average edge size of rectange
        // 3. Estimate the whole grid
        // 4. Get average value of each grid
        // 5. Match the observed values, with the expected value
        // 6. Compute a inverse curve
        

        function topLeftCoord(cnt) {
            var coords = cnt.data32S;
            var tl = [coords[0], coords[1]];
            for (var j = 2; j < coords.length; j = j + 2) {
                if (coords[j] <= tl[0] && coords[j + 1] <= tl[1]) {
                    tl = [coords[j], coords[j + 1]];
                }
            }
            return tl;
        }
        var tlCnt, tlCntCoord;
        for (var i = 0; i < validSquares.size(); ++i) {
            var tl = topLeftCoord(validSquares.get(i));
            if (!tlCnt) {
                tlCnt = validSquares.get(i).clone();
                tlCntCoord = tl;
            } else if (tl[0] <= tlCntCoord[0] && tl[1] <= tlCntCoord[0]) {
                tlCnt = validSquares.get(i).clone();
                tlCntCoord = tl;
            }
        }

        // cv.rectangle(imageClone, imageClone, tlCnt, new cv.Scalar(255, 0, 0), -1, 0, 0);
        console.log(tlCntCoord);

        this.workspace.renderMat(imageClone);
        this.logger.log("render");
    }

    return ColorChecker24;
}());
//#endregion