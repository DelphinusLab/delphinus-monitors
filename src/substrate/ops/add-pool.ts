import BN from "bn.js";
import { dataToBN } from "./common";
import { runZkp } from "delphinus-zkp/src/business/main";
import { Field } from "../../../../delphinus-curves/src/field";
import {
  CommandOp,
  L2Storage,
} from "../../../../delphinus-zkp/src/business/command";

export async function handleAddPoolPendingOps(
  rid: string,
  asAddPool: any[],
  storage: L2Storage
) {
  let cursor = 0;
  const tokenIndex0 = dataToBN(asAddPool[cursor++]);
  const tokenIndex1 = dataToBN(asAddPool[cursor++]);
  const poolIndex = dataToBN(asAddPool[cursor++]);

  await runZkp(
    new Field(CommandOp.AddPool),
    [tokenIndex0, tokenIndex1, poolIndex].map((x) => new Field(x)),
    storage
  );
}

export async function handleAddPoolEvent(data: any[], storage: L2Storage) {
  let cursor = 0;
  const rid = dataToBN(data[cursor++]);
  const tokenIndex0 = dataToBN(data[cursor++]);
  const tokenIndex1 = dataToBN(data[cursor++]);
  const poolIndex = dataToBN(data[cursor++]);

  await runZkp(
    new Field(CommandOp.AddPool),
    [tokenIndex0, tokenIndex1, poolIndex].map((x) => new Field(x)),
    storage
  );
}
