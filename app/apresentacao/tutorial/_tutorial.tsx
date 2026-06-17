"use client";

import { useEffect, useState } from "react";

interface Passo {
  num: number;
  titulo: string;
  resumo: string;
  caminho: string;
  print: string;
  acoes: string[];
  dica?: string;
  cor: string;
}

const ACCENT = "#10b981";
const BG_DEEP = "#070b09";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.10)";
const TEXT = "#FFFFFF";
const MUTED = "#9B9B9B";

const PASSOS: Passo[] = [
  {
    num: 1,
    titulo: "Conecta WhatsApp",
    resumo: "Cria canal e escaneia QR code com teu celular",
    caminho: "/canais",
    print: "/apresentacao/img/01-canais.png",
    acoes: [
      "Vai em /canais no menu lateral",
      "Clica 'Novo canal' (cria conexão)",
      "Pega o celular, abre WhatsApp → ⋮ → Aparelhos conectados",
      "Escaneia o QR code que aparece na tela",
      "Aguarda status virar verde: connected ✓",
    ],
    dica: "iOS pode demorar 30-60s pra terminar sincronização. Deixa o app aberto.",
    cor: "#25D366",
  },
  {
    num: 2,
    titulo: "Importa contatos (opcional, mas RECOMENDADO)",
    resumo: "Puxa contatos + etiquetas do WhatsApp Business em 1 clique",
    caminho: "/contatos",
    print: "/apresentacao/img/09-contatos.png",
    acoes: [
      "Vai em /contatos",
      "Card verde no topo: 'Importe seus contatos e etiquetas do WhatsApp Business'",
      "Clica 'Importar' — leva ~5 segundos",
      "Resultado: todos teus contatos + etiquetas já existentes no DB",
    ],
    dica: "Idempotente. Pode rodar várias vezes — não duplica.",
    cor: "#25D366",
  },
  {
    num: 3,
    titulo: "Cria perfil IA",
    resumo: "Configura provider + chave API + prompt de atendimento",
    caminho: "/ia-atendimento",
    print: "/apresentacao/img/10-perfil-topo.png",
    acoes: [
      "Vai em /ia-atendimento → 'Novo perfil'",
      "Aplica template se houver (preenche prompt+provider automático)",
      "Escolhe Provider: OpenAI, Anthropic (Claude) ou Groq",
      "Cola chave API: clica nos links 'Pegar chave OpenAI' / Anthropic / Groq",
      "Botão olho confere prefixo da chave (sk-proj- / sk-ant- / gsk_)",
      "Salva",
    ],
    dica: "BYOK: chave fica criptografada no DB. Custo é teu direto com o provider, sem markup.",
    cor: "#9B7DBF",
  },
  {
    num: 4,
    titulo: "Modo teste (whitelist)",
    resumo: "IA só responde teu número enquanto tu testa",
    caminho: "/ia-atendimento → editar",
    print: "/apresentacao/img/11-whitelist.png",
    acoes: [
      "Fieldset 'Modo teste — Whitelist'",
      "Coloca SEU número (1 por linha, ex: 5581991594716)",
      "Salva",
      "IA agora só responde nesse número — todos outros leads ficam intactos",
    ],
    dica: "Banner amarelo 'MODO TESTE ATIVO' aparece na tela enquanto whitelist tem números.",
    cor: "#FBBF24",
  },
  {
    num: 5,
    titulo: "Testa",
    resumo: "Valida chave + manda mensagem real pelo WhatsApp",
    caminho: "/ia-atendimento → editar → Testar",
    print: "/apresentacao/img/10-perfil-topo.png",
    acoes: [
      "Clica 'Testar chave API agora' — valida em ~2s",
      "Se mostrar Falha, mensagem te diz qual o problema (provider errado, chave inválida, etc)",
      "Se OK: pega celular e manda 'oi' pelo WhatsApp pro número conectado",
      "IA responde em 3-8s automático no chat",
    ],
    dica: "Tudo aparece também em /atendimentos como ticket normal.",
    cor: "#10b981",
  },
  {
    num: 6,
    titulo: "Produção",
    resumo: "Limpa whitelist → IA atende qualquer lead",
    caminho: "/ia-atendimento → editar",
    print: "/apresentacao/img/10-perfil-topo.png",
    acoes: [
      "Volta no perfil → fieldset 'Modo teste — Whitelist'",
      "APAGA todos os números (deixa vazio)",
      "Salva",
      "Banner MODO TESTE desaparece",
      "Daqui em diante: qualquer pessoa que mandar mensagem → IA responde",
    ],
    dica: "Se algo der errado, ativa o perfil em OFF no card (toggle) ou recoloca teu número na whitelist.",
    cor: "#10b981",
  },
  {
    num: 7,
    titulo: "Configurações finas (depois)",
    resumo: "Ferramentas + Follow-up + Resumo Groq pra próximos níveis",
    caminho: "/ia-atendimento → editar (rola pra baixo)",
    print: "/apresentacao/img/04-tools.png",
    acoes: [
      "Ferramentas custom: marcar_lead_quente, marcar_lead_frio, transferir_para_humano",
      "Follow-up sequencial: lead esfriou? IA reaquece sozinha com 1-3 msgs",
      "Envio de resumo Groq: quando IA passa pra humano, envia resumo da conversa no grupo do time",
      "Galeria de imagens: IA pode mostrar foto de produto/serviço durante conversa",
    ],
    dica: "Tudo é opcional. Funciona sem isso, mas multiplica conversão quando ativado.",
    cor: "#9B7DBF",
  },
];

