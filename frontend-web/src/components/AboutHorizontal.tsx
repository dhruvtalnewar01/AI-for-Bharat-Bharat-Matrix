"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

export default function AboutHorizontal() {
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !wrapperRef.current) return;

        const ctx = gsap.context(() => {
            const panels = gsap.utils.toArray<HTMLElement>(".about-panel");

            gsap.to(panels, {
                xPercent: -100 * (panels.length - 1),
                ease: "none",
                scrollTrigger: {
                    trigger: containerRef.current,
                    pin: true,
                    scrub: 1,
                    snap: 1 / (panels.length - 1),
                    end: () => "+=" + (wrapperRef.current?.offsetWidth || 3000),
                },
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    const stats = [
        { num: "500M+", text: "Interface-poor Indians onboarded." },
        { num: "3.2s", text: "Average vernacular cognitive reasoning speed." },
        { num: "0", text: "APIs required for legacy systems." },
    ];

    return (
        <section ref={containerRef} className="h-screen bg-[#3A001F] overflow-hidden flex relative">
            <div className="absolute top-12 left-12 z-10 text-[10px] text-[var(--soft-gold)] tracking-[4px] uppercase mix-blend-screen">
                Mission Parameters
            </div>

            <div ref={wrapperRef} className="flex w-[300vw] h-full">
                {/* Panel 1: The Core Problem */}
                <div className="about-panel w-screen h-full flex flex-col justify-center px-12 lg:px-32 relative">
                    <h2 className="font-serif-display text-5xl lg:text-8xl text-[var(--pale-pink)] leading-tight max-w-4xl">
                        The digital divide isn&apos;t about access. <br />
                        <span className="italic text-[var(--soft-gold)] text-4xl lg:text-7xl">It&apos;s about the interface.</span>
                    </h2>
                </div>

                {/* Panel 2: Stats Cards */}
                <div className="about-panel w-screen h-full flex items-center justify-center gap-12 px-12">
                    {stats.map((stat, i) => (
                        <div
                            key={i}
                            className="group glass-panel w-80 h-96 p-10 flex flex-col justify-between cursor-pointer transition-transform duration-500 hover:scale-105 hover:-translate-y-4 hover:shadow-[0_20px_40px_rgba(194,174,109,0.15)]"
                        >
                            <div className="text-[var(--text-muted)] text-sm tracking-[2px] uppercase">Metric 0{i + 1}</div>
                            <div>
                                <div className="font-serif-display text-6xl text-[var(--soft-gold)] mb-4">{stat.num}</div>
                                <p className="text-[var(--pale-pink)] text-lg leading-relaxed">{stat.text}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Panel 3: Closing thesis */}
                <div className="about-panel w-screen h-full flex flex-col justify-center items-center text-center px-12 relative bg-[var(--deep-burgundy)]">
                    <h3 className="font-serif-display text-4xl lg:text-6xl text-[var(--pale-pink)] max-w-3xl mb-8">
                        We circumvent the GUI paradigm entirely.
                    </h3>
                    <p className="text-[var(--text-muted)] text-xl max-w-2xl mx-auto leading-relaxed">
                        By synthesizing a proprietary cognitive visual engine, we turn human voice into autonomous system execution. No structural backend changes required.
                    </p>
                </div>
            </div>
        </section>
    );
}
