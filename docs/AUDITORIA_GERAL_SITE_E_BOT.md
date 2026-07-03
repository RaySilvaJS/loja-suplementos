# AUDITORIA TÉCNICA GERAL — SITE E BOT
**Data da auditoria:** 2026-06-26  
**Repositório:** iphone-brasil  
**Auditor:** Claude Code (análise estática do código-fonte)

---

## Resumo Executivo

O sistema é uma loja virtual de iPhones e produtos de tecnologia construída como uma aplicação Node.js/Express monolítica, sem banco de dados relacional. Toda a persistência ocorre via arquivos JSON no diretório `server/data/`. O sistema integra WhatsApp (via Baileys), Telegram, cálculo de frete via Melhor Envio, PIX próprio (BR Code gerado internamente), rastreamento de visitantes com identificação de tráfego pago, cupons e um painel DevOps completo.

**O bot WhatsApp atual é exclusivamente de encaminhamento para o grupo admin.** Ele não possui capacidade autônoma de responder clientes: toda resposta ao cliente passa por um humano no grupo admin que digita comandos (APROVADO, RECUSADO, REENVIAR) ou encaminha mensagens manualmente.

---

## Tecnologias Encontradas

| Tecnologia | Versão | Função |
|---|---|---|
| Node.js | Runtime JS | Servidor backend |
| Express | ^4.18.2 | Framework HTTP/API |
| @whiskeysockets/baileys | ^7.0.0-rc13 | Integração WhatsApp (protocolo não-oficial) |
| bcryptjs | ^3.0.3 | Hash de senhas de usuários |
| axios | ^1.16.1 | HTTP client (Melhor Envio, geocoding) |
| cors | ^2.8.5 | Headers CORS |
| dotenv | ^17.4.2 | Variáveis de ambiente |
| qrcode | ^1.5.4 | Geração de imagem PNG do QR (para Telegram) |
| qrcode-terminal | ^0.12.0 | Exibição de QR no terminal |
| uuid | ^14.0.0 | Geração de IDs únicos |
| swiper | ^11.0.0 | Carrossel de imagens no frontend |
| nodemon | ^3.0.1 (dev) | Auto-restart em desenvolvimento |
| ip-api.com | API externa gratuita | Geocoding de IPs (cidade, país) |
| Melhor Envio API | API externa paga | Cálculo de frete real |
| Telegram Bot API | API externa | Alertas, notificações, envio de QR |
| HTML/CSS/JS puro | — | Frontend (sem framework) |
| Google Fonts (Inter) | CDN externo | Tipografia |
| Meta Pixel | Script externo | Rastreamento de conversões Meta |

**Banco de dados:** Não existe. Toda persistência é em arquivos JSON flat no disco.  
**ORM / Query builder:** Não existe.  
**Filas / Workers / Cron jobs:** Não existem libs externas; o sistema usa `setInterval` nativo do Node.js.  
**Testes automatizados:** Não existem.  
**Monorepo:** Projeto único, estrutura simples.

---

## Arquitetura Geral

```
Cliente (Browser) ──► public/ (HTML/CSS/JS estático)
                         │
                         ▼
                    Express (server/index.js porta 4000)
                         │
          ┌──────────────┼──────────────────┐
          ▼              ▼                  ▼
    server/payment.js  server/admin.js   server/whatsapp.js
    (pedidos/PIX)     (DevOps panel)    (Baileys bot)
          │              │                  │
          ▼              ▼                  ▼
    server/data/     server/data/       WhatsApp Cloud
    payments.json    config.json,       (conexão direta
    users.json       security.json      protocolo WA)
    coupons.json         │
    products.json        ▼
    catalogs/*.json  server/tracker.js
                     server/telegram.js
                     server/alerts.js
```

---

## Estrutura de Pastas

