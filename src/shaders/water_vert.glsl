#define USE_MAP
#define LAMBERT

uniform sampler2D normalMap;
uniform mat4 textureMatrix;
uniform float eta;

varying vec3 vLightFront;

#ifdef DOUBLE_SIDED

	varying vec3 vLightBack;

#endif

varying float fresnelFactor;

#include <common>
//#include <uv_pars_vertex>

#if defined(USE_MAP)

	varying vec4 vUv;
	uniform mat3 uvTransform;

#endif

#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <bsdfs>
#include <lights_pars_begin>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

const float mirrorFactor = 250.0;
const float reflectRate = 0.95;
const float sceneHeight = 600.0;

void main() {
//	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>

	vec3 objectNormal = texture2D(normalMap, uv).xyz;

    vUv = textureMatrix * vec4(position, 1.0)
        + vec4(objectNormal.x  / objectNormal.z * sceneHeight, objectNormal.y / objectNormal.z * sceneHeight, 0.0, 0.0);

    vec3 incidentLightDirection = reflect(position - cameraPosition, objectNormal);
    float texDotNL = dot(normalize(incidentLightDirection), normalize(objectNormal));
    float g = sqrt(pow(eta, 2.0) - 1.0 + pow(texDotNL, 2.0));
    float f1 = g - texDotNL;
    float f2 = g + texDotNL;

    fresnelFactor = 0.5 * pow(f1, 2.0) / pow(f2, 2.0)
        * (pow(texDotNL * f2 - 1.0, 2.0) / pow(texDotNL * f1 + 1.0, 2.0) + 1.0);

//	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	#include <worldpos_vertex>
	#include <envmap_vertex>
//	#include <lights_lambert_vertex>

    vec3 diffuse = vec3(1.0);

    GeometricContext geometry;
    geometry.position = mvPosition.xyz;
    geometry.normal = normalize(transformedNormal);
    geometry.viewDir = normalize(-mvPosition.xyz);

    GeometricContext backGeometry;
    backGeometry.position = geometry.position;
    backGeometry.normal = -geometry.normal;
    backGeometry.viewDir = geometry.viewDir;

    vLightFront = vec3(0.0);

    #ifdef DOUBLE_SIDED
        vLightBack = vec3(0.0);
    #endif

    IncidentLight directLight;
    float dotNL;
    vec3 directLightColor_Diffuse;

    #if NUM_DIR_LIGHTS > 0

//        #pragma unroll_loop
        for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
            getDirectionalDirectLightIrradiance(directionalLights[i], geometry, directLight);

            dotNL = dot(geometry.normal, directLight.direction);
            directLightColor_Diffuse = PI * directLight.color;

            vec3 reflectDirection = reflect(-directLight.direction, geometry.normal);
            float reflectStrength;

            if (dotNL > 0.0) {
                reflectStrength =
                    pow(max(dot(reflectDirection, normalize(cameraPosition - position)), 0.0), mirrorFactor);
            } else {
                reflectStrength = 0.0;
            }

            vec3 vLightFrontComponent = saturate(dotNL) * directLightColor_Diffuse;

            vec3 vLightFrontDiffuse = vLightFrontComponent * (1.0 - reflectRate);
            vec3 vLightFrontMirror = vLightFrontComponent * reflectRate;

            vLightFront += vLightFrontDiffuse + vLightFrontMirror * reflectStrength;
        }

    #endif

    #if NUM_HEMI_LIGHTS > 0

    	#pragma unroll_loop
    	for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

    		vLightFront += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );

    		#ifdef DOUBLE_SIDED

    			vLightBack += getHemisphereLightIrradiance( hemisphereLights[ i ], backGeometry );

    		#endif

    	}

    #endif

	#include <shadowmap_vertex>
	#include <fog_vertex>
}
