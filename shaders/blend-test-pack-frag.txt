#include "preamble"

uniform sampler2D Tex;

void main() {
    gl_FragColor = texture2D(Tex, vec2(0.5))*(1.0/255.0);
}
