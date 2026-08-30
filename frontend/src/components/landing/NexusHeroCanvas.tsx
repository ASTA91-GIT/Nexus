"use client";
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { 
  CORE_ROTATION_SPEED, 
  RING_ROTATION_SPEEDS, 
  NODE_DRIFT_AMPLITUDE, 
  NODE_DRIFT_FREQUENCY, 
  NODE_DEPTH_OSCILLATION,
  CAMERA_PUSH_IN_DISTANCE, 
  CAMERA_LOOP_DURATION, 
  PARTICLE_COUNT_DESKTOP
} from '@/lib/motion-r3f';

function IntelligenceCore() {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const ringRef3 = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * CORE_ROTATION_SPEED;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.x += delta * RING_ROTATION_SPEEDS[0];
      ringRef1.current.rotation.y += delta * RING_ROTATION_SPEEDS[0] * 0.5;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z += delta * RING_ROTATION_SPEEDS[1];
      ringRef2.current.rotation.x += delta * RING_ROTATION_SPEEDS[1];
    }
    if (ringRef3.current) {
      ringRef3.current.rotation.y += delta * RING_ROTATION_SPEEDS[2];
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
      
      <mesh ref={ringRef3} rotation={[Math.PI / 6, 0, Math.PI / 4]}>
        <torusGeometry args={[4.0, 0.015, 16, 100]} />
        <meshStandardMaterial color="#22D3EE" emissive="#22D3EE" emissiveIntensity={0.2} transparent opacity={0.4} />
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
    nodes.push({ initialPosition: new THREE.Vector3(x, y, z), type, index: i });
  }
  return nodes;
}

function IntelligenceNetwork() {
  const groupRef = useRef<THREE.Group>(null);
  const nodesGroupRef = useRef<THREE.Group>(null);
  
  const nodes = useMemo(() => generateNodes(40, 4), []);
  const lines = useMemo(() => {
    const l = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].initialPosition.distanceTo(nodes[j].initialPosition) < 4 && Math.random() > 0.5) {
          l.push([nodes[i].initialPosition, nodes[j].initialPosition]);
        }
      }
    }
    for (let i = 0; i < 8; i++) {
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        l.push([randomNode.initialPosition, new THREE.Vector3(0,0,0)]);
    }
    return l;
  }, [nodes]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    
    if (nodesGroupRef.current) {
      nodesGroupRef.current.children.forEach((mesh: any, i) => {
        if (i < nodes.length) {
          const n = nodes[i];
          const phase = n.index;
          // Apply sine wave drift per node
          mesh.position.y = n.initialPosition.y + Math.sin(t * NODE_DRIFT_FREQUENCY + phase) * NODE_DRIFT_AMPLITUDE;
          mesh.position.z = n.initialPosition.z + Math.cos(t * NODE_DRIFT_FREQUENCY + phase) * NODE_DEPTH_OSCILLATION;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <IntelligenceCore />
      
      {/* Nodes */}
      <group ref={nodesGroupRef}>
        {nodes.map((node, i) => (
          <mesh key={`node-${i}`} position={node.initialPosition}>
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
      </group>

      {/* Connections (static geometry for performance, relies on group drift if needed, or we could update geometry in frame but that's expensive) */}
      {lines.map((line, i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(line);
        return (
          <primitive key={`line-${i}`} object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: "#3B82F6", transparent: true, opacity: 0.15 }))} />
        );
      })}
    </group>
  );
}

// Camera Animation
function CinematicCamera() {
  const baseZ = 12;
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // camera dollies per CAMERA_PUSH_IN_DISTANCE over CAMERA_LOOP_DURATION
    state.camera.position.z = baseZ - (Math.sin((t / CAMERA_LOOP_DURATION) * Math.PI * 2) * CAMERA_PUSH_IN_DISTANCE);
    state.camera.lookAt(0, 0, 0);
  });
  
  return null;
}

export default function NexusHeroCanvas() {
  return (
    <Canvas camera={{ position: [8, 2, 12], fov: 45 }} dpr={[1, 2]} className="w-full h-full">
      <fog attach="fog" args={['#050B16', 10, 30]} />
      
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#22D3EE" distance={20} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#3B82F6" />
      <directionalLight position={[-10, -10, -10]} intensity={0.5} color="#7C3AED" />

      <Stars radius={50} depth={20} count={PARTICLE_COUNT_DESKTOP} factor={4} saturation={0} fade speed={1} />
      
      <IntelligenceNetwork />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
    </Canvas>
  );
}
