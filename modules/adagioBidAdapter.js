import find from 'core-js/library/fn/array/find';
import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';

const prebidTimeout = parseInt(config.getConfig('bidderTimeout'), 10);

const BIDDER_CODE = 'adagio';
const VERSION = '1.0.0';
const ENDPOINT = 'https://mp.4dex.io/prebid';
const SUPPORTED_MEDIA_TYPES = ['banner'];
const ADAGIO_TAG_URL = '//script.4dex.io/localstore.js';
const ADAGIO_TAG_TO_LOCALSTORE = '//script.4dex.io/adagio.js';
const ADAGIO_LOCALSTORE_KEY = 'adagioScript';
const LOCALSTORE_TIMEOUT = (prebidTimeout / 2) < 100 ? 100 : prebidTimeout / 2;
const script = document.createElement('script');

const getAdagioTag = function getAdagioTag() {
  const ls = window.top.localStorage.getItem('adagioScript');
  if (ls !== null) {
    Function(ls)(); // eslint-disable-line no-new-func
  } else {
    utils.logWarn('Adagio Script not found');
  }
}

// First, try to load adagio-js from localStorage.
getAdagioTag();

// Then prepare localstore.js to update localStorage adagio-sj script with
// the very last version.
script.type = 'text/javascript';
script.async = true;
script.src = ADAGIO_TAG_URL;
script.setAttribute('data-key', ADAGIO_LOCALSTORE_KEY);
script.setAttribute('data-src', ADAGIO_TAG_TO_LOCALSTORE);
setTimeout(function() {
  utils.insertElement(script);
}, LOCALSTORE_TIMEOUT);

/**
 * Based on https://github.com/ua-parser/uap-cpp/blob/master/UaParser.cpp#L331, with the following updates:
 * - replaced `mobile` by `mobi` in the table regexp, so Opera Mobile on phones is not detected as a tablet.
 */
function _getDeviceType() {
  let ua = navigator.userAgent;

  // Tablets must be checked before phones.
  if ((/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i).test(ua)) {
    return 5; // "tablet"
  }
  if ((/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/).test(ua)) {
    return 4; // "phone"
  }
  // Consider that all other devices are personal computers
  return 2;
};

function _getDevice() {
  const language = navigator.language ? 'language' : 'userLanguage';
  return {
    userAgent: navigator.userAgent,
    language: navigator[language],
    deviceType: _getDeviceType(),
    dnt: utils.getDNT() ? 1 : 0,
    geo: {},
    js: 1
  };
};

function _getSite() {
  const topLocation = utils.getTopWindowLocation();
  return {
    domain: topLocation.hostname,
    page: topLocation.href,
    referrer: utils.getTopWindowReferrer()
  };
};

function _getPageviewId() {
  return (!window.top.ADAGIO || !window.top.ADAGIO.pageviewId) ? '_' : window.top.ADAGIO.pageviewId;
};

function _getFeatures(bidRequest) {
  if (!window.top._ADAGIO || !window.top._ADAGIO.features) {
    return {};
  }

  const rawFeatures = window.top._ADAGIO.features.getFeatures(
    document.getElementById(bidRequest.adUnitCode),
    function(features) {
      return {
        site_id: bidRequest.params.siteId,
        placement: bidRequest.params.placementId,
        pagetype: bidRequest.params.pagetypeId,
        categories: bidRequest.params.categories
      };
    }
  );
  return rawFeatures;
}

function _getGdprConsent(bidderRequest) {
  const consent = {};
  if (utils.deepAccess(bidderRequest, 'gdprConsent')) {
    if (bidderRequest.gdprConsent.consentString !== undefined) {
      consent.consentString = bidderRequest.gdprConsent.consentString;
    }
    if (bidderRequest.gdprConsent.gdprApplies !== undefined) {
      consent.consentRequired = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }
    if (bidderRequest.gdprConsent.allowAuctionWithoutConsent !== undefined) {
      consent.allowAuctionWithoutConsent = bidderRequest.gdprConsent.allowAuctionWithoutConsent ? 1 : 0;
    }
  }
  return consent;
}

// Extra data returned by Adagio SSP Engine
function _setData(data) {
  if (window.top.ADAGIO && window.top.ADAGIO.queue) {
    window.top.ADAGIO.queue.push({
      action: 'ssp-data',
      ts: Date.now(),
      data: data,
    });
  }
}

export const spec = {
  code: BIDDER_CODE,

  supportedMediaType: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: function(bid) {
    return !!(bid.params.siteId && bid.params.placementId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const secure = (location.protocol === 'https:') ? 1 : 0;
    const device = _getDevice();
    const site = _getSite();
    const pageviewId = _getPageviewId();
    const gdprConsent = _getGdprConsent(bidderRequest);
    const adUnits = utils._map(validBidRequests, (bidRequest) => {
      bidRequest.params.features = _getFeatures(bidRequest);
      const categories = bidRequest.params.categories;
      if (typeof categories !== 'undefined' && !Array.isArray(categories)) {
        bidRequest.params.categories = [categories];
      }
      return bidRequest;
    });

    // Regroug ad units by siteId
    const groupedAdUnits = adUnits.reduce((groupedAdUnits, adUnit) => {
      (groupedAdUnits[adUnit.params.siteId] = groupedAdUnits[adUnit.params.siteId] || []).push(adUnit);
      return groupedAdUnits;
    }, {});

    // Build one request per siteId
    const requests = utils._map(Object.keys(groupedAdUnits), (siteId) => {
      return {
        method: 'POST',
        url: ENDPOINT,
        data: {
          id: utils.generateUUID(),
          secure: secure,
          device: device,
          site: site,
          siteId: siteId,
          pageviewId: pageviewId,
          adUnits: groupedAdUnits[siteId],
          gdpr: gdprConsent,
          adapterVersion: VERSION
        },
        options: {
          contentType: 'application/json'
        }
      }
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    let bidResponses = [];
    try {
      const response = serverResponse.body;
      if (response) {
        if (response.data) {
          _setData(response.data)
        }
        if (response.bids) {
          response.bids.forEach(bidObj => {
            const bidReq = (find(bidRequest.data.adUnits, bid => bid.bidId === bidObj.requestId));
            if (bidReq) {
              bidObj.site = bidReq.params.site;
              bidObj.placement = bidReq.params.placement;
              bidObj.pagetype = bidReq.params.pagetype;
              bidObj.category = bidReq.params.category;
              bidObj.subcategory = bidReq.params.subcategory;
              bidObj.environment = bidReq.params.environment;
            }
            bidResponses.push(bidObj);
          });
        }
      }
    } catch (err) {
      utils.logError(err);
    }
    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    if (!serverResponses.length || serverResponses[0].body === '' || !serverResponses[0].body.userSyncs) {
      return false;
    }
    const syncs = serverResponses[0].body.userSyncs.map((sync) => {
      return {
        type: sync.t === 'p' ? 'image' : 'iframe',
        url: sync.u
      }
    })
    return syncs;
  }
}

registerBidder(spec);
