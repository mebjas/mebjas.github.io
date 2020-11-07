var VRange = /** @class */ (function () {
    function VRange(min, max, step) {
        this.min = min;
        this.max = max;
        this.step = step;
    }
    VRange.prototype.inRange = function (val) {
        return (val >= this.min && val <= this.max);
    };
    return VRange;
}());
var OperatorType;
(function (OperatorType) {
    OperatorType[OperatorType["Point"] = 0] = "Point";
    OperatorType[OperatorType["Global"] = 1] = "Global";
})(OperatorType || (OperatorType = {}));
var OperatorManager = /** @class */ (function () {
    function OperatorManager() {
        this.operators = [];
    }
    OperatorManager.getInstance = function () {
        if (!OperatorManager.instance) {
            OperatorManager.instance = new OperatorManager();
        }
        return OperatorManager.instance;
    };
    OperatorManager.prototype.register = function (operator) {
        this.operators.push(operator);
    };
    OperatorManager.prototype.getOperators = function () {
        return this.operators;
    };
    return OperatorManager;
}());
//#region GlobalArguments
var LinearBlendArgument = /** @class */ (function () {
    function LinearBlendArgument() {
        var _this = this;
        this.name = "Value to linearly blend the operator by";
        this.range = new VRange(0, 1, 0.05);
        this.default = 1;
        this.update = function (val) {
            if (!_this.range.inRange(val)) {
                throw "Invalid value of argument";
            }
            _this.value = val;
        };
        this.getValue = function () {
            return _this.value;
        };
        this.value = this.default;
    }
    return LinearBlendArgument;
}());
var AlphaArgument = /** @class */ (function () {
    function AlphaArgument() {
        var _this = this;
        this.name = "Value to increase the contrast by";
        this.range = new VRange(0, 5, 0.1);
        this.default = 0;
        this.update = function (val) {
            if (!_this.range.inRange(val)) {
                throw "Invalid value of argument";
            }
            _this.value = val;
        };
        this.getValue = function () {
            return _this.value;
        };
        this.value = this.default;
    }
    return AlphaArgument;
}());
//#endregion
//#region BrightningOperator
var BrightningOperator = /** @class */ (function () {
    function BrightningOperator() {
        this.type = OperatorType.Global;
        this.name = "Brightness";
        this.description = "Change the brightness of the image";
        this.arguments = [];
        var BetaArgument = /** @class */ (function () {
            function BetaArgument() {
                var _this = this;
                this.name = "Value to increase the brightness by";
                this.range = new VRange(-100, 100, 1);
                this.default = 0;
                this.update = function (val) {
                    if (!_this.range.inRange(val)) {
                        throw "Invalid value of argument";
                    }
                    _this.value = val;
                };
                this.getValue = function () {
                    return _this.value;
                };
                this.value = this.default;
            }
            return BetaArgument;
        }());
        this.arguments.push(new BetaArgument());
        this.arguments.push(new AlphaArgument());
        this.arguments.push(new LinearBlendArgument());
    }
    BrightningOperator.prototype.fn = function () {
        var beta = parseInt(this.arguments[0].getValue());
        var alpha = parseFloat(this.arguments[1].getValue());
        var blend = parseFloat(this.arguments[2].getValue());
        return function (x_, y_, c_, i_) {
            var val = (i_ * alpha + beta) * blend + (1 - blend) * i_;
            if (val < 0)
                val = 0;
            if (val > 255)
                val = 255;
            return val;
        };
    };
    return BrightningOperator;
}());
OperatorManager.getInstance().register(new BrightningOperator());
//#endregion
//#region ContrastOperator
var ContrastOperator = /** @class */ (function () {
    function ContrastOperator() {
        this.type = OperatorType.Global;
        this.name = "Contrast";
        this.description = "Change the constrast of the image";
        this.arguments = [];
        this.arguments.push(new AlphaArgument());
        this.arguments.push(new LinearBlendArgument());
    }
    ContrastOperator.prototype.fn = function () {
        var alpha = parseFloat(this.arguments[0].getValue());
        var blend = parseFloat(this.arguments[1].getValue());
        return function (x_, y_, c_, i_) {
            var val = alpha * i_ * blend + (1 - blend) * i_;
            if (val < 0)
                val = 0;
            if (val > 255)
                val = 255;
            return val;
        };
    };
    return ContrastOperator;
}());
OperatorManager.getInstance().register(new ContrastOperator());
//#endregion
//#region GammaOperator
var GammaOperator = /** @class */ (function () {
    function GammaOperator() {
        this.type = OperatorType.Global;
        this.name = "Gamma Correction";
        this.description = "Change the linearity of the image";
        this.arguments = [];
        var GammaArgument = /** @class */ (function () {
            function GammaArgument() {
                var _this = this;
                this.name = "Change tonemapping of the image";
                this.range = new VRange(0, 3, 0.1);
                this.default = 1;
                this.update = function (val) {
                    if (!_this.range.inRange(val)) {
                        throw "Invalid value of argument";
                    }
                    _this.value = val;
                };
                this.getValue = function () {
                    return _this.value;
                };
                this.value = this.default;
            }
            return GammaArgument;
        }());
        this.arguments.push(new GammaArgument());
        this.arguments.push(new LinearBlendArgument());
    }
    GammaOperator.prototype.fn = function () {
        var gamma = parseFloat(this.arguments[0].getValue());
        var gamma_lut = [];
        for (var i = 0; i < 256; ++i) {
            gamma_lut[i] = Math.floor(Math.pow(i / 256, 1 / gamma) * 256);
            if (gamma_lut[i] > 255)
                gamma_lut[i] = 255;
        }
        var blend = parseFloat(this.arguments[1].getValue());
        return function (x_, y_, c_, i_) {
            return gamma_lut[i_] * blend + (1 - blend) * i_;
        };
    };
    return GammaOperator;
}());
OperatorManager.getInstance().register(new GammaOperator());
//#endregion
//# sourceMappingURL=operators.js.map