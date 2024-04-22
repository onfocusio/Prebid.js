/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */
import { loadExternalScript } from '../src/adloader.js';
import { bidderSettings } from '../src/bidderSettings.js';
import { config } from '../src/config.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  getUniqueIdentifierStr,
  logInfo,
  logWarn
} from '../src/utils.js';

const LOG_PREFIX = 'Adagio:';
export const ENDPOINT = 'https://mp.4dex.io/prebid';

const ADAGIOJS_VERSION_LOCK = '2.0.2';
const ADAGIOJS_VERSION_LATEST = 'latest';
const ADAGIOJS_VERSION_NONE = 'none';
const ADAGIOJS_VERSION_PLACEHOLDER = '%ADAGIOJS_VERSION%';
const PUBLISHER_TAG_URL_TEMPLATE = 'https://script.4dex.io/a' + ADAGIOJS_VERSION_PLACEHOLDER + '/adagio.js';

const BB_PUBLICATION = 'adagio';
export const BB_RENDERER_URL = `https://${BB_PUBLICATION}.bbvms.com/r/$RENDERER.js`;

const MODULE = 'adagioRtd'
const BIDDER_CODE = 'adagio'
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export function getAdagioScript() {
  storage.localStorageIsEnabled(isValid => {
    if (!isValid) {
      return
    }

    const adagiojsVersion = bidderSettings.get('adagio', 'scriptVersion') || config.getConfig('adagio.scriptVersion');
    // If the publisher explicitly set the version to 'none', we don't load anything.
    if (adagiojsVersion === ADAGIOJS_VERSION_NONE) {
      return;
    }

    const url = computeAdagioScriptUrl(adagiojsVersion);
    loadExternalScript(url, BIDDER_CODE, undefined, undefined, { id: `adagiojs-${getUniqueIdentifierStr()}`, version: adagiojsVersion });
  });
}

/**
 * @param {string|number} adagiojsVersion The external adagio.js script version to use
 * @returns {string} https://script.4dex.io/a[/VERSION]/adagio.js
 */
export function computeAdagioScriptUrl(adagiojsVersion) {
  let versionDir = `/${ADAGIOJS_VERSION_LOCK}`;
  const semverRgx = /^\d+\.\d+\.\d+$/;

  if (adagiojsVersion === ADAGIOJS_VERSION_LATEST || semverRgx.test(adagiojsVersion)) {
    versionDir = `/${adagiojsVersion}`;
  } else {
    logInfo(`${LOG_PREFIX} Invalid adagio.js version. Using the default version.`);
  }

  return PUBLISHER_TAG_URL_TEMPLATE.replace(ADAGIOJS_VERSION_PLACEHOLDER, versionDir);
}

function init(config, userConsent) {
  const initFailed = false;
  getAdagioScript();
  logWarn(LOG_PREFIX, 'Load Adagio.js from RTD Module')
  if (initFailed) return false;
  return true;
}

/** @type {RtdSubmodule} */
export const adagioRtdModuleObj = {
  name: MODULE,
  init: init,
};

submodule('realTimeData', adagioRtdModuleObj);
