export const SISTEMA_UX = `# Sistema / UX / Navegação

## Menu lateral (sidebar)
Áreas principais:
- Dashboard
- Atendimentos
- Follow-up
- IA Atendimento
- Contatos
- Envio em Massa
- Mensagens Rápidas
- Grupos
- Pixel & Vendas (super_admin)
- Relatórios
- Alertas
- Canais (admin)
- Filas (admin)
- Equipes (admin)
- Usuários (admin)
- Clientes (admin — em Tráfego Ads)
- Configurações (Etiquetas, API IA, Prompts IA, Asaas, MCP)
- Marca/Logo
- Meu Perfil
- Plano Pro

Colapsa horizontalmente. Tema escuro padrão.

## Topbar
- Logo/marca agência (esquerda)
- Avatar usuário (direita) → menu: Meu Perfil, Sair, tema
- Notificações (futuro)

## Robô flutuante (canto inferior direito)
Botão verde com robô voando = Assistente IA. Abre drawer com 2 bots:
- **Suporte CRM** — tira dúvidas do sistema (esse que tá te respondendo agora)
- **Meus Dados** — análise dos dados da agência via tools

Robô esconde em rotas com composer próprio (/atendimentos, /chat-teste, /envio-massa, /grupos).

## Logout
Avatar canto superior direito → **Sair**.

## Tema claro/escuro
Avatar → ⚙️ → tema. Padrão: escuro.

## Mobile
CRM web 100% responsivo. "Adicionar à tela inicial" (Chrome/Safari) vira PWA. Não tem app nativo.

Funciona offline? **Não.** Precisa internet (Supabase + UAZAPI).

## Multi-agência
Hoje 1 conta = 1 agência. Super_admin gerencia várias num painel administrativo separado.

## Integrações externas
Hoje só via MCP tokens. Notion/Sheets/Zapier = roadmap.

## Atalhos
Sem atalhos de teclado nativos hoje. Cmd+K busca = roadmap.

## Idioma
Português BR. Erros em PT-BR. Não tem multi-idioma.

## Formatação
- Moeda: Intl.NumberFormat pt-BR (R$ 1.234,56)
- Datas: date-fns locale ptBR
- Decimais: vírgula. Milhares: ponto.
`;
