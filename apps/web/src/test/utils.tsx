/**
 * Shared test utilities for Phase 2 records tests.
 * Provides a React wrapper with QueryClient + mocked Zustand auth store.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthUser } from '@/stores/auth.store';
import { MOCK_UHID } from './mocks/handlers';

// ─── Pre-built user fixtures ───────────────────────────────────────────────────
export const PATIENT_USER: AuthUser = {
  userId: 'user_patient_001',
  role: 'PATIENT',
  name: 'Test Patient',
  email: 'patient@test.internal',
  uhid: MOCK_UHID,
  isEmailVerified: true,
  isPhoneVerified: false,
};

export const STAFF_USER: AuthUser = {
  userId: 'user_staff_001',
  role: 'HOSPITAL_STAFF',
  name: 'Test Staff',
  email: 'staff@test.internal',
  isEmailVerified: true,
  isPhoneVerified: false,
};

export const DOCTOR_USER: AuthUser = {
  userId: 'user_doctor_001',
  role: 'DOCTOR',
  name: 'Test Doctor',
  email: 'doctor@test.internal',
  isEmailVerified: true,
  isPhoneVerified: false,
};

export const INSURANCE_USER: AuthUser = {
  userId: 'user_insurance_001',
  role: 'INSURANCE_PROVIDER',
  name: 'Test Insurance Provider',
  email: 'insurance@test.internal',
  isEmailVerified: true,
  isPhoneVerified: false,
};

// ─── Auth store helpers ────────────────────────────────────────────────────────
export function setMockUser(user: AuthUser) {
  useAuthStore.getState().setAuth(user, 'mock-access-token', 'mock-refresh-token');
}

export function clearMockUser() {
  useAuthStore.getState().clearAuth();
}

// ─── QueryClient factory (no retries in tests) ────────────────────────────────
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, refetchInterval: false },
      mutations: { retry: false },
    },
  });
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────
export function createWrapper(initialPath = '/') {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialPath]}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </MemoryRouter>
    );
  }
  return { Wrapper, queryClient };
}
