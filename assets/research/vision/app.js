class FileSelector {
    constructor(element, observer) {
        this.element = element;
        this.observer = observer;

        this.isLocked = false;
        this.fileReader = new FileReader();
        this.fileReader.onload = r => this._loadImage(r);

        let $this = this;
        this.element.addEventListener('change', evt => {
            let file = $this.element.files[0];
            if (file) {
                $this.fileReader.readAsDataURL(file);
            }
        });
    }

    lock() {
        this.element.disabled = true;
    }

    unlock() {
        this.element.disabled = false;
    }

    _loadImage(result) {
        let $this = this;
        let image = new Image();
        image.onload = _ => {
            if ($this.observer) {
                $this.observer(image);
            }
        }

        image.src = this.fileReader.result;
    }
}

class Toolbar {
    constructor(element, workspace) {
        this.element = element;
        this.workspace = workspace;

        this.isLocked = true;
        this.renderInitialUi();
    }

    lock() {
        this.isLocked = true;
        this.element.style.opacity = "0.5";
    }

    unlock() {
        this.isLocked = false;
        this.element.style.opacity = "1";
    }

    renderInitialUi() {
        let $this = this;
        this.element.style.opacity = "0.5";

        let operatorsHeader = document.createElement("div");
        operatorsHeader.innerHTML = "Operators";
        this.element.appendChild(operatorsHeader);

        let operators = OperatorManager.getInstance().getOperators();
        console.log(operators);
        for (let i = 0; i < operators.length; ++i) {
            let operator = operators[i];

            // Insert header
            let div = document.createElement("div");
            div.style.padding = "5px";
            div.style.marginTop = "5px";
            div.style.border = "1px solid silver";
            let header = document.createElement("div");
            header.innerHTML = operator.name;
            div.appendChild(header);

            // Insert the arguments
            for (let j = 0; j < operator.arguments.length; ++j) {
                let argument = operator.arguments[j];
                let argumentDiv = document.createElement("div");
                let argumentHeader = document.createElement("div");
                argumentHeader.innerHTML = argument.name;
                argumentDiv.appendChild(argumentHeader);

                let slider = document.createElement("input");
                slider.type = "range";
                slider.min = argument.range.min;
                slider.max = argument.range.max;
                slider.step = argument.range.step;
                slider.value = argument.getValue();
                argumentDiv.appendChild(slider);

                let meta = document.createElement("span");
                meta.innerHTML = `Value = ${argument.getValue()}`;
                slider.addEventListener('change', _ => {
                    meta.innerHTML = `Value = ${slider.value}`;
                    argument.update(slider.value);
                    let fn = operator.fn();
                    $this.workspace.updateFunction(fn);
                });
                argumentDiv.appendChild(meta);
                div.appendChild(argumentDiv);
            }
            // Insert the footer
            let footer = document.createElement("div");
            footer.innerHTML = operator.description;
            div.appendChild(footer);
            this.element.appendChild(div);
        }
    }
}

class Metadata {
    constructor(element) {
        this.element = element;
        this.imageCtx = undefined;

        this.canvasWidth = 256;
        this.canvasHeight = 100;
    }

    renderInitialUi() {
        let histHeader = document.createElement("div");
        histHeader.innerHTML = "Histogram";
        this.element.appendChild(histHeader);

        let histCanvas = document.createElement("canvas");
        histCanvas.width = this.canvasWidth;
        histCanvas.height = this.canvasHeight;
        histCanvas.style.border = "1px solid gray";
        this.histCtx = histCanvas.getContext("2d");
        this.histCtx.width = this.canvasWidth;
        this.histCtx.height = this.canvasHeight;
        this.element.appendChild(histCanvas);

        let cdfHeader = document.createElement("div");
        cdfHeader.innerHTML = "Cumulative distribution Fn";
        this.element.appendChild(cdfHeader);

        let cdfCanvas = document.createElement("canvas");
        cdfCanvas.width = this.canvasWidth;
        cdfCanvas.height = this.canvasHeight;
        cdfCanvas.style.border = "1px solid gray";
        this.cdfCtx = cdfCanvas.getContext("2d");
        this.cdfCtx.width = this.canvasWidth;
        this.cdfCtx.height = this.canvasHeight;
        this.element.appendChild(cdfCanvas);
    }

    onCanvasUpdated(image) {
        if (!this.histCtx || !this.cdfCtx) {
            return;
        }
        let histograms = new Histograms(image);
        histograms.renderToContext(
            this.histCtx, this.canvasWidth, this.canvasHeight);

        let cdfs = new CDFs(histograms);
        cdfs.renderToContext(
            this.cdfCtx, this.canvasWidth, this.canvasHeight);
    }
}

class Workspace {
    constructor(element, metadata) {
        this.element = element;
        this.metadata = metadata;

        this.width = 600;
        this.height = 400;

        this.lastVImage = undefined;
    }

    renderInitialUi() {
        this.element.innerHTML = "Select an image to modify";
        let canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.style.marginLeft = "auto";
        canvas.style.marginRight = "auto";
        canvas.style.marginTop = "20px";
        canvas.style.border = "1px solid gray";
        this.element.appendChild(canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.ctx.width = this.width;
        this.ctx.height = this.height;
    }

    renderImage(image) {
        // TODO(mebjas): handle width & height & center positioning
        let srcWidth = image.width,
            srcHeight = image.height,
            srcX = 0,
            srcY = 0;
        let destWidth = this.width,
            destHeight = this.height,
            destX = 0,
            destY = 0;

        if (image.width > image.height) {
            destHeight = this.width / image.width * image.height;
            destY = (this.height - destHeight) / 2;
        } else {
            destWidth = this.height / image.height * image.width;
            destX = (this.width - destWidth) / 2;
        }
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.drawImage(
            image,
            srcX,
            srcY,
            srcWidth,
            srcHeight,
            destX,
            destY,
            destWidth,
            destHeight);

        let imageData = this.ctx.getImageData(
            0, 0, this.width, this.height);
        this.lastVImage = new VImage(imageData);
        this.metadata.onCanvasUpdated(this.lastVImage);
    }

    updateFunction(fn) {
        if (!this.lastVImage) {
            console.warn("No vimage");
        }

        // this.lastVImage.forEach(fn);
        let clone = this.lastVImage.clone();
        clone.forEach(fn);
        clone.renderToContext(this.ctx);
        this.metadata.onCanvasUpdated(clone);
    }

    reset() {}
}

class App {
    constructor(fileSelectorElem, workspaceElem, toolbarElem, metadataElem) {
        let $this = this;
        this.fileSelector = new FileSelector(
            fileSelectorElem,
            image => {
                $this._onImageLoaded(image);
                $this.toolbar.unlock();
            });
        this.metadata = new Metadata(metadataElem);
        this.workspace = new Workspace(workspaceElem, this.metadata);
        this.toolbar = new Toolbar(toolbarElem, this.workspace);
    }

    render() {
        this.workspace.renderInitialUi();
        this.metadata.renderInitialUi();
    }

    _onImageLoaded(image) {
        this.workspace.reset();
        this.workspace.renderImage(image);
    }
}