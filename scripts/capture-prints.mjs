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
await page.goto(`${BASE}/login`);
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', SENHA);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
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
