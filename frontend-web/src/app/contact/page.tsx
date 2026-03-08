"use client";

import { useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Header from "@/components/Header";
import dynamic from "next/dynamic";

const VoiceWidget = dynamic(() => import("@/components/VoiceWidget"), { ssr: false });

function WireframeGlobe() {
    const ref = useRef<THREE.Mesh>(null!);
    const geo = useMemo(() => new THREE.IcosahedronGeometry(3, 2), []);

    useFrame((state) => {
        if (!ref.current) return;
        ref.current.rotation.y = state.clock.elapsedTime * 0.08;
        ref.current.rotation.x = state.clock.elapsedTime * 0.03;
    });

    return (
        <mesh ref={ref} geometry={geo}>
            <meshBasicMaterial color="#D4AF37" wireframe transparent opacity={0.15} />
        </mesh>
    );
}

export default function ContactPage() {
    return (
        <>
            <Header />

            <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-24 pb-32 px-6">
                {/* 3D Globe Background */}
                <div className="absolute inset-0 z-0 opacity-60">
                    <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 2]}>
                        <ambientLight intensity={0.3} />
                        <WireframeGlobe />
                    </Canvas>
                </div>

                <div className="absolute inset-0 z-5 bg-[radial-gradient(circle,transparent_30%,#050505_100%)]" />

                <div className="relative z-10 w-full max-w-lg mx-auto">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }}
                        className="text-center mb-12">
                        <p className="text-[var(--gold)] tracking-[6px] uppercase text-xs mb-4">Initialize</p>
                        <h1 className="font-display text-5xl md:text-6xl">Contact <span className="italic text-gold-gradient">Protocol</span></h1>
                    </motion.div>

                    <motion.form initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.8 }}
                        className="glass-strong rounded-2xl p-8 md:p-10 space-y-6"
                        onSubmit={(e) => e.preventDefault()}>
                        <div>
                            <label className="text-[10px] text-[var(--gold)] tracking-[2px] uppercase font-mono block mb-2">Identifier</label>
                            <input type="text" placeholder="Your name"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--gold)]/30 transition-colors" />
                        </div>
                        <div>
                            <label className="text-[10px] text-[var(--gold)] tracking-[2px] uppercase font-mono block mb-2">Communication Channel</label>
                            <input type="email" placeholder="your@email.com"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--gold)]/30 transition-colors" />
                        </div>
                        <div>
                            <label className="text-[10px] text-[var(--gold)] tracking-[2px] uppercase font-mono block mb-2">Transmission</label>
                            <textarea rows={4} placeholder="Your inquiry..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[var(--gold)]/30 transition-colors resize-none" />
                        </div>
                        <motion.button type="submit"
                            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(212,175,55,0.7)" }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full bg-[var(--gold)] text-[var(--obsidian)] font-display text-lg py-3 rounded-lg overflow-hidden group border border-transparent hover:border-white transition-colors">
                            <span className="relative z-10 block transition-transform duration-300 group-hover:scale-110">Transmit</span>
                        </motion.button>
                    </motion.form>
                </div>
            </section>

            <VoiceWidget />
        </>
    );
}
