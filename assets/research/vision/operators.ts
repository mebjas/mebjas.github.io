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
    name: String;
    range: VRange;
    default: number;
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
    description: String;
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

//#region GlobalArguments
class LinearBlendArgument implements OperatorArgument {
    name = "Value to linearly blend the operator by";
    range = new VRange(0, 1, 0.05);
    default: number = 1;
    update = (val: number) => {
        if (!this.range.inRange(val)) {
            throw "Invalid value of argument";
        }
        this.value = val;
    };

    getValue = () => {
        return this.value;
    }

    private value: number;
    constructor() {
        this.value = this.default;
    }
}

class AlphaArgument implements OperatorArgument {
    name = "Value to increase the contrast by";
    range = new VRange(0, 5, 0.1);
    default: number = 0;
    update = (val: number) => {
        if (!this.range.inRange(val)) {
            throw "Invalid value of argument";
        }
        this.value = val;
    };

    getValue = () => {
        return this.value;
    }

    private value: number;
    constructor() {
        this.value = this.default;
    }
}
//#endregion

//#region BrightningOperator
class BrightningOperator implements Operator {
    readonly type = OperatorType.Global;
    readonly name = "Brightness";
    readonly description = "Change the brightness of the image";
    readonly arguments = [];

    constructor() {
        class BetaArgument implements OperatorArgument {
            name = "Value to increase the brightness by";
            range = new VRange(-100, 100, 1);
            default: number = 0;
            update = (val: number) => {
                if (!this.range.inRange(val)) {
                    throw "Invalid value of argument";
                }
                this.value = val;
            };

            getValue = () => {
                return this.value;
            }

            private value: number;
            constructor() {
                this.value = this.default;
            }
        }
        this.arguments.push(new BetaArgument());
        this.arguments.push(new AlphaArgument());
        this.arguments.push(new LinearBlendArgument());
    }

    public fn() {
        let beta = parseInt(this.arguments[0].getValue());
        let alpha = parseFloat(this.arguments[1].getValue());
        let blend = parseFloat(this.arguments[2].getValue());
        return (x_, y_, c_, i_) => {
            let val = (i_ * alpha + beta) * blend + (1 - blend) * i_;
            if (val < 0) val = 0;
            if (val > 255) val = 255;
            return val;
        }
    }
}

OperatorManager.getInstance().register(new BrightningOperator());
//#endregion

//#region ContrastOperator
class ContrastOperator implements Operator {
    readonly type = OperatorType.Global;
    readonly name = "Contrast";
    readonly description = "Change the constrast of the image";
    readonly arguments = [];

    constructor() {
        this.arguments.push(new AlphaArgument());
        this.arguments.push(new LinearBlendArgument());
    }

    public fn() {
        let alpha = parseFloat(this.arguments[0].getValue());
        let blend = parseFloat(this.arguments[1].getValue());
        return (x_, y_, c_, i_) => {
            let val = alpha * i_ * blend + (1 - blend) * i_;
            if (val < 0) val = 0;
            if (val > 255) val = 255;
            return val;
        }
    }
}

OperatorManager.getInstance().register(new ContrastOperator());
//#endregion

//#region GammaOperator
class GammaOperator implements Operator {
    readonly type = OperatorType.Global;
    readonly name = "Gamma Correction";
    readonly description = "Change the linearity of the image";
    readonly arguments = [];

    constructor() {
        class GammaArgument implements OperatorArgument {
            name = "Change tonemapping of the image";
            range = new VRange(0, 3, 0.1);
            default: number = 1;
            update = (val: number) => {
                if (!this.range.inRange(val)) {
                    throw "Invalid value of argument";
                }
                this.value = val;
            };

            getValue = () => {
                return this.value;
            }

            private value: number;
            constructor() {
                this.value = this.default;
            }
        }
        this.arguments.push(new GammaArgument());
        this.arguments.push(new LinearBlendArgument());
    }

    public fn() {
        let gamma = parseFloat(this.arguments[0].getValue());
        let gamma_lut = [];
        for (let i = 0; i < 256; ++i) {
            gamma_lut[i] = Math.floor(Math.pow(i/256, 1/gamma) * 256);
            if (gamma_lut[i] > 255) gamma_lut[i] = 255;
        }
        let blend = parseFloat(this.arguments[1].getValue());

        return (x_, y_, c_, i_) => {
            return gamma_lut[i_] * blend + (1 - blend) * i_;
        }
    }
}

OperatorManager.getInstance().register(new GammaOperator());
//#endregion