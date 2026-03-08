"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import * as THREE from "three";

// ── Particle Globe: 2000+ instanced particles forming a rotating sphere ──
function ParticleField() {
    const meshRef = useRef<THREE.InstancedMesh>(null!);
    const tempObj = useMemo(() => new THREE.Object3D(), []);

    const PARTICLE_COUNT = 2200;
    const GLOBE_RADIUS = 2.8;

    // Generate particle positions on a sphere using fibonacci spiral
    const positions = useMemo(() => {
        const pts: { x: number; y: number; z: number; scale: number }[] = [];
        const goldenRatio = (1 + Math.sqrt(5)) / 2;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const theta = (2 * Math.PI * i) / goldenRatio;
            const phi = Math.acos(1 - (2 * (i + 0.5)) / PARTICLE_COUNT);
            const r = GLOBE_RADIUS * (0.95 + Math.random() * 0.1);

            pts.push({
                x: r * Math.sin(phi) * Math.cos(theta),
                y: r * Math.sin(phi) * Math.sin(theta),
                z: r * Math.cos(phi),
                scale: 0.3 + Math.random() * 0.7,
            });
        }
        return pts;
    }, []);

    // Animate: slow rotation + subtle breathing
    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;

        meshRef.current.rotation.y = t * 0.05;
        meshRef.current.rotation.x = Math.sin(t * 0.03) * 0.1;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p = positions[i];
            const breathe = 1 + Math.sin(t * 0.5 + i * 0.01) * 0.03;

            tempObj.position.set(p.x * breathe, p.y * breathe, p.z * breathe);
            tempObj.scale.setScalar(p.scale * (0.008 + Math.sin(t + i) * 0.003));
            tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObj.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial
                color="#F8D794"
                transparent
                opacity={0.75}
                toneMapped={false}
            />
        </instancedMesh>
    );
}

// ── Main Canvas Export ──
export default function ParticleGlobe() {
    return (
        <div className="absolute inset-0 z-0">
            <Canvas
                camera={{ position: [0, 0, 7], fov: 50 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: "transparent" }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} intensity={0.5} color="#F8D794" />

                <Float speed={0.4} rotationIntensity={0.15} floatIntensity={0.3}>
                    <ParticleField />
                </Float>

                <Stars
                    radius={50}
                    depth={80}
                    count={1500}
                    factor={3}
                    saturation={0}
                    fade
                    speed={0.3}
                />
            </Canvas>
        </div>
    );
}
