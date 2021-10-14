# XRP Price Aggregator

Fetches prices from multiple data sources, filters out values based on stdev.
Data providers are called in parallel, after which a number of requests (possibly: retries)
are being executed with a delay per request.

Background info: https://dev.to/wietse/aggregated-xrp-usd-price-info-on-the-xrp-ledger-1087

This project has since extended the original version from Wietse, now data source can simply be feed
to this lib from a JSON source. That makes the source configurable and plug-able on the fly.


## Config

This code looks for environment vars,
See `/.env.sample` for required env. vars, and copy `.env.sample` to `.env`. This simply defines the JSON callback URL.

Most of the configuration of the aggrigator is defined in the JSON this aggrigator consumes now. This would need to be provided at the URL provided. See example below.

```javascript
{
  "basic" : {
    "config": {
      "type": "currency",
      "symbol": "USD",
      "call": 2,
      "delay": 1
    },
    "data": [
      {
        "name": "bitstamp",
        "url": "https://www.bitstamp.net/api/v2/ticker/xrpusd/",
        "selector": "data.last"
      },
      {
        "name": "binance",
        "url": "https://api.binance.com/api/v3/ticker/price?symbol=XRPUSDT",
        "selector": "data.price"
      },
      {
        "name": "bybit",
        "url": "https://api.bybit.com/spot/quote/v1/ticker/price?symbol=XRPUSDT",
        "selector": "data.result.price"
      },
      {
        "name": "kraken",
        "url": "https://api.kraken.com/0/public/Ticker?pair=XRPUSD",
        "selector": "data.result.XXRPZUSD.c[0]"
      } 
    ]
  }
}
```

This project works hand in hand with https://github.com/lathanbritz/XRP-Oracles

## Logging

Run with `DEBUG=oracle*` (prefixed) to read debug output. This is automatically prepended when
running `npm run dev`.

## Output format sample

```javascript
{
  rawResultsNamed: {
    Cryptowatch: [ 0.26108, 0.26108, 0.26108 ],
    Bitstamp: [ 0.26095 ],
    Kraken: [ 0.26108, 0.26108, 0.26108 ],
    Bitfinex: [ 0.26084, 0.26084, 0.26084 ],
    Hitbtc: [ 0.260529, 0.260529, 0.260529 ],
    Binance: [ 0.2605, 0.26059, 0.26051 ]
  },
  rawResults: [
     0.26108,  0.26108,  0.26108,
     0.26095,  0.26108,  0.26108,
     0.26108,  0.26084,  0.26084,
     0.26084, 0.260529, 0.260529,
    0.260529,   0.2605,  0.26059,
     0.26051
  ],
  rawMedian: 0.26084,
  rawStdev: 0.00024097781763835502,
  filteredResults: [
    0.26108, 0.26108,
    0.26108, 0.26095,
    0.26108, 0.26108,
    0.26108, 0.26084,
    0.26084, 0.26084
  ],
  filteredMedian: 0.26108,
  filteredMean: 0.260995
}
```