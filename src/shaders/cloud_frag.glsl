uniform sampler2D flattened3DMap;

#if NUM_DIR_LIGHTS > 0

    struct DirectionalLight {
        vec3 color;
        float intensity;
    };

    uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];

#endif

varying vec2 vUv;

const float OPACITY_THRESHOLD = 0.6;

const float uUnit = 1.0 / TEXTURE_DEPTH;

void main() {
    #if NUM_DIR_LIGHTS > 0

        vec3 color = vec3(0.0, 0.0, 0.0);
        float opacityTotal = 0.0;

        for (int i = 0; i < int(TEXTURE_DEPTH); i++) {
            vec4 texel = texture2D(flattened3DMap, vec2(vUv.s + float(i) * uUnit, vUv.t));

            if (texel.r < CONDENSE_HEAT_THRESHOLD) {
                continue;
            }

            float opacity = (texel.r - CONDENSE_HEAT_THRESHOLD) / (1.0 - CONDENSE_HEAT_THRESHOLD);

            if (length(texel) > 0.0) {
                for (int j = 0; j < NUM_DIR_LIGHTS; j++) {
                    DirectionalLight directionalLight = directionalLights[j];
                    vec3 lightColor = directionalLight.color;
                    float lightIntensity = directionalLight.intensity;

                    if (j == 0) {
                        lightColor *= texel.g;
                    } else if (j == 1) {
                        lightColor *= texel.b;
                    } else if (j == 2) {
                        lightColor *= texel.a;
                    }

                    float opacityTotalRemains = 1.0 - opacityTotal;

                    color = color + lightColor * lightIntensity * opacity * opacityTotalRemains;
                    opacityTotal = 1.0 - opacityTotalRemains * (1.0 - opacity);

                    if (opacityTotal > OPACITY_THRESHOLD) {
                        break;
                    }
                }
            }

            gl_FragColor = vec4(color / opacityTotal, opacityTotal);
        }

    #endif
}
