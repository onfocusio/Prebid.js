/**
 * This module adds the adagio provider to the Real Time Data module (rtdModule).
 * The {@link module:modules/realTimeData} module is required.
 * @module modules/adagioRtdProvider
 * @requires module:modules/realTimeData
 */
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { loadExternalScript } from '../src/adloader.js';
import { submodule } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  deepAccess,
  getUniqueIdentifierStr,
  getWindowSelf,
  getWindowTop,
  inIframe,
  logWarn,
  mergeDeep,
  prefixLog
} from '../src/utils.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('../modules/rtdModule/index.js').adUnit} adUnit
 */
const SUBMODULE_NAME = 'adagio'
const GVLID = 617;
const SCRIPT_URL = 'https://script.4dex.io/a/latest/adagio.js';
const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME });

const { logError, logInfo } = prefixLog('AdagioRtdProvider:');

const _FEATURES = (function() {
  const features = {
    initialized: false,
    data: {},
  };

  return {
    get: function() {
      if (!features.initialized) {
        features.data = {
          page_dimensions: getPageDimensions().toString(),
          viewport_dimensions: getViewPortDimensions().toString(),
          user_timestamp: getTimestampUTC().toString(),
          dom_loading: getDomLoadingDuration().toString(),
        }
        features.initialized = true;
      }

      return { ...features.data };
    }
  }
})();

function loadAdagioScript(config) {
  storage.localStorageIsEnabled(isValid => {
    if (!isValid) {
      return
    }

    const w = getCurrentWindow()
    w.ADAGIO = w.ADAGIO || {};
    w.ADAGIO.adUnits = w.ADAGIO.adUnits || {};
    w.ADAGIO.pbjsAdUnits = w.ADAGIO.pbjsAdUnits || [];
    w.ADAGIO.queue = w.ADAGIO.queue || [];

    // TODO
    // If window.ADAGIO is available, we should not load the script again.
    // >> This can be a problem if the script is loaded from local storage.

    // TODO
    // external script seems never been cached by the browser.
    loadExternalScript(SCRIPT_URL, SUBMODULE_NAME, undefined, undefined, { id: `adagiojs-${getUniqueIdentifierStr()}`, 'data-pid': config.organizationId });
  });
}

function enqueue(ob) {
  const w = getCurrentWindow();

  w.ADAGIO = w.ADAGIO || {};
  w.ADAGIO.queue = w.ADAGIO.queue || [];
  w.ADAGIO.queue.push(ob);
};

/**
 * Initialize the Adagio RTD Module.
 * @param {Object} config
 * @param {Object} userConsent
 * @returns {boolean}
 */
function init(config, userConsent) {
  if (!config.organizationId) {
    logError('organizationId is required.');
    return false;
  }

  loadAdagioScript(config);

  return true;
}

/**
 * onBidRequest is called for each bidder and contains the bids for that bidder.
 * @param {*} bidderRequest
 * @param {*} config
 * @param {*} userConsent
 */
function onBidRequest(bidderRequest, config, userConsent) {
  if (bidderRequest.bidderCode !== 'adagio') {
    return;
  }

  // Store it for adagio.js
  bidderRequest.bids.forEach(bid => {
    const f = { ...deepAccess(bid, 'ortb2.ext.features', {}) };
    f.print_number = deepAccess(bid, 'bidderRequestsCount', 1).toString();
    f.adunit_position = deepAccess(bid, 'ortb2Imp.ext.data.adunit_position');

    const data = {
      features: f,
      params: { ...bid.params },
      adUnitCode: bid.adUnitCode
    }

    enqueue({
      action: 'features',
      ts: Date.now(),
      data
    });
  });
}

/**
 * onGetBidRequestData is called once per auction.
 * It can update the ortb2Fragments object.
 * @param {*} bidReqConfig
 * @param {*} cb
 * @param {*} _config
 */
