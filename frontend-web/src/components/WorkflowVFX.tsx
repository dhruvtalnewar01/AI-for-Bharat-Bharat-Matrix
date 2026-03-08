"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

export default function WorkflowVFX() {
    const containerRef = useRef<HTMLDivElement>(null);
    const leftWaveRef = useRef<HTMLDivElement>(null);
    const rightHUDRef = useRef<HTMLDivElement>(null);
    const portalScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !leftWaveRef.current || !rightHUDRef.current || !portalScrollRef.current) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "+=2000",
                    pin: true,
                    scrub: 1,
                    anticipatePin: 1,
                },
            });

            tl.fromTo(leftWaveRef.current!, { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 2 }, 0);
            tl.fromTo(rightHUDRef.current!, { opacity: 0, y: 100 }, { opacity: 1, y: 0, duration: 2 }, 0);

            const waveBars = leftWaveRef.current!.querySelectorAll(".wave-bar");
            tl.to(waveBars, {
                scaleY: () => 1 + Math.random() * 2,
                stagger: 0.1,
                duration: 4,
                ease: "sine.inOut",
            }, 2);

            tl.to(portalScrollRef.current!, {
                y: "-50%",
                duration: 8,
                ease: "power1.inOut",
            }, 2);
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={containerRef} className="relative w-full h-screen bg-[var(--deep-burgundy)] overflow-hidden flex items-center pt-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(194,174,109,0.05),transparent_50%)] pointer-events-none" />

            <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 h-[80vh]">

                {/* LEFT: Abstract Voice Wave */}
                <div className="flex flex-col justify-center h-full">
                    <h2 className="font-serif-display text-4xl md:text-6xl text-[var(--pale-pink)] mb-6 whitespace-nowrap">
                        System Workflow
                    </h2>
                    <p className="text-[var(--text-muted)] max-w-md text-lg leading-relaxed mb-12">
                        Our proprietary Cognitive Visual Engine transcribes vernacular intent into deterministic system actions instantly. No APIs. Strictly visual reasoning.
                    </p>

                    {/* Morphing Waveform */}
                    <div ref={leftWaveRef} className="flex items-end gap-2 h-32 opacity-0">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className="wave-bar w-2 bg-gradient-to-t from-[var(--soft-gold)] to-[#EFEACD] rounded-full shadow-[0_0_15px_rgba(194,174,109,0.3)]"
                                style={{ height: `${20 + Math.random() * 80}%` }}
                            />
                        ))}
                    </div>

                    <div className="mt-8 text-xs text-[var(--soft-gold)] tracking-[4px] uppercase opacity-70">
                        Acoustic Ingestion Phase
                    </div>
                </div>

                {/* RIGHT: Dynamic 3D HUD Navigating Portal */}
                <div className="relative flex items-center justify-center h-full">
                    <div
                        ref={rightHUDRef}
                        className="relative w-full max-w-lg aspect-[4/5] glass-panel border border-[var(--soft-gold)]/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden opacity-0"
                    >
                        {/* HUD Header */}
                        <div className="absolute top-0 left-0 right-0 h-10 border-b border-[var(--soft-gold)]/10 bg-black/40 backdrop-blur-md flex items-center px-4 z-20">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                            </div>
                            <span className="mx-auto text-[10px] text-[var(--soft-gold)] tracking-[3px] uppercase font-mono">Cognitive Execution</span>
                        </div>

                        {/* Simulated Portal Content */}
                        <div className="absolute top-10 left-0 right-0 bottom-0 overflow-hidden bg-white/5">
                            <div ref={portalScrollRef} className="p-6 pb-[200%]">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="mb-6 blur-[2px]">
                                        <div className="w-1/3 h-4 bg-[var(--charcoal)]/40 rounded mb-3" />
                                        <div className="w-full h-24 bg-[var(--charcoal)]/20 rounded border border-[var(--soft-gold)]/10" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Execution HUD Overlay */}
                        <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-xl border border-[var(--soft-gold)]/30 rounded-lg p-6 z-30 shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-3 h-3 rounded-full bg-[var(--soft-gold)] animate-pulse" />
                                <span className="text-[10px] text-[var(--pale-pink)] tracking-[2px] uppercase">Reasoning Active</span>
                            </div>
                            <div className="space-y-2 font-mono text-[11px] text-[var(--soft-gold)]/80">
                                <p>[ENG] Synthesizing DOM...</p>
                                <p>[ENG] Locating target coordinates...</p>
                                <p>[ENG] Extracting table row data...</p>
                                <p className="text-[var(--pale-pink)] mt-2">» Target acquired. Generating response.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
