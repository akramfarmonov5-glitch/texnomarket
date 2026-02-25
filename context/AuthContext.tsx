import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { storage } from '../utils/storage';
import { api } from '../utils/api';

interface AuthContextType {
  user: User | null;
  login: (phone: string, name?: string, adminCode?: string, telegramId?: number) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  authReady: boolean;
  currentAddress: string;
  setCurrentAddress: (address: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = 'texno_user';
const LEGACY_USER_KEY = 'kfc_user';
const ADDRESS_KEY = 'texno_address';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const current = storage.get<User | null>(USER_KEY, null);
    if (current) return current;
    return storage.get<User | null>(LEGACY_USER_KEY, null);
  });
  const [currentAddress, setCurrentAddress] = useState<string>(() => {
    const saved = storage.get<string>(ADDRESS_KEY, '');
    return saved || 'Tashkent, Amir Temur 1';
  });
  const [serverAdmin, setServerAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const login = useCallback(async (phone: string, name?: string, adminCode?: string, telegramId?: number) => {
    const cleanedPhone = phone.trim();
    if (!cleanedPhone) return false;

    try {
      const result = await api.login({
        phone: cleanedPhone,
        name: name?.trim() || 'Customer',
        telegramId,
        adminCode: adminCode?.trim() || undefined,
      });
      const nextUser: User = { ...result.user, sessionToken: result.token };
      setUser(nextUser);
      setServerAdmin(result.isAdmin);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let canceled = false;

    const initSession = async () => {
      const finish = () => {
        if (!canceled) setAuthReady(true);
      };

      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#ffffff');
        tg.setBackgroundColor('#f8fafc');

        const tgUser = tg.initDataUnsafe?.user;
        if (tgUser) {
          const telegramPhone = `+998(TG)${tgUser.id}`;
          const displayName = `${tgUser.first_name} ${tgUser.last_name || ''}`.trim();
          await login(telegramPhone, displayName || 'Customer', undefined, tgUser.id);
          finish();
          return;
        }
      }

      if (!user) {
        finish();
        return;
      }

      if (user.sessionToken) {
        try {
          const result = await api.getSession(user);
          if (!canceled) {
            setUser((prev) => (prev ? { ...prev, ...result.user } : prev));
            setServerAdmin(result.isAdmin);
          }
          finish();
          return;
        } catch {
          // Token is invalid or expired, fallback to relogin below.
        }
      }

      const reloginOk = await login(user.phone, user.name, undefined, user.telegramId);
      if (!reloginOk && !canceled) {
        setUser((prev) => (prev ? { ...prev, sessionToken: undefined } : prev));
        setServerAdmin(false);
      }
      finish();
    };

    void initSession();

    return () => {
      canceled = true;
    };
  }, [login]);

  useEffect(() => {
    if (user) {
      storage.set(USER_KEY, user);
      storage.remove(LEGACY_USER_KEY);
      return;
    }
    storage.remove(USER_KEY);
    storage.remove(LEGACY_USER_KEY);
  }, [user]);

  useEffect(() => {
    storage.set(ADDRESS_KEY, currentAddress);
  }, [currentAddress]);

  const logout = () => {
    setUser(null);
    setServerAdmin(false);
    storage.remove(USER_KEY);
    storage.remove(LEGACY_USER_KEY);
  };

  const isAdmin = serverAdmin;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, authReady, currentAddress, setCurrentAddress }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
