"use client";

import { useEffect, useState } from "react";
import CursorGlow from "./CursorGlow";

/**
 * ClientBody wraps all page children inside a single client-side <div>.
 * This prevents the infamous Next.js "removeChild" hydration crash caused
 * by browser extensions injecting nodes as direct children of <body>.
 * React only reconciles what's inside this wrapper — extension-injected
 * siblings are invisible to it.
 */
export default function ClientBody({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            {mounted && <CursorGlow />}
            {children}
        </>
    );
}
