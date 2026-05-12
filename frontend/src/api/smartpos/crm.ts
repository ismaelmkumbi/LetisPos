import { api } from './client';
import type { Page } from './types';

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  source: string;
  status: string;
  notes?: string;
  assignedTo?: string;
  convertedToOpportunityId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  tenantId: string;
  title: string;
  customerId?: string;
  customerName?: string;
  valueTzs: number;
  probability: number;
  stage: string;
  expectedCloseDate?: string;
  leadId?: string;
  assignedTo?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  type: string;
  dueDate: string;
  priority: string;
  status: string;
  notes?: string;
  assignedTo?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  tenantId: string;
  type: string;
  description: string;
  customerId?: string;
  customerName?: string;
  relatedType?: string;
  relatedId?: string;
  performedBy?: string;
  performedByName?: string;
  createdAt: string;
}

// ─── Leads ─────────────────────────────────────────────────────────────────────

export async function listLeads(params: {
  page?: number;
  size?: number;
  status?: string;
}): Promise<Page<Lead>> {
  const { data } = await api.get('/api/v1/crm/leads', { params });
  return data;
}

export async function getLead(id: string): Promise<Lead> {
  const { data } = await api.get(`/api/v1/crm/leads/${id}`);
  return data;
}

export async function createLead(body: Partial<Lead>): Promise<Lead> {
  const { data } = await api.post('/api/v1/crm/leads', body);
  return data;
}

export async function updateLead(id: string, body: Partial<Lead>): Promise<Lead> {
  const { data } = await api.put(`/api/v1/crm/leads/${id}`, body);
  return data;
}

export async function updateLeadStatus(id: string, status: string): Promise<Lead> {
  const { data } = await api.patch(`/api/v1/crm/leads/${id}/status`, { status });
  return data;
}

export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/api/v1/crm/leads/${id}`);
}

// ─── Opportunities ─────────────────────────────────────────────────────────────

export async function listOpportunities(params: {
  page?: number;
  size?: number;
  stage?: string;
}): Promise<Page<Opportunity>> {
  const { data } = await api.get('/api/v1/crm/opportunities', { params });
  return data;
}

export async function getOpportunity(id: string): Promise<Opportunity> {
  const { data } = await api.get(`/api/v1/crm/opportunities/${id}`);
  return data;
}

export async function createOpportunity(
  body: Partial<Opportunity>,
): Promise<Opportunity> {
  const { data } = await api.post('/api/v1/crm/opportunities', body);
  return data;
}

export async function updateOpportunity(
  id: string,
  body: Partial<Opportunity>,
): Promise<Opportunity> {
  const { data } = await api.put(`/api/v1/crm/opportunities/${id}`, body);
  return data;
}

export async function updateOpportunityStage(
  id: string,
  stage: string,
): Promise<Opportunity> {
  const { data } = await api.patch(`/api/v1/crm/opportunities/${id}/stage`, { stage });
  return data;
}

export async function convertFromLead(
  id: string,
  leadId: string,
): Promise<Opportunity> {
  const { data } = await api.post(
    `/api/v1/crm/opportunities/${id}/convert-from-lead/${leadId}`,
  );
  return data;
}

export async function deleteOpportunity(id: string): Promise<void> {
  await api.delete(`/api/v1/crm/opportunities/${id}`);
}

// ─── Follow-ups ────────────────────────────────────────────────────────────────

export async function listFollowUps(params: {
  page?: number;
  size?: number;
  status?: string;
}): Promise<Page<FollowUp>> {
  const { data } = await api.get('/api/v1/crm/follow-ups', { params });
  return data;
}

export async function getFollowUp(id: string): Promise<FollowUp> {
  const { data } = await api.get(`/api/v1/crm/follow-ups/${id}`);
  return data;
}

export async function createFollowUp(body: Partial<FollowUp>): Promise<FollowUp> {
  const { data } = await api.post('/api/v1/crm/follow-ups', body);
  return data;
}

export async function updateFollowUp(
  id: string,
  body: Partial<FollowUp>,
): Promise<FollowUp> {
  const { data } = await api.put(`/api/v1/crm/follow-ups/${id}`, body);
  return data;
}

export async function completeFollowUp(id: string): Promise<FollowUp> {
  const { data } = await api.patch(`/api/v1/crm/follow-ups/${id}/complete`);
  return data;
}

export async function deleteFollowUp(id: string): Promise<void> {
  await api.delete(`/api/v1/crm/follow-ups/${id}`);
}

// ─── Activities ────────────────────────────────────────────────────────────────

export async function listActivities(params: {
  page?: number;
  size?: number;
  type?: string;
}): Promise<Page<Activity>> {
  const { data } = await api.get('/api/v1/crm/activities', { params });
  return data;
}

export async function getActivity(id: string): Promise<Activity> {
  const { data } = await api.get(`/api/v1/crm/activities/${id}`);
  return data;
}

export async function createActivity(body: Partial<Activity>): Promise<Activity> {
  const { data } = await api.post('/api/v1/crm/activities', body);
  return data;
}
