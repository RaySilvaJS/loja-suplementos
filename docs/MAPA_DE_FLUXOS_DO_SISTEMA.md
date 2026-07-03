# MAPA DE FLUXOS DO SISTEMA
**Data:** 2026-06-26 | Baseado no código atual do repositório iphone-brasil

---

## 1. Cadastro de Produto (via painel admin — catálogo)

```mermaid
flowchart TD
    A[Admin acessa /devops] --> B[Autenticação: X-Admin-Token ou role admin]
    B --> C{Token válido?}
    C -- Não --> D[403 Acesso negado]
    C -- Sim --> E[Abre Gerenciador de Catálogos]
    E --> F[Seleciona catálogo: iphones, androids, etc.]
    F --> G[Clica em Novo Produto]
    G --> H[Preenche: id, name, price, color, storage, stock, images...]
    H --> I[POST /api/admin/catalog/:catalogKey]
    I --> J[Valida campos obrigatórios: id, name]
    J --> K[Verifica se id já existe no catálogo]
    K --> L[Adiciona produto no início do array]
    L --> M[Salva server/data/catalogs/:filename.json]
    M --> N[Invalida cache _catalogCache]
    N --> O[audit.append product_edit]
    O --> P[Produto disponível no site]
```

**Arquivos:** `server/index.js` (POST `/api/admin/catalog/:catalogKey`), `server/data/catalogs/*.json`, `server/audit.js`

**Riscos:**
- ID duplicado é rejeitado mas depende de unicidade manual
- Produto criado aparece imediatamente (sem revisão)
- Sem validação de imagens — URLs inválidas aparecem quebradas

---

## 2. Atualização de Preço

```mermaid
flowchart TD
    A[Admin no painel ou edição inline] --> B[PATCH /api/admin/catalog/:catalogKey/:productId]
    B --> C[requireAdmin middleware]
    C --> D{Autenticado?}
    D -- Não --> E[401/403]
    D -- Sim --> F[Lê catálogo do disco]
    F --> G[Encontra produto por id]
    G --> H[Atualiza campo price]
    H --> I[Registra diff em _history do produto]
    I --> J[Salva arquivo JSON no disco]
    J --> K[Invalida _catalogCache para esse arquivo]
    K --> L[audit.append price_change]
    L --> M[Novo preço disponível para próximos requests]
```

**Arquivos:** `server/index.js` (PATCH `/api/admin/catalog/:catalogKey/:productId`), `server/audit.js`

**Riscos:**
- Sem notificação ao cliente que tem esse produto no carrinho
- Cache em memória invalidado mas navegadores com a página aberta não são atualizados
- Produto em carrinho (localStorage) mantém o preço antigo até recarregar

---

## 3. Atualização de Estoque

```mermaid
flowchart TD
    A[Admin no painel] --> B[PATCH /api/admin/catalog/:catalogKey/:productId]
    B --> C[Campo stock no body]
    C --> D[Converte para Number]
    D --> E[Salva no JSON]
    E --> F[Novo estoque visível no site]
    
    G[Cliente compra produto] --> H[POST /api/payment/generate]
    H --> I[Pedido criado em payments.json]
    I --> J{Estoque atualizado automaticamente?}
    J -- NÃO --> K[❌ Stock permanece igual no catálogo]
    K --> L[Risco: venda duplicada]
```

**Arquivos:** `server/index.js`, `server/payment.js`

**Problema crítico:** O estoque não é decrementado automaticamente quando um pedido é criado. Apenas a edição manual pelo admin reduz o `stock`.

---

## 4. Aplicação de Promoção

```mermaid
flowchart TD
    A[Admin edita produto] --> B[PATCH com campos isPromo=true, promoPercent=N, promoBadge=texto]
    B --> C[Salva no catálogo]
    C --> D[Frontend renderiza badge de promoção]
    
    E[loja-oficial.js no browser] --> F[Gera desconto fake por produto]
    F --> G[Armazena em localStorage loja-oficial-extras]
    G --> H[Exibido na página do produto como promoção]
    H --> I{Dado está no servidor?}
    I -- NÃO --> J[❌ Dados diferentes entre site e bot futuro]
```

