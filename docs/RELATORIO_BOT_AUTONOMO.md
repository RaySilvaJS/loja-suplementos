# RELATÓRIO: BOT AUTÔNOMO — DIAGNÓSTICO E ARQUITETURA FUTURA
**Data:** 2026-06-26 | Baseado no código atual do repositório iphone-brasil

---

## Como o Bot Funciona Hoje

O bot atual (`server/whatsapp.js`) é exclusivamente um **roteador de mensagens do grupo admin para o cliente**. Ele não tem capacidade de:
- Receber e processar mensagens de clientes
- Consultar dados do catálogo
- Responder perguntas sobre produtos
- Iniciar conversas proativamente (exceto recuperação de checkout abandonado)

### O que o bot ATUALMENTE faz

**Recebe do grupo admin e executa:**
| Comando | Ação |
|---|---|
| `APROVADO` ou `PAGO` | Marca pedido como pago, gera rastreamento, notifica cliente |
| `RECUSADO [motivo]` | Marca pedido como recusado, informa motivo ao cliente |
| `REENVIAR` | Limpa comprovantes, pede novo comprovante ao cliente |
| Qualquer texto/mídia | Encaminha para o cliente vinculado ao pedido |

**Envia proativamente ao grupo admin:**
- Novo cadastro de cliente
- Novo login
- Produto adicionado ao carrinho
- Cliente clicou em Comprar
- Novo pedido criado (com dados completos do cliente e PIX code)
- Comprovante de pagamento enviado

**Envia proativamente ao cliente:**
- PIX Copia e Cola quando pedido PIX é criado
- Confirmação de pagamento aprovado
- Notificação de recusa com motivo
- Solicitação de novo comprovante
- Recuperação de checkout: mensagens em 30min, 6h e 24h após pedido abandonado
- OTP de autenticação via WhatsApp (código 6 dígitos)

### Handler de mensagens de clientes
O `messages.upsert` handler no `server/whatsapp.js` contém esta verificação:
```javascript
if (jid !== WHATSAPP_GROUP_ID) return;
```
Isso significa que **todas as mensagens diretas de clientes são ignoradas silenciosamente**. Não existe nenhum handler para mensagens de clientes no código atual.

---

## Dados Disponíveis para o Bot

### Dados que o bot PODE consultar hoje (se implementado)

| Dado | Fonte | Confiabilidade |
|---|---|---|
| Nome do produto | `server/data/catalogs/*.json` | ✅ Alta |
| Modelo do produto | `server/data/catalogs/*.json` | ✅ Alta |
| Preço base atual | `server/data/catalogs/*.json` campo `price` | ✅ Alta |
| Preço original (tachado) | `server/data/catalogs/*.json` campo `priceOriginal` | ✅ Alta |
| Estoque | `server/data/catalogs/*.json` campo `stock` | ⚠️ Média — não decrementa ao vender |
| Cor | `server/data/catalogs/*.json` campo `color` | ✅ Alta |
| Armazenamento (memória) | `server/data/catalogs/*.json` campo `storage` | ✅ Alta |
| Condição (novo/usado) | `server/data/catalogs/*.json` campo `condition` | ✅ Alta |
| Especificações técnicas | `server/data/catalogs/*.json` campo `specs` | ✅ Alta |
| Status de promoção | `server/data/catalogs/*.json` campos `isPromo`, `promoPercent` | ✅ Alta (quando preenchido) |
| Cupons ativos | `server/data/coupons.json` | ✅ Alta — mas atualmente vazio |
| Status do pedido do cliente | `server/data/payments.json` filtrado por `clientPhone` | ✅ Alta |
| Histórico de pedidos | `server/data/payments.json` por `userId` | ✅ Alta |
| Dados do cliente | `server/data/users.json` por `whatsapp` | ✅ Alta |
| Variações do mesmo modelo | Siblings via campo `model` no catálogo | ✅ Alta |
| Produtos relacionados | Outros produtos do mesmo catálogo | ✅ Alta |
| Link do produto | `/product?id=:id` | ✅ Alta |

---

## Dados Indisponíveis para o Bot

