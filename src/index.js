'use strict'

const debug = require('debug')
const stats = require('stats-analysis')
const fs = require('fs')
const path = require('path')

const OracleProvider = require('./providers/OracleProvider.js')

// const Providers = {
//   class: {Cryptowatch, Bitstamp, Kraken, Bitfinex, Hitbtc, Binance},
//   instances: {}
// }

const log = debug('aggrigator:main')

module.exports = class Aggrigator {

  constructor() {

    let endpoints = null
    const Providers = {
      instances: {}
    }

    Object.assign(this, {
      async fetchData(data, config) {
        log('fetching data')
        
        const results = await Promise.all(Object.keys(Providers.instances).map(async name => {
          log(`  - Getting from ${name}`)
          const data = await Providers.instances[name].getMultiple(
            Number(config.call),
            Number(config.delay) * 1000
          )
          log(`     - Got data from ${name}`)
          return data
        }))

        const rawResultsNamed = results.reduce((a, b, i) => {
          Object.assign(a, {
            [Object.keys(Providers.instances)[i]]: b
          })
          return a
        }, {})
        
        const rawResults = results.reduce((a, b) => a.concat(b), [])
        const rawMedian = stats.median(rawResults)
        const rawStdev = stats.stdev(rawResults)

        const raw = {
          rawResultsNamed,
          rawResults,
          rawMedian,
          rawStdev
        }

        log(raw)

        const filteredResults = rawResults.filter(r => Math.abs(r - rawMedian) < rawStdev)
        const filteredMedian = stats.median(filteredResults)
        const filteredMean = stats.mean(filteredResults)
        
        const filtered = {
          filteredResults,
          filteredMedian,
          filteredMean
        }

        log(filtered)

        return {
          ...raw,
          ...filtered
        }
      },
      async fetchSources(group = 'fancy') {
        try {
          // first load our file then start the server
          const self = this
          fs.readFile(path.join(__dirname + '/providers/sources.json'), (err, data) => {
            if (err) throw err

            const source = JSON.parse(data)
            if (!(group in source)) { 
              log(`could not find ${group} key in JSON`)
              return 
            }
            if (!(group in source.config)) { 
              log(`could not find ${group} key in config JSON`)
              return 
            }

            const config = source.config[group]

            for (var i = source[group].length - 1; i >= 0; i--) {
              const provider = new OracleProvider(source[group][i])
              Providers.instances[provider.name] = provider
            }
            //log(Providers)
            return this.fetchData(Providers, config)
          })
        } catch (error) {
          log(error)
        }
      }
    })
  }
}

// const selectors = 'result.XXRPZUSD.c[0]'
// log(Object.assign([], selectors))


// const agg = new Aggrigator()
// return agg.fetchSources()