/**
 * App.js
 * Bharat MatrixAI – Production Root (Cinematic Edition)
 *
 * Screen is intentionally near-empty.
 * The only element is a massive VoiceButton centred on an obsidian canvas.
 * A subtle branding strip lives at the very top; nothing else competes.
 *
 * State machine (Zustand)
 * ───────────────────────
 *  IDLE             → resting
 *  LISTENING        → recording user's voice (hold mic)
 *  GHOST_NAVIGATING → audio POSTed; AI agent navigating PM Kisan
 *  SPEAKING         → playing synthesised response
 */

import React, { useCallback, useEffect } from 'react';
import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Vibration,
  Platform,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import useVoiceStore from './store/useVoiceStore';
import AudioEngine from './services/audio';
import { sendAudio, cancelRequest, VoiceApiError } from './services/api';
import VoiceButton from './components/VoiceButton';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG = '#05050A';   // obsidian canvas
const SAFFRON = '#FF4D00';
const WHITE = '#F9FAFB';
const DIM = '#374151';

// ─── Subtle brand strip at the top ─────────────────────────────────────────────
function BrandStrip() {
  return (
    <View style={styles.brand}>
      <Text style={styles.brandName}>भारत</Text>
      <Text style={styles.brandAccent}> MatrixAI</Text>
    </View>
  );
}

// ─── Phase-aware hint at the bottom  (single dot row for IDLE) ─────────────────
function HintDots({ phase }) {
  const MAP = {
    IDLE: '· · ·',
    LISTENING: '◉  दाबा सोडा',
    GHOST_NAVIGATING: '',            // label is on the button itself
    SPEAKING: '',
  };
  const text = MAP[phase] ?? '';
  if (!text) return null;
  return <Text style={styles.hint}>{text}</Text>;
}

// ─── Root component ─────────────────────────────────────────────────────────────
export default function App() {
  const { phase, startListening, startGhostNav, setSpeaking, reset, setError } =
    useVoiceStore();

  // Scrollytelling: canvas brightness shifts subtly between phases
  const canvasBright = useSharedValue(0);

  useEffect(() => {
    const target =
      phase === 'GHOST_NAVIGATING' ? 0.06 :
        phase === 'SPEAKING' ? 0.04 :
          phase === 'LISTENING' ? 0.03 : 0;
    canvasBright.value = withTiming(target, { duration: 600, easing: Easing.inOut(Easing.sine) });
  }, [phase]);

  const canvasStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(124, 58, 237, ${canvasBright.value})`, // violet tint for GHOST
  }));

  // ── Permissions on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const granted = await AudioEngine.requestPermission();
      if (!granted) {
        Alert.alert(
          'मायक्रोफोन परवानगी',
          'कृपया सेटिंग्जमध्ये मायक्रोफोन ॲक्सेस सक्षम करा.',
        );
      }
    })();
    return () => {
      cancelRequest();
      AudioEngine.cleanup();
    };
  }, []);

  // ── onPressIn: begin recording ────────────────────────────────────────────────
  const handlePressIn = useCallback(async () => {
    if (phase !== 'IDLE') return;
    try {
      await AudioEngine.startRecording();
      startListening();                       // → LISTENING
      Vibration.vibrate(20);
    } catch (err) {
      setError(`Recording start: ${err.message}`);
    }
  }, [phase]);

  // ── onPressOut: stop → POST → play ───────────────────────────────────────────
  const handlePressOut = useCallback(async () => {
    if (phase !== 'LISTENING') return;
    let uri;
    try {
      uri = await AudioEngine.stopRecording();
    } catch (err) {
      setError(`Recording stop: ${err.message}`);
      return;
    }

    startGhostNav(uri);                       // → GHOST_NAVIGATING (cinematic)

    try {
      const responseUri = await sendAudio(uri);   // POST to /api/v1/execute
      await AudioEngine.playResponse(responseUri, () => {
        reset();                              // → IDLE when playback ends
      });
      setSpeaking(responseUri);              // → SPEAKING
      Vibration.vibrate(30);
    } catch (err) {
      setError(
        err instanceof VoiceApiError
          ? `API ${err.statusCode ?? 'network'}`
          : err.message,
      );
    }
  }, [phase]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} translucent={false} />

      {/* Animated canvas overlay — shifts violet tint in GHOST_NAVIGATING */}
      <Animated.View style={[StyleSheet.absoluteFill, canvasStyle]} pointerEvents="none" />

      {/* Brand strip — deliberately tiny, unobtrusive */}
      <BrandStrip />

      {/* ── The entire interface ── */}
      <View style={styles.stage}>
        <VoiceButton
          phase={phase}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={phase === 'GHOST_NAVIGATING' || phase === 'SPEAKING'}
        />
      </View>

      {/* Minimal hint copy at the very bottom */}
      <View style={styles.footer}>
        <HintDots phase={phase} />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  brand: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 20 : 12,
    paddingBottom: 8,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    color: WHITE,
    letterSpacing: 3,
    opacity: 0.7,
  },
  brandAccent: {
    fontSize: 13,
    fontWeight: '400',
    color: SAFFRON,
    letterSpacing: 3,
    opacity: 0.7,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: DIM,
    fontSize: 12,
    letterSpacing: 2,
  },
});