| Dado | Status | Impacto |
|---|---|---|
| Preço no PIX (campo próprio) | ❌ Não existe | Bot não pode informar preço PIX correto |
| Regra de parcelamento por produto | ❌ Não existe | Bot não pode informar parcelas/juros |
| Valor da parcela calculado | ❌ Não existe | Idem |
| Garantia do produto | ❌ Não existe campo | Bot não pode confirmar garantia |
| Brinde incluído | ❌ Não existe no banco (apenas loja-oficial.js fake) | Bot não pode confirmar brinde |
| Desconto fake do loja-oficial.js | ❌ Apenas no localStorage do browser | Bot informaria valores diferentes do site |
| Frete para um CEP específico | ⚠️ Depende de Melhor Envio API — indisponível ao bot | Bot não pode informar frete |
| Rastreamento real da entrega | ❌ Sistema de rastreamento é simulado | Bot não pode confirmar onde está o produto |
| Histórico de conversa WA do cliente | ❌ Não existe | Sem contexto entre mensagens |
| Produto de interesse do cliente | ❌ Não registrado | Bot começa do zero toda conversa |
| Origem do lead (campanha) | ⚠️ Existe na sessão web mas não é vinculada ao chat WA | Bot não sabe de qual anúncio veio |

---

## Integração Atual com o Site

### O que o site envia para o backend que o bot poderia usar

| Evento do site | Endpoint | Salvo? | Bot pode consultar? |
|---|---|---|---|
| Heartbeat de sessão | POST /api/track/heartbeat | Em memória (tracker.js sessions) | ❌ Não persistido em arquivo |
| Produto adicionado ao carrinho | POST /api/events/cart-add | Apenas notificação WA, não salva | ❌ Não |
| Cliente entrou no checkout | POST /api/events/checkout-visit | Apenas notificação WA, não salva | ❌ Não |
| Pedido criado | POST /api/payment/generate | ✅ payments.json | ✅ Sim |
| Comprovante enviado | POST /api/payment/proof | ✅ payments.json + arquivo | ✅ Sim |

---

## Integração Atual com Produtos

O bot **não consulta produtos atualmente**. Se precisar implementar:

- **Catálogos estáticos:** `server/data/catalogs/*.json` — 7 arquivos, formato consistente
- **Produtos custom:** `server/data/products.json` — formato similar, poucos itens
- **API disponível:** `GET /api/catalog/product/:id` já retorna produto + siblings + related
- **Busca por modelo:** `server/data/catalogs/iphones.json` pode ser filtrado por `model`, `color`, `storage`

---

## Integração Atual com Preços

- Preço base: campo `price` nos catálogos ✅
- Preço original: campo `priceOriginal` ✅
- Desconto calculável: `(priceOriginal - price) / priceOriginal * 100` ✅
- Preço PIX: **não existe** — o frontend aplica a regra do `loja-oficial.js` que não tem correspondente no banco ❌
- Parcelamento: **não existe estrutura de dados** — não há campo de parcelas por produto ❌

---

## Integração Atual com Estoque

- Campo `stock` existe em todos os produtos dos catálogos ✅
- **Problema:** O estoque não é decrementado quando um pedido é criado
- Um produto com `stock: 1` pode gerar múltiplos pedidos antes de o admin atualizar manualmente
- O bot pode consultar `stock`, mas o valor pode estar desatualizado

---

## Integração Atual com Pedidos

- `server/data/payments.json` contém todos os pedidos com `clientPhone`
- O bot pode encontrar pedidos por `clientPhone` ✅
- Status disponíveis: `pending`, `awaiting_validation`, `paid`, `refused`
- Rastreamento: gerado pelo `shipping.js` — simulado, não real ⚠️

---

## Identificação de Origem de Leads

### Leads vindos do site (funcionando)
1. `tracker-beacon.js` envia heartbeat com UTMs, fbclid, gclid
2. `tracker.js` classifica como `paidSource` (Facebook Ads, Instagram Ads, Google Ads, TikTok Ads)
3. Após 3s (aguarda geo), `telegram.notifyPaidVisitor` notifica o Telegram com produto, cidade, campanha
4. A campanha UTM é associada a checkouts e PIX via `dayData.campaigns`

