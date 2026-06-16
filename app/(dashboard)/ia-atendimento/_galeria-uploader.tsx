"use client";

import { useState, useRef, useTransition } from "react";
import {
  uploadImagemGaleria,
  deletarImagemGaleria,
  atualizarImagemGaleria,
  reordenarImagemGaleria,
} from "./_actions";

export interface ImagemGaleria {
  id: string;
  nome: string;
  descricao: string;
  tags: string[];
  url_storage: string;
  mime: string;
  ordem: number;
  signed_url?: string | null;
}

export default function GaleriaUploader({
  ferramentaId,
  imagens: imagensIniciais,
}: {
  ferramentaId: string;
  imagens: ImagemGaleria[];
}) {
  const [imagens, setImagens] = useState<ImagemGaleria[]>(imagensIniciais || []);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setErro(null);
    setEnviando(true);
    try {
      const arr = Array.from(files);
      for (const f of arr) {
        if (!f.type.startsWith("image/")) {
          setErro(`"${f.name}" não é imagem.`);
          continue;
        }
        if (f.size > 10 * 1024 * 1024) {
          setErro(`"${f.name}" maior que 10MB.`);
          continue;
        }
        const fd = new FormData();
        fd.set("ferramenta_id", ferramentaId);
        fd.set("nome", f.name.replace(/\.[^/.]+$/, ""));
        fd.set("file", f);
        const r = await uploadImagemGaleria(fd);
        if (!r.ok) {
          setErro(r.error || "erro no upload");
          continue;
        }
        if (r.imagem) setImagens((prev) => [...prev, r.imagem!]);
      }
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  function atualizarCampo(id: string, campo: "nome" | "descricao" | "tags", valor: string) {
    setImagens((prev) =>
      prev.map((im) =>
        im.id === id
          ? {
              ...im,
              [campo]: campo === "tags" ? valor.split(",").map((t) => t.trim()).filter(Boolean) : valor,
            }
          : im,
      ),
    );
  }

  function salvarCampos(im: ImagemGaleria) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", im.id);
      fd.set("nome", im.nome);
      fd.set("descricao", im.descricao);
      fd.set("tags", (im.tags || []).join(","));
      await atualizarImagemGaleria(fd);
    });
  }

  function remover(id: string) {
    if (!confirm("Remover esta imagem?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const r = await deletarImagemGaleria(fd);
      if (r.ok) setImagens((prev) => prev.filter((x) => x.id !== id));
      else setErro(r.error || "erro ao remover");
    });
  }

  function mover(id: string, dir: -1 | 1) {
    const idx = imagens.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const novo = idx + dir;
    if (novo < 0 || novo >= imagens.length) return;
    const arr = [...imagens];
    [arr[idx], arr[novo]] = [arr[novo], arr[idx]];
    const reord = arr.map((im, i) => ({ ...im, ordem: i }));
    setImagens(reord);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("ferramenta_id", ferramentaId);
      fd.set("ordem_json", JSON.stringify(reord.map((x) => ({ id: x.id, ordem: x.ordem }))));
      await reordenarImagemGaleria(fd);
    });
  }

  const inp: React.CSSProperties = {
    width: "100%",
    padding: 6,
    fontSize: 12,
    border: "0.5px solid var(--mk-border)",
    borderRadius: 4,
    background: "var(--mk-surface-2)",
    color: "var(--mk-text)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{
          border: "2px dashed var(--mk-border)",
          borderRadius: 8,
          padding: 16,
          textAlign: "center",
          background: "var(--mk-surface-2)",
          cursor: "pointer",
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <i className="ti ti-cloud-upload" style={{ fontSize: 24, opacity: 0.6 }} />
        <div style={{ fontSize: 12, marginTop: 6, color: "var(--mk-text-muted)" }}>
          {enviando ? "Enviando..." : "Arraste imagens aqui ou clique para selecionar (max 10MB cada)"}
        </div>
      </div>

      {erro && (
        <div style={{ fontSize: 12, color: "#C97064" }}>
          <i className="ti ti-alert-triangle" /> {erro}
        </div>
      )}

      {imagens.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--mk-text-muted)", textAlign: "center", padding: 12 }}>
          Nenhuma imagem ainda. A IA só pode enviar quando houver pelo menos 1.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {imagens.map((im, idx) => (
            <div
              key={im.id}
              style={{
                display: "flex",
                gap: 10,
                padding: 8,
                background: "var(--mk-surface)",
                borderRadius: 6,
                border: "0.5px solid var(--mk-border)",
              }}
            >
              <div style={{ flexShrink: 0, width: 80, height: 80, overflow: "hidden", borderRadius: 4, background: "var(--mk-surface-2)" }}>
                {im.signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={im.signed_url} alt={im.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : null}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <input
                  value={im.nome}
                  onChange={(e) => atualizarCampo(im.id, "nome", e.target.value)}
                  onBlur={() => salvarCampos(im)}
                  placeholder="nome curto (ex: plano_basico)"
                  style={inp}
                />
                <textarea
                  value={im.descricao}
                  onChange={(e) => atualizarCampo(im.id, "descricao", e.target.value)}
                  onBlur={() => salvarCampos(im)}
                  placeholder="descrição pra IA decidir quando enviar"
                  rows={2}
                  style={{ ...inp, resize: "vertical" }}
                />
                <input
                  value={(im.tags || []).join(", ")}
                  onChange={(e) => atualizarCampo(im.id, "tags", e.target.value)}
                  onBlur={() => salvarCampos(im)}
                  placeholder="tags separadas por vírgula (ex: preço, plano)"
                  style={{ ...inp, fontSize: 11 }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button type="button" onClick={() => mover(im.id, -1)} disabled={idx === 0 || pending} className="ghost-btn" style={{ fontSize: 11, padding: "2px 6px" }} title="subir">
                  <i className="ti ti-arrow-up" />
                </button>
                <button type="button" onClick={() => mover(im.id, 1)} disabled={idx === imagens.length - 1 || pending} className="ghost-btn" style={{ fontSize: 11, padding: "2px 6px" }} title="descer">
                  <i className="ti ti-arrow-down" />
                </button>
                <button type="button" onClick={() => remover(im.id)} disabled={pending} className="ghost-btn" style={{ fontSize: 11, padding: "2px 6px", color: "#C97064" }} title="remover">
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
