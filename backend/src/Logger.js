const debug = require('debug');

const APP_NAME = 'vmeet';

class Logger
{
	constructor(prefix)
	{
		if (prefix)
		{
			this._log = debug(`${APP_NAME}:${prefix}`);
			this._info = debug(`${APP_NAME}:INFO:${prefix}`);
			this._warn = debug(`${APP_NAME}:WARN:${prefix}`);
			this._error = debug(`${APP_NAME}:ERROR:${prefix}`);
		}
		else
		{
			this._log = debug(APP_NAME);
			this._info = debug(`${APP_NAME}:INFO`);
			this._warn = debug(`${APP_NAME}:WARN`);
			this._error = debug(`${APP_NAME}:ERROR`);
		}

		/* eslint-disable no-console */
		this._log.log = console.info.bind(console);
		this._info.log = console.info.bind(console);
		this._warn.log = console.warn.bind(console);
		this._error.log = console.error.bind(console);
		/* eslint-enable no-console */
	}

	get log()
	{
		return this._log;
	}

	get info()
	{
		return this._info;
	}

	get warn()
	{
		return this._warn;
	}

	get error()
	{
		return this._error;
	}
}

module.exports = Logger;
