import { flags, Command } from '@oclif/command'
import Listr from 'listr'
import * as Environment from '../../utils/environment-tasks'
import * as Process from '../../utils/process'
import * as Runner from '../../utils/runner'
import version from '../../version'
import LCDClient from '@mesg/api'
import { IProcess } from '@mesg/api/lib/process'

const ipfsClient = require('ipfs-http-client')

export default class Dev extends Command {
  static description = 'Run a process in a local development environment'

  static flags = {
    version: flags.string({ name: 'Engine version', default: version.engine }),
    pull: flags.boolean({ name: 'Force to pull the docker image', default: false }),
    env: flags.string({
      description: 'Environment variables to inject to the process',
      multiple: true,
      helpValue: 'FOO=BAR'
    })
  }

  static args = [{
    name: 'PROCESS_FILE',
    description: 'Path of a process file'
  }]

  private lcdEndpoint = 'http://localhost:1317'
  private lcd = new LCDClient(this.lcdEndpoint)
  private ipfsClient = ipfsClient('ipfs.app.mesg.com', '5001', { protocol: 'http' })

  async run() {
    const { args, flags } = this.parse(Dev)

    let compilation: Process.CompilationResult
    let deployedProcess: IProcess

    const tasks = new Listr<Environment.IStart>([
      Environment.start,
      {
        title: 'Compiling process',
        task: async ctx => {
          compilation = await Process.compile(args.PROCESS_FILE, this.ipfsClient, this.lcd, this.lcdEndpoint, ctx.mnemonic, flags.env)
        }
      },
      {
        title: 'Creating process',
        task: async ctx => {
          deployedProcess = await Process.create(this.lcd, compilation.definition, ctx.mnemonic)
        }
      },
      // {
      //   title: 'Fetching process\'s logs',
      //   task: () => {
      //     this.logs = this.grpc.execution.stream({
      //       filter: {
      //         statuses: [
      //           ExecutionStatus.COMPLETED,
      //           ExecutionStatus.FAILED
      //         ]
      //       }
      //     })
      //   }
      // }
    ])
    const { mnemonic } = await tasks.run({
      configDir: this.config.dataDir,
      pull: flags.pull,
      version: flags.version,
      endpoint: this.lcdEndpoint,
    })

    // this.logs
    //   .on('error', (error: Error) => { this.warn('Result stream error: ' + error.message) })
    //   .on('data', (execution) => {
    //     if (!execution.processHash) return
    //     if (!execution.instanceHash) return
    //     if (base58.encode(execution.processHash) !== deployedProcess.hash) return
    //     const prefix = `[${execution.nodeKey}] - ${base58.encode(execution.instanceHash)} - ${execution.taskKey}`
    //     if (execution.error) {
    //       this.log(`${prefix}: ` + chalk.red('ERROR:', execution.error))
    //     }
    //     if (!execution.outputs) return
    //     return this.log(prefix +
    //       '\n\tinputs:  ' + chalk.gray(JSON.stringify(decode(execution.inputs || {}))) +
    //       '\n\toutputs: ' + chalk.gray(JSON.stringify(decode(execution.outputs || {}))) +
    //       '\n')
    //   })

    process.once('SIGINT', async () => {
      await new Listr<Environment.IStop>([
        // {
        //   title: 'Stopping logs',
        //   task: () => {
        //     if (this.logs) this.logs.cancel()
        //   }
        // },
        {
          title: 'Deleting process',
          task: async () => {
            if (deployedProcess) await Process.remove(this.lcd, deployedProcess, mnemonic)
          }
        },
        {
          title: 'Stopping services',
          task: async () => {
            for (const runner of compilation.runners) {
              await Runner.stop(this.lcdEndpoint, mnemonic, runner.hash)
            }
          }
        },
        Environment.stop
      ]).run({
        configDir: this.config.dataDir
      })
    })
  }
}