### Leads vindos diretamente do WhatsApp (NÃO funcionando)
- Quando o cliente chega via link `wa.me/` gerado pelo site, o WhatsApp não transmite UTM params
- Campanhas Meta com destino "Clique para WhatsApp" (CTWA) enviam dados via Webhook da Cloud API — mas o sistema usa Baileys (protocolo não-oficial), que não recebe webhooks da Meta
- **Resultado:** Origem do lead via WhatsApp não é capturável com a arquitetura atual

---

## Riscos de Respostas Incorretas

### Risco 1 — Preço diferente do exibido no site
O site exibe descontos gerados pelo `loja-oficial.js` (ex: "45% OFF hoje"). Esses valores são calculados no browser e não existem no banco. Se o bot consultar o banco e informar o preço real, o cliente verá **discrepância**.

**Exemplo:**
- Site exibe: "iPhone 14 por R$ 2.800 (era R$ 5.000)"
- Banco contém: `price: 4094, priceOriginal: 7209`
- Bot informaria: "R$ 4.094" — valor diferente do que o cliente viu

### Risco 2 — Estoque desatualizado
O bot pode informar "temos em estoque" para um produto com `stock: 1` que já foi vendido mas o admin ainda não atualizou o campo.

### Risco 3 — Rastreamento fictício
Se o cliente perguntar "onde está meu pedido", o bot pode consultar `payment.tracking` e informar etapas e datas que são **completamente simuladas** e não refletem o estado real do produto na transportadora.

### Risco 4 — Brinde e garantia inventados
Se o bot tentar informar brinde ou garantia a partir do campo `specs`, pode citar especificações técnicas que não correspondem à oferta comercial atual.

### Risco 5 — Informação de cupom desatualizada
Se `coupons.json` estiver vazio (como está hoje), o bot não consegue informar cupons disponíveis, mesmo que existam promoções exibidas no site via `loja-oficial.js`.

---

## Melhor Arquitetura Recomendada para Bot Autônomo

### Visão geral

```
Cliente (WhatsApp) 
    ↓ mensagem
[Handler de mensagens diretas]
    ↓
[Módulo de Contexto de Conversa]  ← server/data/wa-conversations.json
    ↓
[Módulo de Intenção]  ← regras configuráveis
    ↓
[Módulo de Consulta de Dados]
    ├── Catálogo (server/data/catalogs/*.json)
    ├── Pedidos (server/data/payments.json)
    ├── Cupons (server/data/coupons.json)
    └── Configurações comerciais (server/data/bot-config.json)
    ↓
[Módulo de Resposta]  ← templates configuráveis
    ↓
[sock.sendMessage ao cliente]
    ↓
[Registro no contexto da conversa]
```

### Componentes necessários

#### 1. Handler de mensagens diretas (novo `messages.upsert`)
Remover o `if (jid !== WHATSAPP_GROUP_ID) return` e criar lógica separada para mensagens de clientes.

```
Nova estrutura do messages.upsert:
  if jid === WHATSAPP_GROUP_ID → fluxo admin existente (manter)
  else → fluxo de cliente (novo)
```

#### 2. Módulo de contexto de conversa
Arquivo `server/data/wa-conversations.json`:
```json
{
  "5521999999999": {
    "phone": "5521999999999",
    "lastMessage": "2026-06-26T10:00:00Z",
    "state": "browsing_products",
    "context": {
      "productId": "MLB123",
      "productName": "iPhone 14",
      "lastIntent": "ask_price",
      "pendingOrderId": null
    },
    "history": [
      { "role": "user", "text": "tem iPhone 14?", "at": "..." },
      { "role": "bot", "text": "Sim! Temos o iPhone 14...", "at": "..." }
    ]
  }
}
```

