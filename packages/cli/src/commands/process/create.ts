import {flags} from '@oclif/command'

import Command from '../../root-command'
import {findHash} from '../../utils/txevent'
import {IProcess} from '@mesg/api/lib/process-lcd'

export default class ProcessCreate extends Command {
  static description = 'Create a process'

  static flags = {
    ...Command.flags,
    account: flags.string({
      description: 'Account to use to deploy the service'
    }),
  }

  static args = [{
    name: 'DEFINITION',
    required: true,
    description: 'Process\'s definition. Use process:compile first to build process definition'
  }]

  async run(): Promise<IProcess> {
    const {args, flags} = this.parse(ProcessCreate)
    const definition = JSON.parse(args.DEFINITION) as IProcess
    
    const { account, mnemonic } = await this.getAccount(flags.account)
    this.spinner.start('Create process')

    const tx = await this.lcd.createTransaction(
      [this.lcd.process.createMsg(account.address, definition)],
      account
    )
    const txResult = await this.lcd.broadcast(tx.signWithMnemonic(mnemonic))
    const hash = findHash(txResult, "process", "CreateProcess")
    this.spinner.stop(hash)
    return this.lcd.process.get(hash)
  }
}
