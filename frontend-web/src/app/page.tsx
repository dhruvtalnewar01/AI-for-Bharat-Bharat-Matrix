"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect, useState } from "react";
import Header from "@/components/Header";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const HeroCanvas = dynamic(() => import("@/components/HeroCanvas"), { ssr: false });
const VoiceWidget = dynamic(() => import("@/components/VoiceWidget"), { ssr: false });

const features = [
  { title: "Sub-second Routing", desc: "Intent capture, transcription, and workflow routing complete in < 980ms.", colSpan: "md:col-span-2" },
  { title: "Zero-API Execution", desc: "Proprietary vision layer navigates state DOMs directly.", colSpan: "md:col-span-1" },
  { title: "Privacy-First Layer", desc: "Military-grade PII redaction mid-stream. Zero DB retention.", colSpan: "md:col-span-1" },
  { title: "Self-Healing OCR", desc: "DOM element mapping automatically re-locates via snapshot analysis.", colSpan: "md:col-span-2" },
];

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useGSAP(() => {
    if (!mounted) return;

    // Hero Entrance Timeline
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.fromTo(".hero-subtitle",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1.5 },
      "+=0.3"
    )
      .fromTo(".hero-title",
        { opacity: 0, filter: "blur(10px)", scale: 0.95 },
        { opacity: 1, filter: "blur(0px)", scale: 1, duration: 1.8 },
        "-=1"
      )
      .fromTo(".hero-scroll-indicator",
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 1 },
        "+=0.5"
      );

    // Parallax Floating Background
    gsap.to(".parallax-bg", {
      y: "-=30",
      yoyo: true,
      repeat: -1,
      duration: 4,
      ease: "sine.inOut"
    });

    // Force ScrollTrigger refresh after 3D/Canvas and fonts paint
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

  }, { scope: containerRef, dependencies: [mounted] });

  return (
    <div ref={containerRef} className="relative bg-[var(--bordeaux)] text-[var(--pastel-beige)] w-full min-h-screen selection:bg-[var(--ceramic-yellow)] selection:text-[var(--bordeaux)]">
      <Header />

      {/* ── HERO ────────────────────────────────────── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-80"><HeroCanvas /></div>
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0%,var(--bordeaux)_110%)] pointer-events-none" />

        <div className="relative z-20 text-center px-6 max-w-7xl mx-auto w-full">
          <p className="hero-subtitle text-[var(--ceramic-yellow)] tracking-[6px] uppercase text-xs mb-6">
            Proprietary Cognitive Visual Engine
          </p>
          <h1 className="hero-title font-display text-5xl md:text-[6.5rem] lg:text-[8rem] leading-[1.05] mx-auto">
            The First <span className="italic text-gold-gradient">Agentic</span><br />Interface for India.
          </h1>
          <div className="hero-scroll-indicator absolute -bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
            <span className="text-[9px] text-[var(--pastel-beige)]/40 tracking-[5px] uppercase font-mono">Initiate</span>
            <div className="w-px h-16 bg-gradient-to-b from-[var(--pastel-beige)]/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── AMBIENT FLOATING BG ─────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="parallax-bg absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-[var(--mahogany)] mix-blend-screen opacity-30 blur-[120px]" />
        <div className="parallax-bg absolute bottom-[10%] left-[5%] w-[40vw] h-[40vw] rounded-full bg-[var(--ceramic-yellow)] mix-blend-screen opacity-10 blur-[150px]" />
      </div>

      {/* ── PROFESSIONAL FOOTER ─────────────────────── */}
      <footer className="relative z-10 border-t border-[var(--ceramic-yellow)]/20 pt-16 pb-12 px-6 mt-20">
        <div className="max-w-7xl mx-auto w-full flex flex-col items-center">
          <div className="mb-12">
            <span className="font-display text-2xl tracking-widest text-gold-gradient uppercase">Bharat MatrixAI</span>
          </div>

          <ul className="flex flex-wrap justify-center gap-8 md:gap-16 mb-16 text-xs uppercase tracking-[3px] font-mono text-[var(--pastel-beige)]/60">
            <li><a href="/workflow" className="hover:text-[var(--ceramic-yellow)] transition-colors">System Workflow</a></li>
            <li><a href="#" className="hover:text-[var(--ceramic-yellow)] transition-colors">Ethics Directive</a></li>
            <li><a href="/contact" className="hover:text-[var(--ceramic-yellow)] transition-colors">Engineering Contact</a></li>
          </ul>

          <p className="text-[9px] text-[var(--pastel-beige)]/30 tracking-[2px] uppercase font-mono text-center">
            &copy; {new Date().getFullYear()} All R&amp;D Proprietary. Built for the citizens. Confidential Framework.
          </p>
        </div>
      </footer>

      <VoiceWidget />

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInBlur { from { opacity: 0; filter: blur(10px); } to { opacity: 1; filter: blur(0px); } }
      `}} />
    </div>
  );
}
