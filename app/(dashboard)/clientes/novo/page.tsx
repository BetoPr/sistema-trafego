import { NovoClienteForm } from "./_form";

export default function NovoClientePage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">CRM</div>
        <h1 className="mk-page-title">Novo cliente</h1>
        <p className="mk-page-sub">Informações básicas. Detalhes podem ser editados depois.</p>
      </div>
      <NovoClienteForm />
    </section>
  );
}
