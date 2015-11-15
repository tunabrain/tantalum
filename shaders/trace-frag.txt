#extension GL_EXT_draw_buffers : require
#include "preamble"
#include "rand"

uniform sampler2D PosData;
uniform sampler2D RngData;
uniform sampler2D RgbData;

varying vec2 vTexCoord;

struct Ray {
    vec2 pos;
    vec2 dir;
    vec2 invDir;
    vec2 dirSign;
};
struct Intersection {
    float tMin;
    float tMax;
    vec2 n;
    float mat;
};

void intersect(Ray ray, inout Intersection isect);
vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, inout vec3 throughput);

Ray unpackRay(vec4 posDir) {
    vec2 pos = posDir.xy;
    vec2 dir = posDir.zw;
    dir.x = abs(dir.x) < 1e-5 ? 1e-5 : dir.x; /* The nuclear option to fix NaN issues on some platforms */
    dir.y = abs(dir.y) < 1e-5 ? 1e-5 : dir.y;
    return Ray(pos, normalize(dir), 1.0/dir, sign(dir));
}

void main() {
    vec4 posDir    = texture2D(PosData, vTexCoord);
    vec4 state     = texture2D(RngData, vTexCoord);
    vec4 rgbLambda = texture2D(RgbData, vTexCoord);
    
    Ray ray = unpackRay(posDir);
    Intersection isect;
    isect.tMin = 1e-4;
    isect.tMax = 1e30;
    intersect(ray, isect);
    
    vec2 t = vec2(-isect.n.y, isect.n.x);
    vec2 wiLocal = -vec2(dot(t, ray.dir), dot(isect.n, ray.dir));
    vec2 woLocal = sample(state, isect, rgbLambda.w, wiLocal, rgbLambda.rgb);
    
    if (isect.tMax == 1e30) {
        rgbLambda.rgb = vec3(0.0);
    } else {
        posDir.xy = ray.pos + ray.dir*isect.tMax;
        posDir.zw = woLocal.y*isect.n + woLocal.x*t;
    }
    
    gl_FragData[0] = posDir;
    gl_FragData[1] = state;
    gl_FragData[2] = rgbLambda;
}
