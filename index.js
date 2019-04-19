#!/usr/bin/env node

const axios = require('axios');
const moment = require('moment');
const cron = require('node-cron');
const config = require('./config');
const fs = require('fs');
const Gpio = require('onoff').Gpio;

const relay = new Gpio(17, 'out');

var program = require('commander');

program.option('--dev', 'Development Mode (Fake API)').parse(process.argv);

var sunset = (typeof config.cache.sunset !== 'undefined') ? moment(config.cache.sunset, 'h:mm:ss a').format('X') : 0;
var turnOffTime = 0;
var state = false;

configure();

cron.schedule("0 6 * * *", () => {
  //Every day at 6:00 AM, request Sunset time of the day
  configure();
});

cron.schedule("* * * * *", () => {
  //At every minute verify current time with Sunset Time and Turn off Time
  handleLamp();
});

var express = require('express');

var app = express();

app.get('/light', function (req, res) {
  let data = {
    "status": "OK"
  }
  
  state = !state;
  turnLamp(state);
  

  res.json(data);
});

var server = app.listen(3001, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});


function configure() {

  const api = program.dev ? config.api.dev : config.api.prod;
  const params = `?lat=${config.latitude}&lng=${config.longitude}`;
  turnOffTime = moment(config.turnOffTime, 'h:mm:ss a').local().format('X');

  axios.get(`${api}${params}`)
  .then(function (response) {
      var date = response.data.results.sunset;
      var m = moment.utc(date, 'h:mm:ss a');

      sunset = m.local().format('X');
      writeCache('sunset', m.local().format('h:mm:ss a'));
      handleLamp();

  }).catch(function (error) {
    console.log(error);
  });
}

function handleLamp() {
  var now = moment().format("X");

  if (now >= sunset && now < turnOffTime && !state) {
    state = turnLamp(true);
  }

  if (now >= turnOffTime && state) {
    state = turnLamp(false);
  }

}

function turnLamp(state) {
  let relayVal = state ? 1 : 0;
  let log = state ? 'Turn On' : 'Turn Off';
  relay.writeSync(relayVal);
  console.log(log);
  return state;
}

function writeCache(key, value) {
  let cache = config.cache ? config.cache : {} ;
  cache[key] = value;
  config.cache = cache;
  fs.writeFile('config.json', JSON.stringify(config, null, 4), (err) => {
    if(err) {
      console.log(err);
    } else {
      console.log("Update cache");
      console.log(moment.unix(sunset).format("DD/MM/YYYY kk:mm:ss"));
      console.log(moment.unix(turnOffTime).format("DD/MM/YYYY kk:mm:ss"));
    }
  });
}


