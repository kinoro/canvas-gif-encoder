/* eslint-disable no-bitwise */
const MAX_CODE_LENGTH = 12;
const PACKER_BITS_PER_ELEMENT = 8;
const PACKER_BLOCK_SIZE_LIMIT = 1 << PACKER_BITS_PER_ELEMENT;

class CodePacker {
    constructor () {
        this.result = [];
        this.blockBuffer = [];
        this.bitBuffer = [];
    }

    write (code, codeSize) {
        for (let bit = 0; bit < codeSize; ++bit) {
            this.bitBuffer.push((code >> bit) & 1);
        }

        const nbBlocks = this.blockBuffer.length + Math.ceil(this.bitBuffer.length / PACKER_BITS_PER_ELEMENT);
        if (nbBlocks >= PACKER_BLOCK_SIZE_LIMIT) {
            this.flushBlock();
        }

        this.pushBits();
    }

    pushBits () {
        while (this.bitBuffer.length >= PACKER_BITS_PER_ELEMENT) {
            let byteValue = 0;
            for (let bit = 0; bit < PACKER_BITS_PER_ELEMENT; ++bit) {
                byteValue |= (this.bitBuffer.shift() & 1) << bit;
            }
            this.blockBuffer.push(byteValue);
        }
    }
    flushBits () {
        this.pushBits();

        if (this.bitBuffer.length !== 0) {
            let byteValue = 0;
            for (let bit = 0; bit < this.bitBuffer.length; ++bit) {
                byteValue |= (this.bitBuffer.shift() & 1) << bit;
            }
            this.blockBuffer.push(byteValue);
            this.bitBuffer = [];
        }
    }

    flushBlock () {
        if (this.blockBuffer.length !== 0) {
            this.result.push(this.blockBuffer.length);
            this.result = this.result.concat(this.blockBuffer);
            this.blockBuffer = [];
        }
    }

    flush () {
        this.flushBits();
        this.flushBlock();
    }
}

/**
 * Run LZW compress algorithm
 * @param {Number} minCodeSize -
 * @param {Uint8Array} data -
 * @returns {Uint8Array}
 */
export default (minCodeSize, data) => {
    const CLEAR_CODE = 1 << minCodeSize;
    const END_CODE = CLEAR_CODE + 1;

    let output = [];

    const packer = new CodePacker();
    let dictionary = new Map();
    let dictionarySize = END_CODE + 1;
    let phrase = "";

    let codeLength = Math.ceil(Math.log2(dictionarySize));

    packer.write(CLEAR_CODE, codeLength);

    for (let i = 0, l = data.length; i < l; ++i) {
        const byte = data[i];
        const char = String.fromCharCode(byte);
        const newPhrase = phrase + char;

        if (newPhrase.length === 1 || dictionary.has(newPhrase)) {
            phrase = newPhrase;
        }
        else {
            if (phrase.length > 1) {
                packer.write(dictionary.get(phrase), codeLength);
            }
            else {
                packer.write(phrase.charCodeAt(0), codeLength);
            }
            dictionary.set(newPhrase, dictionarySize);
            ++dictionarySize;
            codeLength = Math.ceil(Math.log2(dictionarySize));

            if (dictionarySize >= (1 << MAX_CODE_LENGTH)) {
                packer.write(CLEAR_CODE, codeLength);
                dictionary = new Map();
                dictionarySize = END_CODE + 1;

                codeLength = Math.ceil(Math.log2(dictionarySize));
            }

            phrase = char;
        }
    }

    if (phrase !== "") {
        if (phrase.length > 1) {
            packer.write(dictionary.get(phrase), codeLength);
        }
        else {
            packer.write(phrase.charCodeAt(0), codeLength);
        }
    }

    packer.write(END_CODE, codeLength);
    packer.flush();
    output = output.concat(packer.result);

    output.push(0); // Empty block

    return Uint8Array.from(output);
};
