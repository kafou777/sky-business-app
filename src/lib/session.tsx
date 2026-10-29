import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Device from 'expo-device';
import { api, ApiError, loadToken, Profile, setToken, setUnauthorizedHandler } from './api';
import { forgetPush, registerPush } from './push';

type Session = {
  ready: boolean;
  profile: Profile | null;
  unread: number;
  favs: Set<number>;
  login: (identifiant: string, motDePasse: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setProfile: (p: Profile) => void;
  setUnread: (n: number) => void;
  toggleFav: (id: number) => Promise<boolean>;
  afterToken: (jeton: string, p: Profile) => Promise<void>;
};

const Ctx = createContext<Session>(null as unknown as Session);
export const useSession = () => useContext(Ctx);

function deviceName() {
  return [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || Platform.OS;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [unread, setUnread] = useState(0);
  const [favs, setFavs] = useState<Set<number>>(new Set());
  const pushToken = useRef<string | null>(null);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    setUnread(p.non_lus || 0);
    setFavs(new Set(p.favoris || []));
  }, []);

  const clear = useCallback(async () => {
    await setToken(null);
    setProfileState(null);
    setUnread(0);
    setFavs(new Set());
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api<Profile>('/app/profil');
      setProfile(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await clear();
    }
  }, [clear, setProfile]);

  useEffect(() => {
    setUnauthorizedHandler(() => { clear(); });
    (async () => {
      const t = await loadToken();
      if (t) await refresh();
      setReady(true);
    })();
  }, [clear, refresh]);

  const afterToken = useCallback(async (jeton: string, p: Profile) => {
    await setToken(jeton);
    setProfile(p);
    registerPush().then((t) => { pushToken.current = t; }).catch(() => {});
  }, [setProfile]);

  // Notifications : à chaque ouverture de l'application avec un compte connecté.
  useEffect(() => {
    if (profile) registerPush().then((t) => { pushToken.current = t; }).catch(() => {});
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (identifiant: string, motDePasse: string) => {
    const { data } = await api<{ jeton: string; profil: Profile }>('/app/connexion', { body: { identifiant, mot_de_passe: motDePasse, appareil: deviceName() } });
    await afterToken(data.jeton, data.profil);
  }, [afterToken]);

  const register = useCallback(async (d: Record<string, string>) => {
    const { data } = await api<{ jeton: string; profil: Profile }>('/app/inscription', { body: { ...d, appareil: deviceName() } });
    await afterToken(data.jeton, data.profil);
  }, [afterToken]);

  const logout = useCallback(async () => {
    try { await api('/app/deconnexion', { body: { push: pushToken.current || '' } }); } catch {}
    await forgetPush();
    await clear();
  }, [clear]);

  // Messages non lus : vérifiés régulièrement quand l'application est ouverte.
  useEffect(() => {
    if (!profile) return;
    let stop = false;
    const tick = async () => {
      if (stop || AppState.currentState !== 'active') return;
      try { const { data } = await api<{ non_lus: number }>('/chat/unread'); setUnread(data.non_lus || 0); } catch {}
    };
    const t = setInterval(tick, 30000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') tick(); });
    return () => { stop = true; clearInterval(t); sub.remove(); };
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFav = useCallback(async (id: number) => {
    const on = !favs.has(id);
    setFavs((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n; });
    try {
      const { data } = await api<{ on: boolean }>('/favoris/' + id, { body: { on } });
      return data.on;
    } catch (e) {
      setFavs((s) => { const n = new Set(s); on ? n.delete(id) : n.add(id); return n; });
      throw e;
    }
  }, [favs]);

  const value = useMemo(() => ({ ready, profile, unread, favs, login, register, logout, refresh, setProfile, setUnread, toggleFav, afterToken }),
    [ready, profile, unread, favs, login, register, logout, refresh, setProfile, toggleFav, afterToken]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
