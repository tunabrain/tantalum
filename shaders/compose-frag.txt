#include "preamble"

uniform sampler2D Frame;
uniform float Exposure;

varying vec2 vTexCoord;

void main() {
    gl_FragColor = vec4(pow(texture2D(Frame, vTexCoord).rgb*Exposure, vec3(1.0/2.2)), 1.0);
}
