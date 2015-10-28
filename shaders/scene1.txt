#include "trace-frag"

#include "bsdf"
#include "intersect"
#include "csg-intersect"

void intersect(Ray ray, inout Intersection isect) {
    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);
    biconvexLensIntersect   (ray, vec2(-0.4, 0.0), 0.375, 0.15,   0.75, 0.75, 1.0, isect);
    biconcaveLensIntersect  (ray, vec2( 0.4, 0.0), 0.375, 0.0375, 0.75, 0.75, 1.0, isect);
    planoConvexLensIntersect(ray, vec2(-1.2, 0.0), 0.375, 0.075,  0.75,       1.0, isect);
    meniscusLensIntersect   (ray, vec2( 0.8, 0.0), 0.375, 0.15,   0.45, 0.75, 1.0, isect);
}

vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, inout vec3 throughput) {
    if (isect.mat == 1.0) {
        float ior = sellmeierIor(vec3(1.6215, 0.2563, 1.6445), vec3(0.0122, 0.0596, 147.4688), lambda)/1.4;
        return sampleDielectric(state, wiLocal, ior);
    } else {
        throughput *= vec3(0.5);
        return sampleDiffuse(state, wiLocal);
    }
}