**Arquivos:** `server/index.js`, `public/js/loja-oficial.js`

**Risco crítico:** Promoções exibidas pelo `loja-oficial.js` são geradas no frontend e não existem no banco de dados.

---

## 5. Aplicação de Cupom

```mermaid
flowchart TD
    A[Cliente digita cupom no checkout] --> B[POST /api/coupons/validate]
    B --> C[coupons.js validateCoupon]
    C --> D{Cupom existe e ativo?}
    D -- Não --> E[400 Cupom inválido]
    D -- Sim --> F{Dentro da data de validade?}
    F -- Não --> G[400 Cupom expirado]
    F -- Sim --> H{Limite de usos atingido?}
    H -- Sim --> I[400 Limite atingido]
    H -- Não --> J{Valor mínimo atendido?}
    J -- Não --> K[400 Pedido mínimo]
    J -- Sim --> L{Método de pagamento correto?}
    L -- Não --> M[400 Cupom só para PIX/cartão]
    L -- Sim --> N[Retorna: discount, type, description]
    N --> O[Cliente vê desconto aplicado no checkout]
    O --> P[POST /api/payment/generate com couponCode]
    P --> Q[Validação dupla no servidor]
    Q --> R[recordCouponUse: incrementa usedCount]
    R --> S[Pedido criado com couponDiscount aplicado]
```

**Arquivos:** `server/coupons.js`, `server/index.js` (GET `/api/coupons/active`), `server/payment.js`

**Estado atual:** `server/data/coupons.json` está vazio — nenhum cupom cadastrado.

---

## 6. Cliente Acessando Catálogo

```mermaid
flowchart TD
    A[Cliente entra no site] --> B[GET / → index.html]
    B --> C[tracker-beacon.js inicia sessão]
    C --> D[POST /api/track/heartbeat com sessionId, UTMs, fbclid, gclid, referrer]
    D --> E[tracker.js heartbeat]
    E --> F[Classifica origem: paidSource, source]
    F --> G{Tráfego pago?}
    G -- Sim --> H[setTimeout 3s → telegram.notifyPaidVisitor]
    G -- Não --> I[Apenas registra na sessão]
    H --> J[Telegram: NOVO VISITANTE Facebook/Instagram Ads]
    
    B --> K[index-1.js carrega]
    K --> L[GET /data/iphones.json → server/data/catalogs/iphones.json]
    L --> M[Renderiza cards de produto]
    M --> N[loja-oficial.js gera extras fake]
    N --> O[Produto exibido com preço e badge]
```

**Arquivos:** `server/tracker.js`, `server/telegram.js`, `public/pages/index-1.js`, `public/js/loja-oficial.js`, `public/js/tracker-beacon.js`

---

## 7. Cliente Visualizando Produto

```mermaid
flowchart TD
    A[Cliente clica em produto] --> B[GET /product?id=MLB123 → product.html]
    B --> C[product-1.js carrega]
    C --> D[GET /api/catalog/product/MLB123]
    D --> E[index.js: percorre todos os catálogos]
    E --> F{Produto encontrado?}
    F -- Não --> G[404 Produto não encontrado]
    F -- Sim --> H[Retorna: product, siblings, related]
    H --> I[Renderiza produto, variações, relacionados]
    
    C --> J[GET /api/product-stats/MLB123]
    J --> K[tracker.snap: views, viewingNow, recentActivity]
    K --> L[Exibe: X pessoas visualizando agora]
    
    I --> M[loja-oficial.js: extras fake para produto]
    M --> N[Exibe: desconto, brinde, frete grátis fake]
```