```
iphone-brasil/
├── public/                    # Frontend servido estaticamente pelo Express
│   ├── index.html             # Página inicial (catálogo + destaques)
│   ├── product.html           # Página de produto individual
│   ├── checkout.html          # Checkout
│   ├── cart.html              # Carrinho
│   ├── pagamento.html         # Tela de pagamento/PIX após pedido
│   ├── payment.html           # Aguarda confirmação de pagamento
│   ├── meus-pedidos.html      # Área do cliente — pedidos
│   ├── minha-conta.html       # Perfil do usuário
│   ├── login.html             # Login
│   ├── cadastro.html          # Cadastro
│   ├── atendimento.html       # Atendimento/FAQ
│   ├── faq.html               # Perguntas frequentes
│   ├── termos.html            # Termos de uso
│   ├── trocas.html            # Política de trocas
│   ├── maintenance.html       # Exibida no modo manutenção
│   ├── compare.js             # Comparação de produtos (standalone)
│   ├── cart.js                # Lógica do carrinho (standalone)
│   ├── aff.html               # Página affiliado (raiz do projeto)
│   ├── data/                  # Catálogos JSON (seeds — read-only em produção)
│   │   ├── iphones.json
│   │   ├── androids.json
│   │   ├── consoles.json
│   │   ├── smartwatches.json
│   │   ├── acessorios.json
│   │   ├── informatica.json
│   │   └── suplementos.json
│   ├── js/                    # Scripts globais reutilizáveis
│   │   ├── auth.js            # window.Auth — sessão do usuário, injectAuthNav()
│   │   ├── checkout.js        # Lógica do checkout
│   │   ├── cart-page.js       # Lógica da página de carrinho
│   │   ├── loja-oficial.js    # Extras fake (desconto, brinde, frete) via localStorage
│   │   ├── coupon-modal.js    # Modal de cupom promocional
│   │   ├── meta-pixel.js      # Eventos do Meta Pixel
│   │   ├── tracker-beacon.js  # Heartbeat de sessão para analytics
│   │   ├── payment.js         # Tela de pagamento/comprovante
│   │   ├── whatsapp-validator.js # Validação de número WhatsApp no frontend
│   │   ├── admin-bar.js       # Barra admin inline
│   │   ├── admin-edit.js      # Edição inline de produto (admin)
│   │   ├── cookie-consent.js  # Consentimento de cookies/LGPD
│   │   └── iab-detect.js      # Detecta browser in-app (Facebook, Instagram)
│   ├── pages/                 # Scripts específicos por página (divididos em partes)
│   │   ├── index-1.js         # Parte 1 da home (catálogo, destaques)
│   │   ├── index-2.js         # Parte 2 (busca, filtros)
│   │   ├── index-3.js         # Parte 3 (interações, UI)
│   │   ├── product-1.js       # Parte 1 da página de produto
│   │   └── product-2.js       # Parte 2 (variações, ações)
│   ├── css/
│   │   └── brand.css          # Estilos de marca (usados em páginas específicas)
│   ├── styles.css             # Estilos do admin.html
│   ├── assets/categories/     # Ícones das categorias
│   ├── uploads/               # Imagens de produtos enviadas pelo admin (geradas em runtime)
│   └── devops/
│       └── index.html         # Painel DevOps completo (SPA em HTML único)
│
├── server/                    # Backend Node.js
│   ├── index.js               # Ponto de entrada, rotas principais (~1946 linhas)
│   ├── admin.js               # Rotas /api/admin/* — DevOps panel, deploy, logs
│   ├── payment.js             # Rotas /api/payment/* — pedidos, PIX, comprovante
│   ├── whatsapp.js            # Bot Baileys — conexão, handlers, funções de envio
│   ├── pix.js                 # Gerador de BR Code PIX (sem deps externas)
│   ├── coupons.js             # CRUD e validação de cupons
│   ├── shipping.js            # Rastreamento simulado (não usa Correios real)
│   ├── tracker.js             # Analytics de visitantes, sessões, tráfego pago
│   ├── telegram.js            # Envio de alertas/notificações via Telegram Bot API
│   ├── alerts.js              # Sistema de alertas (CPU, RAM, disco, WA, erros)
│   ├── audit.js               # Log de auditoria de ações admin
│   ├── logger.js              # Override de console.log/error para captura in-memory
│   ├── auth_info/             # Credenciais da sessão WhatsApp (Baileys multifile)
│   ├── logs/
│   │   ├── app.log            # Log geral da aplicação
│   │   ├── errors.log         # Log de erros
│   │   └── whatsapp.log       # Log do bot WhatsApp
│   └── data/                  # Persistência — TODOS os dados ficam aqui
│       ├── users.json         # Contas de usuários
│       ├── payments.json      # Pedidos e pagamentos
│       ├── products.json      # Produtos custom (admin panel)
│       ├── products_new.json  # Arquivo legado/temporário (não usado ativamente)
│       ├── coupons.json       # Cupons (atualmente vazio — [])
│       ├── banners.json       # Banners da homepage
│       ├── alerts.json        # Configurações de alertas
│       ├── audit.json         # Log de auditoria
│       ├── wa-events.json     # Histórico de eventos WhatsApp (últimos 1000)
│       ├── config.json        # Modo manutenção, pixConfig, versão
│       ├── catalogs/          # Catálogos editáveis (cópia dos seeds de public/data/)
│       │   ├── iphones.json
│       │   ├── androids.json
│       │   ├── consoles.json
│       │   ├── smartwatches.json
│       │   ├── acessorios.json
│       │   ├── informatica.json
│       │   └── suplementos.json
│       ├── backups/           # Backups automáticos de catálogos e dados
│       ├── proofs/            # Comprovantes de pagamento (imagens/docs)
│       ├── analytics/         # Dados de analytics
│       │   ├── daily.json     # Métricas diárias
│       │   ├── lifetime.json  # Métricas históricas
│       │   ├── visitors.json  # Perfis de visitantes (fingerprint por IP+UA)
│       │   └── events/        # Eventos por dia (.jsonl)
│       └── trash.json         # Lixeira de produtos deletados (30 dias)
│
├── src/client/pages/          # Duplicatas dos arquivos de public/pages/ (não serve ao browser)
├── scripts/                   # Scripts utilitários
│   ├── fetch-ml-images.js     # Script de importação de imagens do Mercado Livre
│   └── strip-base64.js        # Remove base64 de JSONs (reduz tamanho)
├── .env                       # Variáveis de ambiente (não commitado)
├── package.json
├── deploy.sh                  # Script de deploy (git pull + pm2 restart)
├── CLAUDE.md                  # Instruções para Claude Code
└── SHIPPING.md                # Documentação do sistema de frete
```

