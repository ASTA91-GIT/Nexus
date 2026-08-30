"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Text, DragControls, Html } from "@react-three/drei";
import * as THREE from "three";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faBuilding, faMapMarkerAlt, faCar, faPhone, faFileInvoice, faEnvelope, faCalendarAlt, faExclamationTriangle, faQuestionCircle } from "@fortawesome/free-solid-svg-icons";

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

const getIconForType = (type: string) => {
  switch ((type || "").toUpperCase()) {
    case "PERSON": return faUser;
    case "ORGANIZATION": return faBuilding;
    case "LOCATION": return faMapMarkerAlt;
    case "VEHICLE": return faCar;
    case "PHONE": 
    case "PHONE_NUMBER":
    case "COMMUNICATION": return faPhone;
    case "ACCOUNT": return faFileInvoice;
    case "EMAIL": return faEnvelope;
    case "EVENT": return faCalendarAlt;
    case "ALERT":
    case "HIGH_RISK": return faExclamationTriangle;
    default: return faQuestionCircle;
  }
};

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
  id,
  secondaryEntities,
  avatar,
  isModalOpen = false
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
  secondaryEntities?: any[];
  avatar?: string;
  isModalOpen?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isSuspicious = riskScore > 0.6 || type === "ALERT" || type === "HIGH_RISK";
  const baseSize = isSuspicious ? 1.15 : 0.75;
  const size = hovered ? baseSize * 1.25 : baseSize;

  useEffect(() => {
    if (isModalOpen) {
      setHovered(false);
    }
  }, [isModalOpen]);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.25;
    if (isSuspicious) {
      const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 3.5) * 0.06;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  useEffect(() => {
    document.body.style.cursor = hovered && !isModalOpen ? (isEditMode ? "grab" : "pointer") : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered, isEditMode, isModalOpen]);

  const opacity = dimmed ? 0.18 : 1;

  const nodeContent = (
    <group
      position={isEditMode ? undefined : position}
      onPointerOver={(e) => {
        if (isModalOpen) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        if (isModalOpen) return;
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        if (isModalOpen) return;
        e.stopPropagation();
        onClick?.();
      }}
    >
      <mesh ref={meshRef}>
        {type?.toUpperCase() === "PERSON" ? (
          <icosahedronGeometry args={[size * 1.2, 2]} />
        ) : type?.toUpperCase() === "ORGANIZATION" ? (
          <boxGeometry args={[size * 1.6, size * 1.6, size * 1.6]} />
        ) : type?.toUpperCase() === "LOCATION" ? (
          <octahedronGeometry args={[size * 1.4, 0]} />
        ) : type?.toUpperCase() === "PHONE" || type?.toUpperCase() === "PHONE_NUMBER" ? (
          <cylinderGeometry args={[size * 0.8, size * 0.8, size * 1.8, 16]} />
        ) : (
          <sphereGeometry args={[size, 24, 24]} />
        )}
        <meshStandardMaterial
          color={color}
          roughness={0.25}
          metalness={0.7}
          emissive={highlighted || isSuspicious ? color : "#000000"}
          emissiveIntensity={highlighted ? 0.85 : hovered ? 0.55 : isSuspicious ? 0.35 : 0.08}
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>

      {/* HTML Billboard for Icon / Avatar */}
      <Html center style={{ pointerEvents: 'none', zIndex: 0 }} zIndexRange={[0, 0]}>
        <div 
          className={`flex items-center justify-center rounded-full overflow-hidden transition-all duration-300 ${dimmed && !hovered ? 'opacity-20' : 'opacity-100'}`}
          style={{ 
            width: `${size * 32}px`, 
            height: `${size * 32}px`,
            backgroundColor: avatar ? 'transparent' : 'rgba(0,0,0,0.6)',
            border: highlighted ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {avatar && !imgError ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <FontAwesomeIcon icon={getIconForType(type)} className="text-white drop-shadow-md" style={{ fontSize: `${size * 14}px`, color: '#ffffff' }} />
          )}
        </div>
      </Html>

      {(isSuspicious || highlighted) && (
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[size * 1.8, 0.05, 16, 100]} />
          <meshBasicMaterial
            color={highlighted ? "#3b82f6" : "#ef4444"}
            transparent
            opacity={dimmed ? 0.1 : 0.6}
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
      
      {hovered && !isModalOpen && (
        <Html position={[0, baseSize + 1.2, 0]} center zIndexRange={[10, 5]} style={{ pointerEvents: 'none', zIndex: 10 }}>
          <div className="bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl p-4 min-w-[240px] text-left shadow-2xl backdrop-blur-md font-sans animate-fade-in pointer-events-none">
            <div className="flex justify-between items-start mb-2 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                {avatar && <img src={avatar} alt="avatar" className="w-8 h-8 rounded bg-zinc-900 object-cover" />}
                <div>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <FontAwesomeIcon icon={getIconForType(type)} /> {type}
                  </span>
                  <h4 className="text-sm font-bold text-white truncate max-w-[150px]">{name}</h4>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${isSuspicious ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                Risk: {riskScore.toFixed(2)}
              </span>
            </div>
            
            {secondaryEntities && secondaryEntities.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <h5 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Connected Information</h5>
                <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1 custom-scrollbar pointer-events-auto">
                  {secondaryEntities.map((ent: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[10px] p-1.5 rounded-md bg-white/[0.02]">
                      <span className="text-zinc-500 font-bold uppercase w-16 truncate flex items-center gap-1">
                        <FontAwesomeIcon icon={getIconForType(ent.type)} /> {ent.type}
                      </span>
                      <span className="text-zinc-300 font-mono truncate max-w-[100px]" title={ent.name}>{ent.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );

  if (isEditMode && !isModalOpen) {
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
  
  if (isEditMode && isModalOpen) {
    return (
      <group position={position}>
        {nodeContent}
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
  isModalOpen = false,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  label: string;
  highlighted: boolean;
  dimmed: boolean;
  onClick?: () => void;
  isModalOpen?: boolean;
}) {
  const midPoint = useMemo(
    () => new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5),
    [start, end]
  );
  
  const dir = useMemo(() => {
    const v = new THREE.Vector3().subVectors(end, start);
    return v.lengthSq() > 0 ? v.normalize() : new THREE.Vector3(1, 0, 0);
  }, [start, end]);

  const arrowPos = useMemo(() => {
    return new THREE.Vector3().copy(end).addScaledVector(dir, -1.35);
  }, [end, dir]);

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    q.setFromUnitVectors(up, dir);
    return q;
  }, [dir]);

  const color = highlighted ? "#60a5fa" : dimmed ? "#334155" : "#94a3b8";
  const opacity = highlighted ? 1 : dimmed ? 0.12 : 0.55;
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (onClick) {
      document.body.style.cursor = hovered && !isModalOpen ? "pointer" : "auto";
      return () => { document.body.style.cursor = "auto"; };
    }
  }, [hovered, onClick, isModalOpen]);

  return (
    <group 
      onPointerOver={(e) => { if(onClick && !isModalOpen) { e.stopPropagation(); setHovered(true); } }}
      onPointerOut={(e) => { if(onClick && !isModalOpen) { e.stopPropagation(); setHovered(false); } }}
      onClick={(e) => { if (onClick && !isModalOpen) { e.stopPropagation(); onClick(); } }}
    >
      <Line
        points={[start, end]}
        color={hovered ? "#ffffff" : color}
        lineWidth={highlighted ? 2.5 : 1.2}
        transparent
        opacity={opacity}
      />
      <mesh position={arrowPos} quaternion={quaternion}>
        <coneGeometry args={[0.2, 0.6, 8]} />
        <meshBasicMaterial color={hovered ? "#ffffff" : color} transparent opacity={opacity} />
      </mesh>
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
  draggedPositions = {},
  isModalOpen = false
}: {
  data: any;
  onNodeClick?: (node: any) => void;
  onEdgeClick?: (edge: any) => void;
  highlightedPath?: string[];
  isEditMode?: boolean;
  onNodeDragEnd?: (id: string, x: number, y: number, z: number) => void;
  draggedPositions?: Record<string, {x: number, y: number, z: number}>;
  isModalOpen?: boolean;
}) {
  const nodes = useMemo(() => {
    const rawNodes = data?.nodes || [];
    const rawLinks = data?.links || data?.edges || [];
    const primaryTypes = new Set(["person", "organization", "location", "vehicle"]);

    const primaryNodes: any[] = [];
    const secondaryNodes: any[] = [];

    for (const node of rawNodes) {
      const t = (node.type || "").toLowerCase();
      if (primaryTypes.has(t)) {
        primaryNodes.push(node);
      } else {
        secondaryNodes.push(node);
      }
    }

    const positions = fibonacciSphere(primaryNodes.length, 16);
    const finalNodes: any[] = [];
    const primaryMap = new Map<string, any>();

    for (let i = 0; i < primaryNodes.length; i++) {
      const node = primaryNodes[i];
      const idStr = String(node.id ?? node._id ?? i);
      let pos = positions[i] || [0,0,0];
      if (draggedPositions[idStr]) {
        pos = [draggedPositions[idStr].x, draggedPositions[idStr].y, draggedPositions[idStr].z];
      } else if (node.position && typeof node.position.x === 'number') {
        pos = [node.position.x, node.position.y, node.position.z];
      }
      const outNode = { ...node, id: idStr, position: pos };
      primaryMap.set(idStr, outNode);
      finalNodes.push(outNode);
    }

    const getConnectedPrimary = (nodeId: string) => {
      let bestPrimary = null;
      let maxScore = -1;
      for (const link of rawLinks) {
        const s = linkEndpointId(link.source);
        const t = linkEndpointId(link.target);
        let potentialPrimary = null;
        if (s === nodeId && primaryMap.has(t)) potentialPrimary = primaryMap.get(t);
        if (t === nodeId && primaryMap.has(s)) potentialPrimary = primaryMap.get(s);
        
        if (potentialPrimary) {
          const score = potentialPrimary.risk_score || 0;
          if (!bestPrimary || score > maxScore) {
            maxScore = score;
            bestPrimary = potentialPrimary;
          }
        }
      }
      return bestPrimary;
    };

    const secondaryOffsets = new Map<string, number>();

    for (let i = 0; i < secondaryNodes.length; i++) {
      const node = secondaryNodes[i];
      const idStr = String(node.id ?? node._id ?? (primaryNodes.length + i));
      let pos = [0, 0, 0];
      if (draggedPositions[idStr]) {
        pos = [draggedPositions[idStr].x, draggedPositions[idStr].y, draggedPositions[idStr].z];
      } else if (node.position && typeof node.position.x === 'number') {
        pos = [node.position.x, node.position.y, node.position.z];
      } else {
        const parentPrimary = getConnectedPrimary(idStr);
        if (parentPrimary) {
           parentPrimary.secondaryEntities = parentPrimary.secondaryEntities || [];
           parentPrimary.secondaryEntities.push(node);
        } else {
           // If unlinked, we can just hide it or still render it since there's no primary to attach to.
           // Hiding it by NOT pushing to finalNodes is safer to avoid clutter.
        }
      }
    }
    return finalNodes;
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
      <Canvas camera={{ position: [0, 4, 38], fov: 55, near: 0.1, far: 5000 }} gl={{ antialias: true, logarithmicDepthBuffer: true }}>
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
            isModalOpen={isModalOpen}
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
              secondaryEntities={node.secondaryEntities}
              avatar={node.properties?.avatar_url || node.properties?.avatar || node.avatar_url || node.avatar}
              isModalOpen={isModalOpen}
            />
          );
        })}

        <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxDistance={90} minDistance={8} enabled={!isModalOpen} />
      </Canvas>
    </div>
  );
}
