"use client";

import { useEffect, useState } from "react";

interface Slide {
  id: string;
  eyebrow: string;
  titulo: string;
  subtitulo?: string;
  bullets?: string[];
  mockup: React.ReactNode;
  destaque?: string;
}

const ACCENT = "#10b981";
const BG_DEEP = "#070b09";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.10)";
const TEXT = "#FFFFFF";
const MUTED = "#9B9B9B";

const SLIDES: Slide[] = [
  {
    id: "capa",
    eyebrow: "DEMONSTRAÇÃO INTERATIVA",
    titulo: "Sonar",
    subtitulo: "CRM WhatsApp + Ads com IA 24/7",
    bullets: [
      "Caixa de entrada estilo WhatsApp",
      "IA que atende, qualifica e transfere",
      "Follow-up sequencial automático",
      "Conciliação de leads do Meta em tempo real",
    ],
    mockup: <CapaMockup />,
    destaque: "R$29/mês por conexão",
  },
  {
    id: "problema",
    eyebrow: "O PROBLEMA",
    titulo: "Atendimento manual mata vendas",
    bullets: [
      "Lead chega no WhatsApp e demora horas pra ser respondido",
      "Tráfego pago gera leads que ninguém qualifica direito",
      "Sem rastreio: qual ad trouxe qual venda?",
      "IAs prontas custam caro e travam o caixa",
    ],
    mockup: <ProblemaMockup />,
  },
  {
    id: "caixa",
    eyebrow: "ATENDIMENTO",
    titulo: "Caixa de entrada estilo WhatsApp",
    bullets: [
      "99 abertos / 5 pendentes / 28 fechados — filtros multi-toggle",
      "Etiquetas multi-cor (Em Follow Up, Lead Quente, etc)",
      "Badge de não-lidas estilo WhatsApp",
      "Atender direto no hover do avatar",
    ],
    mockup: <CaixaMockup />,
  },
  {
    id: "ia",
    eyebrow: "IA DE ATENDIMENTO",
    titulo: "IA atende sozinha — 24h por dia",
    bullets: [
      "BYOK: você usa SUA chave OpenAI / Anthropic / Groq",
      "Custo da IA fica direto contigo — sem markup nosso",
      "Prompt customizável com placeholders {{dia_semana}}, {{hora_atual}}",
      "Modo teste com whitelist (só responde seu número)",
    ],
    mockup: <IAMockup />,
    destaque: "Você no controle dos custos",
  },
  {
    id: "tools",
    eyebrow: "FERRAMENTAS CUSTOM",
    titulo: "IA executa ações no seu fluxo",
    bullets: [
      "Cria etiqueta automaticamente (marcar_lead_ensaio, marcar_lead_quente, etc)",
      "Transferir para humano com fila + status configuráveis",
      "Enviar imagem da galeria (apresentar produto humanizado)",
      "Tools toggle on/off em tempo real",
    ],
    mockup: <ToolsMockup />,
  },
  {
    id: "followup",
    eyebrow: "FOLLOW-UP AUTOMÁTICO",
    titulo: "Lead esfriou? IA reaquece sozinha",
    bullets: [
      "Sequência 1-6 mensagens (texto, imagem, vídeo, áudio, doc)",
      "Delay configurável por etapa (60s a 7 dias)",
      "Pausa automática quando cliente responde",
      "Etiqueta 'Em Follow Up' e 'Follow Up feito' aplicadas",
    ],
    mockup: <FollowupMockup />,
  },
  {
    id: "leads",
    eyebrow: "META LEADS",
    titulo: "Conciliação automática Meta → WhatsApp",
    bullets: [
      "Webhook leadgen captura leads em tempo real",
      "Concilia por telefone (variantes BR) ou CTWA",
      "KPIs: total, conciliados, órfãos, taxa %, CPL real",
      "Link direto do lead pro ticket do WhatsApp",
    ],
    mockup: <LeadsMockup />,
    destaque: "Fim do 'qual ad trouxe esse lead?'",
  },
  {
    id: "massa",
    eyebrow: "ENVIO EM MASSA",
    titulo: "Disparo seguro anti-ban",
    bullets: [
      "Delay aleatório 20-45s entre mensagens",
      "Aviso de risco de bloqueio (alerta em vermelho se delay baixo)",
      "Placeholders [nome] preenchidos automaticamente",
      "Importação direta do WhatsApp Business",
    ],
    mockup: <MassaMockup />,
  },
  {
    id: "dashboard",
    eyebrow: "DASHBOARD",
    titulo: "KPIs em tempo real",
    bullets: [
      "Faturamento, tickets fechados, ticket médio, satisfação",
      "Tempos: 1ª resposta, resposta ao cliente, fechamento",
      "Filtros por serviço, período (hoje / 7d / 30d / X a Y)",
      "Export PDF + prompt visual pra ChatGPT",
    ],
    mockup: <DashboardMockup />,
  },
  {
    id: "preco",
    eyebrow: "PREÇO HONESTO",
    titulo: "R$29/mês por conexão WhatsApp",
    bullets: [
      "Só cobramos o custo real da API de WhatsApp",
      "Todas as ferramentas inclusas — sem cobrar por feature",
      "IA roda na SUA chave (custo só com OpenAI/etc)",
      "Sem fidelidade, cancele quando quiser",
    ],
    mockup: <PrecoMockup />,
    destaque: "Sem markup, sem pegadinha",
  },
  {
    id: "comeco",
    eyebrow: "COMO COMEÇAR",
    titulo: "Em 3 passos simples",
    bullets: [
      "1. Conecte seu WhatsApp via QR code (1 clique)",
      "2. Importe seus contatos do WhatsApp Business",
      "3. Configure sua IA e/ou comece a atender manual",
    ],
    mockup: <ComecoMockup />,
  },
  {
    id: "cta",
    eyebrow: "BORA?",
    titulo: "Marca uma call de 15min",
    subtitulo: "Te mostro como tá hoje + o que tô desenvolvendo + se encaixa no teu negócio",
    bullets: [],
    mockup: <CTAMockup />,
    destaque: "Distribuído gratuitamente em fase de desenvolvimento",
  },
];

