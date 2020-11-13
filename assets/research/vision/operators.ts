//#region Top level interfaces / classes
class VRange {
    readonly min: number;
    readonly max: number;
    readonly step: number;

    constructor(min: number, max: number, step: number) {
        this.min = min;
        this.max = max;
        this.step = step;
    }

    inRange(val: number): boolean {
        return (val >= this.min && val <= this.max);
    }
}

enum OperatorArgumentType {
    Continous = 0,
    Discrete = 1
}

interface OperatorArgument {
    name: string;
    range?: VRange;
    discreteValues?: Array<string>;
    defaultValue: number | string;
    update: Function;
    getValue: Function;
    type: OperatorArgumentType;
}

enum OperatorType {
    Point,
    Global,
    Local
}

interface Operator {
    type: OperatorType;
    name: string;
    description: string;
    fn: Function;
    arguments: Array<OperatorArgument>;
}

class OperatorManager {

    static instance: OperatorManager;
 
    static getInstance(): OperatorManager {
        if (!OperatorManager.instance) {
            OperatorManager.instance = new OperatorManager();
        }

        return OperatorManager.instance;
    }

    private operators: Array<Operator>;

    constructor() {
        this.operators = [];
    }

    public register(operator: Operator) {
        this.operators.push(operator);
    }

    public getOperators() {
        return this.operators;
    }
}
//#endregion

//#region Global functions
const clamp = (val: number, min: number = 0, max: number = 255) => {
    if (val < min) return min;
    if (val > max) return max;
    return val;
}

const blendValue = (modified: number, original: number, alpha: number) => {
    return modified * alpha + original * (1 - alpha);
}

/**
 * Converts the image inline to gray value.
 * 
 * @param image image to convert. 
 */
const convertToGray = (image: VImage): void => {
    for (let y = 0; y < image.height; ++y) {
        for (let x = 0; x < image.width; ++x) {
            let sum = 0;
            for (let c = 0; c < image.channels; ++c) {
                sum = image.at(x, y, c);
            }
            let gray = clamp(Math.floor(sum / image.channels));
            image.updateGray(x, y, gray);
        }
    }
}
//#endregion

//#region GlobalArguments
//#region Abstract classes for arguments
abstract class ContinousArgumentBase implements OperatorArgument {
    readonly name: string;
    readonly defaultValue: number;
    readonly range: VRange;
    readonly type: OperatorArgumentType = OperatorArgumentType.Continous;

    private value: number;

    constructor(name: string, defaultValue: number, range: VRange) {
        this.name = name;
        this.defaultValue = defaultValue;
        this.range = range;

        this.value = defaultValue;
    }

    public update(val: number) {
        if (!this.range.inRange(val)) {
            throw "Invalid value of argument";
        }
        this.value = val;
    };

    public getValue(): number {
        return this.value;
    }
}

abstract class DiscreteArgumentBase implements OperatorArgument {
    readonly name: string;
    readonly defaultValue: number | string;
    readonly discreteValues: Array<string> = [];
    readonly type: OperatorArgumentType = OperatorArgumentType.Discrete;

    private value: number | string;

    constructor(
        name: string, discreteValues: Array<string>, defaultValue?: string) {
        this.name = name;
        this.defaultValue =  (defaultValue !== undefined)
            ? defaultValue : NONE_VALUE;
        this.discreteValues = discreteValues;

        this.value = this.defaultValue;
        if ((defaultValue === undefined)
            && !this.isOneOfDiscreteValues(NONE_VALUE)) {
            this.discreteValues.unshift(NONE_VALUE);
        }
    }

    public update(val: string) {
        if (!this.isOneOfDiscreteValues(val)) {
            throw "Invalid value of argument";
        }
        this.value = val;
    };

    public getValue(): number | string {
        return this.value;
    }

    private isOneOfDiscreteValues(value: string): boolean {
        for (let i = 0; i < this.discreteValues.length; ++i) {
            if (value == this.discreteValues[i]) {
                return true;
            }
        }
        return false;
    }
}
//#endregion

const NONE_VALUE: string = "none";

//#region global arguments
class BrightnessArgument extends ContinousArgumentBase {
    constructor() {
        super(
            "Brightness (b)",
            /* defaultValue= */ 0,
            new VRange(-100, 100, 1));
    }
}

class LinearBlendArgument extends ContinousArgumentBase {
    constructor(defaultValue?: number) {
        super(
            "Blend (Α)",
            defaultValue === undefined ? 1 : defaultValue,
            new VRange(0, 1, 0.05));
    }
}

class ContrastArgument extends ContinousArgumentBase {
    constructor(min: number = 0, max: number = 5, step: number = 0.1) {
        super(
            "Contrast (a)",
            /* defaultValue= */ 1,
            new VRange(min, max, step));
    }
}

