/**
 * Represents the image class.
 */
class VImage {

    readonly width : number;
    readonly height : number;
    readonly channels: number = 3;
    readonly readonlyImageData: ImageData;

    private imageData : ImageData;

    constructor(imageData: ImageData) {
        this.width = imageData.width;
        this.height = imageData.height;
        this.readonlyImageData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            this.width,
            this.height);

        this.imageData = imageData;
    }

    /** Resets the image to it's original state. */
    public reset(): VImage {
        this.imageData = new ImageData(
            new Uint8ClampedArray(this.readonlyImageData.data),
            this.width,
            this.height);
        return this;
    }
    
    /** Creates a clone of this image. */
    public clone(): VImage {
        let imageDataCopy = new ImageData(
            new Uint8ClampedArray(this.imageData.data),
            this.width,
            this.height
          )
        return new VImage(imageDataCopy);
    }

    /**
     * Returns the intesity at give coordinates
     *
     * @param {Number} x X Coordinate
     * @param {Number} y Y Coordinate
     * @param {Number} c Color channel, 0, 1, 2 are R, G, B respectively
     */
    public at(x : number, y : number, c : number) : number {
        let index : number = (y * this.width + x) * 4 + c;
        return this.imageData.data[index];
    }

    /**
     * Updates the image at given coordinates.
     *
     * @param {Number} x X Coordinate
     * @param {Number} y Y Coordinate
     * @param {Number} c Color channel, 0, 1, 2 are R, G, B respectively
     * @param {Number} val Intensity value at given coordinates
     */
    public update(x : number, y : number, c : number, val: number) : void {
        this.imageData.data[(y * this.width + x) * 4 + c] = val;
    }

    /**
     * Renders the image instance to the given {@param context}.
     * 
     * @param {CanvasRenderingContext2D} context a Valid canvas context.
     */
    public renderToContext(context: CanvasRenderingContext2D) : void {
        // TODO(mebjas): render with full dimensions of the canvas.
        context.putImageData(this.imageData, 0, 0);
    }

    /**
     * Runs an operator of type {@param operatorType} on the image
     * 
     * @param fn operator to run on 
     * @param operatorType type of the operator
     */
    public runFn(fn: Function, operatorType: OperatorType): void {
        if (operatorType == OperatorType.Global) {
            this.runGlobalFn(fn);
        } else if (operatorType == OperatorType.Point) {
            this.forEach(fn);
        } else if (operatorType == OperatorType.Local) {
            this.runLocalFn(fn);
        } else {
            throw `Unsupported operatorType = ${operatorType}`;
        }
    }

    /**
     * Runs the given operator for each pixel
     *
     * @param {Function} fn operator
     */
    private forEach(fn: Function) : void {
        for (let y = 0; y < this.height; ++y) {
            for (let x = 0; x < this.width; ++x) {
                for (let c = 0; c < this.channels; ++c) {
                    let updatedValue = fn(x, y, c, this.at(x, y, c));
                    this.update(x, y, c, updatedValue);
                }
            }
        }
    }

    /**
     * Runs a global function on the image, that can modify it's content
     *
     * @param fn operator
     */
    private runGlobalFn(fn: Function): void {
        fn(this);
    }

    /**
     * Runs a local or neighbourhood operator on the image, that can modify
     * it's content
     *
     * @param fn operator 
     */
    private runLocalFn(fn: Function): void {
        // TODO(mebjas): abstract better
        fn(this);
    }
}

enum Channel {
    Red = 0,
    Blue = 1,
    Green = 2,
    Luma = 3
}
const AllChannels: Array<Channel> = [
    Channel.Red,
    Channel.Blue,
    Channel.Green,
    Channel.Luma];

const CreateDefaultSelectionOfChannelsToShow
    = (): { [channel: number]: boolean } => {
    let result: { [channel: number]: boolean } = {};
    AllChannels.forEach(channel => {
        result[channel] = true;
    });

    return result;
}

const getChannelCode = (channel: Channel): string => {
    switch(channel) {
        case Channel.Red: return "R";
        case Channel.Green: return "G";
        case Channel.Blue: return "B";
        case Channel.Luma: return "Y";
        default:
            throw `Invalid channel id passed ${channel}`;
    }
}

const getChannelByCode = (channelCode: string): Channel => {
    switch(channelCode) {
        case "R": return Channel.Red;
        case "G": return Channel.Green;
        case "B": return Channel.Blue;
        case "Y": return Channel.Luma;
        default:
            throw `Invalid channel code passed ${channelCode}`;
    }
}

type Histogram = Array<number>;

