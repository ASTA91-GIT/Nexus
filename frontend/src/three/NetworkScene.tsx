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
  highlighted: boolean;
  dimmed: boolean;
  onClick?: () => void;
}

function NetworkNode({ position, color, name, type, riskScore, highlighted, dimmed, onClick }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const isSuspicious = riskScore > 0.6 || type === "ALERT" || type === "HIGH_RISK";
  
  const baseSize = isSuspicious ? 1.4 : 0.9;
  const size = hovered ? baseSize * 1.3 : baseSize;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
      if (isSuspicious) {
        const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 4) * 0.05;
        meshRef.current.scale.setScalar(pulse);
      }
    }
  });

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => { document.body.style.cursor = "auto"; };
  }, [hovered]);

  const opacity = dimmed ? 0.15 : 1.0;

  return (
    <group 
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.2}
          metalness={0.8}
          emissive={highlighted ? color : (isSuspicious ? color : "#000")}
          emissiveIntensity={highlighted ? 0.8 : (hovered ? 0.6 : isSuspicious ? 0.3 : 0.1)}
          transparent
          opacity={opacity}
        />
      </mesh>
      
      {/* Halo for high risk or highlighted nodes */}
      {(isSuspicious || highlighted) && (
        <mesh>
          <sphereGeometry args={[size * 1.25, 16, 16]} />
          <meshBasicMaterial 
            color={highlighted ? "#3b82f6" : "#ef4444"} 
            transparent 
            opacity={dimmed ? 0.05 : 0.25} 
            wireframe
          />
        </mesh>
      )}

      {(!dimmed || hovered) && (
        <Text
          position={[0, baseSize + 0.8, 0]}
          fontSize={0.55}
          color={hovered ? "#60a5fa" : highlighted ? "#fff" : "#cbd5e1"}
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/outfit/v11/F3wUip1xM2pq85mwGGk.woff"
          fillOpacity={opacity}
        >
          {name}
        </Text>
      )}
    </group>
  );
}

function NetworkEdge({ start, end, label, status, highlighted, dimmed }: { start: THREE.Vector3; end: THREE.Vector3; label: string; status: string; highlighted: boolean; dimmed: boolean }) {
  const ref = useRef<THREE.Line>(null);
  const points = useMemo(() => [start, end], [start, end]);
  
  useEffect(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    if (ref.current) {
      ref.current.geometry = geometry;
    }
    return () => { geometry.dispose(); };
  }, [points]);

  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  
  // Calculate orientation for the cone to point along the edge
  const arrowQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  // Edge styling based on status and highlight
  let color = "#475569";
  let opacity = dimmed ? 0.1 : 0.4;
  let lineWidth = 1.5;
  let isDashed = false;

  if (highlighted) {
    color = "#3b82f6"; // bright blue
    opacity = 1.0;
    lineWidth = 3.0;
  } else if (!dimmed) {
    if (status === "CONFIRMED") {
      color = "#94a3b8"; // solid light grey
      opacity = 0.6;
    } else if (status === "INFERRED") {
      color = "#64748b";
      opacity = 0.4;
      isDashed = true;
    } else if (status === "PREDICTED") {
      color = "#f59e0b"; // amber for predicted
      opacity = 0.6;
      isDashed = true;
    }
  }

  return (
    <group>
      {/* Edge Line */}
      {/* @ts-ignore */}
      <line ref={ref}>
        {isDashed ? (
          <lineDashedMaterial color={color} opacity={opacity} transparent linewidth={lineWidth} dashSize={1} gapSize={1} />
        ) : (
          <lineBasicMaterial color={color} opacity={opacity} transparent linewidth={lineWidth} />
        )}
      </line>

      {/* Directional Arrow (Cone) */}
      {(!dimmed || highlighted) && (
        <mesh position={midPoint} quaternion={arrowQuaternion}>
          <coneGeometry args={[0.3, 0.8, 8]} />
          <meshBasicMaterial color={color} opacity={opacity + 0.2} transparent />
        </mesh>
      )}

      {/* Edge Label */}
      {(!dimmed || highlighted) && (
        <Text
          position={[midPoint.x, midPoint.y + 0.5, midPoint.z]}
          fontSize={0.4}
          color={color}
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwI.woff"
          fillOpacity={opacity + 0.3}
        >
          {label}
        </Text>
      )}
    </group>
  );
}

export default function NetworkScene({ data, onNodeClick, highlightedPath = [] }: { data: any; onNodeClick?: (node: any) => void; highlightedPath?: string[] }) {
  const nodes = useMemo(() => {
    if (!data || !data.nodes) return [];
    
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
      
      const props = link.properties || {};
      const status = (props.status || props.confidence || "UNKNOWN").toUpperCase();

      // Check if both nodes are in the highlighted path and they are adjacent in the path
      let isHighlighted = false;
      if (highlightedPath.length > 1) {
        for (let i = 0; i < highlightedPath.length - 1; i++) {
          if (
            (highlightedPath[i] === link.source && highlightedPath[i+1] === link.target) ||
            (highlightedPath[i] === link.target && highlightedPath[i+1] === link.source)
          ) {
            isHighlighted = true;
            break;
          }
        }
      }
      
      return {
        start: new THREE.Vector3(...sourceNode.position),
        end: new THREE.Vector3(...targetNode.position),
        id: link.rel_id || link.id || Math.random().toString(),
        label: link.type || "LINKED",
        status: status,
        source: link.source,
        target: link.target,
        highlighted: isHighlighted
      };
    }).filter(Boolean);
  }, [data, nodes, highlightedPath]);

  const getColorByType = (type: string, riskScore: number) => {
    if (riskScore > 0.7) return "#ef4444";
    switch(type?.toUpperCase()) {
      case "PERSON": return "#3b82f6";
      case "ORGANIZATION": return "#10b981";
      case "LOCATION": return "#f59e0b";
      case "PHONE": return "#8b5cf6";
      case "ACCOUNT": return "#06b6d4";
      case "VEHICLE": return "#ec4899";
      default: return "#94a3b8";
    }
  };

  const hasHighlight = highlightedPath.length > 0;

  return (
    <Canvas camera={{ position: [0, 0, 48], fov: 60 }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[50, 50, 50]} intensity={1.2} />
      <pointLight position={[-50, -50, -50]} intensity={0.5} />
      <directionalLight position={[0, 10, 0]} intensity={0.7} />
      
      {edges.map((edge: any) => (
        <NetworkEdge 
          key={edge.id} 
          start={edge.start} 
          end={edge.end} 
          label={edge.label}
          status={edge.status}
          highlighted={edge.highlighted}
          dimmed={hasHighlight && !edge.highlighted}
        />
      ))}
      
      {nodes.map((node: any) => {
        const isHighlighted = highlightedPath.includes(node.id);
        const isDimmed = hasHighlight && !isHighlighted;
        return (
          <NetworkNode 
            key={node.id} 
            position={node.position as [number, number, number]} 
            name={node.name} 
            type={node.type}
            riskScore={node.risk_score || 0.0}
            color={getColorByType(node.type, node.risk_score || 0.0)} 
            onClick={() => onNodeClick && onNodeClick(node)}
            highlighted={isHighlighted}
            dimmed={isDimmed}
          />
        );
      })}
      
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} maxDistance={120} minDistance={10} />
    </Canvas>
  );
}
