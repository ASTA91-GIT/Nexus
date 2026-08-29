"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Text, DragControls } from "@react-three/drei";
import * as THREE from "three";

function linkEndpointId(value: unknown): string {
  if (value && typeof value === "object") {
    const obj = value as { id?: string; _id?: string };
    return String(obj.id ?? obj._id ?? "");
  }
  return String(value ?? "");
}

function fibonacciSphere(count: number, radius: number): [number, number, number][] {
  if (count <= 0) return [];
  if (count === 1) return [[0, 0, 0]];
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y)) * radius;
    const theta = golden * i;
    return [Math.cos(theta) * r, y * radius * 0.85, Math.sin(theta) * r];
  });
}

function NetworkNode({
  position,
  color,
  name,
  type,
  riskScore,
  highlighted,
  dimmed,
  onClick,
  isEditMode,
  onNodeDragEnd,
  id
}: {
  position: [number, number, number];
  color: string;
  name: string;
  type: string;
  riskScore: number;
  highlighted: boolean;
  dimmed: boolean;
  onClick?: () => void;
  isEditMode?: boolean;
  onNodeDragEnd?: (id: string, x: number, y: number, z: number) => void;
  id: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const isSuspicious = riskScore > 0.6 || type === "ALERT" || type === "HIGH_RISK";
  const baseSize = isSuspicious ? 1.15 : 0.75;
  const size = hovered ? baseSize * 1.25 : baseSize;

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.25;
    if (isSuspicious) {
      const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 3.5) * 0.06;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  useEffect(() => {
    document.body.style.cursor = hovered ? (isEditMode ? "grab" : "pointer") : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered, isEditMode]);

  const opacity = dimmed ? 0.18 : 1;

  const nodeContent = (
    <group
      position={isEditMode ? undefined : position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial
          color={color}
          roughness={0.25}
          metalness={0.7}
          emissive={highlighted || isSuspicious ? color : "#000000"}
          emissiveIntensity={highlighted ? 0.85 : hovered ? 0.55 : isSuspicious ? 0.35 : 0.08}
          transparent
          opacity={opacity}
        />
      </mesh>
      {(isSuspicious || highlighted) && (
        <mesh>
          <sphereGeometry args={[size * 1.3, 12, 12]} />
          <meshBasicMaterial
            color={highlighted ? "#3b82f6" : "#ef4444"}
            transparent
            opacity={dimmed ? 0.05 : 0.22}
            wireframe
          />
        </mesh>
      )}
      {(!dimmed || hovered) && (
        <Text
          position={[0, baseSize + 0.7, 0]}
          fontSize={0.42}
          color={hovered ? "#93c5fd" : highlighted ? "#ffffff" : "#e2e8f0"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#020617"
        >
          {name}
        </Text>
      )}
    </group>
  );

  if (isEditMode) {
    return (
      <group position={position}>
        <DragControls
          autoTransform
          onDragStart={() => { document.body.style.cursor = "grabbing"; }}
          onDragEnd={() => {
            document.body.style.cursor = "grab";
            if (meshRef.current) {
              const pos = new THREE.Vector3();
              meshRef.current.getWorldPosition(pos);
              onNodeDragEnd?.(id, pos.x, pos.y, pos.z);
            }
          }}
        >
          {nodeContent}
        </DragControls>
      </group>
    );
  }

  return nodeContent;
}

function NetworkEdge({
  start,
  end,
  label,
  highlighted,
  dimmed,
  onClick,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  label: string;
  highlighted: boolean;
  dimmed: boolean;
  onClick?: () => void;
}) {
  const midPoint = useMemo(
    () => new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5),
    [start, end]
  );
  const color = highlighted ? "#60a5fa" : dimmed ? "#334155" : "#94a3b8";
  const opacity = highlighted ? 1 : dimmed ? 0.12 : 0.55;
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (onClick) {
      document.body.style.cursor = hovered ? "pointer" : "auto";
      return () => { document.body.style.cursor = "auto"; };
    }
  }, [hovered, onClick]);

  return (
    <group 
      onPointerOver={(e) => { if(onClick) { e.stopPropagation(); setHovered(true); } }}
      onPointerOut={(e) => { if(onClick) { e.stopPropagation(); setHovered(false); } }}
      onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }}
    >
      <Line
        points={[start, end]}
        color={hovered ? "#ffffff" : color}
        lineWidth={highlighted ? 2.5 : 1.2}
        transparent
        opacity={opacity}
      />
      {(!dimmed || highlighted) && (
        <Text
          position={[midPoint.x, midPoint.y + 0.35, midPoint.z]}
          fontSize={0.28}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.015}
          outlineColor="#020617"
        >
          {label}
        </Text>
      )}
    </group>
  );
}

