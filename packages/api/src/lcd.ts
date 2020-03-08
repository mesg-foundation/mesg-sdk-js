import Service from './service-lcd'
import Instance from './instance-lcd'
import Runner from './runner-lcd'

class API {
  service: Service
  instance: Instance
  runner: Runner

  constructor(endpoint: string = "http://localhost:1317") {
    this.service = new Service(endpoint)
    this.instance = new Instance(endpoint)
    this.runner = new Runner(endpoint)
  }
}

export default API;
(module).exports = API;