---

## Site e E-commerce

### Página Inicial (`public/index.html`)
- Exibe banners via `GET /api/banners` (filtros: `active`, `startsAt`, `endsAt`)
- Renderiza categorias de produtos dos catálogos JSON via `GET /api/products` e via fetch dos arquivos `/data/*.json`
- Scripts: `index-1.js`, `index-2.js`, `index-3.js`
- `loja-oficial.js` gera extras fake (descontos, brindes) por produto via `localStorage`
- `tracker-beacon.js` envia heartbeat para `POST /api/track/heartbeat` com UTM params, fbclid, gclid

### Catálogo e Busca
- Dois sistemas de produtos distintos:
  1. **Catálogos estáticos** (`server/data/catalogs/*.json`): 7 categorias — iPhones, Android, Consoles, Smartwatches, Acessórios, Informática, Suplementos. Editáveis via painel admin mas não integrados ao bot.
  2. **Produtos custom** (`server/data/products.json`): produtos adicionados manualmente pelo admin. Atualmente contém apenas produtos de teste.
- Busca: filtros via query string na rota `GET /api/products` (category, model, color, minPrice, maxPrice, condition, searchQuery)
- Filtros de catálogo: feitos no frontend lendo os JSONs diretamente

### Página de Produto (`public/product.html`)
- Resolve produto via `GET /api/catalog/product/:id` (catálogos) ou `GET /api/products/:id` (custom)
- A resposta inclui: `siblings` (variações de mesmo modelo) e `related` (8 produtos do mesmo catálogo)
- Variações de cor/armazenamento: resolvidas pelos siblings com mesmo `model`
- Stats em tempo real: `GET /api/product-stats/:productId` (views, quem está visualizando agora)

### Carrinho (`public/cart.html`, `public/js/cart-page.js`)
- Armazenado em `localStorage` key `iphone-vendas-cart` e `iphone-vendas-buy-now`
- Sem validação de estoque no servidor no momento de adicionar ao carrinho
- `POST /api/events/cart-add` notifica o grupo WhatsApp admin

### Checkout (`public/checkout.html`, `public/js/checkout.js`)
- Requer login ou guest checkout (`POST /api/auth/guest`)
- Requer endereço cadastrado antes de pagar
- Suporta: PIX, Cartão de Crédito, Boleto Bancário
- Cálculo de frete via `POST /api/shipping` (Melhor Envio) ou fallback de frete fixo
- Validação de cupom: `POST /api/coupons/validate` (lado servidor) + dupla verificação em `POST /api/payment/generate`
- `POST /api/events/checkout-visit` notifica WhatsApp admin ao entrar no checkout

### Login e Cadastro
- Cadastro: `POST /api/auth/register` — nome, WhatsApp, e-mail, CPF (opcional), senha
- Login: `POST /api/auth/login` — e-mail + senha, multi-sessão (até 15 simultâneas)
- OTP via WhatsApp: `POST /api/auth/otp/send` → envia código 6 dígitos; `POST /api/auth/otp/verify`
- Guest checkout: `POST /api/auth/guest` — cria conta temporária com e-mail fictício (`guest_NUMERO@jessi.local`)
- Token armazenado em `localStorage` key `user-session` pelo `auth.js`

### Cupons
- CRUD via painel DevOps (`/api/admin/coupons/*`)
- Tipos: `fixed` (valor fixo), `percent` (percentual), `free_shipping`, `pix_extra` (extra desconto no PIX), `first_purchase`
- Restrições suportadas: `minValue`, `expiresAt`, `startDate`, `maxUses`, `maxUsesPerUser`, `firstPurchaseOnly`, `paymentMethod`, `productIds`, `categories`, `source`
- **Estado atual:** `server/data/coupons.json` está vazio (`[]`) — nenhum cupom cadastrado

