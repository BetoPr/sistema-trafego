import { sincronizar } from "./_actions";

export function SincronizarBotao({ integracaoId }: { integracaoId: string }) {
  return (
    <form action={sincronizar.bind(null, integracaoId)}>
      <button
        type="submit"
        className="ghost-btn"
        style={{ fontSize: 11 }}
        title="Buscar dados agora"
      >
        <i className="ti ti-refresh" style={{ fontSize: 13 }} /> Sincronizar
      </button>
    </form>
  );
}
