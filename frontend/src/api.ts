import type { TestCase } from './types';

/** Set in Vercel (demo) or frontend/.env.local — leave empty for local dev (Vite proxy). */
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export interface UploadResponse {
  status: string;
  filename: string;
  message: string;
  test_cases: TestCase[];
  suite_error: string | null;
}

export interface ChatResponse {
  response: string;
  test_cases: TestCase[];
}

export interface VoiceResponse {
  transcription: string;
  agent_response: string;
  test_cases: TestCase[];
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? res.statusText);
  }
  return res.json();
}

export async function sendChat(message: string): Promise<ChatResponse> {
  const form = new FormData();
  form.append('message', message);
  const res = await fetch(`${BASE}/chat`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? res.statusText);
  }
  return res.json();
}

export async function sendVoice(blob: Blob): Promise<VoiceResponse> {
  const form = new FormData();
  form.append('audio', blob, 'recording.wav');
  const res = await fetch(`${BASE}/voice`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? res.statusText);
  }
  return res.json();
}
