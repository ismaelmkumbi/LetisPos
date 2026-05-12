/**
 * Marketing API wrapper — Promotions + Coupons.
 */
import { api } from './client';
import type { Page } from './types';

// ── Promotions ──────────────────────────────────────────────────────────────────

export interface Promotion {
  id: string;
  tenantId: string;
  name: string;
  type: string; // PERCENTAGE, FIXED_AMOUNT, BUY_ONE_GET_ONE
  discountValue: number;
  startDate: string;
  endDate?: string;
  appliesTo: string; // all, product, category
  productIds?: string[];
  categoryIds?: string[];
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionInput {
  name: string;
  type: string;
  discountValue: number;
  startDate: string;
  endDate?: string;
  appliesTo?: string;
  productIds?: string;
  categoryIds?: string;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
}

export async function listPromotions(params?: {
  page?: number;
  size?: number;
}): Promise<Page<Promotion>> {
  const { data } = await api.get<Page<Promotion>>('/api/v1/promotions', { params });
  return data;
}

export async function getPromotion(id: string): Promise<Promotion> {
  const { data } = await api.get<Promotion>(`/api/v1/promotions/${id}`);
  return data;
}

export async function createPromotion(body: PromotionInput): Promise<Promotion> {
  const { data } = await api.post<Promotion>('/api/v1/promotions', body);
  return data;
}

export async function updatePromotion(id: string, body: PromotionInput): Promise<Promotion> {
  const { data } = await api.put<Promotion>(`/api/v1/promotions/${id}`, body);
  return data;
}

export async function deletePromotion(id: string): Promise<void> {
  await api.delete(`/api/v1/promotions/${id}`);
}

// ── Coupons ─────────────────────────────────────────────────────────────────────

export interface Coupon {
  id: string;
  tenantId: string;
  code: string;
  type: string; // PERCENTAGE, FIXED_AMOUNT
  discountValue: number;
  maxUses?: number;
  usedCount: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponInput {
  code: string;
  type?: string;
  discountValue: number;
  maxUses?: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil?: string;
}

export async function listCoupons(params?: {
  page?: number;
  size?: number;
  active?: boolean;
}): Promise<Page<Coupon>> {
  const { data } = await api.get<Page<Coupon>>('/api/v1/coupons', { params });
  return data;
}

export async function getCoupon(id: string): Promise<Coupon> {
  const { data } = await api.get<Coupon>(`/api/v1/coupons/${id}`);
  return data;
}

export async function createCoupon(body: CouponInput): Promise<Coupon> {
  const { data } = await api.post<Coupon>('/api/v1/coupons', body);
  return data;
}

export async function generateCouponCodes(
  id: string,
  prefix: string,
  quantity: number,
): Promise<Coupon[]> {
  const { data } = await api.post<Coupon[]>(`/api/v1/coupons/${id}/generate-codes`, {
    prefix,
    quantity,
  });
  return data;
}

export async function validateCoupon(
  code: string,
): Promise<{
  valid: boolean;
  discountType: string;
  discountValue: number;
  maxDiscountAmount?: number;
}> {
  const { data } = await api.get(`/api/v1/coupons/validate/${encodeURIComponent(code)}`);
  return data;
}

export async function updateCoupon(id: string, body: CouponInput): Promise<Coupon> {
  const { data } = await api.put<Coupon>(`/api/v1/coupons/${id}`, body);
  return data;
}

export async function deleteCoupon(id: string): Promise<void> {
  await api.delete(`/api/v1/coupons/${id}`);
}
