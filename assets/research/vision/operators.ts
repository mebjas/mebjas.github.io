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
    Global
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
//#endregion

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
        let brightness = parseInt(this.arguments[0].getValue());
        let contrast = parseFloat(this.arguments[1].getValue());
        let alpha = parseFloat(this.arguments[2].getValue());
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
        let gamma = parseFloat(this.arguments[0].getValue());
        // Create look up table for optimised tone mapping.
        let gammaLut = [];
        for (let i = 0; i < 256; ++i) {
            gammaLut[i] = Math.floor(Math.pow(i/256, 1/gamma) * 256);
            if (gammaLut[i] > 255) gammaLut[i] = 255;
        }
        let alpha = parseFloat(this.arguments[1].getValue());

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

//#region GammaOperator
class HistogramEqOperator implements Operator {
    readonly type = OperatorType.Global;
    readonly name = "Histogram Equalization";
    readonly description = "Balance the histogram of the image";
    readonly arguments = [];

    constructor() {
        this.arguments.push(new LinearBlendArgument(0));
    }

    public fn() {
        let blend = parseFloat(this.arguments[0].getValue());

        return (image: VImage) => {
            let histograms: Histograms =  new Histograms(image, 256);
            let cdfs: CDFs =  new CDFs(histograms);
            // let lumaCdf: CDF = cdfs.getLumaCdf();
            let normalizedCdfs: Array<CDF> = [];
            for (let c = 0; c < image.channels; ++c) {
                normalizedCdfs[c] = createEmptyCdfLike(cdfs.getColorCdfs(c));
            }
  
            const binSize = histograms.binSize;
            const maxWhiteLevel = 255;
            for (let c = 0; c < image.channels; ++c) {
                let cdf: CDF = cdfs.getColorCdfs(c);
                const N = cdf[binSize - 1] - cdf[0];
                for (let i = 0; i < binSize; ++i) {
                    let nj = (cdf[i] - cdf[0]) * maxWhiteLevel;
                    normalizedCdfs[c][i] = Math.floor(nj / N);
                }

                console.log(normalizedCdfs[c]);
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