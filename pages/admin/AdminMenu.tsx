import React, { useMemo, useState } from 'react';
import { useMenu } from '../../context/MenuContext';
import { Product } from '../../types';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Image as ImageIcon,
  Info,
  Save,
  Sparkles,
  Loader2,
  Search,
  Tag,
} from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

type LegacyProduct = Product & { image?: string };

type CategoryOption = { id: string; label: string };

const parseApiError = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Amalni bajarishda xatolik yuz berdi.';
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed?.error) return parsed.error;
  } catch {
    // ignore non-JSON messages
  }
  return error.message || 'Amalni bajarishda xatolik yuz berdi.';
};

const slugToLabel = (slug: string) =>
  slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const AdminMenu = () => {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useMenu();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingCategoryLabel, setEditingCategoryLabel] = useState('');
  const [deletingCategoryId, setDeletingCategoryId] = useState('');
  const [deleteMoveCategoryId, setDeleteMoveCategoryId] = useState('');

  const [imageInputs, setImageInputs] = useState<string[]>(['', '', '', '']);
  const [activeTab, setActiveTab] = useState<'info' | 'images'>('info');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCategorySaving, setIsCategorySaving] = useState(false);
  const [isCategoryUpdating, setIsCategoryUpdating] = useState(false);
  const [isCategoryDeleting, setIsCategoryDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((item) => map.set(item.id, item.label));
    return map;
  }, [categories]);

  const categoryUsage = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((item) => {
      map.set(item.category, (map.get(item.category) || 0) + 1);
    });
    return map;
  }, [products]);

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const productCategoryIds: string[] = [];
    const seen = new Set<string>();

    products.forEach((item) => {
      const id = String(item.category || '').trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      productCategoryIds.push(id);
    });

    const fromProducts: CategoryOption[] = productCategoryIds.map((id) => ({
      id,
      label: categoryLabelMap.get(id) || slugToLabel(id),
    }));

    const merged = new Map<string, CategoryOption>();
    categories.forEach((item) => merged.set(item.id, { id: item.id, label: item.label }));
    fromProducts.forEach((item) => {
      if (!merged.has(item.id)) merged.set(item.id, item);
    });

    return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, products, categoryLabelMap]);
  const deletingCategory = useMemo(
    () => categoryOptions.find((item) => item.id === deletingCategoryId) || null,
    [categoryOptions, deletingCategoryId]
  );
  const deleteMoveTargets = useMemo(
    () => categoryOptions.filter((item) => item.id !== deletingCategoryId),
    [categoryOptions, deletingCategoryId]
  );
  const deletingCategoryUsage = deletingCategory ? categoryUsage.get(deletingCategory.id) || 0 : 0;

  const filteredProducts = products.filter((product) => {
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    if (!matchesCategory) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      product.name.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term) ||
      product.id.toLowerCase().includes(term)
    );
  });

  const resetForm = () => {
    setEditingProduct({ category: categoryOptions[0]?.id || '' });
    setImageInputs(['', '', '', '']);
    setActiveTab('info');
    setIsGenerating(false);
    setIsSaving(false);
    setActionError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const category = String(editingProduct.category || '').trim() || categoryOptions[0]?.id || '';
    if (!category) {
      setActionError('Avval kamida bitta kategoriya yarating.');
      return;
    }

    setActionError('');
    setIsSaving(true);

    const processedImages = imageInputs.map((url) => url.trim()).filter((url) => url.length > 0);
    const productData = {
      ...editingProduct,
      price: Number(editingProduct.price),
      id: editingProduct.id || Math.random().toString(36).slice(2, 11),
      popular: editingProduct.popular || false,
      images: processedImages.length > 0 ? processedImages : ['https://via.placeholder.com/400'],
      name: editingProduct.name || 'New Product',
      description: editingProduct.description || '',
      category,
      seoKeywords: editingProduct.seoKeywords || '',
    } as Product;

    try {
      if (editingProduct.id) {
        await updateProduct(productData, user);
      } else {
        await addProduct(productData, user);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      setActionError(parseApiError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);

    const legacyProduct = product as LegacyProduct;
    let imgs = product.images || [];
    if (imgs.length === 0 && legacyProduct.image) imgs = [legacyProduct.image];

    const inputs = [...imgs];
    while (inputs.length < 4) inputs.push('');

    setImageInputs(inputs.slice(0, 4));
    setActiveTab('info');
    setActionError('');
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingProduct({ category: categoryOptions[0]?.id || '' });
    setImageInputs(['', '', '', '']);
    setActiveTab('info');
    setActionError('');
    setIsModalOpen(true);
  };

  const handleImageChange = (index: number, value: string) => {
    const next = [...imageInputs];
    next[index] = value;
    setImageInputs(next);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    try {
      setActionError('');
      await deleteProduct(id, user);
    } catch (error) {
      setActionError(parseApiError(error));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newCategoryLabel.trim();
    if (!label || isCategorySaving) return;

    setIsCategorySaving(true);
    setActionError('');
    try {
      await addCategory(label, user);
      setNewCategoryLabel('');
    } catch (error) {
      setActionError(parseApiError(error));
    } finally {
      setIsCategorySaving(false);
    }
  };

  const startCategoryEdit = (item: CategoryOption) => {
    setEditingCategoryId(item.id);
    setEditingCategoryLabel(item.label);
    setActionError('');
  };

  const cancelCategoryEdit = () => {
    if (isCategoryUpdating) return;
    setEditingCategoryId('');
    setEditingCategoryLabel('');
  };

  const handleUpdateCategory = async (id: string) => {
    const label = editingCategoryLabel.trim();
    if (!label || isCategoryUpdating) return;

    const hasDuplicate = categoryOptions.some(
      (item) => item.id !== id && item.label.trim().toLowerCase() === label.toLowerCase()
    );
    if (hasDuplicate) {
      setActionError('Bu nomdagi kategoriya allaqachon mavjud.');
      return;
    }

    setIsCategoryUpdating(true);
    setActionError('');
    try {
      await updateCategory(id, label, user);
      setEditingCategoryId('');
      setEditingCategoryLabel('');
    } catch (error) {
      setActionError(parseApiError(error));
    } finally {
      setIsCategoryUpdating(false);
    }
  };

  const openDeleteCategoryModal = (id: string) => {
    const firstTarget = categoryOptions.find((item) => item.id !== id)?.id || '';
    setDeletingCategoryId(id);
    setDeleteMoveCategoryId(firstTarget);
    setActionError('');
  };

  const closeDeleteCategoryModal = () => {
    if (isCategoryDeleting) return;
    setDeletingCategoryId('');
    setDeleteMoveCategoryId('');
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategoryId || isCategoryDeleting) return;
    const linkedProducts = categoryUsage.get(deletingCategoryId) || 0;
    const moveTarget = linkedProducts > 0 ? deleteMoveCategoryId : undefined;

    if (linkedProducts > 0 && !moveTarget) {
      setActionError("Mahsulotlari bor kategoriyani o'chirish uchun ko'chirish kategoriyasini tanlang.");
      return;
    }

    setIsCategoryDeleting(true);
    try {
      setActionError('');
      await deleteCategory(deletingCategoryId, user, moveTarget);
      if (categoryFilter === deletingCategoryId) setCategoryFilter('all');
      setEditingProduct((prev) =>
        prev.category === deletingCategoryId
          ? {
            ...prev,
            category: moveTarget || categoryOptions.find((item) => item.id !== deletingCategoryId)?.id || '',
          }
          : prev
      );
      if (editingCategoryId === deletingCategoryId) {
        setEditingCategoryId('');
        setEditingCategoryLabel('');
      }
      closeDeleteCategoryModal();
    } catch (error) {
      setActionError(parseApiError(error));
    } finally {
      setIsCategoryDeleting(false);
    }
  };

  const generateAIContent = async () => {
    if (!editingProduct.name) {
      alert('Iltimos, avval mahsulot nomini kiriting.');
      return;
    }

    setIsGenerating(true);
    try {
      const category = categoryLabelMap.get(String(editingProduct.category || '')) || String(editingProduct.category || 'texnika');
      const result = await api.generateSeo({
        id: editingProduct.id,
        name: String(editingProduct.name),
        category,
      }, user);
      setEditingProduct((prev) => ({
        ...prev,
        description: result.description || prev.description || '',
        seoKeywords: result.keywords || prev.seoKeywords || '',
      }));
    } catch (error) {
      setActionError(parseApiError(error));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-slide-up">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Katalog Boshqaruv</h2>
          <p className="text-slate-500 text-sm">
            Mahsulotlarni qo'shish va tahrirlash • {filteredProducts.length}/{products.length} ta
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={18} /> <span className="hidden md:inline">Yangi Mahsulot</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-900">Kategoriyalar</h3>
          <span className="text-xs font-semibold text-slate-400">{categoryOptions.length} ta</span>
        </div>
        <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2">
          <input
            value={newCategoryLabel}
            onChange={(e) => setNewCategoryLabel(e.target.value)}
            placeholder="Yangi kategoriya nomi"
            className="flex-1 min-w-[220px] bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:bg-white focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newCategoryLabel.trim() || isCategorySaving}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-60"
          >
            {isCategorySaving ? 'Saqlanmoqda...' : "Kategoriya qo'shish"}
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((item) => {
            if (!item.id) return null;
            const usage = categoryUsage.get(item.id) || 0;
            const inUse = usage > 0;

            if (editingCategoryId === item.id) {
              return (
                <div key={item.id} className="inline-flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-2 py-1.5">
                  <input
                    value={editingCategoryLabel}
                    onChange={(e) => setEditingCategoryLabel(e.target.value)}
                    className="w-44 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:bg-white focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => void handleUpdateCategory(item.id)}
                    disabled={!editingCategoryLabel.trim() || isCategoryUpdating}
                    className="text-blue-600 hover:text-blue-700 disabled:opacity-40"
                    title="Saqlash"
                  >
                    <Save size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelCategoryEdit}
                    disabled={isCategoryUpdating}
                    className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
                    title="Bekor qilish"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            }

            return (
              <div key={item.id} className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                <span className="text-[11px] text-slate-500">({usage})</span>
                <button
                  type="button"
                  onClick={() => startCategoryEdit(item)}
                  className="text-slate-400 hover:text-blue-600"
                  title="Kategoriyani tahrirlash"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteCategoryModal(item.id)}
                  className="text-slate-400 hover:text-red-600"
                  title={inUse ? "Mahsulotlarni ko'chirib o'chirish" : "Kategoriyani o'chirish"}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">
          Eslatma: mahsulotlari bor kategoriyani o'chirishda mahsulotlar boshqa kategoriyaga ko'chiriladi.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nomi, tavsif yoki ID bo'yicha qidirish..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
        >
          <option value="all">Barcha kategoriyalar</option>
          {categoryOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3">
        {!!actionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {actionError}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="bg-white p-10 rounded-2xl border border-slate-100 text-center text-slate-400 font-semibold">
            Hech qanday mahsulot topilmadi.
          </div>
        )}

        {filteredProducts.map((product) => {
          const legacyProduct = product as LegacyProduct;
          const displayImg = product.images?.[0] || legacyProduct.image || 'https://via.placeholder.com/150';
          const categoryLabel = categoryLabelMap.get(product.category) || slugToLabel(product.category);

          return (
            <div key={product.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-4 transition-all hover:shadow-md">
              <div className="w-24 h-24 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 relative group">
                <img
                  src={displayImg}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Img';
                  }}
                />
                {product.popular && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </div>

              <div className="flex-grow flex flex-col justify-between py-1">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded mb-1">
                      {categoryLabel}
                    </span>
                    <h3 className="font-bold text-slate-900 leading-tight">{product.name}</h3>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => openEdit(product)}
                      className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => void handleDelete(product.id)}
                      className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-1 my-1">{product.description}</p>
                {product.seoKeywords && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.seoKeywords
                      .split(',')
                      .slice(0, 3)
                      .map((k, i) => (
                        <span key={i} className="text-[9px] bg-slate-50 text-slate-400 px-1 rounded border border-slate-100">
                          {k.trim()}
                        </span>
                      ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-auto">
                  <span className="font-black text-slate-900">{formatCurrency(product.price)}</span>
                  {product.images && product.images.length > 1 && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <ImageIcon size={10} /> {product.images.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {deletingCategory && (
        <div className="fixed inset-0 z-[62] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">Kategoriyani o'chirish</h3>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-semibold text-slate-700">{deletingCategory.label}</span> kategoriyasi tanlandi.
              </p>
            </div>

            {deletingCategoryUsage > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  Bu kategoriyada {deletingCategoryUsage} ta mahsulot bor. O'chirishdan oldin ko'chirish kategoriya tanlang.
                </p>
                {deleteMoveTargets.length > 0 ? (
                  <select
                    value={deleteMoveCategoryId}
                    onChange={(e) => setDeleteMoveCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
                  >
                    <option value="">Ko'chirish kategoriyasini tanlang</option>
                    {deleteMoveTargets.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    Boshqa kategoriya yo'q. Avval yangi kategoriya yarating.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-600">Bu kategoriya bo'sh, to'g'ridan-to'g'ri o'chiriladi.</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteCategoryModal}
                disabled={isCategoryDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold disabled:opacity-60"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteCategory()}
                disabled={
                  isCategoryDeleting
                  || (deletingCategoryUsage > 0 && (!deleteMoveCategoryId || deleteMoveTargets.length === 0))
                }
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold disabled:opacity-60"
              >
                {isCategoryDeleting ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-white sticky top-0 z-10">
              <h3 className="text-xl font-black text-slate-900">{editingProduct.id ? 'Tahrirlash' : 'Yangi Mahsulot'}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex p-2 gap-2 bg-slate-50 border-b border-slate-100">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'info' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Info size={16} /> Asosiy
              </button>
              <button
                onClick={() => setActiveTab('images')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'images' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <ImageIcon size={16} /> Rasmlar ({imageInputs.filter((i) => i).length}/4)
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <form id="product-form" onSubmit={handleSubmit} className="space-y-5">
                {activeTab === 'info' && (
                  <div className="space-y-4 animate-slide-up">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nomi</label>
                      <input
                        required
                        value={editingProduct.name || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                        placeholder="Masalan: iPhone 15 Pro"
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Narxi (so'm)</label>
                        <input
                          required
                          type="number"
                          value={editingProduct.price || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                          placeholder="15000000"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kategoriya</label>
                        <select
                          value={editingProduct.category || categoryOptions[0]?.id || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:border-blue-500 focus:bg-white outline-none transition-all appearance-none"
                        >
                          {categoryOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={generateAIContent}
                        disabled={isGenerating || !editingProduct.name}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                          isGenerating || !editingProduct.name
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                        }`}
                      >
                        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        AI Yordamchi (SEO)
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tavsif (Description)</label>
                      <textarea
                        required
                        value={editingProduct.description || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-blue-500 focus:bg-white outline-none transition-all resize-none h-24"
                        placeholder="Mahsulot haqida qisqacha..."
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1.5">
                        <Tag size={12} /> SEO Kalit so'zlar
                      </label>
                      <textarea
                        value={editingProduct.seoKeywords || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, seoKeywords: e.target.value })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-blue-500 focus:bg-white outline-none transition-all resize-none h-16"
                        placeholder="iphone, apple, smartfon, arzon telefon..."
                      />
                      <p className="text-[10px] text-slate-400 mt-1">AI orqali avtomatik to'ldirish mumkin.</p>
                    </div>

                    <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <input
                        type="checkbox"
                        id="popular"
                        checked={editingProduct.popular || false}
                        onChange={(e) => setEditingProduct({ ...editingProduct, popular: e.target.checked })}
                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                      />
                      <label htmlFor="popular" className="font-bold text-sm text-slate-700 cursor-pointer select-none">
                        "Xit tovarlar" ga qo'shish
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'images' && (
                  <div className="space-y-4 animate-slide-up">
                    <p className="text-xs text-slate-400 bg-blue-50 text-blue-600 p-3 rounded-xl">
                      Mahsulotga 4 tagacha rasm qo'shishingiz mumkin. URL manzilini kiriting.
                    </p>

                    {imageInputs.map((url, idx) => (
                      <div key={idx} className="flex gap-3 items-center group">
                        <div className="w-14 h-14 bg-slate-100 rounded-xl border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                          {url ? (
                            <img
                              src={url}
                              alt={`Preview ${idx}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error';
                              }}
                            />
                          ) : (
                            <span className="text-xs font-bold text-slate-300">#{idx + 1}</span>
                          )}
                        </div>
                        <div className="flex-grow">
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => handleImageChange(idx, e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-blue-500 focus:bg-white outline-none transition-all"
                            placeholder={`Rasm havolasi (URL) #${idx + 1}`}
                          />
                        </div>
                        {url && (
                          <button
                            type="button"
                            onClick={() => handleImageChange(idx, '')}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </form>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white">
              <button
                type="submit"
                form="product-form"
                disabled={isSaving}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
