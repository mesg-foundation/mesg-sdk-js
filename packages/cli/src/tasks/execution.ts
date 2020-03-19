import { ListrTask } from "listr";
import ServiceType from "@mesg/api/lib/typedef/service";
import { IRunner } from "@mesg/api/lib/runner-lcd";
import ExecutionType from "@mesg/api/lib/typedef/execution";
import * as base58 from "@mesg/api/lib/util/base58";
import Application from "@mesg/application";
import { IExecution } from "@mesg/api/lib/execution";
import GRPCAPI from "@mesg/api";
import { Stream as GRPCStream } from "@mesg/api/lib/util/grpc";
import { ExecutionStatus } from "@mesg/api/lib/types";

export type IConvertInput = { task: ServiceType.mesg.types.Service.ITask, data: { [key: string]: any }, app: Application, inputs?: ExecutionType.mesg.protobuf.IStruct }
export const convertInput: ListrTask<IConvertInput> = {
  title: 'Converting inputs',
  task: ctx => {
    const convert = (type: 'Object' | 'String' | 'Boolean' | 'Number' | 'Any', value: string | any): any => {
      return {
        Object: (x: string | any) => typeof x === 'string' ? JSON.parse(x) : x,
        String: (x: string) => x,
        Boolean: (x: string) => ['true', 't', 'TRUE', 'T', '1'].includes(x),
        Number: (x: string) => parseFloat(x),
        Any: (x: string) => x,
      }[type](value)
    }
    const result = (ctx.task.inputs || [])
      .filter((x: any) => ctx.data[x.key] !== undefined && ctx.data[x.key] !== null)
      .reduce((prev: any, value: any) => ({
        ...prev,
        [value.key]: convert(value.type, ctx.data[value.key])
      }), {})
    ctx.inputs = ctx.app.encodeData(result || {})
  }
}

export type IExecute = { runner: IRunner, tags: string[], taskKey: string, inputs: ExecutionType.mesg.protobuf.IStruct, eventHash: string, app: Application, result?: IExecution }
export const execute: ListrTask<IExecute> = {
  title: 'Executing task',
  task: async (ctx: IExecute) => {
    ctx.result = await ctx.app.executeTaskAndWaitResult({
      eventHash: base58.decode(ctx.eventHash),
      executorHash: base58.decode(ctx.runner.hash),
      inputs: ctx.inputs,
      tags: ctx.tags,
      taskKey: ctx.taskKey
    })
  }
}

export type ILog = { grpc: GRPCAPI, executionStream?: GRPCStream<IExecution> }
export const log: ListrTask<ILog> = {
  title: 'Fetching executions\' logs',
  task: (ctx) => {
    ctx.executionStream = ctx.grpc.execution.stream({
      filter: {
        statuses: [
          ExecutionStatus.COMPLETED,
          ExecutionStatus.FAILED
        ]
      }
    })
  }
}

export type ILogsStop = { executionStream: GRPCStream<IExecution> }
export const logsStop: ListrTask<ILogsStop> = {
  title: 'Stopping fetching execution\'s logs',
  task: (ctx) => ctx.executionStream.cancel()
}
