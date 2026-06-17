/**
 * Captura screenshots do CRM produção e salva em public/apresentacao/img/.
 *
 * Uso:
 *   SONAR_EMAIL=jj.rroberto2010@gmail.com \
 *   SONAR_SENHA=<sua senha> \
 *   node scripts/capture-prints.mjs
 *
 * Ou cria scripts/.env-prints com SONAR_EMAIL=... e SONAR_SENHA=...
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "apresentacao", "img");
const BASE = "https://sistema-trafego.vercel.app";

// Tenta ler scripts/.env-prints se nao ha vars setadas
if (!process.env.SONAR_EMAIL) {
  const envFile = join(__dirname, ".env-prints");
  if (existsSync(envFile)) {
    for (const linha of readFileSync(envFile, "utf-8").split("\n")) {
      const m = linha.trim().match(/^([A-Z_]+)=(.+)$/);
      if (m) process.env[m[1]] = m[2];
    }
  }
}

const EMAIL = process.env.SONAR_EMAIL;
const SENHA = process.env.SONAR_SENHA;
if (!EMAIL || !SENHA) {
  console.error("ERRO: defina SONAR_EMAIL e SONAR_SENHA antes de rodar.");
  console.error("Ex: $env:SONAR_EMAIL='...' ; $env:SONAR_SENHA='...' ; node scripts/capture-prints.mjs");
  process.exit(1);
}

const TELAS = [
  { url: "/dashboard", arquivo: "07-dashboard.png", esperar: 3000 },
  { url: "/atendimentos", arquivo: "02-atendimentos.png", esperar: 3000 },
  { url: "/ia-atendimento", arquivo: "03-ia.png", esperar: 2500 },
  { url: "/follow-up", arquivo: "05-followup.png", esperar: 2500 },
  { url: "/leads-meta", arquivo: "06-leads-meta.png", esperar: 2500 },
  { url: "/plano", arquivo: "08-plano.png", esperar: 2500 },
  { url: "/ia-atendimento?editar=d2a328c4-41de-4e0f-93ad-bc07c685a675", arquivo: "04-tools.png", esperar: 3500, scroll: 1200 },
];

console.log("Iniciando Playwright...");
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
await page.waitForTimeout(500);
// Arrastar slider anti-bot — acha track pelo texto "Deslize para verificar"
const trackInfo = await page.evaluate(() => {
  const texto = Array.from(document.querySelectorAll("div")).find((d) => d.textContent === "Deslize para verificar →");
  if (!texto) return null;
  const track = texto.parentElement;
  if (!track) return null;
  const handle = Array.from(track.querySelectorAll("div")).find((d) => {
    const s = getComputedStyle(d);
    return s.cursor === "grab" || s.borderRadius === "10px" && parseInt(s.width) > 30 && parseInt(s.width) < 60;
  });
  const handleBox = handle?.getBoundingClientRect();
  const trackBox = track.getBoundingClientRect();
  return handleBox && trackBox
    ? { hx: handleBox.x, hy: handleBox.y, hw: handleBox.width, hh: handleBox.height, tx: trackBox.x, tw: trackBox.width }
    : null;
});
if (!trackInfo) throw new Error("Slider nao encontrado");
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
await page.locator('button[type="submit"]').waitFor({ state: "visible" });
await page.locator('button[type="submit"]').click({ force: true });
try {
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
} catch (e) {
  await page.screenshot({ path: join(OUT, "_DEBUG-login.png") });
  const txt = await page.evaluate(() => document.body.innerText);
  console.error("Login falhou. URL:", page.url());
  console.error("Texto da pagina:", txt.slice(0, 500));
  process.exit(1);
}
console.log("Logado!");

for (const t of TELAS) {
  console.log(`Capturando ${t.arquivo}...`);
  await page.goto(`${BASE}${t.url}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(t.esperar);
  if (t.scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), t.scroll);
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: join(OUT, t.arquivo), fullPage: false });
  console.log(`  -> ${t.arquivo} OK`);
}

await browser.close();
console.log("\nDone! Verifique public/apresentacao/img/");
