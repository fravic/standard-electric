precision highp float;

uniform float time;
uniform vec3 waterColor;
varying vec2 vUv;
varying float vElevation;

void main() {
  // Create wave effect
  float wave1 = sin(vUv.x * 10.0 + time * 0.5) * 0.1;
  float wave2 = sin(vUv.y * 8.0 + time * 0.4) * 0.1;
  float waves = wave1 + wave2;
  
  // Add depth-based color variation
  vec3 color = waterColor;
  color += vec3(waves * 0.2);
  
  // Add fresnel effect
  float fresnel = pow(1.0 - vElevation, 3.0);
  color = mix(color, vec3(1.0), fresnel * 0.1);
  
  gl_FragColor = vec4(color, 0.8);
} 