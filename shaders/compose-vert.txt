#include "preamble"

attribute vec3 Position;
attribute vec2 TexCoord;

varying vec2 vTexCoord;

void main(void) {
    gl_Position = vec4(Position, 1.0);
    vTexCoord = TexCoord;
}
