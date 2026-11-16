import { Response } from 'express';

interface SSEClient {
  businessId: string;
  res: Response;
}

const clients: Set<SSEClient> = new Set();

export const addSSEClient = (businessId: string, res: Response) => {
  const client: SSEClient = { businessId, res };
  clients.add(client);
  return () => {
    clients.delete(client);
  };
};

export const broadcastBusinessEvent = (businessId: string, event: { type: string; [key: string]: any }) => {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    if (String(client.businessId) === String(businessId)) {
      try {
        client.res.write(payload);
      } catch {
        clients.delete(client);
      }
    }
  }
};
