'use strict'

const dotenv = require('dotenv')
const axios = require('axios')
const debug = require('debug')
const stats = require('stats-analysis')
const fs = require('fs')
const path = require('path')
const OracleProvider = require('./providers/OracleProvider.js')

const Providers = {
  instances: {}
}

const log = debug('aggrigator:main')

class aggrigator {
  constructor(group = 'fancy') {

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
        if (!(group in data.config)) { 
          log(`could not find ${group} key in config JSON`)
          return 
        }

        const config = data.config[group]

        for (var i = data[group].length - 1; i >= 0; i--) {
          const provider = new OracleProvider(data[group][i])
          Providers.instances[provider.name] = provider
        }
        // log('Providers')
        // log(Providers)

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

        const meta = {
          'currency': config.currency,
          'executeTime': new Date() - start 
        }

        return {
          ...raw,
          ...filtered,
          ...meta
        }
      }
    })
  }
}

module.exports = aggrigator

const agg = new aggrigator()
agg.run()
