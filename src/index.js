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
  constructor(url, group = 'basic') {
    if ('url' == null) {
      log('No callback URL provided exiting.')
      return
    }
    Object.assign(this, {
      async run() {
        const start = new Date()
        dotenv.config()

        const Providers = {
          instances: {}
        }

        log('AGGRIGATOR_PROVIDER_URL: ' + url)
        let { data } = await axios.get(url)
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

        let results = await Promise.all(Object.keys(Providers.instances).map(async name => {
          log(`  - Getting from ${name}, calls: ${config.call}, delay ${config.delay}`)
          const data = await Providers.instances[name].getMultiple(
            Number(config.call),
            Number(config.delay) * 1000
          )
          log(`     - Got data from ${name}`)
          return data
        }))

        const meta = {
          'type': config.type,
          'symbol': config.symbol,
          'executeTime': new Date() - start 
        }

        // check we have data        
        const temp = []
        for (var i = 0; i < results.length; i++) {
          if (results[i].length > 0) {
            temp.push(results[i])
          }
        }
        results = temp
        if (results.length == 0) { return { ...meta } }


        const rawResultsNamed = results.reduce((a, b, i) => {
          Object.assign(a, {
            [Object.keys(Providers.instances)[i]]: b
          })
          return a
        }, {})
        
        const rawResults = results.reduce((a, b) => a.concat(b), [])
        const rawMedian = stats.median(rawResults)
        let rawStdev = stats.stdev(rawResults) * 1

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
        const filteredResults = this.reduce(rawResults, rawMedian, rawStdev) //rawResults.filter(r => (Math.abs( (r - rawMedian).toFixed(7) )).toFixed(7) < rawStdev)
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
          ...filtered,
          ...meta
        }
      },
      reduce(rawResults, rawMedian, rawStdev) {
        const result = []
        for (var i = rawResults.length - 1; i >= 0; i--) {
          if (Math.abs(rawResults[i] - rawMedian) <= rawStdev) {
            result.push(rawResults[i])
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
