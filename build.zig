const std = @import("std");

pub fn build(b: *std.Build) void {
    const optimize = b.standardOptimizeOption(.{});

    const lib = b.addSharedLibrary(.{
        .name = "background",
        .root_source_file = .{ .path = "zig/lib.zig" },
        .target = std.zig.CrossTarget{
            .os_tag = .freestanding,
            .cpu_arch = .wasm32,
        },
        .optimize = optimize,
    });

    lib.rdynamic = true;

    const install_lib = b.addInstallArtifact(lib, .{
        .dest_dir = .{ .override = .{ .custom = "wasm" } },
    });

    b.getInstallStep().dependOn(&install_lib.step);
}
