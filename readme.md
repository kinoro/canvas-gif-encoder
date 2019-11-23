# @pencil.js/canvas-gif-encoder

[![Package version](https://badgen.net/npm/v/pencil-js/canvas-gif-encoder)](https://www.npmjs.com/package/@pencil.js/canvas-gif-encoder)

A package to encode animated GIFs. Input frames are provided through a canvas.

## Installation

    npm install @pencil.js/canvas-gif-encoder

## Usage

```js
// Import the library
import CanvasGifEncoder from "canvas-gif-encoder";

// Create a new encoder
const encoder = new CanvasGifEncoder(<width>, <height>);

// Add frames one by one
encoder.addFrame(<context>, <delay>);

// Get the result file
const gif = encoder.end();

// Free memory space (This is optional but recommended)
encoder.flush();
```

## Example

```js
import CanvasGifEncoder from "canvas-gif-encoder";

// For Node.js
import { createCanvas } from "canvas"; 
const canvas = createCanvas(300, 200);

// For plain JS
const canvas = document.createElement("canvas");
canvas.width = 300;
canvas.height = 200;

const ctx = canvas.getContext("2d");
const encoder = new CanvasGifEncoder(canvas.width, canvas.height);

ctx.fillStyle = "black";
ctx.fillRect(0, 0, 120, 120);

const time = 250; // 250ms
encoder.addFrame(ctx, time);

let colors = ["white", "yellow", "cyan", "lime", "magenta", "red", "blue"];

for (let i = 0; i < colors.length; ++i) {
	ctx.fillStyle = colors[i];
	ctx.fillRect(i / colors.length * 120, 0, 120 / colors.length, 120);
	encoder.addFrame(ctx, 250);
}

const gif = encoder.end();
encoder.flush();
```

## Documentation

### `constructor(<width>, <height>)`
Create an encoder with specified width and height.

| Name | Type | Default | Comment |
| --- | --- | --- | --- |
|width |`Number` |required |Width of the image between 1 and 65535. |
|height |`Number` |required |Height of the image between 1 and 65535. |

### `.addFrame(<context>, <delay>)`
Writes a frame to the file.

| Name | Type | Default | Comment |
| --- | --- | --- | --- |
|context |`CanvasRenderingContext2D` |required |The canvas context from which the frame is constructed. |
|delay |`Number` |`1000 / 60` |Time in millisecond for this frame between 1 and 65535 (note that GIF delays can't be lower than 200ms and will be skipped). |

> Note that GIF delays are in centiseconds. This means that 278ms will be round to 280ms and 342ms will be round to 340ms.

> Note also that frame with a delay lower than 200ms will be skipped. Skipped delays are passed to the next sent frame.
> This means that 10 frames of 80ms will be turn into 4 frame of 200ms.

### `.end()`
Finalizes the file by writing the trailer and return the result.

### `.flush()`
Free up the memory taken by the GIF. This is not required, but can be useful when working with large file.
This also mean you can start a new file with the same encoder.

## License

[Zlib](license)
