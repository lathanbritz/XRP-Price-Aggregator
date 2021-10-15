'use strict'

const dotenv = require('dotenv')
const axios = require('axios')
const debug = require('debug')
const stats = require('stats-analysis')
const OracleProvider = require('./providers/OracleProvider.js')

const Providers = {
  instances: {}
}

const log = debug('aggrigator:main')

class aggrigator {
  constructor(group = 'btc') {

    Object.assign(this, {
      async run() {
        const start = new Date()
        dotenv.config()

        const Providers = {
          instances: {}
        }
        const aggrigator = process.env.AGGRIGATOR_PROVIDER_URL || 'http://localhost:5000/api/feed/data'
        log('AGGRIGATOR_PROVIDER_URL: ' + aggrigator)
        let { data } = await axios.get(aggrigator)
        if (!(group in data)) { 
          log(`could not find ${group} key in JSON`)
          return 
        }
        if (!('config' in data[group])) { 
          log(`could not find config key in ${group} JSON`)
          return 
        }

        const config = data[group].config

        for (var i = data[group].data.length - 1; i >= 0; i--) {
          const provider = new OracleProvider(data[group].data[i])
          Providers.instances[provider.name] = provider
        }

        const results = await Promise.all(Object.keys(Providers.instances).map(async name => {
          log(`delay ${config.call}`)
          log(`calls ${config.delay}`)
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
        let rawStdev = stats.stdev(rawResults).toFixed(8) * 1

        const raw = {
          rawResultsNamed,
          rawResults,
          rawMedian,
          rawStdev
        }

        log(raw)
        
        // filter fails on a zero value
        if (rawStdev == 0) {
          rawStdev = (0.00000001).toFixed(8)
        }
        const filteredResults = reduce(rawResults, rawMedian, rawStdev) //rawResults.filter(r => (Math.abs( (r - rawMedian).toFixed(7) )).toFixed(7) < rawStdev)
        const filteredMedian = stats.median(filteredResults)
        const filteredMean = stats.mean(filteredResults)

        const filtered = {
          filteredResults,
          filteredMedian,
          filteredMean
        }

        log(filtered)

        const meta = {
          'type': config.type,
          'symbol': config.symbol,
          'executeTime': new Date() - start 
        }

        return {
          ...raw,
          ...filtered,
          ...meta
        }
      },
      reduce(rawResults, rawMedian, rawStdev) {
        const result = []
        for (var i = arr.length - 1; i >= 0; i--) {
          if (Math.abs(arr[i] - rawMedian) < rawStdev) {
            result.push(arr[i])
          }
        }
        //log(result)
        return result
      }
    })
  }
}

module.exports = aggrigator

// const agg = new aggrigator()
// agg.run()
