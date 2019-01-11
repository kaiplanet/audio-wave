uniform float waveSpeed;
uniform float resistanceFactor;
uniform sampler2D bufferMap;
uniform sampler2D bufferMapLast;
uniform float delta;

varying vec2 vUv;

const float offsetStride  = 1.0 / 512.0;

void main() {

    float f1 = waveSpeed * waveSpeed * delta * delta;
    float f2 = 1.0 / (resistanceFactor * delta + 2.0);
    float k1 = (4.0 - 8.0 * f1) * f2;
    float k2 = (resistanceFactor * delta - 2.0) * f2;
    float k3 = 2.0 * f1 * f2;

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

    float offset = 0.0;

//    for (int i = 0; i < 21; i++) {
//        if (i == 10) {
//            offset -= sampleTexel[i].r;
//        } else {
//            offset += sampleTexel[i].r / 10.0;
//        }
//    }

    offset = k1 * sampleTexel[2].r + k2 * texture2D(bufferMapLast, vUv).r
        + k3 * (sampleTexel[0].r + sampleTexel[1].r + sampleTexel[3].r + sampleTexel[4].r)
        - k1 * 0.5 - k2 * 0.5 - k3 * 2.0;

    gl_FragColor = vec4(0.5 + offset, 0.0, 0.0, 0.0);
//    gl_FragColor = vec4(sampleTexel[6].r, 0.0, 0.0, 0.0);
}
