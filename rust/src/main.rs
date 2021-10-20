use ethcontract::prelude::*;
use ethcontract::futures::TryStreamExt;
use url::Url;
use structopt::StructOpt;
use std::process;

const MONITOR_ACCOUNT:&str = "0x6f6ef6dfe681b6593ddf27da3bfde22083aef88b";
const BSC_PROVIDER:&str = "wss://bsc.getblock.io/testnet/?api_key=182a8e0d-c03a-44ac-b856-41d2e47801db";
ethcontract::contract!("../../solidity/build/contracts/Bridge.json");

use mongodb::{bson::doc, options::ClientOptions, Client};

#[derive(StructOpt)]
struct Cli {
    url: String
}

#[tokio::main]
async fn main() -> Result<(),  web3::Error> {
    //let ws_connect = web3::transports::WebSocket::new(BSC_PROVIDER).await?;
    //let web3 = web3::Web3::new(ws_connect);
    let args = Cli::from_args();
    let url = args.url.as_str();
    let account = MONITOR_ACCOUNT.parse().unwrap();
    match Url::parse(url) {
        Ok(_) => (),
        Err(e) => {
            println!("{} is not a valid url.", e);
            process::exit(1);
        }
    };
    let transport = match Http::new(url) {
        Ok(t) => t,
        Err(e) => {
            println!("Create transport failed: {}.", e);
            process::exit(1);
        }
    };
    let web3 = web3::Web3::new(transport);
    let bridge_instance = match Bridge::deployed(&web3).await
    {
        Ok(i) => i,
        Err(e) => {
            println!("DeployError: {}.", e);
            process::exit(1);
        }
    };
    match bridge_instance
        .get_bridge_info()
        .from(account)
        .call()
        .await {
            Ok(bri_info) => {
                println!("Bridge info: {:?}", bri_info);
                bri_info
            },
            Err(e) => {
                println!("Get the bridge ingo error: {}.", e);
                process::exit(1);
            }
        };

    let event_history_stream = match bridge_instance
        .all_events()
        .from_block(BlockNumber::Earliest)
        .query_paginated()
        .await {
            Ok(stream) => stream,
            Err(e) => {
                println!("Couldn't retrieve event history: {}", e);
                process::exit(1);
            }
        };

    let event_history_vec = event_history_stream
        .try_collect::<Vec<_>>()
        .await.unwrap();

    println!("{:?} events collected:", event_history_vec.len());
    for e in &event_history_vec {
        println!("Event: {:?}", e);
    };
    Ok(())
}
