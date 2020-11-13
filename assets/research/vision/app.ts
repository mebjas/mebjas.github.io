interface Observer<T> {
    (val: T): void;
}

class FileSelector {
    private element: HTMLInputElement;
    private observer: Observer<any>;
    private locked: boolean;
    // TODO(mebjas): Make this a proper `FileReader` type.
    private fileReader: any;

    constructor(element: HTMLInputElement, observer: Observer<any>) {
        this.element = element;
        this.observer = observer;

        this.locked = false;
        this.fileReader = new FileReader();
        this.fileReader.onload
            = (fr: FileReader, _:ProgressEvent<FileReader>):any => this.loadImage(fr, _);

        this.element.addEventListener('change', _ => {
            let file: File = this.element.files[0];
            if (file) {
                this.fileReader.readAsDataURL(file);
            }
        });
    }

    public lock() {
        this.element.disabled = true;
        this.locked = true;
    }

    public unlock() {
        this.element.disabled = false;
        this.locked = false;
    }

    public isLocked(): boolean {
        return this.locked;
    }

    private loadImage(fr: FileReader, _: ProgressEvent<FileReader>): any {
        let image: any = new Image();
        image.onload = _ => {
            if (this.observer) {
                this.observer(image);
            }
        }

        image.src = this.fileReader.result;
    }
}

class Workspace {

    private element: HTMLElement;
    private metadata: Metadata;
    private lastImage?: VImage;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
 
    private readonly maxWidth = 600;
    private readonly maxHeight = 400;

    constructor(element: HTMLElement, metadata: Metadata) {
        this.element = element;
        this.metadata = metadata;
    }

    public updateFunction(fn: Function, operatorType: OperatorType) {
        if (!this.lastImage) {
            console.warn("No vimage");
        }

        let clone = this.lastImage.clone();
        clone.runFn(fn, operatorType);
        clone.renderToContext(this.ctx);
        this.metadata.onCanvasUpdated(clone);
    }

    public renderInitialUi() {
        this.element.innerHTML = "Select an image to modify";
    }

    // TODO(mebjas): image should be of type `Image`.
    public renderImage(image: any) {
        this.element.innerHTML = "";
        let canvasWidth = image.width;
        let canvasHeight = image.height;
        if (canvasWidth > this.maxWidth) {
            canvasHeight = this.maxWidth / canvasWidth * canvasHeight;
            canvasWidth = this.maxWidth;
        }
        if (canvasHeight > this.maxHeight) {
            canvasWidth = this.maxHeight / canvasHeight * canvasWidth;
            canvasHeight = this.maxHeight;
        }

        console.log(`From ${image.width}x${image.height} --> ${canvasWidth}x${canvasHeight}`);
        console.assert(
            image.width / image.height == canvasWidth / canvasHeight,
            "Incorrect aspect ratio");
        this.renderCanvas(canvasWidth, canvasHeight);
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        this.ctx.drawImage(
            image,
            0,
            0,
            image.width,
            image.height,
            0,
            0,
            canvasWidth,
            canvasHeight);

        let imageData = this.ctx.getImageData(
            0, 0, canvasWidth, canvasHeight);
        this.lastImage = new VImage(imageData);
        this.metadata.onCanvasUpdated(this.lastImage);
    }

    private renderCanvas(width: number, height: number) {
        let canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.marginLeft = "auto";
        canvas.style.marginRight = "auto";
        canvas.style.marginTop = "20px";
        canvas.style.border = "1px solid gray";
        this.element.appendChild(canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
    }
}

interface SliderDefaultValuePair {
    element: HTMLInputElement;
    defaultValue: number;
};

class Toolbar {
    private element: HTMLElement;
    private workspace: Workspace;
    private locked: boolean;
    private operatorSliderMap?:
        { [ key: string] : Array<SliderDefaultValuePair>} = {};
    
    private readonly uiMaxHeight: number = 450;

    constructor(element: HTMLElement, workspace: Workspace) {
        this.element = element;
        this.workspace = workspace;

        this.locked = true;
        this.render();
    }

    public lock() {
        this.locked = true;
        this.element.style.opacity = "0.5";
    }

    public unlock() {
        this.locked = false;
        this.element.style.opacity = "1";
    }

    public isLocked(): boolean {
        return this.locked;
    }