class ScalingArgument extends ContinousArgumentBase {
    constructor(
        min: number = 0,
        max: number = 5,
        step: number = 0.2,
        defaultValue = 1) {
        super("Scale (s)", defaultValue, new VRange(min, max, step));
    }
}

class SigmaArgument extends ContinousArgumentBase {
    constructor(
        min: number = 0,
        max: number = 5,
        step: number = 0.2,
        defaultValue = 1) {
        super("Sigma (s)", defaultValue, new VRange(min, max, step));
    }
}

class ThresholdArgument extends ContinousArgumentBase {
    constructor(
        min: number = 0,
        max: number = 255,
        step: number = 1,
        defaultValue = 255) {
        super("Threshold (t)", defaultValue, new VRange(min, max, step));
    }
}

class GammaArgument extends ContinousArgumentBase {
    constructor() {
        super(
            "Tonemap Gamma (Γ)",
            /* defaultValue= */ 1,
            new VRange(0, 3, 0.1));
    }
}

class KernelSize extends ContinousArgumentBase {
    constructor() {
        super(
            "Kernel Size (MxM)",
            /* defaultValue= */ 1,
            new VRange(1, 9, 2));
    }
}

class BinaryArgument extends ContinousArgumentBase {
    constructor() {
        super(
            "Binary Argument",
            /* defaultValue= */ 0,
            new VRange(0, 1, 0));
    }
}

class GaussianTypeArgument extends DiscreteArgumentBase {

    static BLURRING: string = "Blurring";
    static SUBTRACTION: string = "Subtraction";

    constructor() {
        super(
            "GaussianType",
            [
                GaussianTypeArgument.BLURRING,
                GaussianTypeArgument.SUBTRACTION
            ]
        );
    }
}

class ColorSpaceType extends DiscreteArgumentBase {

    static RGB: string = "RGB";
    static GRAY: string = "GRAY";

    constructor() {
        super(
            "Color Space Type",
            [
                ColorSpaceType.RGB,
                ColorSpaceType.GRAY
            ],
            /* defaultValue= */ ColorSpaceType.RGB
        );
    }
}

class DerivativeArgument extends DiscreteArgumentBase {
    constructor() {
        super(
            "Derivative Type",
            ["Central"]
        );
    }
}

class DerivativeThresholdArgument extends DiscreteArgumentBase {
    constructor() {
        super(
            "Derivative Threshold",
            ["Thresholding"]
        );
    }
}
//#endregion
//#endregion

//#region Point Operators
//#region BrightningOperator
class BrightningOperator implements Operator {
    readonly type = OperatorType.Point;
    readonly name = "Brightness";
    readonly description = "Change the brightness of the image";
    readonly arguments: Array<OperatorArgument> = [];

    constructor() {
        this.arguments.push(new BrightnessArgument());
        this.arguments.push(new ContrastArgument());
        this.arguments.push(new LinearBlendArgument());
    }

    public fn() {
        const brightness = parseInt(this.arguments[0].getValue());
        const contrast = parseFloat(this.arguments[1].getValue());
        const alpha = parseFloat(this.arguments[2].getValue());
        return (_, __, ___, intensity: number) => {
            let val = blendValue(
                /* modified= */ intensity * contrast + brightness,
                /* original= */ intensity,
                /* alpha= */ alpha);
            return clamp(val, 0, 255);
        }
    }
}

OperatorManager.getInstance().register(new BrightningOperator());
//#endregion

//#region GammaOperator
class GammaOperator implements Operator {
    readonly type = OperatorType.Point;
    readonly name = "Gamma Correction";
    readonly description = "Change the linearity of the image";
    readonly arguments: Array<OperatorArgument> = [];

    constructor() {
        this.arguments.push(new GammaArgument());
        this.arguments.push(new LinearBlendArgument());
    }

    public fn() {
        const gamma = parseFloat(this.arguments[0].getValue());
        const alpha = parseFloat(this.arguments[1].getValue());
        const maxWhiteLevel = 255;
        const inverseGamma = 1 / gamma;

        // Create look up table for optimised tone mapping.
        let gammaLut = [];
        for (let i = 0; i < 256; ++i) {
            gammaLut[i] = Math.floor(
                Math.pow(i / maxWhiteLevel, inverseGamma) * maxWhiteLevel);
            if (gammaLut[i] > maxWhiteLevel) gammaLut[i] = maxWhiteLevel;
        }

        return (_, __, ___, intensity: number) => {
            return blendValue(
                /* modified= */ gammaLut[intensity],
                /* original= */ intensity,
                /* alpha= */ alpha);
        }
    }
}

