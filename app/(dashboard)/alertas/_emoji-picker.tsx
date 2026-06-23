"use client";

import { useState, useRef, useEffect } from "react";

const EMOJIS: { cat: string; itens: string[] }[] = [
  {
    cat: "Comuns",
    itens: [
      "👋", "🚨", "⚠️", "✅", "❌", "🔔", "📊", "💰",
      "💸", "💵", "📈", "📉", "🔥", "✨", "💡", "📌",
      "🎯", "🎉", "👀", "👍", "🙏", "🤝", "💪", "👏",
    ],
  },
  {
    cat: "Rostos",
    itens: [
      "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊",
      "🙂", "😉", "😍", "🥰", "😘", "😎", "🤔", "😏",
      "😬", "😢", "😭", "😡", "😱", "🥺", "🤗", "🤩",
    ],
  },
  {
    cat: "Símbolos",
    itens: [
      "❤️", "💚", "💛", "🧡", "💙", "💜", "🖤", "🤍",
      "💔", "❤‍🔥", "💯", "💢", "💬", "🗨️", "💭", "🔝",
      "✔️", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "🆗",
    ],
  },
];

interface Props {
  onPick: (emoji: string) => void;
  align?: "left" | "right";
}

export default function EmojiPicker({ onPick, align = "right" }: Props) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [aberto]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title="Inserir emoji"
        style={{
          background: "transparent",
          border: ".5px solid var(--mk-border)",
          borderRadius: 8,
          padding: "6px 9px",
          cursor: "pointer",
          color: "var(--mk-text-secondary)",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 13,
        }}
      >
        <span style={{ fontSize: 15 }}>😀</span>
        <span style={{ fontSize: 11.5, fontWeight: 600 }}>Emoji</span>
      </button>
      {aberto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            [align === "right" ? "right" : "left"]: 0,
            width: 280,
            maxHeight: 280,
            overflowY: "auto",
            background: "var(--mk-bg)",
            border: ".5px solid var(--mk-border)",
            borderRadius: 10,
            boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
            zIndex: 40,
            padding: 8,
          }}
        >
          {EMOJIS.map((g) => (
            <div key={g.cat} style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".5px",
                  color: "var(--mk-text-muted)",
                  padding: "4px 4px 6px",
                }}
              >
                {g.cat.toUpperCase()}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2 }}>
                {g.itens.map((e) => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => {
                      onPick(e);
                      setAberto(false);
                    }}
                    style={{
                      fontSize: 18,
                      padding: "5px 0",
                      borderRadius: 6,
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(ev) =>
                      ((ev.target as HTMLElement).style.background = "var(--mk-surface-2)")
                    }
                    onMouseLeave={(ev) =>
                      ((ev.target as HTMLElement).style.background = "transparent")
                    }
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
