#!/bin/sh
cd /usr/src/app/wait-for-it && ./wait-for-it.sh -t 60 postgres:5432
cd /usr/src/app/wait-for-it && ./wait-for-it.sh -t 60 bots_api:3002
cd /usr/src/app/wait-for-it && ./wait-for-it.sh -t 60 exchanges_api:3003

exec "$@"