#### 3. Módulo de intenção (configurável, sem IA obrigatória)
Arquivo `server/data/bot-config.json`:
```json
{
  "intents": [
    {
      "id": "ask_availability",
      "keywords": ["tem", "disponível", "tem estoque", "ainda tem"],
      "response_template": "ask_availability"
    },
    {
      "id": "ask_price",
      "keywords": ["preço", "quanto", "valor", "custa"],
      "response_template": "product_price"
    },
    {
      "id": "ask_pix_price",
      "keywords": ["pix", "à vista", "desconto pix"],
      "response_template": "pix_price"
    },
    {
      "id": "ask_installments",
      "keywords": ["parcela", "parcelado", "cartão", "vezes"],
      "response_template": "installments"
    },
    {
      "id": "ask_order_status",
      "keywords": ["pedido", "compra", "entrega", "rastrear", "chegou"],
      "response_template": "order_status"
    },
    {
      "id": "buy_intent",
      "keywords": ["quero comprar", "quero", "comprar", "link"],
      "response_template": "send_product_link"
    }
  ],
  "commercialRules": {
    "pixDiscountPercent": 5,
    "maxInstallments": 12,
    "installmentFeePercent": 2.99,
    "freeShippingThreshold": 500
  },
  "fallbackMessages": {
    "product_not_found": "Não encontrei informações confirmadas sobre esse produto. Consulte nosso site: https://jessi.iphones",
    "generic_fallback": "Não consegui confirmar essa informação agora. Acesse nosso site ou tente novamente em instantes.",
    "out_of_stock": "Este modelo está indisponível no momento. Posso te mostrar modelos similares?"
  }
}
```

#### 4. Dados que precisam ser adicionados aos produtos

Para que o bot responda com segurança, os campos abaixo precisam existir nos catálogos:

```json
{
  "id": "MLB123",
  "name": "iPhone 14 128GB Preto",
  "price": 3800,
  "priceOriginal": 6000,
  "pricePix": 3610,
  "pixDiscountPercent": 5,
  "installmentsPlan": {
    "maxInstallments": 12,
    "feePercent": 2.99,
    "freeInstallments": 3
  },
  "guarantee": "1 ano de garantia Apple + 90 dias de garantia da loja",
  "gift": null,
  "stock": 3,
  "color": "Preto",
  "storage": "128 GB",
  "condition": "Novo"
}
```

#### 5. Proteção contra respostas incorretas

O bot deve seguir estas regras obrigatórias:

```
REGRA 1: Se o campo pricePix não existir no produto → usar commercialRules.pixDiscountPercent
REGRA 2: Se stock não puder ser confirmado → não afirmar que tem em estoque; usar: "Verificar disponibilidade atual no site"
REGRA 3: Se brinde/guarantee não existir no produto → não mencionar
REGRA 4: Se rastreamento não for real → informar previsão estimada, não fatos
REGRA 5: Se produto não encontrado no catálogo → enviar fallback seguro com link do site
REGRA 6: Se intenção não identificada → enviar fallback genérico
REGRA 7: Nunca inventar dados. Se incerto, usar mensagem de fallback configurada
```

#### 6. Prevenção de loops e duplicatas

- Janela de anti-spam: não responder a mesma mensagem duas vezes (verificar por `message.key.id`)
- Rate limiting por número: máximo de N mensagens por minuto por telefone
- Estado `cooldown` no contexto: após envio, aguardar N segundos antes de responder novo input

---

## Regras Obrigatórias para o Bot

1. **Nunca inventar preço.** Se `pricePix` não existir, calcular a partir de `commercialRules.pixDiscountPercent`.
2. **Nunca confirmar estoque sem consultar o banco no momento da resposta.** O estoque lido há 5 minutos pode estar desatualizado.
3. **Nunca informar garantia sem o campo `guarantee` preenchido.**
4. **Nunca informar brinde sem o campo `gift` preenchido.**
5. **Nunca confirmar data de entrega como certeza** — o rastreamento atual é simulado.
6. **Fallback obrigatório:** quando qualquer dado estiver ausente ou incerto, usar as mensagens de fallback do `bot-config.json`.
7. **Nunca responder a própria mensagem** (`fromMe: true`).
8. **Nunca processar mensagens com timestamp anterior a 60 segundos do boot** — evita responder mensagens antigas acumuladas.
9. **Registrar toda mensagem recebida** no contexto da conversa, independente de responder ou não.
10. **Identificar cliente pelo número de telefone** antes de qualquer consulta de pedidos.

---

## Sugestões de Automação

