"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CursorGlow() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [clicks, setClicks] = useState<{ id: number; x: number; y: number }[]>([]);

    useEffect(() => {
        const updateMousePosition = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });

            const target = e.target as HTMLElement;
            if (
                target.tagName.toLowerCase() === "a" ||
                target.tagName.toLowerCase() === "button" ||
                target.closest("a") ||
                target.closest("button")
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        const handleClick = (e: MouseEvent) => {
            const newClick = { id: Date.now(), x: e.clientX, y: e.clientY };
            setClicks((prev) => [...prev, newClick]);
            setTimeout(() => {
                setClicks((prev) => prev.filter((click) => click.id !== newClick.id));
            }, 600);
        };

        window.addEventListener("mousemove", updateMousePosition);
        window.addEventListener("mousedown", handleClick);

        return () => {
            window.removeEventListener("mousemove", updateMousePosition);
            window.removeEventListener("mousedown", handleClick);
        };
    }, []);

    return (
        <div className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden">
            {/* Soft Ceramic Yellow Follower */}
            <motion.div
                className="absolute w-12 h-12 rounded-full border border-[var(--ceramic-yellow)]/30 mix-blend-screen flex items-center justify-center"
                animate={{
                    x: mousePosition.x - 24,
                    y: mousePosition.y - 24,
                    scale: isHovering ? 1.5 : 1,
                    backgroundColor: isHovering ? "rgba(248,215,148,0.1)" : "transparent",
                }}
                transition={{ type: "tween", ease: "backOut", duration: 0.15 }}
            >
                <div className="w-1.5 h-1.5 bg-[var(--ceramic-yellow)] rounded-full shadow-[0_0_10px_rgba(248,215,148,1)]" />
            </motion.div>

            {/* Sparkles on Click */}
            <AnimatePresence>
                {clicks.map((click) => (
                    <motion.div
                        key={click.id}
                        initial={{ opacity: 1, scale: 0 }}
                        animate={{ opacity: 0, scale: 2 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute rounded-full border-[2px] border-[var(--ceramic-yellow)]"
                        style={{
                            left: click.x - 20,
                            top: click.y - 20,
                            width: 40,
                            height: 40,
                            boxShadow: "0 0 20px rgba(248,215,148,0.8)",
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
