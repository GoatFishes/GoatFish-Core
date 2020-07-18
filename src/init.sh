#!/bin/bash

#creating .env file
touch ./src/.env
echo > ./src/.env

#getting current path
CURRENT_PATH="$PWD"
echo "CURRENT_PATH="$CURRENT_PATH > ./src/.env
echo "EXCHANGESPORT=3003" >> ./src/.env
echo "BOTSPORT=3002" >> ./src/.env