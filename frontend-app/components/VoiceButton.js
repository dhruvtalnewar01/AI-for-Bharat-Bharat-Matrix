/**
 * components/VoiceButton.js
 * Bharat MatrixAI – Cinematic Voice Button (Awwwards-level)
 *
 * Design Philosophy
 * ─────────────────
 *  • Zero cognitive load — one giant button is the entire interface
 *  • Premium dark palette: near-black canvas, saffron action, violet ghost, emerald speak
 *  • All animations on the Reanimated native thread (no JS jank)
 *  • Minimal English text — Devanagari labels only
 *
 * Props
 * ─────
 *  phase      : 'IDLE' | 'LISTENING' | 'GHOST_NAVIGATING' | 'SPEAKING'
 *  onPressIn  : () => void
 *  onPressOut : () => void
 *  disabled   : boolean
 */

import React, { useEffect, memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Path, G } from 'react-native-svg';
import Animated, {
    cancelAnimation,
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BTN = 176;                  // button diameter px
const RAD = BTN / 2;
const WRAP = BTN + 200;            // canvas for rings

const C = {
    bg: '#05050A',          // near-black canvas
    saffron: '#FF4D00',          // IDLE/LISTENING accent
    saffrondim: '#CC3D00',          // listening button tint
    violet: '#7C3AED',          // GHOST_NAVIGATING — "ghost browser"
    violetGlow: '#A78BFA',          // softer violet glow ring
    emerald: '#059669',          // SPEAKING
    emeraldGlow: '#34D399',          // soft speaking ring
    white: '#FFFFFF',
    dim: '#4B5563',
    labelGhost: '#C4B5FD',          // violet-tinted label
    labelSpeak: '#6EE7B7',          // emerald-tinted label
};

// ─── Ring colour per phase ────────────────────────────────────────────────────
const RING = {
    IDLE: C.saffron,
    LISTENING: C.saffron,
    GHOST_NAVIGATING: C.violetGlow,
    SPEAKING: C.emeraldGlow,
};

const BTN_BG = {
    IDLE: C.saffron,
    LISTENING: C.saffrondim,
    GHOST_NAVIGATING: C.violet,
    SPEAKING: C.emerald,
};

// ─── Micro components ──────────────────────────────────────────────────────────

/** One expanding + fading ring */
const RippleRing = memo(({ delay, color, maxDiameter, duration = 2000 }) => {
    const scale = useSharedValue(0.3);
    const opacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withDelay(delay,
            withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.cubic) }), -1, false));
        opacity.value = withDelay(delay,
            withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 100 }),
                    withTiming(0, { duration: duration - 100, easing: Easing.out(Easing.exp) }),
                ),
                -1, false,
            ));
        return () => { cancelAnimation(scale); cancelAnimation(opacity); };
    }, []);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.centred, style]}>
            <Svg width={maxDiameter} height={maxDiameter}>
                <Circle cx={maxDiameter / 2} cy={maxDiameter / 2}
                    r={maxDiameter / 2 - 1} fill="none" stroke={color} strokeWidth={1.5} />
            </Svg>
        </Animated.View>
    );
});

/** Rotating dashed orbit — used only in GHOST_NAVIGATING */
const GhostOrbit = memo(({ r, color, duration }) => {
    const rot = useSharedValue(0);
    useEffect(() => {
        rot.value = withRepeat(withTiming(360, { duration, easing: Easing.linear }), -1, false);
        return () => cancelAnimation(rot);
    }, []);
    const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
    const sz = r * 2 + 4;
    const circ = 2 * Math.PI * r;
    return (
        <Animated.View pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.centred, style]}>
            <Svg width={sz} height={sz}>
                <Circle cx={sz / 2} cy={sz / 2} r={r} fill="none"
                    stroke={color} strokeWidth={2}
                    strokeDasharray={`${circ * 0.28} ${circ * 0.72}`}
                    strokeLinecap="round" />
            </Svg>
        </Animated.View>
    );
});

/** Outer ambient glow disc */
function GlowDisc({ color, size }) {
    const opacity = useSharedValue(0);
    useEffect(() => {
        opacity.value = withTiming(1, { duration: 500 });
        return () => cancelAnimation(opacity);
    }, []);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centred, style]}>
            <Svg width={size} height={size}>
                <Defs>
                    <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
                        <Stop offset="60%" stopColor={color} stopOpacity={0.1} />
                        <Stop offset="100%" stopColor={color} stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#glow)" />
            </Svg>
        </Animated.View>
    );
}

/** Processing status label — fades in/out */
function StatusLabel({ phase }) {
    const opacity = useSharedValue(0);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sine) }),
                withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.sine) }),
            ),
            -1, false,
        );
        return () => cancelAnimation(opacity);
    }, []);

    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

    const map = {
        GHOST_NAVIGATING: { line1: 'PM Kisan वर जात आहे…', line2: 'कृपया थांबा', color: C.labelGhost },
        SPEAKING: { line1: 'उत्तर ऐका', line2: '', color: C.labelSpeak },
        LISTENING: { line1: 'बोला…', line2: '', color: C.white },
    };

    const info = map[phase];
    if (!info) return null;

    return (
        <Animated.View style={[styles.labelWrap, style]}>
            <Text style={[styles.labelLine1, { color: info.color }]}>{info.line1}</Text>
            {!!info.line2 && <Text style={styles.labelLine2}>{info.line2}</Text>}
        </Animated.View>
    );
}

