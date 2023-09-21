class SvgRasterizer {
    #canvas;
    #ctx;
    #data;
    constructor(width, height) {
        this.#canvas = document.createElement("canvas");
        this.#canvas.width = width;
        this.#canvas.height = height;
        this.#ctx = this.#canvas.getContext("2d");
        this.#data = new Uint8Array(0);
        console.log(`Created rasterizer for images of size ${width}x${height}`);
    }

    async addSvg(svg_url) {
        const img = new Image();
        await new Promise((resolve) => {
            img.onload = () => {
                this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
                this.#ctx.drawImage(img, 0, 0, this.#canvas.width, this.#canvas.height);
                resolve();
            };
            img.src = svg_url;
        });

        const pixels = new Uint8Array(this.#ctx.getImageData(
            0, 0, this.#canvas.width, this.#canvas.height
        ).data.buffer);

        const new_data = new Uint8Array(this.#data.length + pixels.length);
        new_data.set(this.#data, 0);
        new_data.set(pixels, this.#data.length);
        this.#data = new_data;
    }

    get data() {
        if (this.#data.length == 0) {
            throw `No data available`;
        }
        return this.#data;
    }

    get width() {
        return this.#canvas.width;
    }

    get height() {
        return this.#canvas.height;
    }
}

export { SvgRasterizer };
