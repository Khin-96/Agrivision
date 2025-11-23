"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type AgentState = null | "thinking" | "listening" | "talking";

interface OrbProps {
  colors?: [string, string];
  agentState?: AgentState;
  manualOutput?: number; // 0 to 1 (Volume level)
  className?: string;
}

function OrbMesh({ colors, agentState, manualOutput }: OrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Default colors if none provided
  const colorA = useMemo(() => new THREE.Color(colors?.[0] || "#CADCFC"), [colors]);
  const colorB = useMemo(() => new THREE.Color(colors?.[1] || "#A0B9D1"), [colors]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorA: { value: colorA },
    uColorB: { value: colorB },
    uIntensity: { value: 0.2 },
  }), [colorA, colorB]);

  useFrame((state, delta) => {
    if (!materialRef.current || !meshRef.current) return;

    // 1. Update Time
    materialRef.current.uniforms.uTime.value += delta;

    // 2. State Machine Logic
    let targetIntensity = 0.15; // Idle wobble
    let rotationSpeed = 0.15;

    switch (agentState) {
        case "listening":
            targetIntensity = 0.3;
            rotationSpeed = 0.5; // Slow, aware rotation
            break;
        case "thinking":
            targetIntensity = 0.4;
            rotationSpeed = 2.0; // Fast processing spin
            break;
        case "talking":
            // React directly to audio volume
            // Base 0.2 + up to 1.5x expansion based on volume
            targetIntensity = 0.2 + (manualOutput || 0) * 1.0; 
            rotationSpeed = 0.3;
            break;
        default: // Idle
            targetIntensity = 0.15;
            rotationSpeed = 0.1;
            break;
    }

    // 3. Smoothly Lerp Intensity (prevents jittery movement)
    materialRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uIntensity.value,
        targetIntensity,
        0.1 // Smoothing factor
    );

    // 4. Rotate Mesh
    meshRef.current.rotation.y += delta * rotationSpeed;
    meshRef.current.rotation.z += delta * (rotationSpeed * 0.2);
  });

  return (
    <mesh ref={meshRef} scale={1.5}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent={true}
        vertexShader={`
          uniform float uTime;
          uniform float uIntensity;
          varying vec2 vUv;
          varying float vDisplacement;
          
          // --- Simplex Noise (Standard WebGL implementation) ---
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
          vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
          
          float snoise(vec3 v) {
            const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
            const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 = v - i + dot(i, C.xxx) ;
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute( permute( permute( 
                      i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            float n_ = 0.142857142857; 
            vec3  ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z); 
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ ); 
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                          dot(p2,x2), dot(p3,x3) ) );
          }
          // ---------------------------------------------------------

          void main() {
            vUv = uv;
            // Calculate noise based on position and time
            float noise = snoise(position * 2.0 + uTime * 0.5);
            
            // Pass noise to fragment shader for color mixing
            vDisplacement = noise;
            
            // Displace vertex position along normal
            vec3 newPos = position + normal * noise * uIntensity;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          varying float vDisplacement;
          
          void main() {
            // Mix colors based on the displacement calculated in vertex shader
            // Normalize displacement from [-1, 1] to [0, 1] roughly
            float distort = vDisplacement * 0.5 + 0.5;
            
            vec3 color = mix(uColorA, uColorB, distort);
            
            // Add simple rim lighting/glow for 3D depth
            float glow = 0.1;
            
            gl_FragColor = vec4(color + glow, 0.95);
          }
        `}
      />
    </mesh>
  );
}

export function Orb({ className, ...props }: OrbProps) {
  return (
    <div className={`w-full h-full min-h-[200px] ${className || ""}`}>
      <Canvas camera={{ position: [0, 0, 3] }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbMesh {...props} />
      </Canvas>
    </div>
  );
}
