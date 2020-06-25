#!/bin/bash

#creating .env file
touch ./backend/.env
echo > ./backend/.env
#getting current path
CURRENT_PATH="$PWD"
echo "CURRENT_PATH="$CURRENT_PATH > ./backend/.env
echo "EXCHANGESPORT=3003" >> ./backend/.env
echo "BOTSPORT=3002" >> ./backend/.env