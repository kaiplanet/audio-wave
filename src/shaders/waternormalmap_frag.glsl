uniform sampler2D bufferMap;
uniform sampler2D bufferMapLast;
uniform float k1;
uniform float k2;
uniform float k3;
uniform float height;
uniform sampler2D obstacleMap;
uniform sampler2D waveSourceMap;
uniform mat3 waveSourceMatrix;
uniform bool renderWaveSource;

varying vec2 vUv;

const float offsetStride  = 1.0 / 512.0;

void main() {
    if (texture2D(obstacleMap, vUv).r != 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 1.0, 0.5);

        return;
    }

    vec2 coordsRelative[5];

    //    0
    // 1  2  3
    //    4

    coordsRelative[0] = vec2(0.0, offsetStride);
    coordsRelative[1] = vec2(-offsetStride, 0.0);
    coordsRelative[2] = vec2(0.0, 0.0);
    coordsRelative[3] = vec2(offsetStride, 0.0);
    coordsRelative[4] = vec2(0.0, -offsetStride);

    vec4 sampleTexel[5];

    for (int i = 0; i < 5; i++) {
        vec2 texelCoords = vUv + coordsRelative[i];

        if (texture2D(obstacleMap, texelCoords).r != 0.0) {
            sampleTexel[i] = texture2D(bufferMap, vUv);
        } else {
            sampleTexel[i] = texture2D(bufferMap, texelCoords);
        }
    }

    float offset = k1 * (sampleTexel[2].a + height) + k2 * (texture2D(bufferMapLast, vUv).a + height) +
        k3 * ((sampleTexel[0].a + height) + (sampleTexel[1].a + height) +
        (sampleTexel[3].a + height) + (sampleTexel[4].a + height));

    if (renderWaveSource) {
        vec2 uv = (waveSourceMatrix * vec3(vUv, 1.0)).st;

        if (uv.s >= 0.0 && uv.s <= 1.0 && uv.t >= 0.0 && uv.t <= 1.0) {
            offset += texture2D(waveSourceMap, uv).r - 0.5;
        }
    }

    vec3 normal = normalize(vec3(sampleTexel[1].a - sampleTexel[3].a, sampleTexel[0].a - sampleTexel[4].a, 2));

    gl_FragColor = vec4(normal, offset - height);
}
