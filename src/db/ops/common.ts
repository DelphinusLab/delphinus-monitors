import BN from "bn.js";
import SubstrateDBConfig from "../../../config/substrate-db.json"
const MongoClient = require("mongodb")

export function dataToBN(data: any) {
  return new BN(data.toHex().replace(/0x/, ""), 16);
}

async function _writeDB(
  collection: string,
  doc: any
) {
//  const url = "mongodb+srv://" + SubstrateDBConfig.username + ":" + SubstrateDBConfig.password + 
//    "@" + SubstrateDBConfig.hostname + ":" + SubstrateDBConfig.port;
  const url = "mongodb://localhost:27017/";
  console.log(url);

  const client = MongoClient.connect(url, {useUnifiedTopology: true}, (err:any, client:any) => {
    if (err) throw err;

    const database = client.db(SubstrateDBConfig.database);
    const col = database.collection(collection);
    col.insertOne(doc);
  })
}

export async function writeDB(
  collection: string,
  doc: any
) {
  return _writeDB(collection, doc).catch(err => console.log(err))
}
