node --unhandled-rejections=strict src/indexer/indexer.js $1

while true
do
  node --unhandled-rejections=strict src/indexer/indexer.js
  sleep 5
done