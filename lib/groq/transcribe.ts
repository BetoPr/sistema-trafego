/**
 * Transcrição de áudio via Groq (Whisper Large v3 / Turbo / Distil).
 *
 * Docs: https://console.groq.com/docs/speech-text
 * Endpoint: POST https://api.groq.com/openai/v1/audio/transcriptions
 * Auth: Authorization: Bearer <api_key>
 *
 * Free tier suficiente pra MVP.
 */
import { registrarUsoIA, type UsoLog } from "@/lib/ai/uso";

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
  /** Contexto pra registrar o uso (quem/onde). tarefa é sempre "transcricao". */
  uso?: Omit<UsoLog, "tarefa">;
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
    filename = p.audioFilename ?? p.audioUrl.split("/").pop()?.split("?")[0] ?? "audio.ogg";
  } else {
    throw new Error("Groq transcribe: audioUrl ou audioBlob obrigatório");
  }

  // Groq exige filename com extensão válida (flac/mp3/mp4/mpeg/mpga/m4a/ogg/opus/wav/webm).
  // UAZAPI/WhatsApp gera UUID sem ext — força .ogg (formato OPUS padrão WA).
  const extOk = /\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|opus|wav|webm)$/i.test(filename);
  if (!extOk) {
    // Detecta por mime se disponível
    const mime = (blob.type || "").toLowerCase();
    if (mime.includes("opus") || mime.includes("ogg")) filename += ".ogg";
    else if (mime.includes("mp3") || mime.includes("mpeg")) filename += ".mp3";
    else if (mime.includes("m4a") || mime.includes("mp4") || mime.includes("aac")) filename += ".m4a";
    else if (mime.includes("wav")) filename += ".wav";
    else if (mime.includes("webm")) filename += ".webm";
    else filename += ".ogg"; // default WhatsApp
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
    const msg = json.error?.message || res.statusText;
    if (p.uso) registrarUsoIA({ ...p.uso, tarefa: "transcricao", provider: "groq", modelo: model, status: /\b429\b|rate limit|too many|quota/i.test(msg) ? "rate_limit" : "erro", erro: `${res.status}: ${msg}` });
    throw new Error(`Groq transcribe ${res.status}: ${msg}`);
  }

  if (p.uso) registrarUsoIA({ ...p.uso, tarefa: "transcricao", provider: "groq", modelo: model, audioSeg: json.duration ?? 0 });

  return {
    text: json.text ?? "",
    duration: json.duration,
    language: json.language,
    modelo: model,
  };
}
