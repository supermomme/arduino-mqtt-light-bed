const mqtt = require('mqtt')
const pixel = require("node-pixel")
const firmata = require('firmata')
const express = require('express')

const fps = 20
const hostname = process.argv[2] || process.env.MQTT_HOSTNAME
const username = process.argv[3] || process.env.MQTT_USERNAME
const password = process.argv[4] || process.env.MQTT_PASSWORD
const baseTopic = 'home/room/momme/light/bed'

var sequenzes = {
  "BLACK": { "INIT": [ { "cmd": "OFF" }, { "cmd": "show" } ] },
  "OFF": { "INIT": [ { "cmd": "OFF" }, { "cmd": "show" } ] },
  "FULL/RED": {
    "INIT": [
      { "cmd": "strip", "r": 255, "g": 0, "b": 0 },
      { "cmd": "show" }
    ]
  },
  "FULL/GREEN": {
    "INIT": [
      { "cmd": "strip", "r": 0, "g": 255, "b": 0 },
      { "cmd": "show" }
    ]
  },
  "FULL/BLUE": {
    "INIT": [
      { "cmd": "strip", "r": 0, "g": 0, "b": 255 },
      { "cmd": "show" }
    ]
  },
  "FULL/WHITE": {
    "INIT": [
      { "cmd": "strip", "r": 255, "g": 255, "b": 255 },
      { "cmd": "show" }
    ]
  },
  "HALF/RED": {
    "INIT": [
      { "cmd": "strip", "r": 128 },
      { "cmd": "show" }
    ]
  },
  "HALF/GREEN": {
    "INIT": [
      { "cmd": "strip", "g": 128 },
      { "cmd": "show" }
    ]
  },
  "HALF/BLUE": {
    "INIT": [
      { "cmd": "strip", "b": 128 },
      { "cmd": "show" }
    ]
  },
  "HALF/WHITE": {
    "INIT": [
      { "cmd": "strip", "r": 128, "g": 128, "b": 128 },
      { "cmd": "show" }
    ]
  },
  "RUNNING/WHITE": {
    "INIT": [
      { "cmd": "off" },
      { "cmd": "pixel", "pixel": 0, "r": 255, "g": 255, "b": 255 },
      { "cmd": "pixel", "pixel": 1, "r": 255, "g": 255, "b": 255 },
      { "cmd": "pixel", "pixel": 2, "r": 255, "g": 255, "b": 255 },
      { "cmd": "pixel", "pixel": 3, "r": 255, "g": 255, "b": 255 },
      { "cmd": "pixel", "pixel": 60, "r": 255, "g": 255, "b": 255 },
      { "cmd": "pixel", "pixel": 61, "r": 255, "g": 255, "b": 255 },
      { "cmd": "pixel", "pixel": 62, "r": 255, "g": 255, "b": 255 },
      { "cmd": "pixel", "pixel": 63, "r": 255, "g": 255, "b": 255 },
      { "cmd": "show" }
    ],
    "SEQUENZ": [
      { "cmd": "shift", "amt": 1, "dir": "BACKWARD", "wrap": true },
      { "cmd": "show" }
    ]
  }
}

var currentSequenz = {
  name: "BLACK",
  fullInitialized: false,
  currentFrame: 0,
  waitFrames: 0
}
var strip = null;

var board = new firmata.Board('/dev/ttyACM0',function(){
  strip = new pixel.Strip({
    firmata: board,
    strips: [
      {pin: 6, length: 60},
      {pin: 7, length: 60}
    ]
  })
  console.log("Strip ready connecting to mqtt and start http server...")


  ////// HTTP \\\\\\
  var app = express();

  app.get('/sequenz', function (req, res) {
    res.json(sequenzes)
  })

  app.post('/sequenz', function (req, res) {
    console.log(req.body)
    res.json()
  })

  app.listen(80, function () {
    console.log('App listening on port 80!');
  })


  ///// MQTT \\\\\\
  var client  = mqtt.connect(`mqtt://${hostname}`, {
    clientId: 'mommes-bett',
    username,
    password,
    will: {
      topic: baseTopic,
      payload: JSON.stringify({ connected: false }),
      retain: true,
      qos: 0
    }
  })
  client.on('connect', function () {
    console.log("Connected to MQTT")
    client.subscribe([baseTopic], function (err) {
      if (!err) {
        client.publish(baseTopic, JSON.stringify({ val: "HALF/GREEN", connected: true }), { retain: true })
      }
    })
  })
   client.on('message', function (topic, message) {
    try {
      let doc = JSON.parse(message)
      console.log(`Set Sequenz to ${doc.val}: ${JSON.stringify(sequenzes[doc.val])}`)
      currentSequenz = {
        name: doc.val,
        fullInitialized: false,
        currentFrame: 0
      }
    } catch (error) {
      console.log(error)
    }
  })


  ////// LOOP \\\\\\
  setInterval(() => {
    if (sequenzes[currentSequenz.name] == undefined) {
      strip.off()
      strip.show()
      return
    }
    let { SEQUENZ, INIT } = sequenzes[currentSequenz.name]
    let doesSEQUENZWork = !(SEQUENZ == undefined || SEQUENZ.length === 0)
    let doesINITWork = !(INIT == undefined || INIT.length === 0)

    if (doesSEQUENZWork && ((currentSequenz.fullInitialized) || (!currentSequenz.fullInitialized && !doesINITWork))) {
      // RUN SEQ
      runCmd(strip, SEQUENZ[currentSequenz.currentFrame], currentSequenz)
      if (currentSequenz.currentFrame === SEQUENZ.length-1) currentSequenz.currentFrame = 0
      else currentSequenz.currentFrame++
    } else if (!currentSequenz.fullInitialized) {
      // RUN INIT
      runCmd(strip, INIT[currentSequenz.currentFrame], currentSequenz)
      if (currentSequenz.currentFrame === INIT.length-1) {
        currentSequenz.currentFrame = 0
        currentSequenz.fullInitialized = true
      } else currentSequenz.currentFrame++
    } else if (!doesSEQUENZWork && !doesINITWork) {
      console.log('BAD SEQUENZ: No SEQUENZ; No INIT')
    }
  }, 1000/fps)
})

function runCmd(strip, cmd, currentSequenz) {
  if (currentSequenz.waitFrames > 0) {
    currentSequenz.waitFrames--
    return
  }

  switch (cmd.cmd.toUpperCase()) {
    case "STRIP":
      strip.color([
        Number(cmd.r || 0),
        Number(cmd.g || 0),
        Number(cmd.b || 0)
      ])
      break;
    case "PIXEL":
      strip.pixel(cmd.pixel).color([
        Number(cmd.r || 0),
        Number(cmd.g || 0),
        Number(cmd.b || 0)
      ])
      break;
    case "PIXELARRAY":
      for (var i = 0; i < cmd.pixels.length; i++) {
        strip.pixel(i).color([
          Number(cmd.pixels[i].r || 0),
          Number(cmd.pixels[i].g || 0),
          Number(cmd.pixels[i].b || 0)
        ])
      }       
      break;
    case "SHIFT":
      let dir = cmd.dir.toUpperCase() === 'BACKWARD' ? pixel.BACKWARD : pixel.FORWARD
      strip.shift(cmd.amt || 1, dir, cmd.wrap || true);
      break;
    case "PIXEL_OFF":
      strip.pixel(cmd.pixel).off()
      break;
    case "OFF":
      strip.off()
      break;
    case "SHOW":
      strip.show()
      break;
    case "WAIT":
      currentSequenz.waitFrames = cmd.wait
      break;
  
    default:
      break;
  }
}