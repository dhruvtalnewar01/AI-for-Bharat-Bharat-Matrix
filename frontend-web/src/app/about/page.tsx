"use client";

import { motion } from "framer-motion";
import Header from "@/components/Header";
import dynamic from "next/dynamic";

const VoiceWidget = dynamic(() => import("@/components/VoiceWidget"), { ssr: false });

const pillars = [
    { title: "Autonomous Navigation", text: "We see the screen as a human does. Our cognitive engine operates government portals through visual reasoning, not brittle API calls." },
    { title: "Vernacular-First Design", text: "Built for the 500 million Indians who think in Hindi, Marathi, Tamil, and Bengali. Every interaction begins and ends in the mother tongue." },
    { title: "Privacy by Architecture", text: "PII is redacted at the middleware layer in real-time. No Aadhaar number, PAN, or phone number is ever stored or logged." },
];

export default function AboutPage() {
    return (
        <>
            <Header />

            <section className="min-h-screen flex items-center justify-center pt-24 pb-32 px-6 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,0,42,0.12),transparent_60%)]" />

                <div className="relative z-10 max-w-5xl mx-auto text-center">
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                        className="text-[var(--gold)] tracking-[6px] uppercase text-xs mb-8">About the Mission</motion.p>

                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.5, delay: 0.6 }}
                        className="font-display text-5xl md:text-7xl lg:text-8xl leading-[1.1] mb-8">
                        We don&apos;t build <span className="italic text-gold-gradient">interfaces</span>. <br />We eliminate them.
                    </motion.h1>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                        className="text-white/35 text-lg max-w-2xl mx-auto leading-relaxed">
                        Bharat MatrixAI is a proprietary Cognitive Visual Engine that converts natural speech into autonomous system execution across Indian government infrastructure.
                    </motion.p>
                </div>
            </section>

            {/* ── PILLARS ──────────────────────────────── */}
            <section className="pb-32 px-6">
                <div className="container mx-auto max-w-5xl space-y-8">
                    {pillars.map((p, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            transition={{ delay: i * 0.12 }}
                            whileHover={{ scale: 1.05, y: -10, boxShadow: "0 25px 50px rgba(212,175,55,0.2)" }}
                            whileTap={{ scale: 0.98 }}
                            className="glass rounded-2xl p-10 md:p-14 group border border-transparent hover:border-[var(--gold)]/40 transition-colors duration-500 cursor-pointer text-left">
                            <div className="flex items-start gap-6">
                                <span className="text-[var(--gold)] font-mono text-sm mt-1 opacity-50 group-hover:opacity-100 transition-opacity">0{i + 1}</span>
                                <div>
                                    <h3 className="font-display text-3xl mb-4 group-hover:text-[var(--gold)] transition-colors">{p.title}</h3>
                                    <p className="text-white/35 leading-relaxed max-w-2xl group-hover:text-white/60 transition-colors">{p.text}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            <footer className="border-t border-white/5 py-12 px-6 text-center">
                <p className="text-[10px] text-white/20 tracking-[2px] uppercase font-mono">&copy; {new Date().getFullYear()} Bharat MatrixAI. All R&amp;D Proprietary.</p>
            </footer>

            <VoiceWidget />
        </>
    );
}
