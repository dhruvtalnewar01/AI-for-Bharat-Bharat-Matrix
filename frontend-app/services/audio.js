/**
 * services/audio.js
 * Bharat MatrixAI – Audio Engine
 *
 * Encapsulates all expo-av recording logic.
 * Keeps App.js free of platform boilerplate.
 *
 * Usage
 * ─────
 *   await AudioEngine.requestPermission()
 *   await AudioEngine.startRecording()
 *   const uri = await AudioEngine.stopRecording()   // high-quality m4a URI
 *   await AudioEngine.playResponse(uri, onDone)
 *   AudioEngine.stopPlayback()
 */

import { Audio } from 'expo-av';

// ── Recording presets ─────────────────────────────────────────────────────────
// HIGH_QUALITY: 44 100 Hz, 128 kbps AAC – maximum clarity for STT pipelines
const RECORDING_OPTIONS = Audio.RecordingOptionsPresets.HIGH_QUALITY;

let _recording = null;
let _sound = null;

const AudioEngine = {
    // ── 1. Permission ───────────────────────────────────────────────────────────
    async requestPermission() {
        const { status } = await Audio.requestPermissionsAsync();
        return status === 'granted';
    },

    // ── 2. Audio mode helpers ───────────────────────────────────────────────────
    async _modeForRecording() {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });
    },

    async _modeForPlayback() {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        });
    },

    // ── 3. Recording ─────────────────────────────────────────────────────────────
    async startRecording() {
        if (_recording) {
            await _recording.stopAndUnloadAsync().catch(() => { });
            _recording = null;
        }
        await this._modeForRecording();
        const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
        _recording = recording;
    },

    async stopRecording() {
        if (!_recording) return null;
        await _recording.stopAndUnloadAsync();
        const uri = _recording.getURI();
        _recording = null;
        return uri; // file:// URI — m4a on iOS, aac on Android
    },

    // ── 4. Playback ───────────────────────────────────────────────────────────────
    /**
     * @param {string}   uri     Local file URI of synthesised audio
     * @param {Function} onDone  Callback invoked when playback finishes
     */
    async playResponse(uri, onDone) {
        await this.stopPlayback();
        await this._modeForPlayback();
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
        _sound = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
                sound.unloadAsync().catch(() => { });
                _sound = null;
                onDone?.();
            }
        });
    },

    async stopPlayback() {
        if (_sound) {
            await _sound.stopAsync().catch(() => { });
            await _sound.unloadAsync().catch(() => { });
            _sound = null;
        }
    },

    // ── 5. Emergency cleanup (unmount / cancel) ──────────────────────────────────
    async cleanup() {
        if (_recording) {
            await _recording.stopAndUnloadAsync().catch(() => { });
            _recording = null;
        }
        await this.stopPlayback();
    },
};

export default AudioEngine;
