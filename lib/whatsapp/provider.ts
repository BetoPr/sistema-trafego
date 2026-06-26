/**
 * WhatsApp Provider abstraction — interface comum entre UAZAPI e WAHA.
 *
 * Cada provider implementa esse contrato. A factory em `./index.ts`
 * escolhe a implementação certa baseado em `canais.provider` na tabela.
 *
 * Tipos abstratos:
 *  - ProviderRef: identifica server + credencial de auth (admin)
 *  - InstanceRef: identifica 1 sessão/canal específico (server + token/sessionName)
 *
 * Todas operações retornam tipos normalizados (StatusCanal, SendResult, etc)
 * pra UI/_actions não precisarem saber qual provider tá rodando atrás.
 */

export type ProviderTipo = "uazapi" | "waha";

/** Estado de conexão padronizado entre providers. */
export type EstadoConexao = "disconnected" | "connecting" | "pending_qr" | "connected";

/** Sistema operacional do aparelho (quando o provider expõe). */
export type PlataformaSO = "ios" | "android" | "web" | "outro";

/** Referência ao servidor de um provider (config global). */
export interface ProviderRef {
  tipo: ProviderTipo;
  baseUrl: string;
  /** UAZAPI: admintoken global. WAHA: X-Api-Key global. */
  adminToken: string;
}

/** Referência a uma instância/sessão específica (1 canal). */
export interface InstanceRef {
  tipo: ProviderTipo;
  baseUrl: string;
  /**
   * UAZAPI: instance token (UUID retornado no create).
   * WAHA: X-Api-Key global (mesmo do server) + sessionName.
   */
  token: string;
  /** Nome da sessão — usado por WAHA. UAZAPI ignora. */
  sessionName?: string;
}

/** Resultado normalizado de criação de instância. */
export interface CriarInstanciaResult {
  /** ID da instância (UAZAPI) ou nome da session (WAHA). */
  instanceId: string;
  /** Token de auth pra próximas chamadas (UAZAPI). WAHA reutiliza apiKey. */
  token: string;
  /** Nome da session (WAHA) — pra salvar em canais.waha_session_name. */
  sessionName?: string;
}

/** QR code + status retornado por connect(). */
export interface ConnectResult {
  /** QR code base64 PNG (sem prefixo data:) ou texto. */
  qrcode?: string;
  /** Código de pareamento por número (UAZAPI). WAHA não suporta. */
  paircode?: string;
  /** Já conectado (não precisa QR). */
  connected: boolean;
}

/** Status detalhado de uma instância. */
export interface StatusCanal {
  estado: EstadoConexao;
  numeroConectado?: string;
  nomePerfil?: string;
  fotoPerfilUrl?: string;
  plataforma?: PlataformaSO;
  qrcode?: string;
}

/** Resultado padronizado de envio. */
export interface SendResult {
  id?: string;
  messageId?: string;
  raw?: unknown;
}

export interface SendTextParams {
  /** Número destino BR (5511999999999) OU chatId completo (...@s.whatsapp.net / ...@g.us). */
  numero: string;
  texto: string;
  replyId?: string;
  mentions?: string[];
  delayMs?: number;
  linkPreview?: boolean;
}

export interface SendMediaParams {
  numero: string;
  tipo: "image" | "video" | "document" | "audio" | "ptt" | "sticker";
  /** URL ou base64 da mídia. */
  arquivo: string;
  caption?: string;
  filename?: string;
  replyId?: string;
  delayMs?: number;
}

export interface DownloadedMedia {
  fileURL?: string;
  base64?: string;
  mimetype?: string;
  filename?: string;
}

export interface GroupRef {
  jid: string;
  nome: string;
  participantes?: number;
  isAnnounce?: boolean;
  membros?: Array<{ jid: string; numero?: string; isAdmin?: boolean }>;
}

export interface MensagemHistorico {
  id: string;
  chatId: string;
  fromMe: boolean;
  timestamp: number;
  tipo?: string;
  texto?: string;
  fileURL?: string;
  senderName?: string;
}

/** Eventos que o webhook deve receber (lista canônica). */
export type WebhookEvent =
  | "messages"
  | "messages_update"
  | "connection";

/**
 * Contrato comum entre UAZAPI e WAHA.
 *
 * Implementações:
 *  - lib/whatsapp/uazapi.ts → UazapiProvider
 *  - lib/whatsapp/waha.ts   → WahaProvider
 */
export interface WhatsAppProvider {
  /** Identifica o provider (pra logs / debug). */
  readonly tipo: ProviderTipo;

  /** Cria nova instância/sessão no servidor. */
  criarInstancia(server: ProviderRef, nome: string): Promise<CriarInstanciaResult>;

  /** Inicia conexão — gera QR ou pair code. */
  connect(inst: InstanceRef, opts?: { phone?: string }): Promise<ConnectResult>;

  /** Status detalhado da instância. */
  getStatus(inst: InstanceRef): Promise<StatusCanal>;

  /** Desconecta sessão WhatsApp (mantém instância). */
  disconnect(inst: InstanceRef): Promise<void>;

  /** Remove a instância/sessão do servidor. */
  deleteInstance(inst: InstanceRef): Promise<void>;

  /** Configura webhook URL pra eventos. */
  setWebhook(
    inst: InstanceRef,
    url: string,
    events?: WebhookEvent[],
  ): Promise<void>;

  /** Envia mensagem de texto. */
  sendText(inst: InstanceRef, p: SendTextParams): Promise<SendResult>;

  /** Envia mídia (imagem/vídeo/doc/áudio). */
  sendMedia(inst: InstanceRef, p: SendMediaParams): Promise<SendResult>;

  /** Baixa mídia de mensagem recebida. */
  downloadMedia(
    inst: InstanceRef,
    p: { id: string; tipo?: "image" | "audio" | "document" | "video" | "sticker" },
  ): Promise<DownloadedMedia>;

  /** Lista grupos do número conectado. */
  listGroups(inst: InstanceRef): Promise<GroupRef[]>;

  /** Detalhes de grupo (inclui participantes). */
  getGroupInfo(inst: InstanceRef, groupJid: string): Promise<GroupRef>;

  /** Histórico de mensagens de um chat (newest-first). */
  findMessages(
    inst: InstanceRef,
    chatId: string,
    limit?: number,
  ): Promise<MensagemHistorico[]>;
}