export default function Tutorial() {
  const [i, setI] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") setI((v) => Math.min(PASSOS.length - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
      if (e.key === "Home") setI(0);
      if (e.key === "End") setI(PASSOS.length - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const p = PASSOS[i];
  const isLast = i === PASSOS.length - 1;

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
      <div style={{
        position: "absolute",
        inset: 0,
        background: `
          radial-gradient(ellipse 900px 600px at 12% 18%, ${ACCENT}1f, transparent 60%),
          radial-gradient(ellipse 800px 500px at 88% 82%, ${ACCENT}15, transparent 60%)`,
        pointerEvents: "none",
        zIndex: 1,
      }} />

      <header style={{ padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18, letterSpacing: 4 }}>
          📚 SONAR · TUTORIAL
        </div>
        <div style={{ fontSize: 11, color: MUTED, letterSpacing: 1, textTransform: "uppercase" }}>
          Passo {i + 1} de {PASSOS.length}
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", position: "relative", zIndex: 2 }}>
        <div style={{
          height: "100%",
          width: `${((i + 1) / PASSOS.length) * 100}%`,
          background: ACCENT,
          transition: "width 0.4s ease",
        }} />
      </div>

      <main style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "minmax(0, 420px) minmax(0, 1.4fr)",
        gap: 40,
        padding: "30px 60px 30px",
        alignItems: "center",
        position: "relative",
        zIndex: 2,
      }}>
        {/* Coluna esquerda — texto */}
        <section style={{ animation: "slide-in-left 0.45s ease both" }} key={`text-${p.num}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${p.cor}, ${p.cor}99)`,
              color: "#04140d",
              fontWeight: 700,
              fontSize: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 8px 24px ${p.cor}40`,
            }}>
              {p.num}
            </div>
            <div>
              <div style={{ fontSize: 10, color: p.cor, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
                PASSO {p.num}
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.15, letterSpacing: -0.5 }}>
                {p.titulo}
              </h1>
            </div>
          </div>

          <div style={{ fontSize: 14, color: MUTED, marginBottom: 16, lineHeight: 1.5 }}>
            {p.resumo}
          </div>

          <div style={{
            fontSize: 11,
            padding: "6px 10px",
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            display: "inline-block",
            color: MUTED,
            fontFamily: "monospace",
            marginBottom: 18,
          }}>
            📍 {p.caminho}
          </div>

          <div style={{ fontSize: 12, color: MUTED, fontWeight: 700, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
            O que fazer
          </div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
            {p.acoes.map((acao, idx) => (
              <li key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.45 }}>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  color: p.cor,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: 1,
                }}>
                  {idx + 1}
                </span>
                <span>{acao}</span>
              </li>
            ))}
          </ol>

          {p.dica && (
            <div style={{
              marginTop: 18,
              padding: "12px 14px",
              background: `linear-gradient(135deg, ${p.cor}22, transparent)`,
              border: `1px solid ${p.cor}55`,
              borderRadius: 10,
              fontSize: 12,
              lineHeight: 1.5,
              display: "flex",
              gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <span><strong style={{ color: p.cor }}>Dica:</strong> {p.dica}</span>
            </div>
          )}

          {isLast && (
            <div style={{ marginTop: 22 }}>
              <a href="https://sistema-trafego.vercel.app/ia-atendimento" target="_blank" rel="noopener noreferrer" style={{
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
              }}>
                🚀 Abrir CRM e criar perfil IA
              </a>
            </div>
          )}
        </section>

        {/* Coluna direita — print real */}
        <section style={{ animation: "slide-in-right 0.45s ease both" }} key={`pic-${p.num}`}>
          <div style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
            position: "relative",
          }}>
            <div style={{
              padding: "10px 14px",
              background: "rgba(0,0,0,0.5)",
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
              <span style={{ marginLeft: 14, fontFamily: "monospace" }}>sistema-trafego.vercel.app{p.caminho.replace("→ editar", "/ia-atendimento?editar=...").split(" ")[0]}</span>
            </div>
            <img
              src={p.print}
              alt={`Print do passo ${p.num}: ${p.titulo}`}
              style={{ width: "100%", display: "block", aspectRatio: "1280 / 854", objectFit: "cover" }}
            />
            {/* Highlight overlay com numero */}
            <div style={{
              position: "absolute",
              top: 18,
              right: 18,
              background: `linear-gradient(135deg, ${p.cor}, ${p.cor}cc)`,
              color: "#04140d",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              boxShadow: `0 6px 18px ${p.cor}55`,
            }}>
              PASSO {p.num}
            </div>
          </div>
        </section>
      </main>

      <footer style={{ padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${BORDER}`, position: "relative", zIndex: 2 }}>
        <button
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          style={navBtn(i === 0)}
        >
          ← Anterior
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          {PASSOS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              style={{
                width: idx === i ? 28 : 10,
                height: 10,
                borderRadius: 999,
                border: 0,
                background: idx === i ? ACCENT : idx < i ? `${ACCENT}66` : "rgba(255,255,255,0.18)",
                cursor: "pointer",
                transition: "width 0.25s ease, background 0.2s ease",
                padding: 0,
              }}
              aria-label={`Passo ${idx + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => setI((v) => Math.min(PASSOS.length - 1, v + 1))}
          disabled={i === PASSOS.length - 1}
          style={navBtn(i === PASSOS.length - 1)}
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
        @media (max-width: 1024px) {
          main { grid-template-columns: 1fr !important; padding: 20px !important; gap: 20px !important; }
          h1 { font-size: 22px !important; }
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
