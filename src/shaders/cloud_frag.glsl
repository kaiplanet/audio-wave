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
    vec3 directionalLightColors[NUM_DIR_LIGHTS];

    for ( int i = 0; i < NUM_DIR_LIGHTS; i++ ) {
        DirectionalLight directionalLight = directionalLights[ i ];

        directionalLightColors[ i ] = directionalLight.color * directionalLight.intensity;
    }

    #if NUM_DIR_LIGHTS > 0

        vec3 color = vec3(0.0, 0.0, 0.0);
        float opacityTotal = 0.0;

        for (int i = 0; i < int(TEXTURE_DEPTH); i++) {
            vec4 texel = texture2D(flattened3DMap, vec2(vUv.s + float(i) * uUnit, vUv.t));

            if (texel.r == 0.0 || texel.g == 1.0) {
                continue;
            }

            float opacity = texel.r;

            opacity = opacity * (1.0 - mod(texel.g, 0.5) * 2.0);

            if (length(texel) > 0.0) {
                for (int j = 0; j < NUM_DIR_LIGHTS; j++) {
                    vec3 lightColor = directionalLightColors[j];

                    if (j == 0) {
                        lightColor *= texel.b;
                    } else if (j == 1) {
                        lightColor *= texel.a;
                    }

                    float opacityTotalRemains = 1.0 - opacityTotal;

                    color = color + lightColor * opacity * opacityTotalRemains;
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
