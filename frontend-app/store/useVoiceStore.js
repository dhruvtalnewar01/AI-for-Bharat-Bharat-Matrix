/**
 * store/useVoiceStore.js
 * Zustand – canonical state machine for Bharat MatrixAI
 *
 *  IDLE             → at rest
 *  LISTENING        → recording user voice
 *  GHOST_NAVIGATING → audio sent; AI ghost browser is executing on backend
 *  SPEAKING         → playing synthesised response
 */

import { create } from 'zustand';

const useVoiceStore = create((set) => ({
    phase: 'IDLE',   // 'IDLE' | 'LISTENING' | 'GHOST_NAVIGATING' | 'SPEAKING'
    recordingUri: null,
    responseUri: null,
    error: null,

    startListening: () => set({ phase: 'LISTENING', recordingUri: null, responseUri: null, error: null }),
    startGhostNav: (uri) => set({ phase: 'GHOST_NAVIGATING', recordingUri: uri }),
    setSpeaking: (uri) => set({ phase: 'SPEAKING', responseUri: uri }),
    reset: () => set({ phase: 'IDLE', recordingUri: null, responseUri: null, error: null }),
    setError: (msg) => set({ phase: 'IDLE', error: msg }),
}));

export default useVoiceStore;
