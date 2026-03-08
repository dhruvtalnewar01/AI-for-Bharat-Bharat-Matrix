"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Header from "@/components/Header";
import dynamic from "next/dynamic";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const VoiceWidget = dynamic(() => import("@/components/VoiceWidget"), { ssr: false });

export default function WorkflowPage() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const waveRef = useRef<HTMLDivElement>(null);
    const portalRef = useRef<HTMLDivElement>(null);
    const portalContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sectionRef.current) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: "top top",
                    end: "+=2500",
                    pin: true,
                    scrub: 1,
                },
            });

            tl.fromTo(".wf-wave-bar", { scaleY: 0.2 }, { scaleY: () => 0.3 + Math.random() * 0.7, stagger: 0.08, duration: 4, ease: "sine.inOut" }, 0);
            tl.fromTo(portalRef.current!, { opacity: 0, y: 60, rotateX: 8 }, { opacity: 1, y: 0, rotateX: 0, duration: 3 }, 0);

            if (portalContentRef.current) {
                tl.to(portalContentRef.current, { y: "-60%", duration: 8, ease: "power1.inOut" }, 2);
            }

            tl.to(".wf-status", { opacity: 1, y: 0, stagger: 0.5, duration: 1 }, 4);
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <>
            <Header />

            {/* Spacer for header */}
            <div className="h-screen flex items-center justify-center">
                <div className="text-center px-6">
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                        className="text-[var(--gold)] tracking-[6px] uppercase text-xs mb-4">How It Works</motion.p>
                    <motion.h1 initial={{ opacity: 0, filter: "blur(6px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ duration: 1.5, delay: 0.6 }}
                        className="font-display text-5xl md:text-7xl max-w-4xl mx-auto">
                        Voice In. <span className="italic text-gold-gradient">Intelligence</span> Out.
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
                        className="mt-6 text-white/30 text-sm tracking-[3px] uppercase">Scroll to experience the pipeline</motion.p>
                </div>
            </div>

            {/* ── PINNED SPLIT-SCREEN ───────────────────── */}
            <section ref={sectionRef} className="h-screen flex items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(212,175,55,0.04),transparent_40%)]" />

                <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center h-[80vh]">
                    {/* LEFT: Audio Wave */}
                    <div className="flex flex-col justify-center">
                        <h2 className="font-display text-4xl md:text-5xl mb-4">Acoustic <span className="italic text-gold-gradient">Ingestion</span></h2>
                        <p className="text-white/30 text-sm max-w-md mb-10 leading-relaxed">
                            Our proprietary engine captures vernacular speech, routes it through cognitive reasoning, and synthesizes deterministic system actions.
                        </p>
                        <div ref={waveRef} className="flex items-end gap-1.5 h-28">
                            {[...Array(16)].map((_, i) => (
                                <div key={i} className="wf-wave-bar w-2 rounded-full bg-gradient-to-t from-[var(--gold)] to-[#F5E6A3] shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                                    style={{ height: `${15 + Math.random() * 85}%`, transformOrigin: "bottom" }} />
                            ))}
                        </div>
                        <p className="mt-6 text-[10px] text-[var(--gold)] tracking-[3px] uppercase font-mono opacity-70">Acoustic Sensor Active</p>
                    </div>

                    {/* RIGHT: Self-Navigating Browser HUD */}
                    <div className="flex items-center justify-center" style={{ perspective: "1000px" }}>
                        <div ref={portalRef} className="relative w-full max-w-md aspect-[4/5] glass-strong rounded-xl overflow-hidden opacity-0 shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                            style={{ transform: "rotateY(-3deg)" }}>
                            {/* Chrome */}
                            <div className="h-9 border-b border-white/5 bg-black/50 flex items-center px-4 z-20 relative">
                                <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500/60" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                                    <div className="w-2 h-2 rounded-full bg-green-500/60" />
                                </div>
                                <span className="mx-auto text-[9px] text-[var(--gold)] tracking-[2px] uppercase font-mono">Cognitive Execution</span>
                            </div>

                            {/* Scrolling Portal */}
                            <div className="absolute top-9 inset-x-0 bottom-0 overflow-hidden">
                                <div ref={portalContentRef} className="p-5 pb-[300%]">
                                    {[...Array(10)].map((_, i) => (
                                        <div key={i} className="mb-5 blur-[1.5px] opacity-60">
                                            <div className="w-1/3 h-3 bg-white/10 rounded mb-2" />
                                            <div className="w-full h-20 bg-white/5 rounded border border-white/5" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reasoning Overlay */}
                            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-2xl border border-[var(--gold)]/20 rounded-lg p-5 z-30 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--gold)] animate-pulse" />
                                    <span className="text-[9px] text-white/60 tracking-[2px] uppercase font-mono">Reasoning</span>
                                </div>
                                <div className="space-y-2 font-mono text-[10px]">
                                    <p className="wf-status opacity-0 translate-y-2 text-[var(--gold)]/60">[SYS] DOM synthesis...</p>
                                    <p className="wf-status opacity-0 translate-y-2 text-[var(--gold)]/60">[SYS] Координат захвачены...</p>
                                    <p className="wf-status opacity-0 translate-y-2 text-[var(--gold)]/60">[SYS] Data extraction...</p>
                                    <p className="wf-status opacity-0 translate-y-2 text-white/80">» Response synthesized.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="h-[50vh]" />
            <VoiceWidget />
        </>
    );
}
