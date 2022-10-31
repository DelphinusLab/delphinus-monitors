
while true
do
  node --unhandled-rejections=strict src/indexer/indexer.js || sleep 5
done
