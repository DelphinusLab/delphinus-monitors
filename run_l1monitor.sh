while true
do
  node --unhandled-rejections=strict src/eth/monitor.js $1 $2
  sleep 4
done
