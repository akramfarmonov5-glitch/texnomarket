import { Category, Product } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'phones', label: 'Telefonlar' },
  { id: 'laptops', label: 'Noutbuklar' },
  { id: 'audio', label: 'Audio' },
  { id: 'watches', label: 'Soatlar' },
  { id: 'accessories', label: 'Aksessuarlar' },
];

export const MENU_ITEMS: Product[] = [
  // --- PHONES ---
  {
    id: 'p1',
    name: 'iPhone 15 Pro',
    description: 'Titan korpus, A17 Pro chip, eng kuchli kamera tizimi.',
    price: 14500000,
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1678652197831-2d1807413863?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1696446700403-134268e378d4?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'phones',
    popular: true,
  },
  {
    id: 'p2',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'AI yordamchi, 200MP kamera va S-Pen bilan.',
    price: 13800000,
    images: [
      'https://images.unsplash.com/photo-1610945431131-c6463eb52a10?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1706606833538-4f5139bc690c?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1706785507026-b183424d80a1?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'phones',
    popular: true,
  },
  {
    id: 'p3',
    name: 'Xiaomi 14',
    description: 'Leica optikasi va Snapdragon 8 Gen 3 protsessori.',
    price: 8500000,
    images: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff23?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'phones',
  },

  // --- LAPTOPS ---
  {
    id: 'l1',
    name: 'MacBook Air M3',
    description: 'O\'ta ingichka, yengil va M3 chipi bilan tezkor.',
    price: 15200000,
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1531297461136-82lw9z283?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'laptops',
    popular: true,
  },
  {
    id: 'l2',
    name: 'ASUS ROG Strix',
    description: 'O\'yinlar uchun maxsus. RTX 4060 videokarta.',
    price: 12500000,
    images: [
      'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1555618568-185799a5477d?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1531297461136-82lw9z283?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'laptops',
  },

  // --- AUDIO ---
  {
    id: 'a1',
    name: 'AirPods Pro 2',
    description: 'Shovqinni so\'ndirish va ajoyib ovoz sifati.',
    price: 2800000,
    images: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1588156979435-37918d4fe5e6?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1610438235354-a6be2f966b01?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1629367494173-c78a56567877?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'audio',
    popular: true,
  },
  {
    id: 'a2',
    name: 'Sony WH-1000XM5',
    description: 'Eng yaxshi shovqin so\'ndiruvchi quloqchinlar.',
    price: 3500000,
    images: [
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'audio',
  },

  // --- WATCHES ---
  {
    id: 'w1',
    name: 'Apple Watch Series 9',
    description: 'Salomatlik nazorati va sport rejimlari.',
    price: 4500000,
    images: [
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'watches',
  },
  {
    id: 'w2',
    name: 'Samsung Galaxy Watch 6',
    description: 'Klassik dizayn va zamonaviy funksiyalar.',
    price: 3200000,
    images: [
      'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1517420879524-86d64ac2f339?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1434494878577-86c23be5a975?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'watches',
  },

  // --- ACCESSORIES ---
  {
    id: 'ac1',
    name: '20W Quvvatlagich',
    description: 'Tezkor quvvatlash bloki (Type-C).',
    price: 250000,
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1616348436168-de43ad0db179?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'accessories',
  },
  {
    id: 'ac2',
    name: 'Powerbank 20000mAh',
    description: 'Sayohatlar uchun katta hajmli akkumulyator.',
    price: 450000,
    images: [
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1620783770629-122b78e8774c?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1609592425026-66adda83907b?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1609592424888-0f0c0575d5e1?auto=format&fit=crop&q=80&w=600'
    ],
    category: 'accessories',
  },
];

export const SYSTEM_INSTRUCTION = `
You are the AI Sales Assistant for "TexnoMarket", an electronics online store in Uzbekistan.
Language: Uzbek (primary), Russian, English.
Currency: Uzbek Soums (so'm).

Your Persona: Knowledgeable, tech-savvy, helpful, and polite.
Your Goal: Help users find the right gadgets and UPSELL accessories.

Current Menu (Inventory): ${JSON.stringify(MENU_ITEMS.map(i => ({ id: i.id, name: i.name, price: i.price })))}

Rules:
1. If a user buys a Phone, ALWAYS suggest accessories (case/screen protector or earphones) as recommendations only.
2. If a user buys a Laptop, suggest a mouse or bag.
3. If user asks for generic items (e.g., "Menga yaxshi telefon kerak"), ask for their budget or preference (Android vs iPhone).
4. Never claim that you added items to cart, placed an order, or completed checkout.
5. If user wants to buy, tell them clearly to tap the "Savatga qo'shish" button manually in the UI.
6. Be concise. Do not give long lectures unless asked for specs.
`;
