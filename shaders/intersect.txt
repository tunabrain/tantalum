void bboxIntersect(Ray ray, vec2 center, vec2 radius, float matId, inout Intersection isect) {
    vec2 pos = ray.pos - center;
    float tx1 = (-radius.x - pos.x)*ray.invDir.x;
    float tx2 = ( radius.x - pos.x)*ray.invDir.x;
    float ty1 = (-radius.y - pos.y)*ray.invDir.y;
    float ty2 = ( radius.y - pos.y)*ray.invDir.y;
    
    float minX = min(tx1, tx2), maxX = max(tx1, tx2);
    float minY = min(ty1, ty2), maxY = max(ty1, ty2);
 
    float tmin = max(isect.tMin, max(minX, minY));
    float tmax = min(isect.tMax, min(maxX, maxY));
 
    if (tmax >= tmin) {
        isect.tMax = (tmin == isect.tMin) ? tmax : tmin;
        isect.n = isect.tMax == tx1 ? vec2(-1.0, 0.0) : isect.tMax == tx2 ? vec2(1.0, 0.0) :
                  isect.tMax == ty1 ? vec2( 0.0, 1.0) :                     vec2(0.0, 1.0);
        isect.mat = matId;
    }
}
void sphereIntersect(Ray ray, vec2 center, float radius, float matId, inout Intersection isect) {
    vec2 p = ray.pos - center;
    float B = dot(p, ray.dir);
    float C = dot(p, p) - radius*radius;
    float detSq = B*B - C;
    if (detSq >= 0.0) {
        float det = sqrt(detSq);
        float t = -B - det;
        if (t <= isect.tMin || t >= isect.tMax)
            t = -B + det;
        if (t > isect.tMin && t < isect.tMax) {
            isect.tMax = t;
            isect.n = normalize(p + ray.dir*t);
            isect.mat = matId;
        }
    }
}
void lineIntersect(Ray ray, vec2 a, vec2 b, float matId, inout Intersection isect) {
    vec2 sT = b - a;
    vec2 sN = vec2(-sT.y, sT.x);
    float t = dot(sN, a - ray.pos)/dot(sN, ray.dir);
    float u = dot(sT, ray.pos + ray.dir*t - a);
    if (t < isect.tMin || t >= isect.tMax || u < 0.0 || u > dot(sT, sT))
        return;
    
    isect.tMax = t;
    isect.n = normalize(sN);
    isect.mat = matId;
}
void prismIntersect(Ray ray, vec2 center, float radius, float matId, inout Intersection isect) {
    lineIntersect(ray, center + vec2(   0.0,  1.0)*radius, center + vec2( 0.866, -0.5)*radius, matId, isect);
    lineIntersect(ray, center + vec2( 0.866, -0.5)*radius, center + vec2(-0.866, -0.5)*radius, matId, isect);
    lineIntersect(ray, center + vec2(-0.866, -0.5)*radius, center + vec2(   0.0,  1.0)*radius, matId, isect);
}
