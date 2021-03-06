uniform sampler2D bufferMap;
uniform sampler2D bufferMapLast;
uniform float k1;
uniform float k2;
uniform float k3;
uniform float height;

varying vec2 vUv;

const float offsetStride  = 1.0 / 512.0;

void main() {
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

        sampleTexel[i] = texture2D(bufferMap, texelCoords);
    }

    float offset = k1 * (sampleTexel[2].r + height) + k2 * (texture2D(bufferMapLast, vUv).r + height) +
        k3 * ((sampleTexel[0].r + height) + (sampleTexel[1].r + height) +
        (sampleTexel[3].r + height) + (sampleTexel[4].r + height));

    gl_FragColor = vec4(offset - height, 0.0, 0.0, 0.0);
}
