# arduino-mqtt-light-bed
## Required
* Arduino installed with [node-pixel](https://github.com/ajfisher/node-pixel)

## Create Sequenz
create sequenz in *<baseTopic>/<SEQUENZ_NAME>* with following JSON structure
```
{
    "val": {
        "INIT": [
            // INIT COMMANDS
            // EXAMPLE: { "cmd": "STRIP", "r": 0-255, "g": 0-255, "b": 0-255 }
        ],
        "SEQUENZ": [
            // SEQUENZ COMMANDS
        ]
    }
}
```
### Commands
* STRIP
    * r = RED (0-255)
    * g = GREEN (0-255)
    * b = BLUE (0-255)
* PIXEL
    * pixel = PIXEL_LOCATION
    * r = RED (0-255)
    * g = GREEN (0-255)
    * b = BLUE (0-255)
* PIXELARRAY
    * pixels = ARRAY with:
        * r = RED (0-255)
        * g = GREEN (0-255)
        * b = BLUE (0-255)
* SHIFT
    * amt = how many pixels should be shiftet (Default: 1)
    * dir = direction (FORWARD, BACKWARD) (Default: FORWARD)
    * wrap = wrap leds back around (Default: true)
* PIXEL_OFF
    * pixel = PIXEL_LOCATINO
* OFF
* SHOW
* WAIT
    * wait = frames to do nothing
## Choose Sequenz
Choose SEQUENZ in the baseTopic with JSON in val
### Example
```
{
    "val": "<SEQUENZ_NAME>"
}
```