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
    private ctx: CanvasRenderingContext2D;
 
    private readonly maxWidth = 600;
    private readonly maxHeight = 800;

    constructor(element: HTMLElement, metadata: Metadata) {
        this.element = element;
        this.metadata = metadata;
    }

    public updateFunction(fn: Function, operatorType: OperatorType) {
        if (!this.lastImage) {
            console.warn("No vimage");
        }

        const t0 = performance.now();
        let clone = this.lastImage.clone();
        clone.runFn(fn, operatorType);
        const t1 = performance.now();
        clone.renderToContext(this.ctx);
        const t2 = performance.now();
        this.metadata.onCanvasUpdated(clone);
        const t3 = performance.now();

        const operationTime = (t1 - t0).toPrecision(4);
        const imageRenderTime = (t2 - t1).toPrecision(4);
        const histRenderingime = (t3 - t2).toPrecision(4);
        this.metadata.updatePerfString(
            `Image Operation: ${operationTime} ms<br>`
            + `Image Render: ${imageRenderTime} ms<br>`
            + `Histogram Render: ${histRenderingime} ms`);
    }

    public reset() {
        this.lastImage.reset().renderToContext(this.ctx);
        this.metadata.onCanvasUpdated(this.lastImage);
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
            Math.abs((image.width / image.height)
                - (canvasWidth / canvasHeight)) < 0.01,
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
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.marginLeft = "auto";
        canvas.style.marginRight = "auto";
        canvas.style.marginTop = "20px";
        canvas.style.border = "1px solid gray";
        this.element.appendChild(canvas);
        this.ctx = canvas.getContext("2d");
    }
}

interface SliderDefaultValuePair {
    element: HTMLInputElement | HTMLSelectElement;
    defaultValue: number | string;
};

class Toolbar {
    private element: HTMLElement;
    private workspace: Workspace;
    private locked: boolean;
    private operatorElementMap?:
        { [ key: string] : Array<SliderDefaultValuePair>} = {};
    
    constructor(
        element: HTMLElement, workspace: Workspace, footerElem: HTMLElement) {
        this.element = element;
        this.workspace = workspace;

        this.locked = true;
        this.render(footerElem.offsetTop);
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

    private render(footerOffsetTop: number) {
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
        const maxHeight = footerOffsetTop - this.element.offsetTop - 100;
        operatorBody.style.maxHeight = `${maxHeight}px`;
        operatorBody.style.overflowY = "auto";
        operatorBody.style.paddingBottom = "100px";
        this.element.appendChild(operatorBody);

        const operators = OperatorManager.getInstance().getOperators();
        for (let i = 0; i < operators.length; ++i) {
            let operator = operators[i];

            this.operatorElementMap[operator.name] = [];
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

                let argumentElement: HTMLInputElement | HTMLSelectElement;
                if (argument.type == OperatorArgumentType.Continous) {
                    if (!argument.range) {
                        throw `Argument #${argument.name} `
                            + `is continous w/o vrange`;
                    }
                    let slider = document.createElement("input");
                    slider.type = "range";
                    slider.min = `${argument.range.min}`;
                    slider.max = `${argument.range.max}`;
                    slider.step = `${argument.range.step}`;
                    slider.value = argument.getValue();
                    slider.style.flex = "3";
                    argumentDiv.appendChild(slider);
                    argumentElement = slider;
                } else if (argument.type == OperatorArgumentType.Discrete) {
                    if (!argument.discreteValues) {
                        throw `Argument #${argument.name} `
                            + `is continous w/o discreteValues`;
                    }
                    let select = document.createElement("select");
                    for (let k = 0; k < argument.discreteValues.length; ++k) {
                        let possibleValue = argument.discreteValues[k];
                        let option = document.createElement("option");
                        option.value = possibleValue;
                        option.innerHTML = possibleValue;
                        select.appendChild(option);
                    }
                    select.value = `${argument.defaultValue}`;
                    argumentDiv.appendChild(select);
                    argumentElement = select;
                } else {
                    throw `Unknown argument of type ${argument.type}`;
                }
                

                this.operatorElementMap[operator.name].push({
                    element: argumentElement,
                    defaultValue: argument.defaultValue
                });

                let meta = document.createElement("span");
                meta.innerHTML = `${argument.getValue()}`;
                meta.style.flex = "1";
                meta.style.textAlign = "center";
                argumentElement.addEventListener('change', _ => {
                    meta.innerHTML = `${argumentElement.value}`;
                    argument.update(argumentElement.value);
                    let fn = operator.fn();
                    this.workspace.updateFunction(fn, operator.type);
                });
                argumentDiv.appendChild(meta);
                div.appendChild(argumentDiv);
            }      
        }
    }

