"use client";

import { useRef, useState, useTransition } from "react";
import { salvarAvatar, removerAvatar } from "./_actions";

/**
 * Avatar do usuário: troca/remove foto de perfil.
 * Comprime no navegador (recorta quadrado central + 400px + JPEG 0.85) antes
 * de mandar pro server action — foto fica leve e quadrada.
 */
export default function AvatarForm({ nome, avatarUrl }: { nome: string; avatarUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [pending, start] = useTransition();
  const iniciais = (nome || "?").slice(0, 2).toUpperCase();

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reescolher o mesmo arquivo
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Escolha uma imagem (JPG, PNG…)."); return; }

    let foto: File;
    try { foto = await comprimir(file); } catch { foto = file; }
    setPreview(URL.createObjectURL(foto));

    const fd = new FormData();
    fd.append("foto", foto);
    start(() => { void salvarAvatar(fd); });
  }

  function remover() {
    if (!confirm("Remover foto de perfil? Volta pra inicial.")) return;
    setPreview(null);
    start(() => { void removerAvatar(); });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "rgba(155,125,191,0.25)", color: "#9B7DBF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 24, flexShrink: 0, position: "relative" }}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Foto de perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : iniciais}
        {pending && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ti ti-loader" style={{ color: "#fff", fontSize: 18 }} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input ref={inputRef} type="file" accept="image/*" onChange={aoEscolher} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={pending} className="ghost-btn" style={{ fontSize: 12 }}>
            <i className={`ti ${pending ? "ti-loader" : "ti-camera"}`} /> {pending ? "Enviando…" : "Trocar foto"}
          </button>
          {preview && (
            <button type="button" onClick={remover} disabled={pending} className="ghost-btn" style={{ fontSize: 12, color: "#C97064" }}>
              <i className="ti ti-trash" /> Remover
            </button>
          )}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>JPG/PNG · recorta quadrado · máx 5MB.</div>
      </div>
    </div>
  );
}

async function comprimir(file: File): Promise<File> {
  const img = await carregarImg(file);
  const lado = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - lado) / 2;
  const sy = (img.naturalHeight - lado) / 2;
  const destino = 400;
  const canvas = document.createElement("canvas");
  canvas.width = destino;
  canvas.height = destino;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, sx, sy, lado, lado, 0, 0, destino, destino);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  if (!blob) return file;
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

function carregarImg(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