### Pedidos e Pagamentos
- Pedido criado via `POST /api/payment/generate`
- Persistido em `server/data/payments.json`
- Status: `pending` → `awaiting_validation` (após comprovante) → `paid` / `refused`
- Comprovante: `POST /api/payment/proof` — arquivo base64, salvo em `server/data/proofs/`
- Status polling pelo cliente: `GET /api/payment/status/:id`
- Pedidos do cliente: `GET /api/auth/orders` (filtrado por userId)

### Rastreamento de Entrega
- **Simulado internamente** pelo `server/shipping.js`
- Não usa Correios, Jadlog ou API de transportadora real
- Baseado no CEP de destino → estima dias úteis por região
- Gera eventos fake: payment_approved → preparing → dispatched → in_transit → out_for_delivery → delivered
- ID de rastreamento: `TRK-` + shortId do pedido

### Área do Cliente
- Meus pedidos: `meus-pedidos.html` via `GET /api/auth/orders`
- Minha conta: `minha-conta.html` — editar perfil (`PUT /api/auth/profile`), trocar senha (`PUT /api/auth/password`)
- Endereços: CRUD completo via `/api/auth/addresses/*`

---

## Produtos, Preços, Estoque e Promoções

### Onde os dados ficam

| Campo | Catálogos (server/data/catalogs/) | Produtos Custom (products.json) |
|---|---|---|
| Nome | ✅ campo `name` | ✅ campo `name` |
| Modelo | ✅ campo `model` | ✅ campo `model` |
| Preço cheio | ✅ campo `priceOriginal` | ✅ campo `priceOriginal` |
| Preço atual | ✅ campo `price` | ✅ campo `price` |
| Preço PIX | ❌ não existe campo específico | ❌ não existe campo específico |
| Parcelamento | ❌ não existe campo específico | ❌ não existe campo específico |
| Estoque | ✅ campo `stock` (inteiro) | ✅ campo `stock` (inteiro) |
| Cor | ✅ campo `color` | ✅ campo `color` |
| Armazenamento | ✅ campo `storage` | ✅ campo `storage` |
| Condição | ✅ campo `condition` | ✅ campo `condition` |
| Estado (novo/usado) | ✅ campo `isNew` | ✅ campo `isNew` |
| Promoção ativa | ✅ campos `isPromo`, `promoPercent`, `promoBadge` | ✅ campos `isPromo`, `promoPercent` |
| Garantia | ❌ não existe campo específico | ❌ não existe campo específico |
| Frete | campo `free_shipping` (boolean) | campo `free_shipping` (boolean) |
| Imagens | ✅ array `images` | ✅ array `images` |
| Specs técnicas | ✅ objeto `specs` | ✅ objeto `specs` |
| Brindes | ❌ apenas via `loja-oficial.js` no frontend | ❌ apenas via `loja-oficial.js` no frontend |

### Preço no PIX
- Não existe campo `pricePix` em nenhuma fonte de dados
- O desconto PIX é calculado via cupom do tipo `pix_extra` no momento do checkout
- O percentual exibido como "desconto PIX" nas páginas de produto é definido pelo script `loja-oficial.js` (client-side, fake/configurado manualmente no script)

### Extras de Produto (fake)
- `public/js/loja-oficial.js` gera, por produto: desconto percentual fake, brinde fake, frete grátis fake
- Valores armazenados em `localStorage` key `loja-oficial-extras`
- Esses dados NÃO estão no banco de dados, NÃO chegam ao servidor e NÃO podem ser consultados pelo bot

### Risco de dados diferentes entre site e bot
- **Alto risco:** O script `loja-oficial.js` exibe promoções, brindes e percentuais de desconto que não existem no servidor. Um bot que consultasse o banco não encontraria esses dados e exibiria informações diferentes das que o cliente viu no site.
- **Médio risco:** Preço PIX não tem campo próprio — o bot não consegue informar o preço PIX exato sem regra de negócio explícita.
- **Baixo risco:** Estoque e preço base são os mesmos entre catálogo e produto page (mesma fonte).

---

## Carrinho e Checkout

### Fluxo resumido
1. Cliente adiciona produto ao carrinho (localStorage)
2. Clica em "Comprar Agora" → vai direto ao checkout (buy-now) ou pelo carrinho
3. Checkout verifica se está logado → redireciona para login/guest se não
4. Cliente escolhe endereço (existente ou cria novo)
5. Cliente escolhe método de pagamento (PIX/Cartão/Boleto)
6. Aplica cupom (opcional) — validado no servidor
7. Calcula frete via Melhor Envio (ou fallback)
8. Clica em pagar → `POST /api/payment/generate`
9. Servidor gera PIX BR Code se configurado, notifica grupo WhatsApp, retorna `paymentId`
10. Cliente vai para `pagamento.html` com o QR PIX ou aguarda instruções