/** Mic SVG icon — scales with button */
function MicIcon() {
    return (
        <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
            <G>
                <Path d="M12 2C10.34 2 9 3.34 9 5v6a3 3 0 0 0 6 0V5c0-1.66-1.34-3-3-3z" fill={C.white} />
                <Path d="M19 10v1a7 7 0 0 1-14 0v-1"
                    stroke={C.white} strokeWidth={1.6} strokeLinecap="round" />
                <Path d="M12 18v4" stroke={C.white} strokeWidth={1.6} strokeLinecap="round" />
                <Path d="M8 22h8" stroke={C.white} strokeWidth={1.6} strokeLinecap="round" />
            </G>
        </Svg>
    );
}

// ─── Main VoiceButton ──────────────────────────────────────────────────────────
export default function VoiceButton({ phase, onPressIn, onPressOut, disabled }) {
    // Button scale: spring-in on press, subtle breath on IDLE
    const scale = useSharedValue(1);
    const btnBrightness = useSharedValue(0); // 0 = saffron, 1 = active

    useEffect(() => {
        cancelAnimation(scale);
        if (phase === 'IDLE') {
            scale.value = withRepeat(
                withSequence(
                    withTiming(0.96, { duration: 1000, easing: Easing.inOut(Easing.sine) }),
                    withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.sine) }),
                ),
                -1, false,
            );
        } else {
            scale.value = withSpring(1, { damping: 10, stiffness: 120 });
        }
    }, [phase]);

    const buttonAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.93, { damping: 8, stiffness: 200 });
        onPressIn?.();
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 180 });
        onPressOut?.();
    };

    const bg = BTN_BG[phase] ?? C.saffron;
    const ringColor = RING[phase] ?? C.saffron;
    const glowSize = WRAP - 20;

    // Ghost navigating: 5 slow ripple rings + 2 counter-rotating orbits + big glow
    // Listening: 3 faster rings
    // Speaking: 3 medium rings (emerald)
    // Idle: no rings (just heartbeat)

    return (
        <View style={[styles.wrap, { width: WRAP, height: WRAP }]}>
            {/* ── Phase-specific ambient glow ─────────────────────────────── */}
            {phase !== 'IDLE' && (
                <GlowDisc color={bg} size={glowSize} key={phase} />
            )}

            {/* ── LISTENING: 3 fast saffron rings ────────────────────────── */}
            {phase === 'LISTENING' && [280, 240, 200].map((sz, i) => (
                <RippleRing key={i} delay={i * 300} color={ringColor} maxDiameter={sz} duration={1400} />
            ))}

            {/* ── GHOST_NAVIGATING: 5 slow violet rings + dual orbits ─────── */}
            {phase === 'GHOST_NAVIGATING' && (
                <>
                    {[320, 280, 240, 200, 160].map((sz, i) => (
                        <RippleRing key={i} delay={i * 360} color={ringColor}
                            maxDiameter={sz} duration={2400} />
                    ))}
                    <GhostOrbit r={RAD + 22} color={C.violetGlow} duration={2800} />
                    <GhostOrbit r={RAD + 40} color={C.violet} duration={4200} />
                </>
            )}

            {/* ── SPEAKING: 3 emerald rings ───────────────────────────────── */}
            {phase === 'SPEAKING' && [280, 230, 180].map((sz, i) => (
                <RippleRing key={i} delay={i * 350} color={ringColor} maxDiameter={sz} duration={1800} />
            ))}

            {/* ── Core pressable button ───────────────────────────────────── */}
            <Pressable
                onPressIn={disabled ? undefined : handlePressIn}
                onPressOut={disabled ? undefined : handlePressOut}
                accessibilityRole="button"
                accessibilityLabel="बोलण्यासाठी दाबा"
                style={styles.pressable}
            >
                <Animated.View style={[styles.button, { backgroundColor: bg }, buttonAnimStyle]}>
                    <MicIcon />
                </Animated.View>
            </Pressable>

            {/* ── State label ─────────────────────────────────────────────── */}
            {phase !== 'IDLE' && <StatusLabel phase={phase} />}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    centred: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressable: {
        borderRadius: RAD,
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        width: BTN,
        height: BTN,
        borderRadius: RAD,
        alignItems: 'center',
        justifyContent: 'center',
        // iOS shadow
        shadowColor: '#FF4D00',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.7,
        shadowRadius: 30,
        // Android elevation
        elevation: 24,
    },
    labelWrap: {
        position: 'absolute',
        bottom: 8,
        alignItems: 'center',
        gap: 4,
    },
    labelLine1: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.4,
        textAlign: 'center',
    },
    labelLine2: {
        fontSize: 12,
        color: '#6B7280',
        letterSpacing: 0.6,
    },
});
