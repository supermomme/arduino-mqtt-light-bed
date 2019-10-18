var mqtt = require('mqtt')
var pixel = require("node-pixel")
var firmata = require('firmata')

const fps = 20
const hostname = process.env.MQTT_HOSTNAME
const password = process.env.MQTT_PASSWORD
const username = process.env.MQTT_USERNAME
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
    var SEQUENZ = "FULL_RED"
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
      client.subscribe(['home/room/momme/light/bed/#'], function (err) {
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
          SEQUENZ = doc.val
        }
      } catch (error) {
        console.log(error)
      }
    })

    setInterval(() => {
      if (SEQUENZ === "FULL_RED") strip.color([255,0,0])
      else if (SEQUENZ === "FULL_GREEN") strip.color([0,255,0])
      else if (SEQUENZ === "FULL_WHITE") strip.color([255,255,255])
      else if (SEQUENZ === "BLACK") strip.off()
      strip.show()
    }, 1000/fps)
  })
})

