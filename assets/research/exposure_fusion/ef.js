/**
 * Do not look at this code and use it to judge me. The intent of writing this peice of code was
 * to understand how exposure fusion works (i.e. with visualization of each steps) and not
 * writing a library or any reusable component.
 */

let input1 = document.getElementById('input_1');
let input2 = document.getElementById('input_2');
let input3 = document.getElementById('input_3');
let images = [input1, input2, input3];
let weightsCanvas = document.getElementById('weights_canvas');
let mnWeightsCanvas = document.getElementById('merged_weights_canvas');
let pyrMmergeCanvas = document.getElementById('pyr_merge_canvas');
let datasetSelector = document.getElementById('dataset_selector');
let maps = ["Contrast", "Saturation", "Exposure (scaled up)"];
let maxPyrLevel = 4;

function exponentialCalculation(val, sigma) {
    let delta = ((val / 255.0) - 0.5);
    let twoSigmaSq = (2 * sigma * sigma);
    return Math.exp( - delta * delta / twoSigmaSq);
}

// fix this function
function normalizeAndScaleCV8U(src, min, max) {
    let width = src.cols;
    let height = src.rows;
    let channels = src.channels();
    console.assert(channels == 1, "Channels expected to be 1");
    if (!min || !max) {
        min = src.ucharAt(0, 0);
        max = src.ucharAt(0, 0);
        for (let y = 0; y < height; ++y) {
            for (let x = 0; x < width; ++x) {
                let val = src.ucharAt(y, x);
                if (val > max) {
                    max = val;
                }
                if (val < min) {
                    min < val;
                }
            }
        }
    }
    
    let result = new cv.Mat(height, width, cv.CV_8U);
    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            let val = src.ucharAt(y, x);
            let normalizedValue = (val - min) / (max - min) * 255;
            result.ucharPtr(y, x)[0] = normalizedValue;
        }
    }

    return result;
}

function loadAllImages(allImagesLoadedCallback) {
    let cvImages = [undefined, undefined, undefined];
    let countImageLoaded = 0;

    function onLoad(index, image) {
        countImageLoaded++;
        cvImages[index] = cv.imread(image);
        if (countImageLoaded == images.length) {
            allImagesLoadedCallback(cvImages);
        }
    }

    images.forEach(function(ignore, index) {
        let image = images[index];
        if (image.complete && image.naturalHeight !== 0) {
            onLoad(index, image);
        } else {
            image.onload = function() {
                onLoad(index, image);
            }
        }
    })
}

function getContrastMap(src, normalize) {
    // Contrast
    let tmp = new cv.Mat();
    let dst = new cv.Mat();
    cv.cvtColor(src, tmp, cv.COLOR_RGB2GRAY, 0);
    tmp.convertTo(tmp, cv.CV_32F, 1 / 255);
    // You can try more different parameters
    cv.Laplacian(tmp, dst, cv.CV_32F, 3, 10, 0, cv.BORDER_DEFAULT);
    tmp.delete();
    if (normalize !== true) {
        return dst;
    }
    cv.normalize(dst, dst, 0, 1, cv.NORM_MINMAX);
    dst.convertTo(dst, cv.CV_8U, 255);
    return dst;
}

function getSaturationMap(src, normalize) {
    let width = src.cols;
    let height = src.rows;
    let channels = src.channels();
    let dst = new cv.Mat(height, width, cv.CV_32F);
    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            let r = src.ucharAt(y, x * channels);
            let g = src.ucharAt(y, x * channels + 1);
            let b = src.ucharAt(y, x * channels + 2);
            let mean = (r + g + b) / 3;
            let saturation = Math.sqrt(
                ((r - mean) * (r - mean) + (g - mean) * (g - mean) + (b - mean) * (b - mean)) / 3
            );
            dst.floatPtr(y, x)[0] = saturation;
        }
    }
    if (normalize !== true) {
        return dst;
    }

    cv.normalize(dst, dst, 0, 1, cv.NORM_MINMAX);
    dst.convertTo(dst, cv.CV_8U, 255);
    return dst;
}

