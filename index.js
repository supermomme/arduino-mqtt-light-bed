var mqtt = require('mqtt')
var pixel = require("node-pixel")
var firmata = require('firmata')

const fps = 30
const hostname = process.env.MQTT_HOSTNAME
const password = process.env.MQTT_PASSWORD
const username = process.env.MQTT_USERNAME

let sequenzes = {
  "BLACK": { "SEQUENZ": [ { "cmd": "OFF" }, { "cmd": "show" } ] },
  "FULL_RED": {
    "SEQUENZ": [
      { "cmd": "strip", "r": 255, "g": 0, "b": 0 },
      { "cmd": "show" }
    ]
  },
  "FULL_GREEN": {
    "SEQUENZ": [
      { "cmd": "strip", "r": 0, "g": 255, "b": 0 },
      { "cmd": "show" }
    ]
  },
  "FULL_WHITE": {
    "SEQUENZ": [
      { "cmd": "strip", "r": 255, "g": 255, "b": 255 },
      { "cmd": "show" }
    ]
  },
  "RUNNING_WHITE": {
    "INIT": [
      { "cmd": "off" },
      { "cmd": "pixel", "pixel": 0, "r": 255, "g": 255, "b": 255 },
      { "cmd": "pixel", "pixel": 1, "r": 255, "g": 255, "b": 255 },
      { "cmd": "show" }
    ],
    "SEQUENZ": [
      { "cmd": "shift", "amt": 4, "dir": "BACKWARD", "wrap": true },
      { "cmd": "show" }
    ]
  }
}

let currentSequenz = {
  name: "FULL_RED",
  fullInitialized: false,
  currentFrame: 0,
  waitFrames: 0
}

console.log(`${username}@${hostname}`)
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
      console.log("Connected")
      client.subscribe(['home/room/momme/light/bed/+'], function (err) {
        if (!err) {
          client.publish('home/room/momme/light/bed', JSON.stringify({ val: "FULL_GREEN", connected: true }))
        }
      })
    })

    client.on('message', function (topic, message) {
      try {
        let doc = JSON.parse(message)
        console.log(`${topic}: ${JSON.stringify(doc)}`)
        if (topic === 'home/room/momme/light/bed') {
          currentSequenz = {
            name: doc.val,
            fullInitialized: false,
            currentFrame: 0
          }
        } else {
          let newSeqName = topic.split('home/room/momme/light/bed')
          console.log(newSeqName)
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

      if (currentSequenz.fullInitialized || INIT.length === 0) {
        runCmd(strip, SEQUENZ[currentSequenz.currentFrame])
        if (currentSequenz.currentFrame === SEQUENZ.length-1) currentSequenz.currentFrame = 0
        else currentSequenz.currentFrame++
      } else {
        runCmd(strip, INIT[currentSequenz.currentFrame])
        if (currentSequenz.currentFrame === INIT.length-1) {
          currentSequenz.currentFrame = 0
          currentSequenz.fullInitialized = true
        } else currentSequenz.currentFrame++
      }
    }, 1000/fps)
  })
})

function runCmd(strip, cmd) {
  switch (cmd.cmd.toUpperCase()) {
    case "STRIP":
      strip.color([cmd.r || 0, cmd.g || 0, cmd.b || 0])
      break;
    case "PIXEL":
      strip.pixel(cmd.pixel).color([cmd.r || 0, cmd.g || 0, cmd.b || 0])
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
  
    default:
      break;
  }
}
