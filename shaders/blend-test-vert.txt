#include "preamble"

attribute vec3 Position;

void main(void) {
    gl_Position = vec4(Position, 1.0);
}
