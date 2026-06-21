# Tokens de Design — Sonar CRM

Referência única de paleta, tipografia, espaçamento e componentes reutilizáveis.
**SEMPRE** usar `var(--mk-*)` em vez de hex direto, exceto laranja `#F0A35E` (Investido).

## 1. Cores (CSS vars)

### Light mode
```css
--mk-bg: #F7F9F6;            /* fundo página */
--mk-bg-deep: #EEF2EC;        /* fundo deep */
--mk-surface: rgba(255,255,255,0.78);
--mk-surface-2: #EAF0EC;
--mk-sidebar-bg: rgba(255,255,255,0.80);
--mk-side-text: #5A6862;
--mk-side-strong: #0D1F17;
--mk-side-label: #7A8A82;
--mk-side-hover: rgba(16,185,129,0.07);
--mk-side-border: rgba(16,185,129,0.12);
--mk-text: #0D1F17;
--mk-text-secondary: #5A6862;
--mk-text-muted: #7A8A82;
--mk-border: rgba(16,185,129,0.16);
--mk-border-soft: rgba(16,185,129,0.08);
--mk-accent: #059669;         /* verde principal */
--mk-accent-2: #10B981;
--mk-icon-green: #059669;
--mk-icon-blue: #0D9488;
--mk-icon-purple: #7C3AED;
--mk-icon-pink: #E11D48;
--mk-icon-amber: #D97706;
```

### Dark mode (default)
```css
--mk-bg: #080808;
--mk-bg-deep: #050505;
--mk-surface: rgba(0,0,0,0.50);
--mk-surface-2: rgba(255,255,255,0.05);
--mk-sidebar-bg: rgba(0,0,0,0.70);
--mk-side-text: rgba(245,239,228,0.62);
--mk-side-strong: #FFFFFF;
--mk-side-label: rgba(245,239,228,0.50);
--mk-side-hover: rgba(255,255,255,0.05);
--mk-side-border: rgba(245,239,228,0.08);
--mk-text: #FFFFFF;
--mk-text-secondary: #999999;
--mk-text-muted: #666666;
--mk-border: rgba(255,255,255,0.08);
--mk-border-soft: rgba(255,255,255,0.05);
--mk-accent: #10B981;
--mk-accent-2: #34D399;
--mk-icon-green: #34D399;
--mk-icon-blue: #2DD4BF;
--mk-icon-purple: #A78BFA;
--mk-icon-pink: #FB7185;
--mk-icon-amber: #FBBF24;
```

### Status colors (consistentes nos dois modos)
- **Investido / gasto:** `#F0A35E` (laranja, único hex permitido fora de tokens)
- **Sucesso / positivo:** `var(--mk-accent)` ou `var(--mk-accent-2)`
- **Erro / negativo:** `#FB7185` (rosa-vermelho)
- **Warning / atenção:** `#FBBF24` (âmbar) ou `#F0A35E`
- **Neutro:** `var(--mk-text-secondary)`

## 2. Tipografia
- Sans principal: **Inter** via `var(--font-inter)` (400, 500, 600, 700, 800)
- Mono: `var(--font-geist-mono)`
- Heading: mesma família, peso 600-700
- Letter-spacing: títulos grandes usam `-0.5px`

### Escala usada
| Uso | px | Peso |
|---|---|---|
| KPI valor grande | 22-32 | 700 |
| KPI rótulo (eyebrow) | 10-11 | 700 (uppercase, letter-spacing 0.7-1px) |
| Page title (h1) | 24-26 | 700 |
| Section title (label-tiny) | 10.5 | 700 (uppercase) |
| Body padrão | 12.5-13 | 400-500 |
| Sub-texto / hint | 10.5-11 | 400 muted |

## 3. Espaçamento
- Padding card padrão: **16px** (compacto) ou **18px** (grande/destaque)
- Gap entre KPIs: **12-14px**
- Margin entre seções: **14-20px**
- Border radius: **8-12px** cards · **6-8px** chips/badges · **50%** avatares · **16px** cards-hero

