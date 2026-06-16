"use client";
import { useState } from "react";
import { Balao } from "@/components/ui/Balao";
import FerramentaForm from "./_ferramenta-form";
import type { ImagemGaleria } from "./_galeria-uploader";

interface FilaOpt { id: string; nome: string; cor: string }
interface EtiquetaOpt { id: string; nome: string; cor: string }

interface FerramentaRow {
  id: string;
  nome: string;
  descricao: string;
  acao: string;
  parametros: Record<string, unknown>;
  ativo: boolean;
}

export default function EditarFerramentaBtn({
  ferramenta,
  perfilId,
  filas,
  etiquetas,
  imagensGaleria = [],
}: {
  ferramenta: FerramentaRow;
  perfilId: string;
  filas: FilaOpt[];
  etiquetas: EtiquetaOpt[];
  imagensGaleria?: ImagemGaleria[];
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="ghost-btn"
        style={{ fontSize: 11, padding: "4px 8px" }}
        title="Editar ferramenta"
      >
        <i className="ti ti-pencil" />
      </button>

      <Balao
        open={aberto}
        onClose={() => setAberto(false)}
        titulo={`Editar — ${ferramenta.nome}`}
        icone="ti-tool"
        largura={640}
      >
        <FerramentaForm
          perfilId={perfilId}
          filas={filas}
          etiquetas={etiquetas}
          ferramentaExistente={ferramenta}
          imagensGaleria={imagensGaleria}
          onSaved={() => setAberto(false)}
        />
      </Balao>
    </>
  );
}