export default function Deck() {
  const [i, setI] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") setI((v) => Math.min(SLIDES.length - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
      if (e.key === "Home") setI(0);
      if (e.key === "End") setI(SLIDES.length - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const s = SLIDES[i];
  const isLast = i === SLIDES.length - 1;

  return (
    <div style={{
      minHeight: "100vh",
      background: BG_DEEP,
      color: TEXT,
      fontFamily: "Inter, system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
      <BackgroundAurora />

      <header style={{ padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18, letterSpacing: 4 }}>
          <RadarIcon /> SONAR
        </div>
        <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1, textTransform: "uppercase" }}>
          {i + 1} / {SLIDES.length}
        </div>
      </header>

      <main style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: 40, padding: "20px 60px 60px", alignItems: "center", position: "relative", zIndex: 2 }}>
        <section style={{ animation: "slide-in-left 0.5s ease both" }} key={`text-${s.id}`}>
          <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
            {s.eyebrow}
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 700, margin: 0, lineHeight: 1.1, letterSpacing: -1 }}>
            {s.titulo}
          </h1>
          {s.subtitulo && (
            <h2 style={{ fontSize: 22, fontWeight: 400, color: MUTED, margin: "12px 0 24px", lineHeight: 1.4 }}>
              {s.subtitulo}
            </h2>
          )}
          {!s.subtitulo && <div style={{ height: 24 }} />}
          {s.bullets && s.bullets.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {s.bullets.map((b, idx) => (
                <li key={idx} style={{ fontSize: 16, lineHeight: 1.5, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: ACCENT, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {b}
                </li>
              ))}
            </ul>
          )}
          {s.destaque && (
            <div style={{
              marginTop: 28,
              padding: "14px 22px",
              background: `linear-gradient(135deg, ${ACCENT}22, transparent)`,
              border: `1px solid ${ACCENT}55`,
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 600,
              color: ACCENT,
              display: "inline-block",
            }}>
              {s.destaque}
            </div>
          )}
          {isLast && (
            <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="https://wa.me/5581991594716?text=Oi%20Roberto%2C%20vi%20a%20demo%20do%20Sonar%20e%20quero%20marcar%20uma%20call" target="_blank" rel="noopener noreferrer" style={ctaPrimary}>
                💬 Marcar call no WhatsApp
              </a>
              <a href="https://sistema-trafego.vercel.app/plano" target="_blank" rel="noopener noreferrer" style={ctaSecondary}>
                Ver detalhes do plano
              </a>
            </div>
          )}
        </section>
        <section style={{ animation: "slide-in-right 0.5s ease both" }} key={`mock-${s.id}`}>
          {s.mockup}
        </section>
      </main>

      <footer style={{ padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${BORDER}`, position: "relative", zIndex: 2 }}>
        <button
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          style={navBtn(i === 0)}
        >
          ← Anterior
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              style={{
                width: idx === i ? 24 : 8,
                height: 8,
                borderRadius: 999,
                border: 0,
                background: idx === i ? ACCENT : "rgba(255,255,255,0.18)",
                cursor: "pointer",
                transition: "width 0.25s ease, background 0.2s ease",
                padding: 0,
              }}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => setI((v) => Math.min(SLIDES.length - 1, v + 1))}
          disabled={i === SLIDES.length - 1}
          style={navBtn(i === SLIDES.length - 1)}
        >
          Próximo →
        </button>
      </footer>

      <style jsx>{`
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 900px) {
          main { grid-template-columns: 1fr !important; padding: 16px !important; }
          h1 { font-size: 32px !important; }
        }
      `}</style>
    </div>
  );
}

const navBtn = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? "transparent" : SURFACE,
  border: `1px solid ${BORDER}`,
  color: disabled ? MUTED : TEXT,
  padding: "10px 18px",
  borderRadius: 999,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
  transition: "all 0.18s ease",
  fontFamily: "inherit",
});

const ctaPrimary: React.CSSProperties = {
  background: ACCENT,
  color: "#04140d",
  padding: "14px 22px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
const ctaSecondary: React.CSSProperties = {
  background: "transparent",
  color: TEXT,
  padding: "14px 22px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 500,
  fontSize: 14,
  border: `1px solid ${BORDER}`,
};

function BackgroundAurora() {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      background: `
        radial-gradient(ellipse 900px 600px at 12% 18%, ${ACCENT}1f, transparent 60%),
        radial-gradient(ellipse 800px 500px at 88% 82%, ${ACCENT}15, transparent 60%),
        radial-gradient(ellipse 700px 400px at 50% 50%, ${ACCENT}0a, transparent 70%)`,
      pointerEvents: "none",
      zIndex: 1,
    }} />
  );
}

function RadarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" stroke={ACCENT} strokeWidth="2" fill="none" opacity="0.4" />
      <circle cx="50" cy="50" r="30" stroke={ACCENT} strokeWidth="1.5" fill="none" opacity="0.3" />
      <circle cx="50" cy="50" r="14" stroke={ACCENT} strokeWidth="1.5" fill="none" opacity="0.5" />
      <g>
        <path d="M50,50 L94,50 A44,44 0 0 0 60,8 Z" fill={`url(#sweep)`} opacity="0.5" />
        <defs>
          <linearGradient id="sweep">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.7" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="4s" repeatCount="indefinite" />
      </g>
    </svg>
  );
}

function MockupShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
    }}>
      <div style={{
        padding: "10px 14px",
        background: "rgba(0,0,0,0.4)",
        borderBottom: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11,
        color: MUTED,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
        <span style={{ marginLeft: 14 }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function CapaMockup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
      <div style={{ position: "relative", width: 240, height: 240 }}>
        <svg width="240" height="240" viewBox="0 0 240 240">
          <circle cx="120" cy="120" r="110" stroke={ACCENT} strokeWidth="3" fill="none" opacity="0.35" />
          <circle cx="120" cy="120" r="80" stroke={ACCENT} strokeWidth="2" fill="none" opacity="0.5" />
          <circle cx="120" cy="120" r="45" stroke={ACCENT} strokeWidth="2" fill="none" opacity="0.7" />
          <g>
            <path d="M120,120 L230,120 A110,110 0 0 0 152,18 Z" fill={`url(#bigsweep)`} opacity="0.6" />
            <defs>
              <linearGradient id="bigsweep">
                <stop offset="0%" stopColor={ACCENT} stopOpacity="0.8" />
                <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
              </linearGradient>
            </defs>
            <animateTransform attributeName="transform" type="rotate" from="0 120 120" to="360 120 120" dur="5s" repeatCount="indefinite" />
          </g>
        </svg>
      </div>
      <div style={{ fontSize: 13, color: MUTED, textAlign: "center" }}>
        Centro de comando do seu atendimento
      </div>
    </div>
  );
}

function ProblemaMockup() {
  return (
    <MockupShell title="atendimento manual">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { tempo: "08:14", txt: "Oi, vi o anúncio. Quanto custa?" },
          { tempo: "09:52", txt: "?" },
          { tempo: "12:30", txt: "Boa tarde, ainda dá pra falar?" },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#444", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ background: "rgba(255,255,255,0.08)", padding: "8px 12px", borderRadius: 10, display: "inline-block", fontSize: 13 }}>
                {m.txt}
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>{m.tempo} — sem resposta</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 14, padding: 12, background: "#C9706422", border: "1px solid #C9706455", borderRadius: 8, fontSize: 12, color: "#E8B5AC" }}>
          ⚠️ Lead frio em 4h. CPL R$45 jogado fora.
        </div>
      </div>
    </MockupShell>
  );
}

