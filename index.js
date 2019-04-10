const axios = require('axios');
const moment = require('moment');
const cron = require('node-cron');
const config = require('./config');
// const Gpio = require('onoff').Gpio;

// const relay = new Gpio(17, 'out');

var program = require('commander');

program.option('--dev', 'Development Mode (Fake API)').parse(process.argv);

var sunset = 0;
var turnOffTime = moment(config.turnOffTime, 'h:mm:ss a').format('X');
var state = false;

requestSunsetTime();

cron.schedule("0 6 * * *", () => {
  //Every day at 6:00 AM, request Sunset time of the day
  requestSunsetTime();
});

cron.schedule("* * * * *", () => {
  //At every minute verify current time with Sunset Time and Turn off Time
  handleLamp();
});


function requestSunsetTime() {

  const api = program.dev ? config.api.dev : config.api.prod;
  const params = `?lat=${config.latitude}&lng=${config.longitude}`;
  console.log(`${api}${params}`);

  axios.get(`${api}${params}`)
  .then(function (response) {
      var date = response.data.results.sunset;
      var m = moment.utc(date, 'h:mm:ss a');

      sunset = m.local().format('X');
      handleLamp();

  }).catch(function (error) {
    console.log(error);
  }).then(function () {

  });
}

function handleLamp() {
  var now = moment().format("X");

  if (now >= sunset && now < turnOffTime && !state) {
    state = true;
    // relay.writeSync(state);
    console.log('Turn On');
  }

  if (now >= turnOffTime && state) {
    state = false;
    // relay.writeSync(state);
    console.log('Turn Off');
  }

}


