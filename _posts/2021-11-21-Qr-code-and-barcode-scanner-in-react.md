---
layout: post
title: QR and barcode scanner in React
categories: [html, javascript, react, qrcode, barcode, qrcode-scanner, barcode-scanner]
description: "<a href='https://github.com/mebjas/html5-qrcode'>mebjas/html5-qrcode</a> is a fairly used open source library for implementing QR Code or barcode scanner in a web application. There are several developers who have been using it under webview for android projects as well. In this article I'll be explaining how to use html5-qrcode with React so it's easier for developers using popular React framework to these functionalities with ease."
post-no: 33
toc: true
image: '../images/post33_image1.png'
---

<a href='https://github.com/mebjas/html5-qrcode'>mebjas/html5-qrcode</a> is a fairly used open source library for implementing QR Code or barcode scanner in a web application. There are several developers who have been using it under web-view for android projects as well. In this article I'll be explaining how to use html5-qrcode with React so it's easier for developers using popular React framework to these functionalities with ease.

## Introduction

I don't think [ReactJs](https://reactjs.org/) needs any explanation here and throughout this article I'll assume the readers have familiarity with `React`, `Components`, `state`, `props` etc.

If you are just interested in implementing QR code or barcode scanning on web without react, I recommend you read this article

<div class="post-info" style="border: 1px solid #cfcfcf73; padding: 10px; margin: 10px;">
    <h3 class="post-header"><a class="post-link" href="https://blog.minhazav.dev/QR-and-barcode-scanner-using-html-and-javascript/">QR and barcode scanner using HTML and JavaScript</a></h3>
     <span class="post-description">
       <img src="/images/post24_image1.jpeg" style="max-width: 10%; float: left; margin: 0px 15px 10px 0px;" alt="different 1D and 2D codes">
       This article is a guide on integrating QR code or barcode scanner on any web applications with a couple of lines of code with ease using <a href="https://github.com/mebjas/html5-qrcode">mebjas/html5-qrcode</a>.
     </span>
     <br>
     <span class="read-more"><a href="https://blog.minhazav.dev/QR-and-barcode-scanner-using-html-and-javascript/">[&nbsp;Read&nbsp;more&nbsp;]</a></span>
</div>

<div id="scanapp_ad" style="margin: 10px">
    <div class="alert alert-success" style="display: flex;">
        <div style="max-width: 100px; display: inline-block;">
            <a href="https://scanapp.org"><img src="/assets/img/scanapp-logo-removebg-preview.png" style="width: 100px;"></a>
        </div>
        <div style="display: inline-block; margin-left: 10px">
            <strong>ScanApp - Free QR code and barcode scanner for web</strong>
            <br>
            <a href="https://scanapp.org">scanapp.org</a> is a free online QR code and barcode reader for web built using this library - <a href="https://scanapp.org">try it out</a>.
            <br>
        </div>
    </div>
</div>

## Install the library using npm
First, install the latest version of the library in your React project, using `npm`

```
npm i html5-qrcode
```

## Create a React component

Next step is to create a React that abstracts most of the scanner implementation.
Let say we create a new file called `Html5QrcodePlugin.jsx`

```js

// Html5QrcodePlugin.jsx

import { Html5QrcodeScanner } from "html5-qrcode";
import React from 'react';

const qrcodeRegionId = "html5qr-code-full-region";

class Html5QrcodePlugin extends React.Component {
    render() {
        return <div id={qrcodeRegionId} />;
    }

    componentWillUnmount() {
        // TODO(mebjas): See if there is a better way to handle
        //  promise in `componentWillUnmount`.
        this.html5QrcodeScanner.clear().catch(error => {
            console.error("Failed to clear html5QrcodeScanner. ", error);
        });
    }

    componentDidMount() {
        // Creates the configuration object for Html5QrcodeScanner.
        function createConfig(props) {
            var config = {};
            if (props.fps) {
            config.fps = props.fps;
            }
            if (props.qrbox) {
            config.qrbox = props.qrbox;
            }
            if (props.aspectRatio) {
            config.aspectRatio = props.aspectRatio;
            }
            if (props.disableFlip !== undefined) {
            config.disableFlip = props.disableFlip;
            }
            return config;
        }

        var config = createConfig(this.props);
        var verbose = this.props.verbose === true;

        // Suceess callback is required.
        if (!(this.props.qrCodeSuccessCallback )) {
            throw "qrCodeSuccessCallback is required callback.";
        }

        this.html5QrcodeScanner = new Html5QrcodeScanner(
            qrcodeRegionId, config, verbose);
        this.html5QrcodeScanner.render(
            this.props.qrCodeSuccessCallback,
            this.props.qrCodeErrorCallback);
    }
};

export default Html5QrcodePlugin;
```

> **Important note:** html5-qrcode is an actively developed library. It's advisable to subscribe to updates at [mebjas/html5-qrcode](https://github.com/mebjas/html5-qrcode) so you can keep the React library up to date.


## Use this plugin in your React App
I'll assume you have an `App.js` that is the source component. You can add the new `Component` we just created.

```js
class App extends React.Component {
    constructor(props) {
        super(props);

        // This binding is necessary to make `this` work in the callback.
        this.onNewScanResult = this.onNewScanResult.bind(this);
    }

    render() {
        return (<div>
            <h1>Html5Qrcode React example!</h1>
            <Html5QrcodePlugin 
                fps={10}
                qrbox={250}
                disableFlip={false}
                qrCodeSuccessCallback={this.onNewScanResult}/>
        </div>);
    }

    onNewScanResult(decodedText, decodedResult) {
        // Handle the result here.
    }
);
```

## Passing around the callback
You might have seen the callback defined in the above section

```js
// ... rest of the code 

    onNewScanResult(decodedText, decodedResult) {
        // Handle the result here.
    }

// ... rest of the code 
```

Use this callback to define rest of your business logic. Let say your use-case is to pass the newly scanned result and print in on a `<table>`, you'd want to pass around the data to a different component. You can find an example of this at [scanapp-org/html5-qrcode-react](https://github.com/scanapp-org/html5-qrcode-react/blob/main/src/ResultContainerPlugin.jsx).

## Full code reference
The full example has been created at [scanapp-org/html5-qrcode-react](https://github.com/scanapp-org/html5-qrcode-react) - you can use that as a good reference.

## Credits
<div id="scanapp_ad" style="margin: 10px">
    <div class="alert alert-success" style="display: flex;">
        <div style="max-width: 100px; display: inline-block;">
            <a href="https://scanapp.org"><img src="/assets/img/scanapp-logo-removebg-preview.png" style="width: 100px;"></a>
        </div>
        <div style="display: inline-block; margin-left: 10px">
            <strong>ScanApp - Free QR code and barcode scanner for web</strong>
            <br>
            <a href="https://scanapp.org">scanapp.org</a> is a free online QR code and barcode reader for web built using this library - <a href="https://scanapp.org">try it out</a>.
            <br>
        </div>
    </div>
</div>

## Closing note
I have to admit, I am not React savvy, if you see errors or know of better way to do things please suggest it using the comments or send a pull request to scanapp-org/html5-qrcode-react](https://github.com/scanapp-org/html5-qrcode-react).