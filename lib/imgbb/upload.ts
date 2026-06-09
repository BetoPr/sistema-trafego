/**
 * ImgBB upload helper.
 * Plano gratuito: uploads ilimitados, retenção permanente, 32MB/imagem.
 * Não bloqueia o banco — só guardamos a URL final.
 */
export interface ImgbbResult {
  url: string;         // i.ibb.co/.../foto.jpg
  url_viewer: string;  // ibb.co/...
  delete_url: string;
  thumb_url?: string;
}

const ENDPOINT = "https://api.imgbb.com/1/upload";

export async function uploadImageToImgbb(opts: {
  base64: string;      // base64 puro (sem prefixo data:)
  filename?: string;
  expirationSeconds?: number; // opcional. omitido = permanente
}): Promise<ImgbbResult> {
  const key = process.env.IMGBB_API_KEY;
  if (!key) throw new Error("IMGBB_API_KEY ausente");

  const raw = opts.base64.includes(",") ? opts.base64.split(",")[1] : opts.base64;

  const form = new URLSearchParams();
  form.set("image", raw);
  if (opts.filename) form.set("name", opts.filename.replace(/\.[^.]+$/, "").slice(0, 60));

  const url = opts.expirationSeconds
    ? `${ENDPOINT}?key=${key}&expiration=${opts.expirationSeconds}`
    : `${ENDPOINT}?key=${key}`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`imgbb_${r.status}: ${txt.slice(0, 200)}`);
  }
  const j = (await r.json()) as {
    data?: {
      url?: string;
      url_viewer?: string;
      delete_url?: string;
      thumb?: { url?: string };
    };
  };

  const data = j.data || {};
  if (!data.url) throw new Error("imgbb_resposta_sem_url");

  return {
    url: data.url,
    url_viewer: data.url_viewer || "",
    delete_url: data.delete_url || "",
    thumb_url: data.thumb?.url,
  };
}

/**
 * Faz upload a partir de uma URL pública (ex: URL crua que veio da UAZAPI).
 * Baixa pra Buffer e re-envia em base64.
 */
export async function uploadImageFromUrlToImgbb(opts: {
  sourceUrl: string;
  filename?: string;
  expirationSeconds?: number;
}): Promise<ImgbbResult> {
  const r = await fetch(opts.sourceUrl);
  if (!r.ok) throw new Error(`imgbb_baixar_${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return uploadImageToImgbb({
    base64: buf.toString("base64"),
    filename: opts.filename,
    expirationSeconds: opts.expirationSeconds,
  });
}
