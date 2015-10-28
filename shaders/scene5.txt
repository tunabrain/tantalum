#include "trace-frag"

#include "bsdf"
#include "intersect"
#include "csg-intersect"

void intersect(Ray ray, inout Intersection isect) {
    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);
    planoConcaveLensIntersect(ray, vec2(0.8, 0.0), 0.6, 0.3, 0.6, 1.0, isect);
}

vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, inout vec3 throughput) {
    if (isect.mat == 1.0) {
        return sampleMirror(wiLocal);
    } else {
        throughput *= vec3(0.5);
        return sampleDiffuse(state, wiLocal);
    }
}
