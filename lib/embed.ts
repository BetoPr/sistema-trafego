/**
 * "Modo embed" = a página está rodando dentro de um iframe (o balão flutuante
 * de abas, feature D). Detectamos pela diferença window.self !== window.top,
 * assim os redirects das server actions continuam dentro do iframe sem precisar
 * carregar um query-param em todo lugar.
 */
export function inIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin (não deve acontecer aqui) → trata como iframe.
    return true;
  }
}
