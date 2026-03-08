"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

function Particles() {
    const ref = useRef<THREE.Points>(null!);
    const COUNT = 800;

    const geo = useMemo(() => {
        const g = new THREE.BufferGeometry();
        const pos = new Float32Array(COUNT * 3);
        for (let i = 0; i < COUNT * 3; i++) pos[i] = (Math.random() - 0.5) * 16;
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        return g;
    }, []);

    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.y = state.clock.elapsedTime * 0.03;
        ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.02) * 0.1;
    });

    return (
        <Float speed={0.3} floatIntensity={0.4}>
            <points ref={ref} geometry={geo}>
                <pointsMaterial size={0.06} color="#D4AF37" transparent opacity={0.5} sizeAttenuation />
            </points>
        </Float>
    );
}

export default function HeroCanvas() {
    return (
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }} dpr={[1, 2]} className="!absolute inset-0">
            <ambientLight intensity={0.3} />
            <Particles />
        </Canvas>
    );
}