class Histograms {
    private image: VImage;
    private rHist: Histogram;
    private gHist: Histogram;
    private bHist: Histogram;
    private lumaHist: Histogram;
    private binIndexDivisor: number;

    readonly binSize: number;

    constructor(image: VImage, binSize: number = 32) {
        this.image = image;
        this.binSize = binSize;

        this.compute();
    }

    public renderToContext(
        context: CanvasRenderingContext2D,
        contextWidth: number,
        contextHeight: number,
        channelsToShow?: { [channel: number]: boolean }) {
        context.clearRect(0, 0, contextWidth, contextHeight);
        let maxVal = this.findMaxVal();

        if (!channelsToShow) {
            channelsToShow = CreateDefaultSelectionOfChannelsToShow();
        }
        if (channelsToShow[Channel.Red]) {
            this.renderSingleHist(
                context,
                contextWidth,
                contextHeight,
                this.rHist,
                "#FF0000",
                maxVal);    
        }
        if (channelsToShow[Channel.Green]) {
            this.renderSingleHist(
                context,
                contextWidth,
                contextHeight,
                this.gHist,
                "#00FF00",
                maxVal);
        }
        if (channelsToShow[Channel.Blue]) {
            this.renderSingleHist(
                context,
                contextWidth,
                contextHeight,
                this.bHist,
                "#0000FF",
                maxVal);        
        }
        if (channelsToShow[Channel.Luma]) {
            this.renderSingleHist(
                context, contextWidth, contextHeight, this.lumaHist, "#000000", maxVal);
        }
    }

    public getColorHistogram(channel: number): Histogram {
        switch(channel) {
            case 0: return this.rHist;
            case 1: return this.gHist;
            case 2: return this.bHist
        }
        throw "Invalid channel, max value = 2";
    }

    public getLumaHistogram(): Histogram {
        return this.lumaHist;
    }

    private renderSingleHist(
        context: CanvasRenderingContext2D,
        contextWidth: number,
        contextHeight: number,
        hist: Histogram,
        strokeStyle: string,
        maxVal: number) {
        let epsilon: number = 0.01;
        context.beginPath();
        context.strokeStyle = strokeStyle;
        context.moveTo(0, contextHeight);
        // TODO(mebjas): Major assumption here that the canvas width is
        // same as the bin size which can fail at any point.
        for (let i = 0; i < this.binSize; i++) {
            let x = i * (contextWidth / this.binSize) + (contextWidth / this.binSize - 1);
            let y = contextHeight * (1 - (hist[i] / (maxVal + epsilon)));
            context.lineTo(x, y);
            context.stroke();
        }
    }

    private compute() {
        this.binIndexDivisor = 256 / this.binSize;
        let getBinIndex: Function = (intensity: number): number => {
            return Math.floor(intensity / this.binIndexDivisor);
        }

        this.rHist = this.createEmptyHist();
        this.gHist = this.createEmptyHist();
        this.bHist = this.createEmptyHist();
        this.lumaHist = this.createEmptyHist();

        for (let y = 0; y < this.image.height; ++y) {
            for (let x = 0; x < this.image.width; ++x) {
                let rValue = this.image.at(x, y, 0);
                let gValue = this.image.at(x, y, 1);
                let bValue = this.image.at(x, y, 2);
                let lumaValue = 0.2126 * rValue + 0.7152 * gValue + 0.0722 * bValue;

                let rBin = getBinIndex(rValue);
                let gBin = getBinIndex(gValue);
                let bBin = getBinIndex(bValue);
                let lumaBin = getBinIndex(lumaValue);

                this.rHist[rBin]++;
                this.gHist[gBin]++;
                this.bHist[bBin]++;
                this.lumaHist[lumaBin]++;
            }
        }

        this.rHist = this.normalize(this.rHist);
        this.gHist = this.normalize(this.gHist);
        this.bHist = this.normalize(this.bHist);
        this.lumaHist = this.normalize(this.lumaHist);
    }

    private findMaxVal(): number {
        let findMaxValSingleHist: Function
            = (hist: Histogram, maxValSoFar: number) => {
            let maxVal = maxValSoFar;
            for (let i = 0; i < hist.length; ++i) {
                if (hist[i] > maxVal) {
                    maxVal = hist[i];
                }
            }
            return maxVal;
        }
        
        let maxValSoFar = 0;
        maxValSoFar = findMaxValSingleHist(this.rHist, maxValSoFar);
        maxValSoFar = findMaxValSingleHist(this.gHist, maxValSoFar);
        maxValSoFar = findMaxValSingleHist(this.bHist, maxValSoFar);
        maxValSoFar = findMaxValSingleHist(this.lumaHist, maxValSoFar);
        return maxValSoFar;
    }

