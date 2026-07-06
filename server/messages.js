const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const MESSAGES_PATH = path.join(DATA, 'messages.json');

const DEFAULT_TEMPLATES = {
  pix_generated: {
    label: 'PIX gerado',
    description: 'Enviada ao cliente assim que o PIX é gerado no checkout.',
    vars: ['nome', 'pedido', 'produto', 'data', 'valor', 'pixCode'],
    text: [
      '✅ *Seu PIX foi gerado com sucesso!*',
      '',
      'Olá, *{{nome}}*!',
      '',
      '━━━━━━━━━━━━━━━',
      '📋 *Pedido:* #{{pedido}}',
      '🛍️ *Produto:* {{produto}}',
      '📅 *Data:* {{data}}',
      '💰 *Valor:* {{valor}}',
      '━━━━━━━━━━━━━━━',
      '',
      '📋 *Código PIX — Copia e Cola:*',
      '{{pixCode}}',
      '',
      '⏰ *Pague em até 30 minutos* para garantir o seu pedido.',
      '',
      'Assim que o pagamento for identificado, seu pedido será processado automaticamente. 🎉',
      '',
      'Dúvidas? Responda esta mensagem ou acesse nosso site.'
    ].join('\n')
  },
  payment_approved: {
    label: 'Pagamento aprovado',
    description: 'Enviada ao cliente quando o pagamento de um pedido é confirmado.',
    vars: ['nomeSuffix', 'pedido', 'produto', 'valor'],
    text: [
      '✅ *Pagamento Aprovado!*',
      '',
      'Olá{{nomeSuffix}}!',
      'Seu pedido {{pedido}} foi *confirmado com sucesso*.',
      '',
      '📦 Produto: {{produto}}',
      '💰 Valor: {{valor}}',
      '',
      'Seu pedido está sendo preparado para envio. Obrigado pela compra! 🎉'
    ].join('\n')
  },
  payment_rejected: {
    label: 'Pagamento recusado',
    description: 'Enviada ao cliente quando o comprovante de um pedido é recusado.',
    vars: ['nomeSuffix', 'pedido', 'motivo'],
    text: [
      '❌ *Pagamento Recusado*',
      '',
      'Olá{{nomeSuffix}}!',
      'Infelizmente o comprovante do pedido {{pedido}} *não foi aprovado*.',
      '',
      '📋 Motivo: {{motivo}}',
      '',
      'Por favor, entre em contato pelo site ou envie um novo comprovante válido.'
    ].join('\n')
  },
  proof_resend_request: {
    label: 'Solicitar novo comprovante',
    description: 'Enviada ao cliente quando o admin pede reenvio do comprovante de pagamento.',
    vars: ['nomeSuffix', 'pedido', 'produto', 'valor'],
    text: [
      '🔄 *Novo Comprovante Necessário*',
      '',
      'Olá{{nomeSuffix}}!',
      'Para o pedido {{pedido}}, precisamos que você envie um novo comprovante de pagamento.',
      '',
      'Acesse o site e utilize o botão "Enviar Comprovante" novamente.',
      '',
      '📦 Produto: {{produto}}',
      '💰 Valor: {{valor}}'
    ].join('\n')
  },
  otp_code: {
    label: 'Código de acesso (login)',
    description: 'Código de login enviado por WhatsApp. Sempre é enviado, independente do interruptor abaixo (mensagem transacional de segurança).',
    vars: ['codigo'],
    text: [
      '*POWER FIT*',
      '',
      'Seu código de acesso é: *{{codigo}}*',
      '',
      'Válido por 10 minutos. Não compartilhe com ninguém.'
    ].join('\n')
  },
  cart_recovery_30m: {
    label: 'Recuperação de carrinho — 30 min',
    description: 'Lembrete enviado 30 minutos após um PIX gerado e não pago.',
    vars: ['nome', 'produto', 'valor', 'pedido', 'pixCode'],
    text: [
      '👋 *Oi, {{nome}}!*',
      '',
      'Percebemos que seu pedido de *{{produto}}* por *{{valor}}* ainda está aguardando o pagamento PIX.',
      '',
      '📋 *Pedido:* #{{pedido}}',
      '💰 *Valor:* {{valor}}',
      '',
      '📋 *Código PIX — Copia e Cola:*',
      '{{pixCode}}',
      '',
      '⏰ Pague agora para garantir o seu produto!',
      '',
      '_Caso já tenha pago, envie o comprovante nesta conversa._'
    ].join('\n')
  },
  cart_recovery_6h: {
    label: 'Recuperação de carrinho — 6h',
    description: 'Lembrete enviado 6 horas após um PIX gerado e não pago.',
    vars: ['nome', 'produto', 'valor', 'pedido', 'pixCode'],
    text: [
      '🔥 *{{nome}}, sua oferta ainda está disponível!*',
      '',
      'Ainda não identificamos o pagamento do seu pedido de *{{produto}}*.',
      '',
      '💰 *Valor:* {{valor}}',
      '📋 *Pedido:* #{{pedido}}',
      '',
      '📋 *Código PIX — Copia e Cola:*',
      '{{pixCode}}',
      '',
      'Pague agora antes que o estoque acabe! 🛍️'
    ].join('\n')
  },
  cart_recovery_24h: {
    label: 'Recuperação de carrinho — 24h',
    description: 'Lembrete enviado 24 horas após um PIX gerado e não pago.',
    vars: ['nome', 'produto', 'valor', 'pixCode'],
    text: [
      '⏳ *{{nome}}, última chance!*',
      '',
      'Seu pedido de *{{produto}}* por *{{valor}}* ainda está reservado, mas pode ser cancelado em breve por falta de pagamento.',
      '',
      '📋 *Código PIX — Copia e Cola:*',
      '{{pixCode}}',
      '',
      'Se precisar de ajuda, é só falar aqui. Estamos prontos para te atender! 🙂'
    ].join('\n')
  }
};

function loadStore() {
  try { return JSON.parse(fs.readFileSync(MESSAGES_PATH, 'utf-8')); }
  catch { return { enabled: true, templates: {} }; }
}

function saveStore(s) {
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(MESSAGES_PATH, JSON.stringify(s, null, 2));
}

function isEnabled() {
  return loadStore().enabled !== false;
}

function setEnabled(v) {
  const s = loadStore();
  s.enabled = !!v;
  saveStore(s);
  return s.enabled;
}

function getTemplates() {
  const s = loadStore();
  const out = {};
  for (const id of Object.keys(DEFAULT_TEMPLATES)) {
    out[id] = {
      ...DEFAULT_TEMPLATES[id],
      text: (s.templates && s.templates[id]) || DEFAULT_TEMPLATES[id].text
    };
  }
  return out;
}

function setTemplateText(id, text) {
  if (!DEFAULT_TEMPLATES[id]) throw new Error('Template desconhecido: ' + id);
  const s = loadStore();
  s.templates = s.templates || {};
  s.templates[id] = text;
  saveStore(s);
}

function render(id, vars) {
  const tpl = getTemplates()[id];
  if (!tpl) return '';
  return tpl.text.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
}

module.exports = { isEnabled, setEnabled, getTemplates, setTemplateText, render };
