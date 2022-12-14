class BconAxios {
  constructor() {
    this.request = new XMLHttpRequest()
    this.config = {}
    this.response = null
  }

  async get(url, config) {
    this.request.open('GET', url, true)
    if (config?.headers) {
      for (const prop in config.headers) {
        this.request.setRequestHeader(prop, config.headers[prop])
      }
    }
    return this.run()
  }

  async run() {
    return new Promise((resolve, reject) => {
      this.request.onload = () => {
        if (this.request.readyState === this.request.DONE) {
          resolve({ status: this.request.status, data: this.request.response })
        }
      }
      this.request.send(JSON.stringify(this.config.body))
    })
  }
}

const createInstance = () => {
  return new BconAxios()
}

export default createInstance()
