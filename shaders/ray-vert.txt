#include "preamble"

uniform sampler2D PosDataA;
uniform sampler2D PosDataB;
uniform sampler2D RgbData;
uniform float Aspect;

attribute vec3 TexCoord;

varying vec3 vColor;

void main() {
    vec2 posA = texture2D(PosDataA, TexCoord.xy).xy;
    vec2 posB = texture2D(PosDataB, TexCoord.xy).xy;
    vec2 pos = mix(posA, posB, TexCoord.z);
    vec2 dir = posB - posA;
    float biasCorrection = clamp(length(dir)/max(abs(dir.x), abs(dir.y)), 1.0, 1.414214);
    
    gl_Position = vec4(pos.x/Aspect, pos.y, 0.0, 1.0);
    vColor = texture2D(RgbData, TexCoord.xy).rgb*biasCorrection;
}
