import { getEnabledEthConfigs } from "delphinus-deployment/src/config";
import { L1ClientRole } from "delphinus-deployment/src/types";
import { exec } from "child_process"

async function main() {
    const monitorConfigs = await getEnabledEthConfigs(L1ClientRole.Monitor);
    for(let i = 0; i < monitorConfigs.length; i++){
        await new Promise((resolve, reject) =>
            exec(
                `bash l1_monitor_status.sh ${monitorConfigs[i].chainName}`,
                {
                    cwd: __dirname,
                },
                (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(stdout);
                    console.log(`${stdout}`)
                }
            )   
        );
    }
}
main()