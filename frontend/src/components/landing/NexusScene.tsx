"use client";
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';

function IntelligenceCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.2;
      coreRef.current.rotation.x += delta * 0.1;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.x -= delta * 0.3;
      ringRef1.current.rotation.y -= delta * 0.15;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z += delta * 0.2;
      ringRef2.current.rotation.x += delta * 0.1;
    }
  });

  return (
    <group>
      {/* Central Core */}
      <Sphere ref={coreRef} args={[1.5, 32, 32]}>
        <meshStandardMaterial 
          color="#22D3EE" 
          emissive="#22D3EE"
          emissiveIntensity={0.5}
          transparent 
          opacity={0.8}
          wireframe
        />
      </Sphere>
      
      {/* Inner Solid Core */}
      <Sphere args={[0.8, 32, 32]}>
        <meshStandardMaterial 
          color="#3B82F6" 
          emissive="#3B82F6"
          emissiveIntensity={1}
        />
      </Sphere>

      {/* Orbital Rings */}
      <mesh ref={ringRef1} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.5, 0.02, 16, 100]} />
        <meshStandardMaterial color="#3B82F6" emissive="#3B82F6" emissiveIntensity={0.5} />
      </mesh>

      <mesh ref={ringRef2} rotation={[0, Math.PI / 3, 0]}>
        <torusGeometry args={[3.2, 0.01, 16, 100]} />
        <meshStandardMaterial color="#7C3AED" emissive="#7C3AED" emissiveIntensity={0.3} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// Generate random node positions
function generateNodes(count: number, radius: number) {
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const r = radius + Math.random() * 3;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    // Types: 0 = Person (sphere), 1 = Org (cube), 2 = Location (cone)
    const type = Math.floor(Math.random() * 3);
    nodes.push({ position: new THREE.Vector3(x, y, z), type });
  }
  return nodes;
}

function IntelligenceNetwork() {
  const groupRef = useRef<THREE.Group>(null);
  
  const nodes = useMemo(() => generateNodes(40, 4), []);
  const lines = useMemo(() => {
    const l = [];
    // Connect some close nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].position.distanceTo(nodes[j].position) < 4 && Math.random() > 0.5) {
          l.push([nodes[i].position, nodes[j].position]);
        }
      }
    }
    // Connect some nodes to center
    for (let i = 0; i < 8; i++) {
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        l.push([randomNode.position, new THREE.Vector3(0,0,0)]);
    }
    return l;
  }, [nodes]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <IntelligenceCore />
      
      {/* Nodes */}
      {nodes.map((node, i) => (
        <mesh key={`node-${i}`} position={node.position}>
          {node.type === 0 && <sphereGeometry args={[0.15, 16, 16]} />}
          {node.type === 1 && <boxGeometry args={[0.2, 0.2, 0.2]} />}
          {node.type === 2 && <coneGeometry args={[0.15, 0.3, 16]} />}
          <meshStandardMaterial 
            color={node.type === 0 ? "#22D3EE" : node.type === 1 ? "#3B82F6" : "#7C3AED"} 
            emissive={node.type === 0 ? "#22D3EE" : node.type === 1 ? "#3B82F6" : "#7C3AED"}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}

      {/* Connections */}
      {lines.map((line, i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(line);
        return (
          <primitive key={`line-${i}`} object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: "#3B82F6", transparent: true, opacity: 0.15 }))} />
        );
      })}
    </group>
  );
}

// Mouse Parallax Effect
function ParallaxCamera() {
  const { camera, mouse } = useThree();
  const initialPosition = useRef(new THREE.Vector3(8, 2, 10));

  useFrame(() => {
    // Subtle parallax based on mouse
    const targetX = initialPosition.current.x + (mouse.x * 2);
    const targetY = initialPosition.current.y + (mouse.y * 2);
    
    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (targetY - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function NexusScene() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [8, 2, 10], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={['#050B16']} />
        <fog attach="fog" args={['#050B16', 10, 30]} />
        
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 0]} intensity={2} color="#22D3EE" distance={20} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#3B82F6" />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} color="#7C3AED" />

        <Stars radius={50} depth={20} count={3000} factor={4} saturation={0} fade speed={1} />
        
        <IntelligenceNetwork />
        
        <ParallaxCamera />
        {/* We disable orbit controls to keep the cinematic feel as requested, but allow subtle mouse parallax */}
        {/* <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.2} minPolarAngle={Math.PI / 2 - 0.2} /> */}
      </Canvas>
    </div>
  );
}
