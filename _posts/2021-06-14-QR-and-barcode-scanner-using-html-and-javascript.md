---
layout: post
title: QR and barcode scanner using HTML and Javascript
categories: [html, javascript, typescript, qr-code, camera, barcode]
description: "The <a href='https://github.com/mebjas/html5-qrcode'>little QR code scanning library</a> I have been maintaining since 2015 has been getting more attention recently. And with power came responsibilities, bugs, and feature requests. Some of the key features requested by developers were more reliable scanning and the ability to scan different types of bar codes. With <code>version 2.0.0</code> onwards developers can scan different types of 1D codes (bar codes) and 2D codes (like QR codes or AZTEC).<br><br> This article lists out everything new in `version 2.x.x`. I'll also list out the new APIs and capabilities that developers can use to
integrate a more powerful code scanning capability to their web pages or apps."
post-no: 24
toc: true
image: '../images/post24_image1.jpeg'
---

The [little QR code scanning library](https://github.com/mebjas/html5-qrcode) I have been maintaining since 2015 has been getting more attention recently. And with power came responsibilities, bugs, and feature requests. Some of the key features requested by developers were more reliable scanning and the ability to scan different types of bar codes. With `version 2.0.0` onwards developers can scan different types of 1D codes (bar codes) and 2D codes (like QR codes or AZTEC).

This article lists out everything new in `version 2.x.x`. I'll also list out the new APIs and capabilities that developers can use to
integrate a more powerful code scanning capability to their web pages or apps.

Here's the library I am taking about: [mebjas/html5-qrcode](https://github.com/mebjas/html5-qrcode), checkout demo at [qrcode.minhazav.dev](https://qrcode.minhazav.dev)

<a class="github-button" href="https://github.com/mebjas/html5-qrcode" data-color-scheme="no-preference: light; light: light; dark: light;" data-size="large" data-show-count="true" aria-label="Star mebjas/html5-qrcode on GitHub">Star</a>
<a class="github-button" href="https://github.com/mebjas/html5-qrcode/fork" data-color-scheme="no-preference: light; light: light; dark: light;" data-size="large" data-show-count="true" aria-label="Fork mebjas/html5-qrcode on GitHub">Fork</a>
<a class="github-button" href="https://github.com/mebjas/html5-qrcode/issues" data-color-scheme="no-preference: light; light: light; dark: light;" data-size="large" data-show-count="true" aria-label="Issue mebjas/html5-qrcode on GitHub">Issue</a>
<a class="github-button" href="https://github.com/mebjas/html5-qrcode/discussions" data-color-scheme="no-preference: light; light: light; dark: light;" data-size="large" aria-label="Discuss mebjas/html5-qrcode on GitHub">Discuss</a>

## What's new in `version 2.x.x`
Latest: [![GitHub tag (latest by date)](https://img.shields.io/github/v/tag/mebjas/html5-qrcode)](https://github.com/mebjas/html5-qrcode/releases) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/51e4f0ef8b0b42e1b93ce29875dd23a0)](https://www.codacy.com/gh/mebjas/html5-qrcode/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=mebjas/html5-qrcode&amp;utm_campaign=Badge_Grade) [![Build Status](https://travis-ci.org/mebjas/html5-qrcode.svg?branch=master)](https://travis-ci.org/mebjas/html5-qrcode)

1.   Ability to scan different kinds of 1D codes and 2D codes.
     -  See all supported formats [here](#all-supported-formats).
     -  Scanned format type and the name returned in the success callback.

2.   More reliable code scanning, fixing issues like [issue#134](https://github.com/mebjas/html5-qrcode/issues/134), [issue#63](https://github.com/mebjas/html5-qrcode/issues/63), [issue#140](https://github.com/mebjas/html5-qrcode/issues/140).
     - Both (1) & (2) were achieved by migrating the decoding library from `Lazarsoft's library` to [Zxing-js](https://github.com/zxing-js/library).


3.  [Minor] Library now reports more granular errors to reduce debugging time for developers.
     - For example, if the library is used in `http` url, the exact issue will be reported.

**Code health fixes**
1.   Entire code **migrated to Typescript** for scalable & less error-prone development.

2.   Several code health issues fixed based on Codacy report and now we have **[grade A on Codacy](https://app.codacy.com/gh/mebjas/html5-qrcode/dashboard?utm_source=github.com&utm_medium=referral&utm_content=mebjas/html5-qrcode&utm_campaign=Badge_Grade)** - <a href="https://www.codacy.com/gh/mebjas/html5-qrcode/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=mebjas/html5-qrcode&amp;utm_campaign=Badge_Grade"><img src="https://app.codacy.com/project/badge/Grade/51e4f0ef8b0b42e1b93ce29875dd23a0"/></a>, [tracking issue for this refactor](https://github.com/mebjas/html5-qrcode/issues/225)

Check out [changelog since Version 2.0.0](https://github.com/mebjas/html5-qrcode/blob/master/changelog.md#version-200) for more clarity.

## Using the library
The library exposes two main classes:
 - `Html5QrcodeScanner` - Use this to setup end to end scanner with UI, built on top of `Html5Qrcode`.
    - Takes care of building full user interface
    - Supports scanning using web cam or camera on the device with real time camera feeds.
    - Support scannign local images on the device.
 - `Html5Qrcode` - lower level library, exposes APIs to build your own code scanner.

## Integrating code scanner using `Html5QrcodeScanner`
Follow the steps below to integrate QR code or barcode scanning capabilities to your web application:

### Install the library
You could install the library using `npm` or load it directly using some CDNS like [unpkg](https://unpkg.com/browse/html5-qrcode@2.0.9/)

#### Install using [npm](https://www.npmjs.com/package/html5-qrcode)
```sh
npm install --save-dev html5-qrcode
```

#### Load latest library from unpkg or other CDNs
```html
<!-- include the library -->
<script src="https://unpkg.com/html5-qrcode@2.0.9/dist/html5-qrcode.min.js"></script>
```

### Add placeholder HTML element
Add a placeholder HTML element to your web page. The scanning UI would be rendered in this element. Give it appropriate styling like `width` or `height`.

```html
<div id="qr-reader" style="width: 600px"></div>
```

### Initialize in javascript
Now you can setup the scanner with these `4 lines of code`.

```js
function onScanSuccess(decodedText, decodedResult) {
    console.log(`Code scanned = ${decodedText}`, decodedResult);
}
var html5QrcodeScanner = new Html5QrcodeScanner(
	"qr-reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess);
```

### Demo
<div id="qr-reader" style="width:600px; margin: auto"></div>

### Notes:
- You can customise the scanner by passing a different config object - [read more](https://github.com/mebjas/html5-qrcode#extra-optional-configuration-in-start-method).
- The success callback has following interface ([/src/core.ts](https://github.com/mebjas/html5-qrcode/blob/master/src/core.ts#L225))

```ts
/** Format of detected code. */
interface QrcodeResultFormat {
    format: Html5QrcodeSupportedFormats;
    formatName: string;
}

/** Detailed scan result. */
interface QrcodeResult {
    text: string;
    format: QrcodeResultFormat,
}

/** QrCode result object. */
interface Html5QrcodeResult {
    decodedText: string;
    result: QrcodeResult;
}

type QrcodeSuccessCallback
    = (decodedText: string, result: Html5QrcodeResult) => void;
```

## `Html5Qrcode` interface
If you want to build your user interface, you can make use of the public APIs exposed by [Html5Qrcode](https://github.com/mebjas/html5-qrcode/blob/master/src/html5-qrcode.ts) class:

```ts
class Html5Qrcode {
    constructor(elementId: string, config: Html5QrcodeFullConfig) {}

    /** Start scanning. */
    start(cameraIdOrConfig: Html5QrcodeIdentifier,
        configuration: Html5QrcodeCameraScanConfig | undefined,
        qrCodeSuccessCallback: QrcodeSuccessCallback | undefined,
        qrCodeErrorCallback: QrcodeErrorCallback | undefined,
    ): Promise<null> {}

    /** Stop scanning. */
    stop(): Promise<void> {}

    /** Clear the rendered surface. */
    clear(): void {}

    /** Scan a file. */
    scanFile(
        imageFile: File,
        showImage?: boolean): Promise<string> {}

    /** Returns list of cameras in the device, invokes permission request. */
    static getCameras(): Promise<Array<CameraDevice>> {}
}
```

## All supported formats
These are the different code formats now supported by the library, with examples:

{:class="styled-table"}
| Code | Example |
| ---- | ----- |
| QR Code | <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/qr-code.png" width="200px"> |
| AZTEC | <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/aztec.png" > |
| CODE_39|  <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/code_39.gif" > |
| CODE_93| <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/code_93.gif" >|
| CODE_128| <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/code_128.gif" >|
| MAXICODE| <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/maxicode.gif" > |
| ITF| <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/itf.png" >|
| EAN_13|<img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/ean13.jpeg" > |
| EAN_8| <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/ean8.jpeg" >|
| PDF_417| <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/pdf417.png" >|
| RSS_14| <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/rss14.gif" >|
| RSS_EXPANDED|<img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/rssexpanded.gif" > |
| UPC_A| <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/upca.jpeg" >|
| UPC_E| <img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/upce.jpeg" >|
| DATA_MATRIX|<img src="https://raw.githubusercontent.com/mebjas/html5-qrcode/master/assets/datamatrix.png" > |

## Future plans
 - **Major UI overhaul** - [issue#207](https://github.com/mebjas/html5-qrcode/issues/207)
 - Remembering last used camera - [issue#85](https://github.com/mebjas/html5-qrcode/issues/85), [discussion#213](https://github.com/mebjas/html5-qrcode/discussions/213)
 - Support setting default facing mode in `Html5QrcodeScanner` - [issue#65](https://github.com/mebjas/html5-qrcode/issues/65)
 - Fix most of open issues at - [mebjas/html5-qrcode/issues](https://github.com/mebjas/html5-qrcode/issues)

## How to contribute
If you are excited or interested you can contribute to this project by:

 - If you find compatibility issues with certain browser, [create an issue here](https://github.com/mebjas/html5-qrcode/issues/new?assignees=&labels=compatibility&template=compatibility-issue.md&title=Compatibility+-+%5BOS%5D+%5BBrowser%5D+-+%5BWhat+is+not+working%5D).
 - Raising issues for bugs faced, at [Github issue page for the project](https://github.com/mebjas/html5-qrcode/issues). Feel free to add some related interesting discussions which could be taken up as work-item.
 - Sending a Pull Request for bugs fixed by you.
 - Rating the project with stars and shares.

<!-- Script area -->
<script async defer src="https://buttons.github.io/buttons.js"></script>
<script src="https://unpkg.com/html5-qrcode@2.0.9/dist/html5-qrcode.min.js"></script>
<script>
var html5QrcodeScanner = new Html5QrcodeScanner(
	"qr-reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render()
</script>
<!-- Script area ends -->
