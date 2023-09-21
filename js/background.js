import { Renderer } from "./Renderer.js"
import { SvgRasterizer } from "./SvgRasterizer.js"

let renderer = new Renderer(document.getElementById("background"));
let rasterizer = new SvgRasterizer(256, 256);

const fps = 0;
const fps_interval = 1000 / fps;
let then, now, elapsed;
let resized = false;

class BackgroundWasmModule {
    #instance;
    #quad_count;

    constructor(obj) {
        this.#instance = obj.instance;
        this.#quad_count = 0;
    }

    bytes(ptr, len) {
        const memory = this.#instance.exports.memory;
        return new Uint8Array(memory.buffer, ptr, len);
    }

    init(texture_count) {
        this.#quad_count = this.#instance.exports.init(texture_count, Date.now());
    }

    update(dt) {
        const memory = this.#instance.exports.memory;
        return new Float32Array(memory.buffer, this.#instance.exports.update(dt), this.#quad_count);
    }
};

let background_lib;

let importObj = {
    env: {
        console_log: (str, len) => {
            console.log("WASM:", new TextDecoder().decode(background_lib.bytes(str, len)));
        }
    }
};

background_lib = new BackgroundWasmModule(
    await WebAssembly.instantiateStreaming(fetch("/wasm/background.wasm"), importObj)
);

const onInit = async () => {

    let svgs = [
        "/img/zig.svg",
        "/img/c++.svg",
        "/img/c.svg",
        "/img/js.svg",
    ];

    for (let i = 0; i < svgs.length; i++) {
        await rasterizer.addSvg(svgs[i]);
    }

    await background_lib.init(svgs.length);
    await renderer.init();

    renderer.setSpriteSheet(
        rasterizer.width,
        rasterizer.height,
        rasterizer.data
    );

    window.addEventListener("resize", onResize);
    then = window.performance.now();
    now = then;
    requestAnimationFrame(onFrameRequest);
}

const onResize = () => {
    renderer.resize();
    resized = true;
}

const onFrameRequest = (time) => {
    now = time;
    elapsed = now - then;

    if (fps > 0) {
        if (elapsed > fps_interval || resized) {
            if (resized) resized = false;
            then = now - (elapsed % fps_interval);
            onFrame(elapsed);
        }
    }
    else {
        then = now;
        onFrame(elapsed);
    }

    requestAnimationFrame(onFrameRequest);
}

const onFrame = (dt) => {
    renderer.clear(0.1, 0.1, 0.1);
    renderer.drawQuads(background_lib.update(dt));
}

try {
    await onInit();
} catch (err) {
    console.error(`Background crashed:\n${err}`);
}
