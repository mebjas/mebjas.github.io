var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
//#region Top level interfaces / classes
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
var OperatorArgumentType;
(function (OperatorArgumentType) {
    OperatorArgumentType[OperatorArgumentType["Continous"] = 0] = "Continous";
    OperatorArgumentType[OperatorArgumentType["Discrete"] = 1] = "Discrete";
})(OperatorArgumentType || (OperatorArgumentType = {}));
var OperatorType;
(function (OperatorType) {
    OperatorType[OperatorType["Point"] = 0] = "Point";
    OperatorType[OperatorType["Global"] = 1] = "Global";
    OperatorType[OperatorType["Local"] = 2] = "Local";
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
//#endregion
//#region Global functions
var clamp = function (val, min, max) {
    if (min === void 0) { min = 0; }
    if (max === void 0) { max = 255; }
    if (val < min)
        return min;
    if (val > max)
        return max;
    return val;
};
var blendValue = function (modified, original, alpha) {
    return modified * alpha + original * (1 - alpha);
};
/**
 * Converts the image inline to gray value.
 *
 * @param image image to convert.
 */
var convertToGray = function (image) {
    for (var y = 0; y < image.height; ++y) {
        for (var x = 0; x < image.width; ++x) {
            var sum = 0;
            for (var c = 0; c < image.channels; ++c) {
                sum = image.at(x, y, c);
            }
            var gray = clamp(Math.floor(sum / image.channels));
            image.updateGray(x, y, gray);
        }
    }
};
//#endregion
//#region GlobalArguments
//#region Abstract classes for arguments
var ContinousArgumentBase = /** @class */ (function () {
    function ContinousArgumentBase(name, defaultValue, range) {
        this.type = OperatorArgumentType.Continous;
        this.name = name;
        this.defaultValue = defaultValue;
        this.range = range;
        this.value = defaultValue;
    }
    ContinousArgumentBase.prototype.update = function (val) {
        if (!this.range.inRange(val)) {
            throw "Invalid value of argument";
        }
        this.value = val;
    };
    ;
    ContinousArgumentBase.prototype.getValue = function () {
        return this.value;
    };
    return ContinousArgumentBase;
}());
var DiscreteArgumentBase = /** @class */ (function () {
    function DiscreteArgumentBase(name, discreteValues, defaultValue) {
        this.discreteValues = [];
        this.type = OperatorArgumentType.Discrete;
        this.name = name;
        this.defaultValue = (defaultValue !== undefined)
            ? defaultValue : NONE_VALUE;
        this.discreteValues = discreteValues;
        this.value = this.defaultValue;
        if ((defaultValue === undefined)
            && !this.isOneOfDiscreteValues(NONE_VALUE)) {
            this.discreteValues.unshift(NONE_VALUE);
        }
    }
    DiscreteArgumentBase.prototype.update = function (val) {
        if (!this.isOneOfDiscreteValues(val)) {
            throw "Invalid value of argument";
        }
        this.value = val;
    };
    ;
    DiscreteArgumentBase.prototype.getValue = function () {
        return this.value;
    };
    DiscreteArgumentBase.prototype.isOneOfDiscreteValues = function (value) {
        for (var i = 0; i < this.discreteValues.length; ++i) {
            if (value == this.discreteValues[i]) {
                return true;
            }
        }
        return false;
    };
    return DiscreteArgumentBase;
}());
//#endregion
var NONE_VALUE = "none";
//#region global arguments
var BrightnessArgument = /** @class */ (function (_super) {
    __extends(BrightnessArgument, _super);
    function BrightnessArgument() {
        return _super.call(this, "Brightness (b)", 
        /* defaultValue= */ 0, new VRange(-100, 100, 1)) || this;
    }
    return BrightnessArgument;
}(ContinousArgumentBase));
var LinearBlendArgument = /** @class */ (function (_super) {
    __extends(LinearBlendArgument, _super);
    function LinearBlendArgument(defaultValue) {
        return _super.call(this, "Blend (Α)", defaultValue === undefined ? 1 : defaultValue, new VRange(0, 1, 0.05)) || this;
    }
    return LinearBlendArgument;
}(ContinousArgumentBase));
var ContrastArgument = /** @class */ (function (_super) {
    __extends(ContrastArgument, _super);
    function ContrastArgument(min, max, step) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 5; }
        if (step === void 0) { step = 0.1; }
        return _super.call(this, "Contrast (a)", 
        /* defaultValue= */ 1, new VRange(min, max, step)) || this;
    }
    return ContrastArgument;
}(ContinousArgumentBase));
var SaturationArgument = /** @class */ (function (_super) {
    __extends(SaturationArgument, _super);
    function SaturationArgument(min, max, step) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 10; }
        if (step === void 0) { step = 0.1; }
        return _super.call(this, "Saturation (s)", 
        /* defaultValue= */ 1, new VRange(min, max, step)) || this;
    }
    return SaturationArgument;
}(ContinousArgumentBase));
var ScalingArgument = /** @class */ (function (_super) {
    __extends(ScalingArgument, _super);
    function ScalingArgument(min, max, step, defaultValue) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 5; }
        if (step === void 0) { step = 0.2; }
        if (defaultValue === void 0) { defaultValue = 1; }
        return _super.call(this, "Scale (s)", defaultValue, new VRange(min, max, step)) || this;
    }
    return ScalingArgument;
}(ContinousArgumentBase));
var SigmaArgument = /** @class */ (function (_super) {
    __extends(SigmaArgument, _super);
    function SigmaArgument(min, max, step, defaultValue) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 5; }
        if (step === void 0) { step = 0.2; }
        if (defaultValue === void 0) { defaultValue = 1; }
        return _super.call(this, "Sigma (s)", defaultValue, new VRange(min, max, step)) || this;
    }
    return SigmaArgument;
}(ContinousArgumentBase));
var ThresholdArgument = /** @class */ (function (_super) {
    __extends(ThresholdArgument, _super);
    function ThresholdArgument(min, max, step, defaultValue) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 255; }
        if (step === void 0) { step = 1; }
        if (defaultValue === void 0) { defaultValue = 255; }
        return _super.call(this, "Threshold (t)", defaultValue, new VRange(min, max, step)) || this;
    }
    return ThresholdArgument;
}(ContinousArgumentBase));
var GammaArgument = /** @class */ (function (_super) {
    __extends(GammaArgument, _super);
    function GammaArgument() {
        return _super.call(this, "Tonemap Gamma (Γ)", 
        /* defaultValue= */ 1, new VRange(0, 3, 0.1)) || this;
    }
    return GammaArgument;
}(ContinousArgumentBase));
var KernelSize = /** @class */ (function (_super) {
    __extends(KernelSize, _super);
    function KernelSize() {
        return _super.call(this, "Kernel Size (MxM)", 
        /* defaultValue= */ 1, new VRange(1, 9, 2)) || this;
    }
    return KernelSize;
}(ContinousArgumentBase));
var BinaryArgument = /** @class */ (function (_super) {
    __extends(BinaryArgument, _super);
    function BinaryArgument() {
        return _super.call(this, "Binary Argument", 
        /* defaultValue= */ 0, new VRange(0, 1, 0)) || this;
    }
    return BinaryArgument;
}(ContinousArgumentBase));
var BlurTaskArgument = /** @class */ (function (_super) {
    __extends(BlurTaskArgument, _super);
    function BlurTaskArgument() {
        return _super.call(this, "Blur Task", [
            BlurTaskArgument.BLURRING,
            BlurTaskArgument.SUBTRACTION
        ]) || this;
    }
    BlurTaskArgument.BLURRING = "Blurring";
    BlurTaskArgument.SUBTRACTION = "Subtraction";
    return BlurTaskArgument;
}(DiscreteArgumentBase));
var BlurTypeArgument = /** @class */ (function (_super) {
    __extends(BlurTypeArgument, _super);
    function BlurTypeArgument() {
        return _super.call(this, "Blur Type", [
            BlurTypeArgument.Gaussian,
            BlurTypeArgument.BoxBlur
        ], 
        /* defaultValue= */ BlurTypeArgument.Gaussian) || this;
    }
    BlurTypeArgument.Gaussian = "Gaussian";
    BlurTypeArgument.BoxBlur = "BoxBlur";
    return BlurTypeArgument;
}(DiscreteArgumentBase));
var ColorSpaceType = /** @class */ (function (_super) {
    __extends(ColorSpaceType, _super);
    function ColorSpaceType() {
        return _super.call(this, "Color Space Type", [
            ColorSpaceType.RGB,
            ColorSpaceType.GRAY
        ], 
        /* defaultValue= */ ColorSpaceType.RGB) || this;
    }
    ColorSpaceType.RGB = "RGB";
    ColorSpaceType.GRAY = "GRAY";
    return ColorSpaceType;
}(DiscreteArgumentBase));
var DerivativeArgument = /** @class */ (function (_super) {
    __extends(DerivativeArgument, _super);
    function DerivativeArgument() {
        return _super.call(this, "Derivative Type", ["Central"]) || this;
    }
    return DerivativeArgument;
}(DiscreteArgumentBase));
var DerivativeThresholdArgument = /** @class */ (function (_super) {
    __extends(DerivativeThresholdArgument, _super);
    function DerivativeThresholdArgument() {
        return _super.call(this, "Derivative Threshold", ["Thresholding"]) || this;
    }
    return DerivativeThresholdArgument;
}(DiscreteArgumentBase));
var BinaryDiscreteArgument = /** @class */ (function (_super) {
    __extends(BinaryDiscreteArgument, _super);
    function BinaryDiscreteArgument() {
        return _super.call(this, "Operation", ["Run"]) || this;
    }
    return BinaryDiscreteArgument;
}(DiscreteArgumentBase));
var SharpnessType = /** @class */ (function (_super) {
    __extends(SharpnessType, _super);
    function SharpnessType() {
        return _super.call(this, "Sharpening Type", [
            SharpnessType.Laplacian,
            SharpnessType.DoubleLaplacian,
            SharpnessType.LaplacianOfGaussian,
            SharpnessType.UnsharpMask,
        ]) || this;
    }
    SharpnessType.Laplacian = "Laplacian";
    SharpnessType.DoubleLaplacian = "DoubleLaplacian";
    SharpnessType.LaplacianOfGaussian = "Laplacian of Gaussian";
    SharpnessType.UnsharpMask = "UnsharpMask";
    return SharpnessType;
}(DiscreteArgumentBase));
//#endregion
//#endregion
//#region Point Operators
//#region BrightningOperator
var BrightningOperator = /** @class */ (function () {
    function BrightningOperator() {
        this.type = OperatorType.Point;
        this.name = "Brightness";
        this.description = "Change the brightness of the image";
        this.arguments = [];
        this.arguments.push(new BrightnessArgument());
        this.arguments.push(new ContrastArgument());
        this.arguments.push(new LinearBlendArgument());
    }
    BrightningOperator.prototype.fn = function () {
        var brightness = parseInt(this.arguments[0].getValue());
        var contrast = parseFloat(this.arguments[1].getValue());
        var alpha = parseFloat(this.arguments[2].getValue());
        return function (_, __, ___, intensity) {
            var val = blendValue(
            /* modified= */ intensity * contrast + brightness, 
            /* original= */ intensity, 
            /* alpha= */ alpha);
            return clamp(val, 0, 255);
        };
    };
    return BrightningOperator;
}());
OperatorManager.getInstance().register(new BrightningOperator());
//#endregion
//#region GammaOperator
var GammaOperator = /** @class */ (function () {
    function GammaOperator() {
        this.type = OperatorType.Point;
        this.name = "Gamma Correction";
        this.description = "Change the linearity of the image";
        this.arguments = [];
        this.arguments.push(new GammaArgument());
        this.arguments.push(new LinearBlendArgument());
    }
    GammaOperator.prototype.fn = function () {
        var gamma = parseFloat(this.arguments[0].getValue());
        var alpha = parseFloat(this.arguments[1].getValue());
        var maxWhiteLevel = 255;
        var inverseGamma = 1 / gamma;
        // Create look up table for optimised tone mapping.
        var gammaLut = [];
        for (var i = 0; i < 256; ++i) {
            gammaLut[i] = Math.floor(Math.pow(i / maxWhiteLevel, inverseGamma) * maxWhiteLevel);
            if (gammaLut[i] > maxWhiteLevel)
                gammaLut[i] = maxWhiteLevel;
        }
        return function (_, __, ___, intensity) {
            return blendValue(
            /* modified= */ gammaLut[intensity], 
            /* original= */ intensity, 
            /* alpha= */ alpha);
        };
    };
    return GammaOperator;
}());
OperatorManager.getInstance().register(new GammaOperator());
//#endregion
//#endregion
//#endregion
//#region Global Operators
//#region HistorgramEqualization
var HistogramEqOperator = /** @class */ (function () {
    function HistogramEqOperator() {
        this.type = OperatorType.Global;
        this.name = "Histogram Equalization";
        this.description = "Balance the histogram of the image";
        this.arguments = [];
        this.arguments.push(new LinearBlendArgument(0));
    }
    HistogramEqOperator.prototype.fn = function () {
        var blend = parseFloat(this.arguments[0].getValue());
        return function (image) {
            var histograms = new Histograms(image, 256);
            var cdfs = new CDFs(histograms);
            // let lumaCdf: CDF = cdfs.getLumaCdf();
            var normalizedCdfs = [];
            for (var c = 0; c < image.channels; ++c) {
                normalizedCdfs[c] = createEmptyCdfLike(cdfs.getColorCdfs(c));
            }
            var binSize = histograms.binSize;
            var maxWhiteLevel = 255;
            for (var c = 0; c < image.channels; ++c) {
                var cdf = cdfs.getColorCdfs(c);
                var N = cdf[binSize - 1] - cdf[0];
                for (var i = 0; i < binSize; ++i) {
                    var nj = (cdf[i] - cdf[0]) * maxWhiteLevel;
                    normalizedCdfs[c][i] = Math.floor(nj / N);
                }
                for (var y = 0; y < image.height; ++y) {
                    for (var x = 0; x < image.width; ++x) {
                        var intensity = image.at(x, y, c);
                        intensity = blend * normalizedCdfs[c][intensity] + (1 - blend) * intensity;
                        image.update(x, y, c, intensity);
                    }
                }
            }
        };
    };
    return HistogramEqOperator;
}());
OperatorManager.getInstance().register(new HistogramEqOperator());
//#endregion
//#region GammaOperator
var ClippedRegionVisualizationOperator = /** @class */ (function () {
    function ClippedRegionVisualizationOperator() {
        this.type = OperatorType.Global;
        this.name = "Clipped region";
        this.description = "Visualize clipped regions (red color)";
        this.arguments = [];
        this.arguments.push(new BinaryDiscreteArgument());
    }
    ClippedRegionVisualizationOperator.prototype.fn = function () {
        var selection = this.arguments[0].getValue();
        var shouldRun = selection !== NONE_VALUE;
        return function (image) {
            if (!shouldRun) {
                return;
            }
            for (var y = 0; y < image.height; ++y) {
                for (var x = 0; x < image.width; ++x) {
                    var isAnyChannelClipped = false;
                    for (var c = 0; c < image.channels; ++c) {
                        if (image.at(x, y, c) >= 255) {
                            isAnyChannelClipped = true;
                            break;
                        }
                    }
                    if (isAnyChannelClipped) {
                        image.update(x, y, 0, 255);
                        for (var c = 1; c < image.channels; ++c) {
                            image.update(x, y, c, 0);
                        }
                    }
                }
            }
        };
    };
    return ClippedRegionVisualizationOperator;
}());
OperatorManager.getInstance().register(new ClippedRegionVisualizationOperator());
//#endregion
//#region Sharpening
var SaturationOperator = /** @class */ (function () {
    function SaturationOperator() {
        this.type = OperatorType.Local;
        this.name = "Saturation (WIP)";
        this.description = "Saturate the image";
        this.arguments = [];
        this.arguments.push(new SaturationArgument());
    }
    SaturationOperator.prototype.fn = function () {
        return function (image) {
            return image;
        };
    };
    return SaturationOperator;
}());
OperatorManager.getInstance().register(new SaturationOperator());
//#endregion
//#endregion
//#region Local Operators
//#region GaussianBlurring
var BlurringOperator = /** @class */ (function () {
    function BlurringOperator() {
        this.type = OperatorType.Local;
        this.name = "Blurring";
        this.description = "Blurs the image (Not all arguments work"
            + " with eachother).";
        this.arguments = [];
        this.arguments.push(new BlurTaskArgument());
        this.arguments.push(new ColorSpaceType());
        this.arguments.push(new BlurTypeArgument());
        this.arguments.push(new KernelSize());
        this.arguments.push(new SigmaArgument(0, 2, 0.1, 1));
        this.arguments.push(new ContrastArgument(0, 20));
    }
    BlurringOperator.prototype.fn = function () {
        var _this = this;
        var blurringType = this.arguments[0].getValue();
        var colorSpaceType = this.arguments[1].getValue();
        var blurType = this.arguments[2].getValue();
        var kernelSize = parseInt(this.arguments[3].getValue());
        var shouldRun = blurringType !== NONE_VALUE;
        var returnGray = colorSpaceType === ColorSpaceType.GRAY;
        var sigmaValue = parseFloat(this.arguments[4].getValue());
        var alphaValue = parseFloat(this.arguments[5].getValue());
        return function (image) {
            if (kernelSize == 1 || !shouldRun) {
                return;
            }
            if (returnGray) {
                convertToGray(image);
            }
            var kernel = _this.createKernel(kernelSize, blurType, sigmaValue);
            console.log(kernel.data);
            if (blurringType == BlurTaskArgument.BLURRING) {
                _this.convolveOnImage(image, kernel, returnGray);
            }
            else if (blurringType == BlurTaskArgument.SUBTRACTION) {
                var clone = image.clone();
                _this.convolveOnImage(clone, kernel, returnGray);
                for (var y = 0; y < image.height; ++y) {
                    for (var x = 0; x < image.width; ++x) {
                        if (returnGray) {
                            var delta = image.at(x, y, 0) - clone.at(x, y, 0);
                            delta = delta * alphaValue;
                            image.updateGray(x, y, clamp(Math.abs(delta)));
                        }
                        else {
                            for (var c = 0; c < image.channels; ++c) {
                                var delta = image.at(x, y, c)
                                    - clone.at(x, y, c);
                                delta = delta * alphaValue;
                                image.update(x, y, c, clamp(Math.abs(delta)));
                            }
                        }
                    }
                }
            }
            else {
                throw "Invalid blurring type = " + blurringType;
            }
        };
    };
    BlurringOperator.prototype.createKernel = function (kernelSize, blurType, sigma) {
        if (sigma === void 0) { sigma = 1; }
        if (blurType == BlurTypeArgument.Gaussian) {
            return this.createGaussianKernel(kernelSize, sigma);
        }
        else if (blurType == BlurTypeArgument.BoxBlur) {
            return this.createBoxBlur(kernelSize);
        }
        else {
            throw "Unsupported blurType = " + blurType;
        }
    };
    BlurringOperator.prototype.createGaussianKernel = function (kernelSize, sigma) {
        assert(kernelSize % 2 != 0, "kernel size should be odd.");
        var kernel = this.createEmptyKernel(kernelSize);
        var s = 2 * sigma * sigma;
        var r;
        var middleVal = Math.floor(kernelSize / 2);
        var sum = 0; // For normalization
        for (var y = -middleVal; y <= middleVal; ++y) {
            for (var x = -middleVal; x <= middleVal; ++x) {
                r = (x * x + y * y);
                kernel[y + middleVal][x + middleVal]
                    = Math.exp(-r / s) / Math.PI * s;
                sum += kernel[y + middleVal][x + middleVal];
            }
        }
        // Normalize
        for (var y = 0; y < kernelSize; ++y) {
            for (var x = 0; x < kernelSize; ++x) {
                kernel[y][x] /= sum;
            }
        }
        return ConvolutionMask2D.createMask(kernel);
    };
    BlurringOperator.prototype.createBoxBlur = function (kernelSize) {
        assert(kernelSize % 2 != 0, "kernel size should be odd.");
        var kernel = this.createEmptyKernel(kernelSize, 1 / (kernelSize * kernelSize));
        return ConvolutionMask2D.createMask(kernel);
    };
    BlurringOperator.prototype.createEmptyKernel = function (kernelSize, defaultValue) {
        if (defaultValue === void 0) { defaultValue = 0; }
        assert(kernelSize % 2 != 0, "kernel size should be odd.");
        var emptyKernel = [];
        for (var i = 0; i < kernelSize; ++i) {
            emptyKernel.push([]);
            for (var j = 0; j < kernelSize; ++j) {
                emptyKernel[i][j] = defaultValue;
            }
        }
        return emptyKernel;
    };
    // Expects the image to be gray if {@param isGray} == true.
    BlurringOperator.prototype.convolveOnImage = function (image, kernel, isGray) {
        var clone = image.clone();
        for (var y = 0; y < image.height; ++y) {
            for (var x = 0; x < image.width; ++x) {
                if (isGray) {
                    var intensity = clone.convolve(x, y, 0, kernel);
                    image.updateGray(x, y, clamp(intensity));
                }
                else {
                    for (var c = 0; c < image.channels; ++c) {
                        var intensity = clone.convolve(x, y, c, kernel);
                        image.update(x, y, c, clamp(intensity));
                    }
                }
            }
        }
    };
    return BlurringOperator;
}());
OperatorManager.getInstance().register(new BlurringOperator());
//#endregion
//#region DerivativeOperator
var DerivativeOperator = /** @class */ (function () {
    function DerivativeOperator() {
        this.type = OperatorType.Local;
        this.name = "Derivative";
        this.description = "Converts to first order derivative of image";
        this.arguments = [];
        this.arguments.push(new DerivativeArgument());
        this.arguments.push(new ScalingArgument(0.1, 5, 0.05, 1));
        this.arguments.push(new DerivativeThresholdArgument());
        this.arguments.push(new ThresholdArgument());
    }
    DerivativeOperator.prototype.fn = function () {
        var selectedType = this.arguments[0].getValue();
        var scalingFactor = parseFloat(this.arguments[1].getValue());
        var thresholdType = this.arguments[2].getValue();
        var threshold = parseInt(this.arguments[3].getValue());
        var isEnabled = selectedType !== NONE_VALUE;
        var isThresholdingEnabled = thresholdType !== NONE_VALUE;
        return function (image) {
            if (!isEnabled) {
                return;
            }
            // Convert to gray scale.
            convertToGray(image);
            var xConvolution = ConvolutionMask2D.createMask([
                [-1, 0, 1],
                [-1, 0, 1],
                [-1, 0, 1]
            ]);
            var yConvolution = ConvolutionMask2D.createMask([
                [1, 1, 1],
                [0, 0, 0],
                [-1, -1, -1],
            ]);
            var clone = image.clone();
            for (var y = 0; y < image.height; ++y) {
                for (var x = 0; x < image.width; ++x) {
                    var fx = clone.convolve(x, y, /* c= */ 0, xConvolution, scalingFactor);
                    var fy = clone.convolve(x, y, /* c= */ 0, yConvolution, scalingFactor);
                    var magnitude = Math.sqrt(fx * fx + fy * fy);
                    if (!isThresholdingEnabled) {
                        image.updateGray(x, y, clamp(Math.floor(magnitude)));
                    }
                    else {
                        var intensity = clamp(Math.floor(magnitude));
                        image.updateGray(x, y, intensity >= threshold ? 255 : 0);
                    }
                }
            }
        };
    };
    return DerivativeOperator;
}());
OperatorManager.getInstance().register(new DerivativeOperator());
//#endregion
//#region DerivativeOperator
var SobelEdgeOperator = /** @class */ (function () {
    function SobelEdgeOperator() {
        this.type = OperatorType.Local;
        this.name = "Sobel Edge";
        this.description = "Edge detection";
        this.arguments = [];
        this.arguments.push(new DerivativeArgument());
        this.arguments.push(new ScalingArgument(0.1, 5, 0.05, 1));
        this.arguments.push(new DerivativeThresholdArgument());
        this.arguments.push(new ThresholdArgument(0, 255, 1, 100));
    }
    SobelEdgeOperator.prototype.fn = function () {
        var selectedType = this.arguments[0].getValue();
        var scalingFactor = parseFloat(this.arguments[1].getValue());
        var thresholdType = this.arguments[2].getValue();
        var threshold = parseInt(this.arguments[3].getValue());
        var isEnabled = selectedType !== NONE_VALUE;
        var isThresholdingEnabled = thresholdType !== NONE_VALUE;
        return function (image) {
            if (!isEnabled) {
                return;
            }
            // Convert to gray scale.
            convertToGray(image);
            var xConvolution = ConvolutionMask2D.createMask([
                [1, 0, -1],
                [2, 0, -2],
                [1, 0, -1]
            ]);
            var yConvolution = ConvolutionMask2D.createMask([
                [1, 2, 1],
                [0, 0, 0],
                [-1, -2, -1],
            ]);
            var clone = image.clone();
            for (var y = 0; y < image.height; ++y) {
                for (var x = 0; x < image.width; ++x) {
                    var fx = clone.convolve(x, y, /* c= */ 0, xConvolution, scalingFactor);
                    var fy = clone.convolve(x, y, /* c= */ 0, yConvolution, scalingFactor);
                    var magnitude = Math.sqrt(fx * fx + fy * fy);
                    if (!isThresholdingEnabled) {
                        image.updateGray(x, y, clamp(Math.floor(magnitude)));
                    }
                    else {
                        var intensity = clamp(Math.floor(magnitude));
                        image.updateGray(x, y, intensity >= threshold ? 255 : 0);
                    }
                }
            }
        };
    };
    return SobelEdgeOperator;
}());
OperatorManager.getInstance().register(new SobelEdgeOperator());
//#endregion
//#region Sharpening
var SharpeningOperator = /** @class */ (function () {
    function SharpeningOperator() {
        this.type = OperatorType.Local;
        this.name = "Sharpening";
        this.description = "Sharpens the image";
        this.arguments = [];
        this.arguments.push(new SharpnessType());
        this.arguments.push(new ScalingArgument(0.1, 5, 0.05, 1));
    }
    SharpeningOperator.prototype.fn = function () {
        var sharpnessType = this.arguments[0].getValue();
        var isEnabled = sharpnessType !== NONE_VALUE;
        var scalingFactor = parseFloat(this.arguments[1].getValue());
        return function (image) {
            if (!isEnabled) {
                return image;
            }
            if (sharpnessType == SharpnessType.UnsharpMask) {
                var convolution = ConvolutionMask2D.createMask([
                    [0, -1, 0],
                    [-1, 5, -1],
                    [0, -1, 0]
                ]);
                var clone = image.clone();
                for (var y = 0; y < image.height; ++y) {
                    for (var x = 0; x < image.width; ++x) {
                        for (var c = 0; c < image.channels; ++c) {
                            var val = clone.convolve(x, y, c, convolution, scalingFactor);
                            var intensity = clamp(Math.floor(val));
                            image.update(x, y, c, intensity);
                        }
                    }
                }
            }
        };
    };
    return SharpeningOperator;
}());
OperatorManager.getInstance().register(new SharpeningOperator());
//#endregion
//#endregion
//# sourceMappingURL=operators.js.map