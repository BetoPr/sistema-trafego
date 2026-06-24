/**
 * Render PNG do relatorio via @napi-rs/canvas. Same dados do PDF.
 */
import { createCanvas } from "@napi-rs/canvas";
import type { PdfDados } from "./pdf";

const W = 1080;
const H_BASE = 1200;
const BG = "#0c0d0c";
const ACCENT = "#00E19A";
const ACCENT_DIM = "#4DECB3";
const TEXT = "#ffffff";
const TEXT_DIM = "#cccccc";
const CARD_BG = "rgba(255,255,255,0.04)";
const CARD_BORDER = "rgba(255,255,255,0.14)";
const LINE = "rgba(255,255,255,0.10)";

export function gerarBufferImagem(d: PdfDados): Buffer {
  const altura = d.trafego ? H_BASE + 380 : H_BASE;
  const c = createCanvas(W, altura);
  const x = c.getContext("2d");

  // fundo
  x.fillStyle = BG;
  x.fillRect(0, 0, W, altura);

  let y = 60;

  // header
  x.fillStyle = ACCENT_DIM;
  x.font = "bold 22px sans-serif";
  x.fillText("RELATORIO SONAR", 60, y);
  y += 50;
  x.fillStyle = TEXT;
  x.font = "bold 54px sans-serif";
  wrapText(x, d.titulo, 60, y, W - 120, 60);
  y += 70;
  x.fillStyle = TEXT_DIM;
  x.font = "24px sans-serif";
  const sub = `${d.cliente ? d.cliente + "  ·  " : ""}${d.periodoInicio} a ${d.periodoFim}`;
  x.fillText(sub, 60, y);
  y += 30;
  // linha verde
  x.strokeStyle = ACCENT;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(60, y);
  x.lineTo(W - 60, y);
  x.stroke();
  y += 60;

  // FINANCEIRO
  x.fillStyle = ACCENT_DIM;
  x.font = "bold 20px sans-serif";
  x.fillText("FINANCEIRO", 60, y);
  y += 30;

  // KPI 4 cards (2x2)
  const cardW = (W - 120 - 24) / 2;
  const cardH = 160;
  const kpis = [
    { label: "INVESTIDO", v: d.financeiro.investido },
    { label: "FATURAMENTO", v: d.financeiro.faturamento, accent: true },
    { label: "LUCRO", v: d.financeiro.lucro, accent: true },
    { label: "ROAS", v: d.financeiro.roas },
  ];
  for (let i = 0; i < kpis.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 60 + col * (cardW + 24);
    const cy = y + row * (cardH + 16);
    drawCard(x, cx, cy, cardW, cardH);
    x.fillStyle = "#888";
    x.font = "16px sans-serif";
    x.fillText(kpis[i].label, cx + 20, cy + 35);
    x.fillStyle = kpis[i].accent ? ACCENT : TEXT;
    x.font = "bold 52px sans-serif";
    x.fillText(kpis[i].v, cx + 20, cy + 100);
  }
  y += 2 * (cardH + 16) + 20;

  // Vendas
  drawLine(x, 60, y, "VENDAS NO PERIODO", `${d.financeiro.vendas}`);
  y += 60;

  if (d.trafego) {
    y += 30;
    x.fillStyle = ACCENT_DIM;
    x.font = "bold 20px sans-serif";
    x.fillText("TRAFEGO", 60, y);
    y += 30;
    const items: Array<[string, string]> = [
      ["Impressoes", d.trafego.impressoes],
      ["Cliques", d.trafego.cliques],
      ["CTR", d.trafego.ctr],
      ["Leads", d.trafego.leads],
      ["CPL", d.trafego.cpl],
      ["Conversoes", d.trafego.conversoes],
    ];
    for (const [k, v] of items) {
      drawLine(x, 60, y, k, v);
      y += 56;
    }
  }

  // footer
  x.fillStyle = "#666";
  x.font = "18px sans-serif";
  x.fillText("Gerado automaticamente pelo Sonar CRM", 60, altura - 40);

  return c.toBuffer("image/png");
}

function drawCard(x: any, cx: number, cy: number, w: number, h: number) {
  x.fillStyle = CARD_BG;
  x.fillRect(cx, cy, w, h);
  x.strokeStyle = CARD_BORDER;
  x.lineWidth = 1;
  x.strokeRect(cx + 0.5, cy + 0.5, w - 1, h - 1);
}

function drawLine(x: any, cx: number, cy: number, label: string, valor: string) {
  x.fillStyle = TEXT_DIM;
  x.font = "22px sans-serif";
  x.fillText(label, cx, cy + 28);
  x.fillStyle = TEXT;
  x.font = "bold 26px sans-serif";
  const w = x.measureText(valor).width;
  x.fillText(valor, W - 60 - w, cy + 28);
  x.strokeStyle = LINE;
  x.lineWidth = 1;
  x.beginPath();
  x.moveTo(cx, cy + 48);
  x.lineTo(W - 60, cy + 48);
  x.stroke();
}

function wrapText(x: any, t: string, cx: number, cy: number, max: number, lh: number) {
  const words = t.split(" ");
  let line = "";
  let yy = cy;
  for (const w of words) {
    const test = line + (line ? " " : "") + w;
    if (x.measureText(test).width > max && line) {
      x.fillText(line, cx, yy);
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) x.fillText(line, cx, yy);
}
