const ProgressBar = require('electron-progressbar');

class ProgressBarCustom extends ProgressBar {
    constructor(options, electronApp) {
        this._defaultOptions = {
            abortOnError: false,
            debug: false,

            indeterminate: true,
            initialValue: 0,
            maxValue: 100,
            closeOnComplete: true,
            title: 'Wait...',
            text: 'Wait...',
            detail: null,
            lang: '',
            html: '',

            style: {
                text: {},
                detail: {},
                bar: {
                    width: '100%',
                    background: '#BBE0F1',
                },
                value: {
                    background: '#0976A9',
                },
            },

            browserWindow: {
                parent: null,
                modal: true,
                resizable: false,
                closable: false,
                minimizable: false,
                maximizable: false,
                width: 500,
                height: 170,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                },
            },

            remoteWindow: null,
        };

        this._styleSelector = {
            determinate: {
                text: '#text',
                detail: '#detail',
                bar: '#progressBar::-webkit-progress-bar',
                value: '#progressBar::-webkit-progress-value',
            },
            indeterminate: {
                text: '#text',
                detail: '#detail',
                bar: '#progressBar[indeterminate="t"]',
                value: '#progressBar[indeterminate="t"] #progressBarValue',
            },
        };

        this._callbacks = {
            ready: [], // list of function(){}
            progress: [], // list of function(value){}
            completed: [], // list of function(value){}
            aborted: [], // list of function(value){}
        };

        this._inProgress = true;
        this._options = this._parseOptions(options);
        this._realValue = this._options.initialValue;
        this._window = null;

        if (electronApp) {
            if (electronApp.isReady()) {
                this._createWindow();
            } else {
                electronApp.on('ready', () => this._createWindow.call(this));
            }
        } else {
            this._createWindow();
        }
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

        const langAttribute = this._options.lang ? `lang="${this._options.lang}"` : `lang="en-us"`;
        const $html = this._options.html ?? htmlContent;
        this._window.loadURL(
            'data:text/html;charset=UTF8,' +
                encodeURIComponent($html.replace('{{REPLACE:LANG}}', langAttribute)),
        );

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

module.exports = ProgressBarCustom;
