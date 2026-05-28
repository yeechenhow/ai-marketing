export type WhatsAppWebhookPayload = {
  object?: string;
  entry?: WhatsAppEntry[];
};

export type WhatsAppEntry = {
  id?: string;
  changes?: WhatsAppChange[];
};

export type WhatsAppChange = {
  field?: string;
  value?: WhatsAppChangeValue;
};

export type WhatsAppChangeValue = {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: {
    profile?: { name?: string };
    wa_id?: string;
  }[];
  messages?: WhatsAppInboundMessage[];
};

export type WhatsAppInboundMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
};

export type ParsedWhatsAppInbound = {
  phoneNumberId: string;
  from: string;
  profileName?: string;
  messageId: string;
  messageBody?: string;
  timestamp: string;
};
