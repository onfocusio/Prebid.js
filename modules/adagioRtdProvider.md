# Overview

<b>Module Name</b>: Adagio Rtd Provider
<br/>
<b>Module Type</b>: Rtd Provider

# Description

RTD provider for adagio.io. Contact Adagio for more information.

## Building Prebid with Real-time Data Support

First, make sure to add the Adagio submodule to your Prebid.js package with:

`gulp build --modules=rtdModule,adadgioRtdProvider`

The following configuration parameters are available:

``` javascript
pbjs.setConfig(
    ...
    realTimeData: {
        auctionDelay: 5000,
        dataProviders: [
            {
                name: "adagioRtd",
                waitForIt: true,
                params: {
                    adServer: 'gam',
                    organizationId: 1010 // Set your organization ID
                }
            }
        ]
    }
    ...
}
```

### Adagio RTD Module Configuration Object

| Param under dataProviders | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `"im"` |
| waitForIt | Optional | Boolean | Required to ensure that the auction is delayed until prefetch is complete. Defaults to false but recommended to true | `true` |
| params | Required | Object | Details of module params. | |
| params.organizationId | Required | Number | Your organization ID, obtained via Adagio. | `1010` |
| params.adServer | Optional | String | This sets your adserver GPT/GAM. | `gam` |
