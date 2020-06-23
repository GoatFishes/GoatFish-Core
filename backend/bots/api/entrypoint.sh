#!/bin/sh
cd /usr/src/app/wait-for-it && ./wait-for-it.sh -t 60 postgres:5432
cd /usr/src/app/wait-for-it && ./wait-for-it.sh -t 60 kafka:9092

exec "$@"