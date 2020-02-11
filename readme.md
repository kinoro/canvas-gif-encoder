# @pencil.js/canvas-gif-encoder

[![Package version](https://flat.badgen.net/npm/v/@pencil.js/canvas-gif-encoder)](https://www.npmjs.com/package/@pencil.js/canvas-gif-encoder)

Create a GIF stream frame by frame from a canvas rendering context.

## Installation

    npm install @pencil.js/canvas-gif-encoder

## Usage

```js
// Import the library
import CanvasGifEncoder from "@pencil.js/canvas-gif-encoder";

// Create a new encoder
const encoder = new CanvasGifEncoder(<width>, <height>, <options>);

// Add frames one by one
encoder.addFrame(<context>, <delay>);

// Get the result file
const gif = encoder.end();

// Free memory space (This is optional but recommended)
encoder.flush();
```

## Example

```js
import CanvasGifEncoder from "@pencil.js/canvas-gif-encoder";

// For Node.js
import { createCanvas } from "canvas"; 
const canvas = createCanvas(300, 200);

// Or for plain JS
const canvas = document.createElement("canvas");
canvas.width = 300;
canvas.height = 200;

const ctx = canvas.getContext("2d");

// Define some options
const options = {
    alphaThreshold: 0.1,
    quality: 1,
};
const encoder = new CanvasGifEncoder(canvas.width, canvas.height, options);

ctx.fillStyle = "black";
ctx.fillRect(0, 0, 300, 200);

const time = 250; // 250ms
encoder.addFrame(ctx, time);

const gif = encoder.end();
encoder.flush();
```

## Documentation

### `constructor(<width>, <height>, <option>)`
Create an encoder with specified width and height.

| Name | Type | Default | Comment |
| --- | --- | --- | --- |
|width |`Number` |required |Width of the image between 1 and 65535 |
|height |`Number` |required |Height of the image between 1 and 65535 |
|options |`EncoderOptions` |([see below](#encoderoptions)) |Options of the encoder |

### `EncoderOptions`

| Name | Type | Default | Comment |
| --- | --- | --- | --- |
|alphaThreshold |`Number` |`0.1` |At which point a color is considered transparent (1 always, 0 never) |
|quality |`Number` |`1` |Control the output's quality, can speed up process and reduce file size (1 best, 0 non-existent) |

### `.addFrame(<context>, <delay>)`
Writes a frame to the file and returns a `Boolean` that tell if this was added or not.

| Name | Type | Default | Comment |
| --- | --- | --- | --- |
|context |`CanvasRenderingContext2D|ImageData` |required |Context from where to extract pixels or already extracted pixels. |
|delay |`Number` |`1000 / 60` |Time in millisecond for this frame between 1 and 65535. |

> Note that GIF delays are in centiseconds. This means that 278ms will be round to 280ms and 342ms will be round to 340ms.

> Note also that frame with a delay lower than 20ms will be skipped. Skipped delays are passed to the next sent frame.
> This means that 16 frames of 10ms will be rendered as 8 frame of 20ms.

### `.end()`
Finalizes the file by writing the trailer and return the result.

### `.flush()`
Free up the memory taken by the GIF. This is not required, but can be useful when working with large file.
This also mean you can start a new file with the same encoder.

## License

[MIT](license)
