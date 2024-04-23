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
  getWindowSelf,
  getWindowTop,
  inIframe,
  logError,
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

function isSafeFrameWindow() {
  const ws = getWindowSelf();
  return !!(ws.$sf && ws.$sf.ext);
}

function canAccessTopWindow() {
  try {
    if (getWindowTop().location.href) {
      return true;
    }
  } catch (error) {
    return false;
  }
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
    logWarn(`${LOG_PREFIX}`, err);
    return false;
  }
};

function getSlotPosition(adUnitElementId) {
  if (!adUnitElementId) {
    return '';
  }

  if (!isSafeFrameWindow() && !canAccessTopWindow()) {
    return '';
  }

  const position = { x: 0, y: 0 };

  if (isSafeFrameWindow()) {
    const ws = getWindowSelf();

    if (typeof ws.$sf.ext.geom !== 'function') {
      logWarn(LOG_PREFIX, 'Unable to compute from safeframe api.');
      return '';
    }

    const sfGeom = ws.$sf.ext.geom();

    if (!sfGeom || !sfGeom.self) {
      logWarn(LOG_PREFIX, 'Unable to compute from safeframe api. Missing `geom().self` property');
      return '';
    }

    position.x = Math.round(sfGeom.t);
    position.y = Math.round(sfGeom.l);
  } else if (canAccessTopWindow()) {
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
        logWarn(LOG_PREFIX, 'The element is hidden. The slot position cannot be computed.');
      }

      position.x = Math.round(box.left + scrollLeft - clientLeft);
      position.y = Math.round(box.top + scrollTop - clientTop);
    } catch (err) {
      logError(LOG_PREFIX, err);
      return '';
    }
  } else {
    return '';
  }

  return `${position.x}x${position.y}`;
}

// function getPrintNumber(adUnitCode, bidderRequest) {
//   if (!bidderRequest.bids || !bidderRequest.bids.length) {
//     return 1;
//   }
//   const adagioBid = find(bidderRequest.bids, bid => bid.adUnitCode === adUnitCode);
//   return adagioBid.bidderRequestsCount || 1;
// }

/**
 * @todo Move to prebid Core as Utils.
 * @returns
 */
function getViewPortDimensions() {
  if (!isSafeFrameWindow() && !canAccessTopWindow()) {
    return '';
  }

  const viewportDims = { w: 0, h: 0 };

  if (isSafeFrameWindow()) {
    const ws = getWindowSelf();

    if (typeof ws.$sf.ext.geom !== 'function') {
      logWarn(LOG_PREFIX, 'Unable to compute from safeframe api.');
      return '';
    }

    const sfGeom = ws.$sf.ext.geom();

    if (!sfGeom || !sfGeom.win) {
      logWarn(LOG_PREFIX, 'Unable to compute from safeframe api. Missing `geom().win` property');
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

  performance = (canAccessTopWindow()) ? getWindowTop().performance : getWindowSelf().performance;

  if (performance && performance.timing && performance.timing.navigationStart > 0) {
    const val = performance.timing.domLoading - performance.timing.navigationStart;
    if (val > 0) {
      domLoadingDuration = val;
    }
  }

  return domLoadingDuration;
}

function getPageDimensions() {
  if (isSafeFrameWindow() || !canAccessTopWindow()) {
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

let globalFeatures = {};

function init(config, userConsent) {
  const initFailed = false;
  getAdagioScript();
  globalFeatures = {
    page_dimensions: getPageDimensions().toString(),
    viewport_dimensions: getViewPortDimensions().toString(),
    user_timestamp: getTimestampUTC().toString(),
    dom_loading: getDomLoadingDuration().toString(),
  }
  logWarn(LOG_PREFIX, 'Load Adagio.js from RTD Module')
  if (initFailed) return false;
  return true;
}

function onBidRequest(bidRequest, config, userConsent) {
  const features = {
    ...globalFeatures,
    // print_number: getPrintNumber(bidRequest.adUnitCode, bidderRequest).toString(), // bidderRequestsCount
    adunit_position: getSlotPosition(bidRequest.params?.adUnitElementId) // adUnitElementId à déplacer ???
  };
  Object.keys(features).forEach((prop) => {
    if (features[prop] === '') {
      delete features[prop];
    }
  });

  bidRequest.features = features;
  logInfo(bidRequest);
}

/** @type {RtdSubmodule} */
export const adagioRtdModuleObj = {
  name: MODULE,
  init: init,
  onBidRequestEvent: onBidRequest,
};

submodule('realTimeData', adagioRtdModuleObj);