**Arquivos:** `server/index.js` (GET `/api/catalog/product/:id`), `public/pages/product-1.js`, `public/js/loja-oficial.js`

---

## 8. Cliente Adicionando ao Carrinho

```mermaid
flowchart TD
    A[Cliente clica em Adicionar ao Carrinho] --> B[product-2.js]
    B --> C[Lê item do produto atual + extras do localStorage]
    C --> D[Adiciona em localStorage iphone-vendas-cart]
    D --> E[POST /api/events/cart-add com productName, price, quantity]
    E --> F[server/index.js sendActivityNotification]
    F --> G[WhatsApp grupo admin: PRODUTO ADICIONADO AO CARRINHO]
    
    D --> H[tracker.record cart_add]
    H --> I[Incrementa cartAdds no analytics]
    I --> J[carts.set sessionId → estado do carrinho]
```

**Arquivos:** `server/index.js` (POST `/api/events/cart-add`), `public/pages/product-2.js`, `server/tracker.js`

---

## 9. Cliente Entrando no Checkout

```mermaid
flowchart TD
    A[Cliente clica Comprar Agora] --> B[GET /api/coupons/active]
    B --> C{Cupom ativo disponível?}
    C -- Sim --> D[Modal de cupom promocional aparece]
    C -- Não --> E[Vai direto ao checkout]
    D --> F[Cliente aceita ou recusa cupom]
    F --> E
    
    E --> G[checkout.html carrega]
    G --> H[checkout.js: lê cart ou buy-now do localStorage]
    H --> I[GET /api/auth/me com X-Auth-Token]
    I --> J{Está logado?}
    J -- Não --> K[Mostra form de guest checkout]
    K --> L[POST /api/auth/guest]
    J -- Sim --> M[Carrega endereços do usuário]
    M --> N[Renderiza itens, endereços, métodos de pagamento]
    
    N --> O[POST /api/events/checkout-visit]
    O --> P[WhatsApp grupo admin: CLIENTE APERTOU EM COMPRAR]
    
    N --> Q[POST /api/track/event checkout_start]
    Q --> R[tracker.record checkout_start]
    R --> S[telegram.notifyEvent checkout_start]
```

**Arquivos:** `server/index.js`, `public/js/checkout.js`, `public/js/coupon-modal.js`, `server/tracker.js`, `server/telegram.js`

---

## 10. Cliente Pagando (PIX)

```mermaid
flowchart TD
    A[Cliente clica em Pagar com PIX] --> B[checkout.js coleta dados]
    B --> C[POST /api/payment/generate com X-Auth-Token]
    C --> D[payment.js: valida usuário logado]
    D --> E[Valida endereço existe]
    E --> F[validateCoupon se couponCode presente]
    F --> G[generateShortId: PEDxxxxx único]
    G --> H{pixConfig.pixKey configurado?}
    H -- Sim --> I[generatePix: BR Code EMV QR]
    H -- Não --> J[pixCode = null]
    I --> K[Cria registro em payments.json]
    J --> K
    K --> L{WhatsApp socket conectado?}
    L -- Sim --> M[sendPaymentRequest ao grupo admin]
    M --> N[Grupo recebe: pedido + dados + PIX code]
    N --> O[messageId salvo como groupMessageId]
    L -- Não --> P[telegram.send: pedido sem WA]
    
    I --> Q[sock.sendMessage ao cliente com PIX]
    Q --> R[Cliente recebe PIX Copia e Cola no WhatsApp]
    
    K --> S[recordCouponUse se cupom]
    S --> T[tracker.record order_created, pix_generated]
    T --> U[Retorna: paymentId, shortId ao frontend]
    U --> V[Redirect para pagamento.html?id=paymentId]
```

**Arquivos:** `server/payment.js`, `server/pix.js`, `server/whatsapp.js`, `server/coupons.js`, `server/tracker.js`, `server/telegram.js`

---

## 11. Pedido Sendo Criado

