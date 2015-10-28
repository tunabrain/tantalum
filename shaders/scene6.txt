#include "trace-frag"

#include "bsdf"
#include "intersect"

void intersect(Ray ray, inout Intersection isect) {
    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);
    sphereIntersect(ray, vec2(-0.95,   0.25),    0.4, 1.0, isect);
    sphereIntersect(ray, vec2(-0.15,  -0.25),    0.2, 1.0, isect);
    sphereIntersect(ray, vec2(1.11667, 0.18333), 0.2, 1.0, isect);
    lineIntersect(ray, vec2(0.168689, -0.885424), vec2(1.13131,  -0.614576), 2.0, isect);
    lineIntersect(ray, vec2(1.71686,   0.310275), vec2(0.983139,  0.989725), 2.0, isect);
}

vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, inout vec3 throughput) {
    if (isect.mat == 1.0) {
        float ior = sqrt(sellmeierIor(vec3(1.0396, 0.2318, 1.0105), vec3(0.0060, 0.0200, 103.56), lambda));
        return sampleDielectric(state, wiLocal, ior);
    } else if (isect.mat == 2.0) {
        return sampleMirror(wiLocal);
    } else {
        throughput *= vec3(0.5);
        return sampleDiffuse(state, wiLocal);
    }
}
