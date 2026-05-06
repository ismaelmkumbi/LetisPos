import { api } from './client';

export interface OnboardingState {
  workspace: boolean;
  warehouse: boolean;
  tax: boolean;
  products: boolean;
  staff: boolean;
  firstSale: boolean;
  percent: number;
  isComplete: boolean;
  completedAt: string | null;
}

export type OnboardingStep =
  | 'workspace'
  | 'warehouse'
  | 'tax'
  | 'products'
  | 'staff'
  | 'first_sale';

export async function fetchOnboardingState(): Promise<OnboardingState> {
  const { data } = await api.get<OnboardingState>('/api/v1/users/me/onboarding');
  return data;
}

export async function updateOnboardingStep(
  step: OnboardingStep,
  completed: boolean
): Promise<void> {
  await api.patch('/api/v1/users/me/onboarding', { step, completed });
}
