'use strict'

import dotenv from 'dotenv'
import axios from 'axios'
import debug from 'debug'
import stats from 'stats-analysis'
import fs from 'fs' 
import path from 'path'
import OracleProvider from './providers/OracleProvider.js'

const Providers = {
  instances: {}
}

const log = debug('aggrigator:main')

export default (async (group = 'fancy') => {
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
  log('Providers')
  log(Providers)


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
})()