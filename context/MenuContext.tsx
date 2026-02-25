import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category, Product, User } from '../types';
import { DEFAULT_CATEGORIES, MENU_ITEMS } from '../constants';
import { storage } from '../utils/storage';
import { api } from '../utils/api';

interface MenuContextType {
  products: Product[];
  categories: Category[];
  addProduct: (product: Product, actor?: User | null) => Promise<void>;
  updateProduct: (product: Product, actor?: User | null) => Promise<void>;
  deleteProduct: (id: string, actor?: User | null) => Promise<void>;
  addCategory: (label: string, actor?: User | null) => Promise<void>;
  updateCategory: (id: string, label: string, actor?: User | null) => Promise<void>;
  deleteCategory: (id: string, actor?: User | null, moveToCategoryId?: string) => Promise<void>;
  getProduct: (id: string) => Product | undefined;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

const MENU_KEY = 'texno_menu';
const LEGACY_MENU_KEY = 'kfc_menu';
const CATEGORIES_KEY = 'texno_categories';

type LegacyProduct = Product & { image?: string };
const slugToLabel = (slug: string) =>
  slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
const normalizeCategories = (rows: Category[] = []) => {
  const map = new Map<string, Category>();
  rows.forEach((row) => {
    const id = String(row?.id || '').trim();
    if (!id) return;
    const label = String(row?.label || '').trim() || slugToLabel(id);
    map.set(id, { ...row, id, label });
  });
  return Array.from(map.values());
};
const deriveCategoriesFromProducts = (rows: Product[]) => {
  const map = new Map<string, Category>();
  rows.forEach((product) => {
    const id = String(product?.category || '').trim();
    if (!id) return;
    if (!map.has(id)) map.set(id, { id, label: slugToLabel(id) });
  });
  return Array.from(map.values());
};
const mergeCategories = (...groups: Category[][]) =>
  normalizeCategories(groups.flat()).sort((a, b) => a.label.localeCompare(b.label));

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = storage.get<LegacyProduct[] | null>(MENU_KEY, null)
      ?? storage.get<LegacyProduct[] | null>(LEGACY_MENU_KEY, null);
    let items: LegacyProduct[] = saved || MENU_ITEMS;

    // Data Migration: Convert legacy 'image' string to 'images' array
    items = items.map((p) => {
      // If product has old 'image' but no 'images', migrate it
      if (!p.images && p.image) {
        return { ...p, images: [p.image] };
      }
      // If product has neither, ensure images is initialized
      if (!p.images && !p.image) {
        return { ...p, images: [] };
      }
      return p;
    });

    return items;
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = storage.get<Category[] | null>(CATEGORIES_KEY, null) || [];
    const derived = deriveCategoriesFromProducts(MENU_ITEMS);
    return mergeCategories(DEFAULT_CATEGORIES, derived, saved);
  });

  useEffect(() => {
    storage.set(MENU_KEY, products);
    storage.remove(LEGACY_MENU_KEY);
  }, [products]);
  useEffect(() => {
    storage.set(CATEGORIES_KEY, categories);
  }, [categories]);

  useEffect(() => {
    let canceled = false;
    const loadRemote = async () => {
      try {
        const [remoteProducts, remoteCategories] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
        ]);
        if (!canceled) {
          setProducts(remoteProducts);
          setCategories(
            mergeCategories(
              DEFAULT_CATEGORIES,
              deriveCategoriesFromProducts(remoteProducts),
              remoteCategories
            )
          );
        }
      } catch {
        // Local data remains as fallback when API is not reachable.
      }
    };
    void loadRemote();
    return () => {
      canceled = true;
    };
  }, []);

  const addProduct = async (product: Product, actor?: User | null) => {
    const saved = await api.createProduct(product, actor);
    setProducts((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
  };

  const updateProduct = async (product: Product, actor?: User | null) => {
    const saved = await api.updateProduct(product.id, product, actor);
    setProducts((prev) => prev.map((p) => (p.id === product.id ? saved : p)));
  };

  const deleteProduct = async (id: string, actor?: User | null) => {
    await api.deleteProduct(id, actor);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };
  const addCategory = async (label: string, actor?: User | null) => {
    const saved = await api.createCategory({ label }, actor);
    setCategories((prev) => mergeCategories(prev, [saved]));
  };
  const updateCategory = async (id: string, label: string, actor?: User | null) => {
    const saved = await api.updateCategory(id, { label }, actor);
    setCategories((prev) =>
      prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item))
    );
  };
  const deleteCategory = async (id: string, actor?: User | null, moveToCategoryId?: string) => {
    await api.deleteCategory(id, actor, moveToCategoryId);
    setCategories((prev) => prev.filter((item) => item.id !== id));
    if (moveToCategoryId) {
      setProducts((prev) =>
        prev.map((product) =>
          product.category === id ? { ...product, category: moveToCategoryId } : product
        )
      );
    }
  };

  const getProduct = (id: string) => products.find(p => p.id === id);

  return (
    <MenuContext.Provider
      value={{
        products,
        categories,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        getProduct,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) throw new Error('useMenu must be used within MenuProvider');
  return context;
};
