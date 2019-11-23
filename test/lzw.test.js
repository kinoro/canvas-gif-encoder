import test from "ava";
import compress from "../src/lzw";

test("Compress", (t) => {
    const minCodeSize = 8;
    const inputData = Uint8Array.of(
        40, 255, 255,
        255, 40, 255,
        255, 255, 255,
        255, 255, 255,
        255, 255, 255,
    );

    const result = compress(minCodeSize, inputData);

    const expected = Uint8Array.of(11, 0, 81, 252, 27, 40, 112, 160, 193, 131, 1, 1, 0);
    t.deepEqual(result, expected);
});
