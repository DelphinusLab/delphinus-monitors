import { CommandOp } from "delphinus-zkp/src/zokrates/command";
import { EventHandler } from "..";

/**
 * Record L2 Event in DB
 */
export async function eventRecorder(rid: string, op: CommandOp, args: any[]) {}

export const handler: EventHandler = {
  eventHandler: eventRecorder,
};
