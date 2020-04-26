//#region global methods 
const _getValueInKb = (memoryString) => {
    let result = 0;
    if (memoryString.indexOf("GB") != -1) {
        result = parseInt(
            memoryString.substring(0, memoryString.length - 2));
        result *= 1024 * 1024;
    } else if (memoryString.indexOf("MB") != -1) {
        result = parseInt(
            memoryString.substring(0, memoryString.length - 2));
        result *= 1024;
    } else if (memoryString.indexOf("KB") != -1) {
        result = parseInt(
            memoryString.substring(0, memoryString.length - 2));
    } else if (memoryString.indexOf("B") != -1) {
        result = parseInt(memoryString.substring(0, memoryString.length - 1));
        result = parseFloat(result / 1024);
    } else {
        console.error(
            `_getValueInKb: Unknown memoryString = ${memoryString}`)
    }
    
    return result;
}

const _getTimeInMicroSec = timeString => {
    if (timeString.indexOf("ms") != -1) {
        return 1000 * parseFloat(
            timeString.substring(0, timeString.length - 2))
    }

    if (timeString.indexOf("us") != -1) {
        return parseFloat(
            timeString.substring(0, timeString.length - 2))
    }

    if (timeString.indexOf("s") != -1) {
        return 1000 * 1000 * parseFloat(
            timeString.substring(0, timeString.length - 1))
    }

    console.error(`_getTimeInMicroSec: Unknown timeString = ${timeString}`)
    return 0;
}
//#endregion

//#region data classes
class FreedObject {
    constructor(countFreed, sizeFreed) {
        this.count = parseInt(countFreed);
        this.sizeKb = _getValueInKb(sizeFreed);
    }
}

class FreeHeap {
    constructor(freePercentage, availableMemory, totalMemory) {
        this.freePercentage = parseFloat(
            freePercentage.substring(0, freePercentage.length - 1));
        this.availableMemory = _getValueInKb(availableMemory);
        this.totalMemory = _getValueInKb(totalMemory);    
    }
}

class Gclog {
    constructor(match) {
        if (match.length != 15) {
            console.error(match);
            throw "match with length != 15";
        }
        this.time = new Date(match[1]);
        this.process = match[4];
        this.type = match[5];
        this.objectFreed = new FreedObject(match[6], match[7]);
        this.largeObjectFreed = new FreedObject(match[8], match[9]);
        this.freeHeap = new FreeHeap(match[10], match[11], match[12]);
        this.pauseDuration = _getTimeInMicroSec(match[13])
        this.totalDuration = _getTimeInMicroSec(match[14])
    }
}
//#endregion

class Gcviz {
    static DEFAULT_CHART_WIDTH = 500;
    static DEFAULT_CHART_HEIGHT = 500;

    constructor(container, logger) {
        container.innerHTML = "";

        this._container = container;
        this._logger = logger;
        this._logsParsed = 0;
        this._gcLogsFound = 0;
        this._createLogsParsedContainer();
        this._createPauseDurationChart();
    }

    render() {
        this._logsParsedContainer.style.display = "block";
        this._pauseDurationContainer.style.display = "inline-block";
        this._pauseDurationChart.render();
    }

    onNewLog(logLines) {
        const regex = /(\d{2}-\d{2}\s\d{2}\:\d{2}\:\d{2}\.\d{3})\s*(\d*)\s*(\d*)\s[ID]\s([a-zA-Z0-9._]*)\:\s(.*)\sGC freed\s(\d*)\(([0-9KBM]*)\)\sAllocSpace\sobjects,\s(\d*)\(([0-9KBM]*)\)\sLOS\sobjects,\s([\d\%]*)\sfree,\s([\dKBM]*)\/([\dKBM]*),\spaused\s([\d\.msu]*)\stotal\s([\d\.msu]*)/gm;

        if (!logLines) {
            return;
        }

        const $this = this;
        logLines.split("\n").forEach(logLine => {
            // this._logger.log(`newlog: ${logLine}`);
            $this._logsParsed++;
            $this._logsParsedContainer.innerHTML
                = `Parsed ${$this._logsParsed} logs, found ${$this._gcLogsFound} GC logs`;
            const match = regex.exec(logLine);
            if (match == null) {
                return;
            }

            $this._gcLogsFound++;
            $this._onValidGcLog(new Gclog(match));
        });
    }

    _onValidGcLog(gclog) {
        try {
            console.log(gclog);
            this._pauseDurationData.push(gclog.pauseDuration);
            this._pauseDurationChart.updateSeries([{
                data:this._pauseDurationData }]);
        } catch (exception) {
            console.error(exception);
        }
    }

    _createLogsParsedContainer() {
        const div = document.createElement("div");
        div.id = "_logs_parsed";
        div.style.display = "none";
        this._container.appendChild(div);
        this._logsParsedContainer = div;
    }

    _createPauseDurationChart() {
        this._pauseDurationData = [];
        this._pauseDurationContainer = this._createChartContainer("pauseDuration");
        const options = {
            series: [{
            data: this._pauseDurationData
          }],
            chart: {
            id: 'realtime',
            height: Gcviz.DEFAULT_CHART_HEIGHT,
            type: 'line',
            animations: {
              enabled: true,
              easing: 'linear',
              dynamicAnimation: {
                speed: 1000
              }
            },
            toolbar: {
              show: false
            },
            zoom: {
              enabled: false
            }
          },
          dataLabels: {
            enabled: false
          },
          stroke: {
            curve: 'smooth'
          },
          title: {
            text: 'Pause Duration',
            align: 'left'
          },
          markers: {
            size: 0
          },
        //   xaxis: {
        //     type: 'datetime',
        //   },
        //   yaxis: {
        //   },
          legend: {
            show: false
          },
        };
        this._pauseDurationChart
         = new ApexCharts(this._pauseDurationContainer, options);
    }

    _createChartContainer(id, width, height) {
        if (!width) width = Gcviz.DEFAULT_CHART_WIDTH;
        if (!height) height = Gcviz.DEFAULT_CHART_HEIGHT;

        const div = document.createElement("div");
        div.id = id;
        div.style.height = `${height}px`;
        div.style.width = `${width}px`;
        div.style.display = "none";

        this._container.appendChild(div);
        return div;
    }
}