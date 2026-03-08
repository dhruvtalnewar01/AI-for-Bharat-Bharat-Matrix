"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

// ── 3D Abstract Node Network ───────────────────────────────────────────
function MatrixNodes() {
    const groupRef = useRef<THREE.Group>(null!);

    const NODE_COUNT = 300;
    const RADIUS = 8;
    const CONNECTION_DIST = 2.5;

    const { positions, linePositions } = useMemo(() => {
        const pos = new Float32Array(NODE_COUNT * 3);
        for (let i = 0; i < NODE_COUNT * 3; i++) {
            pos[i] = (Math.random() - 0.5) * RADIUS * 2;
        }

        const lines: number[] = [];
        for (let i = 0; i < NODE_COUNT; i++) {
            for (let j = i + 1; j < NODE_COUNT; j++) {
                const dx = pos[i * 3] - pos[j * 3];
                const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
                const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < CONNECTION_DIST) {
                    lines.push(
                        pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2],
                        pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]
                    );
                }
            }
        }
        return {
            positions: pos,
            linePositions: new Float32Array(lines),
        };
    }, []);

    // Create geometries imperatively to avoid the args TS error
    const pointsGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        return geo;
    }, [positions]);

    const linesGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
        return geo;
    }, [linePositions]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (groupRef.current) {
            groupRef.current.rotation.y = t * 0.05;
            groupRef.current.rotation.x = t * 0.02;
        }
    });

    return (
        <group ref={groupRef}>
            <points geometry={pointsGeo}>
                <pointsMaterial size={0.08} color="#C2AE6D" transparent opacity={0.6} sizeAttenuation />
            </points>
            <lineSegments geometry={linesGeo}>
                <lineBasicMaterial color="#C2AE6D" transparent opacity={0.15} />
            </lineSegments>
        </group>
    );
}

// ── Hero Component ─────────────────────────────────────────────────────
export default function Hero3D() {
    return (
        <section className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-[var(--deep-burgundy)]">
            {/* 3D Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 15], fov: 45 }} dpr={[1, 2]}>
                    <ambientLight intensity={0.5} />
                    <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.5}>
                        <MatrixNodes />
                    </Float>
                </Canvas>
            </div>

            {/* Vignette */}
            <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle,transparent_20%,#1A000A_120%)]" />

            {/* Typography */}
            <div className="relative z-20 container mx-auto px-6 flex flex-col items-center text-center">
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    className="text-[var(--soft-gold)] tracking-[8px] uppercase text-xs md:text-sm font-medium mb-6"
                >
                    Proprietary Cognitive Visual Engine
                </motion.p>

                <motion.h1
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 2, delay: 1, ease: "easeInOut" }}
                    className="font-serif-display text-5xl md:text-7xl lg:text-8xl xl:text-9xl text-[var(--pale-pink)] leading-[1.1] max-w-5xl"
                >
                    The First <span className="italic text-[var(--soft-gold)]">Agentic</span> Interface for India.
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2, delay: 2.5 }}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                >
                    <span className="text-[10px] text-[var(--charcoal)] tracking-[4px] uppercase">Scroll to Initiate</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-[var(--charcoal)] to-transparent" />
                </motion.div>
            </div>
        </section>
    );
}
