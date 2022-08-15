import fs from "fs-extra";
import { CommandOp } from "delphinus-l2-client-helper/src/swap";
import { sendAlert } from "delphinus-slack-alert/src/index";
const SlackConfig = require("./slack-alert-config");

type docType = {
  rid: string,
  command: CommandOp,
  args: string[]
}

function reverseEvent(doc: docType) {
  let arg: {[key: string]: string} = {
    "rid": "",
    "command": "",
    "arg0": "",
    "arg1": "",
    "arg2": "",
    "arg3": "",
    "arg4": "",
    "arg5": "",
    "arg6": "",
    "arg7": "",
    "arg8": "",
    "arg9": "",
    "sender": "",
    "target": ""
  };

  arg.rid = doc.rid;
  arg.command = String(doc.command);

  for(let i=0; i<doc.args.length; i++) {
    arg["arg" + i] = doc.args[i];
  }

  if(arg.command == "0") {
    arg.sender = doc.args[8];
    arg.target = doc.args[4];
  } else if(arg.command == "1" || arg.command == "6") {
    arg.sender = doc.args[4];
    arg.target = doc.args[4];
  } else if(arg.command == "2" || arg.command == "3" || arg.command == "4") {
    arg.sender = doc.args[4];
    arg.target = doc.args[5];
  } else if(arg.command == "5") {
    arg.sender = doc.args[9];
    arg.target = doc.args[8];
  }

  return arg;
}

module.exports = reverseEvent;

async function runReverseEvent() {
  try {
    const docs = await fs.readJson(__dirname + "/docs.json");

    let args: {[key: string]: string}[] = [];

    docs.forEach((doc: docType) => {
      let arg = reverseEvent(doc);
      args.push(arg);
    })

    try {
      await fs.writeFile("./arguments.json", JSON.stringify(args, null, 4));
    } catch(err) {
      sendAlert(err, SlackConfig, false);
      console.error("WriteFile Error: " + err);
    }
  } catch(err) {
    sendAlert(err, SlackConfig, false);
    console.log("ReadJson Error: " + err);
  }
}

runReverseEvent();
