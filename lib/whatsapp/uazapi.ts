/**
 * UazapiProvider — implementa WhatsAppProvider sobre lib/uazapi/client.ts.
 *
 * Não muda comportamento — só adapta tipos. Canais existentes seguem
 * funcionando exatamente igual via essa fachada.
 */
import {
  adminCreateInstance,
  instanceConnect,
  instanceGetStatus,
  instanceDisconnect,
  instanceDelete,
  instanceSetWebhook,
  instanceSendText,
  instanceSendMedia,
  instanceDownloadMessage,
  instanceListGroups,
  instanceGetGroupInfo,
  instanceFindMessages,
  classificarPlataforma,
} from "@/lib/uazapi/client";
import type {
  CriarInstanciaResult,
  ConnectResult,
  DownloadedMedia,
  GroupRef,
  InstanceRef,
  MensagemHistorico,
  PlataformaSO,
  ProviderRef,
  SendMediaParams,
  SendResult,
  SendTextParams,
  StatusCanal,
  WebhookEvent,
  WhatsAppProvider,
} from "./provider";

function toUazapiServer(ref: ProviderRef) {
  return { baseUrl: ref.baseUrl, adminToken: ref.adminToken };
}

function toUazapiInstance(ref: InstanceRef) {
  return { baseUrl: ref.baseUrl, token: ref.token };
}

function plataformaToSO(plat?: string | null): PlataformaSO | undefined {
  const so = classificarPlataforma(plat || undefined);
  return so ?? undefined;
}

function statusToEstado(s: string | undefined, connected: boolean): StatusCanal["estado"] {
  if (connected) return "connected";
  const norm = (s || "").toLowerCase();
  if (norm === "connected") return "connected";
  if (norm === "connecting") return "connecting";
  if (norm === "pending_qr" || norm === "qr") return "pending_qr";
  return "disconnected";
}

export const UazapiProvider: WhatsAppProvider = {
  tipo: "uazapi",

  async criarInstancia(server, nome): Promise<CriarInstanciaResult> {
    const r = await adminCreateInstance(toUazapiServer(server), { name: nome });
    return {
      instanceId: r.instance.id,
      token: r.token,
    };
  },

  async connect(inst, opts): Promise<ConnectResult> {
    const r = await instanceConnect(toUazapiInstance(inst), opts?.phone ? { phone: opts.phone } : {});
    return {
      qrcode: r.instance.qrcode,
      paircode: r.instance.paircode,
      connected: !!r.connected,
    };
  },

  async getStatus(inst): Promise<StatusCanal> {
    const r = await instanceGetStatus(toUazapiInstance(inst));
    const connected = !!r.status.connected;
    return {
      estado: statusToEstado(r.instance.status, connected),
      numeroConectado: r.status.jid?.user || undefined,
      nomePerfil: r.instance.profileName,
      fotoPerfilUrl: r.instance.profilePicUrl,
      plataforma: plataformaToSO(r.instance.plataform),
      qrcode: r.instance.qrcode,
    };
  },

  async disconnect(inst): Promise<void> {
    await instanceDisconnect(toUazapiInstance(inst));
  },

  async deleteInstance(inst): Promise<void> {
    await instanceDelete(toUazapiInstance(inst));
  },

  async setWebhook(inst, url, events?: WebhookEvent[]): Promise<void> {
    await instanceSetWebhook(toUazapiInstance(inst), url, events ?? ["messages", "messages_update", "connection"]);
  },

  async sendText(inst, p: SendTextParams): Promise<SendResult> {
    const r = await instanceSendText(toUazapiInstance(inst), {
      number: p.numero,
      text: p.texto,
      replyid: p.replyId,
      mentions: p.mentions,
      delay: p.delayMs,
      linkPreview: p.linkPreview,
    });
    return { id: r.id, messageId: r.messageid, raw: r };
  },

  async sendMedia(inst, p: SendMediaParams): Promise<SendResult> {
    // UAZAPI usa tipos `image|video|videoplay|document|audio|myaudio|ptt|ptv|sticker`
    // — mapeamos os comuns. `audio` continua audio, `ptt` continua ptt.
    const tipoUazapi = (
      p.tipo === "audio" ? "audio" :
      p.tipo === "ptt" ? "ptt" :
      p.tipo
    ) as "image" | "video" | "videoplay" | "document" | "audio" | "myaudio" | "ptt" | "ptv" | "sticker";
    const r = await instanceSendMedia(toUazapiInstance(inst), {
      number: p.numero,
      type: tipoUazapi,
      file: p.arquivo,
      text: p.caption,
      docName: p.filename,
      replyid: p.replyId,
      delay: p.delayMs,
    });
    return { id: r.id, messageId: r.messageid, raw: r };
  },

  async downloadMedia(inst, p): Promise<DownloadedMedia> {
    const r = await instanceDownloadMessage(toUazapiInstance(inst), { id: p.id, type: p.tipo });
    return {
      fileURL: r.fileURL,
      base64: r.base64,
      mimetype: r.mimetype,
      filename: r.filename,
    };
  },

  async listGroups(inst): Promise<GroupRef[]> {
    const grupos = await instanceListGroups(toUazapiInstance(inst), { noparticipants: true });
    return grupos.map((g) => ({
      jid: g.JID,
      nome: g.Name,
      participantes: g.Participants?.length,
      isAnnounce: g.IsAnnounce,
    }));
  },

  async getGroupInfo(inst, groupJid): Promise<GroupRef> {
    const g = await instanceGetGroupInfo(toUazapiInstance(inst), { groupjid: groupJid });
    return {
      jid: g.JID,
      nome: g.Name,
      participantes: g.Participants?.length,
      isAnnounce: g.IsAnnounce,
      membros: g.Participants?.map((p) => ({
        jid: p.JID,
        numero: p.PhoneNumber,
        isAdmin: p.IsAdmin || p.IsSuperAdmin,
      })),
    };
  },

  async findMessages(inst, chatId, limit?: number): Promise<MensagemHistorico[]> {
    const r = await instanceFindMessages(toUazapiInstance(inst), { chatid: chatId, limit });
    return r.messages.map((m) => ({
      id: m.id,
      chatId: m.chatid,
      fromMe: m.fromMe,
      timestamp: m.messageTimestamp,
      tipo: m.messageType,
      texto: m.text || m.content?.text || undefined,
      fileURL: m.fileURL,
      senderName: m.senderName,
    }));
  },
};
