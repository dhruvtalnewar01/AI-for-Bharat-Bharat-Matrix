"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";

const NAV_LINKS = [
    { href: "/", label: "Home" },
    { href: "/workflow", label: "System Workflow" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
];

export default function Header() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-[10000] px-8 md:px-12 py-5 flex items-center justify-between mix-blend-difference">
                <Link href="/" className="font-display text-2xl tracking-wide text-white font-bold z-[10010]">
                    Bharat MatrixAI
                </Link>

                {/* God-level interactive button */}
                <motion.button
                    onClick={() => setOpen(!open)}
                    whileHover={{ scale: 1.15, rotate: 90, boxShadow: "0 0 25px rgba(212,175,55,0.4)" }}
                    whileTap={{ scale: 0.8, rotate: -15 }}
                    className="relative z-[10010] w-12 h-12 flex items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-md transition-colors hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/10"
                >
                    {open ? <X className="w-5 h-5 text-[var(--gold)]" /> : <Menu className="w-5 h-5 text-white" />}
                </motion.button>
            </header>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ clipPath: "circle(0% at calc(100% - 48px) 36px)" }}
                        animate={{ clipPath: "circle(150% at calc(100% - 48px) 36px)" }}
                        exit={{ clipPath: "circle(0% at calc(100% - 48px) 36px)" }}
                        transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
                        className="fixed inset-0 z-[9999] bg-[var(--obsidian)] w-full h-full flex items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.1),transparent_60%)] pointer-events-none" />

                        <nav className="flex flex-col gap-8 md:gap-12 text-center">
                            {NAV_LINKS.map((link, i) => (
                                <motion.div
                                    key={link.href}
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: [0.33, 1, 0.68, 1] }}
                                >
                                    <Link href={link.href} onClick={() => setOpen(false)}>
                                        {/* Magnetic text glow hover effect */}
                                        <motion.div
                                            whileHover={{ scale: 1.05, textShadow: "0 0 30px rgba(212,175,55,0.8)" }}
                                            whileTap={{ scale: 0.95 }}
                                            className="font-display inline-block text-5xl md:text-7xl lg:text-8xl tracking-tight text-white/90 hover:text-[var(--gold)] transition-colors duration-300"
                                        >
                                            {link.label}
                                        </motion.div>
                                    </Link>
                                </motion.div>
                            ))}
                        </nav>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 0.8 }}
                            className="absolute bottom-10 left-10 right-10 flex justify-between text-[10px] text-[var(--gold)]/40 tracking-[4px] uppercase font-mono pointer-events-none"
                        >
                            <span>Cognitive Engine v0.9</span>
                            <span>Restricted</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
