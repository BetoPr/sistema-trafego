import { NeedsPlatform } from "@/components/shared/NeedsPlatform";
import { PlatformContextBadge } from "@/components/shared/PlatformContextBadge";
import AlertasShell from "./_shell";

export default function AlertasPage() {
  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Monitoramento</div>
        <h1 className="mk-page-title">
          Alertas inteligentes
          <PlatformContextBadge />
        </h1>
        <p className="mk-page-sub">
          Configure regras (saldo, ROAS, CPL, fadiga) e receba aviso no WhatsApp antes de perder dinheiro.
        </p>
      </div>

      <NeedsPlatform contexto="de alertas">
        <AlertasShell />
      </NeedsPlatform>
    </section>
  );
}
