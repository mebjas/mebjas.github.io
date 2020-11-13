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

interface OperatorArgument {
    name: string;
    range: VRange;
    defaultValue: number;
    update: Function;
    getValue: Function;
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

//#region Global functions
const clamp = (val: number, min: number, max: number) => {
    if (val < min) return min;
    if (val > max) return max;
    return val;
}

const blendValue = (modified: number, original: number, alpha: number) => {
    return modified * alpha + original * (1 - alpha);
}
//#endregion

//#region GlobalArguments
abstract class ArgumentBase implements OperatorArgument {
    readonly name: string;
    readonly defaultValue: number;
    readonly range: VRange;

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

class BrightnessArgument extends ArgumentBase {
    constructor() {
        super(
            "Brightness (b)",
            /* defaultValue= */ 0,
            new VRange(-100, 100, 1));
    }
}

class LinearBlendArgument extends ArgumentBase {
    constructor(defaultValue?: number) {
        super(
            "Blend (Α)",
            defaultValue === undefined ? 1 : defaultValue,
            new VRange(0, 1, 0.05));
    }
}

class ContrastArgument extends ArgumentBase {
    constructor() {
        super(
            "Contrast (a)",
            /* defaultValue= */ 1,
            new VRange(0, 5, 0.1));
    }
}

class GammaArgument extends ArgumentBase {
    constructor() {
        super(
            "Tonemap Gamma (Γ)",
            /* defaultValue= */ 1,
            new VRange(0, 3, 0.1));
    }
}

class KernelSize extends ArgumentBase {
    constructor() {
        super(
            "Kernel Size (MxM)",
            /* defaultValue= */ 1,
            new VRange(1, 9, 2));
    }
}

class BinaryArgument extends ArgumentBase {
    constructor() {
        super(
            "Binary Argument",
            /* defaultValue= */ 0,
            new VRange(0, 1, 0));
    }
}
//#endregion

//#region Point Operators
//#region BrightningOperator
class BrightningOperator implements Operator {
    readonly type = OperatorType.Point;
    readonly name = "Brightness";
    readonly description = "Change the brightness of the image";
    readonly arguments = [];

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
    readonly arguments = [];

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
    readonly arguments = [];

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
    readonly description = "Blurs the image";
    readonly arguments = [];

    constructor() {
        this.arguments.push(new KernelSize());
    }

    public fn() {
        const kernelSize = parseInt(this.arguments[0].getValue());

        return (image: VImage) => {
            if (kernelSize == 1) {
                return;
            }
            const k1 = Math.floor(kernelSize / 2);
            const k2 = Math.ceil(kernelSize / 2) - 1;

            for (let c = 0; c < image.channels; ++c) {
                for (let y = 0; y < image.height; ++y) {
                    for (let x = 0; x < image.width; ++x) {
                        let sum = 0;
                        let count = 0;

                        for (let y1 = y - k1; y1 <= y + k2; ++y1) {
                            for (let x1 = x - k1; x1 <= x + k2; ++x1) {
                                if (y1 >= 0 && y1 < image.height && x1 >= 0 && x1 < image.width) {
                                    sum += image.at(x1, y1, c);
                                    count++;
                                }
                            }
                        }

                        image.update(x, y, c, Math.floor(sum / count));
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
    readonly arguments = [];

    constructor() {
        this.arguments.push(new BinaryArgument());
    }

    public fn() {
        const isEnabled = parseInt(this.arguments[0].getValue()) === 1;
        return (image: VImage) => {
            if (!isEnabled) {
                return;
            }

            const computeGray = (x: number, y: number) => {
                // return Math.floor((image.at(x, y, 0)
                //     + image.at(x, y, 1)
                //     + image.at(x, y, 2)) / 3);

                return image.at(x, y, 0);
            }

            for (let y = 0; y < image.height; ++y) {
                for (let x = 0; x < image.width; ++x) {
                    if (x == 0 || y == 0) {
                        image.update(x, y, 0, 0);
                        image.update(x, y, 1, 0);
                        image.update(x, y, 2, 0);
                    } else {
                        let derivativeXR = Math.abs(
                            image.at(x, y, 0) - image.at(x - 1, y, 0));
                        let derivativeXG = Math.abs(
                            image.at(x, y, 1) - image.at(x - 1, y, 1));
                        let derivativeXB = Math.abs(
                            image.at(x, y, 2) - image.at(x - 1, y, 2));
                        // let derivativeY = Math.abs(
                        //     computeGray(x, y) - computeGray(x, y - 1));
                        
                        image.update(x, y, 0, clamp(derivativeXR, 0, 255));
                        image.update(x, y, 1, clamp(derivativeXG, 0, 255));
                        image.update(x, y, 2, clamp(derivativeXB, 0, 255));
                    }
                }  
            }
        }
    }
}

// OperatorManager.getInstance().register(new DerivativeOperator());
//#endregion

//#region Sharpening
class SharpeningOperator implements Operator {
    readonly type = OperatorType.Local;
    readonly name = "Sharpening";
    readonly description = "Sharpens the image";
    readonly arguments = [];

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