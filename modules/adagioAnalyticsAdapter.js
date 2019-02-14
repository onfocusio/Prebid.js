/**
 * Analytics Adapter for Adagio
 */

import adapter from 'src/AnalyticsAdapter';
import adapterManager from 'src/adapterManager';
import CONSTANTS from 'src/constants.json';

const emptyUrl = '';
const analyticsType = 'endpoint';
const events = Object.keys(CONSTANTS.EVENTS).map(key => CONSTANTS.EVENTS[key]);

const ADSRV_EVENTS = {
  GPT: {
    IMPRESSION_VIEWABLE: 'impressionViewable',
    SLOT_ON_LOAD: 'slotOnLoad',
    SLOT_RENDER_ENDED: 'slotRenderEnded',
    SLOT_REQUESTED: 'slotRequested',
    SLOT_RESPONSE_RECEIVED: 'slotResponseReceived',
    SLOT_VISIBILITY_CHANGED: 'slotVisibilityChanged',
  },
  SAS: {
    CALL: 'call',
    CLEAN: 'clean',
    BEFORE_RENDER: 'beforeRender',
    CMP_ANSWERED: 'CmpAnswered',
    CMP_CALLED: 'CmpCalled',
    LOAD: 'load',
    NOAD: 'noad',
    RENDER: 'render',
    RESET: 'reset'
  }
};

window.top.ADAGIO = window.top.ADAGIO || {};
window.top.ADAGIO.queue = window.top.ADAGIO.queue || [];

const adagioEnqueue = function adagioEnqueue(action, data) {
  window.top.ADAGIO.queue.push({ action, data, ts: Date.now() });
}

if (top.googletag) {
  const googletag = top.googletag;
  googletag.cmd = googletag.cmd || [];
  googletag.cmd.push(function() {
    const gptEvents = Object.keys(ADSRV_EVENTS.GPT).map(key => ADSRV_EVENTS.GPT[key]);
    gptEvents.forEach(eventName => {
      googletag.pubads().addEventListener(eventName, args => {
        adagioEnqueue('gpt-event', { eventName, args });
      });
    });
  });
}

if (top.sas) {
  const sas = top.sas;
  sas.cmd = sas.cmd || [];
  sas.cmd.push(function() {
    const sasEvents = Object.keys(ADSRV_EVENTS.SAS).map(key => ADSRV_EVENTS.SAS[key]);
    sasEvents.forEach(eventName => {
      sas.events.on(eventName, args => {
        adagioEnqueue('sas-event', { eventName, args });
      });
    });
  });
}

const adagioAdapter = Object.assign(adapter({ emptyUrl, analyticsType }), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined' && events.indexOf(eventType) !== -1) {
      adagioEnqueue('pb-analytics-event', { eventName: eventType, args });
    }
  }
});

adapterManager.registerAnalyticsAdapter({
  adapter: adagioAdapter,
  code: 'adagio'
});

export default adagioAdapter;
