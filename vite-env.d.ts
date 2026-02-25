/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_USE_HASH_ROUTER?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_TELEGRAM_BOT_TOKEN?: string;
  readonly VITE_TELEGRAM_CHAT_ID?: string;
  readonly VITE_ADMIN_PHONES?: string;
  readonly VITE_ADMIN_TELEGRAM_IDS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
