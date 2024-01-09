'use strict';

const BrowserWindow = require('electron').BrowserWindow;
const ProgressBar = require('electron-progressbar');
class ProgressBarCustom extends ProgressBar {
    constructor(options, electronApp) {
        super(options, electronApp);
        this._defaultOptions.html = '';
    }
    _createWindow() {
        if (this._options.remoteWindow) {
            this._window = new this._options.remoteWindow(this._options.browserWindow);
        } else {
            this._window = new BrowserWindow(this._options.browserWindow);
        }

        this._window.setMenu(null);

        if (this._options.debug) {
            this._window.webContents.openDevTools({ mode: 'detach' });
        }

        this._window.on('closed', () => {
            this._inProgress = false;

            if (this._realValue < this._options.maxValue) {
                this._fire('aborted', [this._realValue]);
            }

            this._updateTaskbarProgress();

            this._window = null;
        });

        const langAttribute = this._options.lang ? `lang="${this._options.lang}"` : '';

        if (this._options.html) {
            this._window.loadURL(
                'data:text/html;charset=UTF8,' +
                    encodeURIComponent(
                        this._options.html.replace('{{REPLACE:LANG}}', langAttribute),
                    ),
            );
        } else {
            this._window.loadURL(
                'data:text/html;charset=UTF8,' +
                    encodeURIComponent(htmlContent.replace('{{REPLACE:LANG}}', langAttribute)),
            );
        }

        this._window.webContents.on('did-finish-load', () => {
            if (this._options.text !== null) {
                this.text = this._options.text;
            }

            if (this._options.detail !== null) {
                this.detail = this._options.detail;
            }

            this._window.webContents.insertCSS(this._parseStyle());

            if (this._options.maxValue !== null) {
                this._window.webContents.send('CREATE_PROGRESS_BAR', {
                    indeterminate: this._options.indeterminate,
                    maxValue: this._options.maxValue,
                });
            }

            this._fire('ready');
        });

        this._updateTaskbarProgress();
    }
}

const htmlContent = `
<!DOCTYPE html>
<html {{REPLACE:LANG}}>
	<head>
		<meta charset="UTF-8">
		<style>
			*{
				margin: 0;
				padding: 0;
				box-sizing: border-box;
			}

			body{
				margin: 20px;
				margin-bottom: 0;
				font: 13px normal Verdana, Arial, "sans-serif";
			}

			#text{
				height: 26px;
				overflow: auto;
				font-size: 14px;
				font-weight: bold;
				padding: 5px 0;
				word-break: break-all;
			}

			#detail{
				height: 40px;
				margin: 5px 0;
				padding: 5px 0;
				word-break: break-all;
			}

			#progressBarContainer{
				text-align: center;
			}

			progress{
				-webkit-appearance: none;
				appearance: none;
				width: 100%;
				height: 25px;
			}

			progress::-webkit-progress-bar{
				width: 100%;
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25) inset;
				border-radius: 2px;
				background: #DEDEDE;
			}

			progress::-webkit-progress-value{
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25) inset;
				border-radius: 2px;
				background: #22328C;
			}

			#progressBar[indeterminate="t"]{
				overflow: hidden;
				position: relative;
				display: block;
				margin: 0.5rem 0 1rem 0;
				width: 100%;
				height: 10px;
				border-radius: 2px;
				background-color: #DEDEDE;
				background-clip: padding-box;
			}

			#progressBar[indeterminate="t"] #progressBarValue::before{
				content: "";
				position: absolute;
				top: 0;
				bottom: 0;
				left: 0;
				will-change: left, right;
				background: inherit;
			}

			#progressBar[indeterminate="t"] #progressBarValue::before{
				-webkit-animation: indeterminate 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
				animation: indeterminate 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
			}

			#progressBar[indeterminate="t"] #progressBarValue::after{
				content: "";
				position: absolute;
				top: 0;
				bottom: 0;
				left: 0;
				will-change: left, right;
				background: inherit;
			}

			#progressBar[indeterminate="t"] #progressBarValue::after{
				-webkit-animation: indeterminate-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
				animation: indeterminate-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
				-webkit-animation-delay: 1.15s;
				animation-delay: 1.15s;
			}

			#progressBar[indeterminate="t"].completed #progressBarValue::before,
			#progressBar[indeterminate="t"].completed #progressBarValue::after{
				display: none;
			}

			.completed#progressBar[indeterminate="t"],
			.completed#progressBar[indeterminate="t"] #progressBarValue{
				-webkit-transition: 0.5s;
				transition: 0.5s;
			}

			@-webkit-keyframes indeterminate{
				0%{ left: -35%; right: 100%; }
				60%{ left: 100%; right: -90%; }
				100%{ left: 100%; right: -90%; }
			}

			@keyframes indeterminate{
				0%{ left: -35%; right: 100%; }
				60%{ left: 100%; right: -90%; }
				100%{ left: 100%; right: -90%; }
			}

			@-webkit-keyframes indeterminate-short{
				0%{ left: -200%; right: 100%; }
				60%{ left: 107%; right: -8%; }
				100%{ left: 107%; right: -8%; }
			}

			@keyframes indeterminate-short{
				0%{ left: -200%; right: 100%; }
				60%{ left: 107%; right: -8%; }
				100%{ left: 107%; right: -8%; }
			}
		</style>
	</head>
	<body>
		<div id="text"></div>
		<div id="detail"></div>
		<div id="progressBarContainer"></div>
		<script>
			const { ipcRenderer } = require('electron');
			var currentValue = {
				progress : null,
				text : null,
				detail : null
			};

			var elements = {
				text : document.querySelector("#text"),
				detail : document.querySelector("#detail"),
				progressBarContainer : document.querySelector("#progressBarContainer"),
				progressBar : null // set by createProgressBar()
			};

			function createProgressBar(settings){
				if(settings.indeterminate){
					var progressBar = document.createElement("div");
					progressBar.setAttribute("id", "progressBar");
					progressBar.setAttribute("indeterminate", "t");

					var progressBarValue = document.createElement("div");
					progressBarValue.setAttribute("id", "progressBarValue");
					progressBar.appendChild(progressBarValue);

					elements.progressBar = progressBar;
					elements.progressBarContainer.appendChild(elements.progressBar);
				}else{
					var progressBar = document.createElement("progress");
					progressBar.setAttribute("id", "progressBar");
					progressBar.max = settings.maxValue;

					elements.progressBar = progressBar;
					elements.progressBarContainer.appendChild(elements.progressBar);
				}

				window.requestAnimationFrame(synchronizeUi);
			}

			function synchronizeUi(){
				elements.progressBar.value = currentValue.progress;
				elements.text.innerHTML = currentValue.text;
				elements.detail.innerHTML = currentValue.detail;
				window.requestAnimationFrame(synchronizeUi);
			}

			ipcRenderer.on("CREATE_PROGRESS_BAR", (event, settings) => {
				createProgressBar(settings);
			});

			ipcRenderer.on("SET_PROGRESS", (event, value) => {
				currentValue.progress = value;
			});

			ipcRenderer.on("SET_COMPLETED", (event) => {
				elements.progressBar.classList.add('completed');
			});

			ipcRenderer.on("SET_TEXT", (event, value) => {
				currentValue.text = value;
			});

			ipcRenderer.on("SET_DETAIL", (event, value) => {
				currentValue.detail = value;
			});
		</script>
	</body>
</html>
`;

module.exports = ProgressBarCustom;
