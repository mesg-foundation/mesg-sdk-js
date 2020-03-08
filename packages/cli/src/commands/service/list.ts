import cli from 'cli-ux'
import {IInstance} from '@mesg/api/lib/instance-lcd'
import * as base58 from '@mesg/api/lib/util/base58'

import Command from '../../root-command'

export default class ServiceList extends Command {
  static description = 'List running services'

  static flags = {
    ...Command.flags,
    ...cli.table.flags()
  }

  async run(): Promise<IInstance[]> {
    const {flags} = this.parse(ServiceList)
    const [services, instances, {runners}] = await Promise.all([
      this.lcd.service.list(),
      this.lcd.instance.list(),
      this.api.runner.list({}),
    ])
    cli.table(services, {
      hash: {header: 'HASH', get: srv => srv.hash},
      sid: {header: 'SID', get: srv => srv.sid},
      instances: {
        header: 'INSTANCES',
        get: srv => (instances || [])
          .filter(inst => inst.serviceHash === srv.hash)
          .map(inst => [
            inst.hash,
            (runners || [])
              .filter(run => base58.encode(run.instanceHash) === inst.hash)
              .reduce((p, _, i) => p + (i > 0 ? '\n' : ''), '')
          ].join(''))
        .join('\n'),
      },
      runners: {
        header: 'RUNNERS',
        get: srv => (instances || [])
          .filter(inst => inst.serviceHash === srv.hash)
          .map(inst => (runners || [])
            .filter(run => base58.encode(run.instanceHash) === inst.hash)
            .map(run => base58.encode(run.hash))
            .join('\n'),
          )
          .join('\n'),
      }
    }, {printLine: this.log, ...flags})
    return instances || []
  }
}
