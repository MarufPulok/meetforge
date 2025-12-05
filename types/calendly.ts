export interface CalendlyWebhookPayload {
  event: 'invitee.created' | 'invitee.canceled';
  time: string;
  payload: {
    event: string;
    invitee: {
      uri: string;
      email: string;
      name: string;
    };
  };
}

export interface CalendlyWebhookHeaders {
  'calendly-webhook-signature': string;
}
