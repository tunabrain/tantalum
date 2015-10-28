#include "preamble"

uniform sampler2D Frame;

varying vec2 vTexCoord;

void main() {
    gl_FragColor = vec4(texture2D(Frame, vTexCoord).rgb, 1.0);
}
