/**
 * Transcrição de áudio via Groq (Whisper Large v3 / Turbo / Distil).
 *
 * Docs: https://console.groq.com/docs/speech-text
 * Endpoint: POST https://api.groq.com/openai/v1/audio/transcriptions
 * Auth: Authorization: Bearer <api_key>
 *
 * Free tier suficiente pra MVP.
 */

export type WhisperModel =
  | "whisper-large-v3"
  | "whisper-large-v3-turbo"
  | "distil-whisper-large-v3-en";

export interface TranscribeParams {
  apiKey: string;
  model?: WhisperModel;
  language?: string; // ex: "pt"
  prompt?: string;
  temperature?: number;
  /** URL pública do áudio (ex: Supabase Storage signed URL) OU Buffer/Blob */
  audioUrl?: string;
  audioBlob?: Blob;
  audioFilename?: string;
}

export interface TranscribeResult {
  text: string;
  duration?: number;
  language?: string;
  modelo: WhisperModel;
}

export async function transcribeAudio(p: TranscribeParams): Promise<TranscribeResult> {
  const model = p.model ?? "whisper-large-v3-turbo";

  let blob: Blob;
  let filename: string;

  if (p.audioBlob) {
    blob = p.audioBlob;
    filename = p.audioFilename ?? "audio.ogg";
  } else if (p.audioUrl) {
    const r = await fetch(p.audioUrl);
    if (!r.ok) throw new Error(`Groq transcribe: fetch áudio falhou ${r.status}`);
    blob = await r.blob();
    filename = p.audioFilename ?? p.audioUrl.split("/").pop() ?? "audio.ogg";
  } else {
    throw new Error("Groq transcribe: audioUrl ou audioBlob obrigatório");
  }

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", model);
  if (p.language) form.append("language", p.language);
  if (p.prompt) form.append("prompt", p.prompt);
  if (typeof p.temperature === "number") form.append("temperature", String(p.temperature));
  form.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${p.apiKey}`,
    },
    body: form,
  });

  const json = (await res.json().catch(() => ({}))) as {
    text?: string;
    duration?: number;
    language?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(`Groq transcribe ${res.status}: ${json.error?.message || res.statusText}`);
  }

  return {
    text: json.text ?? "",
    duration: json.duration,
    language: json.language,
    modelo: model,
  };
}
