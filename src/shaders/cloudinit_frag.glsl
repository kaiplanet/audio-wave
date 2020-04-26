varying vec2 vUv;

const float pi = abs(asin(1.0)) * 2.0;
const float doublePi = pi * 2.0;
const float halfPi = pi * 0.5;
const vec2 axisPhi = vec2(1.0, 0.0);
const vec3 axisTheta = vec3(0.0, 0.0, 1.0);
const float uUnit = 1.0 / TEXTURE_DEPTH;
const vec3 centerPoint = vec3(0.5, 0.5, 0.5);
const float easingStart = 0.4;
const float easingEnd = 0.5;
const float easingDistance = easingEnd - easingStart;

void main() {
    float x = mod(vUv.s, uUnit) / uUnit;
    float y = vUv.t;
    float z = floor(vUv.s / uUnit) / TEXTURE_DEPTH;
    vec3 coords = vec3(x, y, z);
    float r = length(coords - centerPoint);

    if (r > easingEnd) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);

        return;
    }

    float absPhi = acos(dot(axisPhi, normalize(vec2(x, y))));
    float phi = (y > 0.0 ? absPhi : doublePi - absPhi) / doublePi;
    float theta = acos(dot(axisTheta, normalize(coords))) / pi;
    vec3 sphCoords = vec3(r, phi, theta);
    float noise = snoise(sphCoords * 4.0);
    float noiseFixed = noise;

    if (r > easingStart) {
        float easingProgress = (r - easingStart) / easingDistance;
        noiseFixed = noise * (1.0 - (1.0 - CONDENSE_HEAT_THRESHOLD) * sin(easingProgress * halfPi));
    }

    float heat = noiseFixed + noiseFixed * (snoise(coords * 4.0) - 0.5) * 2.0 + noiseFixed * (snoise(coords * 16.0) - 0.5);
    float heatDiff = heat - CONDENSE_HEAT_THRESHOLD;
    float density = heatDiff > 0.0 ? heatDiff / (1.0 - CONDENSE_HEAT_THRESHOLD) : 0.0;
    float dissipationValue = density == 0.0 ? 0.0 : snoise(coords);

    gl_FragColor = vec4(density, dissipationValue, 0.0, 0.0);
}
