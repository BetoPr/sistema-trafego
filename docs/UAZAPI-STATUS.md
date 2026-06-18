# UAZAPI — Status dos endpoints usados pelo CRM

> Gerado: **2026-06-18T14:02:42.702Z** · Instância de teste: **Restauração** · Servidor: https://sistema-trafego.uazapi.com
> Base: uazapiGO **v2.1.1** (139 endpoints no total; abaixo só os que o CRM usa).
> Re-rodar: `npx tsx scripts/uazapi-healthcheck.ts [agenciaId]` (git diff = comparação ao longo do tempo).

## Leitura — testados ao vivo: 9/9 OK
| Endpoint | Método | Uso no CRM | HTTP | OK | ms | Obs |
|---|---|---|---|---|---|---|
| `/instance/status` | GET | Status real da conexão (connected/loggedIn) | 200 | ✅ | 186 |  |
| `/webhook` | GET | Ler config de webhook da instância | 200 | ✅ | 185 |  |
| `/labels` | GET | Etiquetas do WhatsApp Business (import) | 200 | ✅ | 184 | 0 etiqueta(s) |
| `/contacts?contactScope=all` | GET | Contatos com número real (@s.whatsapp.net) | 200 | ✅ | 208 | 1334 contato(s) |
| `/chat/find` | POST | Lista chats (import contatos/histórico) | 200 | ✅ | 187 |  |
| `/group/list` | GET | Lista grupos (envio em grupo) | 200 | ✅ | 574 |  |
| `/chat/details` | POST | Resolve número real do @lid | 200 | ✅ | 186 |  |
| `/message/find` | POST | Histórico de mensagens do chat | 200 | ✅ | 185 |  |
| `/chat/GetNameAndImageURL` | POST | Nome + foto de um número | 200 | ✅ | 184 |  |

## Mutáveis — documentados (NÃO testados, alteram dados)
| Endpoint | Método | Uso no CRM |
|---|---|---|
| `/send/text` | POST | Enviar texto |
| `/send/media` | POST | Enviar imagem/áudio/doc |
| `/message/download` | POST | Baixar mídia recebida |
| `/message/react` | POST | Reagir com emoji |
| `/message/delete` | POST | Apagar mensagem |
| `/webhook` | POST | Configurar webhook |
| `/instance/connect` | POST | Conectar (QR) |
| `/instance/disconnect` | POST | Desconectar |
| `/instance/create` | POST | Criar instância (admin) |
| `/instance/all` | GET | Listar instâncias (admin) |
| `/instance` | DELETE | Deletar instância |
| `/group/update*` | POST | Editar grupo (membros/nome/desc/img) |

### Legenda status
- **2xx** = ok. **401** = sem sessão/token inválido. **404** = rota/recurso inexistente. **405** = método errado. **500** = erro interno UAZAPI. **-1** = falha de rede/timeout.
