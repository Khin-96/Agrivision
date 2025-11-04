"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";

const WS_URL = "ws://localhost:8000/ws";

// --- Particle Orb ---
function ParticleOrb({ amplitude }: { amplitude: number }) {
  const POINTS = 900;
  const positions = useMemo(() => {
    const arr = new Float32Array(POINTS * 3);
    for (let i = 0; i < POINTS; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / POINTS);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      arr.set([
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ], i*3);
    }
    return arr;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const burstsRef = useRef<any[]>([]);

  const uniforms = useMemo(()=>({
    uTime: { value: 0 },
    uDistortAmp: { value: 0 }
  }),[]);

  const shaderMat = useMemo(()=>new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uDistortAmp;
      varying vec3 vNormal;
      float snoise(vec3 v){return sin(v.x+v.y+v.z);}
      void main() {
        vNormal = normal;
        vec3 pos = position + normal * snoise(position*2.0 + vec3(uTime*0.8)) * uDistortAmp;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float glow = pow(dot(normalize(vNormal),vec3(0.,0.,1.)),1.5);
        vec3 color = mix(vec3(0.0,0.3,0.1), vec3(0.3,1.0,0.4), glow);
        gl_FragColor = vec4(color,0.35+glow*0.4);
      }
    `,
    transparent: true
  }),[]);

  useFrame((state, delta)=>{
    if(!pointsRef.current || !sphereRef.current) return;
    pointsRef.current.rotation.y += delta*0.5;
    sphereRef.current.rotation.y -= delta*0.25;
    shaderMat.uniforms.uTime.value += delta;
    shaderMat.uniforms.uDistortAmp.value = amplitude*1.5;

    if(amplitude>0.2 && Math.random()<amplitude*0.3){
      burstsRef.current.push({
        position: new THREE.Vector3((Math.random()-0.5)*1.8,(Math.random()-0.5)*1.8,(Math.random()-0.5)*1.8),
        velocity: new THREE.Vector3((Math.random()-0.5)*0.02,(Math.random()-0.5)*0.02,(Math.random()-0.5)*0.02),
        lifetime: 0
      });
    }

    burstsRef.current.forEach(b=>{
      b.position.add(b.velocity);
      b.lifetime += delta;
    });
    burstsRef.current = burstsRef.current.filter(b=>b.lifetime<0.6);
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={positions.length/3} itemSize={3}/>
        </bufferGeometry>
        <pointsMaterial size={0.02+amplitude*0.02} sizeAttenuation color="#3ee07a" transparent opacity={0.95} depthWrite={false}/>
      </points>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.9,64,64]} />
        <primitive object={shaderMat} attach="material" />
      </mesh>
      {burstsRef.current.map((b,i)=>(
        <mesh key={i} position={b.position}>
          <sphereGeometry args={[0.03,8,8]} />
          <meshStandardMaterial color="#3ee07a" emissive="#3ee07a" emissiveIntensity={1} transparent opacity={0.9-b.lifetime*1.5}/>
        </mesh>
      ))}
    </group>
  )
}

// --- Main Live Component ---
export default function Live() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket|null>(null);
  const [messages,setMessages] = useState<{id:string,text:string}[]>([]);
  const [voiceEnabled,setVoiceEnabled] = useState(true);
  const [amplitude,setAmplitude] = useState(0);
  const [visible,setVisible] = useState(true);

  const pushMessage = (text:string)=>{
    const id = Date.now().toString(36);
    setMessages(s=>[...s,{id,text}].slice(-6));
    setTimeout(()=>setMessages(s=>s.filter(m=>m.id!==id)),25000);
  };

  // Webcam
  useEffect(()=>{
    let active = true;
    navigator.mediaDevices.getUserMedia({video:{width:1280,height:720},audio:false})
    .then(stream=>{ if(active && videoRef.current) videoRef.current.srcObject = stream })
    .catch(e=>console.error("Camera error:",e));
    return ()=>{active=false;}
  },[]);

  // WebSocket
  useEffect(()=>{
    if(!visible) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = ()=>console.log("✅ Connected to AI server");
    ws.onclose = ()=>console.log("❌ Disconnected from AI server");
    ws.onmessage = async evt=>{
      const data = JSON.parse(evt.data);
      if(data.type==="ping") return;
      if(data.type==="result" && data.answer) pushMessage(data.answer);
      if(data.type==="tts" && data.text && voiceEnabled){
        // Animate orb amplitude while AI is speaking
        setAmplitude(0.8);
        const utter = new SpeechSynthesisUtterance(data.text);
        utter.onend = ()=>setAmplitude(0);
        speechSynthesis.speak(utter);
      }
    };
    return ()=>{ws.close(); wsRef.current=null;}
  },[voiceEnabled,visible]);

  // Send video frames every 1s
  useEffect(()=>{
    if(!visible) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let stop = false;
    const sendFrame = ()=>{
      if(stop) return;
      const ws = wsRef.current;
      const video = videoRef.current;
      if(!ws || ws.readyState!==WebSocket.OPEN || !video) return setTimeout(sendFrame,1000);

      canvas.width = 960;
      canvas.height = Math.round(video.videoHeight/video.videoWidth*960)||540;
      ctx?.drawImage(video,0,0,canvas.width,canvas.height);
      ws.send(JSON.stringify({type:"frame",data:canvas.toDataURL("image/jpeg",0.55)}));
      setTimeout(sendFrame,1000);
    };
    sendFrame();
    return ()=>{stop=true;}
  },[visible]);

  if(!visible) return null;

  return (
    <div className="fixed inset-0 flex items-stretch justify-center bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover"/>
      <div className="absolute inset-0 bg-black/20" />

      {/* Close */}
      <button onClick={()=>setVisible(false)} className="absolute top-6 right-6 z-50 text-white text-2xl bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition">✕</button>

      {/* Voice Orb */}
      <div className="absolute right-8 bottom-8 w-48 h-48 md:w-64 md:h-64 z-30 pointer-events-none">
        <Canvas camera={{position:[0,0,3],fov:50}}>
          <ambientLight intensity={0.6}/>
          <directionalLight position={[5,5,5]} intensity={0.8}/>
          <ParticleOrb amplitude={amplitude}/>
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false}/>
        </Canvas>
      </div>

      {/* Controls */}
      <div className="absolute left-8 top-8 z-40 flex flex-col gap-3">
        <button onClick={()=>{
          const ws = wsRef.current;
          if(ws && ws.readyState===WebSocket.OPEN){
            const enabled = !voiceEnabled;
            setVoiceEnabled(enabled);
            ws.send(JSON.stringify({type:"toggle_voice",enabled}));
          }
        }} className="px-4 py-2 rounded-2xl bg-white/10 text-white border border-white/10 hover:bg-white/20 transition">
          {voiceEnabled?"Voice: ON":"Voice: OFF"}
        </button>
        <div className="text-sm text-white/80">
          <div className="font-medium">Vision-AI</div>
          <div className="text-xs text-white/60">Live narrator (Kyutai)</div>
        </div>
      </div>

      {/* Message Feed */}
      <div className="absolute left-8 bottom-8 z-40 max-w-lg w-full flex flex-col-reverse gap-3">
        <AnimatePresence initial={false}>
          {messages.map(m=>(
            <motion.div key={m.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40,filter:"blur(3px)"}} transition={{duration:0.45,ease:"easeOut"}}>
              <div className="p-4 rounded-2xl backdrop-blur-md bg-white/10 border border-white/10 text-white shadow-lg" style={{boxShadow:"0 8px 25px rgba(2,6,23,0.45)"}}>
                <div className="text-sm leading-snug">{m.text}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