```mermaid
flowchart TD
    A[POST /api/payment/generate] --> B[newPayment object criado]
    B --> C{
      id: UUID,
      shortId: PEDxxxxx,
      status: pending,
      qrCode: PIX string ou null,
      clientPhone, clientName, clientEmail, clientCpf,
      userId, address, couponDiscount, logs[]
    }
    C --> D[payments.push newPayment]
    D --> E[savePayments: fs.writeFileSync payments.json]
    E --> F[Pedido persistido]
    
    F --> G[Gatilhos paralelos]
    G --> H[WA grupo admin notificado]
    G --> I[Cliente recebe PIX via WA]
    G --> J[Telegram notificado]
    G --> K[tracker.record order_created]
    G --> L[audit.append order_created]
```

---

## 12. Cliente Iniciando Conversa no WhatsApp

```mermaid
flowchart TD
    A[Cliente envia mensagem para o número WA da loja] --> B[Mensagem chega no sock]
    B --> C[sock.ev messages.upsert]
    C --> D{fromMe?}
    D -- Sim --> E[Ignora]
    D -- Não --> F{jid === WHATSAPP_GROUP_ID?}
    F -- Sim --> G[Fluxo de grupo admin]
    F -- Não --> H{❌ MENSAGEM DIRETA DE CLIENTE}
    H --> I[Nenhum handler registrado]
    I --> J[Mensagem ignorada silenciosamente]
    J --> K[Cliente não recebe resposta]
```

**Problema crítico:** O bot atual não possui listener para mensagens diretas de clientes. Toda a lógica é exclusiva do grupo admin.

---

## 13. Mensagem Chegando ao Bot (grupo admin)

```mermaid
flowchart TD
    A[Admin digita no grupo WA] --> B[sock.ev messages.upsert]
    B --> C[Extrai: text, contextInfo, quotedMsgId]
    C --> D[Tenta identificar pedido]
    D --> E{Método 1: reply groupMessageId}
    E -- Encontrou --> F[payment identificado]
    E -- Não --> G{Método 2: reply proofGroupMessageId}
    G -- Encontrou --> F
    G -- Não --> H{Método 3: UUID no texto}
    H -- Encontrou --> F
    H -- Não --> I{Método 4: shortId PEDxxxxx no texto}
    I -- Encontrou --> F
    I -- Não --> J{Método 5: UUID na mensagem citada}
    J -- Encontrou --> F
    J -- Não --> K[Pedido não identificado → ignora]
    
    F --> L{Texto começa com APROVADO?}
    L -- Sim --> M[payment.status = paid, paidAt, tracking gerado]
    M --> N[sendMessage ao cliente: Pagamento Aprovado]
    
    F --> O{Texto começa com RECUSADO?}
    O -- Sim --> P[payment.status = refused, refuseReason]
    P --> Q[sendMessage ao cliente: Pagamento Recusado + motivo]
    
    F --> R{Texto começa com REENVIAR?}
    R -- Sim --> S[proofs=[], status=pending]
    S --> T[sendMessage ao cliente: Enviar novo comprovante]
    
    F --> U{Tem mídia ou texto?}
    U -- Sim --> V[downloadMediaMessage ou texto]
    V --> W[sock.sendMessage ao clientJid]
    W --> X[Conteúdo encaminhado ao cliente]
```

**Arquivos:** `server/whatsapp.js` (messages.upsert handler)

---

## 14. Bot Consultando Produto

