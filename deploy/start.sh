#!/bin/bash
# Hands the data directory and the log streams to the nginx user, then runs this script again as that user.
if [ "$(id -u)" = 0 ]; then
  chown 101:101 "$(dirname "$BANS_DB_PATH")"
  chown 101:101 /dev/stdout /dev/stderr || echo "start.sh: could not hand the log streams to the nginx user" >&2
  exec setpriv --reuid=101 --regid=101 --clear-groups "$0"
fi
bun /app/server/index.js &
nginx -g 'daemon off;' &
wait -n
exit $?
