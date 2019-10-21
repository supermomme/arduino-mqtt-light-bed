const mqtt = require('mqtt')
const pixel = require("node-pixel")
const firmata = require('firmata')
const express = require('express')
const fs = require('fs')

const fps = 20
const hostname = process.argv[2] || process.env.MQTT_HOSTNAME
const username = process.argv[3] || process.env.MQTT_USERNAME
const password = process.argv[4] || process.env.MQTT_PASSWORD
const baseTopic = 'home/room/momme/light/bed'
const sequenzFile = './data/sequenzes.json'

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
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.get('/sequenz', function (req, res) {
    let seqs = JSON.parse(fs.readFileSync(sequenzFile));
    res.json(seqs)
  })

  app.post('/sequenz', function (req, res) {
    let seqs = JSON.parse(fs.readFileSync(sequenzFile));
    
    for (const key in req.body) {
      seqs[key] = req.body[key]
    }
    fs.writeFileSync(sequenzFile, JSON.stringify(seqs))
    res.sendStatus(200)
  })

  app.listen(3000, function () {
    console.log('App listening on port 3000!');
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
      console.log(`Set Sequenz to ${doc.val}`)
      let seqs = JSON.parse(fs.readFileSync(sequenzFile));
      console.log(seqs[doc.val])
      currentSequenz = {
        sequenz: seqs[doc.val],
        fullInitialized: false,
        currentFrame: 0
      }
    } catch (error) {
      console.log(error)
    }
  })


  ////// LOOP \\\\\\
  setInterval(() => {
    if (currentSequenz.sequenz == undefined) {
      strip.off()
      strip.show()
      return
    }

    if(currentSequenz.sequenz.SEQUENZ == undefined) currentSequenz.sequenz.SEQUENZ = []
    if(currentSequenz.sequenz.INIT == undefined) currentSequenz.sequenz.INIT = []

    if (currentSequenz.fullInitialized && currentSequenz.sequenz.SEQUENZ.length > 0) runSEQUENZ(strip, currentSequenz)
    else if (!currentSequenz.fullInitialized && currentSequenz.sequenz.INIT.length > 0) runINIT(strip, currentSequenz)
    else if (!currentSequenz.fullInitialized && currentSequenz.sequenz.INIT.length === 0) currentSequenz.fullInitialized = true
  }, 1000/fps)
})

function runINIT(strip, currentSequenz) {
  let { INIT } = currentSequenz.sequenz
  runCmd(strip, INIT[currentSequenz.currentFrame], currentSequenz)
  if (currentSequenz.currentFrame === INIT.length-1) {
    currentSequenz.currentFrame = 0
    currentSequenz.fullInitialized = true
  } else currentSequenz.currentFrame++
}

function runSEQUENZ(strip, currentSequenz) {
  let { SEQUENZ } = currentSequenz.sequenz
  runCmd(strip, SEQUENZ[currentSequenz.currentFrame], currentSequenz)
  if (currentSequenz.currentFrame === SEQUENZ.length-1) currentSequenz.currentFrame = 0
  else currentSequenz.currentFrame++
}

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