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

/** Redimensiona/recomprime imagem no navegador pra caber no limite de upload. */
async function comprimirImagem(file: File): Promise<File> {
  if (file.size <= 1.5 * 1024 * 1024) return file; // já pequena
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const maxDim = 1600;
  const escala = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * escala));
  const h = Math.max(1, Math.round(img.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.85));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" });
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
  const [dragOver, setDragOver] = useState(false);
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
        // Comprime no navegador antes de subir — evita estourar o limite do
        // servidor (Server Action / Vercel ~4.5MB). Fotos grandes (restauração)
        // são redimensionadas; qualidade ótima pro WhatsApp.
        let fileUp = f;
        try { fileUp = await comprimirImagem(f); } catch { fileUp = f; }
        if (fileUp.size > 4 * 1024 * 1024) {
          setErro(`"${f.name}" ainda ficou grande demais (>4MB) após otimizar. Tente uma imagem menor.`);
          continue;
        }
        const fd = new FormData();
        fd.set("ferramenta_id", ferramentaId);
        fd.set("nome", f.name.replace(/\.[^/.]+$/, ""));
        fd.set("file", fileUp);
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
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  // Reordena de forma persistida (usado por subir/descer e "tornar primeira")
  function aplicarOrdem(arr: ImagemGaleria[]) {
    const reord = arr.map((im, i) => ({ ...im, ordem: i }));
    setImagens(reord);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("ferramenta_id", ferramentaId);
      fd.set("ordem_json", JSON.stringify(reord.map((x) => ({ id: x.id, ordem: x.ordem }))));
      await reordenarImagemGaleria(fd);
    });
  }

  // Define a posição de envio digitando o número (1 = primeira/capa)
  function definirPosicao(id: string, valor: string) {
    const n = parseInt(valor, 10);
    if (isNaN(n)) return;
    const destino = Math.max(0, Math.min(imagens.length - 1, n - 1)); // 0-based, clamped
    const idx = imagens.findIndex((x) => x.id === id);
    if (idx < 0 || idx === destino) return;
    const arr = [...imagens];
    const [item] = arr.splice(idx, 1);
    arr.splice(destino, 0, item);
    aplicarOrdem(arr);
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
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? "#10b981" : "var(--mk-border)"}`,
          borderRadius: 8,
          padding: 18,
          textAlign: "center",
          background: dragOver ? "rgba(16,185,129,0.10)" : "var(--mk-surface-2)",
          cursor: "pointer",
          transition: "background 0.15s ease, border-color 0.15s ease",
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
        <i className={`ti ${dragOver ? "ti-photo-down" : "ti-cloud-upload"}`} style={{ fontSize: 26, color: dragOver ? "#10b981" : undefined, opacity: dragOver ? 1 : 0.6 }} />
        <div style={{ fontSize: 12.5, marginTop: 6, fontWeight: dragOver ? 600 : 400, color: dragOver ? "#10b981" : "var(--mk-text-muted)" }}>
          {enviando ? "Enviando..." : dragOver ? "Solte aqui pra adicionar" : "Arraste uma ou VÁRIAS imagens aqui, ou clique pra selecionar"}
        </div>
        {!enviando && !dragOver && (
          <div style={{ fontSize: 10.5, marginTop: 2, color: "var(--mk-text-muted)" }}>
            Pode soltar várias de uma vez · máx 10MB cada
          </div>
        )}
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
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-list-numbers" style={{ color: "#10b981" }} />
            A IA envia <strong style={{ color: "var(--mk-text)" }}>nesta ordem</strong> (1ª = capa). Digite o número à direita de cada foto pra definir a posição de envio.
          </div>
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
              <div style={{ position: "relative", flexShrink: 0, width: 80, height: 80, overflow: "hidden", borderRadius: 4, background: "var(--mk-surface-2)" }}>
                {im.signed_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={im.signed_url} alt={im.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : null}
                <span style={{ position: "absolute", top: 3, left: 3, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: idx === 0 ? "#10b981" : "rgba(0,0,0,0.7)", color: idx === 0 ? "#04140d" : "#fff", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {idx === 0 && <i className="ti ti-star-filled" style={{ fontSize: 9 }} />}
                  {idx + 1}º{idx === 0 ? " · CAPA" : ""}
                </span>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                <input
                  type="number"
                  key={`pos-${im.id}-${idx}`}
                  defaultValue={idx + 1}
                  min={1}
                  max={imagens.length}
                  disabled={pending}
                  onBlur={(e) => definirPosicao(im.id, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); definirPosicao(im.id, (e.target as HTMLInputElement).value); } }}
                  title="Posição de envio (1 = primeira/capa). Digite e tecle Enter."
                  style={{ width: 38, textAlign: "center", padding: "4px 2px", fontSize: 12, fontWeight: 700, border: "0.5px solid var(--mk-border)", borderRadius: 6, background: "var(--mk-surface-2)", color: "var(--mk-text)" }}
                />
                <div style={{ display: "flex", gap: 2 }}>
                  <button type="button" onClick={() => mover(im.id, -1)} disabled={idx === 0 || pending} className="ghost-btn" style={{ fontSize: 11, padding: "2px 4px" }} title="subir">
                    <i className="ti ti-arrow-up" />
                  </button>
                  <button type="button" onClick={() => mover(im.id, 1)} disabled={idx === imagens.length - 1 || pending} className="ghost-btn" style={{ fontSize: 11, padding: "2px 4px" }} title="descer">
                    <i className="ti ti-arrow-down" />
                  </button>
                </div>
                <button type="button" onClick={() => remover(im.id)} disabled={pending} className="ghost-btn" style={{ fontSize: 11, padding: "2px 8px", color: "#C97064" }} title="remover">
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
