"use client";
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

interface NodeProps {
  position: [number, number, number];
  color: string;
  name: string;
  type: string;
}

function NetworkNode({ position, color, name, type }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isSuspicious = type === "ALERT" || type === "HIGH_RISK";
  
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[isSuspicious ? 1.5 : 1, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>
    </group>
  );
}

function NetworkEdge({ start, end }: { start: THREE.Vector3, end: THREE.Vector3 }) {
  const ref = useRef<THREE.Line>(null);
  const points = useMemo(() => [start, end], [start, end]);
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  
  return (
    // @ts-ignore - React Three Fiber typing mismatch for line
    <line ref={ref} geometry={lineGeometry}>
      <lineBasicMaterial color="gray" opacity={0.5} transparent linewidth={1} />
    </line>
  );
}

export default function NetworkScene({ data }: { data: any }) {
  // Simple random layout for demonstration.
  // In a real app, use d3-force-3d or similar for graph layout algorithms.
  
  const nodes = useMemo(() => {
    if (!data || !data.nodes) return [];
    return data.nodes.map((node: any) => ({
      ...node,
      position: [
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      ]
    }));
  }, [data]);

  const edges = useMemo(() => {
    if (!data || !data.links || nodes.length === 0) return [];
    return data.links.map((link: any) => {
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

  const getColorByType = (type: string) => {
    switch(type?.toUpperCase()) {
      case "PERSON": return "#3b82f6"; // blue
      case "ORGANIZATION": return "#10b981"; // green
      case "LOCATION": return "#f59e0b"; // yellow
      case "PHONE": return "#8b5cf6"; // purple
      default: return "#ef4444"; // red
    }
  };

  return (
    <Canvas camera={{ position: [0, 0, 50], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[100, 100, 100]} intensity={1} />
      
      {edges.map((edge: any) => (
        <NetworkEdge key={edge.id} start={edge.start} end={edge.end} />
      ))}
      
      {nodes.map((node: any) => (
        <NetworkNode 
          key={node.id} 
          position={node.position as [number, number, number]} 
          name={node.name} 
          type={node.type}
          color={getColorByType(node.type)} 
        />
      ))}
      
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
    </Canvas>
  );
}
