import React, { createContext, useContext, useState } from 'react';
import { storage } from '../utils/storage';

type Language = 'en' | 'uz' | 'ru';

interface Translations {
  home: string;
  menu: string;
  cart: string;
  profile: string;
  popular: string;
  categories: string;
  searchPlaceholder: string;
  total: string;
  checkout: string;
  emptyCart: string;
  login: string;
  logout: string;
  settings: string;
  language: string;
  slogan: string;
  freeDelivery: string;
  minOrder: string;
  seeAll: string;
  emptyCartDesc: string;
  goToMenu: string;
  subtotal: string;
  notification: string;
  delivery: string;
  pickup: string;
  reorder: string;
  addressPlaceholder: string;
  confirmLocation: string;
  locating: string;
  moveMap: string;
  locationPermissionDenied: string;
  searchAddress: string;
  entrance: string;
  floor: string;
  apartment: string;
  comment: string;
  save: string;
  description: string;
  addToCart: string;
}

const translations: Record<Language, Translations> = {
  en: {
    home: 'Home',
    menu: 'Catalog',
    cart: 'Cart',
    profile: 'Profile',
    popular: 'Best Sellers',
    categories: 'Categories',
    searchPlaceholder: 'Search gadgets...',
    total: 'Total',
    checkout: 'Checkout',
    emptyCart: 'Your cart is empty',
    login: 'Login',
    logout: 'Log Out',
    settings: 'Settings',
    language: 'Language',
    slogan: 'FUTURE IS NOW',
    freeDelivery: 'Free Shipping',
    minOrder: 'Orders over 1M',
    seeAll: 'View All',
    emptyCartDesc: "Ready to upgrade your tech? Let's shop!",
    goToMenu: 'Go to Catalog',
    subtotal: 'Subtotal',
    notification: 'Notifications',
    delivery: 'Delivery',
    pickup: 'Pickup',
    reorder: 'Order Again',
    addressPlaceholder: 'Select address',
    confirmLocation: 'Confirm Location',
    locating: 'Locating...',
    moveMap: 'Move map to select location',
    locationPermissionDenied: 'Location permission denied',
    searchAddress: 'Search address...',
    entrance: 'Ent',
    floor: 'Floor',
    apartment: 'Apt',
    comment: 'Comment',
    save: 'Save Address',
    description: 'Description',
    addToCart: 'Add to Cart',
  },
  uz: {
    home: 'Asosiy',
    menu: 'Katalog',
    cart: 'Savat',
    profile: 'Profil',
    popular: 'Xit tovarlar',
    categories: 'Kategoriyalar',
    searchPlaceholder: 'Telefon, noutbuk izlash...',
    total: 'Jami',
    checkout: 'Rasmiylashtirish',
    emptyCart: "Savatingiz bo'sh",
    login: 'Kirish',
    logout: 'Chiqish',
    settings: 'Sozlamalar',
    language: 'Til',
    slogan: 'KELAJAK TEXNOLOGIYALARI',
    freeDelivery: 'Yetkazib berish bepul',
    minOrder: "1 mln so'mdan oshsa",
    seeAll: 'Barchasi',
    emptyCartDesc: "Yangi gadjet olish vaqti keldi! Katalogga o'ting.",
    goToMenu: "Katalogga o'tish",
    subtotal: 'Mahsulotlar',
    notification: 'Xabarnomalar',
    delivery: 'Yetkazib berish',
    pickup: 'Olib ketish',
    reorder: 'Qayta buyurtma',
    addressPlaceholder: 'Manzilni tanlang',
    confirmLocation: 'Manzilni tasdiqlash',
    locating: 'Aniqlanmoqda...',
    moveMap: 'Manzilni tanlash uchun xaritani suring',
    locationPermissionDenied: 'Geolokatsiyaga ruxsat berilmadi',
    searchAddress: 'Manzilni qidiring...',
    entrance: "Yo'lak",
    floor: 'Qavat',
    apartment: 'Xonadon',
    comment: 'Izoh',
    save: 'Saqlash',
    description: 'Tavsif',
    addToCart: "Savatga qo'shish",
  },
  ru: {
    home: 'Главная',
    menu: 'Каталог',
    cart: 'Корзина',
    profile: 'Профиль',
    popular: 'Хиты продаж',
    categories: 'Категории',
    searchPlaceholder: 'Поиск гаджетов...',
    total: 'Итого',
    checkout: 'Оформить',
    emptyCart: 'Корзина пуста',
    login: 'Войти',
    logout: 'Выйти',
    settings: 'Настройки',
    language: 'Язык',
    slogan: 'ТЕХНОЛОГИИ БУДУЩЕГО',
    freeDelivery: 'Бесплатная доставка',
    minOrder: 'От 1 млн сум',
    seeAll: 'Все',
    emptyCartDesc: 'Пора обновить гаджеты. Перейдите в каталог.',
    goToMenu: 'В каталог',
    subtotal: 'Подытог',
    notification: 'Уведомления',
    delivery: 'Доставка',
    pickup: 'Самовывоз',
    reorder: 'Повторить',
    addressPlaceholder: 'Выберите адрес',
    confirmLocation: 'Подтвердить адрес',
    locating: 'Определение...',
    moveMap: 'Передвиньте карту для выбора',
    locationPermissionDenied: 'Доступ к геолокации запрещен',
    searchAddress: 'Поиск адреса...',
    entrance: 'Подъезд',
    floor: 'Этаж',
    apartment: 'Кв.',
    comment: 'Комментарий',
    save: 'Сохранить',
    description: 'Описание',
    addToCart: 'В корзину',
  },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const LANGUAGE_KEY = 'texno_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = storage.get<Language | null>(LANGUAGE_KEY, null);
    return saved || 'uz';
  });

  const setLang = (nextLang: Language) => {
    setLangState(nextLang);
    storage.set(LANGUAGE_KEY, nextLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
