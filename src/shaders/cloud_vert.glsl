const float uUnit = 1.0 / float(TEXTURE_DEPTH);

varying vec2 vUv;

void main() {
    vUv = vec2(uv.s * uUnit, uv.t);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
