"use client";

import { motion, AnimatePresence } from "framer-motion";

interface GhostBrowserOverlayProps {
    visible: boolean;
    toolName?: string;
}

export default function GhostBrowserOverlay({
    visible,
    toolName = "check_pm_kisan_status",
}: GhostBrowserOverlayProps) {
    const siteMap: Record<string, { label: string; url: string }> = {
        check_pm_kisan_status: {
            label: "PM Kisan Portal",
            url: "pmkisan.gov.in/BeneficiaryStatus",
        },
        check_ration_card: {
            label: "NFSA Portal",
            url: "nfsa.gov.in/check-status",
        },
        check_passport_status: {
            label: "Passport Seva",
            url: "passportindia.gov.in/status",
        },
    };

    const site = siteMap[toolName] || siteMap.check_pm_kisan_status;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="fixed bottom-28 right-6 z-[60] w-[360px]"
                >
                    <div className="ghost-browser-chrome shadow-2xl">
                        {/* ── Browser Toolbar ──────────────────────────── */}
                        <div className="ghost-browser-toolbar">
                            <div className="ghost-browser-dot bg-[#ff5f57]" />
                            <div className="ghost-browser-dot bg-[#ffbd2e]" />
                            <div className="ghost-browser-dot bg-[#28c840]" />
                            <div className="ml-3 flex-1 bg-[rgba(248,215,148,0.08)] rounded-md px-3 py-1.5 text-xs text-[var(--text-muted)] font-mono truncate">
                                🔒 https://{site.url}
                            </div>
                        </div>

                        {/* ── Browser Content ──────────────────────────── */}
                        <div className="p-5 space-y-4">
                            {/* Status line */}
                            <div className="flex items-center gap-3">
                                <motion.div
                                    className="w-2.5 h-2.5 rounded-full bg-[var(--ceramic-yellow)]"
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ duration: 1.2, repeat: Infinity }}
                                />
                                <span className="text-sm text-[var(--ceramic-yellow)] font-medium">
                                    Ghost Browser Active
                                </span>
                            </div>

                            {/* Main message */}
                            <div className="space-y-2">
                                <p className="text-[var(--pastel-beige)] text-base font-semibold">
                                    Navigating {site.label}… ⏳
                                </p>
                                <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                                    Self-healing Playwright agent is navigating the portal with
                                    Bedrock vision fallback. PII is being redacted in real-time.
                                </p>
                            </div>

                            {/* Progress animation */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                                    <span>Progress</span>
                                    <motion.span
                                        animate={{ opacity: [1, 0.4, 1] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                    >
                                        Processing…
                                    </motion.span>
                                </div>
                                <div className="w-full h-1.5 bg-[rgba(248,215,148,0.1)] rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{
                                            background:
                                                "linear-gradient(90deg, var(--ceramic-yellow), var(--red-carriage))",
                                        }}
                                        animate={{ width: ["10%", "65%", "85%", "95%"] }}
                                        transition={{
                                            duration: 8,
                                            ease: "easeInOut",
                                            repeat: Infinity,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Simulated log lines */}
                            <div className="bg-[rgba(0,0,0,0.4)] rounded-lg p-3 space-y-1 font-mono text-[10px] text-[var(--text-muted)]">
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <span className="text-green-400">✓</span> Stealth Chromium
                                    launched
                                </motion.p>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.0 }}
                                >
                                    <span className="text-green-400">✓</span> Anti-detection
                                    injected
                                </motion.p>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.8 }}
                                >
                                    <span className="text-[var(--ceramic-yellow)]">⟳</span>{" "}
                                    Navigating to {site.url}
                                </motion.p>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 2.6 }}
                                >
                                    <span className="text-[var(--ceramic-yellow)]">⟳</span>{" "}
                                    Bedrock vision scanning DOM…
                                </motion.p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
