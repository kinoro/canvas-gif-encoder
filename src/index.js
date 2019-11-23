/* eslint-disable no-bitwise */
import compress from "./lzw";

/**
 * Give the difference between two color
 * @param {Array} color1 - Color 1
 * @param {Array} color2 - Color 2
 * @returns {number}
 */
const colorDistance = (color1, color2) => {
    return Math.hypot(...color1.map((channel, index) => channel - color2[index]));
};

/**
 *
 * @param {Array} color -
 * @param {Array} map -
 * @returns {number}
 */
const findClosestInColorTable = (color, map) => {
    let closestIndex = -1;
    let closestDistance = Infinity;

    for (const colorPair of map) {
        const mapColor = colorPair[0].split(",");
        // const distance = colorDistance(color, mapColor);
        const distance = Math.hypot(
            color.r - Number(mapColor[0]),
            color.g - Number(mapColor[1]),
            color.b - Number(mapColor[2]),
        );
        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = colorPair[1];
        }
    }
    return closestIndex;
};

/**
 * Turn string to their char code
 * @param {String} string - Any string
 * @returns {Array}
 */
const tob = string => string.split("").map(c => c.charCodeAt(0));

/**
 * Turn a number into it's 8bits int representation with least significant bit first
 * @param {Number} number - Any number
 * @returns {[number, number]}
 */
const lsb = number => [number & 0xff, (number >> 8) & 0xff];

const VERSION_DESCRIPTOR = tob("GIF89a");
const APPLICATION_NAME = tob("NETSCAPE2.0");
const BLOCK_INTRODUCER = tob("!");
const IMAGE_INTRODUCER = tob(",");

/**
 * @class
 */
export default class CanvasGifEncoder {
    /**
     * CanvasGifEncoder constructor
     * @param {Number} width - Width of the GIF
     * @param {Number} height - Height of the GIF
     * @param {*} options - Coming soon
     */
    constructor (width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.skip = 0;

        this.stream = null;
        this.flush();
    }

    /**
     * Add a new frame to the GIF
     * @param {CanvasRenderingContext2D} context - Context from where to extract pixels
     * @param {Number} delay - Time of wait for this frame in millisecond
     */
    addFrame (context, delay = 1000 / 60) {
        this.skip += delay / 10;
        if (this.skip < 2) {
            return;
        }
        const centi = Math.floor(this.skip);
        this.skip -= centi;

        const graphicControlExtension = Uint8Array.of(
            ...BLOCK_INTRODUCER, // GIF extension block introducer
            0xF9, 0x04, //          Graphic Control Extension (4 bytes)
            0x09, //                Restore to BG color, do not expect user input, transparent index exists
            ...lsb(centi), //       Delay in centi-seconds (little-endian)
            0x00, //                Color 0 is transparent
            0x00, //                End of block
        );

        const colorTable = [undefined];

        const { data } = context.getImageData(0, 0, this.width, this.height);
        const pixelData = new Uint8Array(this.width * this.height);

        for (let i = 0, l = data.length; i < l; i += 4) {
            let colorIndex;
            if (data[i + 3] === 0) { // Transparent
                colorIndex = 0;
            }
            else {
                const color = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
                // If color doesn't exists in table add it
                if (colorTable.includes(color)) {
                    colorIndex = colorTable.indexOf(color);
                }
                else {
                    colorIndex = colorTable.push(color) - 1;
                }
            }
            pixelData[i / 4] = colorIndex;
        }

        if (colorTable.length > 0xff) {
            throw new Error("TODO");
        }

        const colorTableBits = Math.max(2, Math.ceil(Math.log2(colorTable.length)));

        const colorTableData = new Uint8Array((1 << colorTableBits) * 3);
        colorTable.forEach((color, index) => {
            colorTableData[index * 3] = (color >> 16) & 0xff;
            colorTableData[index * 3 + 1] = (color >> 8) & 0xff;
            colorTableData[index * 3 + 2] = (color >> 0) & 0xff;
        });

        const imageDescriptor = Uint8Array.of(
            ...IMAGE_INTRODUCER, //                     Image descriptor
            0x00, 0x00, //                              Left X coordinate of image in pixels (little-endian)
            0x00, 0x00, //                              Top Y coordinate of image in pixels (little-endian)
            ...lsb(this.width), //                      Image width in pixels (little-endian)
            ...lsb(this.height), //                     Image height in pixels (little-endian)
            0x80 | ((colorTableBits - 1) & 0x07), //    Use a local color table, do not interlace, table is not sorted, the table indices are colorTableBits bits long
        );

        const compressedPixelData = compress(colorTableBits, pixelData);

        this.stream.push(
            ...graphicControlExtension,
            ...imageDescriptor,
            ...colorTableData,
            colorTableBits,
            ...compressedPixelData,
        );
    }

    /**
     * Close the GIF
     * @returns {Uint8Array}
     */
    end () {
        this.stream.push(Uint8Array.of(0x3B)); // File end
        return new Uint8Array(this.stream);
    }

    /**
     * Free all memory and start anew
     */
    flush () {
        this.stream = [
            ...VERSION_DESCRIPTOR,
            ...lsb(this.width), //      Logical screen width in pixels (little-endian)
            ...lsb(this.height), //     Logical screen height in pixels (little-endian)
            0x70, //                    Depth = 8 bits, no global color table
            0x00, //                    Transparent color: 0
            0x00, //                    Default pixel aspect ratio
            0x21, 0xFF, 0x0B, //        Application Extension block (11 bytes for app name and code)
            ...APPLICATION_NAME, //     NETSCAPE2.0
            0x03, //                    3 bytes of data
            0x01, //                    Sub-block index
            0x00, 0x00, //              Repeat inifinitely
            0x00, //                    End of block
        ];
    }
}