OperatorManager.getInstance().register(new GammaOperator());
//#endregion
//#endregion
//#endregion

//#region Global Operators
//#region HistorgramEqualization
class HistogramEqOperator implements Operator {
    readonly type = OperatorType.Global;
    readonly name = "Histogram Equalization";
    readonly description = "Balance the histogram of the image";
    readonly arguments: Array<OperatorArgument> = [];

    constructor() {
        this.arguments.push(new LinearBlendArgument(0));
    }

    public fn() {
        const blend = parseFloat(this.arguments[0].getValue());

        return (image: VImage) => {
            const histograms: Histograms =  new Histograms(image, 256);
            const cdfs: CDFs =  new CDFs(histograms);
            // let lumaCdf: CDF = cdfs.getLumaCdf();
            const normalizedCdfs: Array<CDF> = [];
            for (let c = 0; c < image.channels; ++c) {
                normalizedCdfs[c] = createEmptyCdfLike(cdfs.getColorCdfs(c));
            }
  
            const binSize = histograms.binSize;
            const maxWhiteLevel = 255;
            for (let c = 0; c < image.channels; ++c) {
                const cdf: CDF = cdfs.getColorCdfs(c);
                const N = cdf[binSize - 1] - cdf[0];
                for (let i = 0; i < binSize; ++i) {
                    let nj = (cdf[i] - cdf[0]) * maxWhiteLevel;
                    normalizedCdfs[c][i] = Math.floor(nj / N);
                }

                for (let y = 0; y < image.height; ++y) {
                    for (let x = 0; x < image.width; ++x) {
                        let intensity = image.at(x, y, c);
                        intensity = blend * normalizedCdfs[c][intensity] + (1 - blend) * intensity;
                        image.update(x, y, c, intensity);
                    }
                }
            }
        }
    }
}

OperatorManager.getInstance().register(new HistogramEqOperator());
//#endregion
//#endregion

//#region Local Operators

//#region GaussianBlurring
class GaussianBlurringOperator implements Operator {
    readonly type = OperatorType.Local;
    readonly name = "Gaussian Blurring";
    readonly description = "Blurs the image (Not all arguments work"
        + " with eachother).";
    readonly arguments: Array<OperatorArgument> = [];

    constructor() {
        this.arguments.push(new GaussianTypeArgument());
        this.arguments.push(new ColorSpaceType());
        this.arguments.push(new KernelSize());
        this.arguments.push(new SigmaArgument(0, 2, 0.1, 1));
        this.arguments.push(new ContrastArgument(0, 20));
    }

    public fn() {
        const blurringType: string = this.arguments[0].getValue();
        const colorSpaceType: string = this.arguments[1].getValue();
        const kernelSize = parseInt(this.arguments[2].getValue());
        const shouldRun: boolean = blurringType !== NONE_VALUE;
        const returnGray: boolean = colorSpaceType === ColorSpaceType.GRAY;
        const sigmaValue = parseFloat(this.arguments[3].getValue());
        const alphaValue = parseFloat(this.arguments[4].getValue());

        return (image: VImage) => {
            if (kernelSize == 1 || !shouldRun) {
                return;
            }

            if (returnGray) {
                convertToGray(image);
            }

            const kernel: ConvolutionMask2D = this.createKernel(
                kernelSize, sigmaValue);    
            if (blurringType == GaussianTypeArgument.BLURRING) {
                this.runGaussianOnImage(image, kernel, returnGray);
            } else if (blurringType == GaussianTypeArgument.SUBTRACTION) {
                const clone = image.clone();
                this.runGaussianOnImage(clone, kernel, returnGray);
                for (let y = 0; y < image.height; ++y) {
                    for (let x = 0; x < image.width; ++x) {
                        if (returnGray) {
                            let delta = image.at(x, y, 0) - clone.at(x, y, 0);
                            delta = delta * alphaValue;
                            image.updateGray(x, y, clamp(Math.abs(delta)));
                        } else {
                            for (let c = 0; c < image.channels; ++c) {
                                let delta = image.at(x, y, c)
                                    - clone.at(x, y, c);
                                delta = delta * alphaValue;
                                image.update(x, y, c, clamp(Math.abs(delta)));
                            }
                        }
                    }
                }
            } else {
                throw `Invalid blurring type = ${blurringType}`;
            }
        }
    }

