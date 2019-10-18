const mqtt = require('mqtt')
const pixel = require("node-pixel")
const firmata = require('firmata')

const fps = 20
const hostname = process.env.MQTT_HOSTNAME
const password = process.env.MQTT_PASSWORD
const username = process.env.MQTT_USERNAME

var sequenzes = { }
const baseSequenzes = {
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
  name: "FULL/RED",
  fullInitialized: false,
  currentFrame: 0,
  waitFrames: 0
}

var board = new firmata.Board('/dev/ttyACM0',function(){
  strip = new pixel.Strip({
    firmata: board,
    controller: "FIRMATA",
    strips: [
      {pin: 6, length: 60},
      {pin: 7, length: 60}
    ],
    gamma: 2.8
  })
  strip.on("ready", function() {
    console.log("Strip ready connecting to mqtt...")

    var client  = mqtt.connect(`mqtt://${hostname}`, {
      clientId: 'mommes-bett',
      username,
      password,
      will: {
        topic: 'home/room/momme/light/bed',
        payload: JSON.stringify({ connected: false }),
        retain: true,
        qos: 0
      }
    })
    client.on('connect', function () {
      console.log("Connected to MQTT")
      client.subscribe(['home/room/momme/light/bed/#'], function (err) {
        if (!err) {
          client.publish('home/room/momme/light/bed', JSON.stringify({ val: "FULL/GREEN", connected: true }), { retain: true })
          for (var key in baseSequenzes) {
            console.log(`PUBLISH BASE SEQUENZ ${key}: ${JSON.stringify(baseSequenzes[key])}`)
            client.publish('home/room/momme/light/bed/'+key, JSON.stringify({ val: baseSequenzes[key] }), { retain: true })
          }
        }
      })
    })

    client.on('message', function (topic, message) {
      try {
        let doc = JSON.parse(message)
        if (topic === 'home/room/momme/light/bed') {
          console.log(`Set Sequenz to ${doc.val}: ${JSON.stringify(sequenzes[doc.val])}`)
          currentSequenz = {
            name: doc.val,
            fullInitialized: false,
            currentFrame: 0
          }
        } else {
          console.log(`Create/Patch Sequenz ${topic.split('home/room/momme/light/bed/')[1]}: ${JSON.stringify(doc.val)}`)
          sequenzes[topic.split('home/room/momme/light/bed/')[1]] = doc.val
        }
      } catch (error) {
        console.log(error)
      }
    })

    setInterval(() => {
      if (sequenzes[currentSequenz.name] == undefined) {
        strip.off()
        strip.show()
        return
      }
      let { SEQUENZ, INIT } = sequenzes[currentSequenz.name]

      let doesSEQUENZWork = !(SEQUENZ == undefined || SEQUENZ.length === 0)
      let doesINITWork = !(INIT == undefined || INIT.length === 0)

      if ((doesSEQUENZWork && currentSequenz.fullInitialized) || (doesSEQUENZWork && !currentSequenz.fullInitialized && !doesINITWork)) {
        // RUN SEQ
        runCmd(strip, SEQUENZ[currentSequenz.currentFrame], currentSequenz)
        if (currentSequenz.currentFrame === SEQUENZ.length-1) currentSequenz.currentFrame = 0
        else currentSequenz.currentFrame++

      } else if ((!doesSEQUENZWork && doesINITWork) || (doesSEQUENZWork && !currentSequenz.fullInitialized && doesINITWork)) {
        // RUN INIT
        runCmd(strip, INIT[currentSequenz.currentFrame], currentSequenz)
        if (currentSequenz.currentFrame === INIT.length-1) {
          currentSequenz.currentFrame = 0
          currentSequenz.fullInitialized = true
        } else currentSequenz.currentFrame++

      } else if (!doesSEQUENZWork && !doesINITWork) {
        console.log('BAD SEQUENZ: No SEQUENZ; No INIT')
      } else {
        console.log(`Somthing else is wrong: doesSEQUENZWork: ${doesSEQUENZWork} doesINITWork: ${doesINITWork} currentSequenz.fullInitialized: ${currentSequenz.fullInitialized}`)
      }

    }, 1000/fps)
  })
})

function runCmd(strip, cmd, currentSequenz) {
  if (currentSequenz.waitFrames > 0) {
    currentSequenz.waitFrames--
    return
  }
  let rgb = [1,1,1]
  if (cmd.r != undefined) rgb[0] = cmd.r
  if (cmd.g != undefined) rgb[1] = cmd.g
  if (cmd.b != undefined) rgb[2] = cmd.b
  console.log(`${cmd.cmd} ; ${rgb} ; ${currentSequenz}`)
  switch (cmd.cmd.toUpperCase()) {
    case "STRIP":
      strip.color(rgb)
      break;
    case "PIXEL":
      strip.pixel(cmd.pixel).color(rgb)
      break;
    case "SHIFT":
      let dir = cmd.dir.toUpperCase() === 'FORWARD' ? pixel.FORWARD : pixel.BACKWARD
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
