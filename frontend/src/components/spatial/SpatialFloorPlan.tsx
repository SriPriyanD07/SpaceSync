'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface SpatialNode {
  name: string;
  type: string;
  status: 'available' | 'occupied';
  x: number;
  z: number;
}

const NODES: SpatialNode[] = [
  { name: 'CONF_ALPHA', type: 'Conference (20)', status: 'available', x: -3.5, z: -2 },
  { name: 'ROOM_BETA', type: 'Meeting (6)', status: 'occupied', x: 2, z: -2.5 },
  { name: 'TRAIN_GAMMA', type: 'Classroom (35)', status: 'available', x: 4, z: 2 },
  { name: 'DEV_POD_01', type: 'AI Workstation', status: 'occupied', x: -2, z: 2 },
  { name: 'LAB_BENCH_01', type: 'Science Bench', status: 'available', x: -4.5, z: 1.5 },
];

export function SpatialFloorPlan() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<SpatialNode | null>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch (e) {
      setHasWebGL(false);
      return;
    }

    const width = currentMount.clientWidth || 800;
    const height = currentMount.clientHeight || 450;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b); // deep charcoal

    // 2. Camera: Isometric-like high angle perspective
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(12, 14, 14);
    camera.lookAt(0, 0, 0);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    currentMount.appendChild(renderer.domElement);

    // 4. Architectural Grid Floor
    const gridHelper = new THREE.GridHelper(16, 16, 0x27272a, 0x18181b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // 5. Lighting: Crisp architectural studio light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 6. Volumetric Spatial Rooms
    const group = new THREE.Group();
    scene.add(group);

    // Room Volumes creation helper
    const createVolume = (
      w: number,
      h: number,
      d: number,
      x: number,
      z: number,
      color: number,
      wireColor: number
    ) => {
      const geom = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.35,
        roughness: 0.2,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, h / 2, z);
      group.add(mesh);

      // Clean wireframe edges
      const edges = new THREE.EdgesGeometry(geom);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: wireColor, transparent: true, opacity: 0.6 })
      );
      line.position.copy(mesh.position);
      group.add(line);

      return mesh;
    };

    // Conference Room Alpha volume
    createVolume(4.5, 2.2, 3, -3, -1.8, 0x18181b, 0x52525b);

    // Meeting Room Beta volume
    createVolume(2.5, 1.8, 2.2, 2.2, -2, 0x27272a, 0x71717a);

    // Training Room Gamma volume
    createVolume(4.5, 2.6, 4, 3.5, 2.5, 0x18181b, 0x52525b);

    // Workstation Pods row
    createVolume(3.2, 0.8, 1.6, -2, 2.2, 0x27272a, 0x71717a);

    // Lab Bench volume
    createVolume(3.5, 1.2, 1.5, -4.5, 1.8, 0x18181b, 0x52525b);

    // 7. Status Indicator Beacons (Available = Emerald, Occupied = Rose)
    const beacons: THREE.Mesh[] = [];
    NODES.forEach((node) => {
      const beaconGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: node.status === 'available' ? 0x10b981 : 0xf43f5e,
      });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.set(node.x, 0.05, node.z);
      group.add(beacon);
      beacons.push(beacon);
    });

    // Mouse Interaction (Subtle smooth parallax damping)
    let targetRotY = 0;
    let targetRotX = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = currentMount.getBoundingClientRect();
      const x = (e.clientX - rect.left) / width - 0.5;
      const y = (e.clientY - rect.top) / height - 0.5;
      targetRotY = x * 0.4;
      targetRotX = y * 0.2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      time += 0.02;

      // Smooth camera damping
      group.rotation.y += (targetRotY - group.rotation.y) * 0.05;
      group.rotation.x += (targetRotX - group.rotation.x) * 0.05;

      // Subtle pulse on beacons
      beacons.forEach((b, i) => {
        b.scale.setScalar(1 + Math.sin(time * 2 + i) * 0.15);
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  if (!hasWebGL) {
    // Elegant Architectural 2D Fallback
    return (
      <div className="w-full h-full bg-charcoal-900 border border-charcoal-800 rounded-none p-8 flex flex-col justify-between font-mono text-xs text-charcoal-400">
        <div className="flex justify-between items-start border-b border-charcoal-800 pb-4">
          <div>
            <span className="text-white font-bold tracking-widest uppercase">SPATIAL FLOOR-PLAN // 2D SCHEMATIC</span>
            <div className="text-[10px] text-charcoal-500 mt-1">BUILDING 01 • SHARED RESOURCE TOPOLOGY</div>
          </div>
          <span className="text-emerald-400">STATUS: NORMAL</span>
        </div>

        <div className="grid grid-cols-3 gap-4 my-8">
          <div className="p-4 border border-charcoal-700 bg-charcoal-800/40">
            <div className="text-white font-bold">CONF_ALPHA</div>
            <div className="text-[10px] text-charcoal-500">CAP: 20 • 4K AV</div>
            <div className="mt-2 text-emerald-400 text-[10px]">● AVAILABLE</div>
          </div>
          <div className="p-4 border border-charcoal-700 bg-charcoal-800/40">
            <div className="text-white font-bold">ROOM_BETA</div>
            <div className="text-[10px] text-charcoal-500">CAP: 6 • WHITEBOARD</div>
            <div className="mt-2 text-rose-400 text-[10px]">● OCCUPIED</div>
          </div>
          <div className="p-4 border border-charcoal-700 bg-charcoal-800/40">
            <div className="text-white font-bold">TRAIN_GAMMA</div>
            <div className="text-[10px] text-charcoal-500">CAP: 35 • DUAL PROJ</div>
            <div className="mt-2 text-emerald-400 text-[10px]">● AVAILABLE</div>
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-charcoal-500 border-t border-charcoal-800 pt-3">
          <span>COORDINATES: 40.7128° N, 74.0060° W</span>
          <span>POSTGRESQL RANGE EXCLUSION ACTIVE</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[380px] sm:h-[460px] bg-charcoal-900 border border-charcoal-800 overflow-hidden select-none">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Architectural Overlay Information */}
      <div className="absolute top-4 left-4 pointer-events-none font-mono text-[10px] tracking-widest text-charcoal-400 space-y-1">
        <div className="text-white font-bold">SPACESYNC // SPATIAL ENGINE</div>
        <div>FLOOR 03 • 7 MANAGED ZONES</div>
      </div>

      <div className="absolute top-4 right-4 pointer-events-none font-mono text-[10px] tracking-widest flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> VACANT
        </span>
        <span className="flex items-center gap-1.5 text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> IN SESSION
        </span>
      </div>

      <div className="absolute bottom-4 left-4 pointer-events-none font-mono text-[10px] text-charcoal-500">
        INTERACTIVE TOPOLOGY • MOVE CURSOR TO PERSPECTIVE SHIFT
      </div>

      <div className="absolute bottom-4 right-4 pointer-events-none font-mono text-[10px] text-charcoal-500">
        EXCLUDE USING GIST (TS_RANGE)
      </div>
    </div>
  );
}
