import BN from "bn.js";
import { dataToBN } from "./common";
import { runZkp } from "delphinus-zkp/src/business/main";
import { Field } from "../../../../delphinus-curves/src/field";
import {
  CommandOp,
  L2Storage,
} from "../../../../delphinus-zkp/src/business/command";

export async function handleAddTokenPendingOps(
  rid: string,
  asAddToken: any[],
  storage: L2Storage
) {
  let cursor = 0;
  const tokenAddress = dataToBN(asAddToken[cursor++]);
  const tokenIndex = dataToBN(asAddToken[cursor++]);

  await runZkp(
    new Field(CommandOp.AddToken),
    [tokenAddress, tokenIndex].map((x) => new Field(x)),
    storage
  );
}

export async function handleAddTokenEvent(data: any[], storage: L2Storage) {
  let cursor = 0;
  const rid = dataToBN(data[cursor++]);
  const tokenAddress = dataToBN(data[cursor++]);
  const tokenIndex = dataToBN(data[cursor++]);

  // TODO
  await runZkp(
    new Field(CommandOp.AddToken),
    [tokenAddress, tokenIndex].map((x) => new Field(x)),
    storage
  );
}