function getExposureMap(src, normalize) {
    let width = src.cols;
    let height = src.rows;
    let channels = src.channels();
    let dst = new cv.Mat(height, width, (normalize) ? cv.CV_8U : cv.CV_32F);

    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            let r = src.ucharAt(y, x * channels);
            let g = src.ucharAt(y, x * channels + 1);
            let b = src.ucharAt(y, x * channels + 2);
            let e = exponentialCalculation(r, 0.2)
                * exponentialCalculation(g, 0.2) * exponentialCalculation(b, 0.2);
            if (normalize == true) {
                e *= 255;
                dst.ucharPtr(y, x)[0] = e;
            } else {
                dst.floatPtr(y, x)[0] = e;
            }
        }
    }

    return dst;
}

function renderWeight(cvImages, mapType, imageIndex) {
    let src = cvImages[imageIndex];
    let canvasId = `__weight_${mapType}_${imageIndex}`;

    if (mapType == maps[0]) {
        // Contrast
        let dst = getContrastMap(src, /* normalize= */ true);
        cv.imshow(canvasId, dst);
        dst.delete();
    } else if (mapType == maps[1]) {
        let dst = getSaturationMap(src, /* normalize= */ true);
        cv.imshow(canvasId, dst);
        dst.delete();
    } else if (mapType == maps[2]) {
        let dst = getExposureMap(src, /* normalize= */ true);
        cv.imshow(canvasId, dst);
        dst.delete();
    }
}

function computeWeights(cvImages) {
    let width = input1.width;
    let height = input1.height;
    let loggingElement;

    function renderUi() {
        loggingElement = document.createElement('div');
        weightsCanvas.innerHTML = '';
        weightsCanvas.appendChild(loggingElement);
        loggingElement.innerHTML = "Computing weights...";

        let canvas = document.createElement('div');
        weightsCanvas.appendChild(canvas);

        for (let m = 0; m < maps.length; m++) {
            let rowHeader = document.createElement('div');
            rowHeader.className = 'weight_header';
            rowHeader.innerHTML = maps[m];
            canvas.appendChild(rowHeader);

            let rowDiv = document.createElement('div');
            rowDiv.id = `__weight_${maps[m]}`;
            for (let i = 0; i < cvImages.length; i++) {
                let canvas = document.createElement('canvas');
                canvas.id = `__weight_${maps[m]}_${i}`;
                canvas.className = 'weight_canvas';
                canvas.width = width;
                canvas.height = height;
                rowDiv.appendChild(canvas);
            }
            canvas.appendChild(rowDiv);
        }
    }

    renderUi();
    for (let m = 0; m < maps.length; m++) {
        for (let i = 0; i < cvImages.length; i++) {
            renderWeight(cvImages, maps[m], i);
        }
    }

    loggingElement.innerHTML = "";
}

function computeMergedMap(src) {
    let contrastMap = getContrastMap(src, /* normalize= */ false);
    let saturationMap = getSaturationMap(src, /* normalize= */ false);
    let exposureMap = getExposureMap(src, /* normalize= */ false);

    let width = src.cols;
    let height = src.rows;
    let mergedMap = new cv.Mat(height, width, cv.CV_32F);
    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            let val = 
                // contrastMap.floatAt(y, x) *
                saturationMap.floatAt(y, x) *
                exposureMap.floatAt(y, x);
            mergedMap.floatPtr(y, x)[0] = val;
        }
    }

    contrastMap.delete();
    saturationMap.delete();
    exposureMap.delete();

    return mergedMap;
}

