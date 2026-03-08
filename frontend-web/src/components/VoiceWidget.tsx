"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Loader2 } from "lucide-react";

type Phase = "IDLE" | "LISTENING" | "PROCESSING" | "SPEAKING";

// Hindi system status messages
const HINDI_STATUS: Record<Phase, string> = {
    IDLE: "",
    LISTENING: "ध्वनि संवेदक सक्रिय",
    PROCESSING: "सरकारी पोर्टल नेविगेट हो रहा है...",
    SPEAKING: "प्रतिक्रिया संश्लेषित हो रही है",
};

const HINDI_TERMINAL: string[] = [
    "[सिस्टम] ध्वनि का विश्लेषण हो रहा है...",
    "[सिस्टम] इरादा पहचान लिया गया।",
    "[सिस्टम] सरकारी पोर्टल नेविगेट किया जा रहा है...",
    "[सिस्टम] सुरक्षित रूप से जानकारी निकाली जा रही है...",
    "[सिस्टम] कार्य पूर्ण।",
];

let Vapi: any = null;

export default function VoiceWidget() {
    const [phase, setPhase] = useState<Phase>("IDLE");
    const [transcript, setTranscript] = useState("");
    const [history, setHistory] = useState<{ id: number; text: string; type: "user" | "agent" | "system" }[]>([]);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [sdkReady, setSdkReady] = useState(false);
    const vapiRef = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const counter = useRef(0);
    const terminalIdx = useRef(0);
    const terminalTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [history]);

    const addMsg = (text: string, type: "user" | "agent" | "system") => {
        setHistory(prev => {
            const next = [...prev, { id: counter.current++, text, type }];
            return next.length > 8 ? next.slice(-8) : next;
        });
    };

    // Drip-feed Hindi terminal messages during PROCESSING
    useEffect(() => {
        if (phase === "PROCESSING") {
            terminalIdx.current = 0;
            const drip = () => {
                if (terminalIdx.current < HINDI_TERMINAL.length) {
                    addMsg(HINDI_TERMINAL[terminalIdx.current], "system");
                    terminalIdx.current++;
                    terminalTimer.current = setTimeout(drip, 1200);
                }
            };
            terminalTimer.current = setTimeout(drip, 600);
        } else {
            if (terminalTimer.current) clearTimeout(terminalTimer.current);
        }
        return () => { if (terminalTimer.current) clearTimeout(terminalTimer.current); };
    }, [phase]);

    // Load SDK
    useEffect(() => {
        import("@vapi-ai/web").then(m => { Vapi = m.default; setSdkReady(true); }).catch(() => { });
    }, []);

    // Init Vapi
    useEffect(() => {
        if (!sdkReady || !Vapi) return;
        const key = process.env.NEXT_PUBLIC_VAPI_KEY;
        if (!key) return;

        const vapi = new Vapi(key);
        vapiRef.current = vapi;

        vapi.on("call-start", () => { setPhase("LISTENING"); setHistory([]); setTranscript(""); });

        vapi.on("message", (msg: any) => {
            if (msg.type === "transcript" && msg.transcriptType === "final" && msg.transcript) {
                setTranscript("");
                addMsg(msg.transcript, msg.role === "assistant" ? "agent" : "user");
            } else if (msg.type === "transcript" && msg.transcriptType === "partial") {
                setTranscript(msg.transcript);
            }
            if (msg.type === "tool-calls") setPhase("PROCESSING");
            if (msg.type === "tool-calls-result") setPhase("SPEAKING");
        });

        vapi.on("speech-start", () => setPhase("SPEAKING"));
        vapi.on("speech-end", () => setPhase(p => p === "PROCESSING" ? "PROCESSING" : "LISTENING"));
        vapi.on("volume-level", (l: number) => setVolumeLevel(l));
        vapi.on("call-end", () => { setPhase("IDLE"); setHistory([]); setTranscript(""); setVolumeLevel(0); });
        vapi.on("error", () => setPhase("IDLE"));

        return () => vapi.stop();
    }, [sdkReady]);

    const toggle = useCallback(async () => {
        if (!vapiRef.current) return;
        if (phase === "IDLE") {
            const id = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
            if (id) try { await vapiRef.current.start(id); } catch { }
        } else {
            vapiRef.current.stop();
            setPhase("IDLE");
        }
    }, [phase]);

    const isActive = phase !== "IDLE";

    return (
        <div className="fixed bottom-8 right-8 z-[10000]">
            <motion.div
                layout
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                whileHover={!isActive ? { scale: 1.15, boxShadow: "0 0 60px rgba(212,175,55,0.7)" } : {}}
                whileTap={!isActive ? { scale: 0.85 } : {}}
                className={`relative overflow-hidden ${isActive
                    ? "w-[360px] h-[440px] rounded-2xl glass-strong shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-[var(--gold)]/20"
                    : "w-16 h-16 rounded-full cursor-none shadow-[0_0_40px_rgba(212,175,55,0.25)]"
                    }`}
                style={!isActive ? { animation: "breathing 3s ease-in-out infinite", background: "linear-gradient(135deg, #D4AF37, #C2A23D)" } : {}}
                onClick={!isActive ? toggle : undefined}
            >
                {/* ── IDLE: Gold Orb ── */}
                <AnimatePresence>
                    {!isActive && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center">
                            <Mic className="w-6 h-6 text-[var(--obsidian)]" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── ACTIVE: HUD ── */}
                <AnimatePresence>
                    {isActive && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            transition={{ delay: 0.1 }} className="absolute inset-0 p-5 flex flex-col">

                            {/* Header */}
                            <div className="flex justify-between items-start mb-5 pb-4 border-b border-white/5">
                                <div>
                                    <h3 className="font-display text-lg text-[var(--gold)]">संज्ञानात्मक इनपुट</h3>
                                    <p className="text-[9px] tracking-[2px] text-white/25 uppercase font-mono mt-1">{HINDI_STATUS[phase]}</p>
                                </div>
                                <motion.button
                                    onClick={toggle}
                                    whileHover={{ scale: 1.15, backgroundColor: "rgba(127, 29, 29, 0.8)", boxShadow: "0 0 15px rgba(239,68,68,0.4)" }}
                                    whileTap={{ scale: 0.8 }}
                                    className="w-7 h-7 rounded-full bg-red-900/40 border border-red-500/20 flex items-center justify-center transition-all">
                                    <Square className="w-2.5 h-2.5 text-red-500 fill-current" />
                                </motion.button>
                            </div>

                            {/* Terminal */}
                            <div className="flex-1 overflow-hidden relative" ref={scrollRef}>
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.02)_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />
                                <div className="flex flex-col gap-2 justify-end min-h-full">
                                    <AnimatePresence>
                                        {history.map(m => (
                                            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                                className={`px-3 py-2 rounded text-xs leading-relaxed max-w-[90%] ${m.type === "system" ? "text-[var(--gold)]/70 font-mono text-[10px] self-start border-l-2 border-[var(--gold)]/30 pl-3" :
                                                    m.type === "agent" ? "border border-[var(--gold)]/15 bg-[var(--gold)]/5 text-white/80 self-start" :
                                                        "border border-white/10 bg-white/5 text-white/50 self-end"
                                                    }`}>{m.text}</motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {transcript && <p className="text-white/25 text-xs italic self-end px-2">{transcript}</p>}

                                    {phase === "PROCESSING" && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="flex items-center gap-2 self-center my-3 border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4 py-2 rounded-lg">
                                            <Loader2 className="w-3.5 h-3.5 text-[var(--gold)] animate-spin" />
                                            <span className="text-[9px] text-[var(--gold)] font-mono tracking-[1px] uppercase">पोर्टल नेविगेशन</span>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Equalizer */}
                            <div className="h-8 mt-3 pt-3 border-t border-white/5 flex items-end justify-center gap-[2px]">
                                {[...Array(14)].map((_, i) => {
                                    const h = 3 + volumeLevel * 100 * (Math.random() * 0.6 + 0.4);
                                    return (
                                        <motion.div key={i} className="w-1 bg-[var(--gold)] rounded-t-sm"
                                            animate={{ height: isActive ? `${h}px` : "3px" }}
                                            transition={{ type: "tween", duration: 0.08 }} />
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
