#extension GL_EXT_draw_buffers : require
#include "preamble"

#include "rand"

uniform sampler2D RngData;
uniform sampler2D Spectrum;
uniform sampler2D Emission;
uniform sampler2D ICDF;
uniform sampler2D PDF;
uniform vec2 EmitterPos;
uniform vec2 EmitterDir;
uniform float EmitterPower;
uniform float SpatialSpread;
uniform vec2 AngularSpread;

varying vec2 vTexCoord;

void main() {
    vec4 state = texture2D(RngData, vTexCoord);

    float theta = AngularSpread.x + (rand(state) - 0.5)*AngularSpread.y;
    vec2 dir = vec2(cos(theta), sin(theta));
    vec2 pos = EmitterPos + (rand(state) - 0.5)*SpatialSpread*vec2(-EmitterDir.y, EmitterDir.x);
    
    float randL = rand(state);
    float spectrumOffset = texture2D(ICDF, vec2(randL, 0.5)).r + rand(state)*(1.0/256.0);
    float lambda = 360.0 + (750.0 - 360.0)*spectrumOffset;
    vec3 rgb = EmitterPower
                    *texture2D(Emission, vec2(spectrumOffset, 0.5)).r
                    *texture2D(Spectrum, vec2(spectrumOffset, 0.5)).rgb
                    /texture2D(PDF,      vec2(spectrumOffset, 0.5)).r;
    
    gl_FragData[0] = vec4(pos, dir);
    gl_FragData[1] = state;
    gl_FragData[2] = vec4(rgb, lambda);
}