export default function NetworkScene({
  data,
  onNodeClick,
  onEdgeClick,
  highlightedPath = [],
  isEditMode = false,
  onNodeDragEnd,
  draggedPositions = {}
}: {
  data: any;
  onNodeClick?: (node: any) => void;
  onEdgeClick?: (edge: any) => void;
  highlightedPath?: string[];
  isEditMode?: boolean;
  onNodeDragEnd?: (id: string, x: number, y: number, z: number) => void;
  draggedPositions?: Record<string, {x: number, y: number, z: number}>;
}) {
  const nodes = useMemo(() => {
    const rawNodes = data?.nodes || [];
    const positions = fibonacciSphere(rawNodes.length, 16);
    return rawNodes.map((node: any, index: number) => {
      const idStr = String(node.id ?? node._id ?? index);
      
      let pos = positions[index];
      if (draggedPositions[idStr]) {
        pos = [draggedPositions[idStr].x, draggedPositions[idStr].y, draggedPositions[idStr].z];
      } else if (node.position && typeof node.position.x === 'number') {
        pos = [node.position.x, node.position.y, node.position.z];
      }
      
      return {
        ...node,
        id: idStr,
        position: pos,
      };
    });
  }, [data, draggedPositions]);

  const nodeById = useMemo(() => {
    const map = new Map<string, any>();
    for (const node of nodes) map.set(node.id, node);
    return map;
  }, [nodes]);

  const edges = useMemo(() => {
    const rawLinks = data?.links || data?.edges || [];
    const path = (highlightedPath || []).map(String);
    return rawLinks
      .map((link: any, index: number) => {
        const sourceId = linkEndpointId(link.source);
        const targetId = linkEndpointId(link.target);
        const sourceNode = nodeById.get(sourceId);
        const targetNode = nodeById.get(targetId);
        if (!sourceNode || !targetNode) return null;

        let isHighlighted = false;
        for (let i = 0; i < path.length - 1; i++) {
          if (
            (path[i] === sourceId && path[i + 1] === targetId) ||
            (path[i] === targetId && path[i + 1] === sourceId)
          ) {
            isHighlighted = true;
            break;
          }
        }

        return {
          id: String(link.rel_id || link.id || `${sourceId}-${targetId}-${index}`),
          start: new THREE.Vector3(...sourceNode.position),
          end: new THREE.Vector3(...targetNode.position),
          label: link.type || "LINKED",
          source: sourceId,
          target: targetId,
          highlighted: isHighlighted,
        };
      })
      .filter(Boolean);
  }, [data, nodeById, highlightedPath]);

  const getColorByType = (type: string, riskScore: number) => {
    if (riskScore > 0.7) return "#ef4444";
    switch ((type || "").toUpperCase()) {
      case "PERSON":
        return "#3b82f6";
      case "ORGANIZATION":
        return "#10b981";
      case "LOCATION":
        return "#f59e0b";
      case "PHONE":
        return "#8b5cf6";
      case "ACCOUNT":
        return "#06b6d4";
      case "VEHICLE":
        return "#ec4899";
      default:
        return "#94a3b8";
    }
  };

  const hasHighlight = highlightedPath.length > 0;

  if (!nodes.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs font-mono uppercase tracking-widest text-slate-500">
        No network data
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[280px]">
      <Canvas camera={{ position: [0, 4, 38], fov: 55 }} gl={{ antialias: true }}>
        <color attach="background" args={["#05070c"]} />
        <ambientLight intensity={0.45} />
        <pointLight position={[40, 40, 40]} intensity={1.1} />
        <pointLight position={[-40, -20, -40]} intensity={0.45} />
        <directionalLight position={[0, 12, 8]} intensity={0.65} />

        {edges.map((edge: any) => (
          <NetworkEdge
            key={edge.id}
            start={edge.start}
            end={edge.end}
            label={edge.label}
            highlighted={edge.highlighted}
            dimmed={hasHighlight && !edge.highlighted}
            onClick={isEditMode ? () => onEdgeClick?.(edge) : undefined}
          />
        ))}

        {nodes.map((node: any) => {
          const isHighlighted = highlightedPath.map(String).includes(node.id);
          return (
            <NetworkNode
              key={node.id}
              id={node.id}
              position={node.position}
              name={node.name}
              type={node.type}
              riskScore={node.risk_score || 0}
              color={getColorByType(node.type, node.risk_score || 0)}
              onClick={() => onNodeClick?.(node)}
              highlighted={isHighlighted}
              dimmed={hasHighlight && !isHighlighted}
              isEditMode={isEditMode}
              onNodeDragEnd={onNodeDragEnd}
            />
          );
        })}

        <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxDistance={90} minDistance={8} />
      </Canvas>
    </div>
  );
}