function normalizeMergedMaps(mergedMaps) {
    console.assert(mergedMaps.length == 3, "minimum three weights expected");
    let count = mergedMaps.length;
    let normlaizedMergedMaps = [undefined, undefined, undefined];
    let width = mergedMaps[0].cols;
    let height = mergedMaps[0].rows;
    for (let i = 0; i < count; i++) {
        normlaizedMergedMaps[i] = new cv.Mat(height, width, cv.CV_32F);
    }
    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            let sum = 0;
            for (let i = 0; i < count; i++) {
                sum += mergedMaps[i].floatAt(y, x);
            }
            for (let i = 0; i < count; i++) {
                let val = (sum == 0) ? 0.3333 : (mergedMaps[i].floatAt(y, x) / sum);
                normlaizedMergedMaps[i].floatPtr(y, x)[0] = val;
            }
        }
    }
    return normlaizedMergedMaps;
}

function computeMergedWeights(cvImages) {
    let width = input1.width;
    let height = input1.height;
    let loggingElement;
    function renderUi() {
        loggingElement = document.createElement('div');
        mnWeightsCanvas.innerHTML = '';
        mnWeightsCanvas.appendChild(loggingElement);
        loggingElement.innerHTML = "Computing merged weights...";

        let canvas = document.createElement('div');
        mnWeightsCanvas.appendChild(canvas);

        let rowHeader = document.createElement('div');
        rowHeader.className = 'weight_header';
        rowHeader.innerHTML = "Merged & Normalized weights";
        canvas.appendChild(rowHeader);

        let rowDiv = document.createElement('div');
        for (let i = 0; i < cvImages.length; i++) {
            let canvas = document.createElement('canvas');
            canvas.id = `__mnweight_${i}`;
            canvas.className = 'weight_canvas';
            canvas.width = width;
            canvas.height = height;
            rowDiv.appendChild(canvas);
        }
        canvas.appendChild(rowDiv);
    }

    renderUi();
    mergedMaps = [undefined, undefined, undefined];
    for (let i = 0; i < cvImages.length; i++) {
        mergedMaps[i] = computeMergedMap(cvImages[i]);
    }
    normalizedMaps = normalizeMergedMaps(mergedMaps);
    for (let i = 0; i < mergedMaps.length; i++) {
        let canvasId = `__mnweight_${i}`;
        cv.imshow(canvasId, normalizedMaps[i]);
        mergedMaps[i].delete();
        normalizedMaps[i].delete();
    }

    loggingElement.innerHTML = "";
}

function singleImageProcess(image, weight, resultPyrs, imageIndex) {
    let imagef32 = new cv.Mat();
    image.convertTo(imagef32, cv.CV_32FC4);

    let imagePyrs = [imagef32];
    let weightPyrs = [weight.clone()];
    for (let l = 1; l < maxPyrLevel; l++) {
        imagePyrs[l] = new cv.Mat();
        weightPyrs[l] = new cv.Mat();
        cv.pyrDown(imagePyrs[l - 1], imagePyrs[l], new cv.Size(0, 0, 0), cv.BORDER_DEFAULT);
        cv.pyrDown(weightPyrs[l - 1], weightPyrs[l], new cv.Size(0, 0), cv.BORDER_DEFAULT);
    }

    // Laplacian of image
    for (let l = 0; l < maxPyrLevel - 1; l++) {
        let up = new cv.Mat(imagePyrs[l].size(), cv.CV_16S);
        cv.pyrUp(imagePyrs[l + 1], up, imagePyrs[l].size());
        cv.subtract(imagePyrs[l], up, imagePyrs[l]);
    }

    // Visualization
    for (let l = 0; l < maxPyrLevel; l++) {
        let tmp = new cv.Mat();
        cv.normalize(imagePyrs[l], tmp, 0, 1, cv.NORM_MINMAX);
        tmp.convertTo(tmp, cv.CV_8UC4, 255);
        let imagePyrCanvasId = `_image_pyr_${l}_${imageIndex}`;
        cv.imshow(imagePyrCanvasId, tmp);
        tmp.delete();


        let weightPyrCanvasId = `_weight_pyr_${l}_${imageIndex}`;
        cv.imshow(weightPyrCanvasId, weightPyrs[l]);
    }

    for (let l = 0; l < maxPyrLevel; l++) {
        let merged = new cv.Mat(imagePyrs[l].size(), cv.CV_32FC4);
        let width = imagePyrs[l].cols;
        let height = imagePyrs[l].rows;
        let channels = imagePyrs[l].channels();
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                for (let c = 0; c < 3; c++) {
                    merged.floatPtr(y, x)[c]
                        = imagePyrs[l].floatAt(y, x * channels + c) * weightPyrs[l].floatAt(y, x);
                }
                // merged.floatPtr(y, x)[3] = imagePyrs[l].floatAt(y, x * channels + 3);
                merged.floatPtr(y, x)[3] = 255 / 3;
            }   
        }

        if (resultPyrs[l] == undefined) {
            resultPyrs[l] = merged;
        } else {
            cv.add(resultPyrs[l], merged, resultPyrs[l]);
            merged.delete();
        }
    }
}