    private render() {
        this.element.style.opacity = "0.5";

        const operatorsHeader = document.createElement("div");
        operatorsHeader.innerHTML = "Operators";
        operatorsHeader.innerHTML += " (<a href='https://github.com/mebjas/mebjas.github.io/blob/master/assets/research/vision/operators.ts'>source code</a>)";
        this.element.appendChild(operatorsHeader);

        const resetLink = document.createElement("a");
        resetLink.innerHTML = "reset";
        resetLink.href = "#reset";
        resetLink.style.marginLeft = "5px";
        resetLink.addEventListener("click", _ => this.reset());
        operatorsHeader.appendChild(resetLink);

        const operatorBody = document.createElement("div");
        operatorBody.style.maxHeight = `${this.uiMaxHeight}px`;
        operatorBody.style.overflowY = "auto";
        operatorBody.style.paddingBottom = "100px";
        this.element.appendChild(operatorBody);

        const operators = OperatorManager.getInstance().getOperators();
        for (let i = 0; i < operators.length; ++i) {
            let operator = operators[i];

            this.operatorSliderMap[operator.name] = [];
            // Create top level element.
            let div = document.createElement("div");
            div.style.marginTop = "5px";
            div.style.border = "1px solid silver";
            operatorBody.appendChild(div);

            // Insert header
            let header = document.createElement("div");
            header.style.padding = "5px 2px";
            header.style.background = "#c0c0c059";
            header.innerHTML = operator.name;
            div.appendChild(header);

            // Insert subheader
            let subHeader = document.createElement("div");
            subHeader.innerHTML = operator.description;
            subHeader.style.fontSize = "9pt";
            // subHeader.style.marginLeft = "5px";
            header.appendChild(subHeader);         

            // Insert the arguments
            for (let j = 0; j < operator.arguments.length; ++j) {
                let argument = operator.arguments[j];
                let argumentDiv = document.createElement("div");
                argumentDiv.style.padding = "5px";
                argumentDiv.style.display = "flex";
                argumentDiv.style.fontSize = "10pt";
 
                let argumentHeader = document.createElement("div");
                argumentHeader.innerHTML = argument.name;
                argumentHeader.style.flex = "2";
                argumentDiv.appendChild(argumentHeader);

                let slider = document.createElement("input");
                slider.type = "range";
                slider.min = `${argument.range.min}`;
                slider.max = `${argument.range.max}`;
                slider.step = `${argument.range.step}`;
                slider.value = argument.getValue();
                slider.style.flex = "3";
                argumentDiv.appendChild(slider);

                this.operatorSliderMap[operator.name].push({
                    element: slider,
                    defaultValue: argument.defaultValue
                });

                let meta = document.createElement("span");
                meta.innerHTML = `${argument.getValue()}`;
                meta.style.flex = "1";
                meta.style.textAlign = "center";
                slider.addEventListener('change', _ => {
                    meta.innerHTML = `${slider.value}`;
                    argument.update(slider.value);
                    let fn = operator.fn();
                    this.workspace.updateFunction(fn, operator.type);
                });
                argumentDiv.appendChild(meta);
                div.appendChild(argumentDiv);
            }      
        }
    }

    reset() {
        console.log(this.operatorSliderMap);
        const keys = Object.keys(this.operatorSliderMap);
        keys.forEach(key => {
            const sliderValuePairs = this.operatorSliderMap[key];
            sliderValuePairs.forEach(pair => {
                const isChanged: boolean
                    = (pair.element.value !== `${pair.defaultValue}`);
                if (!isChanged) {
                    return;
                }

                pair.element.value = `${pair.defaultValue}`;
                const changeEvent = new Event('change');
                pair.element.dispatchEvent(changeEvent);
            });
        });

        // TODO(mebjas): Move to original image and not the inverted value.
    }
}

class Metadata {
    private element: HTMLElement;
    private imageCtx: CanvasRenderingContext2D;
    private histCtx: CanvasRenderingContext2D;
    private cdfCtx: CanvasRenderingContext2D;

    private readonly canvasWidth = 256;
    private readonly canvasHeight = 100;

    constructor(element: HTMLElement) {
        this.element = element;
    }

    public renderInitialUi() {
        let histHeader = document.createElement("div");
        histHeader.innerHTML = "Histogram";
        this.element.appendChild(histHeader);

        let histCanvas = document.createElement("canvas");
        histCanvas.width = this.canvasWidth;
        histCanvas.height = this.canvasHeight;
        histCanvas.style.border = "1px solid gray";
        this.histCtx = histCanvas.getContext("2d");
        this.element.appendChild(histCanvas);

        let cdfHeader = document.createElement("div");
        cdfHeader.innerHTML = "Cumulative distribution Fn";
        this.element.appendChild(cdfHeader);

        let cdfCanvas = document.createElement("canvas");
        cdfCanvas.width = this.canvasWidth;
        cdfCanvas.height = this.canvasHeight;
        cdfCanvas.style.border = "1px solid gray";
        this.cdfCtx = cdfCanvas.getContext("2d");
        this.element.appendChild(cdfCanvas);
    }

    public onCanvasUpdated(image: VImage) {
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

class App {
    private fileSelector: FileSelector;
    private workspace: Workspace;
    private toolbar: Toolbar;
    private metadata: Metadata;

    constructor(
        fileSelectorElem: HTMLInputElement,
        workspaceElem: HTMLElement,
        toolbarElem: HTMLElement,
        metadataElem: HTMLElement) {
        this.fileSelector = new FileSelector(
            fileSelectorElem,
            image => {
                this.onImageLoaded(image);
                this.toolbar.unlock();
            }
        );
        this.metadata = new Metadata(metadataElem);
        this.workspace = new Workspace(workspaceElem, this.metadata);
        this.toolbar = new Toolbar(toolbarElem, this.workspace);
    }

    public render() {
        this.workspace.renderInitialUi();
        this.metadata.renderInitialUi();
    }

    private onImageLoaded(image) {
        this.workspace.renderImage(image);
    }
}