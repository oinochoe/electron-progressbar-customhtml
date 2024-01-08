const ProgressBar = require('electron-progressbar');
class ProgressBarCustom extends ProgressBar {
    constructor(options, electronApp) {
        super(options, electronApp);
        this._defaultOptions.html = '';
    }
    _createWindow() {
        super._createWindow();
        const langAttribute = this._options.lang
            ? (lang = '${this._options.lang}')
            : 'lang="en-us"';
        if (this._options.html) {
            this._window.loadURL(
                'data:text/html;charset=UTF8,' +
                    encodeURIComponent(
                        this._options.html.replace('{{REPLACE:LANG}}', langAttribute),
                    ),
            );
        }
    }
}
module.exports = ProgressBarCustom;