function finalImage(resultPyrs) {
    function makeAlphaVisible(mat) {
        let width = mat.cols;
        let height = mat.rows;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                mat.floatPtr(y, x)[3] = 255;
            }
        }
    }

    for (let l = maxPyrLevel - 1; l > 0; l--) {
        let up = new cv.Mat();
        cv.pyrUp(resultPyrs[l], up, resultPyrs[l - 1].size());
        cv.add(resultPyrs[l - 1], up, resultPyrs[l - 1]);
        let canvasId = `__pyrup_hdr_${l}`;
        
        let tmp = resultPyrs[l].clone();
        makeAlphaVisible(tmp);
        tmp.convertTo(tmp, cv.CV_8UC4, 1);
        cv.imshow(canvasId, tmp);
        tmp.delete();
    }

    
    // visualization
    let tmp = resultPyrs[0].clone();
    makeAlphaVisible(tmp);
    tmp.convertTo(tmp, cv.CV_8UC4, 1);
    cv.imshow('__pyrup_hdr_0', tmp);
    tmp.delete();
}

function computePyramidalResult(cvImages) {
    mergedMaps = [undefined, undefined, undefined];
    for (let i = 0; i < cvImages.length; i++) {
        mergedMaps[i] = computeMergedMap(cvImages[i]);
    }
    normalizedMaps = normalizeMergedMaps(mergedMaps);
    for (let i = 0; i < cvImages.length; i++) {
        mergedMaps[i].delete();
    }

    // cvImages + normalizedMaps
    let resultPyrs = [];
    for (let l = 0; l < maxPyrLevel; l++) {
        resultPyrs.push(undefined);
    }

    let imageCount = cvImages.length;
    for (let i = 0; i < imageCount; i++) {
        singleImageProcess(cvImages[i], normalizedMaps[i], resultPyrs, i);
    }

    // Visualization
    for (let l = 0; l < maxPyrLevel; l++) {
        let tmp = new cv.Mat();
        cv.normalize(resultPyrs[l], tmp, 0, 1, cv.NORM_MINMAX);
        tmp.convertTo(tmp, cv.CV_8UC4, 255);
        let imagePyrCanvasId = `_fused_pyr_${l}`;
        cv.imshow(imagePyrCanvasId, tmp);
        tmp.delete();
    }

    finalImage(resultPyrs);

    // Clan up
    for (let i = 0; i < imageCount; i++) {
        normalizedMaps[i].delete();
    }
    for (let l = 0; l < maxPyrLevel; l++) {
        resultPyrs[l].delete();
    }
}

