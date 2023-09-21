const std = @import("std");

//JS: console.log
extern fn console_log(message: [*]const u8, len: usize) void;
pub fn log(
    comptime lvl: std.log.Level,
    comptime scope: @Type(.EnumLiteral),
    comptime format: []const u8,
    args: anytype,
) void {
    const lvl_text = comptime lvl.asText();
    const prefix2 = if (scope == .default)
        ": "
    else
        "(" ++ @tagName(scope) ++ "): ";

    var msg_buff: [1024]u8 = undefined;
    const message = std.fmt.bufPrint(
        &msg_buff,
        lvl_text ++ prefix2 ++ format,
        args,
    ) catch return;

    console_log(message.ptr, message.len);
}

const OPERATION_DURATION_MS = 1000;

fn easeInOutCirc(x: f32) f32 {
    const m = std.math;
    return if (x < 0.5)
        (1 - m.sqrt(1 - m.pow(f32, 2 * x, 2))) / 2
    else
        (m.sqrt(1 - m.pow(f32, -2 * x + 2, 2)) + 1) / 2;
}

const SCALE_FACTOR: f32 = 3.5;

const Quad = struct {
    pub const Operation = enum {
        ShiftUp,
        ShiftRight,
        ShiftDown,
        ShiftLeft,
    };

    pub const MESH_SIZE = 24;

    texture: u32,
    origin: @Vector(2, f32),
    pos: @Vector(2, f32),
    size: f32,
    operation: ?Operation,
    time: f32,

    pub fn init(texture: u32, size: f32, pos: @Vector(2, f32)) Quad {
        return Quad{
            .texture = texture,
            .pos = pos,
            .origin = pos,
            .size = size,
            .operation = null,
            .time = 0,
        };
    }

    pub fn toSlice(quad: *const Quad) [MESH_SIZE]f32 {
        const texture = @as(f32, @floatFromInt(quad.texture));
        return [_]f32{
            (-quad.size + quad.pos[0]), (-quad.size + quad.pos[1]), 0.0, 1.0 + texture,
            (quad.size + quad.pos[0]),  (-quad.size + quad.pos[1]), 1.0, 1.0 + texture,
            (-quad.size + quad.pos[0]), (quad.size + quad.pos[1]),  0.0, 0.0 + texture,
            (-quad.size + quad.pos[0]), (quad.size + quad.pos[1]),  0.0, 0.0 + texture,
            (quad.size + quad.pos[0]),  (-quad.size + quad.pos[1]), 1.0, 1.0 + texture,
            (quad.size + quad.pos[0]),  (quad.size + quad.pos[1]),  1.0, 0.0 + texture,
        };
    }

    pub fn setOperation(quad: *Quad, op: Operation) void {
        if (quad.operation == null) {
            quad.operation = op;
            quad.time = 0;
        }
    }

    pub fn update(quad: *Quad, dt: f32) void {
        if (quad.operation) |op| {
            quad.time += dt;

            if (quad.time > OPERATION_DURATION_MS) {
                quad.time = OPERATION_DURATION_MS;
                quad.operation = null;
            }

            const dim_and_dir: struct { usize, f32 } = switch (op) {
                .ShiftUp => .{ 1, -1 },
                .ShiftRight => .{ 0, 1 },
                .ShiftDown => .{ 1, 1 },
                .ShiftLeft => .{ 0, -1 },
            };
            const dim = dim_and_dir[0];
            const dir = dim_and_dir[1];
            var offset = @Vector(2, f32){ 0.0, 0.0 };
            offset[dim] = 2 * quad.size * (dir * easeInOutCirc(quad.time / OPERATION_DURATION_MS));
            quad.pos = quad.origin + offset;
        }

        if (quad.operation == null) {
            quad.origin = quad.pos;
        }

        inline for (0..2) |dim| {
            if (quad.pos[dim] > SCALE_FACTOR + quad.size * 1.5) {
                quad.pos[dim] = -SCALE_FACTOR - quad.size;
            } else if (quad.pos[dim] < -SCALE_FACTOR - quad.size * 1.5) {
                quad.pos[dim] = SCALE_FACTOR + quad.size;
            }
        }
    }
};