```mermaid
flowchart TD
    A[Bot precisa de dados de produto] --> B{Produto é do catálogo ou custom?}
    B -- Catálogo --> C[Lê server/data/catalogs/iphones.json etc.]
    B -- Custom --> D[Lê server/data/products.json]
    C --> E[Filtra por id ou model ou name]
    D --> E
    E --> F{Produto encontrado?}
    F -- Sim --> G[Retorna: name, price, priceOriginal, stock, color, storage, specs]
    F -- Não --> H[Produto não encontrado]
    
    G --> I{Preço PIX disponível?}
    I -- NÃO --> J[❌ Campo pricePix não existe]
    I --> K{Parcelamento disponível?}
    K -- NÃO --> L[❌ Campo installmentsPlan não existe]
    I --> M{Garantia disponível?}
    M -- NÃO --> N[❌ Campo guarantee não existe]
    I --> O{Brinde disponível?}
    O -- NÃO --> P[❌ Campo gift não existe]
```

**Nota:** A consulta acima descreve o que **seria possível** de implementar no bot. Atualmente o bot não realiza nenhuma consulta de catálogo.

---

## 15. Bot Respondendo Preço

```mermaid
flowchart TD
    A[Cliente pergunta preço de produto] --> B{Bot tem acesso ao catálogo?}
    B -- ATUALMENTE NÃO --> C[❌ Nenhuma resposta é enviada]
    B -- FUTURO SIM --> D[Busca produto no catálogo]
    D --> E{Encontrou?}
    E -- Não --> F[Resposta segura: não confirmado no momento]
    E -- Sim --> G[Informa price como preço base]
    G --> H{Tem priceOriginal diferente?}
    H -- Sim --> I[Informa desconto calculado]
    H -- Não --> J[Apenas preço atual]
    I --> K{Tem regra de PIX?}
    K -- Sim --> L[Informa preço com desconto PIX]
    K -- Não --> M[Informa apenas preço base]
```

---

## 16. Bot Respondendo Estoque

```mermaid
flowchart TD
    A[Cliente pergunta se tem produto] --> B{Bot implementado?}
    B -- ATUALMENTE NÃO --> C[❌ Nenhuma resposta]
    B -- FUTURO --> D[Busca produto por nome/modelo]
    D --> E{Encontrou?}
    E -- Não --> F[Resposta segura: verificar no site]
    E -- Sim --> G{stock > 0?}
    G -- Sim --> H[Tem em estoque]
    G -- Não --> I[Sem estoque no momento]
    G --> J{stock == 1?}
    J -- Sim --> K[Último disponível — urgência]
```

---

## 17. Bot Enviando Link do Produto

```mermaid
flowchart TD
    A[Bot quer enviar link do produto] --> B[Produto tem id]
    B --> C{Produto do catálogo?}
    C -- Sim --> D[URL: /product?id=MLB123]
    C -- Não (custom) --> E[URL: /product?id=CUSTOM-ID]
    D --> F[sock.sendMessage clientJid com link]
    E --> F
```

---

## 18. Cliente Vindo de Anúncio

```mermaid
flowchart TD
    A[Meta Ads exibe anúncio] --> B{Destino do anúncio}
    B -- Landing page do site --> C[Cliente acessa URL com UTMs e fbclid]
    C --> D[tracker-beacon.js detecta fbclid/gclid]
    D --> E[POST /api/track/heartbeat com todos parâmetros]
    E --> F[tracker.js classifyPaidSource]
    F --> G[session.paidSource = Instagram Ads / Facebook Ads]
    G --> H{Após 3s — geo disponível?}
    H --> I[telegram.notifyPaidVisitor: notifica com produto, cidade, origem]
    
    B -- WhatsApp direto CTWA --> J[Cliente abre chat WA]
    J --> K{fbclid ou UTMs chegam via WA?}
    K -- NÃO --> L[❌ Origem não capturada via WhatsApp]
    K -- FUTURO Meta Cloud API --> M[Webhook com atribuição da Meta]
```

**Limitação atual:** Campanhas com destino "Clique para WhatsApp" não transmitem UTMs ou fbclid ao bot Baileys.

---

## 19. Sistema Registrando Origem do Lead

