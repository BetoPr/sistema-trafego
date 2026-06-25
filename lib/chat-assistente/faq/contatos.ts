export const CONTATOS = `# Contatos — base unificada de pessoas

Rota: /contatos

Cada contato = pessoa (nome + número + etiquetas + histórico fechamentos + follow-ups). Persiste sempre. Diferente de **Atendimento (ticket)** que é conversa específica.

Um contato pode ter vários tickets ao longo do tempo.

## Lista/tabela
- Header: "Contatos ({total})"
- Busca tempo real: nome ou número
- Carrega 300 por vez (chunked scroll)
- Por linha: ✏️ Editar | 🗑️ Deletar (soft-delete)

## Importar do WhatsApp
Botão **Importar do WhatsApp** (ícone WhatsApp verde) aparece SÓ se tem canal conectado sem importação ainda.

Modal:
- Canal (precisa conectado)
- ☑️ Pular etiquetas nativas (Não lidas, Grupos, Favoritos) — recomendado on

**Importar agora** → resumo: contatos totais, novos, etiquetas criadas, duração.

**Importa só dados de contato.** Mensagens vêm em tempo real depois (WhatsApp não dá API pra histórico).

Importar várias vezes não duplica — usa número como chave.

## CSV / Excel
Hoje **não pela UI**. Workaround: salva no WhatsApp do celular, importa via UAZAPI. Ou peça pro suporte (rota admin).

## Criar manual
**Adicionar contato**:
- Nome (obrigatório)
- WhatsApp (qualquer formato, sistema limpa pra dígitos)
- Estado (DDD) auto-detecta

Opcional **Fechamento inicial**: Valor R$, Serviço, Quantidade (cria ticket fechado já com fechamento).

## Editar
Linha → ✏️ Editar. Form pré-preenchido + seções:
- **Etiquetas** (checkboxes com cor)
- **Histórico fechamentos**: Total R$, count, qtd serviços, último, breakdown por serviço

Etiqueta nova → link "/etiquetas" no rodapé do form.

## Deletar
🗑️ → soft-delete. Histórico tickets continua.

## Follow-up avulso (no contato)
Edita contato → seção Follow-up (ou ícone 📅 na linha).

Form: Quando disparar (data+hora, min 2min futuro), Quantas mensagens (1/2/3 botões), Aguardar X seg entre (min 2).

**Agendar follow-up**.

Status:
- 🟡 Agendado
- ✅ Enviado
- 🚫 Cancelado
- 💬 Respondido (cliente respondeu → cancela auto)
- ⚠️ Falha

Cancelar: card status Agendado → **Cancelar**.

Diferente do follow-up automático IA (sequências em /ia-atendimento) — esse é manual único por contato.

## Filtros etiqueta em massa
Hoje só busca simples (nome/número). Filtro por etiqueta = roadmap. Workaround: /atendimentos > Filtros > Etiqueta.

## Limite
Sem limite explícito por plano (só limite de envio massa/dia). Plano padrão suporta dezenas de milhares.

## Exportar
Sem botão UI. Workaround: /grupos > Exportar XLS (se tá em grupo). Ou pede suporte.
`;
