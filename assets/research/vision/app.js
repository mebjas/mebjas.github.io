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
        this.maxHeight = 800;
        this.element = element;
        this.metadata = metadata;
    }
    Workspace.prototype.updateFunction = function (fn, operatorType) {
        if (!this.lastImage) {
            console.warn("No vimage");
        }
        var t0 = performance.now();
        var clone = this.lastImage.clone();
        clone.runFn(fn, operatorType);
        var t1 = performance.now();
        clone.renderToContext(this.ctx);
        var t2 = performance.now();
        this.metadata.onCanvasUpdated(clone);
        var t3 = performance.now();
        var operationTime = (t1 - t0).toPrecision(4);
        var imageRenderTime = (t2 - t1).toPrecision(4);
        var histRenderingime = (t3 - t2).toPrecision(4);
        this.metadata.updatePerfString("Image Operation: " + operationTime + " ms<br>"
            + ("Image Render: " + imageRenderTime + " ms<br>")
            + ("Histogram Render: " + histRenderingime + " ms"));
    };
    Workspace.prototype.reset = function () {
        this.lastImage.reset().renderToContext(this.ctx);
        this.metadata.onCanvasUpdated(this.lastImage);
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
        console.assert(Math.abs((image.width / image.height)
            - (canvasWidth / canvasHeight)) < 0.01, "Incorrect aspect ratio");
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
        this.ctx = canvas.getContext("2d");
    };
    return Workspace;
}());
;
var Toolbar = /** @class */ (function () {
    function Toolbar(element, workspace, footerElem) {
        this.operatorElementMap = {};
        this.element = element;
        this.workspace = workspace;
        this.locked = true;
        this.render(footerElem.offsetTop);
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
    Toolbar.prototype.render = function (footerOffsetTop) {
        var _this = this;
        this.element.style.opacity = "0.5";
        var operatorsHeader = document.createElement("div");
        operatorsHeader.innerHTML = "Operators";
        operatorsHeader.innerHTML += " (<a href='https://github.com/mebjas/mebjas.github.io/blob/master/assets/research/vision/operators.ts'>source code</a>)";
        this.element.appendChild(operatorsHeader);
        var resetLink = document.createElement("a");
        resetLink.innerHTML = "reset";
        resetLink.href = "#reset";
        resetLink.style.marginLeft = "5px";
        resetLink.addEventListener("click", function (_) { return _this.reset(); });
        operatorsHeader.appendChild(resetLink);
        var operatorBody = document.createElement("div");
        var maxHeight = footerOffsetTop - this.element.offsetTop - 100;
        operatorBody.style.maxHeight = maxHeight + "px";
        operatorBody.style.overflowY = "auto";
        operatorBody.style.paddingBottom = "100px";
        this.element.appendChild(operatorBody);
        var operators = OperatorManager.getInstance().getOperators();
        var _loop_1 = function (i) {
            var operator = operators[i];
            this_1.operatorElementMap[operator.name] = [];
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
                var argumentElement;
                if (argument.type == OperatorArgumentType.Continous) {
                    if (!argument.range) {
                        throw "Argument #" + argument.name + " "
                            + "is continous w/o vrange";
                    }
                    var slider = document.createElement("input");
                    slider.type = "range";
                    slider.min = "" + argument.range.min;
                    slider.max = "" + argument.range.max;
                    slider.step = "" + argument.range.step;
                    slider.value = argument.getValue();
                    slider.style.flex = "3";
                    argumentDiv.appendChild(slider);
                    argumentElement = slider;
                }
                else if (argument.type == OperatorArgumentType.Discrete) {
                    if (!argument.discreteValues) {
                        throw "Argument #" + argument.name + " "
                            + "is continous w/o discreteValues";
                    }
                    var select = document.createElement("select");
                    for (var k = 0; k < argument.discreteValues.length; ++k) {
                        var possibleValue = argument.discreteValues[k];
                        var option = document.createElement("option");
                        option.value = possibleValue;
                        option.innerHTML = possibleValue;
                        select.appendChild(option);
                    }
                    select.value = "" + argument.defaultValue;
                    argumentDiv.appendChild(select);
                    argumentElement = select;
                }
                else {
                    throw "Unknown argument of type " + argument.type;
                }
                this_1.operatorElementMap[operator.name].push({
                    element: argumentElement,
                    defaultValue: argument.defaultValue
                });
                var meta = document.createElement("span");
                meta.innerHTML = "" + argument.getValue();
                meta.style.flex = "1";
                meta.style.textAlign = "center";
                argumentElement.addEventListener('change', function (_) {
                    meta.innerHTML = "" + argumentElement.value;
                    argument.update(argumentElement.value);
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
        var this_1 = this;
        for (var i = 0; i < operators.length; ++i) {
            _loop_1(i);
        }
    };
    Toolbar.prototype.reset = function () {
        var _this = this;
        var keys = Object.keys(this.operatorElementMap);
        keys.forEach(function (key) {
            var argumentElementValuePairs = _this.operatorElementMap[key];
            argumentElementValuePairs.forEach(function (pair) {
                var isChanged = (pair.element.value !== "" + pair.defaultValue);
                if (!isChanged) {
                    return;
                }
                pair.element.value = "" + pair.defaultValue;
                var changeEvent = new Event('change');
                pair.element.dispatchEvent(changeEvent);
            });
        });
        // TODO(mebjas): Move to original image and not the inverted value.
        this.workspace.reset();
    };
    return Toolbar;
}());
var Metadata = /** @class */ (function () {
    function Metadata(element) {
        var _this = this;
        this.channelsToShow = {};
        this.canvasWidth = 256;
        this.canvasHeight = 100;
        this.element = element;
        // Initialize channels to show.
        AllChannels.forEach(function (channel) {
            _this.channelsToShow[channel] = true;
        });
    }
    Metadata.prototype.renderInitialUi = function () {
        var _this = this;
        var histHeader = document.createElement("div");
        histHeader.innerHTML = "Histogram ";
        this.element.appendChild(histHeader);
        AllChannels.forEach(function (channel) {
            var channelSpan = document.createElement("span");
            var checkBox = document.createElement("input");
            checkBox.type = "checkbox";
            checkBox.checked = _this.channelsToShow[channel];
            channelSpan.appendChild(checkBox);
            var channelTag = document.createElement("span");
            channelTag.innerHTML = " " + getChannelCode(channel) + " ";
            channelSpan.appendChild(channelTag);
            checkBox.addEventListener("change", function (_) {
                var isChecked = checkBox.checked;
                _this.channelsToShow[channel] = isChecked;
                _this.updateLastHistogram();
            });
            // after everything.
            histHeader.appendChild(channelSpan);
        });
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
        var perfHeader = document.createElement("div");
        perfHeader.innerHTML = "Performance";
        this.element.appendChild(perfHeader);
        this.perfSection = document.createElement("div");
        this.perfSection.innerHTML = "No operations yet";
        this.element.appendChild(this.perfSection);
    };
    Metadata.prototype.onCanvasUpdated = function (image) {
        if (!this.histCtx || !this.cdfCtx) {
            return;
        }
        this.lastImage = image;
        var histograms = new Histograms(image);
        histograms.renderToContext(this.histCtx, this.canvasWidth, this.canvasHeight, this.channelsToShow);
        var cdfs = new CDFs(histograms);
        cdfs.renderToContext(this.cdfCtx, this.canvasWidth, this.canvasHeight, this.channelsToShow);
    };
    Metadata.prototype.updatePerfString = function (perfString) {
        if (!this.perfSection) {
            console.warn("No perfSection, logged perf = " + perfString);
        }
        this.perfSection.innerHTML = perfString;
    };
    Metadata.prototype.updateLastHistogram = function () {
        if (!this.lastImage) {
            return;
        }
        this.onCanvasUpdated(this.lastImage);
    };
    return Metadata;
}());
var App = /** @class */ (function () {
    function App(fileSelectorElem, workspaceElem, toolbarElem, metadataElem, footerElem) {
        var _this = this;
        this.metadata = new Metadata(metadataElem);
        this.workspace = new Workspace(workspaceElem, this.metadata);
        this.toolbar = new Toolbar(toolbarElem, this.workspace, footerElem);
        // Unused argument.
        var unusedFileSelector = new FileSelector(fileSelectorElem, function (image) {
            _this.onImageLoaded(image);
            _this.toolbar.unlock();
        });
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