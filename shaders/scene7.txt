#include "trace-frag"

#include "bsdf"
#include "intersect"
#include "csg-intersect"

void intersect(Ray ray, inout Intersection isect) {
    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);
    sphereIntersect(ray, vec2(0.0, 0.0), 0.4, 1.0, isect);
    biconvexLensIntersect(ray, vec2(-0.4, -0.65), 0.3, 0.12, 0.5, 0.5, 1.0, isect);
    meniscusLensIntersect(ray, vec2(-0.8, -0.65), 0.3, 0.08, -0.5, -0.5, 1.0, isect);
    planoConcaveLensIntersect(ray, vec2(1.3, 0.0), 0.3, 0.0, 0.3, 2.0, isect);
    prismIntersect(ray, vec2(0.8, -0.7), 0.2, 1.0, isect);
}

vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, inout vec3 throughput) {
    if (isect.mat == 1.0) {
        float ior = sellmeierIor(vec3(1.6215, 0.2563, 1.6445), vec3(0.0122, 0.0596, 147.4688), lambda)/1.6; // SF10
        return sampleDielectric(state, wiLocal, ior);
    } else if (isect.mat == 2.0) {
        return sampleMirror(wiLocal);
    } else {
        throughput *= vec3(0.25);
        return sampleDiffuse(state, wiLocal);
    }
}
