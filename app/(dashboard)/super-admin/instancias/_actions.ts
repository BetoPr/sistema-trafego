"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { adminListInstances } from "@/lib/uazapi/client";
import { audit } from "@/lib/crm/audit";

interface ServidorRow {
  id: string;
  nome: string;
  base_url: string;
  admin_token_encrypted: unknown;
}

export interface InstanciaListagem {
  id: string;
  name: string;
  status: string;
  profileName: string | null;
  numberConectado: string | null;
  qrcode: string | null;
  servidorId: string;
  servidorNome: string;
  favorita: boolean;
  visivel: boolean;
  alias: string | null;
  observacoes: string | null;
}

/**
 * Lista instâncias de um servidor (ou todos ativos) + cruza com a tabela
 * de visibilidade/favoritos do super_admin.
 */
export async function listarInstanciasServidores(params: {
  servidorId?: string;
  apenasVisiveis?: boolean;
  apenasFavoritas?: boolean;
  busca?: string;
}): Promise<InstanciaListagem[]> {
  await requireSuperAdmin();
  const sb = createServiceClient();

  let q = sb
    .from("super_admin_servidores")
    .select("id, nome, base_url, admin_token_encrypted")
    .eq("ativo", true);
  if (params.servidorId) q = q.eq("id", params.servidorId);
  const { data: servidores } = await q;
  if (!servidores || servidores.length === 0) return [];

  const { data: marcacoes } = await sb
    .from("super_admin_instancias_visiveis")
    .select("servidor_id, instance_id, alias, visivel, favorita, observacoes");
  const marcMap = new Map<string, { alias: string | null; visivel: boolean; favorita: boolean; observacoes: string | null }>();
  for (const m of marcacoes || []) {
    marcMap.set(`${m.servidor_id}|${m.instance_id}`, {
      alias: m.alias,
      visivel: m.visivel,
      favorita: m.favorita,
      observacoes: m.observacoes,
    });
  }

  const out: InstanciaListagem[] = [];
  const buscaLow = params.busca?.toLowerCase() || "";

  for (const s of servidores as ServidorRow[]) {
    try {
      const adminToken = decryptToken(byteaToBuffer(s.admin_token_encrypted));
      const instancias = await adminListInstances({ baseUrl: s.base_url, adminToken });
      for (const i of instancias) {
        const key = `${s.id}|${i.id}`;
        const m = marcMap.get(key) || { alias: null, visivel: true, favorita: false, observacoes: null };

        if (params.apenasVisiveis && !m.visivel) continue;
        if (params.apenasFavoritas && !m.favorita) continue;

        const nome = m.alias || i.name || i.id;
        const numero = i.jid?.user || null;
        const profile = i.profileName || null;

        if (buscaLow) {
          const hay = [nome, i.id, numero || "", profile || "", i.status || ""].join(" ").toLowerCase();
          if (!hay.includes(buscaLow)) continue;
        }

        out.push({
          id: i.id,
          name: nome,
          status: i.status || "unknown",
          profileName: profile,
          numberConectado: numero,
          qrcode: i.qrcode || null,
          servidorId: s.id,
          servidorNome: s.nome,
          favorita: m.favorita,
          visivel: m.visivel,
          alias: m.alias,
          observacoes: m.observacoes,
        });
      }
    } catch (e) {
      console.error(`[instancias] servidor ${s.nome}:`, e);
    }
  }

  // Favoritas no topo, depois alfabético
  out.sort((a, b) => {
    if (a.favorita !== b.favorita) return a.favorita ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

export async function alternarFavorita(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const servidorId = String(formData.get("servidor_id") || "");
  const instanceId = String(formData.get("instance_id") || "");
  const valor = formData.get("favorita") === "true";

  const sb = createServiceClient();
  await sb
    .from("super_admin_instancias_visiveis")
    .upsert(
      {
        servidor_id: servidorId,
        instance_id: instanceId,
        favorita: !valor,
        marcado_por: ctx.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "servidor_id,instance_id" },
    );

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "config_change",
    entidade: "instancia_visivel",
    entidadeId: instanceId,
    payload: { favorita: !valor },
  });
  revalidatePath("/super-admin/instancias");
  redirect(`/super-admin/instancias?ok=fav`);
}

export async function alternarVisivel(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const servidorId = String(formData.get("servidor_id") || "");
  const instanceId = String(formData.get("instance_id") || "");
  const valor = formData.get("visivel") === "true";

  const sb = createServiceClient();
  await sb
    .from("super_admin_instancias_visiveis")
    .upsert(
      {
        servidor_id: servidorId,
        instance_id: instanceId,
        visivel: !valor,
        marcado_por: ctx.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "servidor_id,instance_id" },
    );
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "config_change", entidade: "instancia_visivel", entidadeId: instanceId, payload: { visivel: !valor } });
  revalidatePath("/super-admin/instancias");
  redirect("/super-admin/instancias?ok=vis");
}

export async function salvarAlias(formData: FormData) {
  const ctx = await requireSuperAdmin();
  const servidorId = String(formData.get("servidor_id") || "");
  const instanceId = String(formData.get("instance_id") || "");
  const alias = String(formData.get("alias") || "").trim() || null;
  const observacoes = String(formData.get("observacoes") || "").trim() || null;

  const sb = createServiceClient();
  await sb
    .from("super_admin_instancias_visiveis")
    .upsert(
      {
        servidor_id: servidorId,
        instance_id: instanceId,
        alias,
        observacoes,
        marcado_por: ctx.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "servidor_id,instance_id" },
    );
  await audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "config_change", entidade: "instancia_visivel", entidadeId: instanceId, payload: { alias } });
  revalidatePath("/super-admin/instancias");
  redirect("/super-admin/instancias?ok=alias");
}
