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
    const size = [100, 150];
    const canvas = createCanvas(...size);
    const ctx = canvas.getContext("2d");

    const encoder = new CanvasGifEncoder(...size);

    const addFrame = () => {
        const gradient = ctx.createLinearGradient(0, 0, ...size);
        gradient.addColorStop(0, "red");
        gradient.addColorStop(0.5, "green");
        gradient.addColorStop(1, "blue");
        ctx.fillStyle = gradient;

        ctx.fillRect(0, 0, ...size);

        encoder.addFrame(ctx, 250);
    };

    addFrame();
    const result = encoder.end();
    t.snapshot(result);

    encoder.flush();
    encoder.options.quality = 0;
    addFrame();
    const lowerQuality = encoder.end();
    t.snapshot(lowerQuality);

    t.true(lowerQuality.length < result.length);
});

test("Transparency", (t) => {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext("2d");

    const encoder = new CanvasGifEncoder(64, 64);

    const addFrame = () => {
        ctx.fillStyle = "orange";
        for (let i = 0; i < 16; ++i) {
            ctx.clearRect(0, 0, 64, 64);
            ctx.beginPath();
            ctx.arc(16 + i * 2, 16 + i * 2, 15.5, 0, 2 * Math.PI);
            ctx.fill();

            encoder.addFrame(ctx, 62.5);
        }
    };

    addFrame();
    t.snapshot(encoder.end());

    encoder.flush();
    encoder.options.alphaThreshold = 0.5;
    t.snapshot(encoder.end());
});