function computePyramidalResultUi(cvImages) {
    let width = cvImages[0].cols;
    let height = cvImages[0].rows;
    let loggingElement;

    function renderUi() {
        loggingElement = document.createElement('div');
        pyrMmergeCanvas.innerHTML = '';
        pyrMmergeCanvas.appendChild(loggingElement);
        loggingElement.innerHTML = "Computing weights...";

        let canvas = document.createElement('div');
        pyrMmergeCanvas.appendChild(canvas);

        let rowHeaderImageDecomposition = document.createElement('div');
        rowHeaderImageDecomposition.className = 'weight_header';
        rowHeaderImageDecomposition.innerHTML = "Image Decomposition";
        canvas.appendChild(rowHeaderImageDecomposition);

        for (let l = 0; l < maxPyrLevel; l++) {
            let rowDiv = document.createElement('div');
            for (let i = 0; i < cvImages.length; i++) {
                let canvas = document.createElement('canvas');
                canvas.id = `_image_pyr_${l}_${i}`;
                canvas.className = 'weight_canvas';
                canvas.width = width;
                canvas.height = height;
                rowDiv.appendChild(canvas);
            }
            canvas.appendChild(rowDiv);
        }

        let rowHeaderWeightDecomposition = document.createElement("div");
        rowHeaderWeightDecomposition.innerHTML = "Weights Decomposition";
        rowHeaderWeightDecomposition.className = 'weight_header';
        canvas.appendChild(rowHeaderWeightDecomposition);
        for (let l = 0; l < maxPyrLevel; l++) {
            let rowDiv = document.createElement('div');
            for (let i = 0; i < cvImages.length; i++) {
                let canvas = document.createElement('canvas');
                canvas.id = `_weight_pyr_${l}_${i}`;
                canvas.className = 'weight_canvas';
                canvas.width = width;
                canvas.height = height;
                rowDiv.appendChild(canvas);
            }
            canvas.appendChild(rowDiv);
        }

        let finalMergeDecomposition = document.createElement("div");
        finalMergeDecomposition.innerHTML = "Fusion decomposition";
        finalMergeDecomposition.className = 'weight_header';
        canvas.appendChild(finalMergeDecomposition);
        for (let l = 0; l < maxPyrLevel; l++) {
            let rowDiv = document.createElement('div');
            let canvasElement = document.createElement('canvas');
            canvasElement.id = `_fused_pyr_${l}`;
            canvasElement.className = 'weight_canvas';
            canvasElement.width = width;
            canvasElement.height = height;
            rowDiv.appendChild(canvasElement);
            canvas.appendChild(rowDiv);
        }

        let finalHdrImage = document.createElement("div");
        finalHdrImage.innerHTML = "Final pyramid up and HDR Image generation";
        finalHdrImage.className = 'weight_header';
        canvas.appendChild(finalHdrImage);
        for (let l = maxPyrLevel - 1; l >= 0; l--) {
            let rowDiv = document.createElement('div');
            let canvasElement = document.createElement('canvas');
            canvasElement.id = `__pyrup_hdr_${l}`;
            canvasElement.className = 'weight_canvas';
            canvasElement.width = width;
            canvasElement.height = height;
            rowDiv.appendChild(canvasElement);
            canvas.appendChild(rowDiv);
        }

        loggingElement.innerHTML = "";
    }
    renderUi();

    computePyramidalResult(cvImages);
}

function clearCanvas() {
    weightsCanvas.innerHTML = "";
    mnWeightsCanvas.innerHTML = "";
    pyrMmergeCanvas.innerHTML = "";
}

function setupEfCanvas() {
    loadAllImages(function(cvImages) {
        computeWeights(cvImages);
        computeMergedWeights(cvImages);
        computePyramidalResultUi(cvImages);
    });

    let currentSelectedDataset = datasetSelector.value;
    datasetSelector.addEventListener('change', function() {
        let selectedDataset = datasetSelector.value;
        if (selectedDataset == currentSelectedDataset) {
            return;
        }

        clearCanvas();
        for (let i = 1; i <= 3; i++) {
            document.getElementById(`input_${i}`).src
                = `/assets/research/exposure_fusion/${selectedDataset}/${i}.jpg`;
        }

        loadAllImages(function(cvImages) {
            computeWeights(cvImages);
            computeMergedWeights(cvImages);
            computePyramidalResultUi(cvImages);
        });

        currentSelectedDataset = selectedDataset;
    });
}