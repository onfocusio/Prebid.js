/**
 * Analytics Adapter for Adagio
 */

import adapter from 'src/AnalyticsAdapter';
import adapterManager from 'src/adapterManager';
import CONSTANTS from 'src/constants.json';

const emptyUrl = '';
const analyticsType = 'endpoint';
const events = Object.values(CONSTANTS.EVENTS);

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
window.top.ADAGIO.PBAH = window.top.ADAGIO.PBAH || {};
window.top.ADAGIO.PBAH.q = window.top.ADAGIO.PBAH.q || [];

const adagioEnqueue = function adagioEnqueue(actionName, eventName, event) {
  window.top.ADAGIO.queue.push({
    action: actionName,
    ts: Date.now(),
    data: Object.assign({}, {eventName}, {event}),
  });
}

top.googletag = top.googletag || {};
top.googletag.cmd = top.googletag.cmd || [];
top.googletag.cmd.push(function() {
  const gptEvents = Object.values(ADSRV_EVENTS.GPT);
  gptEvents.forEach(gptEventName => {
    console.log(`enqueue ${gptEventName}`);
    top.googletag.pubads().addEventListener(gptEventName, event => {
      adagioEnqueue('gpt-event', gptEventName, event);
    });
  });
});

top.sas = top.sas || {};
top.sas.cmd = top.sas.cmd || [];

top.sas.cmd.push(function() {
  const sasEvents = Object.values(ADSRV_EVENTS.SAS);
  sasEvents.forEach(sasEventName => {
    top.sas.events.on(sasEventName, function(event) {
      adagioEnqueue('sas-event', sasEventName, event);
    });
  });
});

let adagioAdapter = Object.assign(adapter({ emptyUrl, analyticsType }), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined' && events.indexOf(eventType) !== -1) {
      window.top.ADAGIO.PBAH.q.push({
        eventType: eventType,
        args: args
      });
    }
  }
});

adapterManager.registerAnalyticsAdapter({
  adapter: adagioAdapter,
  code: 'adagio'
});

export default adagioAdapter;
