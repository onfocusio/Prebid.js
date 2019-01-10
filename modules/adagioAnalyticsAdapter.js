/**
 * Analytics Adapter for Adagio
 */

import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import CONSTANTS from 'src/constants.json';

const emptyUrl = '';
const analyticsType = 'endpoint';

window.top.adagioAdapterQueue = window.top.adagioAdapterQueue || [];

const events = Object.values(CONSTANTS.EVENTS);

let adagioAdapter = Object.assign(adapter({ emptyUrl, analyticsType }), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined' && events.indexOf(eventType) !== -1) {
      window.top.adagioAdapterQueue.push({
        eventType: eventType,
        args: args
      });
    }
  }
});

adaptermanager.registerAnalyticsAdapter({
  adapter: adagioAdapter,
  code: 'adagio'
});

export default adagioAdapter;
