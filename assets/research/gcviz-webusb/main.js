class AdbLogcat {
    constructor() {
        if (!Adb) {
            throw "Adb is not defined or included";
        }
        this._webusb = undefined;
        this._adb = undefined;
        this._shouldRead = false;
    }

    connect(onConnect) {
        if (this._webusb) {
            throw "Already connected, disconnect first";
        }

        return new Promise((resolve, reject) => {
            try {
                const $this = this;
                Adb.open("WebUSB").then(webusb => {
                    if (!webusb.isAdb()) {
                        reject("Could not open Adb.");
                        return;
                    }

                    webusb.connectAdb("host::", () => {
                        onConnect();
                    })
                    .then(adb => {
                        $this._webusb = webusb;
                        $this._adb = adb;
                        $this._shouldRead = true;
                        resolve(webusb.device);
                    })
                    .catch(error => {
                        $this._webusb = undefined;
                        $this._adb = undefined;
                        reject(error);
                    });
                })
                .catch(error => {
                    console.log(error);
                    $this._webusb = undefined;
                    reject("Could not open Adb.");
                })
            } catch (exception) {
                this._webusb = undefined;
                this._adb = undefined;
                reject(exception);
            }
        });
    }

    disconnect() {
        if (!this._webusb) {
            throw "Not yet connected, connect first";
        }

        this._webusb.close();
        this._shouldRead = false;
        this._webusb = undefined;
        this._adb = undefined;
    }

    isConnected() {
        return this._webusb !== undefined;
    }

    async startLogcat(onLogCallback) {
        if (!(this._webusb && this._adb)) {
            throw "Not yet connected, connect first";
        }

        const decoder = new TextDecoder();
        const adb = this._adb;
        const shell = await adb.open('shell:logcat');
        let result = await shell.receive();
        while (result.cmd == "WRTE") {
            if (!this._shouldRead) {
                shell.send("OKAY");
                break;
            }

            if (result.data != null) {
                onLogCallback(decoder.decode(result.data));
            }
    
            shell.send("OKAY");
            result = await shell.receive();
        }
    
        shell.close();
        shell = null;
    }
}

class Logger {
    constructor(logContainer) {
        this._logContainer = logContainer;
        this._logtail = 0;
        this._logfront = 0;
    }

    log(message) {
        const logElem = document.createElement("div");
        logElem.innerHTML = `$ ${message}`;
        this._logfront++;
        while(this._logfront - this._logtail > 10) {
            this._logContainer.removeChild(this._logContainer.childNodes[0]);
            this._logtail++;
        }
        
        this._logContainer.appendChild(logElem);
    }
}

function onStart() {
    const selectDevice = document.getElementById('selectDevice');
    const disconnectDevice = document.getElementById('disconnectDevice');
    const logContainer = document.getElementById('logContainer');
    const guideContainer = document.getElementById('guideContainer');
    const connectedTo = document.getElementById('connectedTo');
    const gcvizContainer = document.getElementById('gcvizContainer');

    const logger = new Logger(logContainer);
    const adbLogcat = new AdbLogcat();
    const gcviz = new Gcviz(gcvizContainer, logger);

    const connectToDevice = () => {
        adbLogcat.connect(() => {
            const text = document.createElement("div");
            text.innerHTML = "Please check the screen of your device";

            const image = new Image;
            image.onload = () => {
                image.width = 300;
                guideContainer.innerHTML = "";
                guideContainer.appendChild(image);
                guideContainer.appendChild(text);
            }
            image.src = "/assets/research/gcviz-webusb/screen.jpg"  
            logger.log("Please check the screen of your device");
        })
        .then(device => {
            guideContainer.innerHTML = "";
            connectedTo.innerHTML = `Connected to <code>${device.serialNumber}</code>`;
            selectDevice.disabled = true;
            disconnectDevice.disabled = false;
            gcviz.render();
            adbLogcat.startLogcat(logs => gcviz.onNewLog(logs));
        })
        .catch(error => {
            console.log(error);
            guideContainer.innerHTML = "";
            logger.log(`Failure: Unable to connect ${error}`);
        });
    }

    const disconnectFromDevice = () => {
        adbLogcat.disconnect();
        disconnectDevice.disabled = true;
        selectDevice.disabled = false;
        connectedTo.innerHTML = "";
        logger.log("Disconected from adb device.")
    }

    if (!(navigator.usb && navigator.usb.requestDevice)) {
        selectDevice.disabled = true;
        logger.log("WebUSB not supported in this browser - try Google Chrome.");
    } else {
        selectDevice.addEventListener('click', connectToDevice);
        disconnectDevice.addEventListener('click', disconnectFromDevice);
    }

    window.onbeforeunload = function() {
        if (adbLogcat.isConnected()) {
            adbLogcat.disconnect();
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => onStart());