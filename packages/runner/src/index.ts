import API from '@mesg/api/lib/lcd'
import Account from "@mesg/api/lib/account-lcd"
import { createHash } from 'crypto'
import { ecdsaSign } from "secp256k1"
import { IService } from '@mesg/api/lib/service-lcd'

export type RunnerInfo = {
  hash: string
  instanceHash: string
}

export interface Provider {
  start(service: IService, env: string[], runnerHash: string, instanceHash: string, token: string): Promise<boolean>
  stop(runnerHash: string): Promise<void>
}

export default class Runner {

  private _provider: Provider
  private _api: API
  private _mnemonic: string

  constructor(provider: Provider, endpoint: string, mnemonic: string) {
    this._api = new API(endpoint)
    this._provider = provider
    this._mnemonic = mnemonic
  }

  async start(serviceHash: string, env: string[]): Promise<RunnerInfo> {
    const account = await this._api.account.import(this._mnemonic)
    const service = await this._api.service.get(serviceHash)
    const { runnerHash, instanceHash, envHash } = await this._api.runner.hash(account.address, serviceHash, env)
    const token = this.createRunnerToken(serviceHash, envHash)
    await this._provider.start(service, env, runnerHash, instanceHash, token)
    return {
      instanceHash,
      hash: runnerHash
    }
  }

  async stop(runnerHash: string): Promise<void> {
    const account = await this._api.account.import(this._mnemonic)
    const tx = await this._api.createTransaction(
      [this._api.runner.deleteMsg(account.address, runnerHash)],
      account
    )
    await this._api.broadcast(tx.signWithMnemonic(this._mnemonic), "block")
    await this._provider.stop(runnerHash)
  }

  private createRunnerToken(serviceHash: string, envHash: string): string {
    const value = {
      serviceHash: serviceHash,
      envHash: envHash
    }
    const hash = createHash('sha256')
      .update(JSON.stringify(value))
      .digest('hex')
    const buf = Buffer.from(hash, 'hex')

    const ecdsa = ecdsaSign(buf, Account.getPrivateKey(this._mnemonic))
    const signature = Buffer.from(ecdsa.signature).toString('base64')
    return JSON.stringify({ signature, value })
  }
}
