const fetch = require('node-fetch')
const debug = require('debug')

const log = debug('aggrigator:provider')

module.exports = class OracleProvider {
  constructor (source) {
    this.name = source.name
    this.url = source.url
    this.selector = source.selector
    this.invert = source.invert
  }

  async getJSON (endpoint) {
    const call = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; Charset=UTF-8'
      },
      redirect: 'follow',
      follow: 3,
      timeout: 5000
    })
    return await call.json()
  }

  async delay (delayMs) {
    return await new Promise(resolve => {
      setTimeout(resolve, Number(delayMs))
    })
  }

  async getWithTimeout (timeoutMs) {
    return await Promise.race([
      this.get(),
      this.delay(timeoutMs)
    ])
  }

  async getMultiple (count = 5, delayMs = 1000, timeoutMs = 3000) {
    return (await Array(Number(count)).fill('').reduce(async Arr => {
      ;(await Arr).push(await (async () => {
        await this.delay(delayMs)
        return await this.getWithTimeout(timeoutMs)
      })())
      return await Arr
    }, [])).filter(r => r !== undefined)
  }

  async get () {
    try {
      const data = await this.getJSON(this.url)
      const selectedElement = this.parse(data, this.selector)
      log(`Parsing ${this.name}, result: ${selectedElement}`)
      if (this.invert) {
        return 1/selectedElement  
      }
      return selectedElement
      
    } catch (e) {
      log('Error', e.message)
      return undefined
    }
  }

  parse(data, selector) {
    if (selector == null)  { return } 
    if (data == null) { return }
    let value = eval(selector)

    
    log('selector: ' + `${selector}`)
    return Number(value) || undefined
  }
}
