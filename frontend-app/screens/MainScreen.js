/**
 * screens/MainScreen.js
 *
 * Full-screen minimalist layout for Bharat MatrixAI.
 * Orchestrates permissions → recording → API call → playback.
 * All visible text is in Devanagari (Hindi/Marathi mix) – no English.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
    StatusBar,
    Platform,
    Vibration,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Permissions from 'expo-permissions';
import useVoiceStore from '../store/useVoiceStore';
import { sendAudio, cancelRequest, VoiceApiError } from '../services/api';
import VoiceButton from '../components/VoiceButton';

// ─── Phase label icons (emoji, language-agnostic) ────────────────────────────
const PHASE_ICON = {
    IDLE: '🎙️',
    LISTENING: '👂',
    PROCESSING: '⚙️',
    SPEAKING: '🔊',
};

// Phase hint text in Hindi
const PHASE_HINT = {
    IDLE: 'बोलने के लिए दबाएं',
    LISTENING: 'सुन रहा हूँ…',
    PROCESSING: 'समझ रहा हूँ…',
    SPEAKING: 'जवाब सुनें',
};

export default function MainScreen() {
    const { phase, startListening, stopListening, setSpeaking, reset, setError } =
        useVoiceStore();

    const recordingRef = useRef(null);
    const soundRef = useRef(null);

    // ─── Permission check on mount ──────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('माइक्रोफ़ोन की अनुमति नहीं मिली', 'कृपया सेटिंग में जाकर माइक्रोफ़ोन एक्सेस दें।');
            }
        })();

        // Cleanup on unmount
        return () => {
            cancelRequest();
            stopSoundIfPlaying();
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync().catch(() => { });
            }
        };
    }, []);

    // ─── Audio mode setup ───────────────────────────────────────────────────
    useEffect(() => {
        Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });
    }, []);

    async function stopSoundIfPlaying() {
        if (soundRef.current) {
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            } catch { }
            soundRef.current = null;
        }
    }

    // ─── Begin recording ────────────────────────────────────────────────────
    const handlePressIn = useCallback(async () => {
        if (phase !== 'IDLE') return;

        try {
            await stopSoundIfPlaying();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY,
            );
            recordingRef.current = recording;
            startListening();
            Vibration.vibrate(30); // subtle haptic cue
        } catch (err) {
            setError(`Recording start error: ${err.message}`);
        }
    }, [phase]);

    // ─── Stop recording & send to backend ──────────────────────────────────
    const handlePressOut = useCallback(async () => {
        if (phase !== 'LISTENING' || !recordingRef.current) return;

        try {
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;

            // Transition to processing
            stopListening(uri);

            // Send to backend
            const responseUri = await sendAudio(uri);

            // Play response
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
            const { sound } = await Audio.Sound.createAsync(
                { uri: responseUri },
                { shouldPlay: true },
            );
            soundRef.current = sound;
            setSpeaking(responseUri);
            Vibration.vibrate(30);

            // When playback finishes, return to idle
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    reset();
                    sound.unloadAsync().catch(() => { });
                    soundRef.current = null;
                }
            });
        } catch (err) {
            const msg =
                err instanceof VoiceApiError
                    ? `API error (${err.statusCode ?? 'network'})`
                    : err.message;
            setError(msg);
            // Visual-only error; no English alert shown to user (icon returns to idle)
        }
    }, [phase]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0D0D1A" />

            {/* ── Logo area ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <Text style={styles.logo}>भारत</Text>
                <Text style={styles.logoAccent}>MatrixAI</Text>
                <View style={styles.langPill}>
                    <Text style={styles.langPillText}>मराठी / हिन्दी</Text>
                </View>
            </View>

            {/* ── Spacer ────────────────────────────────────────────────────── */}
            <View style={{ flex: 1 }} />

            {/* ── Voice button ──────────────────────────────────────────────── */}
            <View style={styles.buttonArea}>
                <VoiceButton
                    phase={phase}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={phase === 'PROCESSING' || phase === 'SPEAKING'}
                />
            </View>

            {/* ── Phase indicator ───────────────────────────────────────────── */}
            <View style={styles.phaseRow}>
                <Text style={styles.phaseIcon}>{PHASE_ICON[phase]}</Text>
                <Text style={styles.phaseHint}>{PHASE_HINT[phase]}</Text>
            </View>

            {/* ── Spacer ────────────────────────────────────────────────────── */}
            <View style={{ flex: 1 }} />

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>भारत MatrixAI</Text>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const DARK_BG = '#0D0D1A';
const CARD_BG = '#16182A';
const SAFFRON = '#FF6B00';
const WHITE = '#FFFFFF';
const MUTED = '#6B7280';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DARK_BG,
        alignItems: 'center',
        paddingVertical: 24,
    },
    header: {
        alignItems: 'center',
        marginTop: Platform.OS === 'android' ? 16 : 8,
    },
    logo: {
        fontSize: 28,
        fontWeight: '700',
        color: WHITE,
        letterSpacing: 2,
    },
    logoAccent: {
        fontSize: 14,
        fontWeight: '600',
        color: SAFFRON,
        letterSpacing: 4,
        marginTop: 2,
    },
    langPill: {
        marginTop: 10,
        paddingHorizontal: 14,
        paddingVertical: 4,
        backgroundColor: CARD_BG,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#2D2F4A',
    },
    langPillText: {
        color: MUTED,
        fontSize: 12,
        letterSpacing: 1,
    },
    buttonArea: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    phaseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 28,
        gap: 8,
    },
    phaseIcon: {
        fontSize: 20,
    },
    phaseHint: {
        color: MUTED,
        fontSize: 15,
        letterSpacing: 0.5,
    },
    footer: {
        paddingBottom: 8,
    },
    footerText: {
        color: '#2D2F4A',
        fontSize: 12,
        letterSpacing: 2,
    },
});
