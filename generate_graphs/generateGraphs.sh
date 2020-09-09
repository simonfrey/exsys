#!/bin/bash

 php  -S localhost:9080 &

dirs=$(find  ../02_experiments -type d -exec test -e {}/exsys_results.json -a -e {}/jmeter_results.csv \; -print)

for i in $dirs; do 
rm -r $i/charts;
mkdir $i/charts;

cp $i/exsys_results.json ./data/exsys.json
cp $i/jmeter_results.csv ./data/jmeter.csv

echo "[GENERATE] "$i; 
node screenshot.js $i/charts/

done
