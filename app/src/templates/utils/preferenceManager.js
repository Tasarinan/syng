/*
 * File: preferenceManager.js
 * Description: Describes the preference manger to read and write Syng preferences.
 *  An instance of PreferenceManager class is created from a configuration file from
 *  the user data directory for the operating platform. After initialization the
 *  preference values are ready to be read and written. Initialization must occur.
 *  Changes must be saved with the save method in order to persist across sessions.
 *
 * Configuration file entries should conform to the following format. An example of
 *  this format can also be found at app/src/resources/defaults.json, which contains
 *  the default values for Syng.
 *  {
 *     "property": {               // The name of the preference. Must be a String.
 *        "value": "Some value",   // The value of the preference. Can be any type.
 *        "requiresRestart": false // Whether or not Syng needs to restart for this change to take effect. Must be a Boolean.
 *     }
 *  }
 */
import { handleError } from './error.js';
import { underTest } from './process.js';
const fs = window.__TAURI__.fs;

const DEFAULTS_BASE = 'resources/defaults.json';
const DEFAULTS_PATH = underTest ? `../../${DEFAULTS_BASE}` : `./${DEFAULTS_BASE}`;
let DEFAULTS = {}; 
fetch(DEFAULTS_PATH).then(content => DEFAULTS = content.json());

export class PreferenceManager {
	/*
	 * Description: Construct an instance of the preference manager
	 * Param: configurationFile: String: The name of the configuration file to load
	 * Return: PreferenceManager: The PreferenceManager instance
	 */
	constructor(configurationFile) {
		this._file = configurationFile;
		this._config;
		this.initialized = false; 
	}

	/*
	 * Description: Load the configuration file
	 * Return: Promise: Returns a Promise that resolves to undefined when the config file
	 *  finishes loading; rejects if the file doesn't exist or can't be created.
	 */
	init() {
		return new Promise((resolve, reject) => {
			const filePath = this._file;

			// TODO: HACK! This hard coded just to test things out, eventually
			// we'll need to move to using an actual database
			fs.readTextFile(filePath, {
				dir: fs.BaseDirectory.Home
			}).then(content => {
				// The configuration file exists and we should load it
				try {
					this._config = JSON.parse(content);
					this.initialized = true;
					resolve();
				} catch(e) {
					console.error(e);
					reject('There was an error loading user preferences. The file contains invalid JSON. Check the logs for more details.');
				}
			}).catch(e => {
				// The configuration file does not exist
				// so we should load the defaults and
				// save the defaults to a file so the user
				// can save their preferences later.

				// Optimistically use teh defaults for this run
				this._config = DEFAULTS;
				this.initialized = true;

				// Create the configuration file for the subsequent runs
				// TODO: HACK! This hard coded just to test things out, eventually
				// we'll need to move to using an actual database
				if(!underTest) {
					fs.writeTextFile(filePath, JSON.stringify(DEFAULTS), {
						dir: fs.BaseDirectory.Home
					}).catch(e => {
						console.error(e);
						reject('There was an error loading user preferences. Could not initialize config file. Check the logs for more details.');
					});
				}
			});
		});
	}

	/*
	 * Description: Get a given preference value from the loaded preference file.
	 * Param: property: String: The name of the preference to return the value for.
	 * Return: Any: The value of the given preoperty. Could be any valid type.
	 */
	get(property) {
		if(!this.initialized) {
			handleError('Cannot read preferences. Preferences not yet initialized.');
			return;
		}

		const preference = this._config[property];
		if(!preference) {
			handleError(`Requested preference ${property} does not exist!`);
		}
		return preference.value;
	}

	/*
	 * Description: Set a given preference to a given value.
	 * Param: property: String: The name of the preference to set.
	 * Param: value: Any: The value to set as the value of the given preference.
	 */
	set(property, value) {
		if(!this.initialized) {
			handleError('Cannot save preferences. Preferences not yet initialized.');
			return;
		}

		const preference = this._config[property];
		if(!preference) {
			handleError(`Requested preference ${property} does not exist!`);
			return;
		}
		if(preference.requiresRestart) {
			alert('You must restart Syng for this change to take effect.');
		}
		preference.value = value;
		if(!underTest) this.save();
	}

	/*
	 * Description: Save the working config. Changes must be saved to persist across sessions.
	 *  Handles errors if any occur while attempting to save the config.
	 */
	save() {
		if(!this.initialized) {
			handleError('Cannot save preferences. Preferences not yet initialized.');
			return;
		}

		// TODO: HACK! This hard coded just to test things out, eventually
		// we'll need to move to using an actual database
		fs.writeTextFile(this._file, JSON.stringify(this._config), {
			dir: fs.BaseDirectory.Home
		}).catch(e => {
			handleError('Cannot save preferences. An unexpected error occurred. Check the logs for more details.', e);
		});
	}
}
