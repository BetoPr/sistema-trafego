"use client";

import { useEffect, useState } from "react";

interface Passo {
  num: number;
  titulo: string;
  resumo: string;
  caminho: string;
  print: string;
  acoes: string[];
  labelAcoes?: string;
  resultado?: string;
  dica?: string;
  cor: string;
}

const ACCENT = "#00E19A";
const BG_DEEP = "#070b09";
const SURFACE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.10)";
const TEXT = "#FFFFFF";
const MUTED = "#9B9B9B";

const PASSOS: Passo[] = [
  {
    num: 1,
    titulo: "Conecte seu WhatsApp em menos de 1 minuto",
    resumo: "Transforme seu número em um canal capaz de atender, qualificar e responder clientes automaticamente.",
    caminho: "/canais",
    print: "/apresentacao/img/01-canais.png",
    acoes: [
      "Acesse Canais",
      "Clique em Novo Canal",
      "No celular, abra: WhatsApp → Aparelhos Conectados",
      "Escaneie o QR Code",
      "Quando aparecer Conectado, sua IA já pode conversar com clientes",
    ],
    resultado: "🟢 Conectado = seu número vira um canal de atendimento automático.",
    dica: "Mantenha o WhatsApp aberto durante a sincronização inicial.",
    cor: "#25D366",
  },
  {
    num: 2,
    titulo: "Traga toda sua base para dentro do Sonar",
    resumo: "Importe contatos e etiquetas do WhatsApp Business sem perder histórico ou organização.",
    caminho: "/contatos",
    print: "/apresentacao/img/09-contatos.png",
    acoes: [
      "Acesse Contatos",
      "Clique em Importar contatos e etiquetas",
      "Aguarde alguns segundos",
      "Sua base será sincronizada automaticamente",
    ],
    resultado: "✅ Sua IA já começa entendendo quem é cliente, lead, orçamento ou pós-venda.",
    dica: "Você pode importar quantas vezes quiser sem criar duplicações.",
    cor: "#25D366",
  },
  {
    num: 3,
    titulo: "Crie sua primeira atendente de IA",
    resumo: "Defina personalidade, conhecimento e comportamento da IA que vai falar com seus clientes.",
    caminho: "/ia-atendimento",
    print: "/apresentacao/img/10-perfil-topo.png",
    acoes: [
      "Acesse IA → Novo Perfil",
      "Escolha o provedor: OpenAI, Claude ou Groq",
      "Cole sua chave API",
      "Configure o prompt",
      "Salve",
    ],
    resultado: "✨ A partir daqui sua IA já sabe quem é, o que vende e como deve atender.",
    dica: "Quanto melhor o prompt, melhor a qualidade das conversas.",
    cor: "#9B7DBF",
  },
  {
    num: 4,
    titulo: "Teste sem risco para seus clientes",
    resumo: "Valide tudo primeiro no seu próprio número.",
    caminho: "/ia-atendimento → editar",
    print: "/apresentacao/img/11-whitelist.png",
    acoes: [
      "Abra o perfil da IA",
      "Preencha a Whitelist com seu número",
      "Salve",
      "Somente os números autorizados receberão respostas da IA",
    ],
    resultado: "🛡️ Você testa o fluxo inteiro antes de colocar em produção.",
    dica: "Enquanto houver números na whitelist, nenhum cliente real será impactado.",
    cor: "#FBBF24",
  },
  {
    num: 5,
    titulo: "Hora de conversar com sua IA",
    resumo: "Faça uma conversa real e valide que tudo está funcionando.",
    caminho: "/ia-atendimento → editar → Testar",
    print: "/apresentacao/img/10-perfil-topo.png",
    acoes: [
      "Clique em Testar chave API",
      "Confirme que a validação foi aprovada",
      "Envie uma mensagem para o WhatsApp conectado",
      "Aguarde a resposta automática",
    ],
    resultado: "🚀 Se a IA respondeu, seu atendimento automático está ativo.",
    dica: "Toda conversa também aparecerá em Atendimentos.",
    cor: "#00E19A",
  },
  {
    num: 6,
    titulo: "Liberar para clientes reais",
    resumo: "Coloque sua IA para trabalhar 24 horas por dia.",
    caminho: "/ia-atendimento → editar",
    print: "/apresentacao/img/10-perfil-topo.png",
    acoes: [
      "Volte ao perfil",
      "Remova todos os números da Whitelist",
      "Salve",
      "Pronto",
    ],
    resultado: "🎯 Agora qualquer pessoa que enviar mensagem pode ser atendida pela IA.",
    dica: "Caso precise pausar rapidamente, basta desativar o perfil.",
    cor: "#00E19A",
  },
  {
    num: 7,
    titulo: "Transforme uma IA em uma operação de vendas",
    resumo: "Ative recursos que aumentam conversão, velocidade e controle.",
    caminho: "/ia-atendimento → editar (rola pra baixo)",
    print: "/apresentacao/img/04-tools.png",
    labelAcoes: "Recursos",
    acoes: [
      "Ferramentas inteligentes — marcar leads, mover etapas e transferir para humanos",
      "Follow-up automático — a IA retoma conversas que esfriaram sem intervenção da equipe",
      "Resumo para equipe — ao transferir, a IA envia o contexto completo",
      "Galeria de mídia — mostre produtos, serviços e catálogos durante a conversa",
    ],
    resultado: "🚀 Sua operação está pronta. A IA capta, qualifica, responde e acompanha clientes automaticamente pelo WhatsApp.",
    dica: "Tudo é opcional. Funciona sem isso, mas multiplica conversão quando ativado.",
    cor: "#9B7DBF",
  },
];

// Trilha curta da jornada — mostrada como kicker (sensação de progresso)
const JORNADA = [
  "Conecte seu WhatsApp",
  "Traga sua base de contatos",
  "Crie sua atendente IA",
  "Teste com segurança",
  "Faça a primeira conversa",
  "Ative para clientes reais",
  "Escale sua operação",
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
                PASSO {p.num} · {JORNADA[p.num - 1]}
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
            {p.labelAcoes || "O que fazer"}
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

          {p.resultado && (
            <div style={{
              marginTop: 18,
              padding: "13px 16px",
              background: `linear-gradient(135deg, ${p.cor}26, ${p.cor}0a)`,
              border: `1px solid ${p.cor}`,
              borderRadius: 10,
              fontSize: 13.5,
              lineHeight: 1.5,
              fontWeight: 600,
            }}>
              {p.resultado}
            </div>
          )}

          {p.dica && (
            <div style={{
              marginTop: 12,
              padding: "12px 14px",
              background: SURFACE,
              border: `1px solid ${BORDER}`,
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
