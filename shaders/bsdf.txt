float sellmeierIor(vec3 b, vec3 c, float lambda) {
    float lSq = (lambda*1e-3)*(lambda*1e-3);
    return 1.0 + dot((b*lSq)/(lSq - c), vec3(1.0));
}

float tanh(float x) {
    if (abs(x) > 10.0) /* Prevent nasty overflow problems */
        return sign(x);
    float e = exp(-2.0*x);
    return (1.0 - e)/(1.0 + e);
}
float atanh(float x) {
    return 0.5*log((1.0 + x)/(1.0 - x));
}

float dielectricReflectance(float eta, float cosThetaI, out float cosThetaT) {
    float sinThetaTSq = eta*eta*(1.0 - cosThetaI*cosThetaI);
    if (sinThetaTSq > 1.0) {
        cosThetaT = 0.0;
        return 1.0;
    }
    cosThetaT = sqrt(1.0 - sinThetaTSq);

    float Rs = (eta*cosThetaI - cosThetaT)/(eta*cosThetaI + cosThetaT);
    float Rp = (eta*cosThetaT - cosThetaI)/(eta*cosThetaT + cosThetaI);

    return (Rs*Rs + Rp*Rp)*0.5;
}

vec2 sampleDiffuse(inout vec4 state, vec2 wi) {
    float x = rand(state)*2.0 - 1.0;
    float y = sqrt(1.0 - x*x);
    return vec2(x, y*sign(wi.y));
}
vec2 sampleMirror(vec2 wi) {
    return vec2(-wi.x, wi.y);
}
vec2 sampleDielectric(inout vec4 state, vec2 wi, float ior) {
    float cosThetaT;
    float eta = wi.y < 0.0 ? ior : 1.0/ior;
    float Fr = dielectricReflectance(eta, abs(wi.y), cosThetaT);
    if (rand(state) < Fr)
        return vec2(-wi.x, wi.y);
    else
        return vec2(-wi.x*eta, -cosThetaT*sign(wi.y));
}

float sampleVisibleNormal(float sigma, float xi, float theta0, float theta1) {
    float sigmaSq = sigma*sigma;
    float invSigmaSq = 1.0/sigmaSq;
    
    float cdf0 = tanh(theta0*0.5*invSigmaSq);
    float cdf1 = tanh(theta1*0.5*invSigmaSq);

    return 2.0*sigmaSq*atanh(cdf0 + (cdf1 - cdf0)*xi);
}
vec2 sampleRoughMirror(inout vec4 state, vec2 wi, inout vec3 throughput, float sigma) {
    float theta = asin(clamp(wi.x, -1.0, 1.0));
    float theta0 = max(theta - PI_HALF, -PI_HALF);
    float theta1 = min(theta + PI_HALF,  PI_HALF);

    float thetaM = sampleVisibleNormal(sigma, rand(state), theta0, theta1);
    vec2 m = vec2(sin(thetaM), cos(thetaM));
    vec2 wo = m*(dot(wi, m)*2.0) - wi;
    if (wo.y < 0.0)
        throughput = vec3(0.0);
    return wo;
}
vec2 sampleRoughDielectric(inout vec4 state, vec2 wi, float sigma, float ior)
{
    float theta = asin(min(abs(wi.x), 1.0));
    float theta0 = max(theta - PI_HALF, -PI_HALF);
    float theta1 = min(theta + PI_HALF,  PI_HALF);

    float thetaM = sampleVisibleNormal(sigma, rand(state), theta0, theta1);
    vec2 m = vec2(sin(thetaM), cos(thetaM));

    float wiDotM = dot(wi, m);
    
    float cosThetaT;
    float etaM = wiDotM < 0.0 ? ior : 1.0/ior;
    float F = dielectricReflectance(etaM, abs(wiDotM), cosThetaT);
    if (wiDotM < 0.0)
        cosThetaT = -cosThetaT;

    if (rand(state) < F)
        return 2.0*wiDotM*m - wi;
    else
        return (etaM*wiDotM - cosThetaT)*m - etaM*wi;
}
