const load_file = async (file) => {
    const res = await fetch(file);
    if (!res.ok) {
        throw "Failed to load file: " + file;
    }
    return await res.text();
}

class Renderer {
    #canvas;
    #gl;
    #quad_vao;
    #quad_buffer;
    #quad_shader;
    #quad_aspect_ratio;
    #quad_sprite;
    #quad_sprite_count;
    #sprite_count;
    #spritesheet;
    #aspect_ratio;

    constructor(canvas) {
        this.#canvas = canvas;
        this.#gl = this.#canvas.getContext("webgl2");
        if (!this.#gl) {
            throw `WebGL2 is not supported...`;
        }
    }

    async init() {
        this.resize();

        // spritesheet
        {
            const gl = this.#gl;
            this.#spritesheet = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.#spritesheet);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([25, 25, 25, 255]));
            this.#glError();

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            this.#glError();

            this.#sprite_count = 1;
        }

        // quads
        {
            const gl = this.#gl;
            this.#quad_vao = gl.createVertexArray();
            gl.bindVertexArray(this.#quad_vao);
            this.#glError();

            this.#quad_buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.#quad_buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(0), gl.DYNAMIC_DRAW);
            this.#glError();

            this.#quad_shader = await this.#compileShader("/glsl/quad.vert", "/glsl/quad.frag");

            const placement_attribute = gl.getAttribLocation(this.#quad_shader, "aPos");
            gl.enableVertexAttribArray(placement_attribute);
            gl.vertexAttribPointer(placement_attribute, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);

            const texture_attribute = gl.getAttribLocation(this.#quad_shader, "aTexCoord");
            this.#glError();
            gl.enableVertexAttribArray(texture_attribute);
            gl.vertexAttribPointer(texture_attribute, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

            this.#quad_aspect_ratio = gl.getUniformLocation(this.#quad_shader, "aspectRatio");
            this.#glError();

            this.#quad_sprite_count = gl.getUniformLocation(this.#quad_shader, "sprite_count");
            this.#glError();

            this.#quad_sprite = gl.getUniformLocation(this.#quad_shader, "sprite");
            this.#glError();
        }

    }

    setSpriteSheet(sprite_width, sprite_height, data) {
        if (data.BYTES_PER_ELEMENT != Uint8Array.BYTES_PER_ELEMENT) {
            throw `Elements must be Uint8`;
        }
        if (data.length % 4 != 0) {
            throw `Image data must be RGBA`;
        }
        const image_size = sprite_width * sprite_height;
        if (data.length % image_size != 0) {
            throw `All sprites must be equally sized.`;
        }
        const sprite_count = (data.length / 4) / image_size;
        console.info(`Loading spritesheet with ${sprite_count} images into Renderer.`);

        const gl = this.#gl;
        gl.bindTexture(gl.TEXTURE_2D, this.#spritesheet);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sprite_width, sprite_height * sprite_count, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        this.#sprite_count = sprite_count;
    }

    drawQuads(data) {
        const gl = this.#gl;
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#quad_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        this.#glError();

        gl.useProgram(this.#quad_shader);
        gl.bindVertexArray(this.#quad_vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#quad_buffer);
        this.#glError();

        gl.uniform1f(this.#quad_aspect_ratio, this.#aspect_ratio);
        this.#glError();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.#spritesheet);
        gl.uniform1i(this.#quad_sprite, 0);
        this.#glError();

        gl.uniform1i(this.#quad_sprite_count, this.#sprite_count);
        this.#glError();

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, data.length / 4);
        this.#glError();
    }

    clear(r, g, b) {
        const gl = this.#gl;
        gl.clearColor(r, g, b, 1.0);
        gl.clear(this.#gl.COLOR_BUFFER_BIT);
        this.#glError();
    }

    resize() {
        const rect = this.#canvas.parentNode.getBoundingClientRect();
        this.#canvas.width = rect.width;
        this.#canvas.height = rect.height;
        this.#aspect_ratio = rect.width / rect.height;
        this.#gl.viewport(0, 0, rect.width, rect.height);
        this.#glError();
        // console.log("Resized viewport (", rect.width, ',', rect.height, " ratio=", this.#aspect_ratio, ").");
    }

    async #compileShader(vert_url, frag_url) {
        const gl = this.#gl;
        const vert_src = await load_file(vert_url);
        const frag_src = await load_file(frag_url);
        const vert_shader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vert_shader, vert_src);
        gl.compileShader(vert_shader);
        if (!gl.getShaderParameter(vert_shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(vert_shader);
            throw `Could not compile vertex shader:\nShaderInfoLog:\n---\n${info}---`;
        }
        const frag_shader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(frag_shader, frag_src);
        gl.compileShader(frag_shader);
        if (!gl.getShaderParameter(frag_shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(frag_shader);
            throw `Could not compile fragment shader:\nShaderInfoLog:\n---\n${info}---`;
        }
        const shader = gl.createProgram();
        gl.attachShader(shader, vert_shader);
        gl.attachShader(shader, frag_shader);
        gl.linkProgram(shader);
        if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(shader);
            throw `Could not link shader program:\n${info}`;
        }
        return shader;
    }

    #glError() {
        const error = this.#gl.getError();
        if (error !== this.#gl.NO_ERROR) {
            throw `OpenGL error: ${error}`;
        }
    }
};

export { Renderer };
