import {flags} from '@oclif/command'
import cli from 'cli-ux'

import Command from '../../service-command'

export default class ServiceDelete extends Command {
  static description = 'Delete one or many services'

  static flags = {
    ...Command.flags,
    all: flags.boolean({description: 'Delete all services'}),
    'keep-data': flags.boolean({description: 'Do not delete services\' persistent data'}),
  }

  static args = [{
    name: 'SERVICE',
    required: true,
    description: 'Hash or Sid'
  }]

  async run() {
    const {args, flags} = this.parse(ServiceDelete)
    if (!flags['keep-data']) {
      cli.warn('This will delete all data associated to this service')
    }
    if (!await cli.confirm('Are you sure?')) return
    cli.action.start(`Delete service ${args.SERVICE}`)
    this.mesg.api.DeleteService({
      serviceID: args.SERVICE,
      deleteData: !flags['keep-data'],
    }, (error: Error) => {
      cli.action.stop()
      if (error) throw error
    })
  }
}
