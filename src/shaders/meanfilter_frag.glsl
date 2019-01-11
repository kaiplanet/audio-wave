uniform sampler2D tDiffuse;

varying vec2 vUv;

const float offsetStride  = 1.0 / 512.0;

void main() {
    vec2 sampleOffset[21];

    //    0  1  2
    // 3  4  5  6  7
    // 8  9  10 11 12
    // 13 14 15 16 17
    //    18 19 20

    sampleOffset[0] = vec2(-offsetStride, offsetStride * 2.0);
    sampleOffset[1] = vec2(0, offsetStride * 2.0);
    sampleOffset[2] = vec2(offsetStride, offsetStride * 2.0);
    sampleOffset[3] = vec2(-offsetStride * 2.0, offsetStride);
    sampleOffset[4] = vec2(-offsetStride, offsetStride);
    sampleOffset[5] = vec2(0.0, offsetStride);
    sampleOffset[6] = vec2(offsetStride, offsetStride);
    sampleOffset[7] = vec2(offsetStride * 2.0, offsetStride);
    sampleOffset[8] = vec2(-offsetStride * 2.0, 0.0);
    sampleOffset[9] = vec2(-offsetStride, 0.0);
    sampleOffset[10] = vec2(0.0, 0.0);
    sampleOffset[11] = vec2(offsetStride, 0.0);
    sampleOffset[12] = vec2(offsetStride * 2.0, 0.0);
    sampleOffset[13] = vec2(-offsetStride * 2.0, -offsetStride);
    sampleOffset[14] = vec2(-offsetStride, -offsetStride);
    sampleOffset[15] = vec2(0.0, -offsetStride);
    sampleOffset[16] = vec2(offsetStride, -offsetStride);
    sampleOffset[17] = vec2(offsetStride * 2.0, -offsetStride);
    sampleOffset[18] = vec2(-offsetStride, -offsetStride * 2.0);
    sampleOffset[19] = vec2(0.0, -offsetStride * 2.0);
    sampleOffset[20] = vec2(offsetStride, -offsetStride * 2.0);

    vec4 sampleTexel[21];

    for (int i = 0; i < 21; i++) {
        vec2 texelCoords = vUv + sampleOffset[i];

        sampleTexel[i] = texture2D(tDiffuse, texelCoords);
    }

    float r = 0.0;

    for (int i = 0; i < 21; i++) {
        r += sampleTexel[i].r / 21.0;
    }

    gl_FragColor = vec4(r, 0.0, 0.0, 0.0);
}
