/**
 * Login como Roberto super_admin + abre edit perfil Ana + clica olho
 * + extrai a chave OpenAI atual decriptada.
 */
import { chromium } from "playwright";

const BASE = "https://sistema-trafego.vercel.app";
const EMAIL = "jj.rroberto2010@gmail.com";
const SENHA = "SonarRR2026!Trade";
const PERFIL_ANA = "d2a328c4-41de-4e0f-93ad-bc07c685a675";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 854 } });
const page = await ctx.newPage();

console.log("Login...");
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[type="email"]', { timeout: 15000 });
await page.locator('input[type="email"]').click();
await page.keyboard.type(EMAIL, { delay: 20 });
await page.locator('input[type="password"]').click();
await page.keyboard.type(SENHA, { delay: 20 });

const trackInfo = await page.evaluate(() => {
  const texto = Array.from(document.querySelectorAll("div")).find((d) => d.textContent === "Deslize para verificar →");
  if (!texto) return null;
  const track = texto.parentElement;
  if (!track) return null;
  const handle = Array.from(track.querySelectorAll("div")).find((d) => getComputedStyle(d).cursor === "grab");
  const hb = handle?.getBoundingClientRect();
  const tb = track.getBoundingClientRect();
  return hb && tb ? { hx: hb.x, hy: hb.y, hw: hb.width, hh: hb.height, tx: tb.x, tw: tb.width } : null;
});
if (trackInfo) {
  const sx = trackInfo.hx + trackInfo.hw / 2;
  const sy = trackInfo.hy + trackInfo.hh / 2;
  const ex = trackInfo.tx + trackInfo.tw - trackInfo.hw / 2 - 4;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(sx + ((ex - sx) * i) / 12, sy, { steps: 3 });
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
}
await page.locator('button[type="submit"]').click({ force: true });
await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
console.log("Logado!");

// Chama endpoint API direto autenticado
console.log("Buscando chave decriptada...");
const resultado = await page.evaluate(async (perfilId) => {
  const r = await fetch(`/api/ia-atendimento/get-api-key?perfilId=${perfilId}`);
  const j = await r.json();
  return { status: r.status, body: j };
}, PERFIL_ANA);

console.log("\n=== CHAVE OPENAI (perfil Ana) ===");
console.log(JSON.stringify(resultado, null, 2));

await browser.close();
