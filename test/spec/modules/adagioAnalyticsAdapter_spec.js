import * as prebidGlobal from 'src/prebidGlobal.js';
import * as utils from 'src/utils.js';
import adagioAnalyticsAdapter, { _internal } from 'modules/adagioAnalyticsAdapter.js';
import { EVENTS } from 'src/constants.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';

let adapterManager = require('src/adapterManager').default;
let events = require('src/events');

describe('adagio analytics adapter - adagio.js', () => {
  let sandbox;
  let adagioQueuePushSpy;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(events, 'getEvents').returns([]);

    sandbox.stub(prebidGlobal, 'getGlobal').returns({
      installedModules: ['adagioRtdProvider', 'rtdModule']
    });

    adapterManager.registerAnalyticsAdapter({
      code: 'adagio',
      adapter: adagioAnalyticsAdapter
    });

    _internal.getAdagioNs().pageviewId = 'a68e6d70-213b-496c-be0a-c468ff387106';

    adagioQueuePushSpy = sandbox.spy(_internal.getAdagioNs().queue, 'push');
  });

  afterEach(() => {
    _internal.getAdagioNs().queue = [];
    sandbox.restore();
  });

  describe('track', () => {
    beforeEach(() => {
      adapterManager.enableAnalytics({
        provider: 'adagio',
        options: {
          organizationId: '1001',
          site: 'test-com',
        }
      });
    });

    afterEach(() => {
      adagioAnalyticsAdapter.disableAnalytics();
    });

    it('builds and sends auction data', () => {
      const w = utils.getWindowTop();

      let bidRequest = {
        bids: [{
          adUnitCode: 'div-1',
          params: {
            features: {
              siteId: '2',
              placement: 'pave_top',
              pagetype: 'article',
              category: 'IAB12,IAB12-2',
              device: '2',
            }
          }
        }, {
          adUnitCode: 'div-2',
          params: {
            features: {
              siteId: '2',
              placement: 'ban_top',
              pagetype: 'article',
              category: 'IAB12,IAB12-2',
              device: '2',
            }
          },
        }],
      };
      let bidResponse = {
        bidderCode: 'adagio',
        width: 300,
        height: 250,
        statusMessage: 'Bid available',
        cpm: 6.2189757658226075,
        currency: '',
        netRevenue: false,
        adUnitCode: 'div-1',
        timeToRespond: 132,
      };

      const testEvents = {
        [EVENTS.BID_REQUESTED]: bidRequest,
        [EVENTS.BID_RESPONSE]: bidResponse,
        [EVENTS.AUCTION_END]: {}
      };

      // Step 1-3: Send events
      Object.entries(testEvents).forEach(([ev, payload]) => events.emit(ev, payload));
      function eventItem(eventName, args) {
        return sinon.match({
          action: 'pb-analytics-event',
          ts: sinon.match((val) => val !== undefined),
          data: {
            eventName,
            args
          }
        })
      }

      Object.entries(testEvents).forEach(([ev, payload]) => sinon.assert.calledWith(adagioQueuePushSpy, eventItem(ev, payload)));
    });
  });
});

const AUCTION_ID = '25c6d7f5-699a-4bfc-87c9-996f915341fa';
const RTD_AUCTION_ID = '753b3784-12a1-44c2-9d08-d0e4ee910e69';
const RTD_AUCTION_ID_CACHE = '04d991be-8f7d-4491-930b-2b7eefb3c447';
const AUCTION_ID_CACHE = 'b43d24a0-13d4-406d-8176-3181402bafc4';
const SESSION_ID = 'c4f9e517-a592-45af-9560-ca191823d591';

const BID_ADAGIO = {
  bidder: 'adagio',
  auctionId: AUCTION_ID,
  adUnitCode: '/19968336/header-bid-tag-1',
  bidId: '3bd4ebb1c900e2',
  partnerImpId: 'partnerImpressionID-2',
  adId: 'fake_ad_id_2',
  requestId: '3bd4ebb1c900e2',
  width: 728,
  height: 90,
  mediaType: 'banner',
  cpm: 1.42,
  currency: 'USD',
  originalCpm: 1.42,
  originalCurrency: 'USD',
  dealId: 'the-deal-id',
  dealChannel: 'PMP',
  mi: 'matched-impression',
  seatBidId: 'aaaa-bbbb-cccc-dddd',
  adserverTargeting: {
    'hb_bidder': 'another',
    'hb_adid': '3bd4ebb1c900e2',
    'hb_pb': '1.500',
    'hb_size': '728x90',
    'hb_source': 'server'
  },
  meta: {
    advertiserDomains: ['example.com']
  },
  pba: {
    sid: '42',
    e_pba_test: true
  }
};

