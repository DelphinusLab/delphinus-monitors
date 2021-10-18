use ethcontract::prelude::*;
use ethcontract::futures::TryStreamExt;

const MONITOR_ACCOUNT:&str = "0x6f6ef6dfe681b6593ddf27da3bfde22083aef88b";
const BSC_PROVIDER:&str = "wss://bsc.getblock.io/testnet/?api_key=182a8e0d-c03a-44ac-b856-41d2e47801db";
ethcontract::contract!("../../solidity/build/contracts/Bridge.json");

use mongodb::{bson::doc, options::ClientOptions, Client};

#[tokio::main]
async fn main() -> Result<(), web3::Error> {
    //let ws_connect = web3::transports::WebSocket::new(BSC_PROVIDER).await?;
    //let web3 = web3::Web3::new(ws_connect);
    let http = Http::new("http://localhost:8545").expect("transport failure");
    let web3 = web3::Web3::new(http);

    let bridge_instance = Bridge::deployed(&web3).await.unwrap();
    println!("Bridge deployed at {:?}", bridge_instance.address());

    let account = MONITOR_ACCOUNT.parse().unwrap();
    let bridge_info = bridge_instance.get_bridge_info().from(account).call()
        .await.unwrap();

    println!("Status: {:?}", bridge_info);

    let event_history_stream = bridge_instance
        .all_events()
        .from_block(BlockNumber::Earliest)
        .query_paginated()
        .await
        .expect("Couldn't retrieve event history");

    println!("Status: {:?}", bridge_info);

    let event_history_vec = event_history_stream
        .try_collect::<Vec<_>>()
        .await
        .expect("Couldn't parse event");

    println!("Events: {:?} collected", event_history_vec.len());
    for e in &event_history_vec {
        println!("Event: {:?}", e);
    };

    Ok(())
}
