import { desconectar } from "./_actions";

export function DesconectarBotao({ integracaoId }: { integracaoId: string }) {
  return (
    <form action={desconectar.bind(null, integracaoId)}>
      <button
        type="submit"
        className="ghost-btn"
        style={{ fontSize: 11 }}
        title="Desconectar conta"
      >
        <i className="ti ti-plug-off" style={{ fontSize: 13 }} /> Desconectar
      </button>
    </form>
  );
}