function CaixaMockup() {
  return (
    <MockupShell title="Sonar / Atendimentos">
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <PillTab label="Abertos" badge="99" on />
        <PillTab label="Pendentes" badge="5" />
        <PillTab label="Fechados" badge="28" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { nome: "Erivan Santana", txt: "Quero saber sobre o ensaio", tags: ["Lead Quente"], cor: "#10b981" },
          { nome: "Diana", txt: "Olá! Tenho interesse...", tags: ["Em Follow Up"], cor: "#FBBF24" },
          { nome: "Sandra", txt: "Ok", tags: ["Follow Up feito"], cor: "#9B7DBF" },
        ].map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: 10, background: i === 0 ? "rgba(16,185,129,0.08)" : "transparent", borderRadius: 8, borderLeft: i === 0 ? `3px solid ${ACCENT}` : "3px solid transparent" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${c.cor}, ${ACCENT})`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
              <div style={{ fontSize: 11, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.txt}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {c.tags.map((t) => (
                  <span key={t} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 999, background: `${c.cor}22`, color: c.cor, border: `1px solid ${c.cor}55` }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </MockupShell>
  );
}

function PillTab({ label, badge, on }: { label: string; badge: string; on?: boolean }) {
  return (
    <div style={{
      padding: "6px 12px",
      borderRadius: 999,
      background: on ? TEXT : SURFACE,
      color: on ? BG_DEEP : MUTED,
      fontSize: 11,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 6,
      border: `1px solid ${BORDER}`,
    }}>
      {label}
      <span style={{ fontSize: 10, padding: "1px 6px", background: on ? "rgba(0,0,0,0.15)" : ACCENT, color: on ? BG_DEEP : "#04140d", borderRadius: 999, fontWeight: 700 }}>{badge}</span>
    </div>
  );
}

function IAMockup() {
  return (
    <MockupShell title="Sonar / IA Atendimento">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { nome: "Ana", desc: "Vendas — estúdio fotografia", on: true },
          { nome: "Qualificador", desc: "Qualifica e passa pra comercial", on: false },
        ].map((p, i) => (
          <div key={i} style={{ padding: 14, background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <strong style={{ fontSize: 14 }}>{p.nome}</strong>
              <div style={{
                width: 28,
                height: 16,
                background: p.on ? ACCENT : "#333",
                borderRadius: 999,
                position: "relative",
              }}>
                <div style={{
                  position: "absolute",
                  top: 2,
                  left: p.on ? 14 : 2,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.2s",
                }} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>{p.desc}</div>
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              <span style={tagStyle}>openai</span>
              <span style={tagStyle}>gpt 4o</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: 12, background: "rgba(155,125,191,0.12)", border: "1px solid rgba(155,125,191,0.30)", borderRadius: 8, fontSize: 11, color: "#C9A8E8" }}>
        🧠 BYOK · custo da IA = só o que tu paga na OpenAI
      </div>
    </MockupShell>
  );
}

const tagStyle: React.CSSProperties = {
  fontSize: 9,
  padding: "2px 8px",
  background: "rgba(155,125,191,0.20)",
  color: "#C9A8E8",
  borderRadius: 999,
};

function ToolsMockup() {
  return (
    <MockupShell title="Ferramentas IA">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { nome: "marcar_lead_ensaio", desc: "Aplica etiqueta quando cliente quer ensaio", on: true },
          { nome: "marcar_lead_restauracao", desc: "Aplica etiqueta quando cliente quer restauração", on: true },
          { nome: "transferir_para_humano", desc: "Pausa IA e passa pra fila de atendimento", on: true },
          { nome: "enviar_imagem_galeria", desc: "Mostra foto do portfolio pro cliente", on: false },
        ].map((t, i) => (
          <div key={i} style={{ padding: 10, background: SURFACE, borderRadius: 8, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: t.on ? TEXT : MUTED }}>{t.nome}</div>
              <div style={{ fontSize: 10.5, color: MUTED }}>{t.desc}</div>
            </div>
            <div style={{
              width: 28,
              height: 16,
              background: t.on ? ACCENT : "#333",
              borderRadius: 999,
              position: "relative",
              flexShrink: 0,
            }}>
              <div style={{
                position: "absolute",
                top: 2,
                left: t.on ? 14 : 2,
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#fff",
              }} />
            </div>
          </div>
        ))}
      </div>
    </MockupShell>
  );
}

function FollowupMockup() {
  return (
    <MockupShell title="Follow-up sequencial">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { ordem: 1, delay: "60s", txt: "Oi! Vi que você se interessou pelo ensaio. Quer marcar uma data?", status: "ENVIADA" },
          { ordem: 2, delay: "20min", txt: "Tô por aqui ainda se quiser tirar dúvidas 😊", status: "AGENDADA" },
          { ordem: 3, delay: "1h", txt: "Última oportunidade — promoção até hoje 23:59", status: "PENDENTE" },
        ].map((e) => (
          <div key={e.ordem} style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: e.status === "ENVIADA" ? ACCENT : "rgba(255,255,255,0.1)", color: e.status === "ENVIADA" ? BG_DEEP : MUTED, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
              {e.ordem}
            </div>
            <div style={{ flex: 1, padding: 10, background: SURFACE, borderRadius: 8, border: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: MUTED }}>+{e.delay} após anterior</span>
                <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 999, background: e.status === "ENVIADA" ? `${ACCENT}33` : "rgba(255,255,255,0.08)", color: e.status === "ENVIADA" ? ACCENT : MUTED, fontWeight: 600 }}>{e.status}</span>
              </div>
              <div style={{ fontSize: 12 }}>{e.txt}</div>
            </div>
          </div>
        ))}
      </div>
    </MockupShell>
  );
}

function LeadsMockup() {
  return (
    <MockupShell title="Leads Meta">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Kpi label="Total" valor="47" />
        <Kpi label="Conciliados" valor="38" cor={ACCENT} sub="81%" />
        <Kpi label="Órfãos" valor="6" cor="#FBBF24" />
        <Kpi label="Erros" valor="3" cor="#C97064" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { nome: "Maria Silva", tel: "55 11 98765-4321", camp: "Restauração - Janeiro", st: "conciliado" },
          { nome: "João Santos", tel: "55 81 99887-7665", camp: "Ensaio Gestante", st: "conciliado" },
          { nome: "Ana Costa", tel: "55 21 91234-5678", camp: "Capa Revista", st: "orfao" },
        ].map((l, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: SURFACE, borderRadius: 6, border: `1px solid ${BORDER}` }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{l.nome}</div>
              <div style={{ fontSize: 10, color: MUTED }}>{l.tel} · {l.camp}</div>
            </div>
            <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 999, background: l.st === "conciliado" ? `${ACCENT}33` : "rgba(251,191,36,0.20)", color: l.st === "conciliado" ? ACCENT : "#FBBF24", fontWeight: 600, alignSelf: "center" }}>
              {l.st}
            </span>
          </div>
        ))}
      </div>
    </MockupShell>
  );
}

function Kpi({ label, valor, cor, sub }: { label: string; valor: string; cor?: string; sub?: string }) {
  return (
    <div style={{ padding: 10, background: SURFACE, borderRadius: 8, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: cor || TEXT, marginTop: 4 }}>{valor}</div>
      {sub && <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MassaMockup() {
  return (
    <MockupShell title="Envio em Massa">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Field label="Canal" valor="Innova" />
        <Field label="Delay min" valor="20s" />
        <Field label="Delay max" valor="45s" />
      </div>
      <div style={{ padding: 12, background: SURFACE, borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 12, marginBottom: 10 }}>
        Olá [nome]! Tô passando pra avisar...
      </div>
      <div style={{ padding: 12, background: "rgba(201,112,100,0.10)", border: "1px solid rgba(201,112,100,0.30)", borderRadius: 8, fontSize: 11, color: "#E8B5AC" }}>
        ⚠️ Risco de bloqueio · WhatsApp pode banir números que enviam spam.
        <div style={{ marginTop: 6, color: ACCENT }}>✓ Configuração confortável: 20-45s entre envios, lotes de 50</div>
      </div>
    </MockupShell>
  );
}

function Field({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ padding: 10, background: SURFACE, borderRadius: 6, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, marginTop: 4, fontWeight: 500 }}>{valor}</div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <MockupShell title="Painel da Agência">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <KpiBig label="Faturamento" valor="R$ 542,18" cor={ACCENT} />
        <KpiBig label="Tickets" valor="8" />
        <KpiBig label="Serviços" valor="29" />
        <KpiBig label="Ticket Médio" valor="R$ 67,77" />
      </div>
      <div style={{ padding: 12, background: SURFACE, borderRadius: 8, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 10, color: MUTED, marginBottom: 6 }}>SATISFAÇÃO DOS CLIENTES</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: ACCENT }}>100%</div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "100%", background: ACCENT }} />
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>8 atendimentos analisados · 30 dias</div>
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

function KpiBig({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div style={{ padding: 12, background: SURFACE, borderRadius: 8, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 9, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: cor || TEXT, marginTop: 4 }}>{valor}</div>
      <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>30 dias</div>
    </div>
  );
}

function PrecoMockup() {
  return (
    <MockupShell title="Plano Pro">
      <div style={{
        background: `linear-gradient(135deg, ${ACCENT}33, transparent)`,
        border: `1px solid ${ACCENT}55`,
        borderRadius: 12,
        padding: 22,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>PRO</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: TEXT }}>R$ 29</div>
        <div style={{ fontSize: 14, color: MUTED }}>por mês · por conexão WhatsApp</div>
        <div style={{ marginTop: 18, padding: 12, background: "rgba(0,0,0,0.30)", borderRadius: 8, fontSize: 12, color: MUTED, textAlign: "left" }}>
          ✓ Caixa de entrada ilimitada<br />
          ✓ IA com SUA chave (BYOK)<br />
          ✓ Follow-up sequencial<br />
          ✓ Envio em massa anti-ban<br />
          ✓ Conciliação Meta automática<br />
          ✓ Multi-usuário sem extra
        </div>
      </div>
    </MockupShell>
  );
}

function ComecoMockup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[
        { n: 1, titulo: "Conecta WhatsApp", desc: "QR code escaneado em 30s — sua mesma conta" },
        { n: 2, titulo: "Importa contatos", desc: "Vem direto do WA Business com etiquetas" },
        { n: 3, titulo: "Atende ou liga IA", desc: "Comece manual e ative IA quando quiser" },
      ].map((p) => (
        <div key={p.n} style={{ display: "flex", gap: 14, padding: 16, background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: ACCENT, color: BG_DEEP, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
            {p.n}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{p.titulo}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{p.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CTAMockup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", justifyContent: "center", height: "100%" }}>
      <div style={{ fontSize: 72 }}>👋</div>
      <div style={{ fontSize: 14, color: MUTED, textAlign: "center", maxWidth: 340 }}>
        Sou o Roberto, técnico da plataforma. Te chamo no privado em 15min e mostro tudo na prática.
      </div>
      <div style={{ padding: "10px 18px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 999, fontSize: 12, color: MUTED }}>
        ⌨ Use ← → pra navegar slides
      </div>
    </div>
  );
}
