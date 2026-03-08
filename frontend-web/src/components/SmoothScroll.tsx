"use client";

import { useEffect, ReactNode } from "react";

interface SmoothScrollProps {
    children: ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
    useEffect(() => {
        let lenis: any = null;
        let raf: number;

        const initLenis = async () => {
            try {
                const Lenis = (await import("lenis")).default;

                lenis = new Lenis({
                    duration: 1.4,
                    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                    smoothWheel: true,
                    touchMultiplier: 2,
                });

                function animate(time: number) {
                    lenis.raf(time);
                    raf = requestAnimationFrame(animate);
                }

                raf = requestAnimationFrame(animate);
            } catch (err) {
                console.warn("Lenis smooth scroll failed to load:", err);
            }
        };

        initLenis();

        return () => {
            if (raf) cancelAnimationFrame(raf);
            if (lenis) lenis.destroy();
        };
    }, []);

    return <div>{children}</div>;
}
