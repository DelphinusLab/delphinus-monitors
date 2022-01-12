while true
do
  node src/eth/monitor.js $1 || sleep 5
done
