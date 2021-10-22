use ethcontract::prelude::*;
use ethcontract::futures::TryStreamExt;
use url::Url;
use structopt::StructOpt;
use std::process;
use std::fs::File;
use std::io::BufReader;
use serde_json::Value;

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
                println!("Get the bridge info failed: {}.", e);
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

    let path = "./src/config.json";
    let file = match File::open(path) {
        Ok(file) => file,
        Err(e) => {
            println!("open failed: {}", e);
            process::exit(1);
        }
    };
    // Open the file in read-only mode with buffer.
    let reader = BufReader::new(file);
    // Read the JSON contents of the file as an instance.
    let config: Value = match serde_json::from_reader(reader) {
        Ok(c) => c,
        Err(e) => {
            println!("Read file error: {}", e);
            process::exit(1);
        }
    };
    let address = bridge_instance.address().to_string();
    let mongodb_url = config["localtestnet1"]["mongodb_url"].as_str().unwrap();
    let network_id = config["localtestnet1"]["device_id"].as_str().unwrap();
    let url = network_id.to_owned() + &address;
    println!("The name of database is: {}", url);
    let client_options = match ClientOptions::parse(&mongodb_url).await {
        Ok(c) => c,
        Err(e) => {
            println!("Parse the MongoDB connection string failed: {}", e);
            process::exit(1);
        }
    };

    let client = match Client::with_options(client_options)
    {
        Ok(c) => c,
        Err(e) => {
            println!("Create the MongoDB client failed: {}", e);
            process::exit(1);
        }
    };

    match client.database(&url).run_command(doc! {"ping": 1}, None).await {
        Ok(_) => (),
        Err(e) => {
            println!("Create the MongoDB client failed: {}", e);
            process::exit(1);
        }
    }

    println!("Connected successfully.");
    match client.list_database_names(None, None).await {
        Ok(dbs) => {
            println!("All database:");
            for dbname in dbs {
                println!("{}", dbname);
            }
        },
        Err(e) => {
            println!("Create the MongoDB client failed: {}", e);
            process::exit(1);
        }
    }
    Ok(())
}
