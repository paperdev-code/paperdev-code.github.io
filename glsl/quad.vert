uniform float aspectRatio;
attribute vec2 aPos;
attribute vec2 aTexCoord;

varying vec2 texCoord;

void main()
{
    float angle = 3.1415 * 0.1;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 pos = rotation * aPos * vec2(1.0 / aspectRatio, 1.0);
    gl_Position = vec4(pos.x + (pos.y * 0.25), pos.y * 0.75, 0.0, 1.0);
    texCoord = aTexCoord;
}