function onGetBidRequestData(bidReqConfig, cb, _config) {
  const ortb2Fragments = bidReqConfig.ortb2Fragments || {};
  const features = _FEATURES.get();
  mergeDeep(ortb2Fragments, {
    bidder: {
      adagio: {
        ext: { features: { ...features } }
      }
    }
  });
  bidReqConfig.ortb2Fragments = ortb2Fragments;

  const adUnits = bidReqConfig.adUnits || getGlobal().adUnits || [];
  adUnits.forEach(adUnit => {
    // Todo: do we want to filter on adagio bids. IMO not mandatory to do this here, it can be added for each bidder
    // const adagioBids = adUnit.bids.filter(bid => bid.bidder === 'adagio');
    adUnit.bids.forEach(bid => {
      const slotPosition = getSlotPosition(bid);

      const ortb2Imp = bid.ortb2Imp || {}
      mergeDeep(ortb2Imp, {
        ext: {
          data: { adunit_position: slotPosition }
        }
      });
      bid.ortb2Imp = ortb2Imp;
    });
  });
}

export const adagioRtdModuleObj = {
  name: SUBMODULE_NAME,
  gvlid: GVLID,
  init: init,
  getBidRequestData: onGetBidRequestData,
  onBidRequestEvent: onBidRequest,
};

submodule('realTimeData', adagioRtdModuleObj);

// ---
//
// internal functions moved from adagioBidAdapter.js to adagioRtdProvider.js
// These functions should be redistribued in Prebid.js core or in a library
//
// ---
function isSafeFrameWindow() {
  const ws = getWindowSelf();
  return !!(ws.$sf && ws.$sf.ext);
}

function canAccessWindowTop() {
  try {
    if (getWindowTop().location.href) {
      return true;
    }
  } catch (e) {
    return false;
  }
}

function getCurrentWindow() {
  return (canAccessWindowTop()) ? getWindowTop() : getWindowSelf();
}

function getElementFromTopWindow(element, currentWindow) {
  try {
    if (getWindowTop() === currentWindow) {
      if (!element.getAttribute('id')) {
        element.setAttribute('id', `adg-${getUniqueIdentifierStr()}`);
      }
      return element;
    } else {
      const frame = currentWindow.frameElement;
      const frameClientRect = frame.getBoundingClientRect();
      const elementClientRect = element.getBoundingClientRect();

      if (frameClientRect.width !== elementClientRect.width || frameClientRect.height !== elementClientRect.height) {
        return false;
      }

      return getElementFromTopWindow(frame, currentWindow.parent);
    }
  } catch (err) {
    logWarn(err);
    return false;
  }
};

