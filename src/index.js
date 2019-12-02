/* eslint-disable no-bitwise */
import KMean from "@seregpie/k-means";
import compress from "./lzw";

/**
 * Gives the unicode value of a character
 * @param {String} char - Unique character to encode
 * @returns {Number}
 */
const encodeChar = char => char.charCodeAt(0);

/**
 * Turn string to their char code
 * @param {String} string - Any string
 * @returns {Array}
 */
const encodeString = string => string.split("").map(encodeChar);

/**
 * Turn a number into it's 8bits int representation with least significant bit first
 * @param {Number} number - Any number
 * @returns {[number, number]}
 */
const lsb = number => [number & 0xff, (number >> 8) & 0xff];

/**
 * Encode a color into a binary representation (rrrrrrrrggggggggbbbbbbbb)
 * @param {Array} array - Array of RGB values
 * @param {Number} index - Index from where to start (avoid array split)
 * @returns {Number}
 */
const encodeColor = (array, index = 0) => (array[index] << 16) | (array[index + 1] << 8) | array[index + 2];

/**
 * Explode a binary color into it's RGB representation
 * @param {Number} color - Color as a single number over 24 bits
 * @returns {[Number, Number, Number]}
 */
const decodeColor = color => [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];

const VERSION_DESCRIPTOR = encodeString("GIF89a");
const APPLICATION_NAME = encodeString("NETSCAPE2.0");
const BLOCK_INTRODUCER = encodeChar("!");
const IMAGE_INTRODUCER = encodeChar(",");
const FILE_END = encodeChar(";");

const defaultOptions = {
    alphaThreshold: 0.1,
    quality: 1,
};

/**
 * @class
 */
export default class CanvasGifEncoder {
    /**
     * @typedef {Object} EncoderOptions
     * @prop {Number} [alphaThreshold=0.1] - At which point a color is considered transparent (1 always, 0 never)
     * @prop {Number} [quality=1] - Control the output's quality, can speed up process and reduce file size (1 best, 0 non-existent)
     */
    /**
     * CanvasGifEncoder constructor
     * @param {Number} width - Width of the GIF
     * @param {Number} height - Height of the GIF
     * @param {EncoderOptions} options - Encode options
     */
    constructor (width, height, options = {}) {
        this.width = width;
        this.height = height;

        /**
         * @type {EncoderOptions}
         */
        this.options = {
            ...defaultOptions,
            ...options,
        };

        this.stream = null;
        this.skip = null;
        this.flush();
    }

    /**
     * Add a new frame to the GIF
     * @param {CanvasRenderingContext2D|ImageData} context - Context from where to extract pixels or already extracted pixels
     * @param {Number} delay - Time of wait for this frame in millisecond
     * @return {Boolean} Whether this frame was added or not
     */
    addFrame (context, delay = 1000 / 60) {
        this.skip += delay / 10;
        if (this.skip <= 0) {
            return false;
        }

        const centi = Math.max(2, Math.round(this.skip));
        this.skip -= centi;

        const graphicControlExtension = Uint8Array.of(
            BLOCK_INTRODUCER, //    GIF extension block introducer
            0xf9, 0x04, //          Graphic Control Extension (4 bytes)
            0x09, //                Restore to BG color, do not expect user input, transparent index exists
            ...lsb(centi), //       Delay in centi-seconds (little-endian)
            0x00, //                Color 0 is transparent
            0x00, //                End of block
        );

        const colorTable = [];

        const { data, width, height } = typeof context.getImageData === "function" ?
            context.getImageData(0, 0, this.width, this.height) :
            context;
        let pixelData = new Uint32Array(width * height);

        const alphaThreshold = 0xff * this.options.alphaThreshold;
        for (let i = 0, l = data.length; i < l; i += 4) {
            let colorIndex;
            // Transparent
            if (data[i + 3] < alphaThreshold) {
                colorIndex = 0;
            }
            else {
                const color = encodeColor(data, i);
                // If color doesn't exists in table add it
                if (colorTable.includes(color)) {
                    colorIndex = colorTable.indexOf(color) + 1;
                }
                else {
                    colorTable.push(color);
                    colorIndex = colorTable.length;
                }
            }
            pixelData[i / 4] = colorIndex;
        }

        let decoded = colorTable.map(decodeColor);

        const tableMax = Math.max(1, Math.round(0xfe * Math.min(this.options.quality, 1)));
        if (colorTable.length > tableMax) {
            const replace = new Array(colorTable.length);
            replace[0] = 0; // Transparent should never be changed
            const reduced = KMean(decoded, tableMax);
            decoded = reduced.map((bucket, index) => {
                bucket.forEach((color) => {
                    const from = colorTable.indexOf(encodeColor(color)) + 1;
                    return replace[from] = index + 1;
                });
                const l = bucket.length;
                return bucket.reduce((mean, val) => mean.map((chn, i) => chn + (val[i] / l)), [0, 0, 0]);
            });
            pixelData = pixelData.map(colorIndex => replace[colorIndex]);
        }

        const colorTableBits = Math.max(2, Math.ceil(Math.log2(decoded.length + 1)));

        const colorTableData = new Uint8Array((1 << colorTableBits) * 3);
        colorTableData.set(decoded.flat(), 3);

        const imageDescriptor = Uint8Array.of(
            IMAGE_INTRODUCER, //                        Image descriptor
            0x00, 0x00, //                              Left X coordinate of image in pixels (little-endian)
            0x00, 0x00, //                              Top Y coordinate of image in pixels (little-endian)
            ...lsb(width), //                           Image width in pixels (little-endian)
            ...lsb(height), //                          Image height in pixels (little-endian)
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

        return true;
    }

    /**
     * Close the GIF
     * @returns {Uint8Array}
     */
    end () {
        if (this.stream[this.stream.length - 1] !== FILE_END) {
            this.stream.push(FILE_END); // File end
        }

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
            0x21, 0xff, 0x0b, //        Application Extension block (11 bytes for app name and code)
            ...APPLICATION_NAME, //     NETSCAPE2.0
            0x03, //                    3 bytes of data
            0x01, //                    Sub-block index
            0x00, 0x00, //              Repeat inifinitely
            0x00, //                    End of block
        ];

        this.skip = 0;
    }
}