---

## Banco de Dados

O sistema não utiliza banco de dados convencional. Toda persistência é em arquivos JSON no disco.

### Estruturas de dados principais

**`users.json`** — Array de objetos:
```
{
  id, nome, cpf, whatsapp, email, senha (bcrypt),
  token (legacy), sessions[] (multi-device),
  enderecos[], role (user|admin|superadmin),
  isGuest, whatsappConsent, createdAt, lastLogin
}
```

**`payments.json`** — Array de objetos:
```
{
  id (UUID), shortId (PEDxxxxx),
  productId, productName, amount,
  status (pending|awaiting_validation|paid|refused),
  paymentMethod (pix|cartao|boleto),
  qrCode (PIX BR Code string),
  installments, cardName, cardNumber, cardExpiry, cardCvv,
  userId, clientName, clientEmail, clientPhone, clientCpf,
  address {rua, numero, bairro, cidade, estado, cep},
  couponCode, couponDiscount,
  groupMessageId (ID da msg no grupo WA),
  proofGroupMessageId (ID da msg do comprovante no grupo WA),
  proofs[] {fileName, mimeType, uploadedAt},
  tracking {trackingId, steps[]},
  recoverySent {m30, h6, h24},
  logs[] {timestamp, type, details}
}
```

**`coupons.json`** — Array de objetos (atualmente vazio):
```
{
  id, code, type, value, active, expiresAt, maxUses,
  usedCount, productIds[], categories[], paymentMethod, source
}
```

**`catalogs/*.json`** — Array de produtos:
```
{
  id, name, model, price, priceOriginal, condition,
  color, storage, stock, isNew, isPromo, promoPercent,
  promoBadge, images[], specs{}, seller, rating,
  free_shipping, archived, featured, _history[]
}
```

**`wa-events.json`** — Array de eventos WhatsApp (últimos 1000):
```
{ type, detail, ts }
```

**`analytics/daily.json`** — Métricas por dia:
- visitors, pageViews, logins, signups, orders, pix, checkouts
- byHour, sources, devices, browsers, paidSources, campaigns

### Campos de auditoria presentes
- `createdAt` em payments, users, coupons
- `updatedAt` em coupons
- `paidAt`, `refusedAt` em payments
- `logs[]` em payments (histórico de ações)
- `_history[]` em produtos de catálogo (últimas 50 edições)
- `audit.json` com append de todas as ações admin

### Dados ausentes que afetam o bot futuro
- Sem campo `pricePix` nos produtos
- Sem campo `installmentsPlan` (regra de parcelamento por produto)
- Sem campo `guarantee` (garantia)
- Sem campo `gift` (brinde)
- Sem histórico de conversas WhatsApp de clientes
- Sem registro de qual produto o cliente perguntou via WhatsApp
- Sem campo `origin` nos pedidos (de onde veio o cliente que comprou)

---

## Integrações Externas

| Integração | Finalidade | Status | Configuração |
|---|---|---|---|
| WhatsApp (Baileys) | Bot de pedidos e notificações | Ativo | `WHATSAPP_GROUP_ID` env |
| Telegram Bot API | Alertas, notificações, QR Code | Ativo | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| Melhor Envio API | Cálculo de frete real | Configurável | `MELHOR_ENVIO_TOKEN`, `ORIGIN_CEP` |
| ip-api.com | Geocoding de IPs (cidade/país) | Ativo (gratuito) | Sem token — limite 45 req/min |
| Meta Pixel | Rastreamento de conversões | Ativo (frontend) | `public/js/meta-pixel.js` |
| Google Fonts | Tipografia (Inter) | Ativo | CDN externo |

---

## WhatsApp e Bot

### Como funciona hoje

O bot Baileys (`server/whatsapp.js`) possui **dois papéis distintos e separados**:

**Papel 1 — Notificações ativas (o sistema envia, ninguém responde):**
- Novo cadastro → notificação no grupo admin
- Novo login → notificação no grupo admin
- Produto adicionado ao carrinho → notificação no grupo admin
- Cliente clicou em Comprar → notificação no grupo admin
- Novo pedido criado → mensagem detalhada no grupo admin com dados do cliente
- Comprovante enviado → mensagem com imagem/doc no grupo admin
- PIX gerado → mensagem direta ao cliente com o código Copia e Cola
- Recuperação de checkout abandonado → mensagens automáticas ao cliente em 30min, 6h e 24h

