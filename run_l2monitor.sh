[ -d "./l2MonitorLogs" ] || mkdir l2MonitorLogs
time=$(date +%Y-%m-%d-%H-%M-%S)
getopts nv OPTION;
while true
do
  case ${OPTION} in
  n)
    node --unhandled-rejections=strict src/substrate/index.js n | tee -a l2MonitorLogs/l2MonitorLogs_$time 
    sleep 5
    ;;
  v)
    node --unhandled-rejections=strict src/substrate/index.js v | tee -a l2MonitorLogs/l2MonitorLogs_$time 
    sleep 5
    ;;
  ?)
    echo "Any option except -v is regarded as -n"
    node --unhandled-rejections=strict src/substrate/index.js n | tee -a l2MonitorLogs/l2MonitorLogs_$time
    sleep 5
    ;;
  esac
done