## 4. Bordas / elevação
- Border padrão: **0.5px solid var(--mk-border)** (não 1px — fica grosso demais)
- Cards sem sombra forte — destaque vem da cor de borda
- Cards destacados: `border-color: var(--mk-accent)` + glow leve `box-shadow: 0 0 30px rgba(16,185,129,0.10)`

## 5. Classes utilitárias (globals.css)

| Classe | O que faz |
|---|---|
| `.mk-page` | container raiz da página (padding + fade-in) |
| `.mk-page-head` | bloco do título da página |
| `.mk-eyebrow` | label pequena uppercase verde acima do título |
| `.mk-page-title` | h1 (24-26px peso 700) |
| `.mk-page-sub` | parágrafo subtítulo (13px muted) |
| `.mk-card` | card padrão (surface + border) |
| `.mk-card-lg` | variante padding maior |
| `.label-tiny` | label de seção (10.5px uppercase) |
| `.mk-table` | tabela (header uppercase + linhas com border-top soft) |
| `.mk-table-card` | modificador pra `mk-table` dentro de card com padding interno |
| `.ghost-btn` | botão fantasma (transparente + border, hover suave) |
| `.cta-btn` | botão primário verde (accent + glow no hover) |
| `.mk-badge` | chip pequeno (status, etiquetas) — `.b-green` `.b-amber` |
| `.mk-icon-btn` | botão só com ícone (search, refresh) |
| `.search-input` | input de busca padrão |
| `.dash-2col` | grid 2 colunas (2fr 1fr) que vira 1col em ≤768px |
| `.row-meta`, `.row-sub` | metadata de linhas em tabelas |

## 6. Componentes React

| Componente | Path | Quando usar |
|---|---|---|
| `<Balao>` | `components/ui/Balao.tsx` | Modal padrão. Portal no body, overlay com blur, header título+X, Esc/clique-fora fecha, footer opcional. **NUNCA criar modal inline novo.** |

## 7. Ícones
**Tabler Icons** via classe `ti ti-<name>` (CSS webfont).

Comuns no Sonar:
- `ti-speakerphone` Campanhas/Tráfego
- `ti-target-arrow` Leads, Pixel & Vendas
- `ti-chart-histogram` Análises
- `ti-message`, `ti-messages` Atendimentos
- `ti-clock-bolt` Follow-up
- `ti-address-book` Contatos
- `ti-brain` IA
- `ti-rocket` Massa
- `ti-bolt` Rápidas
- `ti-users-group` Equipes/Grupos
- `ti-brand-whatsapp` Canais/WhatsApp
- `ti-list-tree`, `ti-list-check` Filas
- `ti-user-circle`, `ti-user-plus` Usuários
- `ti-shield-lock` Admin/Segurança
- `ti-credit-card` Plano
- `ti-photo-square-rounded` Criativos
- `ti-filter` Funil
- `ti-refresh` Sincronizar
- `ti-search` Busca
- `ti-calendar` Período custom
- `ti-map-pin` Geo/estado
- `ti-eye` Impressões
- `ti-click` Cliques
- `ti-coin`, `ti-cash-banknote`, `ti-trending-up` Financeiro
- `ti-shopping-cart` Conversões
- `ti-bell-ringing` Alertas
- `ti-layout-dashboard` Dashboard

## 8. Responsivo
- Breakpoint principal: **768px**
- `.dash-2col` vira 1 coluna em ≤768px
- KPIs em grid auto-fit `repeat(auto-fit, minmax(210px, 1fr))` ou `(180px, 1fr)`
- Sidebar 240px desktop → drawer overlay em mobile
- Topbar sticky no topo com blur

## 9. Animações
- Fade-in da página: `animation: mk-fade-in 0.25s ease`
- Transições suaves de barra: `cubic-bezier(.2,.8,.2,1)` 0.9s
- Hover de card clicável: leve borda accent

## 10. Pista visual
Sonar tem identidade **orgânica/natural** — verdes profundos, cinzas-azuis, off-whites. **Evitar**: azul puro, magenta, neon. Aurora background suave em algumas telas.
