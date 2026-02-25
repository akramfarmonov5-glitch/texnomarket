const parseCsv = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const env = {
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  telegramBotToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '',
  telegramChatId: import.meta.env.VITE_TELEGRAM_CHAT_ID || '',
  adminPhones: parseCsv(import.meta.env.VITE_ADMIN_PHONES),
  adminTelegramIds: parseCsv(import.meta.env.VITE_ADMIN_TELEGRAM_IDS),
};
