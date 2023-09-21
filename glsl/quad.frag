precision mediump float;

varying vec2 texCoord;
uniform sampler2D sprite;
uniform int sprite_count;

void main()
{
    vec2 sprite_coord = vec2(texCoord.x, texCoord.y / float(sprite_count));
    gl_FragColor = texture2D(sprite, sprite_coord);
    // gl_FragColor = vec4(
    //    texCoord.x / float(sprite_count),
    //    texCoord.y / float(sprite_count),
    //    1.0,
    //    1.0
    // );
}
