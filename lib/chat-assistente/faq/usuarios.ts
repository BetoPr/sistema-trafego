export const USUARIOS = `# Usuários do CRM

Rota: /usuarios

**Apenas admin / super_admin acessa.**

Pessoas que **logam no painel** pra atender clientes. Cada uma tem nome, email, telefone, foto, perfil (role) e equipes.

(Antes chamavam "Admins". Agora chamamos **Usuários do CRM**.)

## Criar novo
**Novo usuário**. Form:
- **Nome**
- **Email** (login)
- **Senha**
- **Telefone** (00) 00000-0000
- **Perfil** (dropdown):
  - **Atendente** — sem admin, vê atendimentos
  - **Administrador** — gere canais, IA, equipes, usuários
  - **Super Admin** (só aparece se você for super_admin)
- ☑️ **Habilitado (vê só próprios tickets)** — usuário restrito
- **Equipes** (checkboxes — pode marcar várias)
- **Permissões de Menu** (collapsible) — fine-grained acesso por item de menu
- **Config SIP (em breve)** — VoIP futuro
- **Horário de Atendimento** — tabela Dia/Status/1º período/2º período

**Criar usuário**.

## Roles — diferenças
- **Atendente** (atendente / operador)
  - Acessa Atendimentos, Contatos, Mensagens Rápidas
  - Vê tickets atribuídos ou todos (depende restrito flag)
  - Não cria canal, não muda IA, não convida usuários
- **Administrador** (admin)
  - Tudo do atendente +
  - Cria/edita canais, IA, filas, equipes, usuários
  - Configura etiquetas, prompts, alertas, relatórios
- **Super Admin** (super_admin)
  - Tudo do admin +
  - Pixel & Vendas, servidores UAZAPI globais, multi-agência, MCP tokens

## Habilitado (vê só próprios tickets)
Restringe atendente a ver **só tickets atribuídos a ele**. Outros tickets ficam invisíveis.

Quando off (padrão): vê todos tickets da agência.

## Permissões de Menu
Grid 3 colunas com 20+ itens menu. Marca quais cada usuário vê. Ex: liberar Pixel & Vendas pra atendente específico.

## Horário de Atendimento
Define horário "Online" automático:
- Dia (Seg, Ter…)
- Status (Aberto / Fechado)
- 1º período (HH:MM-HH:MM)
- 2º período (intervalo almoço)

Roadmap: roteamento respeita horário.

## Ações por linha
- ✏️ Editar
- Toggle 🟢/⚫ Ativo (desativa: não loga, não recebe tickets, histórico preserva)
- 🗑️ Deletar (soft-delete) — **use desativar sempre que possível**, mais reversível
- Badge Perfil colorida (Super Admin vermelho, Admin roxo, Atendente cinza)
- Indicador 🟢 Online / ⚫ Offline tempo real

## Resetar senha de outro usuário
Edita usuário → campo "Nova senha (deixe em branco para manter)" → preenche → Salvar. Usuário loga com nova.

## Limite usuários por plano
Sem limite explícito. Plano cobra por **conexão WhatsApp**, não por usuário.
`;