### Fase 1 — Consultas básicas (implementável sem IA)
- Perguntar sobre produto por nome → busca no catálogo por `name` ou `model`
- Perguntar preço → retorna `price` e `pricePix` calculado
- Perguntar estoque → retorna se `stock > 0`
- Perguntar cor/memória → lista variações (siblings do mesmo `model`)
- Querer comprar → envia link `/product?id=X`
- Perguntar sobre pedido → busca em `payments.json` por `clientPhone`

### Fase 2 — Fluxo guiado (funil de vendas via WA)
1. Cliente diz "Quero um iPhone" → bot pergunta modelo, memória, cor
2. Bot lista opções disponíveis em estoque
3. Bot informa preço base e preço no PIX
4. Bot pergunta "Quer o link para comprar?"
5. Bot envia link do produto
6. Bot pergunta "Posso te ajudar a finalizar a compra?"

### Fase 3 — Integração com IA (opcional, futura)
- Usar Claude API (claude-haiku-4-5 para velocidade) para interpretar intenções complexas
- O bot fornece os dados do catálogo como contexto
- A IA gera a resposta dentro das regras estabelecidas
- Fallback automático para mensagem segura se a IA retornar dados fora do catálogo

---

## Informações Necessárias Antes da Implementação

Antes de implementar o bot autônomo, estas informações precisam ser definidas e estruturadas no banco:

- [ ] Qual é o desconto padrão no PIX? (percentual fixo ou por produto?)
- [ ] Qual é a regra de parcelamento? (máximo de parcelas, percentual de juros, parcelas sem juros?)
- [ ] Os produtos têm garantia da loja além da garantia do fabricante?
- [ ] Existem brindes ativos? Quais produtos incluem brinde?
- [ ] O estoque exibido nos catálogos é real ou estimado?
- [ ] Qual é a política de troca/devolução que o bot pode informar?
- [ ] O bot pode oferecer cupom de forma proativa? Com que regras?
- [ ] Quais perguntas o bot deve recusar e encaminhar para humano (se existir)?
- [ ] O bot pode informar prazo de entrega? Se sim, qual fonte de dados usar?

---

## Checklist de Segurança

Antes de ativar o bot em produção:

- [ ] Rate limiting por número: máximo de X mensagens/minuto por cliente
- [ ] Anti-spam: não duplicar respostas para a mesma mensagem
- [ ] Anti-loop: detectar padrão de respostas cíclicas e interromper
- [ ] Filtro de mensagens antigas: ignorar mensagens com `messageTimestamp` anterior ao boot do servidor
- [ ] Logs de todas as mensagens recebidas e respostas enviadas
- [ ] Modo de teste: flag `botEnabled: false` em `bot-config.json` para pausar sem reiniciar
- [ ] Monitoramento: alertas Telegram quando o bot falhar em responder ou entrar em loop
- [ ] Nenhuma mensagem de marketing enviada sem consentimento explícito do usuário (LGPD)
- [ ] Consentimento armazenado em `wa-consents.json` (estrutura já existe no sistema)
- [ ] Dados sensíveis (CPF, cartão) nunca devem aparecer em respostas automáticas do bot
- [ ] Timeout em todas as consultas ao catálogo — resposta de fallback se consulta demorar > 3s
- [ ] Validação de entrada: sanitizar texto do cliente antes de qualquer comparação

---

## Conclusão

O sistema tem uma fundação sólida para implementação futura de bot autônomo. O Baileys está conectado e funcionando, o catálogo de produtos está estruturado em JSON com campos relevantes, e o sistema de sessões de usuário está completo. As principais lacunas são:

1. **Ausência de handler para mensagens diretas de clientes** — a linha `if (jid !== WHATSAPP_GROUP_ID) return` precisa ser removida e substituída por um fluxo de atendimento
2. **Ausência de contexto de conversa persistido** — sem isso, cada mensagem começa do zero
3. **Campos comerciais ausentes nos produtos** — preço PIX, parcelamento, garantia, brinde
4. **Dados de promoção apenas no frontend** — o `loja-oficial.js` precisa ser sincronizado com dados reais

Esses quatro pontos precisam ser resolvidos antes de qualquer implementação de bot autônomo para garantir que o bot nunca responda com informações diferentes das exibidas no site.
