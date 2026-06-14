/**
 * Download + upload de mídia da UAZAPI — código único pro webhook, cron de retry,
 * retry manual e backfill em lote.
 *
 * Estratégia de retry:
 *  - Webhook faz 1ª tentativa síncrona. Se falhar grava tentativas=1.
 *  - Cron /api/cron/midia-retry roda a cada 1min e dispara tentativa 2 (5min após a 1ª)
 *    e tentativa 3 (30min após a 1ª). Mais que isso só manual.
 *  - Botão no chat força tentativa imediata (incrementa contador, sem limite).
 *  - Após 3 falhas auto + sem sucesso → metadata.midia_perdida=true. UI mostra
 *    "indisponível" mas botão ainda funciona caso queira forçar.
 *
 * Metadata gravada na mensagem:
 *  - midia_tentativas: número (cada chamada incrementa)
 *  - midia_ultima_tentativa_em: ISO
 *  - midia_erro: motivo da última falha (texto curto)
 *  - midia_perdida: bool — só vira true quando cron decide parar
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceDownloadMessage } from "@/lib/uazapi/client";
import { uploadMedia } from "./storage";
import { uploadImageToImgbb, uploadImageFromUrlToImgbb } from "@/lib/imgbb/upload";
import { transcreverMensagemAudio } from "./ia";

export const LIMITE_AUTO_TENTATIVAS = 3;

const TYPE_MAP: Record<string, "image" | "audio" | "video" | "document" | "sticker"> = {
  audio: "audio",
  imagem: "image",
  video: "video",
  documento: "document",
  sticker: "sticker",
};

interface CanalToken {
  baseUrl: string;
  token: string;
}

export interface BaixarParams {
  sb: SupabaseClient;
  mensagemId: string;
  agenciaId: string;
  ticketId: string;
  tipo: string;
  waMessageId: string;
  canalId: string;
  transcreverSeCliente?: boolean;
}

export interface BaixarResult {
  ok: boolean;
  error?: string;
  midiaUrl?: string;
  tentativas?: number;
}

/** Descriptografa token + monta {baseUrl, token} pra canal. Cache pode ser injetado externamente. */
export async function getCanalToken(sb: SupabaseClient, canalId: string): Promise<CanalToken | null> {
  const { data } = await sb
    .from("canais")
    .select("instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .maybeSingle();
  if (!data?.instance_token_encrypted) return null;
  const baseUrl = (data as unknown as { servidor: { base_url: string } }).servidor?.base_url;
  if (!baseUrl) return null;
  try {
    const token = decryptToken(byteaToBuffer(data.instance_token_encrypted));
    return { baseUrl, token };
  } catch {
    return null;
  }
}

/**
 * Tenta baixar a mídia da UAZAPI e subir pro destino (ImgBB pra imagem, bucket pro resto).
 * Atualiza mensagens.metadata com o resultado.
 *
 * NÃO joga exceção — sempre retorna {ok, error}. Webhook/cron/UI tratam.
 */
export async function baixarEUploadMidia(
  p: BaixarParams,
  canalToken?: CanalToken | null,
): Promise<BaixarResult> {
  const ct = canalToken ?? (await getCanalToken(p.sb, p.canalId));
  // Lê tentativas atuais antes de incrementar (pra retornar contador correto).
  const { data: msgRow } = await p.sb
    .from("mensagens")
    .select("metadata")
    .eq("id", p.mensagemId)
    .single();
  const metaAtual = (msgRow?.metadata as Record<string, unknown> | null) || {};
  const tentativasAntes = Number(metaAtual.midia_tentativas) || 0;
  const tentativaAtual = tentativasAntes + 1;
  const agoraIso = new Date().toISOString();

  if (!ct) {
    const meta = { ...metaAtual, midia_tentativas: tentativaAtual, midia_ultima_tentativa_em: agoraIso, midia_erro: "canal_sem_token" };
    await p.sb.from("mensagens").update({ metadata: meta }).eq("id", p.mensagemId);
    return { ok: false, error: "canal_sem_token", tentativas: tentativaAtual };
  }

  try {
    const dl = await instanceDownloadMessage(
      { baseUrl: ct.baseUrl, token: ct.token },
      { id: p.waMessageId, type: TYPE_MAP[p.tipo] },
    );

    const mimeType = dl.mimetype || undefined;
    const filename = dl.filename || undefined;
    if (!dl.fileURL && !dl.base64) {
      const meta = { ...metaAtual, midia_tentativas: tentativaAtual, midia_ultima_tentativa_em: agoraIso, midia_erro: "uazapi_sem_dados" };
      await p.sb.from("mensagens").update({ metadata: meta }).eq("id", p.mensagemId);
      return { ok: false, error: "uazapi_sem_dados", tentativas: tentativaAtual };
    }

    // imagem → ImgBB
    if (p.tipo === "imagem") {
      let imgUrl: string | null = null;
      if (dl.fileURL) {
        const ib = await uploadImageFromUrlToImgbb({ sourceUrl: dl.fileURL, filename });
        imgUrl = ib.url;
      } else if (dl.base64) {
        const ib = await uploadImageToImgbb({ base64: dl.base64, filename });
        imgUrl = ib.url;
      }
      if (!imgUrl) {
        const meta = { ...metaAtual, midia_tentativas: tentativaAtual, midia_ultima_tentativa_em: agoraIso, midia_erro: "imgbb_vazio" };
        await p.sb.from("mensagens").update({ metadata: meta }).eq("id", p.mensagemId);
        return { ok: false, error: "imgbb_vazio", tentativas: tentativaAtual };
      }
      const metaOk: Record<string, unknown> = { ...metaAtual, midia_tentativas: tentativaAtual, midia_ultima_tentativa_em: agoraIso };
      delete metaOk.midia_erro;
      delete metaOk.midia_perdida;
      await p.sb.from("mensagens").update({
        midia_url: imgUrl,
        midia_mime: mimeType || "image/jpeg",
        midia_filename: filename || null,
        metadata: metaOk,
      }).eq("id", p.mensagemId);
      return { ok: true, midiaUrl: imgUrl, tentativas: tentativaAtual };
    }

    // audio/video/documento/sticker → bucket
    let buf: Buffer | null = null;
    if (dl.fileURL) {
      const r = await fetch(dl.fileURL);
      if (r.ok) buf = Buffer.from(await r.arrayBuffer());
    } else if (dl.base64) {
      const raw = dl.base64.includes(",") ? dl.base64.split(",")[1] : dl.base64;
      buf = Buffer.from(raw, "base64");
    }
    if (!buf) {
      const meta = { ...metaAtual, midia_tentativas: tentativaAtual, midia_ultima_tentativa_em: agoraIso, midia_erro: "buffer_vazio" };
      await p.sb.from("mensagens").update({ metadata: meta }).eq("id", p.mensagemId);
      return { ok: false, error: "buffer_vazio", tentativas: tentativaAtual };
    }
    const up = await uploadMedia({
      agenciaId: p.agenciaId,
      ticketId: p.ticketId,
      data: buf,
      filename: filename || `${p.tipo}.bin`,
      contentType: mimeType || "application/octet-stream",
    });
    const metaOk: Record<string, unknown> = { ...metaAtual, midia_tentativas: tentativaAtual, midia_ultima_tentativa_em: agoraIso };
    delete metaOk.midia_erro;
    delete metaOk.midia_perdida;
    await p.sb.from("mensagens").update({
      midia_url: up.path,
      midia_mime: mimeType || null,
      midia_filename: filename || null,
      metadata: metaOk,
    }).eq("id", p.mensagemId);

    // Áudio do cliente → transcreve
    if (p.tipo === "audio" && up?.signedUrl && p.transcreverSeCliente) {
      try {
        await transcreverMensagemAudio({
          agenciaId: p.agenciaId,
          mensagemId: p.mensagemId,
          audioUrl: up.signedUrl,
        });
      } catch {}
    }
    return { ok: true, midiaUrl: up.path, tentativas: tentativaAtual };
  } catch (e) {
    const msgErr = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    const meta = { ...metaAtual, midia_tentativas: tentativaAtual, midia_ultima_tentativa_em: agoraIso, midia_erro: msgErr };
    await p.sb.from("mensagens").update({ metadata: meta }).eq("id", p.mensagemId);
    return { ok: false, error: msgErr, tentativas: tentativaAtual };
  }
}

/** Marca mensagem como perdida (após esgotar tentativas auto). */
export async function marcarMidiaPerdida(sb: SupabaseClient, mensagemId: string): Promise<void> {
  const { data } = await sb.from("mensagens").select("metadata").eq("id", mensagemId).single();
  const meta = { ...((data?.metadata as Record<string, unknown> | null) || {}), midia_perdida: true };
  await sb.from("mensagens").update({ metadata: meta }).eq("id", mensagemId);
}
