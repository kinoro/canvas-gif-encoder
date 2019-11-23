import test from "ava";
import { createCanvas } from "canvas";
import CanvasGifEncoder from "..";

test("Animation", (t) => {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext("2d");

    const encoder = new CanvasGifEncoder(64, 64);

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 64, 64);

    encoder.addFrame(ctx, 250);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 32, 32);

    encoder.addFrame(ctx, 250);

    ctx.fillRect(32, 0, 32, 32);

    encoder.addFrame(ctx, 250);

    ctx.fillRect(32, 32, 32, 32);

    encoder.addFrame(ctx, 250);

    ctx.fillRect(0, 32, 32, 32);

    encoder.addFrame(ctx, 250);

    const result = encoder.end();

    t.snapshot(result);
});

test("Single frame", (t) => {
    const canvas = createCanvas(128, 128);
    const ctx = canvas.getContext("2d");

    const encoder = new CanvasGifEncoder(128, 128);

    for (let i = 0; i < 128; ++i) {
        ctx.fillStyle = `rgb(255,${i * 2},${i * 2})`;
        ctx.fillRect(0, i, 128, 1);
    }

    encoder.addFrame(ctx, 250);

    const result = encoder.end();

    t.snapshot(result);
});

test("Transparency", (t) => {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext("2d");

    const encoder = new CanvasGifEncoder(64, 64);

    ctx.fillStyle = "orange";
    for (let i = 0; i < 16; ++i) {
        ctx.clearRect(0, 0, 64, 64);
        ctx.beginPath();
        ctx.arc(16 + i * 2, 16 + i * 2, 15.5, 0, 2 * Math.PI);
        ctx.fill();

        encoder.addFrame(ctx, 62.5);
    }

    const result = encoder.end();

    t.snapshot(result);
});