```mermaid
flowchart TD
    A[Heartbeat recebido] --> B[tracker.heartbeat]
    B --> C[Armazena na sessão: source, paidSource, utmSource, utmCampaign, fbclid, gclid]
    C --> D[Persiste em analytics/visitors.json]
    D --> E{Lead faz pedido?}
    E -- Sim --> F[POST /api/payment/generate]
    F --> G[Tracker record order_created com sessionId]
    G --> H{sessionId tem campanha?}
    H -- Sim --> I[dayData.campaigns[camp].pixPaid++ ou checkouts++]
    H --> J[telegram.notifyEvent com campaign]
    
    E -- Não --> K[Origem perdida quando fecha o browser]
    K --> L[Não é salva no pedido se não converter]
```

**Limitação:** A origem do lead só é associada ao pedido indiretamente via `telegram.notifyEvent`. O campo `campaign` ou `source` não é salvo diretamente no registro do pedido em `payments.json`.

---

## 20. Bot Enviando Cliente para Checkout

```mermaid
flowchart TD
    A[Bot decide enviar para checkout] --> B{Cliente já tem conta?}
    B -- Sim --> C[Envia link /checkout com produto pre-selecionado]
    B -- Não --> D[Envia link /checkout ou /cadastro primeiro]
    C --> E[sock.sendMessage: Acesse o checkout...]
    D --> E
    E --> F[Cliente clica no link]
    F --> G[checkout.js detecta source=buy ou source=cart]
    G --> H[Carrega produto do localStorage se pre-configurado]
    
    B --> I{ATUALMENTE: Bot faz isso?}
    I -- NÃO --> J[❌ Bot atual não envia clientes ao checkout]
```

---

## 21. Cliente Consultando Pedido

```mermaid
flowchart TD
    A[Cliente acessa /meus-pedidos] --> B[GET /api/auth/orders com X-Auth-Token]
    B --> C{Autenticado?}
    C -- Não --> D[401 Não autenticado]
    C -- Sim --> E[Filtra payments.json por userId]
    E --> F{Pedido paid sem tracking?}
    F -- Sim --> G[generateTracking: cria rastreamento simulado]
    G --> H[Salva tracking no payment]
    F --> I[Retorna lista de pedidos com status, tracking]
    H --> I
    I --> J[meus-pedidos.html renderiza cards]
    J --> K[Exibe: status, produto, valor, tracking steps]
```

**Arquivos:** `server/index.js` (GET `/api/auth/orders`), `server/shipping.js`, `public/meus-pedidos.html`

---

## 22. Cliente Consultando Entrega

```mermaid
flowchart TD
    A[Cliente clica em rastrear pedido] --> B[Acessa tracking do pedido em meus-pedidos.html]
    B --> C[Exibe steps do tracking object]
    C --> D[steps: payment_approved, preparing, dispatched, in_transit, out_for_delivery, delivered]
    D --> E{Steps são reais?}
    E -- NÃO --> F[❌ Gerados pelo shipping.js com base em dias estimados por CEP]
    F --> G[Usuário vê datas/locais simulados]
    G --> H[Não reflete a movimentação real do produto]
```

---

## Legenda de Riscos

| Símbolo | Significado |
|---|---|
| ✅ | Implementado e funcionando |
| ❌ | Não implementado ou dado ausente |
| ⚠️ | Implementado com limitações |

---

## Sumário de Gargalos por Fluxo

| Fluxo | Principal Gargalo |
|---|---|
| Cadastro de produto | Manual, sem validação de imagens |
| Atualização de preço | Estoque e preço no carrinho não atualiza em tempo real |
| Estoque | Não decrementado automaticamente ao vender |
| Promoção | Dados fake no frontend, invisíveis ao servidor |
| Pagamento cartão | Manual, dados do cartão em texto via WhatsApp |
| Bot mensagens diretas | Nenhum handler — mensagens de clientes ignoradas |
| Rastreamento | Simulado — não reflete realidade |
| Origem de leads via WA | Não capturada quando cliente vem via anúncio CTWA |
