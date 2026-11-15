#!/bin/bash
bun /app/server/index.js &
nginx -g 'daemon off;' &
wait -n
exit $?
