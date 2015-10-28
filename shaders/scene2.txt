#include "trace-frag"

#include "bsdf"
#include "intersect"

void intersect(Ray ray, inout Intersection isect) {
    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);
    sphereIntersect(ray, vec2(-1.424, -0.8), 0.356, 1.0, isect);
    sphereIntersect(ray, vec2(-0.72,  -0.8), 0.356, 2.0, isect);
    sphereIntersect(ray, vec2( 0.0,   -0.8), 0.356, 3.0, isect);
    sphereIntersect(ray, vec2( 0.72,  -0.8), 0.356, 4.0, isect);
    sphereIntersect(ray, vec2( 1.424, -0.8), 0.356, 5.0, isect);
}

vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, inout vec3 throughput) {
           if (isect.mat == 1.0) { return sampleRoughMirror(state, wiLocal, throughput, 0.02);
    } else if (isect.mat == 2.0) { return sampleRoughMirror(state, wiLocal, throughput, 0.05);
    } else if (isect.mat == 3.0) { return sampleRoughMirror(state, wiLocal, throughput, 0.1);
    } else if (isect.mat == 4.0) { return sampleRoughMirror(state, wiLocal, throughput, 0.2);
    } else if (isect.mat == 5.0) { return sampleRoughMirror(state, wiLocal, throughput, 0.5);
    } else {
        throughput *= vec3(0.5);
        return sampleDiffuse(state, wiLocal);
    }
}
