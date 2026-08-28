"use client";
import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

interface NodeProps {
  position: [number, number, number];
  color: string;
  name: string;
  type: string;
  riskScore: number;
}

function NetworkNode({ position, color, name, type, riskScore }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const isSuspicious = riskScore > 0.6 || type === "ALERT" || type === "HIGH_RISK";
  
  // Calculate size based on threat risk score and hover state
  const baseSize = isSuspicious ? 1.4 : 0.9;
  const size = hovered ? baseSize * 1.3 : baseSize;

  // Slowly rotate the sphere mesh for visual interest
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
      if (isSuspicious) {
        // Pulse scale slowly for suspicious nodes
        const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 4) * 0.05;
        meshRef.current.scale.setScalar(pulse);
      }
    }
  });

  return (
    <group 
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.2}
          metalness={0.8}
          emissive={color}
          emissiveIntensity={hovered ? 0.6 : isSuspicious ? 0.3 : 0.1}
        />
      </mesh>
      
      {/* Halo for high risk nodes */}
      {isSuspicious && (
        <mesh>
          <sphereGeometry args={[size * 1.25, 16, 16]} />
          <meshBasicMaterial 
            color="#ef4444" 
            transparent 
            opacity={0.15} 
            wireframe
          />
        </mesh>
      )}

      <Text
        position={[0, baseSize + 0.8, 0]}
        fontSize={0.55}
        color={hovered ? "#60a5fa" : "white"}
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/outfit/v11/F3wUip1xM2pq85mwGGk.woff" // Premium outfit font loading
      >
        {name}
      </Text>
    </group>
  );
}

function NetworkEdge({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const ref = useRef<THREE.Line>(null);
  const points = useMemo(() => [start, end], [start, end]);
  
  // Manage and dispose of BufferGeometry to prevent GPU memory leaks
  useEffect(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    if (ref.current) {
      ref.current.geometry = geometry;
    }
    return () => {
      geometry.dispose();
    };
  }, [points]);

  return (
    // @ts-ignore - React Three Fiber typing mismatch for line
    <line ref={ref}>
      <lineBasicMaterial 
        color="#475569" 
        opacity={0.35} 
        transparent 
        linewidth={1.5} 
      />
    </line>
  );
}

export default function NetworkScene({ data }: { data: any }) {
  // Simple random deterministic layout based on node ID to prevent layout jumps on re-renders
  const nodes = useMemo(() => {
    if (!data || !data.nodes) return [];
    
    // Seeded random helper to ensure nodes stay in same positions between filter changes
    const seededRandom = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const x = Math.sin(hash++) * 10000;
      return x - Math.floor(x);
    };

    return data.nodes.map((node: any) => {
      const idStr = String(node.id);
      return {
        ...node,
        position: [
          (seededRandom(idStr + "x") - 0.5) * 45,
          (seededRandom(idStr + "y") - 0.5) * 45,
          (seededRandom(idStr + "z") - 0.5) * 35
        ]
      };
    });
  }, [data]);

  const edges = useMemo(() => {
    const rawLinks = data ? (data.links || data.edges) : null;
    if (!data || !rawLinks || nodes.length === 0) return [];
    return rawLinks.map((link: any) => {
      const sourceNode = nodes.find((n: any) => n.id === link.source);
      const targetNode = nodes.find((n: any) => n.id === link.target);
      if (!sourceNode || !targetNode) return null;
      
      return {
        start: new THREE.Vector3(...sourceNode.position),
        end: new THREE.Vector3(...targetNode.position),
        id: link.rel_id || Math.random().toString()
      };
    }).filter(Boolean);
  }, [data, nodes]);

  const getColorByType = (type: string, riskScore: number) => {
    if (riskScore > 0.7) {
      return "#ef4444"; // Vivid high-risk red
    }
    switch(type?.toUpperCase()) {
      case "PERSON": return "#3b82f6"; // Blue
      case "ORGANIZATION": return "#10b981"; // Emerald
      case "LOCATION": return "#f59e0b"; // Amber
      case "PHONE": return "#8b5cf6"; // Violet
      default: return "#94a3b8"; // Slate
    }
  };

  return (
    <Canvas camera={{ position: [0, 0, 48], fov: 60 }}>
      {/* Lighting Setup */}
      <ambientLight intensity={0.4} />
      <pointLight position={[50, 50, 50]} intensity={1.2} />
      <pointLight position={[-50, -50, -50]} intensity={0.5} />
      <directionalLight position={[0, 10, 0]} intensity={0.7} />
      
      {/* Edge lines */}
      {edges.map((edge: any) => (
        <NetworkEdge key={edge.id} start={edge.start} end={edge.end} />
      ))}
      
      {/* Node spheres */}
      {nodes.map((node: any) => (
        <NetworkNode 
          key={node.id} 
          position={node.position as [number, number, number]} 
          name={node.name} 
          type={node.type}
          riskScore={node.risk_score || 0.0}
          color={getColorByType(node.type, node.risk_score || 0.0)} 
        />
      ))}
      
      {/* Scene interaction controls */}
      <OrbitControls 
        makeDefault 
        enableDamping 
        dampingFactor={0.05} 
        maxDistance={120} 
        minDistance={10} 
      />
    </Canvas>
  );
}
