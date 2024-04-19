/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess, isNumber, logError, logInfo } from '../src/utils.js';

const MODULE = 'adagioRtd'
const BIDDER_CODE = 'adagio'
const LOG_PREFIX = 'Adagio:';
const DEFAULT_SMPLG = 0.01;
// const PUB_SMPLG_URL = 'https://api.jsonserve.com/UoViDj'
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
  storage.getDataFromLocalStorage('adagio', (storageData) => {
    const organizationId = config.params.organizationId ?? 1001;
    if (organizationId) { loadPublisherSampling(storageData, organizationId) }
  });
  logInfo(LOG_PREFIX, 'RTD Module loaded')
  if (initFailed) return false;
  return true;
}

async function loadPublisherSampling(storageValue) {
  const adagioStorage = JSON.parse(storageValue);
  if (!isNewSession(adagioStorage)) return;
  const newSession = true;
  const random = Math.random();

  let publisherSmplg = DEFAULT_SMPLG;
  try {
    // publisherSmplg = await fetch(PUB_SMPLG_URL)
    // FAKE FETCH
    publisherSmplg = 0.025;
  } catch (e) {
    logError(LOG_PREFIX, e);
  }

  const data = {
    session: {
      new: newSession,
      rnd: random,
      vwSmplg: publisherSmplg,
      vwSmplgNxt: publisherSmplg
    }
  }

  storage.setDataInLocalStorage(BIDDER_CODE, JSON.stringify({...adagioStorage, ...data}));
}

/** @type {RtdSubmodule} */
export const adagioRtdModuleObj = {
  name: MODULE,
  init: init,
};

submodule('realTimeData', adagioRtdModuleObj);