**Papel 2 — Encaminhamento de respostas (o admin responde, o bot encaminha):**
- Admin responde a uma mensagem do grupo com `APROVADO` → bot envia confirmação ao cliente
- Admin responde a uma mensagem do grupo com `RECUSADO [motivo]` → bot envia recusa ao cliente
- Admin responde a uma mensagem do grupo com `REENVIAR` → bot pede novo comprovante ao cliente
- Admin encaminha qualquer texto/imagem/doc → bot repassa ao cliente vinculado ao pedido

### O que o bot NÃO faz atualmente
- Não responde clientes que enviam mensagens espontâneas ao número do WhatsApp
- Não consulta catálogo de produtos
- Não informa preços, estoque, promoções ou parcelamento
- Não tem fluxo de conversa nem contexto
- Não tem palavras-chave nem IA
- Não registra histórico de mensagens de clientes

### Identificação de pedido no grupo
O bot usa 5 métodos em cascata para identificar qual pedido está sendo respondido:
1. Reply à mensagem original do pedido (`groupMessageId`)
2. Reply à mensagem de comprovante (`proofGroupMessageId`)
3. UUID do pedido no texto
4. shortId (PEDxxxxx) no texto
5. UUID na mensagem citada (compatibilidade com pedidos antigos)

### Reconexão automática
- Backoff exponencial: começa em 5s, dobra a cada falha, máximo 60s
- QR Code enviado automaticamente ao Telegram quando a sessão expira
- Backup de `creds.json` antes de cada `saveCreds()`
- Shutdown gracioso ao receber SIGTERM/SIGINT

---

## Fluxo de Mensagens

### Mensagem chegando ao bot (grupo admin)
1. `sock.ev.on('messages.upsert')` recebe o evento
2. Verifica se veio do `WHATSAPP_GROUP_ID` — ignora tudo fora do grupo
3. Ignora mensagens enviadas pelo próprio bot (`fromMe: true`)
4. Tenta identificar o pedido via 5 métodos
5. Se pedido identificado: executa comando (APROVADO/RECUSADO/REENVIAR) ou encaminha conteúdo ao cliente
6. Se não identificado: ignora a mensagem

### Mensagem enviada ao cliente
- `resolveWAJid()` consulta os servidores WA para obter o JID correto (trata migração 8↔9 dígitos)
- `sock.sendMessage(jid, { text })` ou com mídia (image, video, audio, document)

---

## Tráfego Pago e Origem de Leads

### O que o sistema consegue capturar atualmente (site)

O `tracker.js` é robusto na captura de origem de visitantes:

| Sinal | Capturado? | Como |
|---|---|---|
| fbclid (Facebook/Instagram click ID) | ✅ Sim | Query param da URL, via heartbeat |
| gclid (Google click ID) | ✅ Sim | Query param da URL, via heartbeat |
| UTM source, medium, campaign, content, term | ✅ Sim | Query params da URL, via heartbeat |
| Referrer (URL de origem) | ✅ Sim | Passado pelo frontend no heartbeat |
| Dispositivo, navegador, OS | ✅ Sim | Parsing do User-Agent |
| Cidade e país | ✅ Sim | Geocoding via ip-api.com (async) |
| Produto visualizado | ✅ Sim | productId no heartbeat |
| Campanha UTM | ✅ Sim | Associada ao pedido |

### Classificação de tráfego pago (`classifyPaidSource`)
- `fbclid` presente → Facebook Ads ou Instagram Ads (conforme UTM source)
- `gclid` presente → Google Ads
- `utmMedium` = cpc, ppc, paid, paid_social, meta → classifica pela source
- `utmSource` = instagram, facebook, google, tiktok → classifica como Ads
- Resultado armazenado em `session.paidSource` e `dayData.paidSources`

### Notificação de visitante pago
- Após 3 segundos (para aguardar geocoding), `telegram.notifyPaidVisitor(session)` envia ao Telegram:
  - Origem (Facebook Ads, Instagram Ads, etc.)
  - Produto que estava visualizando
  - Preço do produto
  - Campanha UTM
  - fbclid / gclid (últimos 10 chars)
  - Dispositivo, cidade, país

### Limitação: tráfego pago via WhatsApp
- **Quando o cliente chega pelo WhatsApp diretamente** (link `wa.me/`), não é possível capturar UTM params porque o WhatsApp não transmite esses parâmetros na abertura do chat.
- A Meta fornece o `fbclid` na URL de destino da landing page, mas NÃO em links diretos para WhatsApp.
- Para campanhas com destino "Clique para WhatsApp" (CTWA), a Meta envia dados de atribuição via Webhook da Cloud API — mas o sistema atual usa Baileys (API não-oficial), que não recebe webhooks da Meta.

---

