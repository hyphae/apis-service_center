#!/usr/bin/env bash
echo 'call stop.sh'

get_pids() {
 ps -f -U $(whoami) | grep 'uv run manage.py runserver' | grep -v grep | awk '{print $2}' | tr '\n' ' '
 done
}

while true; do
 _PIDS_=`get_pids`
 if [ -z "$_PIDS_" ] ; then
  break
 fi
 echo kill $_PIDS_
 kill $_PIDS_
 sleep 1
done

echo '... done'