var Shaders = {
    'blend-test-frag':
        '#include "preamble"\n\n'                                +

        'void main() {\n'                                        +
        '    gl_FragColor = vec4(vec3(7.0, 59.0, -7.0), 1.0);\n' +
        '}\n',

    'blend-test-pack-frag':
        '#include "preamble"\n\n'                                     +

        'uniform sampler2D Tex;\n\n'                                  +

        'void main() {\n'                                             +
        '    gl_FragColor = texture2D(Tex, vec2(0.5))*(1.0/255.0);\n' +
        '}\n',

    'blend-test-vert':
        '#include "preamble"\n\n'                  +

        'attribute vec3 Position;\n\n'             +

        'void main(void) {\n'                      +
        '    gl_Position = vec4(Position, 1.0);\n' +
        '}\n',

    'bsdf':
        'float sellmeierIor(vec3 b, vec3 c, float lambda) {\n'                             +
        '    float lSq = (lambda*1e-3)*(lambda*1e-3);\n'                                   +
        '    return 1.0 + dot((b*lSq)/(lSq - c), vec3(1.0));\n'                            +
        '}\n\n'                                                                            +

        'float tanh(float x) {\n'                                                          +
        '    if (abs(x) > 10.0) /* Prevent nasty overflow problems */\n'                   +
        '        return sign(x);\n'                                                        +
        '    float e = exp(-2.0*x);\n'                                                     +
        '    return (1.0 - e)/(1.0 + e);\n'                                                +
        '}\n'                                                                              +
        'float atanh(float x) {\n'                                                         +
        '    return 0.5*log((1.0 + x)/(1.0 - x));\n'                                       +
        '}\n\n'                                                                            +

        'float dielectricReflectance(float eta, float cosThetaI, out float cosThetaT) {\n' +
        '    float sinThetaTSq = eta*eta*(1.0 - cosThetaI*cosThetaI);\n'                   +
        '    if (sinThetaTSq > 1.0) {\n'                                                   +
        '        cosThetaT = 0.0;\n'                                                       +
        '        return 1.0;\n'                                                            +
        '    }\n'                                                                          +
        '    cosThetaT = sqrt(1.0 - sinThetaTSq);\n\n'                                     +

        '    float Rs = (eta*cosThetaI - cosThetaT)/(eta*cosThetaI + cosThetaT);\n'        +
        '    float Rp = (eta*cosThetaT - cosThetaI)/(eta*cosThetaT + cosThetaI);\n\n'      +

        '    return (Rs*Rs + Rp*Rp)*0.5;\n'                                                +
        '}\n\n'                                                                            +

        'vec2 sampleDiffuse(inout vec4 state, vec2 wi) {\n'                                +
        '    float x = rand(state)*2.0 - 1.0;\n'                                           +
        '    float y = sqrt(1.0 - x*x);\n'                                                 +
        '    return vec2(x, y*sign(wi.y));\n'                                              +
        '}\n'                                                                              +
        'vec2 sampleMirror(vec2 wi) {\n'                                                   +
        '    return vec2(-wi.x, wi.y);\n'                                                  +
        '}\n'                                                                              +
        'vec2 sampleDielectric(inout vec4 state, vec2 wi, float ior) {\n'                  +
        '    float cosThetaT;\n'                                                           +
        '    float eta = wi.y < 0.0 ? ior : 1.0/ior;\n'                                    +
        '    float Fr = dielectricReflectance(eta, abs(wi.y), cosThetaT);\n'               +
        '    if (rand(state) < Fr)\n'                                                      +
        '        return vec2(-wi.x, wi.y);\n'                                              +
        '    else\n'                                                                       +
        '        return vec2(-wi.x*eta, -cosThetaT*sign(wi.y));\n'                         +
        '}\n\n'                                                                            +

        'float sampleVisibleNormal(float sigma, float xi, float theta0, float theta1) {\n' +
        '    float sigmaSq = sigma*sigma;\n'                                               +
        '    float invSigmaSq = 1.0/sigmaSq;\n\n'                                          +

        '    float cdf0 = tanh(theta0*0.5*invSigmaSq);\n'                                  +
        '    float cdf1 = tanh(theta1*0.5*invSigmaSq);\n\n'                                +

        '    return 2.0*sigmaSq*atanh(cdf0 + (cdf1 - cdf0)*xi);\n'                         +
        '}\n'                                                                              +
        'vec2 sampleRoughMirror(inout vec4 state, vec2 wi, inout vec3 throughput, float s' +
                                                                             'igma) {\n'   +
        '    float theta = asin(clamp(wi.x, -1.0, 1.0));\n'                                +
        '    float theta0 = max(theta - PI_HALF, -PI_HALF);\n'                             +
        '    float theta1 = min(theta + PI_HALF,  PI_HALF);\n\n'                           +

        '    float thetaM = sampleVisibleNormal(sigma, rand(state), theta0, theta1);\n'    +
        '    vec2 m = vec2(sin(thetaM), cos(thetaM));\n'                                   +
        '    vec2 wo = m*(dot(wi, m)*2.0) - wi;\n'                                         +
        '    if (wo.y < 0.0)\n'                                                            +
        '        throughput = vec3(0.0);\n'                                                +
        '    return wo;\n'                                                                 +
        '}\n'                                                                              +
        'vec2 sampleRoughDielectric(inout vec4 state, vec2 wi, float sigma, float ior)\n'  +
        '{\n'                                                                              +
        '    float theta = asin(min(abs(wi.x), 1.0));\n'                                   +
        '    float theta0 = max(theta - PI_HALF, -PI_HALF);\n'                             +
        '    float theta1 = min(theta + PI_HALF,  PI_HALF);\n\n'                           +

        '    float thetaM = sampleVisibleNormal(sigma, rand(state), theta0, theta1);\n'    +
        '    vec2 m = vec2(sin(thetaM), cos(thetaM));\n\n'                                 +

        '    float wiDotM = dot(wi, m);\n\n'                                               +

        '    float cosThetaT;\n'                                                           +
        '    float etaM = wiDotM < 0.0 ? ior : 1.0/ior;\n'                                 +
        '    float F = dielectricReflectance(etaM, abs(wiDotM), cosThetaT);\n'             +
        '    if (wiDotM < 0.0)\n'                                                          +
        '        cosThetaT = -cosThetaT;\n\n'                                              +

        '    if (rand(state) < F)\n'                                                       +
        '        return 2.0*wiDotM*m - wi;\n'                                              +
        '    else\n'                                                                       +
        '        return (etaM*wiDotM - cosThetaT)*m - etaM*wi;\n'                          +
        '}\n',

    'compose-frag':
        '#include "preamble"\n\n'                                                          +

        'uniform sampler2D Frame;\n'                                                       +
        'uniform float Exposure;\n\n'                                                      +

        'varying vec2 vTexCoord;\n\n'                                                      +

        'void main() {\n'                                                                  +
        '    gl_FragColor = vec4(pow(texture2D(Frame, vTexCoord).rgb*Exposure, vec3(1.0/2' +
                                                                         '.2)), 1.0);\n'   +
        '}\n',

    'compose-vert':
        '#include "preamble"\n\n'                  +

        'attribute vec3 Position;\n'               +
        'attribute vec2 TexCoord;\n\n'             +

        'varying vec2 vTexCoord;\n\n'              +

        'void main(void) {\n'                      +
        '    gl_Position = vec4(Position, 1.0);\n' +
        '    vTexCoord = TexCoord;\n'              +
        '}\n',

    'csg-intersect':
        'struct Segment {\n'                                                                +
        '    float tNear, tFar;\n'                                                          +
        '    vec2  nNear, nFar;\n'                                                          +
        '};\n\n'                                                                            +

        'Segment segmentIntersection(Segment a, Segment b) {\n'                             +
        '    return Segment(\n'                                                             +
        '        max(a.tNear, b.tNear),\n'                                                  +
        '        min(a.tFar,  b.tFar),\n'                                                   +
        '        (a.tNear > b.tNear) ? a.nNear : b.nNear,\n'                                +
        '        (a.tFar  < b.tFar)  ? a.nFar  : b.nFar\n'                                  +
        '    );\n'                                                                          +
        '}\n'                                                                               +
        'Segment segmentSubtraction(Segment a, Segment b, float tMin) {\n'                  +
        '    if (a.tNear >= a.tFar || b.tNear >= b.tFar || a.tFar <= b.tNear || a.tNear >'  +
                                                                           '= b.tFar)\n'    +
        '        return a;\n\n'                                                             +

        '    Segment s1 = Segment(a.tNear, b.tNear, a.nNear, -b.nNear);\n'                  +
        '    Segment s2 = Segment(b.tFar,  a.tFar, -b.nFar,   a.nFar);\n'                   +
        '    bool valid1 = s1.tNear <= s1.tFar;\n'                                          +
        '    bool valid2 = s2.tNear <= s2.tFar;\n\n'                                        +

        '    if (valid1 && valid2) {\n'                                                     +
        '        if (s1.tFar >= tMin) return s1; else return s2;\n'                         +
        '    } else {\n'                                                                    +
        '        if (valid1) return s1; else return s2;\n'                                  +
        '    }\n'                                                                           +
        '}\n'                                                                               +
        'void segmentCollapse(Segment segment, float matId, inout Intersection isect) {\n'  +
        '    segment.tNear = max(segment.tNear, isect.tMin);\n'                             +
        '    segment.tFar  = min(segment.tFar,  isect.tMax);\n\n'                           +

        '    if (segment.tNear <= segment.tFar) {\n'                                        +
        '        if (segment.tNear > isect.tMin) {\n'                                       +
        '            isect.tMax = segment.tNear;\n'                                         +
        '            isect.n = segment.nNear;\n'                                            +
        '            isect.mat = matId;\n'                                                  +
        '        } else if (segment.tFar < isect.tMax) {\n'                                 +
        '            isect.tMax = segment.tFar;\n'                                          +
        '            isect.n = segment.nFar;\n'                                             +
        '            isect.mat = matId;\n'                                                  +
        '        }\n'                                                                       +
        '    }\n'                                                                           +
        '}\n\n'                                                                             +

        'Segment horzSpanIntersect(Ray ray, float y, float radius) {\n'                     +
        '    float dc = (y - ray.pos.y)*ray.invDir.y;\n'                                    +
        '    float dt = ray.dirSign.y*radius*ray.invDir.y;\n'                               +
        '    return Segment(dc - dt, dc + dt, vec2(0.0, -ray.dirSign.y), vec2(0.0, ray.di'  +
                                                                          'rSign.y));\n'    +
        '}\n'                                                                               +
        'Segment vertSpanIntersect(Ray ray, float x, float radius) {\n'                     +
        '    float dc = (x - ray.pos.x)*ray.invDir.x;\n'                                    +
        '    float dt = ray.dirSign.x*radius*ray.invDir.x;\n'                               +
        '    return Segment(dc - dt, dc + dt, vec2(-ray.dirSign.x, 0.0), vec2(ray.dirSign'  +
                                                                          '.x, 0.0));\n'    +
        '}\n'                                                                               +
        'Segment boxSegmentIntersect(Ray ray, vec2 center, vec2 radius) {\n'                +
        '    return segmentIntersection(\n'                                                 +
        '        horzSpanIntersect(ray, center.y, radius.y),\n'                             +
        '        vertSpanIntersect(ray, center.x, radius.x)\n'                              +
        '    );\n'                                                                          +
        '}\n'                                                                               +
        'Segment sphereSegmentIntersect(Ray ray, vec2 center, float radius) {\n'            +
        '    Segment result;\n\n'                                                           +

        '    vec2 p = ray.pos - center;\n'                                                  +
        '    float B = dot(p, ray.dir);\n'                                                  +
        '    float C = dot(p, p) - radius*radius;\n'                                        +
        '    float detSq = B*B - C;\n'                                                      +
        '    if (detSq >= 0.0) {\n'                                                         +
        '        float det = sqrt(detSq);\n'                                                +
        '        result.tNear = -B - det;\n'                                                +
        '        result.tFar  = -B + det;\n'                                                +
        '        result.nNear = (p + ray.dir*result.tNear)*(1.0/radius);\n'                 +
        '        result.nFar  = (p + ray.dir*result.tFar)*(1.0/radius);\n'                  +
        '    } else {\n'                                                                    +
        '        result.tNear =  1e30;\n'                                                   +
        '        result.tFar  = -1e30;\n'                                                   +
        '    }\n\n'                                                                         +

        '    return result;\n'                                                              +
        '}\n\n'                                                                             +

        'void biconvexLensIntersect(Ray ray, vec2 center, float h, float d, float r1, flo'  +
                                     'at r2, float matId, inout Intersection isect) {\n'    +
        '    segmentCollapse(segmentIntersection(segmentIntersection(\n'                    +
        '        horzSpanIntersect(ray, center.y, h),\n'                                    +
        '        sphereSegmentIntersect(ray, center + vec2(r1 - d, 0.0), r1)),\n'           +
        '        sphereSegmentIntersect(ray, center - vec2(r2 - d, 0.0), r2)\n'             +
        '    ), matId, isect);\n'                                                           +
        '}\n'                                                                               +
        'void biconcaveLensIntersect(Ray ray, vec2 center, float h, float d, float r1, fl'  +
                                    'oat r2, float matId, inout Intersection isect) {\n'    +
        '    segmentCollapse(segmentSubtraction(segmentSubtraction(segmentIntersection(\n'  +
        '        horzSpanIntersect(ray, center.y, h),\n'                                    +
        '        vertSpanIntersect(ray, center.x + 0.5*(r2 - r1), 0.5*(abs(r1) + abs(r2))'  +
                                                                             ' + d)),\n'    +
        '        sphereSegmentIntersect(ray, center + vec2(r2 + d, 0.0), r2), isect.tMin)'  +
                                                                                   ',\n'    +
        '        sphereSegmentIntersect(ray, center - vec2(r1 + d, 0.0), r1), isect.tMin\n' +
        '    ), matId, isect);\n'                                                           +
        '}\n'                                                                               +
        'void meniscusLensIntersect(Ray ray, vec2 center, float h, float d, float r1, flo'  +
                                     'at r2, float matId, inout Intersection isect) {\n'    +
        '    segmentCollapse(segmentSubtraction(segmentIntersection(segmentIntersection(\n' +
        '        horzSpanIntersect(ray, center.y, h),\n'                                    +
        '        vertSpanIntersect(ray, center.x + 0.5*r2, 0.5*abs(r2) + d)),\n'            +
        '        sphereSegmentIntersect(ray, center + vec2(r1 - sign(r1)*d, 0.0), abs(r1)'  +
                                                                                 ')),\n'    +
        '        sphereSegmentIntersect(ray, center + vec2(r2 + sign(r2)*d, 0.0), abs(r2)'  +
                                                                       '), isect.tMin\n'    +
        '    ), matId, isect);\n'                                                           +
        '}\n'                                                                               +
        'void planoConvexLensIntersect(Ray ray, vec2 center, float h, float d, float r, f'  +
                                             'loat matId, inout Intersection isect) {\n'    +
        '    segmentCollapse(segmentIntersection(\n'                                        +
        '        boxSegmentIntersect(ray, center, vec2(d, h)),\n'                           +
        '        sphereSegmentIntersect(ray, center + vec2(r - d, 0.0), abs(r))\n'          +
        '    ), matId, isect);\n'                                                           +
        '}\n'                                                                               +
        'void planoConcaveLensIntersect(Ray ray, vec2 center, float h, float d, float r, '  +
                                            'float matId, inout Intersection isect) {\n'    +
        '    segmentCollapse(segmentSubtraction(segmentIntersection(\n'                     +
        '        horzSpanIntersect(ray, center.y, h),\n'                                    +
        '        vertSpanIntersect(ray, center.x - 0.5*r, 0.5*abs(r) + d)),\n'              +
        '        sphereSegmentIntersect(ray, center - vec2(r + d, 0.0), abs(r)), isect.tM'  +
                                                                                  'in\n'    +
        '    ), matId, isect);\n'                                                           +
        '}\n',

    'init-frag':
        '#extension GL_EXT_draw_buffers : require\n'                                       +
        '#include "preamble"\n\n'                                                          +

        '#include "rand"\n\n'                                                              +

        'uniform sampler2D RngData;\n'                                                     +
        'uniform sampler2D Spectrum;\n'                                                    +
        'uniform sampler2D Emission;\n'                                                    +
        'uniform sampler2D ICDF;\n'                                                        +
        'uniform sampler2D PDF;\n'                                                         +
        'uniform vec2 EmitterPos;\n'                                                       +
        'uniform vec2 EmitterDir;\n'                                                       +
        'uniform float EmitterPower;\n'                                                    +
        'uniform float SpatialSpread;\n'                                                   +
        'uniform vec2 AngularSpread;\n\n'                                                  +

        'varying vec2 vTexCoord;\n\n'                                                      +

        'void main() {\n'                                                                  +
        '    vec4 state = texture2D(RngData, vTexCoord);\n\n'                              +

        '    float theta = AngularSpread.x + (rand(state) - 0.5)*AngularSpread.y;\n'       +
        '    vec2 dir = vec2(cos(theta), sin(theta));\n'                                   +
        '    vec2 pos = EmitterPos + (rand(state) - 0.5)*SpatialSpread*vec2(-EmitterDir.y' +
                                                                    ', EmitterDir.x);\n\n' +

        '    float randL = rand(state);\n'                                                 +
        '    float spectrumOffset = texture2D(ICDF, vec2(randL, 0.5)).r + rand(state)*(1.' +
                                                                           '0/256.0);\n'   +
        '    float lambda = 360.0 + (750.0 - 360.0)*spectrumOffset;\n'                     +
        '    vec3 rgb = EmitterPower\n'                                                    +
        '                    *texture2D(Emission, vec2(spectrumOffset, 0.5)).r\n'          +
        '                    *texture2D(Spectrum, vec2(spectrumOffset, 0.5)).rgb\n'        +
        '                    /texture2D(PDF,      vec2(spectrumOffset, 0.5)).r;\n\n'       +

        '    gl_FragData[0] = vec4(pos, dir);\n'                                           +
        '    gl_FragData[1] = state;\n'                                                    +
        '    gl_FragData[2] = vec4(rgb, lambda);\n'                                        +
        '}\n',

    'init-vert':
        '#include "preamble"\n\n'                  +

        'attribute vec3 Position;\n'               +
        'attribute vec2 TexCoord;\n\n'             +

        'varying vec2 vTexCoord;\n\n'              +

        'void main() {\n'                          +
        '    gl_Position = vec4(Position, 1.0);\n' +
        '    vTexCoord = TexCoord;\n'              +
        '}\n',

    'intersect':
        'void bboxIntersect(Ray ray, vec2 center, vec2 radius, float matId, inout Interse' +
                                                                      'ction isect) {\n'   +
        '    vec2 pos = ray.pos - center;\n'                                               +
        '    float tx1 = (-radius.x - pos.x)*ray.invDir.x;\n'                              +
        '    float tx2 = ( radius.x - pos.x)*ray.invDir.x;\n'                              +
        '    float ty1 = (-radius.y - pos.y)*ray.invDir.y;\n'                              +
        '    float ty2 = ( radius.y - pos.y)*ray.invDir.y;\n\n'                            +

        '    float minX = min(tx1, tx2), maxX = max(tx1, tx2);\n'                          +
        '    float minY = min(ty1, ty2), maxY = max(ty1, ty2);\n\n'                        +

        '    float tmin = max(isect.tMin, max(minX, minY));\n'                             +
        '    float tmax = min(isect.tMax, min(maxX, maxY));\n\n'                           +

        '    if (tmax >= tmin) {\n'                                                        +
        '        isect.tMax = (tmin == isect.tMin) ? tmax : tmin;\n'                       +
        '        isect.n = isect.tMax == tx1 ? vec2(-1.0, 0.0) : isect.tMax == tx2 ? vec2' +
                                                                        '(1.0, 0.0) :\n'   +
        '                  isect.tMax == ty1 ? vec2( 0.0, 1.0) :                     vec2' +
                                                                         '(0.0, 1.0);\n'   +
        '        isect.mat = matId;\n'                                                     +
        '    }\n'                                                                          +
        '}\n'                                                                              +
        'void sphereIntersect(Ray ray, vec2 center, float radius, float matId, inout Inte' +
                                                                   'rsection isect) {\n'   +
        '    vec2 p = ray.pos - center;\n'                                                 +
        '    float B = dot(p, ray.dir);\n'                                                 +
        '    float C = dot(p, p) - radius*radius;\n'                                       +
        '    float detSq = B*B - C;\n'                                                     +
        '    if (detSq >= 0.0) {\n'                                                        +
        '        float det = sqrt(detSq);\n'                                               +
        '        float t = -B - det;\n'                                                    +
        '        if (t <= isect.tMin || t >= isect.tMax)\n'                                +
        '            t = -B + det;\n'                                                      +
        '        if (t > isect.tMin && t < isect.tMax) {\n'                                +
        '            isect.tMax = t;\n'                                                    +
        '            isect.n = normalize(p + ray.dir*t);\n'                                +
        '            isect.mat = matId;\n'                                                 +
        '        }\n'                                                                      +
        '    }\n'                                                                          +
        '}\n'                                                                              +
        'void lineIntersect(Ray ray, vec2 a, vec2 b, float matId, inout Intersection isec' +
                                                                                't) {\n'   +
        '    vec2 sT = b - a;\n'                                                           +
        '    vec2 sN = vec2(-sT.y, sT.x);\n'                                               +
        '    float t = dot(sN, a - ray.pos)/dot(sN, ray.dir);\n'                           +
        '    float u = dot(sT, ray.pos + ray.dir*t - a);\n'                                +
        '    if (t < isect.tMin || t >= isect.tMax || u < 0.0 || u > dot(sT, sT))\n'       +
        '        return;\n\n'                                                              +

        '    isect.tMax = t;\n'                                                            +
        '    isect.n = normalize(sN);\n'                                                   +
        '    isect.mat = matId;\n'                                                         +
        '}\n'                                                                              +
        'void prismIntersect(Ray ray, vec2 center, float radius, float matId, inout Inter' +
                                                                    'section isect) {\n'   +
        '    lineIntersect(ray, center + vec2(   0.0,  1.0)*radius, center + vec2( 0.866,' +
                                                       ' -0.5)*radius, matId, isect);\n'   +
        '    lineIntersect(ray, center + vec2( 0.866, -0.5)*radius, center + vec2(-0.866,' +
                                                       ' -0.5)*radius, matId, isect);\n'   +
        '    lineIntersect(ray, center + vec2(-0.866, -0.5)*radius, center + vec2(   0.0,' +
                                                       '  1.0)*radius, matId, isect);\n'   +
        '}\n',

    'pass-frag':
        '#include "preamble"\n\n'                                          +

        'uniform sampler2D Frame;\n\n'                                     +

        'varying vec2 vTexCoord;\n\n'                                      +

        'void main() {\n'                                                  +
        '    gl_FragColor = vec4(texture2D(Frame, vTexCoord).rgb, 1.0);\n' +
        '}\n',

    'preamble':
        '#define PI      3.1415926536\n'   +
        '#define PI_HALF 1.5707963268\n\n' +

        'precision highp float;\n',

    'rand':
        'float rand(inout vec4 state) {\n'                                         +
        '    const vec4 q = vec4(   1225.0,    1585.0,    2457.0,    2098.0);\n'   +
        '    const vec4 r = vec4(   1112.0,     367.0,      92.0,     265.0);\n'   +
        '    const vec4 a = vec4(   3423.0,    2646.0,    1707.0,    1999.0);\n'   +
        '    const vec4 m = vec4(4194287.0, 4194277.0, 4194191.0, 4194167.0);\n\n' +

        '    vec4 beta = floor(state/q);\n'                                        +
        '    vec4 p = a*(state - beta*q) - beta*r;\n'                              +
        '    beta = (1.0 - sign(p))*0.5*m;\n'                                      +
        '    state = p + beta;\n'                                                  +
        '    return fract(dot(state/m, vec4(1.0, -1.0, 1.0, -1.0)));\n'            +
        '}\n',

    'ray-frag':
        '#include "preamble"\n\n'                 +

        'varying vec3 vColor;\n\n'                +

        'void main() {\n'                         +
        '    gl_FragColor = vec4(vColor, 1.0);\n' +
        '}\n',

    'ray-vert':
        '#include "preamble"\n\n'                                                          +

        'uniform sampler2D PosDataA;\n'                                                    +
        'uniform sampler2D PosDataB;\n'                                                    +
        'uniform sampler2D RgbData;\n'                                                     +
        'uniform float Aspect;\n\n'                                                        +

        'attribute vec3 TexCoord;\n\n'                                                     +

        'varying vec3 vColor;\n\n'                                                         +

        'void main() {\n'                                                                  +
        '    vec2 posA = texture2D(PosDataA, TexCoord.xy).xy;\n'                           +
        '    vec2 posB = texture2D(PosDataB, TexCoord.xy).xy;\n'                           +
        '    vec2 pos = mix(posA, posB, TexCoord.z);\n'                                    +
        '    vec2 dir = posB - posA;\n'                                                    +
        '    float biasCorrection = clamp(length(dir)/max(abs(dir.x), abs(dir.y)), 1.0, 1' +
                                                                           '.414214);\n\n' +

        '    gl_Position = vec4(pos.x/Aspect, pos.y, 0.0, 1.0);\n'                         +
        '    vColor = texture2D(RgbData, TexCoord.xy).rgb*biasCorrection;\n'               +
        '}\n',

    'scene1':
        '#include "trace-frag"\n\n'                                                        +

        '#include "bsdf"\n'                                                                +
        '#include "intersect"\n'                                                           +
        '#include "csg-intersect"\n\n'                                                     +

        'void intersect(Ray ray, inout Intersection isect) {\n'                            +
        '    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);\n'                +
        '    biconvexLensIntersect   (ray, vec2(-0.4, 0.0), 0.375, 0.15,   0.75, 0.75, 1.' +
                                                                          '0, isect);\n'   +
        '    biconcaveLensIntersect  (ray, vec2( 0.4, 0.0), 0.375, 0.0375, 0.75, 0.75, 1.' +
                                                                          '0, isect);\n'   +
        '    planoConvexLensIntersect(ray, vec2(-1.2, 0.0), 0.375, 0.075,  0.75,       1.' +
                                                                          '0, isect);\n'   +
        '    meniscusLensIntersect   (ray, vec2( 0.8, 0.0), 0.375, 0.15,   0.45, 0.75, 1.' +
                                                                          '0, isect);\n'   +
        '}\n\n'                                                                            +

        'vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, in' +
                                                              'out vec3 throughput) {\n'   +
        '    if (isect.mat == 1.0) {\n'                                                    +
        '        float ior = sellmeierIor(vec3(1.6215, 0.2563, 1.6445), vec3(0.0122, 0.05' +
                                                         '96, 147.4688), lambda)/1.4;\n'   +
        '        return sampleDielectric(state, wiLocal, ior);\n'                          +
        '    } else {\n'                                                                   +
        '        throughput *= vec3(0.5);\n'                                               +
        '        return sampleDiffuse(state, wiLocal);\n'                                  +
        '    }\n'                                                                          +
        '}\n',

    'scene2':
        '#include "trace-frag"\n\n'                                                        +

        '#include "bsdf"\n'                                                                +
        '#include "intersect"\n\n'                                                         +

        'void intersect(Ray ray, inout Intersection isect) {\n'                            +
        '    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);\n'                +
        '    sphereIntersect(ray, vec2(-1.424, -0.8), 0.356, 1.0, isect);\n'               +
        '    sphereIntersect(ray, vec2(-0.72,  -0.8), 0.356, 2.0, isect);\n'               +
        '    sphereIntersect(ray, vec2( 0.0,   -0.8), 0.356, 3.0, isect);\n'               +
        '    sphereIntersect(ray, vec2( 0.72,  -0.8), 0.356, 4.0, isect);\n'               +
        '    sphereIntersect(ray, vec2( 1.424, -0.8), 0.356, 5.0, isect);\n'               +
        '}\n\n'                                                                            +

        'vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, in' +
                                                              'out vec3 throughput) {\n'   +
        '           if (isect.mat == 1.0) { return sampleRoughMirror(state, wiLocal, thro' +
                                                                      'ughput, 0.02);\n'   +
        '    } else if (isect.mat == 2.0) { return sampleRoughMirror(state, wiLocal, thro' +
                                                                      'ughput, 0.05);\n'   +
        '    } else if (isect.mat == 3.0) { return sampleRoughMirror(state, wiLocal, thro' +
                                                                       'ughput, 0.1);\n'   +
        '    } else if (isect.mat == 4.0) { return sampleRoughMirror(state, wiLocal, thro' +
                                                                       'ughput, 0.2);\n'   +
        '    } else if (isect.mat == 5.0) { return sampleRoughMirror(state, wiLocal, thro' +
                                                                       'ughput, 0.5);\n'   +
        '    } else {\n'                                                                   +
        '        throughput *= vec3(0.5);\n'                                               +
        '        return sampleDiffuse(state, wiLocal);\n'                                  +
        '    }\n'                                                                          +
        '}\n',

    'scene3':
        '#include "trace-frag"\n\n'                                                        +

        '#include "bsdf"\n'                                                                +
        '#include "intersect"\n\n'                                                         +

        'void intersect(Ray ray, inout Intersection isect) {\n'                            +
        '    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);\n'                +
        '    bboxIntersect(ray, vec2(0.0), vec2(1.2,  0.8), 1.0, isect);\n'                +
        '    sphereIntersect(ray, vec2(-0.7, -0.45), 0.35, 3.0, isect);\n'                 +
        '    sphereIntersect(ray, vec2( 0.7, -0.45), 0.35, 2.0, isect);\n'                 +
        '}\n\n'                                                                            +

        'vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, in' +
                                                              'out vec3 throughput) {\n'   +
        '    if (isect.mat == 2.0) {\n'                                                    +
        '        float ior = sellmeierIor(vec3(1.6215, 0.2563, 1.6445), vec3(0.0122, 0.05' +
                                                         '96, 147.4688), lambda)/1.4;\n'   +
        '        return sampleDielectric(state, wiLocal, ior);\n'                          +
        '    } else if (isect.mat == 3.0) {\n'                                             +
        '        return sampleMirror(wiLocal);\n'                                          +
        '    } else if (isect.mat == 1.0) {\n'                                             +
        '             if (isect.n.x == -1.0) throughput *= vec3(0.14,  0.45,  0.091);\n'   +
        '        else if (isect.n.x ==  1.0) throughput *= vec3(0.63,  0.065, 0.05);\n'    +
        '        else                        throughput *= vec3(0.725, 0.71,  0.68);\n'    +
        '        return sampleDiffuse(state, wiLocal);\n'                                  +
        '    } else {\n'                                                                   +
        '        throughput *= vec3(0.5);\n'                                               +
        '        return sampleDiffuse(state, wiLocal);\n'                                  +
        '    }\n'                                                                          +
        '}\n',

    'scene4':
        '#include "trace-frag"\n\n'                                                        +

        '#include "bsdf"\n'                                                                +
        '#include "intersect"\n\n'                                                         +

        'void intersect(Ray ray, inout Intersection isect) {\n'                            +
        '    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);\n'                +
        '    prismIntersect(ray, vec2(0.0, 0.0), 0.6, 1.0, isect);\n'                      +
        '}\n\n'                                                                            +

        'vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, in' +
                                                              'out vec3 throughput) {\n'   +
        '    if (isect.mat == 1.0) {\n'                                                    +
        '        float ior = sellmeierIor(vec3(1.6215, 0.2563, 1.6445), vec3(0.0122, 0.05' +
                                                          '96, 17.4688), lambda)/1.8;\n'   +
        '        return sampleRoughDielectric(state, wiLocal, 0.1, ior);\n'                +
        '    } else {\n'                                                                   +
        '        throughput *= vec3(0.05);\n'                                              +
        '        return sampleDiffuse(state, wiLocal);\n'                                  +
        '    }\n'                                                                          +
        '}\n',

    'scene5':
        '#include "trace-frag"\n\n'                                                        +

        '#include "bsdf"\n'                                                                +
        '#include "intersect"\n'                                                           +
        '#include "csg-intersect"\n\n'                                                     +

        'void intersect(Ray ray, inout Intersection isect) {\n'                            +
        '    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);\n'                +
        '    planoConcaveLensIntersect(ray, vec2(0.8, 0.0), 0.6, 0.3, 0.6, 1.0, isect);\n' +
        '}\n\n'                                                                            +

        'vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, in' +
                                                              'out vec3 throughput) {\n'   +
        '    if (isect.mat == 1.0) {\n'                                                    +
        '        return sampleMirror(wiLocal);\n'                                          +
        '    } else {\n'                                                                   +
        '        throughput *= vec3(0.5);\n'                                               +
        '        return sampleDiffuse(state, wiLocal);\n'                                  +
        '    }\n'                                                                          +
        '}\n',

    'scene6':
        '#include "trace-frag"\n\n'                                                        +

        '#include "bsdf"\n'                                                                +
        '#include "intersect"\n\n'                                                         +

        'void intersect(Ray ray, inout Intersection isect) {\n'                            +
        '    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);\n'                +
        '    sphereIntersect(ray, vec2(-0.95,   0.25),    0.4, 1.0, isect);\n'             +
        '    sphereIntersect(ray, vec2(-0.15,  -0.25),    0.2, 1.0, isect);\n'             +
        '    sphereIntersect(ray, vec2(1.11667, 0.18333), 0.2, 1.0, isect);\n'             +
        '    lineIntersect(ray, vec2(0.168689, -0.885424), vec2(1.13131,  -0.614576), 2.0' +
                                                                           ', isect);\n'   +
        '    lineIntersect(ray, vec2(1.71686,   0.310275), vec2(0.983139,  0.989725), 2.0' +
                                                                           ', isect);\n'   +
        '}\n\n'                                                                            +

        'vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, in' +
                                                              'out vec3 throughput) {\n'   +
        '    if (isect.mat == 1.0) {\n'                                                    +
        '        float ior = sqrt(sellmeierIor(vec3(1.0396, 0.2318, 1.0105), vec3(0.0060,' +
                                                         ' 0.0200, 103.56), lambda));\n'   +
        '        return sampleDielectric(state, wiLocal, ior);\n'                          +
        '    } else if (isect.mat == 2.0) {\n'                                             +
        '        return sampleMirror(wiLocal);\n'                                          +
        '    } else {\n'                                                                   +
        '        throughput *= vec3(0.5);\n'                                               +
        '        return sampleDiffuse(state, wiLocal);\n'                                  +
        '    }\n'                                                                          +
        '}\n',

    'scene7':
        '#include "trace-frag"\n\n'                                                        +

        '#include "bsdf"\n'                                                                +
        '#include "intersect"\n'                                                           +
        '#include "csg-intersect"\n\n'                                                     +

        'void intersect(Ray ray, inout Intersection isect) {\n'                            +
        '    bboxIntersect(ray, vec2(0.0), vec2(1.78, 1.0), 0.0, isect);\n'                +
        '    sphereIntersect(ray, vec2(0.0, 0.0), 0.4, 1.0, isect);\n'                     +
        '    biconvexLensIntersect(ray, vec2(-0.4, -0.65), 0.3, 0.12, 0.5, 0.5, 1.0, isec' +
                                                                                 't);\n'   +
        '    meniscusLensIntersect(ray, vec2(-0.8, -0.65), 0.3, 0.08, -0.5, -0.5, 1.0, is' +
                                                                               'ect);\n'   +
        '    planoConcaveLensIntersect(ray, vec2(1.3, 0.0), 0.3, 0.0, 0.3, 2.0, isect);\n' +
        '    prismIntersect(ray, vec2(0.8, -0.7), 0.2, 1.0, isect);\n'                     +
        '}\n\n'                                                                            +

        'vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, in' +
                                                              'out vec3 throughput) {\n'   +
        '    if (isect.mat == 1.0) {\n'                                                    +
        '        float ior = sellmeierIor(vec3(1.6215, 0.2563, 1.6445), vec3(0.0122, 0.05' +
                                                 '96, 147.4688), lambda)/1.6; // SF10\n'   +
        '        return sampleDielectric(state, wiLocal, ior);\n'                          +
        '    } else if (isect.mat == 2.0) {\n'                                             +
        '        return sampleMirror(wiLocal);\n'                                          +
        '    } else {\n'                                                                   +
        '        throughput *= vec3(0.25);\n'                                              +
        '        return sampleDiffuse(state, wiLocal);\n'                                  +
        '    }\n'                                                                          +
        '}\n',

    'trace-frag':
        '#extension GL_EXT_draw_buffers : require\n'                                        +
        '#include "preamble"\n'                                                             +
        '#include "rand"\n\n'                                                               +

        'uniform sampler2D PosData;\n'                                                      +
        'uniform sampler2D RngData;\n'                                                      +
        'uniform sampler2D RgbData;\n\n'                                                    +

        'varying vec2 vTexCoord;\n\n'                                                       +

        'struct Ray {\n'                                                                    +
        '    vec2 pos;\n'                                                                   +
        '    vec2 dir;\n'                                                                   +
        '    vec2 invDir;\n'                                                                +
        '    vec2 dirSign;\n'                                                               +
        '};\n'                                                                              +
        'struct Intersection {\n'                                                           +
        '    float tMin;\n'                                                                 +
        '    float tMax;\n'                                                                 +
        '    vec2 n;\n'                                                                     +
        '    float mat;\n'                                                                  +
        '};\n\n'                                                                            +

        'void intersect(Ray ray, inout Intersection isect);\n'                              +
        'vec2 sample(inout vec4 state, Intersection isect, float lambda, vec2 wiLocal, in'  +
                                                               'out vec3 throughput);\n\n'  +

        'Ray unpackRay(vec4 posDir) {\n'                                                    +
        '    vec2 pos = posDir.xy;\n'                                                       +
        '    vec2 dir = posDir.zw;\n'                                                       +
        '    dir.x = abs(dir.x) < 1e-5 ? 1e-5 : dir.x; /* The nuclear option to fix NaN i'  +
                                                          'ssues on some platforms */\n'    +
        '    dir.y = abs(dir.y) < 1e-5 ? 1e-5 : dir.y;\n'                                   +
        '    return Ray(pos, dir, 1.0/dir, sign(dir));\n'                                   +
        '}\n\n'                                                                             +

        'void main() {\n'                                                                   +
        '    vec4 posDir    = texture2D(PosData, vTexCoord);\n'                             +
        '    vec4 state     = texture2D(RngData, vTexCoord);\n'                             +
        '    vec4 rgbLambda = texture2D(RgbData, vTexCoord);\n\n'                           +

        '    Ray ray = unpackRay(posDir);\n'                                                +
        '    Intersection isect;\n'                                                         +
        '    isect.tMin = 1e-4;\n'                                                          +
        '    isect.tMax = 1e30;\n'                                                          +
        '    intersect(ray, isect);\n\n'                                                    +

        '    vec2 t = vec2(-isect.n.y, isect.n.x);\n'                                       +
        '    vec2 wiLocal = -vec2(dot(t, ray.dir), dot(isect.n, ray.dir));\n'               +
        '    vec2 woLocal = sample(state, isect, rgbLambda.w, wiLocal, rgbLambda.rgb);\n\n' +

        '    if (isect.tMax == 1e30) {\n'                                                   +
        '        rgbLambda.rgb = vec3(0.0);\n'                                              +
        '    } else {\n'                                                                    +
        '        posDir.xy = ray.pos + ray.dir*isect.tMax;\n'                               +
        '        posDir.zw = woLocal.y*isect.n + woLocal.x*t;\n'                            +
        '    }\n\n'                                                                         +

        '    gl_FragData[0] = posDir;\n'                                                    +
        '    gl_FragData[1] = state;\n'                                                     +
        '    gl_FragData[2] = rgbLambda;\n'                                                 +
        '}\n',

    'trace-vert':
        '#include "preamble"\n\n'                  +

        'attribute vec3 Position;\n'               +
        'attribute vec2 TexCoord;\n\n'             +

        'varying vec2 vTexCoord;\n\n'              +

        'void main() {\n'                          +
        '    gl_Position = vec4(Position, 1.0);\n' +
        '    vTexCoord = TexCoord;\n'              +
        '}\n'
}