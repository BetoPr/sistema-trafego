export const CONTA_PERFIL = `# Meu Perfil — conta do usuário

Rota: /conta

## Trocar foto (avatar)
Seção Avatar:
- **Trocar foto** → seletor arquivo
- **Remover** → volta pra inicial gerada

## Editar nome / telefone
Seção Perfil:
- **Nome** (input texto)
- **Telefone** (formato tel)

**Salvar perfil**.

## Trocar senha
Seção Alterar senha:
- **Nova senha** (mínimo 6 chars)
- **Confirmar**

**Trocar senha**.

Próximo login pede a nova.

## Esqueci a senha
Tela de login → **Esqueci a senha** → digita email → recebe link de reset.

Admin/super_admin pode resetar senha de outro usuário em /usuarios (campo "Nova senha (deixe em branco para manter)").

## Email
Hoje email não é editável pelo próprio usuário (mudança = admin reset). Pode mudar no /usuarios pelo admin.

## Onde fica avatar?
Sidebar (topo), topbar (canto superior direito), mensagens enviadas no chat (avatar do atendente).
`;
