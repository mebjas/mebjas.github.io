/**
 * This file contains some basic hand written image processing library classes,
 * interfaces, enums and global functions.
 *
 * @author Minhaz <minhazav@gmail.com>
 */
//#region Global enums, methods
var assert = function (conditionResult, failureMessage) {
    console.assert(conditionResult, failureMessage);
    if (!conditionResult) {
        throw "Assertion failed: " + failureMessage;
    }
};
var Channel;
(function (Channel) {
    Channel[Channel["Red"] = 0] = "Red";
    Channel[Channel["Blue"] = 1] = "Blue";
    Channel[Channel["Green"] = 2] = "Green";
    Channel[Channel["Luma"] = 3] = "Luma";
})(Channel || (Channel = {}));
var AllChannels = [
    Channel.Red,
    Channel.Blue,
    Channel.Green,
    Channel.Luma
];
var CreateDefaultSelectionOfChannelsToShow = function () {
    var result = {};
    AllChannels.forEach(function (channel) {
        result[channel] = true;
    });
    return result;
};
var getChannelCode = function (channel) {
    switch (channel) {
        case Channel.Red: return "R";
        case Channel.Green: return "G";
        case Channel.Blue: return "B";
        case Channel.Luma: return "Y";
        default:
            throw "Invalid channel id passed " + channel;
    }
};
var getChannelByCode = function (channelCode) {
    switch (channelCode) {
        case "R": return Channel.Red;
        case "G": return Channel.Green;
        case "B": return Channel.Blue;
        case "Y": return Channel.Luma;
        default:
            throw "Invalid channel code passed " + channelCode;
    }
};
//#endregion
//#region Image class
/** Represents the image class. */
var VImage = /** @class */ (function () {
    function VImage(imageData) {
        this.channels = 3;
        this.width = imageData.width;
        this.height = imageData.height;
        this.readonlyImageData = new ImageData(new Uint8ClampedArray(imageData.data), this.width, this.height);
        this.imageData = imageData;
    }
    /** Resets the image to it's original state. */
    VImage.prototype.reset = function () {
        this.imageData = new ImageData(new Uint8ClampedArray(this.readonlyImageData.data), this.width, this.height);
        return this;
    };
    /** Creates a clone of this image. */
    VImage.prototype.clone = function () {
        var imageDataCopy = new ImageData(new Uint8ClampedArray(this.imageData.data), this.width, this.height);
        return new VImage(imageDataCopy);
    };
    /**
     * Returns the intesity at give coordinates
     *
     * @param {number} x X Coordinate
     * @param {number} y Y Coordinate
     * @param {number} c Color channel, 0, 1, 2 are R, G, B respectively
     */
    VImage.prototype.at = function (x, y, c) {
        var index = (y * this.width + x) * 4 + c;
        return this.imageData.data[index];
    };
    /**
     * Returns the gray intensity at give coordinates
     *
     * @param {number} x X Coordinate
     * @param {number} y Y Coordinate
     */
    VImage.prototype.grayAt = function (x, y) {
        var sum = 0;
        for (var c = 0; c < this.channels; ++c) {
            sum += this.at(x, y, c);
        }
        return Math.floor(sum / this.channels);
    };
    /**
     * Updates the image at given coordinates.
     *
     * @param {number} x X Coordinate
     * @param {number} y Y Coordinate
     * @param {number} c Color channel, 0, 1, 2 are R, G, B respectively
     * @param {number} val Intensity value at given coordinates
     */
    VImage.prototype.update = function (x, y, c, val) {
        this.imageData.data[(y * this.width + x) * 4 + c] = val;
    };
    /**
     * Updates the image at given coordinates with gray value.
     *
     * @param {number} x X Coordinate
     * @param {number} y Y Coordinate
     * @param {number} val Intensity value at given coordinates
     */
    VImage.prototype.updateGray = function (x, y, val) {
        for (var c = 0; c < this.channels; ++c) {
            this.update(x, y, c, val);
        }
    };
    /**
     * Renders the image instance to the given {@param context}.
     *
     * @param {CanvasRenderingContext2D} context a Valid canvas context.
     */
    VImage.prototype.renderToContext = function (context) {
        // TODO(mebjas): render with full dimensions of the canvas.
        context.putImageData(this.imageData, 0, 0);
    };
    /**
     * Runs an operator of type {@param operatorType} on the image
     *
     * @param fn operator to run on
     * @param operatorType type of the operator
     */
    VImage.prototype.runFn = function (fn, operatorType) {
        if (operatorType == OperatorType.Global) {
            this.runGlobalFn(fn);
        }
        else if (operatorType == OperatorType.Point) {
            this.forEach(fn);
        }
        else if (operatorType == OperatorType.Local) {
            this.runLocalFn(fn);
        }
        else {
            throw "Unsupported operatorType = " + operatorType;
        }
    };
    /**
     * Runs the given operator for each pixel
     *
     * @param {Function} fn operator
     */
    VImage.prototype.forEach = function (fn) {
        for (var y = 0; y < this.height; ++y) {
            for (var x = 0; x < this.width; ++x) {
                for (var c = 0; c < this.channels; ++c) {
                    var updatedValue = fn(x, y, c, this.at(x, y, c));
                    this.update(x, y, c, updatedValue);
                }
            }
        }
    };
    /**
     * Runs a global function on the image, that can modify it's content
     *
     * @param fn operator
     */
    VImage.prototype.runGlobalFn = function (fn) {
        fn(this);
    };
    /**
     * Runs a local or neighbourhood operator on the image, that can modify
     * it's content
     *
     * @param fn operator
     */
    VImage.prototype.runLocalFn = function (fn) {
        // TODO(mebjas): abstract better
        fn(this);
    };
    /**
     * Convolves a given mask centered at given coordinates on gray values.
     *
     * @param {number} x X Coordinate
     * @param {number} y Y Coordinate
     * @param {number} c channel index
     * @param {ConvolutionMask2D} mask Mask to apply
     * @param {number} scalingFactor Value to scale the convolution result with
     */
    VImage.prototype.convolve = function (x, y, c, mask, scalingFactor) {
        if (scalingFactor === void 0) { scalingFactor = 1; }
        var sum = 0;
        // Assuming mask are always odd sized.
        var yMiddle = Math.floor(mask.height / 2);
        var xMiddle = Math.floor(mask.width / 2);
        for (var j = 0; j < mask.height; ++j) {
            for (var i = 0; i < mask.width; ++i) {
                sum += (mask.at(i, j) *
                    this.paddedValueAt(x + i - xMiddle, y + j - yMiddle, c));
            }
        }
        return sum * scalingFactor;
    };
    /** Zero padded */
    VImage.prototype.paddedValueAt = function (x, y, c) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return 0;
        }
        return this.at(x, y, c);
    };
    return VImage;
}());
var ConvolutionMask2D = /** @class */ (function () {
    function ConvolutionMask2D(data, width, height) {
        this.data = data;
        this.width = width;
        this.height = height;
    }
    ConvolutionMask2D.createMask = function (matrix) {
        // Validate
        var height = matrix.length;
        assert(height > 0, "Mask height should be greater than 0.");
        var width = matrix[0].length;
        assert(width > 0, "Mask width should be greater than 0.");
        for (var i = 1; i < height; i++) {
            assert(width == matrix[1].length, "Every row in the mask should have same width");
        }
        assert(height % 2 != 0, "Only odd masks supported at the moment.");
        assert(width % 2 != 0, "Only odd masks supported at the moment.");
        return new ConvolutionMask2D(matrix, width, height);
    };
    /**
     * Returns the element at the given coordinates. Doesn't check for out of
     * bounds.
     *
     * @param x x coordinates
     * @param y y coordinates
     */
    ConvolutionMask2D.prototype.at = function (x, y) {
        return this.data[y][x];
    };
    return ConvolutionMask2D;
}());
var Histograms = /** @class */ (function () {
    function Histograms(image, binSize) {
        if (binSize === void 0) { binSize = 32; }
        this.image = image;
        this.binSize = binSize;
        this.compute();
    }
    Histograms.prototype.renderToContext = function (context, contextWidth, contextHeight, channelsToShow) {
        context.clearRect(0, 0, contextWidth, contextHeight);
        var maxVal = this.findMaxVal();
        if (!channelsToShow) {
            channelsToShow = CreateDefaultSelectionOfChannelsToShow();
        }
        if (channelsToShow[Channel.Red]) {
            this.renderSingleHist(context, contextWidth, contextHeight, this.rHist, "#FF0000", maxVal);
        }
        if (channelsToShow[Channel.Green]) {
            this.renderSingleHist(context, contextWidth, contextHeight, this.gHist, "#00FF00", maxVal);
        }
        if (channelsToShow[Channel.Blue]) {
            this.renderSingleHist(context, contextWidth, contextHeight, this.bHist, "#0000FF", maxVal);
        }
        if (channelsToShow[Channel.Luma]) {
            this.renderSingleHist(context, contextWidth, contextHeight, this.lumaHist, "#000000", maxVal);
        }
    };
    Histograms.prototype.getColorHistogram = function (channel) {
        switch (channel) {
            case 0: return this.rHist;
            case 1: return this.gHist;
            case 2: return this.bHist;
        }
        throw "Invalid channel, max value = 2";
    };
    Histograms.prototype.getLumaHistogram = function () {
        return this.lumaHist;
    };
    Histograms.prototype.renderSingleHist = function (context, contextWidth, contextHeight, hist, strokeStyle, maxVal) {
        var epsilon = 0.01;
        context.beginPath();
        context.strokeStyle = strokeStyle;
        context.moveTo(0, contextHeight);
        // TODO(mebjas): Major assumption here that the canvas width is
        // same as the bin size which can fail at any point.
        for (var i = 0; i < this.binSize; i++) {
            var x = i * (contextWidth / this.binSize) + (contextWidth / this.binSize - 1);
            var y = contextHeight * (1 - (hist[i] / (maxVal + epsilon)));
            context.lineTo(x, y);
            context.stroke();
        }
    };
    Histograms.prototype.compute = function () {
        var _this = this;
        this.binIndexDivisor = 256 / this.binSize;
        var getBinIndex = function (intensity) {
            return Math.floor(intensity / _this.binIndexDivisor);
        };
        this.rHist = this.createEmptyHist();
        this.gHist = this.createEmptyHist();
        this.bHist = this.createEmptyHist();
        this.lumaHist = this.createEmptyHist();
        for (var y = 0; y < this.image.height; ++y) {
            for (var x = 0; x < this.image.width; ++x) {
                var rValue = this.image.at(x, y, 0);
                var gValue = this.image.at(x, y, 1);
                var bValue = this.image.at(x, y, 2);
                var lumaValue = 0.2126 * rValue + 0.7152 * gValue + 0.0722 * bValue;
                var rBin = getBinIndex(rValue);
                var gBin = getBinIndex(gValue);
                var bBin = getBinIndex(bValue);
                var lumaBin = getBinIndex(lumaValue);
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
    };
    Histograms.prototype.findMaxVal = function () {
        var findMaxValSingleHist = function (hist, maxValSoFar) {
            var maxVal = maxValSoFar;
            for (var i = 0; i < hist.length; ++i) {
                if (hist[i] > maxVal) {
                    maxVal = hist[i];
                }
            }
            return maxVal;
        };
        var maxValSoFar = 0;
        maxValSoFar = findMaxValSingleHist(this.rHist, maxValSoFar);
        maxValSoFar = findMaxValSingleHist(this.gHist, maxValSoFar);
        maxValSoFar = findMaxValSingleHist(this.bHist, maxValSoFar);
        maxValSoFar = findMaxValSingleHist(this.lumaHist, maxValSoFar);
        return maxValSoFar;
    };
    Histograms.prototype.normalize = function (hist) {
        var netPixels = this.image.width * this.image.height;
        for (var i = 0; i < this.binSize; i++) {
            hist[i] = hist[i] / netPixels;
        }
        return hist;
    };
    Histograms.prototype.createEmptyHist = function () {
        var hist = [];
        for (var i = 0; i < this.binSize; i++) {
            hist.push(0);
        }
        return hist;
    };
    return Histograms;
}());
var createEmptyCdf = function (binSize) {
    var cdf = [];
    for (var i = 0; i < binSize; i++) {
        cdf.push(0);
    }
    return cdf;
};
var createEmptyCdfLike = function (cdf) {
    var newCdf = [];
    for (var i = 0; i < cdf.length; i++) {
        newCdf.push(0);
    }
    return newCdf;
};
var CDFs = /** @class */ (function () {
    function CDFs(histograms) {
        this.histograms = histograms;
        this.compute();
    }
    CDFs.prototype.getColorCdfs = function (channel) {
        switch (channel) {
            case 0: return this.rCdf;
            case 1: return this.gCdf;
            case 2: return this.bCdf;
        }
        throw "Invalid channel, max value = 2";
    };
    CDFs.prototype.getLumaCdf = function () {
        return this.lumaCdf;
    };
    CDFs.prototype.renderToContext = function (context, contextWidth, contextHeight, channelsToShow) {
        context.clearRect(0, 0, contextWidth, contextHeight);
        var maxVal = 1.0;
        if (!channelsToShow) {
            channelsToShow = CreateDefaultSelectionOfChannelsToShow();
        }
        // TODO(mebjas): Make these colors constant
        if (channelsToShow[Channel.Red]) {
            this.renderSingleCdf(context, contextWidth, contextHeight, this.rCdf, "#FF0000", maxVal);
        }
        if (channelsToShow[Channel.Green]) {
            this.renderSingleCdf(context, contextWidth, contextHeight, this.gCdf, "#00FF00", maxVal);
        }
        if (channelsToShow[Channel.Blue]) {
            this.renderSingleCdf(context, contextWidth, contextHeight, this.bCdf, "#0000FF", maxVal);
        }
        if (channelsToShow[Channel.Luma]) {
            this.renderSingleCdf(context, contextWidth, contextHeight, this.lumaCdf, "#000000", maxVal);
        }
    };
    CDFs.prototype.renderSingleCdf = function (context, contextWidth, contextHeight, hist, strokeStyle, maxVal) {
        var epsilon = 0.01;
        context.beginPath();
        context.strokeStyle = strokeStyle;
        context.moveTo(0, contextHeight);
        // TODO(mebjas): Major assumption here that the canvas width is
        // same as the bin size which can fail at any point.
        var binSize = this.histograms.binSize;
        for (var i = 0; i < binSize; i++) {
            var x = i * (contextWidth / binSize) + (contextWidth / binSize - 1);
            var y = contextHeight * (1 - (hist[i] / (maxVal + epsilon)));
            context.lineTo(x, y);
            context.stroke();
        }
    };
    CDFs.prototype.compute = function () {
        var rHist = this.histograms.getColorHistogram(0);
        var gHist = this.histograms.getColorHistogram(1);
        var bHist = this.histograms.getColorHistogram(2);
        var lumaHist = this.histograms.getLumaHistogram();
        this.rCdf = createEmptyCdf(this.histograms.binSize);
        this.gCdf = createEmptyCdf(this.histograms.binSize);
        this.bCdf = createEmptyCdf(this.histograms.binSize);
        this.lumaCdf = createEmptyCdf(this.histograms.binSize);
        this.rCdf[0] = rHist[0];
        this.gCdf[0] = gHist[0];
        this.bCdf[0] = bHist[0];
        this.lumaCdf[0] = lumaHist[0];
        var length = rHist.length;
        for (var i = 1; i < length; ++i) {
            this.rCdf[i] = this.rCdf[i - 1] + rHist[i];
            this.gCdf[i] = this.gCdf[i - 1] + gHist[i];
            this.bCdf[i] = this.bCdf[i - 1] + bHist[i];
            this.lumaCdf[i] = this.lumaCdf[i - 1] + lumaHist[i];
        }
    };
    return CDFs;
}());
//# sourceMappingURL=library.js.map