## Fluxos Principais

### Fluxo 1: Cliente acessa catálogo
```
Browser → GET / → Express serve public/index.html
Browser → GET /data/iphones.json → Express serve server/data/catalogs/iphones.json
Browser → GET /api/banners → retorna banners ativos
Browser → tracker-beacon.js → POST /api/track/heartbeat (sessionId, UTMs, referrer)
Tracker → detecta tráfego pago → notifica Telegram após 3s com geo
```

### Fluxo 2: Cliente visualiza produto
```
Browser → GET /product?id=MLB123 → Express serve public/index.html (wildcard SPA)
product-1.js → GET /api/catalog/product/MLB123 → retorna produto + siblings + related
GET /api/product-stats/MLB123 → retorna views, viewingNow, recentActivity
loja-oficial.js → gera extras fake no localStorage
```

### Fluxo 3: Pedido criado
```
checkout.js → POST /api/payment/generate (com X-Auth-Token)
  → validateCoupon() se houver cupom
  → generatePix() se pixConfig.pixKey estiver configurado
  → cria registro em payments.json
  → sendPaymentRequest() → WhatsApp grupo admin
  → se WA offline → Telegram fallback
  → retorna { paymentId, shortId }
```

### Fluxo 4: Aprovação de pagamento
```
Admin (WhatsApp grupo) → responde "APROVADO" à mensagem do pedido
sock.ev messages.upsert → identifica pagamento via groupMessageId
→ payment.status = 'paid', payment.paidAt = agora
→ generateTracking() → rastreamento simulado gerado
→ sock.sendMessage(clientJid, "Pagamento Aprovado!")
→ salva em payments.json
```

### Fluxo 5: Recuperação de checkout abandonado
```
setInterval(10min) → percorre payments com status pending/awaiting_validation
→ 30min sem pagar → envia PIX Copia e Cola ao cliente
→ 6h sem pagar → envia "oferta ainda disponível"
→ 24h sem pagar → envia "última chance"
→ salva flags recoverySent para não duplicar
```

---

## Problemas Críticos

### 1. Dados de promoção/brinde não existem no servidor
O `loja-oficial.js` cria dados falsos no `localStorage` (descontos percentuais, brindes, frete grátis por produto). Esses dados não existem em nenhum lugar no servidor. Um bot que consultasse o banco responderia informações **diferentes** do que o cliente viu no site.

### 2. Não há campo de preço PIX
Não existe campo `pricePix` nos produtos. A regra de "X% no PIX" é configurada no frontend (loja-oficial.js) e via cupons. Um bot não consegue informar o preço PIX correto sem uma fonte de dados estruturada.

### 3. Rastreamento de entrega é fictício
O `shipping.js` gera etapas de rastreamento simuladas com base no CEP, sem consultar Correios ou qualquer transportadora. Se o cliente perguntar "onde está meu pedido", os dados exibidos são inventados pelo sistema.

### 4. Estoque não é decrementado automaticamente
Quando um pedido é criado, o campo `stock` do produto não é decrementado em `payments.js`. A redução de estoque só ocorre se o admin fizer a edição manualmente via painel. Isso permite venda duplicada do mesmo item.

### 5. Cartão de crédito processado manualmente
Os dados do cartão (número, CVV, validade) são enviados em texto plano via WhatsApp para o grupo admin. Não há gateway de pagamento integrado. O admin precisa processar manualmente em outra plataforma. Isso é um risco de PCI-DSS.

### 6. Comprovante aceita apenas um envio
`payment.js:249` rejeita segundo comprovante com HTTP 409. Se o primeiro comprovante for enviado errado e o admin pedir REENVIAR, o cliente pode tentar enviar novo comprovante — e o sistema aceitará porque REENVIAR limpa `payment.proofs = []`.

### 7. OTP armazenado em memória (Map)
O `_otpStore` em `server/index.js` é um `Map` em memória. Se o servidor reiniciar, todos os OTPs em andamento são perdidos. Os usuários que solicitaram OTP verão "código inválido".

### 8. Bot não responde clientes que mandam mensagem
Um cliente que mandar mensagem direta ao número WhatsApp não recebe nenhuma resposta automática. O sistema ignora todas as mensagens que não vêm do grupo admin.

### 9. Dados de analytics limitados a 200 produtos
O `tracker.js` mantém no máximo 200 produtos em memória (linha 535). Em catálogos com centenas de produtos, apenas os 150 mais visualizados são mantidos.

---

## Problemas Médios

### 1. Cache de catálogo não invalida em edição inline
`_catalogCache` em `index.js` é limpo quando o admin faz upload de catálogo ou edição via API admin, mas não invalida automaticamente em outros cenários. O cache é por filename e vive enquanto o processo estiver rodando.

