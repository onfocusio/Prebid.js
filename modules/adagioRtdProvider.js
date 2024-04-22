/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE = 'adagioRtd'
const BIDDER_CODE = 'adagio'
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

function init(config, userConsent) {
  const initFailed = false;
  if (initFailed) return false;
  return true;
}

/** @type {RtdSubmodule} */
export const adagioRtdModuleObj = {
  name: MODULE,
  init: init,
};

submodule('realTimeData', adagioRtdModuleObj);
