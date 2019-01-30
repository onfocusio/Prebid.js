/**
 * Analytics Adapter for Adagio
 */

import adapter from 'src/AnalyticsAdapter';
import adapterManager from 'src/adapterManager';
import CONSTANTS from 'src/constants.json';

const emptyUrl = '';
const analyticsType = 'endpoint';

window.top.ADAGIO = window.top.ADAGIO || {};
window.top.ADAGIO.PBAH = window.top.ADAGIO.PBAH || {};
window.top.ADAGIO.PBAH.q = window.top.ADAGIO.PBAH.q || [];

const events = Object.values(CONSTANTS.EVENTS);

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