    reset() {
        const keys = Object.keys(this.operatorElementMap);
        keys.forEach(key => {
            const argumentElementValuePairs = this.operatorElementMap[key];
            argumentElementValuePairs.forEach(pair => {
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
        this.workspace.reset();
    }
}

class Metadata {
    private element: HTMLElement;
    private histCtx: CanvasRenderingContext2D;
    private cdfCtx: CanvasRenderingContext2D;
    private channelsToShow: { [channel: number]: boolean } = {};
    private lastImage?: VImage;
    private perfSection?: HTMLElement;

    private readonly canvasWidth = 256;
    private readonly canvasHeight = 100;

    constructor(element: HTMLElement) {
        this.element = element;

        // Initialize channels to show.
        AllChannels.forEach(channel => {
            this.channelsToShow[channel] = true;
        });
    }

    public renderInitialUi() {
        let histHeader = document.createElement("div");
        histHeader.innerHTML = "Histogram ";
        this.element.appendChild(histHeader);

        AllChannels.forEach(channel => {
            const channelSpan = document.createElement("span");
            const checkBox = document.createElement("input");
            checkBox.type = "checkbox";
            checkBox.checked = this.channelsToShow[channel];
            channelSpan.appendChild(checkBox);
            const channelTag = document.createElement("span");
            channelTag.innerHTML = ` ${getChannelCode(channel)} `;
            channelSpan.appendChild(channelTag);
            checkBox.addEventListener("change", _ => {
                const isChecked: boolean = checkBox.checked;
                this.channelsToShow[channel] = isChecked;
                this.updateLastHistogram(); 
            });

            // after everything.
            histHeader.appendChild(channelSpan);
        });

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

        let perfHeader = document.createElement("div");
        perfHeader.innerHTML = "Performance";
        this.element.appendChild(perfHeader);
        this.perfSection = document.createElement("div");
        this.perfSection.innerHTML = "No operations yet";
        this.element.appendChild(this.perfSection);
    }

    public onCanvasUpdated(image: VImage) {
        if (!this.histCtx || !this.cdfCtx) {
            return;
        }
        this.lastImage = image;

        let histograms = new Histograms(image);
        histograms.renderToContext(
            this.histCtx,
            this.canvasWidth,
            this.canvasHeight,
            this.channelsToShow);

        let cdfs = new CDFs(histograms);
        cdfs.renderToContext(
            this.cdfCtx,
            this.canvasWidth,
            this.canvasHeight,
            this.channelsToShow);
    }

    public updatePerfString(perfString: string) {
        if (!this.perfSection) {
            console.warn(`No perfSection, logged perf = ${perfString}`);
        }

        this.perfSection.innerHTML = perfString;
    }

    private updateLastHistogram() {
        if (!this.lastImage) {
            return;
        }

        this.onCanvasUpdated(this.lastImage);
    }
}

class App {
    private workspace: Workspace;
    private toolbar: Toolbar;
    private metadata: Metadata;

    constructor(
        fileSelectorElem: HTMLInputElement,
        workspaceElem: HTMLElement,
        toolbarElem: HTMLElement,
        metadataElem: HTMLElement,
        footerElem: HTMLElement) {

        this.metadata = new Metadata(metadataElem);
        this.workspace = new Workspace(workspaceElem, this.metadata);
        this.toolbar = new Toolbar(toolbarElem, this.workspace, footerElem);

        // Unused argument.
        const unusedFileSelector = new FileSelector(
            fileSelectorElem,
            image => {
                this.onImageLoaded(image);
                this.toolbar.unlock();
            }
        );
    }

    public render() {
        this.workspace.renderInitialUi();
        this.metadata.renderInitialUi();
    }

    private onImageLoaded(image) {
        this.workspace.renderImage(image);
    }
}