/**
 * Asaas API v3 client.
 *
 * Auth: header `access_token: <api_key>`.
 * Docs: https://docs.asaas.com/reference
 *
 * Notas:
 *  - Pix: cria payment com billingType=PIX → GET /payments/:id/pixQrCode pra QR
 *  - Cartão: cria payment link (paymentLinks) com parcelamento
 *  - Webhook: Asaas envia POST com header `asaas-access-token` que deve bater
 *    com webhook_token configurado (não HMAC) — verificamos contra webhook_secret salvo.
 */

export interface AsaasClient {
  apiKey: string;
  ambiente: "producao" | "sandbox";
}

function baseUrl(c: AsaasClient): string {
  return c.ambiente === "sandbox"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
}

class AsaasError extends Error {
  constructor(
    public status: number,
    public path: string,
    public payload: unknown,
    message: string,
  ) {
    super(message);
    this.name = "AsaasError";
  }
}

async function call(
  client: AsaasClient,
  path: string,
  opts: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; timeoutMs?: number } = {},
): Promise<unknown> {
  const url = `${baseUrl(client)}${path.startsWith("/") ? path : `/${path}`}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 25_000);
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        access_token: client.apiKey,
        "User-Agent": "SistemaTrafego-CRM/1.0",
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      const errors = (json as { errors?: Array<{ description?: string }> } | null)?.errors;
      const msg = errors?.[0]?.description || `HTTP ${res.status}`;
      throw new AsaasError(res.status, path, json, `Asaas ${path}: ${msg}`);
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

// =========================================
// CUSTOMERS
// =========================================

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
}

export async function findOrCreateCustomer(
  client: AsaasClient,
  params: { name: string; cpfCnpj?: string; email?: string; phone?: string; externalReference?: string },
): Promise<AsaasCustomer> {
  // Tenta buscar por cpfCnpj ou email
  if (params.cpfCnpj) {
    const list = (await call(
      client,
      `/customers?cpfCnpj=${encodeURIComponent(params.cpfCnpj)}`,
    )) as { data?: AsaasCustomer[] };
    if (list.data && list.data.length) return list.data[0];
  } else if (params.email) {
    const list = (await call(
      client,
      `/customers?email=${encodeURIComponent(params.email)}`,
    )) as { data?: AsaasCustomer[] };
    if (list.data && list.data.length) return list.data[0];
  }

  return (await call(client, "/customers", {
    method: "POST",
    body: params,
  })) as AsaasCustomer;
}

// =========================================
// PAYMENTS
// =========================================

export interface AsaasPayment {
  id: string;
  customer: string;
  value: number;
  netValue?: number;
  billingType: "PIX" | "CREDIT_CARD" | "BOLETO" | "UNDEFINED";
  status: string;
  dueDate: string;
  description?: string;
  invoiceUrl?: string;
  pixQrCodeId?: string;
  externalReference?: string;
}

export interface CreatePixPayment {
  customer: string;
  value: number;
  description: string;
  dueDate?: string; // yyyy-mm-dd; default hoje
  externalReference?: string;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function createPixPayment(
  client: AsaasClient,
  params: CreatePixPayment,
): Promise<AsaasPayment> {
  return (await call(client, "/payments", {
    method: "POST",
    body: {
      billingType: "PIX",
      customer: params.customer,
      value: params.value,
      description: params.description,
      dueDate: params.dueDate || todayISO(),
      externalReference: params.externalReference,
    },
  })) as AsaasPayment;
}

export interface PixQrCode {
  success: boolean;
  encodedImage: string; // base64 PNG
  payload: string; // copia-cola
  expirationDate?: string;
}

export async function getPixQrCode(client: AsaasClient, paymentId: string): Promise<PixQrCode> {
  return (await call(client, `/payments/${encodeURIComponent(paymentId)}/pixQrCode`)) as PixQrCode;
}

// =========================================
// PIX QR CODE estático (sem customer/CPF)
// =========================================

export interface PixQrCodeStatic {
  id: string;
  encodedImage: string;
  payload: string;
  allowsMultiplePayments?: boolean;
  expirationDate?: string;
}

/**
 * POST /pix/qrCodes/static — gera QR Code PIX SEM customer obrigatório.
 * Não vincula a cliente. Pagamento entra no extrato da conta Asaas direto.
 * Útil pra cobrança rápida sem cadastrar CPF/CNPJ.
 *
 * Requer chave PIX habilitada na conta.
 */
export async function createPixStaticQrCode(
  client: AsaasClient,
  params: {
    addressKey: string; // chave PIX da conta (EVP, CPF, CNPJ, email, phone)
    addressKeyType: "EVP" | "CPF" | "CNPJ" | "EMAIL" | "PHONE";
    value?: number; // omitir = valor livre que cliente define
    description?: string;
    expirationDate?: string;
    allowsMultiplePayments?: boolean;
  },
): Promise<PixQrCodeStatic> {
  return (await call(client, "/pix/qrCodes/static", {
    method: "POST",
    body: params,
  })) as PixQrCodeStatic;
}

export async function getPayment(client: AsaasClient, paymentId: string): Promise<AsaasPayment> {
  return (await call(client, `/payments/${encodeURIComponent(paymentId)}`)) as AsaasPayment;
}

// =========================================
// PAYMENT LINKS (cartão com parcelamento)
// =========================================

export interface CreatePaymentLink {
  name: string;
  description?: string;
  endDate?: string;
  value: number;
  billingType: "UNDEFINED" | "CREDIT_CARD" | "PIX";
  chargeType?: "DETACHED" | "RECURRENT";
  maxInstallmentCount?: number;
  notificationEnabled?: boolean;
  externalReference?: string;
}

export interface AsaasPaymentLink {
  id: string;
  name: string;
  url: string;
  active: boolean;
  description?: string;
  value: number;
}

export async function createPaymentLink(
  client: AsaasClient,
  params: CreatePaymentLink,
): Promise<AsaasPaymentLink> {
  return (await call(client, "/paymentLinks", {
    method: "POST",
    body: {
      chargeType: "DETACHED",
      notificationEnabled: true,
      ...params,
    },
  })) as AsaasPaymentLink;
}

// =========================================
// WEBHOOK signature verification
// =========================================

/**
 * Verifica autenticidade do webhook Asaas.
 * Asaas v3 envia o token configurado no header `asaas-access-token`.
 * Comparamos com webhook_secret salvo na asaas_config da agência.
 *
 * Importante: rejeitar se header ausente OU se não bater exatamente.
 */
export function verifyAsaasWebhook(
  headers: Headers,
  expectedSecret: string,
): boolean {
  const got = headers.get("asaas-access-token") || headers.get("Asaas-Access-Token");
  if (!got || !expectedSecret) return false;
  // timing-safe compare
  if (got.length !== expectedSecret.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) {
    diff |= got.charCodeAt(i) ^ expectedSecret.charCodeAt(i);
  }
  return diff === 0;
}

export { AsaasError };
