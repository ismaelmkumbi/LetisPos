import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { commerceAdmin, storefront } from '../../api/smartpos/commerce';
import { tokenStore } from '../../api/smartpos/client';
import type {
  Store, Cart, AddToCartRequest, CustomerProfile,
  Theme, ThemeSettings, UpdateStoreRequest,
} from '../../types/commerce';

// ── Admin Context ──

interface CommerceAdminState {
  store: Store | null;
  theme: Theme | null;
  loading: boolean;
  error: Error | null;
  refreshStore: () => Promise<void>;
  refreshTheme: () => Promise<void>;
  updateStore: (req: UpdateStoreRequest) => Promise<void>;
  updateTheme: (settings: ThemeSettings) => Promise<void>;
}

const CommerceAdminContext = createContext<CommerceAdminState>({} as CommerceAdminState);

export const CommerceAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshStore = useCallback(async () => {
    try {
      const data = await commerceAdmin.getSettings();
      setStore(data);
    } catch (e) {
      setError(e as Error);
    }
  }, []);

  const refreshTheme = useCallback(async () => {
    try {
      const data = await commerceAdmin.getTheme();
      setTheme(data);
    } catch {
      // theme might not exist yet for new stores — that's OK
    }
  }, []);

  const updateStore = useCallback(async (req: UpdateStoreRequest) => {
    try {
      const data = await commerceAdmin.updateSettings(req);
      setStore(data);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, []);

  const updateTheme = useCallback(async (settings: ThemeSettings) => {
    try {
      const data = await commerceAdmin.updateTheme(settings);
      setTheme(data);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, []);

  useEffect(() => {
    Promise.all([refreshStore(), refreshTheme()])
      .finally(() => setLoading(false));
  }, [refreshStore, refreshTheme]);

  return (
    <CommerceAdminContext.Provider value={{
      store, theme, loading, error, refreshStore, refreshTheme, updateStore, updateTheme,
    }}>
      {children}
    </CommerceAdminContext.Provider>
  );
};

export const useCommerceAdmin = () => useContext(CommerceAdminContext);

// ── Storefront Context ──

interface StorefrontState {
  slug: string;
  theme: Theme | null;
  cart: Cart | null;
  cartItemCount: number;
  customer: CustomerProfile | null;
  isLoggedIn: boolean;
  loading: boolean;
  addToCart: (req: AddToCartRequest) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeCartItem: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  applyTheme: (theme: Theme | null) => void;
}

const StorefrontContext = createContext<StorefrontState>({} as StorefrontState);

export const StorefrontProvider: React.FC<{ children: React.ReactNode; slug: string }> = ({ children, slug }) => {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const applyTheme = useCallback((t: Theme | null) => {
    if (!t?.settings) return;
    const root = document.documentElement;
    const c = t.settings.colors;
    root.style.setProperty('--commerce-primary', c.primary);
    root.style.setProperty('--commerce-secondary', c.secondary);
    root.style.setProperty('--commerce-accent', c.accent);
    root.style.setProperty('--commerce-bg', c.background);
    root.style.setProperty('--commerce-text', c.text);
    root.style.setProperty('--commerce-font-heading', t.settings.fonts.heading);
    root.style.setProperty('--commerce-font-body', t.settings.fonts.body);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      const data = await storefront.getCart(slug);
      setCart(data);
    } catch { /* guest cart, no data yet — that's OK */ }
  }, [slug]);

  const addToCart = useCallback(async (req: AddToCartRequest) => {
    await storefront.addToCart(slug, req);
    await refreshCart();
  }, [slug, refreshCart]);

  const updateCartItem = useCallback(async (itemId: string, quantity: number) => {
    await storefront.updateCartItem(slug, itemId, quantity);
    await refreshCart();
  }, [slug, refreshCart]);

  const removeCartItem = useCallback(async (itemId: string) => {
    await storefront.removeCartItem(slug, itemId);
    await refreshCart();
  }, [slug, refreshCart]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await storefront.login(slug, email, password);
    tokenStore.set(res.accessToken);
    setCustomer({
      id: res.customerId,
      firstName: res.name.split(' ')[0],
      lastName: res.name.split(' ').slice(1).join(' '),
      email: res.email,
    });
  }, [slug]);

  const register = useCallback(async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    const res = await storefront.register(slug, data);
    tokenStore.set(res.accessToken);
    setCustomer({ id: res.customerId, firstName: data.firstName, lastName: data.lastName, email: data.email });
  }, [slug]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setCustomer(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await storefront.getProfile(slug);
      setCustomer(profile);
    } catch { /* not logged in — that's OK */ }
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      storefront.getTheme(slug).then(t => { setTheme(t); applyTheme(t); }).catch(() => {}),
      refreshCart(),
      refreshProfile(),
    ]).finally(() => setLoading(false));
  }, [slug, refreshCart, refreshProfile, applyTheme]);

  return (
    <StorefrontContext.Provider value={{
      slug,
      theme,
      cart,
      cartItemCount: cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0,
      customer,
      isLoggedIn: !!customer,
      loading,
      addToCart,
      updateCartItem,
      removeCartItem,
      refreshCart,
      login,
      register,
      logout,
      refreshProfile,
      applyTheme,
    }}>
      {children}
    </StorefrontContext.Provider>
  );
};

export const useStorefront = () => useContext(StorefrontContext);