### 2. Dupla fonte de catálogos (public/data vs server/data/catalogs)
Existe risco de confusão: o admin edita em `server/data/catalogs/`, mas os arquivos originais em `public/data/` ficam desatualizados. O deploy (git pull) pode sobrescrever `public/data/` com versões antigas, mas não toca em `server/data/`.

### 3. Funções `loadUsers`, `loadProducts` duplicadas
As mesmas funções existem em `index.js`, `payment.js` e `admin.js` separadamente. Uma mudança na estrutura de dados precisaria ser feita em múltiplos lugares.

### 4. Limite de sessions por usuário: 15
O sistema descarta sessões antigas ao criar novas (limite 15 por usuário). Isso pode deslogar usuários em múltiplos dispositivos sem aviso.

### 5. Geocoding via ip-api.com (gratuito)
O limite é 45 req/min. Em picos de tráfego, lookups falharão silenciosamente. O sistema tem queue mas sem retry com backoff.

### 6. Telegram como fallback de WhatsApp
Quando o WhatsApp está offline, novos pedidos são notificados pelo Telegram. Mas o admin pode não estar monitorando o Telegram, resultando em pedidos ignorados.

### 7. Sem validação de estoque no carrinho
O usuário pode adicionar ao carrinho e tentar comprar um produto sem estoque (`stock: 0`). A validação só ocorreria se fosse implementada no servidor no momento de criar o pedido (não está).

### 8. `src/client/pages/` duplicado
Existe uma pasta `src/client/pages/` com os mesmos arquivos de `public/pages/`. Pode causar confusão sobre qual versão está sendo servida.

---

## Melhorias Recomendadas

1. **Criar campo `pricePix` e `installmentsPlan` nos produtos** — habilita o bot a responder preços corretos
2. **Criar campo `guarantee` e `gift` nos produtos** — habilita o bot a informar garantia e brindes reais
3. **Integrar gateway de pagamento real** (Stripe, MercadoPago, PagSeguro) — eliminar processamento manual de cartão
4. **Integrar Correios ou transportadora real** — rastreamento verídico
5. **Decrementar estoque ao criar pedido** — evitar venda duplicada
6. **Criar tabela de conversas WhatsApp** — memória de conversa para bot futuro
7. **Migrar para banco de dados** (PostgreSQL, MongoDB) — escalabilidade e consultas complexas
8. **Implementar listener de mensagens de clientes no WhatsApp** — base para bot autônomo
9. **Unificar fonte de dados de promoções** — sincronizar `loja-oficial.js` com dados reais do servidor

---

## Dados Ausentes

Os seguintes dados precisam existir no banco antes de o bot poder responder com segurança:

| Informação | Existe no banco? | Onde deveria estar |
|---|---|---|
| Preço no PIX | ❌ Não | Campo `pricePix` no produto |
| Regra de parcelamento por produto | ❌ Não | Campo `installmentsPlan` no produto |
| Garantia do produto | ❌ Não | Campo `guarantee` no produto |
| Brinde incluído | ❌ Não | Campo `gift` no produto |
| Histórico de conversa WA do cliente | ❌ Não | Tabela/arquivo de conversas |
| Produto que o cliente perguntou via WA | ❌ Não | Registro de interesse |
| Rastreamento real da entrega | ❌ Não | Integração com transportadora |
| Desconto percentual no PIX (por produto) | ❌ Não | Campo `pixDiscount` ou regra de cupom |

---

## Riscos Técnicos

1. **Falha de persistência:** Sem transações — duas escritas simultâneas no mesmo JSON podem corromper o arquivo
2. **Sem backup automático de payments.json** — perda de pedidos em caso de corrompimento
3. **Sessão WhatsApp em arquivo local** — se `server/auth_info/creds.json` for deletado, o bot precisa de novo QR Code
4. **Dados de cartão em texto no WhatsApp** — risco de segurança e compliance (PCI-DSS)
5. **ip-api.com sem SLA** — serviço gratuito pode sair do ar ou mudar limites
6. **Baileys é API não-oficial** — pode parar de funcionar se o WhatsApp mudar o protocolo

---

## Conclusão

O sistema é funcional e bem construído para uma operação de e-commerce artesanal, com integrações reais de WhatsApp, Telegram, frete e PIX. O ponto crítico para a próxima fase é que o bot **não tem capacidade de atendimento autônomo**. Para transformá-lo em um bot que responda clientes com dados reais, são necessárias três fundações: (1) adicionar campos de dados comerciais nos produtos (preço PIX, parcelamento, garantia, brinde), (2) implementar um listener para mensagens diretas de clientes no WhatsApp, e (3) criar um mecanismo de contexto de conversa por número de telefone.
