precision highp float;

uniform float time;
uniform vec3 deepColor;
uniform vec3 shallowColor;
uniform sampler2D waveNoiseTexture;
uniform sampler2D waveDistortionTexture;

// 0 is deep water, 1 is shallow water
varying vec2 vUv;

varying vec3 vPosition;

#define WAVE_SCALE vec2(0.01, 0.02)
#define WAVE_SPEED vec2(0.001, 0.004)
#define WAVE_DISTORTION_SCALE vec2(0.02, 0.2)
#define WAVE_DISTORTION_SPEED vec2(0.007, 0.014)
#define WAVE_NOISE_CUTOFF 0.75
#define WAVE_DISTORTION_STRENGTH 0.2
#define WAVE_COLOR_STRENGTH 0.4

// Anti-aliasing
#define SMOOTHSTEP_AA 0.01

// How far away from the shoreline is the foam visible?
#define FOAM_DISTANCE 0.3

void main() {
    // Mix colors based on depth
    float waterDepth = 1.0 - vUv.y * vUv.y;
    vec3 color = shallowColor;
    color = mix(color, deepColor, waterDepth);

    // Sample noise
    vec2 tilingDistortionUv = abs(fract(vPosition.xz * WAVE_DISTORTION_SCALE + time * WAVE_DISTORTION_SPEED) * 2.0 - 1.0);
    vec2 distortSample = texture2D(waveDistortionTexture, tilingDistortionUv).rg * WAVE_DISTORTION_STRENGTH;

    vec2 tilingNoiseUv = abs(fract(vPosition.xz * WAVE_SCALE + time * WAVE_SPEED) * 2.0 - 1.0);
    vec2 distortedUv = vec2(
      tilingNoiseUv.x + distortSample.x, 
      tilingNoiseUv.y + distortSample.y
    );
    float waveNoise = texture2D(waveNoiseTexture, distortedUv).r;
    float waveNoiseCutoff = clamp(waterDepth / FOAM_DISTANCE, 0.0, 1.0) * WAVE_NOISE_CUTOFF;
    waveNoise = smoothstep(waveNoiseCutoff - SMOOTHSTEP_AA, waveNoiseCutoff + SMOOTHSTEP_AA, waveNoise);
    color = color + waveNoise * WAVE_COLOR_STRENGTH;
    
    gl_FragColor = vec4(color, 1.0);
} 