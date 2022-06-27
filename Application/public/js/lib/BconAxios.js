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
    await this.run()
    return Promise.resolve(this.request.response)
  }

  async post(url, config) {}

  async run() {
    this.request.onreadystatechange = async () => {
      if (this.request.readyState === this.request.DONE) {
        this.callback(this.request.response)
      }
    }
    this.request.send(JSON.stringify(this.config.body))
  }

  async callback(response) {
    this.response = Promise.resolve(response)
  }
}

const createInstance = () => {
  return new BconAxios()
}

export default createInstance()