function getSlotPosition(bid, property = 'adUnitElementId') {
  let adUnitElementId = deepAccess(bid, 'ortb2Imp.ext.data.elementId', null) || bid.params[property] || '';

  if (!adUnitElementId) {
    adUnitElementId = getGptSlotInfoForAdUnitCode(bid.adUnitCode).divId;
  }
  if (!adUnitElementId) {
    adUnitElementId = bid.adUnitCode;
  }

  if (!adUnitElementId) {
    logInfo('Unable to compute slot position. Try to add `bid.params.adUnitElementId = "{dom-element-id}"` in your ad-unit config.')
    return '';
  }

  if (!isSafeFrameWindow() && !canAccessWindowTop()) {
    return '';
  }

  const position = { x: 0, y: 0 };

  if (isSafeFrameWindow()) {
    const ws = getWindowSelf();

    if (typeof ws.$sf.ext.geom !== 'function') {
      logWarn('Unable to compute from safeframe api.');
      return '';
    }

    const sfGeom = ws.$sf.ext.geom();

    if (!sfGeom || !sfGeom.self) {
      logWarn('Unable to compute from safeframe api. Missing `geom().self` property');
      return '';
    }

    position.x = Math.round(sfGeom.t);
    position.y = Math.round(sfGeom.l);
  } else if (canAccessWindowTop()) {
    try {
      // window.top based computing
      const wt = getWindowTop();
      const d = wt.document;

      let domElement;

      if (inIframe() === true) {
        const ws = getWindowSelf();
        const currentElement = ws.document.getElementById(adUnitElementId);
        domElement = getElementFromTopWindow(currentElement, ws);
      } else {
        domElement = wt.document.getElementById(adUnitElementId);
      }

      if (!domElement) {
        return '';
      }

      let box = domElement.getBoundingClientRect();

      const docEl = d.documentElement;
      const body = d.body;
      const clientTop = d.clientTop || body.clientTop || 0;
      const clientLeft = d.clientLeft || body.clientLeft || 0;
      const scrollTop = wt.pageYOffset || docEl.scrollTop || body.scrollTop;
      const scrollLeft = wt.pageXOffset || docEl.scrollLeft || body.scrollLeft;

      const elComputedStyle = wt.getComputedStyle(domElement, null);
      const mustDisplayElement = elComputedStyle.display === 'none';

      if (mustDisplayElement) {
        logWarn('The element is hidden. The slot position cannot be computed.');
      }

      position.x = Math.round(box.left + scrollLeft - clientLeft);
      position.y = Math.round(box.top + scrollTop - clientTop);
    } catch (err) {
      logError(err);
      return '';
    }
  } else {
    return '';
  }

  return `${position.x}x${position.y}`;
}

function getPageDimensions() {
  if (isSafeFrameWindow() || !canAccessWindowTop()) {
    return '';
  }

  // the page dimension can be computed on window.top only.
  const wt = getWindowTop();
  const body = wt.document.querySelector('body');

  if (!body) {
    return '';
  }
  const html = wt.document.documentElement;
  const pageWidth = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
  const pageHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

  return `${pageWidth}x${pageHeight}`;
}

/**
 * @todo Move to prebid Core as Utils.
 * @returns
 */
function getViewPortDimensions() {
  if (!isSafeFrameWindow() && !canAccessWindowTop()) {
    return '';
  }

  const viewportDims = { w: 0, h: 0 };

  if (isSafeFrameWindow()) {
    const ws = getWindowSelf();

    if (typeof ws.$sf.ext.geom !== 'function') {
      logWarn('Unable to compute from safeframe api.');
      return '';
    }

    const sfGeom = ws.$sf.ext.geom();

    if (!sfGeom || !sfGeom.win) {
      logWarn('Unable to compute from safeframe api. Missing `geom().win` property');
      return '';
    }

    viewportDims.w = Math.round(sfGeom.w);
    viewportDims.h = Math.round(sfGeom.h);
  } else {
    // window.top based computing
    const wt = getWindowTop();
    viewportDims.w = wt.innerWidth;
    viewportDims.h = wt.innerHeight;
  }

  return `${viewportDims.w}x${viewportDims.h}`;
}

function getTimestampUTC() {
  // timestamp returned in seconds
  return Math.floor(new Date().getTime() / 1000) - new Date().getTimezoneOffset() * 60;
}

/**
 * domLoading feature is computed on window.top if reachable.
 */
function getDomLoadingDuration() {
  let domLoadingDuration = -1;
  let performance;

  performance = (canAccessWindowTop()) ? getWindowTop().performance : getWindowSelf().performance;

  if (performance && performance.timing && performance.timing.navigationStart > 0) {
    const val = performance.timing.domLoading - performance.timing.navigationStart;
    if (val > 0) {
      domLoadingDuration = val;
    }
  }

  return domLoadingDuration;
}

// function getPrintNumber(adUnitCode, bidderRequest) {
//   if (!bidderRequest.bids || !bidderRequest.bids.length) {
//     return 1;
//   }
//   const adagioBid = find(bidderRequest.bids, bid => bid.adUnitCode === adUnitCode);
//   return adagioBid.bidderRequestsCount || 1;
// }

// --- end of internal functions ----- //
