import { existsSync, readFileSync, rmdirSync, writeFileSync, unlinkSync } from "fs"
import { safeLoad, safeDump } from "js-yaml"
import { join } from "path"
import { toWords, encode } from 'bech32'
import Account, { bech32Prefix } from "@mesg/api/lib/account"

export type Config = {
  engine: {
    authorized_pubkeys: string[],
    account: {
      mnemonic: string
    }
  }
  mnemonic: string
}

const ENGINE_FILE = 'config.yml'
const CLI_FILE = '.mesgrc'

export const clear = (path: string): void => {
  const rm = rmdirSync as any
  rm(join(path, 'cosmos'), { recursive: true })
  rm(join(path, 'tendermint'), { recursive: true })
  unlinkSync(join(path, ENGINE_FILE))
  unlinkSync(join(path, CLI_FILE))
}

const read = (filepath: string): Config => {
  return existsSync(filepath)
    ? safeLoad(readFileSync(filepath).toString())
    : {}
}

const write = (path: string, config: Config): Config => {
  writeFileSync(join(path, CLI_FILE), safeDump(config))
  writeFileSync(join(path, ENGINE_FILE), safeDump(config.engine))
  return config
}

const hasTestAccount = (path: string): boolean => {
  if (!existsSync(join(path, ENGINE_FILE))) return false
  if (!existsSync(join(path, CLI_FILE))) return false
  const config = read(join(path, CLI_FILE))
  return !!config.mnemonic && !!config.engine.account.mnemonic
}

// https://github.com/forbole/big-dipper/blob/master/imports/startup/server/util.js
const pubKey = (mnemonic: string): string => {
  const publicKey = Account.deriveMnemonic(mnemonic).publicKey
  const pubkeyAminoPrefix = Buffer.from('EB5AE98721', 'hex')
  const buffer = Buffer.alloc(38)
  pubkeyAminoPrefix.copy(buffer, 0)
  Buffer.from(publicKey).copy(buffer, pubkeyAminoPrefix.length)
  return encode(`${bech32Prefix}pub`, toWords(buffer))
}

export const generateConfig = (path: string): Config => {
  if (hasTestAccount(path)) return read(join(path, CLI_FILE))
  const mnemonic = Account.generateMnemonic()
  const config = {
    engine: {
      authorized_pubkeys: [
        pubKey(mnemonic)
      ],
      account: {
        mnemonic: Account.generateMnemonic()
      }
    },
    mnemonic
  }
  return write(path, config)
}