/**
 * services/api.js
 * Bharat MatrixAI – Backend API client (v3)
 *
 * sendAudio(localUri)
 *   POST multipart/form-data → /api/v1/execute
 *   Field : "audio" (audio/m4a)
 *   Expects: { audio_url: string }
 *   Returns: local cache URI of the synthesised audio file
 *
 * cancelRequest()  — module-level flag guard
 */

import * as FileSystem from 'expo-file-system';

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = 'http://192.168.31.119:8000';
const EXECUTE_ENDPOINT = `${BASE_URL}/api/v1/execute`;

// ─── Error type ───────────────────────────────────────────────────────────────
export class VoiceApiError extends Error {
    constructor(message, statusCode = null) {
        super(message);
        this.name = 'VoiceApiError';
        this.statusCode = statusCode;
    }
}

// ─── Cancel flag ──────────────────────────────────────────────────────────────
let _cancelled = false;
export function cancelRequest() { _cancelled = true; }

// ─── sendAudio ────────────────────────────────────────────────────────────────
export async function sendAudio(localUri) {
    _cancelled = false;

    // 1. Upload audio blob as multipart form field "audio"
    let result;
    try {
        result = await FileSystem.uploadAsync(EXECUTE_ENDPOINT, localUri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'audio',
            mimeType: 'audio/m4a',
            headers: { Accept: 'application/json' },
        });
    } catch (err) {
        if (_cancelled) throw new VoiceApiError('Cancelled', null);
        throw new VoiceApiError(`Upload error: ${err.message}`, null);
    }

    if (_cancelled) throw new VoiceApiError('Cancelled', null);

    if (result.status < 200 || result.status >= 300) {
        throw new VoiceApiError(`HTTP ${result.status}`, result.status);
    }

    // 2. Parse body → { audio_url }
    let body;
    try { body = JSON.parse(result.body); }
    catch { throw new VoiceApiError('Invalid JSON', result.status); }

    const audioUrl = body?.audio_url;
    if (!audioUrl) throw new VoiceApiError(`Missing audio_url in: ${result.body}`, result.status);

    // 3. Download synthesised mp3 to local cache
    const dest = `${FileSystem.cacheDirectory}response_${Date.now()}.mp3`;
    let dl;
    try { dl = await FileSystem.downloadAsync(audioUrl, dest); }
    catch (err) { throw new VoiceApiError(`Download error: ${err.message}`, null); }

    if (dl.status !== 200) throw new VoiceApiError(`Download HTTP ${dl.status}`, dl.status);
    return dest;
}
