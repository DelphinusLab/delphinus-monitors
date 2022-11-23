[ -d "./l1MonitorLogs" ] || mkdir l1MonitorLogs
time=$(date +%Y-%m-%d-%H-%M-%S)
while true
do
  node --unhandled-rejections=strict src/eth/monitor.js $1 $2 | tee -a l1MonitorLogs/l1MonitorLogs_$1_$time
  sleep 5
done