    private normalize(hist: Histogram): Histogram {
        let netPixels = this.image.width * this.image.height;
        for (let i = 0; i < this.binSize; i++) {
            hist[i] = hist[i] / netPixels;
        }
        return hist;
    }

    private createEmptyHist(): Histogram {
        let hist: Histogram = [];
        for (let i = 0; i < this.binSize; i++) {
            hist.push(0);
        }
        return hist;
    }
}

type CDF = Array<number>;
const createEmptyCdf = (binSize: number): CDF => {
    let cdf: CDF = [];
    for (let i = 0; i < binSize; i++) {
        cdf.push(0);
    }
    return cdf;
}

const createEmptyCdfLike = (cdf: CDF): CDF => {
    let newCdf: CDF = [];
    for (let i = 0; i < cdf.length; i++) {
        newCdf.push(0);
    }
    return newCdf;
}

class CDFs {
    private histograms: Histograms;
    private rCdf: CDF; 
    private gCdf: CDF; 
    private bCdf: CDF; 
    private lumaCdf: CDF; 

    constructor(histograms: Histograms) {
        this.histograms = histograms;

        this.compute();
    }

    public getColorCdfs(channel: number): CDF {
        switch(channel) {
            case 0: return this.rCdf;
            case 1: return this.gCdf;
            case 2: return this.bCdf
        }
        throw "Invalid channel, max value = 2";
    }

    public getLumaCdf(): CDF {
        return this.lumaCdf;
    }

    public renderToContext(
        context: CanvasRenderingContext2D,
        contextWidth: number,
        contextHeight: number,
        channelsToShow?: { [channel: number]: boolean }) {
        context.clearRect(0, 0, contextWidth, contextHeight);
        let maxVal = 1.0;
        if (!channelsToShow) {
            channelsToShow = CreateDefaultSelectionOfChannelsToShow();
        }
        // TODO(mebjas): Make these colors constant
        if (channelsToShow[Channel.Red]) {
            this.renderSingleCdf(
                context,
                contextWidth,
                contextHeight,
                this.rCdf,
                "#FF0000",
                maxVal);
        }
        if (channelsToShow[Channel.Green]) {
            this.renderSingleCdf(
                context,
                contextWidth,
                contextHeight,
                this.gCdf,
                "#00FF00",
                maxVal);
        }
        if (channelsToShow[Channel.Blue]) {
            this.renderSingleCdf(
                context,
                contextWidth,
                contextHeight,
                this.bCdf,
                "#0000FF",
                maxVal);
        }
        if (channelsToShow[Channel.Luma]) {
            this.renderSingleCdf(
                context,
                contextWidth,
                contextHeight,
                this.lumaCdf,
                "#000000",
                maxVal);
        }
    }

    private renderSingleCdf(
        context: CanvasRenderingContext2D,
        contextWidth: number,
        contextHeight: number,
        hist: Histogram,
        strokeStyle: string,
        maxVal: number) {
        let epsilon: number = 0.01;
        context.beginPath();
        context.strokeStyle = strokeStyle;
        context.moveTo(0, contextHeight);
        // TODO(mebjas): Major assumption here that the canvas width is
        // same as the bin size which can fail at any point.
        let binSize = this.histograms.binSize;
        for (let i = 0; i < binSize; i++) {
            let x = i * (contextWidth / binSize) + (contextWidth / binSize - 1);
            let y = contextHeight * (1 - (hist[i] / (maxVal + epsilon)));
            context.lineTo(x, y);
            context.stroke();
        }
    }

    private compute() {
        let rHist = this.histograms.getColorHistogram(0);
        let gHist = this.histograms.getColorHistogram(1);
        let bHist = this.histograms.getColorHistogram(2);
        let lumaHist = this.histograms.getLumaHistogram();

        this.rCdf = createEmptyCdf(this.histograms.binSize);
        this.gCdf = createEmptyCdf(this.histograms.binSize);
        this.bCdf = createEmptyCdf(this.histograms.binSize);
        this.lumaCdf = createEmptyCdf(this.histograms.binSize);

        this.rCdf[0] = rHist[0]; 
        this.gCdf[0] = gHist[0]; 
        this.bCdf[0] = bHist[0]; 
        this.lumaCdf[0] = lumaHist[0];

        let length: number = rHist.length;
        for (let i:number = 1; i < length; ++i) {
            this.rCdf[i] = this.rCdf[i - 1] + rHist[i];
            this.gCdf[i] = this.gCdf[i - 1] + gHist[i];
            this.bCdf[i] = this.bCdf[i - 1] + bHist[i];
            this.lumaCdf[i] = this.lumaCdf[i - 1] + lumaHist[i];
        }
    }
}
