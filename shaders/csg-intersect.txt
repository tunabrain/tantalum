struct Segment {
    float tNear, tFar;
    vec2  nNear, nFar;
};

Segment segmentIntersection(Segment a, Segment b) {
    return Segment(
        max(a.tNear, b.tNear),
        min(a.tFar,  b.tFar),
        (a.tNear > b.tNear) ? a.nNear : b.nNear,
        (a.tFar  < b.tFar)  ? a.nFar  : b.nFar
    );
}
Segment segmentSubtraction(Segment a, Segment b, float tMin) {
    if (a.tNear >= a.tFar || b.tNear >= b.tFar || a.tFar <= b.tNear || a.tNear >= b.tFar)
        return a;
    
    Segment s1 = Segment(a.tNear, b.tNear, a.nNear, -b.nNear);
    Segment s2 = Segment(b.tFar,  a.tFar, -b.nFar,   a.nFar);
    bool valid1 = s1.tNear <= s1.tFar;
    bool valid2 = s2.tNear <= s2.tFar;
    
    if (valid1 && valid2) {
        if (s1.tFar >= tMin) return s1; else return s2;
    } else {
        if (valid1) return s1; else return s2;
    }
}
void segmentCollapse(Segment segment, float matId, inout Intersection isect) {
    segment.tNear = max(segment.tNear, isect.tMin);
    segment.tFar  = min(segment.tFar,  isect.tMax);
    
    if (segment.tNear <= segment.tFar) {
        if (segment.tNear > isect.tMin) {
            isect.tMax = segment.tNear;
            isect.n = segment.nNear;
            isect.mat = matId;
        } else if (segment.tFar < isect.tMax) {
            isect.tMax = segment.tFar;
            isect.n = segment.nFar;
            isect.mat = matId;
        }
    }
}

Segment horzSpanIntersect(Ray ray, float y, float radius) {
    float dc = (y - ray.pos.y)*ray.invDir.y;
    float dt = ray.dirSign.y*radius*ray.invDir.y;
    return Segment(dc - dt, dc + dt, vec2(0.0, -ray.dirSign.y), vec2(0.0, ray.dirSign.y));
}
Segment vertSpanIntersect(Ray ray, float x, float radius) {
    float dc = (x - ray.pos.x)*ray.invDir.x;
    float dt = ray.dirSign.x*radius*ray.invDir.x;
    return Segment(dc - dt, dc + dt, vec2(-ray.dirSign.x, 0.0), vec2(ray.dirSign.x, 0.0));
}
Segment boxSegmentIntersect(Ray ray, vec2 center, vec2 radius) {
    return segmentIntersection(
        horzSpanIntersect(ray, center.y, radius.y),
        vertSpanIntersect(ray, center.x, radius.x)
    );
}
Segment sphereSegmentIntersect(Ray ray, vec2 center, float radius) {
    Segment result;
    
    vec2 p = ray.pos - center;
    float B = dot(p, ray.dir);
    float C = dot(p, p) - radius*radius;
    float detSq = B*B - C;
    if (detSq >= 0.0) {
        float det = sqrt(detSq);
        result.tNear = -B - det;
        result.tFar  = -B + det;
        result.nNear = (p + ray.dir*result.tNear)*(1.0/radius);
        result.nFar  = (p + ray.dir*result.tFar)*(1.0/radius);
    } else {
        result.tNear =  1e30;
        result.tFar  = -1e30;
    }
    
    return result;
}

void biconvexLensIntersect(Ray ray, vec2 center, float h, float d, float r1, float r2, float matId, inout Intersection isect) {
    segmentCollapse(segmentIntersection(segmentIntersection(
        horzSpanIntersect(ray, center.y, h),
        sphereSegmentIntersect(ray, center + vec2(r1 - d, 0.0), r1)),
        sphereSegmentIntersect(ray, center - vec2(r2 - d, 0.0), r2)
    ), matId, isect);
}
void biconcaveLensIntersect(Ray ray, vec2 center, float h, float d, float r1, float r2, float matId, inout Intersection isect) {
    segmentCollapse(segmentSubtraction(segmentSubtraction(segmentIntersection(
        horzSpanIntersect(ray, center.y, h),
        vertSpanIntersect(ray, center.x + 0.5*(r2 - r1), 0.5*(abs(r1) + abs(r2)) + d)),
        sphereSegmentIntersect(ray, center + vec2(r2 + d, 0.0), r2), isect.tMin),
        sphereSegmentIntersect(ray, center - vec2(r1 + d, 0.0), r1), isect.tMin
    ), matId, isect);
}
void meniscusLensIntersect(Ray ray, vec2 center, float h, float d, float r1, float r2, float matId, inout Intersection isect) {
    segmentCollapse(segmentSubtraction(segmentIntersection(segmentIntersection(
        horzSpanIntersect(ray, center.y, h),
        vertSpanIntersect(ray, center.x + 0.5*r2, 0.5*abs(r2) + d)),
        sphereSegmentIntersect(ray, center + vec2(r1 - sign(r1)*d, 0.0), abs(r1))),
        sphereSegmentIntersect(ray, center + vec2(r2 + sign(r2)*d, 0.0), abs(r2)), isect.tMin
    ), matId, isect);
}
void planoConvexLensIntersect(Ray ray, vec2 center, float h, float d, float r, float matId, inout Intersection isect) {
    segmentCollapse(segmentIntersection(
        boxSegmentIntersect(ray, center, vec2(d, h)),
        sphereSegmentIntersect(ray, center + vec2(r - d, 0.0), abs(r))
    ), matId, isect);
}
void planoConcaveLensIntersect(Ray ray, vec2 center, float h, float d, float r, float matId, inout Intersection isect) {
    segmentCollapse(segmentSubtraction(segmentIntersection(
        horzSpanIntersect(ray, center.y, h),
        vertSpanIntersect(ray, center.x - 0.5*r, 0.5*abs(r) + d)),
        sphereSegmentIntersect(ray, center - vec2(r + d, 0.0), abs(r)), isect.tMin
    ), matId, isect);
}
