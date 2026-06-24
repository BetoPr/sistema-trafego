export const SISTEMA_UX = `# Sistema / UX / Atalhos

Navegacao, filtros globais, atalhos, configuracao geral.

## Topbar (topo)
- **Busca** (Cmd+K / Ctrl+K): paleta de paginas e sessoes.
- **Filtro Global**: pill verde no centro-direita. Filtra Pasta/Etiqueta/Campanha cross-aba.
- **Plataforma**: seletor Meta Ads / Google Ads / etc.
- **Avatar**: menu usuario (perfil, sair).
- **FAB Assistente IA**: bolha bottom-right pra abrir o chat.

## Sidebar
- Esquerda. Organizada em grupos: Principal, Atendimento, Comunicacao, Trafego, Administracao.
- Toggle colapsar/expandir (icone hamburguer).
- Modo escuro/claro (botao no rodape sidebar).

## Filtro Global Cross-Aba
- Click no pill > busca + grupos Pasta/Etiqueta/Campanha.
- Selecionado: persiste em URL (deep-link) + localStorage.
- Afeta: Dashboard view Campanhas, /campanhas, em breve mais.
- X dentro do pill: limpa.

## Atalhos teclado
- **Cmd/Ctrl + K**: paleta de busca.
- **Esc**: fecha balao/dropdown.
- **Enter**: confirma form.

## Mobile
- Sidebar vira hamburguer.
- Filtro global vira icone na topbar.
- Tabelas largas tem scroll-x.

## Tema
- Botao "Modo Escuro" / "Modo Claro" no rodape sidebar.
- Persistente via next-themes.

## PWA
- Pode instalar como app no celular (Add to Home Screen).
- Service worker registrado em /public/sw.js.

## Plano e cobranca
- /plano: assinatura R$29/mes por canal WhatsApp.
- Bloqueio de acesso ao expirar (configurado em super-admin).

## Notificacao mensagens
- Bell no topbar mostra unread.
- Som configuravel.

## Heartbeat online
- Sistema marca usuario online a cada 30s. Aparece em /equipes.

## Problemas
- Pagina nao carrega: refresh + verifica console F12 + checa /api/health (se existir).
- Sidebar travada: clica no logo pra resetar.
`;
