#include "trace-frag"

#include "bsdf"
#include "intersect"

void intersect(Ray ray, inout Intersection isect) {
    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);
    prismIntersect(ray, vec2(0.0, 0.0), 0.6, 1.0, isect);
}

vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, inout vec3 throughput) {
    if (isect.mat == 1.0) {
        float ior = sellmeierIor(vec3(1.6215, 0.2563, 1.6445), vec3(0.0122, 0.0596, 17.4688), lambda)/1.8;
        return sampleRoughDielectric(state, wiLocal, 0.1, ior);
    } else {
        throughput *= vec3(0.05);
        return sampleDiffuse(state, wiLocal);
    }
}
