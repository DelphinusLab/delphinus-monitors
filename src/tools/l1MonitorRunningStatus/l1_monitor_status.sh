if ps aux | grep -v grep | grep "bash run_l1monitor.sh $1"
then
    echo "$1 monitor status check: Running";
else
    echo "$1 monitor status check: Not Running";
fi