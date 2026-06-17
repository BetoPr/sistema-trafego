/**
 * Loga como user X e dispara import via API autenticada da UI.
 * Mais simples: chama /api/contatos/importar-uazapi com cookies de sessao.
 */
import { chromium } from "playwright";

const BASE = "https://sistema-trafego.vercel.app";
const EMAIL = process.env.IMP_EMAIL || "waleriapmonteiro@gmail.com";
const SENHA = process.env.IMP_SENHA || "WalTemp2026!Import";
const CANAL_ID = process.env.IMP_CANAL || "70ece0f0-f2b4-4745-a82e-c0f98a948a8a";

console.log("Login como", EMAIL);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 854 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.locator('input[type="email"]').click();
await page.keyboard.type(EMAIL, { delay: 20 });
await page.locator('input[type="password"]').click();
await page.keyboard.type(SENHA, { delay: 20 });

// Slider anti-bot
const trackInfo = await page.evaluate(() => {
  const texto = Array.from(document.querySelectorAll("div")).find((d) => d.textContent === "Deslize para verificar →");
  if (!texto) return null;
  const track = texto.parentElement;
  if (!track) return null;
  const handle = Array.from(track.querySelectorAll("div")).find((d) => {
    const s = getComputedStyle(d);
    return s.cursor === "grab";
  });
  const handleBox = handle?.getBoundingClientRect();
  const trackBox = track.getBoundingClientRect();
  return handleBox && trackBox
    ? { hx: handleBox.x, hy: handleBox.y, hw: handleBox.width, hh: handleBox.height, tx: trackBox.x, tw: trackBox.width }
    : null;
});
if (trackInfo) {
  const startX = trackInfo.hx + trackInfo.hw / 2;
  const startY = trackInfo.hy + trackInfo.hh / 2;
  const endX = trackInfo.tx + trackInfo.tw - trackInfo.hw / 2 - 4;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(startX + ((endX - startX) * i) / 12, startY, { steps: 3 });
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
}
await page.locator('button[type="submit"]').click({ force: true });
await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
console.log("Logado!");

// Chama API de import via fetch dentro do contexto autenticado
console.log("Disparando import (canal_id=" + CANAL_ID + ")...");
const resultado = await page.evaluate(async (canalId) => {
  const r = await fetch("/api/contatos/importar-uazapi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ canalId, pularLabelsNativas: false }),
  });
  const j = await r.json();
  return { status: r.status, body: j };
}, CANAL_ID);

console.log("\n=== RESULTADO ===");
console.log(JSON.stringify(resultado, null, 2));

await browser.close();
