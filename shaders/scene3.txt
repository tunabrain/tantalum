#include "trace-frag"

#include "bsdf"
#include "intersect"

void intersect(Ray ray, inout Intersection isect) {
    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);
    bboxIntersect(ray, vec2(0.0), vec2(1.2,  0.8), 1.0, isect);
    sphereIntersect(ray, vec2(-0.7, -0.45), 0.35, 3.0, isect);
    sphereIntersect(ray, vec2( 0.7, -0.45), 0.35, 2.0, isect);
}

vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, inout vec3 throughput) {
    if (isect.mat == 2.0) {
        float ior = sellmeierIor(vec3(1.6215, 0.2563, 1.6445), vec3(0.0122, 0.0596, 147.4688), lambda)/1.4;
        return sampleDielectric(state, wiLocal, ior);
    } else if (isect.mat == 3.0) {
        return sampleMirror(wiLocal);
    } else if (isect.mat == 1.0) {
             if (isect.n.x == -1.0) throughput *= vec3(0.14,  0.45,  0.091);
        else if (isect.n.x ==  1.0) throughput *= vec3(0.63,  0.065, 0.05);
        else                        throughput *= vec3(0.725, 0.71,  0.68);
        return sampleDiffuse(state, wiLocal);
    } else {
        throughput *= vec3(0.5);
        return sampleDiffuse(state, wiLocal);
    }
}
