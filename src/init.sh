#!/bin/bash

#creating .env file
touch .env
echo > .env

#getting current path
CURRENT_PATH='$PWD'
echo 'CURRENT_PATH='$CURRENT_PATH > .env
echo 'BOTSPORT=3000' >> .env
echo 'EXCHANGESPORT=3001' >> .env 
