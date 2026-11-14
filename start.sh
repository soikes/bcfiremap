#!/bin/bash
bun /app/server/server.js &
nginx -g 'daemon off;' &
wait -n
exit $?
