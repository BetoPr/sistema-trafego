/**
 * Factory + entry-point pra escolher o provider correto baseado no
 * tipo registrado na tabela `canais` (coluna `provider`).
 *
 * Uso:
 *   import { getProvider } from "@/lib/whatsapp";
 *   const provider = getProvider("uazapi"); // ou "waha"
 *   await provider.sendText(inst, { numero, texto });
 */
import type { ProviderTipo, WhatsAppProvider } from "./provider";
import { UazapiProvider } from "./uazapi";
import { WahaProvider } from "./waha";

export * from "./provider";
export { UazapiProvider, WahaProvider };

/**
 * Resolve o provider correto.
 *
 * @param tipo "uazapi" | "waha"
 * @throws se tipo desconhecido
 */
export function getProvider(tipo: ProviderTipo): WhatsAppProvider {
  switch (tipo) {
    case "uazapi": return UazapiProvider;
    case "waha": return WahaProvider;
    default:
      throw new Error(`Provider WhatsApp desconhecido: ${tipo}`);
  }
}

/**
 * Default provider pra canais novos. Mudou pra WAHA conforme decisão
 * de produto (2026-06-25): WAHA self-hosted gratuito > UAZAPI hosted.
 *
 * Canais já existentes mantêm `provider` no banco e seguem usando UAZAPI.
 */
export const PROVIDER_DEFAULT: ProviderTipo = "waha";