const BID_ANOTHER = {
  bidder: 'another',
  auctionId: AUCTION_ID,
  adUnitCode: '/19968336/header-bid-tag-1',
  bidId: '3bd4ebb1c900e2',
  partnerImpId: 'partnerImpressionID-2',
  adId: 'fake_ad_id_2',
  requestId: '3bd4ebb1c900e2',
  width: 728,
  height: 90,
  mediaType: 'banner',
  cpm: 1.71,
  currency: 'EUR',
  originalCpm: 1.62,
  originalCurrency: 'GBP',
  dealId: 'the-deal-id',
  dealChannel: 'PMP',
  mi: 'matched-impression',
  seatBidId: 'aaaa-bbbb-cccc-dddd',
  adserverTargeting: {
    'hb_bidder': 'another',
    'hb_adid': '3bd4ebb1c900e2',
    'hb_pb': '1.500',
    'hb_size': '728x90',
    'hb_source': 'server'
  },
  meta: {
    advertiserDomains: ['example.com']
  }
};

const BID_CACHED = Object.assign({}, BID_ADAGIO, {
  auctionId: AUCTION_ID_CACHE,
  latestTargetedAuctionId: BID_ADAGIO.auctionId,
});

const PARAMS_ADG = {
  environment: 'desktop',
};

const ORTB_DATA = {
  pagetype: 'article',
};

const ADG_RTD = {
  'uid': RTD_AUCTION_ID,
  'session': {
    'testName': 'test',
    'testVersion': 'version',
    'id': SESSION_ID,
  }
};

const AUCTION_INIT_ANOTHER = {
  'auctionId': AUCTION_ID,
  'timestamp': 1519767010567,
  'auctionStatus': 'inProgress',
  'adUnits': [ {
    'code': '/19968336/header-bid-tag-1',
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            640,
            480
          ],
          [
            640,
            100
          ]
        ]
      }
    },
    'sizes': [[640, 480]],
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
    }, {
      'bidder': 'nobid',
      'params': {
        'publisherId': '1002'
      },
    }, {
      'bidder': 'adagio',
      'params': {
        ...PARAMS_ADG
      },
    }, {
      'bidder': 'anotherWithAlias',
      'params': {
        'publisherId': '1001'
      },
    }, ],
    'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
    'ortb2Imp': {
      'ext': {
        'data': {
          'placement': 'pave_top',
        }
      }
    },
  }, {
    'code': '/19968336/footer-bid-tag-1',
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            640,
            480
          ]
        ]
      }
    },
    'sizes': [[640, 480]],
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
    } ],
    'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
    'ortb2Imp': {
      'ext': {
        'data': {
          'placement': 'pave_top',
        }
      }
    },
  } ],
  'adUnitCodes': ['/19968336/header-bid-tag-1', '/19968336/footer-bid-tag-1'],
  'bidderRequests': [ {
    'bidderCode': 'another',
    'auctionId': AUCTION_ID,
    'bidderRequestId': '1be65d7958826a',
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001',
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/header-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID,
      'src': 'client',
      'bidRequestsCount': 1
    }, {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/footer-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID,
      'src': 'client',
      'bidRequestsCount': 1
    }, {
      'bidder': 'nobid',
      'params': {
        'publisherId': '1001'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/footer-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID,
      'src': 'client',
      'bidRequestsCount': 1
    }, {
      'bidder': 'anotherWithAlias',
      'params': {
        'publisherId': '1001',
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/header-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID,
      'src': 'client',
      'bidRequestsCount': 1
    },
    ],
    'timeout': 3000,
    'refererInfo': {
      'topmostLocation': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
    },
    'ortb2': {
      'site': {
        'ext': {
          'data': {
            'adg_rtd': {
              ...ADG_RTD
            },
            ...ORTB_DATA
          }
        }
      }
    }
  }, {
    'bidderCode': 'adagio',
    'auctionId': AUCTION_ID,
    'bidderRequestId': '1be65d7958826a',
    'bids': [ {
      'bidder': 'adagio',
      'params': {
        ...PARAMS_ADG
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/header-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID,
      'src': 'client',
      'bidRequestsCount': 1
    }
    ],
    'timeout': 3000,
    'refererInfo': {
      'topmostLocation': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
    },
    'ortb2': {
      'site': {
        'ext': {
          'data': {
            'adg_rtd': {
              ...ADG_RTD
            },
            ...ORTB_DATA
          }
        }
      }
    }
  }
  ],
  'bidsReceived': [],
  'winningBids': [],
  'timeout': 3000
};

