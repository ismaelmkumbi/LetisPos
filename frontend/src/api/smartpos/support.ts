import { api } from './client';

export interface SupportTicket {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  assignedTo?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function createTicket(body: {
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: string;
}): Promise<SupportTicket> {
  const { data } = await api.post<SupportTicket>('/api/v1/support/tickets', body);
  return data;
}

export async function listTickets(): Promise<SupportTicket[]> {
  const { data } = await api.get<SupportTicket[]>('/api/v1/support/tickets');
  return data;
}

export async function getTicket(id: string): Promise<SupportTicket> {
  const { data } = await api.get<SupportTicket>(`/api/v1/support/tickets/${id}`);
  return data;
}

export async function updateTicketStatus(
  id: string,
  body: { status?: string; assignedTo?: string; resolutionNotes?: string },
): Promise<SupportTicket> {
  const { data } = await api.patch<SupportTicket>(`/api/v1/support/tickets/${id}/status`, body);
  return data;
}
