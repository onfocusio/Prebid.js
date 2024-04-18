/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess, isNumber } from '../src/utils.js';

const MODULE = 'adagioRtd'
const BIDDER_CODE = 'adagio'
const MAX_SESS_DURATION = 30 * 60 * 1000;
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

/**
 *
 * @param {object} adagioStorage
 * @returns {boolean}
 */
function isNewSession(adagioStorage) {
  const now = Date.now();
  const { lastActivityTime, vwSmplg } = deepAccess(adagioStorage, 'session', {});
  return (
    !isNumber(lastActivityTime) ||
    !isNumber(vwSmplg) ||
    (now - lastActivityTime) > MAX_SESS_DURATION
  )
}

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