const AUCTION_INIT_CACHE = {
  'auctionId': AUCTION_ID_CACHE,
  'timestamp': 1519767010567,
  'auctionStatus': 'inProgress',
  'adUnits': [ {
    'code': '/19968336/header-bid-tag-1',
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            640,
            480
          ],
          [
            640,
            100
          ]
        ]
      }
    },
    'sizes': [[640, 480]],
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
    }, {
      'bidder': 'adagio',
      'params': {
        ...PARAMS_ADG
      },
    }, ],
    'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
    'ortb2Imp': {
      'ext': {
        'data': {
          'placement': 'pave_top',
        }
      }
    },
  }, {
    'code': '/19968336/footer-bid-tag-1',
    'mediaTypes': {
      'banner': {
        'sizes': [
          [
            640,
            480
          ]
        ]
      }
    },
    'sizes': [[640, 480]],
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
    } ],
    'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
    'ortb2Imp': {
      'ext': {
        'data': {
          'placement': 'pave_top',
        }
      }
    },
  } ],
  'adUnitCodes': ['/19968336/header-bid-tag-1', '/19968336/footer-bid-tag-1'],
  'bidderRequests': [ {
    'bidderCode': 'another',
    'auctionId': AUCTION_ID_CACHE,
    'bidderRequestId': '1be65d7958826a',
    'bids': [ {
      'bidder': 'another',
      'params': {
        'publisherId': '1001',
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/header-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID_CACHE,
      'src': 'client',
      'bidRequestsCount': 1
    }, {
      'bidder': 'another',
      'params': {
        'publisherId': '1001'
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/footer-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID_CACHE,
      'src': 'client',
      'bidRequestsCount': 1
    }
    ],
    'timeout': 3000,
    'refererInfo': {
      'topmostLocation': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
    },
    'ortb2': {
      'site': {
        'ext': {
          'data': {
            'adg_rtd': {
              ...ADG_RTD,
              'uid': RTD_AUCTION_ID_CACHE
            },
            ...ORTB_DATA
          }
        }
      }
    }
  }, {
    'bidderCode': 'adagio',
    'auctionId': AUCTION_ID_CACHE,
    'bidderRequestId': '1be65d7958826a',
    'bids': [ {
      'bidder': 'adagio',
      'params': {
        ...PARAMS_ADG
      },
      'mediaTypes': {
        'banner': {
          'sizes': [[640, 480]]
        }
      },
      'adUnitCode': '/19968336/header-bid-tag-1',
      'transactionId': 'ca4af27a-6d02-4f90-949d-d5541fa12014',
      'sizes': [[640, 480]],
      'bidId': '2ecff0db240757',
      'bidderRequestId': '1be65d7958826a',
      'auctionId': AUCTION_ID_CACHE,
      'src': 'client',
      'bidRequestsCount': 1
    }
    ],
    'timeout': 3000,
    'refererInfo': {
      'topmostLocation': 'http://www.test.com/page.html', 'reachedTop': true, 'numIframes': 0, 'stack': ['http://www.test.com/page.html']
    },
    'ortb2': {
      'site': {
        'ext': {
          'data': {
            'adg_rtd': {
              ...ADG_RTD,
              'uid': RTD_AUCTION_ID_CACHE
            },
            ...ORTB_DATA
          }
        }
      }
    }
  }
  ],
  'bidsReceived': [],
  'winningBids': [],
  'timeout': 3000
};

const AUCTION_END_ANOTHER = Object.assign({}, AUCTION_INIT_ANOTHER, {
  bidsReceived: [BID_ANOTHER, BID_ADAGIO]
});

const AUCTION_END_ANOTHER_NOBID = Object.assign({}, AUCTION_INIT_ANOTHER, {
  bidsReceived: []
});

const MOCK = {
  SET_TARGETING: {
    [BID_ADAGIO.adUnitCode]: BID_ADAGIO.adserverTargeting,
    [BID_ANOTHER.adUnitCode]: BID_ANOTHER.adserverTargeting
  },
  AUCTION_INIT: {
    another: AUCTION_INIT_ANOTHER,
    bidcached: AUCTION_INIT_CACHE
  },
  BID_RESPONSE: {
    adagio: BID_ADAGIO,
    another: BID_ANOTHER
  },
  AUCTION_END: {
    another: AUCTION_END_ANOTHER,
    another_nobid: AUCTION_END_ANOTHER_NOBID
  },
  BID_WON: {
    adagio: Object.assign({}, BID_ADAGIO, {
      'status': 'rendered'
    }),
    another: Object.assign({}, BID_ANOTHER, {
      'status': 'rendered'
    }),
    bidcached: Object.assign({}, BID_CACHED, {
      'status': 'rendered'
    }),
  },
  AD_RENDER_SUCCEEDED: {
    another: {
      ad: '<div>ad</div>',
      adId: 'fake_ad_id_2',
      bid: BID_ANOTHER
    },
    bidcached: {
      ad: '<div>ad</div>',
      adId: 'fake_ad_id_2',
      bid: BID_CACHED
    }
  },
  AD_RENDER_FAILED: {
    bidcached: {
      adId: 'fake_ad_id_2',
      bid: BID_CACHED
    }
  }
};

// PBS MOCK

const REQUEST_PBS = {
  bidderCode: 'rubicon',
  auctionId: 'e4b50c47-d3d2-431e-a23a-1d346368163e',
  bidderRequestId: '4cb200152109a1',
  uniquePbsTid: 'abe1188c-a3eb-4ee5-87d6-7b948db50239',
  bids: [
    {
      bidder: 'rubicon',
      params: {
        accountId: 11740,
        siteId: 123,
        zoneId: 456
      },
      bid_id: '3eaaae08cb077e8',
      ortb2Imp: {
        ext: {
          data: {
            placement: 'placement-1',
            divId: 'div-gpt-ad-1722450005575-0',
            adg_rtd: {
              adunit_position: '8x117'
            }
          }
        }
      },
      mediaTypes: {
        banner: {
          sizes: [
            [
              300,
              250
            ]
          ]
        }
      },
      adUnitCode: 'div-gpt-ad-1722450005575-0',
      transactionId: '9dfa53ee-b804-47b8-936b-876ed9b4fd29',
      adUnitId: '43474f58-d2f7-439b-bef3-8c594c0befe5',
      sizes: [
        [
          300,
          250
        ]
      ],
      bidId: '3eaaae08cb077e8',
      bidderRequestId: '4cb200152109a1',
      auctionId: 'e4b50c47-d3d2-431e-a23a-1d346368163e',
      src: 's2s',
      metrics: {},
      bidRequestsCount: 1,
      bidderRequestsCount: 0,
      bidderWinsCount: 0,
      ortb2: {
        source: {},
        site: {
          domain: 'elplacerdelalectura.com',
          publisher: {
            domain: 'elplacerdelalectura.com'
          },
          page: 'http://elplacerdelalectura.com/test-pages/atags-dev/pbs-atags-dev.html',
          ref: 'http://localhost/',
          ext: {
            data: {
              pagetype: 'my-pagetype',
              category: 'my-category',
              adg_rtd: {
                uid: '7e061afa-857b-4de2-bd7b-afb2a183189a',
                pageviewId: '96cccb6f-2f21-4116-b494-06211058a8ea',
                features: {
                  page_dimensions: '2560x687',
                  viewport_dimensions: '2560x576',
                  user_timestamp: '1726690329',
                  dom_loading: '39'
                },
                session: {
                  rnd: 0.34967546892102597,
                  new: true,
                  vwSmplg: 0.1,
                  vwSmplgNxt: 0.1,
                  lastActivityTime: 1726679455337,
                  id: '6f17f81d-3ab4-414e-832d-7afa25bbce40',
                  initiator: 'adgjs'
                }
              }
            }
          }
        },
        device: {
          w: 2560,
          h: 1440,
          dnt: 0,
          ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
          language: 'en',
          ext: {
            vpw: 2560,
            vph: 576
          }
        }
      },
      serverResponseTimeMs: 41
    }
  ],
  auctionStart: 1726683129997,
  timeout: 750,
  src: 's2s',
  refererInfo: {
    reachedTop: true,
    isAmp: false,
    numIframes: 0,
    stack: [
      'http://elplacerdelalectura.com/test-pages/atags-dev/pbs-atags-dev.html'
    ],
    topmostLocation: 'http://elplacerdelalectura.com/test-pages/atags-dev/pbs-atags-dev.html',
    location: 'http://elplacerdelalectura.com/test-pages/atags-dev/pbs-atags-dev.html',
    canonicalUrl: null,
    page: 'http://elplacerdelalectura.com/test-pages/atags-dev/pbs-atags-dev.html',
    domain: 'elplacerdelalectura.com',
    ref: 'http://localhost/',
    legacy: {
      reachedTop: true,
      isAmp: false,
      numIframes: 0,
      stack: [
        'http://elplacerdelalectura.com/test-pages/atags-dev/pbs-atags-dev.html'
      ],
      referer: 'http://elplacerdelalectura.com/test-pages/atags-dev/pbs-atags-dev.html',
      canonicalUrl: null
    }
  },
  metrics: {},
  ortb2: {
    source: {},
    site: {
      domain: 'elplacerdelalectura.com',
      publisher: {
        domain: 'elplacerdelalectura.com'
      },
      page: 'http://elplacerdelalectura.com/test-pages/atags-dev/pbs-atags-dev.html',
      ref: 'http://localhost/',
      ext: {
        data: {
          pagetype: 'my-pagetype',
          category: 'my-category',
          adg_rtd: {
            uid: '7e061afa-857b-4de2-bd7b-afb2a183189a',
            pageviewId: '96cccb6f-2f21-4116-b494-06211058a8ea',
            features: {
              page_dimensions: '2560x687',
              viewport_dimensions: '2560x576',
              user_timestamp: '1726690329',
              dom_loading: '39'
            },
            session: {
              rnd: 0.34967546892102597,
              new: true,
              vwSmplg: 0.1,
              vwSmplgNxt: 0.1,
              lastActivityTime: 1726679455337,
              id: '6f17f81d-3ab4-414e-832d-7afa25bbce40',
              initiator: 'adgjs'
            }
          }
        }
      }
    },
    device: {
      w: 2560,
      h: 1440,
      dnt: 0,
      ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
      language: 'en',
      ext: {
        vpw: 2560,
        vph: 576
      }
    }
  },
  adUnitsS2SCopy: [
    {
      code: 'div-gpt-ad-1722450005575-0',
      mediaTypes: {
        banner: {
          sizes: [
            [
              300,
              250
            ]
          ]
        }
      },
      bids: [
        {
          bidder: 'rubicon',
          params: {
            accountId: 11740,
            siteId: 123,
            zoneId: 456
          },
          bid_id: '3eaaae08cb077e8'
        }
      ],
      ortb2Imp: {
        ext: {
          data: {
            placement: 'placement-1',
            divId: 'div-gpt-ad-1722450005575-0',
            adg_rtd: {
              adunit_position: '8x117'
            }
          },
          tid: '9dfa53ee-b804-47b8-936b-876ed9b4fd29'
        }
      },
      sizes: [
        [
          300,
          250
        ]
      ],
      adUnitId: '43474f58-d2f7-439b-bef3-8c594c0befe5',
      transactionId: '9dfa53ee-b804-47b8-936b-876ed9b4fd29'
    }
  ],
  start: 1726683129998,
  serverResponseTimeMs: 41
}

const BID_PBS = {
  bidderCode: 'rubicon',
  width: 300,
  height: 250,
  statusMessage: 'Bid available',
  adId: '685eef8a90d32e8',
  requestId: '3eaaae08cb077e8',
  transactionId: '9dfa53ee-b804-47b8-936b-876ed9b4fd29',
  adUnitId: '43474f58-d2f7-439b-bef3-8c594c0befe5',
  auctionId: 'e4b50c47-d3d2-431e-a23a-1d346368163e',
  mediaType: 'banner',
  source: 's2s',
  ad: 'AdMarkup ...',
  seatBidId: '1234567890',
  cpm: 1.594,
  currency: 'USD',
  creative_id: 'creative111',
  creativeId: 'creative111',
  ttl: 60,
  netRevenue: true,
  meta: {
    adaptercode: 'rubicon',
    advertiserDomains: [
      'www.addomain.com'
    ]
  },
  adapterCode: 'rubicon',
  pbsBidId: '91ee57df-4895-4bec-a006-7d1798443186',
  adserverTargeting: {
    hb_bidder: 'rubicon',
    hb_pb: '1.50',
    hb_size: '300x250',
    hb_adid: '685eef8a90d32e8',
    hb_source: 's2s',
    hb_format: 'banner',
    hb_adomain: 'www.addomain.com',
    hb_crid: 'creative111'
  },
  requestBidder: 'rubicon',
  requestTimestamp: 1726683129999,
  metrics: {},
  responseTimestamp: 1726683130042,
  bidder: 'rubicon',
  adUnitCode: 'div-gpt-ad-1722450005575-0',
  timeToRespond: 43,
  pbLg: '1.50',
  pbMg: '1.50',
  pbHg: '1.59',
  pbAg: '1.55',
  pbDg: '1.59',
  pbCg: '',
  size: '300x250',
  latestTargetedAuctionId: 'e4b50c47-d3d2-431e-a23a-1d346368163e',
  status: 'rendered',
  params: [
    {
      accountId: 11740,
      siteId: 123,
      zoneId: 456
    }
  ]
}

const ADUNIT_PBS = {
  code: 'div-gpt-ad-1722450005575-0',
  mediaTypes: {
    banner: {
      sizes: [
        [
          300,
          250
        ]
      ]
    }
  },
  bids: [
    {
      bidder: 'rubicon',
      params: {
        accountId: 11740,
        siteId: 123,
        zoneId: 456
      }
    }
  ],
  ortb2Imp: {
    ext: {
      data: {
        placement: 'placement-1',
        divId: 'div-gpt-ad-1722450005575-0',
        adg_rtd: {
          adunit_position: '8x117'
        }
      },
      tid: '9dfa53ee-b804-47b8-936b-876ed9b4fd29'
    }
  },
  sizes: [
    [
      300,
      250
    ]
  ],
  adUnitId: '43474f58-d2f7-439b-bef3-8c594c0befe5',
  transactionId: '9dfa53ee-b804-47b8-936b-876ed9b4fd29'
}

const PBS_AUCTION_MOCK = {
  auction_init: {
    auctionId: 'e4b50c47-d3d2-431e-a23a-1d346368163e',
    timestamp: 1726683129997,
    auctionStatus: 'inProgress',
    adUnits: [ADUNIT_PBS],
    adUnitCodes: [
      'div-gpt-ad-1722450005575-0'
    ],
    bidderRequests: [REQUEST_PBS],
    noBids: [],
    bidsReceived: [],
    bidsRejected: [],
    winningBids: [],
    timeout: 1000,
    metrics: {},
    seatNonBids: []
  },
  bid_response: BID_PBS,
  pbs_analytics: {
    atag: [
      {
        stage: 'auction-response',
        module: 'adg-pba',
        pba: {
          'div-gpt-ad-1722450005575-0': {
            st_id: '53',
            splt_cs_id: '731'
          }
        }
      }
    ],
    auctionId: 'e4b50c47-d3d2-431e-a23a-1d346368163e',
    requestedBidders: [
      'rubicon'
    ],
    response: BID_PBS,
    adapterMetrics: {}
  },
  auction_end: {
    auctionId: 'e4b50c47-d3d2-431e-a23a-1d346368163e',
    timestamp: 1726683129997,
    auctionEnd: 1726683130043,
    auctionStatus: 'completed',
    adUnits: [ADUNIT_PBS],
    adUnitCodes: [
      'div-gpt-ad-1722450005575-0'
    ],
    bidderRequests: [REQUEST_PBS],
    noBids: [],
    bidsReceived: [BID_PBS],
    bidsRejected: [],
    winningBids: [],
    timeout: 1000,
    metrics: {},
    seatNonBids: []
  },
  bid_won: BID_PBS
}

/*
PBA beacons corresponding to the PBS fixtures.

 {
	"GET": {
		"scheme": "https",
		"host": "c.4dex.io",
		"filename": "/pba.gif",
		"query": {
			"org_id": "1015",
			"site": "62739-elplacerdelalectura-com",
			"v": "1",
			"pbjsv": "9.14.0-pre",
			"pv_id": "96cccb6f-2f21-4116-b494-06211058a8ea",
			"auct_id": "7e061afa-857b-4de2-bd7b-afb2a183189a",
			"adu_code": "div-gpt-ad-1722450005575-0",
			"url_dmn": "elplacerdelalectura.com",
			"mts": "ban",
			"ban_szs": "300x250",
			"bdrs": "rubicon",
			"pgtyp": "my-pagetype",
			"plcmt": "placement-1",
			"s_id": "6f17f81d-3ab4-414e-832d-7afa25bbce40",
			"s_new": "true",
			"bdrs_src": "s2s",
			"bdrs_code": "rubicon"
		},
		"remote": {
			"Address": "35.241.34.106:443"
		}
	}
}

 {
	"GET": {
		"scheme": "https",
		"host": "c.4dex.io",
		"filename": "/pba.gif",
		"query": {
			"org_id": "1015",
			"site": "62739-elplacerdelalectura-com",
			"v": "2",
			"pbjsv": "9.14.0-pre",
			"pv_id": "96cccb6f-2f21-4116-b494-06211058a8ea",
			"auct_id": "7e061afa-857b-4de2-bd7b-afb2a183189a",
			"adu_code": "div-gpt-ad-1722450005575-0",
			"url_dmn": "elplacerdelalectura.com",
			"mts": "ban",
			"ban_szs": "300x250",
			"bdrs": "rubicon",
			"pgtyp": "my-pagetype",
			"plcmt": "placement-1",
			"s_id": "6f17f81d-3ab4-414e-832d-7afa25bbce40",
			"s_new": "true",
			"bdrs_src": "s2s",
			"bdrs_code": "rubicon",
			"e_st_id": "53",
			"e_splt_cs_id": "731",
			"bdrs_bid": "1",
			"bdrs_cpm": "1.594",
			"dom_i": "173"
		},
		"remote": {
			"Address": "35.241.34.106:443"
		}
	}
}

 {
	"GET": {
		"scheme": "https",
		"host": "c.4dex.io",
		"filename": "/pba.gif",
		"query": {
			"org_id": "1015",
			"site": "62739-elplacerdelalectura-com",
			"v": "3",
			"pbjsv": "9.14.0-pre",
			"pv_id": "96cccb6f-2f21-4116-b494-06211058a8ea",
			"auct_id": "7e061afa-857b-4de2-bd7b-afb2a183189a",
			"adu_code": "div-gpt-ad-1722450005575-0",
			"url_dmn": "elplacerdelalectura.com",
			"mts": "ban",
			"ban_szs": "300x250",
			"bdrs": "rubicon",
			"pgtyp": "my-pagetype",
			"plcmt": "placement-1",
			"s_id": "6f17f81d-3ab4-414e-832d-7afa25bbce40",
			"s_new": "true",
			"bdrs_src": "s2s",
			"bdrs_code": "rubicon",
			"e_st_id": "53",
			"e_splt_cs_id": "731",
			"bdrs_bid": "1",
			"bdrs_cpm": "1.594",
			"dom_i": "173",
			"dom_c": "2050",
			"loa_e": "2051",
			"win_bdr": "rubicon",
			"win_mt": "ban",
			"win_ban_sz": "300x250",
			"win_net_cpm": "1.594",
			"win_og_cpm": "undefined"
		},
		"remote": {
			"Address": "35.241.34.106:443"
		}
	}
}
*/

describe('adagio analytics adapter', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    sandbox.stub(events, 'getEvents').returns([]);

    sandbox.stub(prebidGlobal, 'getGlobal').returns({
      installedModules: ['adagioRtdProvider', 'rtdModule'],
      convertCurrency: (cpm, from, to) => {
        const convKeys = {
          'GBP-EUR': 0.7,
          'EUR-GBP': 1.3,
          'USD-EUR': 0.8,
          'EUR-USD': 1.2,
          'USD-GBP': 0.6,
          'GBP-USD': 1.6,
        };
        return cpm * (convKeys[`${from}-${to}`] || 1);
      }
    });

    _internal.getAdagioNs().pageviewId = 'a68e6d70-213b-496c-be0a-c468ff387106';

    adapterManager.registerAnalyticsAdapter({
      code: 'adagio',
      adapter: adagioAnalyticsAdapter
    });
  });

  afterEach(() => {
    _internal.getAdagioNs().queue = [];
    sandbox.restore();
  });

  describe('track', () => {
    beforeEach(() => {
      adapterManager.enableAnalytics({
        provider: 'adagio',
        options: {
          organizationId: '1001',
          site: 'test-com',
        }
      });
      adapterManager.aliasRegistry['anotherWithAlias'] = 'another';
    });

    afterEach(() => {
      adagioAnalyticsAdapter.disableAnalytics();
      delete adapterManager.aliasRegistry['anotherWithAlias'];
    });

    it('builds and sends auction data', () => {
      events.emit(EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT.another);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.adagio);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.another);
      events.emit(EVENTS.AUCTION_END, MOCK.AUCTION_END.another);
      events.emit(EVENTS.BID_WON, MOCK.BID_WON.another);
      events.emit(EVENTS.AD_RENDER_SUCCEEDED, MOCK.AD_RENDER_SUCCEEDED.another);

      expect(server.requests.length).to.equal(5, 'requests count');
      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[0].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('1');
        expect(search.pbjsv).to.equal('$prebid.version$');
        expect(search.s_id).to.equal(SESSION_ID);
        expect(search.auct_id).to.equal(RTD_AUCTION_ID);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.org_id).to.equal('1001');
        expect(search.site).to.equal('test-com');
        expect(search.pv_id).to.equal('a68e6d70-213b-496c-be0a-c468ff387106');
        expect(search.url_dmn).to.equal(window.location.hostname);
        expect(search.pgtyp).to.equal('article');
        expect(search.plcmt).to.equal('pave_top');
        expect(search.mts).to.equal('ban');
        expect(search.ban_szs).to.equal('640x100,640x480');
        expect(search.bdrs).to.equal('adagio,another,anotherWithAlias,nobid');
        expect(search.bdrs_code).to.equal('adagio,another,another,nobid');
        expect(search.adg_mts).to.equal('ban');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[1].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('1');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[2].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('2');
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.e_sid).to.equal('42');
        expect(search.e_pba_test).to.equal('true');
        expect(search.bdrs_bid).to.equal('1,1,0,0');
        expect(search.bdrs_cpm).to.equal('1.42,2.052,,');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[3].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('2');
        expect(search.auct_id).to.equal(RTD_AUCTION_ID);
        expect(search.adu_code).to.equal('/19968336/footer-bid-tag-1');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[4].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('3');
        expect(search.auct_id).to.equal(RTD_AUCTION_ID);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.win_bdr).to.equal('another');
        expect(search.win_mt).to.equal('ban');
        expect(search.win_ban_sz).to.equal('728x90');
        expect(search.win_net_cpm).to.equal('2.052');
        expect(search.win_og_cpm).to.equal('2.592');
      }
    });

    it('builds and sends auction data with a cached bid win', () => {
      events.emit(EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT.bidcached);
      events.emit(EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT.another);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.adagio);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.another);
      events.emit(EVENTS.AUCTION_END, MOCK.AUCTION_END.another_nobid);
      events.emit(EVENTS.BID_WON, MOCK.BID_WON.bidcached);
      events.emit(EVENTS.AD_RENDER_FAILED, MOCK.AD_RENDER_FAILED.bidcached);

      expect(server.requests.length).to.equal(8, 'requests count');
      {
        // the first request is getting cached we expect to see its auction id later when it's re-used
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[0].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('1');
        expect(search.pbjsv).to.equal('$prebid.version$');
        expect(search.auct_id).to.equal(RTD_AUCTION_ID_CACHE);
        expect(search.s_id).to.equal(SESSION_ID);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.org_id).to.equal('1001');
        expect(search.site).to.equal('test-com');
        expect(search.pv_id).to.equal('a68e6d70-213b-496c-be0a-c468ff387106');
        expect(search.url_dmn).to.equal(window.location.hostname);
        expect(search.pgtyp).to.equal('article');
        expect(search.plcmt).to.equal('pave_top');
        expect(search.mts).to.equal('ban');
        expect(search.ban_szs).to.equal('640x100,640x480');
        expect(search.bdrs).to.equal('adagio,another');
        expect(search.bdrs_code).to.equal('adagio,another');
        expect(search.adg_mts).to.equal('ban');
        expect(search.t_n).to.equal('test');
        expect(search.t_v).to.equal('version');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[1].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('1');
        expect(search.pbjsv).to.equal('$prebid.version$');
        expect(search.auct_id).to.equal(RTD_AUCTION_ID_CACHE);
        expect(search.adu_code).to.equal('/19968336/footer-bid-tag-1');
        expect(search.org_id).to.equal('1001');
        expect(search.site).to.equal('test-com');
        expect(search.pv_id).to.equal('a68e6d70-213b-496c-be0a-c468ff387106');
        expect(search.url_dmn).to.equal(window.location.hostname);
        expect(search.pgtyp).to.equal('article');
        expect(search.plcmt).to.equal('pave_top');
        expect(search.mts).to.equal('ban');
        expect(search.ban_szs).to.equal('640x480');
        expect(search.bdrs).to.equal('another');
        expect(search.bdrs_code).to.equal('another');
        expect(search.adg_mts).to.not.exist;
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[2].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('1');
        expect(search.pbjsv).to.equal('$prebid.version$');
        expect(search.auct_id).to.equal(RTD_AUCTION_ID);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.org_id).to.equal('1001');
        expect(search.site).to.equal('test-com');
        expect(search.pv_id).to.equal('a68e6d70-213b-496c-be0a-c468ff387106');
        expect(search.url_dmn).to.equal(window.location.hostname);
        expect(search.pgtyp).to.equal('article');
        expect(search.plcmt).to.equal('pave_top');
        expect(search.mts).to.equal('ban');
        expect(search.ban_szs).to.equal('640x100,640x480');
        expect(search.bdrs).to.equal('adagio,another,anotherWithAlias,nobid');
        expect(search.bdrs_code).to.equal('adagio,another,another,nobid');
        expect(search.adg_mts).to.equal('ban');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[3].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('1');
        expect(search.auct_id).to.equal(RTD_AUCTION_ID);
        expect(search.adu_code).to.equal('/19968336/footer-bid-tag-1');
        expect(search.pv_id).to.equal('a68e6d70-213b-496c-be0a-c468ff387106');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[4].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('2');
        expect(search.auct_id).to.equal(RTD_AUCTION_ID);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.e_sid).to.equal('42');
        expect(search.e_pba_test).to.equal('true');
        expect(search.bdrs_bid).to.equal('0,0,0,0');
        expect(search.bdrs_cpm).to.equal(',,,');
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[5].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('2');
        expect(search.auct_id).to.equal(RTD_AUCTION_ID);
        expect(search.adu_code).to.equal('/19968336/footer-bid-tag-1');
        expect(search.rndr).to.not.exist;
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[6].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('3');
        expect(search.auct_id).to.equal(RTD_AUCTION_ID);
        expect(search.auct_id_c).to.equal(RTD_AUCTION_ID_CACHE);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.win_bdr).to.equal('adagio');
        expect(search.win_mt).to.equal('ban');
        expect(search.win_ban_sz).to.equal('728x90');
        expect(search.win_net_cpm).to.equal('1.42');
        expect(search.win_og_cpm).to.equal('1.42');
        expect(search.rndr).to.not.exist;
      }

      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[7].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.v).to.equal('4');
        expect(search.auct_id).to.equal(RTD_AUCTION_ID);
        expect(search.auct_id_c).to.equal(RTD_AUCTION_ID_CACHE);
        expect(search.adu_code).to.equal('/19968336/header-bid-tag-1');
        expect(search.win_bdr).to.equal('adagio');
        expect(search.win_mt).to.equal('ban');
        expect(search.win_ban_sz).to.equal('728x90');
        expect(search.win_net_cpm).to.equal('1.42');
        expect(search.win_og_cpm).to.equal('1.42');
        expect(search.rndr).to.equal('0');
      }
    });

    it('send an "empty" cpm when adserver currency != USD and convertCurrency() is undefined', () => {
      sandbox.restore();
      sandbox.stub(prebidGlobal, 'getGlobal').returns({
        installedModules: ['adagioRtdProvider', 'rtdModule']
      });

      events.emit(EVENTS.AUCTION_INIT, MOCK.AUCTION_INIT.another);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.adagio);
      events.emit(EVENTS.BID_RESPONSE, MOCK.BID_RESPONSE.another);
      events.emit(EVENTS.AUCTION_END, MOCK.AUCTION_END.another);
      events.emit(EVENTS.BID_WON, MOCK.BID_WON.another);
      events.emit(EVENTS.AD_RENDER_SUCCEEDED, MOCK.AD_RENDER_SUCCEEDED.another);

      expect(server.requests.length).to.equal(5, 'requests count');

      // fail to compute bidder cpm and send an "empty" cpm
      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[2].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');
        expect(search.s_id).to.equal(SESSION_ID);
        expect(search.v).to.equal('2');
        expect(search.e_sid).to.equal('42');
        expect(search.e_pba_test).to.equal('true');
        expect(search.bdrs_bid).to.equal('1,1,0,0');
        expect(search.bdrs_cpm).to.equal('1.42,,,');
      }
    });

    it('builds and sends PBS auction data', () => {
      events.emit(EVENTS.AUCTION_INIT, PBS_AUCTION_MOCK.auction_init);
      events.emit(EVENTS.BID_RESPONSE, PBS_AUCTION_MOCK.bid_response);
      events.emit(EVENTS.PBS_ANALYTICS, PBS_AUCTION_MOCK.pbs_analytics);
      events.emit(EVENTS.AUCTION_END, PBS_AUCTION_MOCK.auction_end);
      events.emit(EVENTS.BID_WON, PBS_AUCTION_MOCK.bid_won);

      expect(server.requests.length).to.equal(3, 'requests count');
      {
        const { protocol, hostname, pathname, search } = utils.parseUrl(server.requests[0].url);
        expect(protocol).to.equal('https');
        expect(hostname).to.equal('c.4dex.io');
        expect(pathname).to.equal('/pba.gif');

        expect(search.v).to.equal('1');
        expect(search.e_st_id).to.be.undefined;
        expect(search.e_splt_cs_id).to.be.undefined;
      }

      {
        const { search } = utils.parseUrl(server.requests[1].url);

        expect(search.v).to.equal('2');

        expect(search.e_st_id).to.equal('53');
        expect(search.e_splt_cs_id).to.equal('731');
      }

      {
        const { search } = utils.parseUrl(server.requests[2].url);

        expect(search.v).to.equal('3');

        expect(search.e_st_id).to.equal('53');
        expect(search.e_splt_cs_id).to.equal('731');
      }
    });
  });
});
