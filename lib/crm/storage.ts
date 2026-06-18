/**
 * Upload de mídia (áudios, imagens, docs) pro bucket crm-media.
 * Path: <agencia_id>/<ticket_id>/<uuid>.<ext>
 */
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

export interface UploadResult {
  path: string;
  publicUrl: string | null;
  signedUrl: string | null;
}

/**
 * Sobe Blob/Buffer pro bucket crm-media.
 * Retorna path + signed URL (1h).
 */
export async function uploadMedia(params: {
  agenciaId: string;
  ticketId: string;
  data: Blob | ArrayBuffer | Buffer;
  filename?: string;
  contentType?: string;
}): Promise<UploadResult> {
  const sb = createServiceClient();
  const ext = (params.filename?.split(".").pop() || "bin").toLowerCase();
  const path = `${params.agenciaId}/${params.ticketId}/${randomUUID()}.${ext}`;

  let body: Blob;
  if (params.data instanceof Blob) {
    body = params.data;
  } else {
    // Copia pra ArrayBuffer "novo" pra escapar do type ArrayBufferLike (que pode ser SharedArrayBuffer).
    const src =
      params.data instanceof Buffer
        ? new Uint8Array(params.data.buffer, params.data.byteOffset, params.data.byteLength)
        : new Uint8Array(params.data);
    const copy = new ArrayBuffer(src.byteLength);
    new Uint8Array(copy).set(src);
    body = new Blob([copy], {
      type: params.contentType || "application/octet-stream",
    });
  }

  const { error } = await sb.storage.from("crm-media").upload(path, body, {
    upsert: false,
    contentType: params.contentType,
  });
  if (error) throw error;

  const { data: signed } = await sb.storage.from("crm-media").createSignedUrl(path, 60 * 60);

  return {
    path,
    publicUrl: null,
    signedUrl: signed?.signedUrl || null,
  };
}

/**
 * Baixa URL externa (ex: UAZAPI midia_url) e sobe pro bucket.
 * Útil pra persistir mídia recebida via webhook.
 */
export async function downloadAndUpload(params: {
  agenciaId: string;
  ticketId: string;
  sourceUrl: string;
  filename?: string;
  contentType?: string;
}): Promise<UploadResult | null> {
  try {
    const r = await fetch(params.sourceUrl);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await uploadMedia({
      agenciaId: params.agenciaId,
      ticketId: params.ticketId,
      data: blob,
      filename: params.filename || params.sourceUrl.split("/").pop() || "media.bin",
      contentType: params.contentType || blob.type || undefined,
    });
  } catch (e) {
    console.error("[storage] downloadAndUpload falhou:", e);
    return null;
  }
}

/**
 * Cria signed URL pra path existente.
 */
export async function getSignedUrl(path: string, expiresSeconds = 3600): Promise<string | null> {
  const sb = createServiceClient();
  const { data } = await sb.storage.from("crm-media").createSignedUrl(path, expiresSeconds);
  return data?.signedUrl || null;
}

/**
 * Job de limpeza: deleta mídia >N dias de tickets fechados.
 * Chamável via cron.
 */
export async function limparMidiaAntiga(diasMin = 90): Promise<{ deletados: number }> {
  const sb = createServiceClient();
  const cutoff = new Date(Date.now() - diasMin * 24 * 60 * 60 * 1000).toISOString();

  const { data: tickets } = await sb
    .from("tickets")
    .select("id, agencia_id")
    .eq("status", "fechado")
    .lt("fechado_em", cutoff);

  if (!tickets || tickets.length === 0) return { deletados: 0 };

  let deletados = 0;
  for (const t of tickets as Array<{ id: string; agencia_id: string }>) {
    // Path real do upload é <agencia_id>/<ticket_id>/... — listar só por ticket_id
    // não achava nada (mídia nunca era apagada / vazava storage).
    const prefixo = `${t.agencia_id}/${t.id}`;
    const { data: list } = await sb.storage.from("crm-media").list(prefixo);
    if (!list || list.length === 0) continue;
    const paths = list.map((f) => `${prefixo}/${f.name}`);
    const { error } = await sb.storage.from("crm-media").remove(paths);
    if (!error) deletados += paths.length;
  }

  return { deletados };
}