const Grid = struct {
    const SIZE = 24;
    const QUAD_SIZE: f32 = SCALE_FACTOR / @as(f32, SIZE);

    var rng: std.rand.DefaultPrng = undefined;
    var quads: [SIZE * SIZE]Quad = undefined;
    var buffer: [quads.len * Quad.MESH_SIZE]f32 = undefined;
    var time: f32 = 0;

    pub fn init(textures: u32, seed: u32) void {
        rng = std.rand.DefaultPrng.init(seed);
        for (0..SIZE) |row| {
            for (0..SIZE) |col| {
                const x: f32 = (-SCALE_FACTOR + QUAD_SIZE) + @as(f32, @floatFromInt(@mod(col, SIZE))) * (QUAD_SIZE * 2.0);
                const y: f32 = (-SCALE_FACTOR + QUAD_SIZE) + @as(f32, @floatFromInt(@mod(row, SIZE))) * (QUAD_SIZE * 2.0);
                const i = row * SIZE + col;
                const r = rng.random();
                const texture = r.intRangeAtMost(u32, 0, textures - 1);
                quads[i] = Quad.init(texture, QUAD_SIZE, .{ x, y });
            }
        }
        std.log.info("Initialized {d} quads", .{quads.len});
        std.log.info("Buffer=[{d}]u8", .{buffer.len});
    }

    fn shiftRow(row: u32, dir: bool) void {
        var tmp: Quad = undefined;
        if (dir) { // left
            quads[row * SIZE].setOperation(.ShiftLeft);
            tmp = quads[row * SIZE];
            for (1..SIZE) |col| {
                const index = row * SIZE + col;
                quads[index - 1] = quads[index];
                quads[index - 1].setOperation(.ShiftLeft);
            }
            quads[row * SIZE + SIZE - 1] = tmp;
        } else {
            tmp = quads[row * SIZE + SIZE - 1];
            for (1..SIZE) |col| {
                const index = row * SIZE + (SIZE - col - 1);
                quads[index + 1] = quads[index];
                quads[index + 1].setOperation(.ShiftRight);
            }
            quads[row * SIZE] = tmp;
        }
    }

    fn shiftCol(col: u32, dir: bool) void {
        var tmp: Quad = undefined;
        if (dir) { // Up
            quads[col].setOperation(.ShiftUp);
            tmp = quads[col];
            for (1..SIZE) |row| {
                const index = row * SIZE + col;
                quads[index - SIZE] = quads[index];
                quads[index - SIZE].setOperation(.ShiftUp);
            }
            quads[(SIZE - 1) * SIZE + col] = tmp;
        } else {
            quads[(SIZE - 1) * SIZE + col].setOperation(.ShiftDown);
            tmp = quads[SIZE - 1 - col];
            for (1..SIZE) |row| {
                const index = (SIZE - 1 - row) * SIZE + col;
                quads[index + SIZE] = quads[index];
                quads[index + SIZE].setOperation(.ShiftDown);
            }
            quads[col] = tmp;
        }
    }

    pub fn update(dt: f32) void {
        time += dt;
        if (time > 1000.0) {
            time = 0.0;
            const col_or_row = rng.random().intRangeAtMost(u32, 0, SIZE - 1);
            if (rng.random().boolean()) {
                shiftRow(col_or_row, rng.random().boolean());
            } else {
                shiftCol(col_or_row, rng.random().boolean());
            }
        }

        for (&quads, 0..) |*quad, i| {
            quad.update(dt);
            const slice = quad.toSlice();
            const in = i * Quad.MESH_SIZE;
            inline for (0..Quad.MESH_SIZE) |j| {
                buffer[in + j] = slice[j];
            }
        }
    }
};

export fn init(textures: u32, seed: u32) i32 {
    Grid.init(textures, seed);
    return Grid.quads.len * Quad.MESH_SIZE;
}

export fn update(dt: f32) [*]const f32 {
    Grid.update(dt);
    return &Grid.buffer;
}

pub const std_options = struct {
    pub const logFn = log;
};
