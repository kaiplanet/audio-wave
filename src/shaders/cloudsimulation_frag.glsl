uniform sampler2D bufferMap;

#if NUM_DIR_LIGHTS > 0

    struct DirectionalLight {
        vec3 position;
    };

    uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];

#endif

uniform mat4 matrixWorldInverse;

varying vec2 vUv;

// Slices arranged horizontally like |0|1|2|...

const float ABSORPTION_RATE = 0.05;

const float reflectRate = 1.0 - ABSORPTION_RATE;
const float uUnit = 1.0 / TEXTURE_DEPTH;
const float offsetStrideHorizonal = uUnit / TEXTURE_WIDTH;
const float offsetStrideVertical = 1.0 / TEXTURE_HEIGHT;

void main() {
    vec2 vUvRelative[7];

    //     5 3
    //     |/
    // 4 - 0 - 2
    //    /|
    //   1 6

    vUvRelative[1] = vec2(-offsetStrideHorizonal, 0.0);
    vUvRelative[2] = vec2(0.0, -offsetStrideVertical);
    vUvRelative[3] = vec2(offsetStrideHorizonal, 0.0);
    vUvRelative[4] = vec2(0.0, offsetStrideVertical);
    vUvRelative[5] = vec2(-uUnit, 0.0);
    vUvRelative[6] = vec2(uUnit, 0.0);

    vec4 sampleTexels[7];
    vec4 sampleTexel0 = texture2D(bufferMap, vUv);

    sampleTexels[0] = sampleTexel0;

    for (int i = 1; i < 7; i++) {
        vec2 vUvTarget = vUv + vUvRelative[i];

        bool isOnSurface = (i == 1 && mod(vUv.s, uUnit) <= offsetStrideHorizonal)
            || (i == 3 && mod(vUv.s, uUnit) >= uUnit - offsetStrideHorizonal)
            || (i == 2 && vUvTarget.t < 0.01)
            || (i == 4 && vUvTarget.t > 0.99)
            || (i == 5 && vUv.s - uUnit < 0.0)
            || (i == 6 && vUv.s + uUnit > 1.0);

        if (isOnSurface) {
            sampleTexels[i] = vec4(0.0, 1.0, 1.0, 1.0);

            continue;
        }

        sampleTexels[i] = texture2D(bufferMap, vUvTarget);
    }

    #if NUM_DIR_LIGHTS > 0

        float attenuations[NUM_DIR_LIGHTS];

//        #pragma unroll_loop
        for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
            DirectionalLight directionalLight = directionalLights[i];
            float attenuation = 0.0;
            float dotNLTotal = 0.0;

            for (int j = 1; j < 7; j++) {
                vec3 normal;

                if (j == 1) {
                    normal = vec3(1.0, 0.0, 0.0);
                } else if (j == 2) {
                    normal = vec3(0.0, 1.0, 0.0);
                } else if (j == 3) {
                    normal = vec3(-1.0, 0.0, 0.0);
                } else if (j == 4) {
                    normal = vec3(0.0, -1.0, 0.0);
                } else if (j == 5) {
                    normal = vec3(0.0, 0.0, 1.0);
                } else if (j == 6) {
                    normal = vec3(0.0, 0.0, -1.0);
                }

                float dotNL = dot(normal, directionalLight.position);

                if (dotNL > 0.0) {
                    vec4 sampleTexel = sampleTexels[j];
                    float attenuationComponent = sampleTexel.r >= CONDENSE_HEAT_THRESHOLD ? reflectRate : 1.0;

                    if (i == 0) {
                        attenuationComponent *= sampleTexel.g;
                    } else if (i == 1) {
                        attenuationComponent *= sampleTexel.b;
                    } else if (i == 2) {
                        attenuationComponent *= sampleTexel.a;
                    }

                    if (attenuationComponent > 0.0) {
                        dotNLTotal += dotNL;

                        float dotNLTotalRate = (dotNLTotal - dotNL) / dotNLTotal;

                        attenuation = attenuation * dotNLTotalRate + attenuationComponent * (1.0 - dotNLTotalRate);
                    }
                }
            }

            attenuations[i] = attenuation;
        }

        gl_FragColor = vec4(sampleTexel0.r, 0.0, 0.0, 0.0);

        for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
            if (i == 0) {
                gl_FragColor.g = attenuations[i];
            } else if (i == 1) {
                gl_FragColor.b = attenuations[i];
            } else if (i == 2) {
                gl_FragColor.a = attenuations[i];
            }
        }

    #else

        gl_FragColor = vec4(sampleTexel0.r, 0.0, 0.0, 0.0);

    #endif

}
