# Screenshots da Apresentação

Pasta serve imagens estaticas pra `/apresentacao`. Cada slide que tem
campo `screenshot` em `app/apresentacao/_deck.tsx` espera um PNG aqui
com o nome correspondente.

## Como adicionar

1. Tire print da tela do CRM (Win+Shift+S, recorte da janela do navegador)
2. Salve com o nome exato listado abaixo
3. Cole nessa pasta `public/apresentacao/img/`
4. Commit + push (auto-deploy)

Se o arquivo nao existir, o slide cai automaticamente pro mockup SVG.
Vc pode adicionar 1 por vez sem quebrar nada.

## Nomes esperados

| Slide | Arquivo | Tela do CRM pra printar |
|-------|---------|-------------------------|
| 03 - Caixa de entrada | `02-atendimentos.png` | `/atendimentos` (lista cheia, tab Abertos) |
| 04 - IA de Atendimento | `03-ia.png` | `/ia-atendimento` (lista Ana + Qualificador) |
| 05 - Ferramentas custom | `04-tools.png` | `/ia-atendimento?editar=ID` (scroll ate "Ferramentas") |
| 06 - Follow-up | `05-followup.png` | `/follow-up` ou bloco follow-up no edit IA |
| 07 - Leads Meta | `06-leads-meta.png` | `/leads-meta` |
| 09 - Dashboard | `07-dashboard.png` | `/dashboard` |
| 10 - Preco | `08-plano.png` | `/plano` |

## Tamanho ideal

- Aspect ratio **1126 x 854** (formato widescreen com sidebar visivel)
- Formato **PNG** (mais nitido pra UI) ou JPG (menor tamanho)
- Dark mode preferido pra combinar com fundo da apresentacao
- Inclua sidebar pra dar contexto visual
