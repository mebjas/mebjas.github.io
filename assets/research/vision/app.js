var FileSelector = /** @class */ (function () {
    function FileSelector(element, observer) {
        var _this = this;
        this.element = element;
        this.observer = observer;
        this.locked = false;
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
var Workspace = /** @class */ (function () {
    function Workspace(element, metadata) {
        this.maxWidth = 600;
        this.maxHeight = 400;
        this.element = element;
        this.metadata = metadata;
    }
    Workspace.prototype.updateFunction = function (fn, operatorType) {
        if (!this.lastImage) {
            console.warn("No vimage");
        }
        var clone = this.lastImage.clone();
        clone.runFn(fn, operatorType);
        clone.renderToContext(this.ctx);
        this.metadata.onCanvasUpdated(clone);
    };
    Workspace.prototype.renderInitialUi = function () {
        this.element.innerHTML = "Select an image to modify";
    };
    // TODO(mebjas): image should be of type `Image`.
    Workspace.prototype.renderImage = function (image) {
        this.element.innerHTML = "";
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
        console.log("From " + image.width + "x" + image.height + " --> " + canvasWidth + "x" + canvasHeight);
        console.assert(image.width / image.height == canvasWidth / canvasHeight, "Incorrect aspect ratio");
        this.renderCanvas(canvasWidth, canvasHeight);
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        this.ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvasWidth, canvasHeight);
        var imageData = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        this.lastImage = new VImage(imageData);
        this.metadata.onCanvasUpdated(this.lastImage);
    };
    Workspace.prototype.renderCanvas = function (width, height) {
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.marginLeft = "auto";
        canvas.style.marginRight = "auto";
        canvas.style.marginTop = "20px";
        canvas.style.border = "1px solid gray";
        this.element.appendChild(canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
    };
    return Workspace;
}());
var Toolbar = /** @class */ (function () {
    function Toolbar(element, workspace) {
        this.uiMaxHeight = 450;
        this.element = element;
        this.workspace = workspace;
        this.locked = true;
        this.render();
    }
    Toolbar.prototype.lock = function () {
        this.locked = true;
        this.element.style.opacity = "0.5";
    };
    Toolbar.prototype.unlock = function () {
        this.locked = false;
        this.element.style.opacity = "1";
    };
    Toolbar.prototype.isLocked = function () {
        return this.locked;
    };
    Toolbar.prototype.render = function () {
        var _this = this;
        this.element.style.opacity = "0.5";
        var operatorsHeader = document.createElement("div");
        operatorsHeader.innerHTML = "Operators";
        operatorsHeader.innerHTML += " (<a href='https://github.com/mebjas/mebjas.github.io/blob/master/assets/research/vision/operators.ts'>source code</a>)";
        this.element.appendChild(operatorsHeader);
        var operatorBody = document.createElement("div");
        operatorBody.style.maxHeight = this.uiMaxHeight + "px";
        operatorBody.style.overflowY = "auto";
        operatorBody.style.paddingBottom = "100px";
        this.element.appendChild(operatorBody);
        var operators = OperatorManager.getInstance().getOperators();
        console.log(operators);
        var _loop_1 = function (i) {
            var operator = operators[i];
            // Create top level element.
            var div = document.createElement("div");
            div.style.marginTop = "5px";
            div.style.border = "1px solid silver";
            operatorBody.appendChild(div);
            // Insert header
            var header = document.createElement("div");
            header.style.padding = "5px 2px";
            header.style.background = "#c0c0c059";
            header.innerHTML = operator.name;
            div.appendChild(header);
            // Insert subheader
            var subHeader = document.createElement("div");
            subHeader.innerHTML = operator.description;
            subHeader.style.fontSize = "9pt";
            // subHeader.style.marginLeft = "5px";
            header.appendChild(subHeader);
            var _loop_2 = function (j) {
                var argument = operator.arguments[j];
                var argumentDiv = document.createElement("div");
                argumentDiv.style.padding = "5px";
                argumentDiv.style.display = "flex";
                argumentDiv.style.fontSize = "10pt";
                var argumentHeader = document.createElement("div");
                argumentHeader.innerHTML = argument.name;
                argumentHeader.style.flex = "2";
                argumentDiv.appendChild(argumentHeader);
                var slider = document.createElement("input");
                slider.type = "range";
                slider.min = "" + argument.range.min;
                slider.max = "" + argument.range.max;
                slider.step = "" + argument.range.step;
                slider.value = argument.getValue();
                slider.style.flex = "3";
                argumentDiv.appendChild(slider);
                var meta = document.createElement("span");
                meta.innerHTML = "" + argument.getValue();
                meta.style.flex = "1";
                meta.style.textAlign = "center";
                slider.addEventListener('change', function (_) {
                    meta.innerHTML = "" + slider.value;
                    argument.update(slider.value);
                    var fn = operator.fn();
                    _this.workspace.updateFunction(fn, operator.type);
                });
                argumentDiv.appendChild(meta);
                div.appendChild(argumentDiv);
            };
            // Insert the arguments
            for (var j = 0; j < operator.arguments.length; ++j) {
                _loop_2(j);
            }
        };
        for (var i = 0; i < operators.length; ++i) {
            _loop_1(i);
        }
    };
    return Toolbar;
}());
var Metadata = /** @class */ (function () {
    function Metadata(element) {
        this.canvasWidth = 256;
        this.canvasHeight = 100;
        this.element = element;
    }
    Metadata.prototype.renderInitialUi = function () {
        var histHeader = document.createElement("div");
        histHeader.innerHTML = "Histogram";
        this.element.appendChild(histHeader);
        var histCanvas = document.createElement("canvas");
        histCanvas.width = this.canvasWidth;
        histCanvas.height = this.canvasHeight;
        histCanvas.style.border = "1px solid gray";
        this.histCtx = histCanvas.getContext("2d");
        this.element.appendChild(histCanvas);
        var cdfHeader = document.createElement("div");
        cdfHeader.innerHTML = "Cumulative distribution Fn";
        this.element.appendChild(cdfHeader);
        var cdfCanvas = document.createElement("canvas");
        cdfCanvas.width = this.canvasWidth;
        cdfCanvas.height = this.canvasHeight;
        cdfCanvas.style.border = "1px solid gray";
        this.cdfCtx = cdfCanvas.getContext("2d");
        this.element.appendChild(cdfCanvas);
    };
    Metadata.prototype.onCanvasUpdated = function (image) {
        if (!this.histCtx || !this.cdfCtx) {
            return;
        }
        var histograms = new Histograms(image);
        histograms.renderToContext(this.histCtx, this.canvasWidth, this.canvasHeight);
        var cdfs = new CDFs(histograms);
        cdfs.renderToContext(this.cdfCtx, this.canvasWidth, this.canvasHeight);
    };
    return Metadata;
}());
var App = /** @class */ (function () {
    function App(fileSelectorElem, workspaceElem, toolbarElem, metadataElem) {
        var _this = this;
        this.fileSelector = new FileSelector(fileSelectorElem, function (image) {
            _this.onImageLoaded(image);
            _this.toolbar.unlock();
        });
        this.metadata = new Metadata(metadataElem);
        this.workspace = new Workspace(workspaceElem, this.metadata);
        this.toolbar = new Toolbar(toolbarElem, this.workspace);
    }
    App.prototype.render = function () {
        this.workspace.renderInitialUi();
        this.metadata.renderInitialUi();
    };
    App.prototype.onImageLoaded = function (image) {
        this.workspace.renderImage(image);
    };
    return App;
}());
//# sourceMappingURL=app.js.map