    private createKernel(
        kernelSize: number, sigma: number = 1): ConvolutionMask2D {
        assert(kernelSize % 2 != 0, "kernel size should be odd.");
        let kernel: Matrix2D = this.createEmptyKernel(kernelSize);
        const s: number = 2 * sigma * sigma;
        let r: number;
        const middleVal = Math.floor(kernelSize / 2);
        let sum: number = 0;    // For normalization
        for (let y = -middleVal; y <= middleVal; ++y) {
            for (let x = -middleVal; x <= middleVal; ++x) {
                r = (x * x + y * y);
                kernel[y + middleVal][x + middleVal]
                    = Math.exp(-r / s) / Math.PI * s;
                sum +=  kernel[y + middleVal][x + middleVal];
            }
        }

        // Normalize
        for (let y = 0; y < kernelSize; ++y) {
            for (let x = 0; x < kernelSize; ++x) {
                kernel[y][x] /= sum;
            }   
        }

        return ConvolutionMask2D.createMask(kernel);
    }

    private createEmptyKernel(kernelSize: number): Matrix2D {
        assert(kernelSize % 2 != 0, "kernel size should be odd.");
        let emptyKernel: Matrix2D = [];
        for (let i = 0; i < kernelSize; ++i) {
            emptyKernel.push([]);
            for (let j = 0; j < kernelSize; ++j) {
                emptyKernel[i][j] = 0;
            }
        }

        return emptyKernel;
    }

    // Expects the image to be gray if {@param isGray} == true.
    private runGaussianOnImage(
        image: VImage, kernel: ConvolutionMask2D, isGray: boolean) {
        const clone = image.clone();
        for (let y = 0; y < image.height; ++y) {
            for (let x = 0; x < image.width; ++x) {
                if (isGray) {
                    let intensity = clone.convolve(x, y, 0, kernel);
                    image.updateGray(x, y, clamp(intensity));
                } else {
                    for (let c = 0; c < image.channels; ++c) {
                        let intensity = clone.convolve(x, y, c, kernel);
                        image.update(x, y, c, clamp(intensity));
                    }
                }
            }
        }
    }
}

OperatorManager.getInstance().register(new GaussianBlurringOperator());
//#endregion

//#region DerivativeOperator
class DerivativeOperator implements Operator {
    readonly type = OperatorType.Local;
    readonly name = "Derivative";
    readonly description = "Converts to first order derivative of image";
    readonly arguments: Array<OperatorArgument> = [];

    constructor() {
        this.arguments.push(new DerivativeArgument());
        this.arguments.push(new ScalingArgument(0.1, 5, 0.05, 1));
        this.arguments.push(new DerivativeThresholdArgument());
        this.arguments.push(new ThresholdArgument());
    }

    public fn() {
        const selectedType = this.arguments[0].getValue();
        const scalingFactor = parseFloat(this.arguments[1].getValue());
        const thresholdType = this.arguments[2].getValue();
        const threshold = parseInt(this.arguments[3].getValue());

        const isEnabled: boolean = selectedType !== NONE_VALUE;
        const isThresholdingEnabled: boolean = thresholdType !== NONE_VALUE;
        return (image: VImage) => {
            if (!isEnabled) {
                return;
            }

            // Convert to gray scale.
            convertToGray(image);
            const xConvolution: ConvolutionMask2D
                = ConvolutionMask2D.createMask([
                [-1, 0, 1],
                [-1, 0, 1],
                [-1, 0, 1]
            ]);
            const yConvolution: ConvolutionMask2D
                = ConvolutionMask2D.createMask([
                [1, 1, 1],
                [0, 0, 0],
                [-1, -1, -1],
            ]);
            const clone = image.clone();
            for (let y = 0; y < image.height; ++y) {
                for (let x = 0; x < image.width; ++x) {
                    const fx = clone.convolve(
                        x, y, /* c= */ 0, xConvolution, scalingFactor);
                    const fy = clone.convolve(
                        x, y, /* c= */ 0, yConvolution, scalingFactor);
                    const magnitude = Math.sqrt(fx * fx + fy * fy);
                    if (!isThresholdingEnabled) {
                        image.updateGray(x, y, clamp(Math.floor(magnitude)));
                    } else {
                        const intensity = clamp(Math.floor(magnitude));
                        image.updateGray(
                            x, y, intensity >= threshold ? 255 : 0);
                    }
                } 
            }
        }
    }
}

OperatorManager.getInstance().register(new DerivativeOperator());
//#endregion

//#region Sharpening
class SharpeningOperator implements Operator {
    readonly type = OperatorType.Local;
    readonly name = "Sharpening";
    readonly description = "Sharpens the image";
    readonly arguments: Array<OperatorArgument> = [];

    constructor() {
        this.arguments.push(new LinearBlendArgument(0));
    }

    public fn() {
        const blend = parseFloat(this.arguments[0].getValue());

        return (image: VImage) => {
            // TODO(mebjas): implement this.
        }
    }
}

// OperatorManager.getInstance().register(new SharpeningOperator());
//#endregion

//#endregion