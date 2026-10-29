import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/* ---------- Types ---------- */

export type Contact = {
  nom: string; vendeur: boolean; pro: boolean; depuis: string;
  telephone: string; whatsapp: string; appel: string; lien_whatsapp: string; message: string;
};

export type Listing = {
  id: number; type: 'vehicule' | 'immobilier'; titre: string; url: string; date: string;
  prix: number; prix_affiche: string; vip: boolean; vendu: boolean; lieu: string;
  photos: string[]; nb_photos: number;
  rubrique?: string; marque?: string; modele?: string; annee?: number | null; kilometrage?: number | null;
  carburant?: string; transmission?: string; carrosserie?: string; couleur?: string; etat?: string;
  puissance?: string; cylindres?: string; portes?: string; interieur?: string;
  provenance?: string; periode?: string; type_de_bien?: string; operation?: 'location' | 'vente';
  description?: string; a_moi?: boolean; cotation?: boolean; quartier?: string; contact?: Contact;
  statut?: string; statut_label?: string;
  desc_ia?: string; intel?: { points?: [string, string, string][]; resume?: string } | [];
  marque_id?: number; carte?: { lieu: string; embed: string; lien: string };
  vendeur?: { id: number; sky: boolean; annonces: number; depuis: string };
};

export type Term = { id: number; nom: string; slug: string; parent: number };
export type Brand = { id: number; nom: string; slug: string; annonces: number; logo: string | null; description?: string; modeles: { id: number; nom: string }[] };
export type Catalogue = {
  marques: Brand[]; rubriques: Term[]; carrosseries: Term[]; carburants: Term[]; transmissions: Term[];
  couleurs: Term[]; etats: Term[]; types_de_bien: Term[]; lieux: Term[];
  contact: { telephone: string; whatsapp: string }; description_max: number;
};
export type Option = { id: string; nom: string };
export type Config = {
  version_min: string; site: string; contact: { telephone: string; whatsapp: string; email: string };
  confidentialite: string; max_photos: number; description_max: number; annee_max: number;
  types_vendeur: { id: string; nom: string; aide: string }[]; provenances: Option[];
  pieces: Record<'motorisation' | 'boite' | 'etat' | 'urgence' | 'contact' | 'livraison', Option[]>;
  assistant_ia: boolean;
};
export type Profile = {
  id: number; nom: string; email: string; telephone: string; whatsapp: string; type_vendeur: string; entreprise: string;
  administrateur: boolean; peut_publier_immobilier: boolean; peut_publier_location: boolean; non_lus: number; favoris: number[];
};
export type Conversation = {
  id: number; role: 'buyer' | 'seller'; other: string; repondre: boolean; piece: boolean; whatsapp: string;
  annonce: { id: number; titre: string; lien: string; photo: string; prix: string; type?: string; location?: boolean } | null;
  dernier: { moi: boolean; texte: string; date: string } | null; non_lus: number; signalee: boolean;
  [k: string]: unknown;
};
export type Message = { id: number; moi: boolean; texte: string; date: string; ia: boolean };

/* ---------- Stockage sécurisé du jeton ---------- */

const TOKEN_KEY = 'sky_jeton';
export const secure = {
  async get(k: string) {
    if (Platform.OS === 'web') { try { return globalThis.localStorage?.getItem(k) ?? null; } catch { return null; } }
    return SecureStore.getItemAsync(k);
  },
  async set(k: string, v: string | null) {
    if (Platform.OS === 'web') { try { v === null ? globalThis.localStorage?.removeItem(k) : globalThis.localStorage?.setItem(k, v); } catch {} return; }
    if (v === null) await SecureStore.deleteItemAsync(k); else await SecureStore.setItemAsync(k, v);
  },
};

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;
export async function loadToken() { token = await secure.get(TOKEN_KEY); return token; }
export async function setToken(t: string | null) { token = t; await secure.set(TOKEN_KEY, t); }
export function getToken() { return token; }
export function setUnauthorizedHandler(fn: () => void) { onUnauthorized = fn; }

/* ---------- Adresse du site ---------- */

const SITES: string[] = (Constants.expoConfig?.extra?.sites as string[]) || ['https://skybusiness.org'];
let base = '';
let config: Config | null = null;

export class ApiError extends Error {
  code: string; status: number;
  constructor(message: string, code = 'erreur', status = 0) { super(message); this.code = code; this.status = status; }
}

async function timed(url: string, init: RequestInit = {}, ms = 25000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

/** Trouve le site qui répond, puis utilise l'adresse que le site donne lui-même (après un changement de domaine). */
export async function boot(): Promise<Config> {
  const cached = await AsyncStorage.getItem('sky_site');
  const tries = cached ? [cached, ...SITES.filter((s) => s !== cached)] : SITES;
  for (const s of tries) {
    try {
      const r = await timed(s.replace(/\/$/, '') + '/wp-json/sky/v1/app/config', { headers: { Accept: 'application/json' } }, 15000);
      if (!r.ok) continue;
      const j = (await r.json()) as Config;
      if (!j || !j.site) continue;
      base = j.site.replace(/\/$/, '');
      config = j;
      await AsyncStorage.setItem('sky_site', base);
      await AsyncStorage.setItem('sky_config', JSON.stringify(j));
      return j;
    } catch { /* site suivant */ }
  }
  const saved = await AsyncStorage.getItem('sky_config');
  if (saved) { config = JSON.parse(saved); base = config!.site.replace(/\/$/, ''); return config!; }
  throw new ApiError('Impossible de joindre Sky Business. Vérifiez votre connexion Internet.', 'reseau', 0);
}
export function getConfig() { return config; }
export function siteUrl(path = '') { return base + path; }

/* ---------- Appels ---------- */

type Opts = { method?: string; body?: unknown; form?: FormData; query?: Record<string, string | number | undefined | null | boolean>; timeout?: number };

export async function api<T = any>(path: string, o: Opts = {}): Promise<{ data: T; total: number; pages: number }> {
  if (!base) await boot();
  const q = o.query ? Object.entries(o.query).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&') : '';
  const url = base + '/wp-json/sky/v1' + path + (q ? (path.includes('?') ? '&' : '?') + q : '');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['X-Sky-Token'] = token;
  let body: BodyInit | undefined;
  if (o.form) body = o.form as unknown as BodyInit;
  else if (o.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(o.body); }
  let r: Response;
  try {
    r = await timed(url, { method: o.method || (body ? 'POST' : 'GET'), headers, body }, o.timeout || 25000);
  } catch (e: any) {
    const net = e?.name === 'TypeError' && /network|fetch/i.test(String(e?.message || ''));
    throw new ApiError(e?.name === 'AbortError' ? 'Le réseau est lent : la demande a pris trop de temps. Réessayez.'
      : net || !e?.message ? 'Pas de connexion Internet. Vérifiez votre réseau et réessayez.'
      : 'L\'envoi a échoué (' + String(e.message).slice(0, 120) + '). Réessayez.', 'reseau', 0);
  }
  let j: any = null;
  try { j = await r.json(); } catch { /* réponse vide */ }
  if (!r.ok) {
    if (r.status === 401 && token && onUnauthorized) onUnauthorized();
    const msg = j && typeof j.message === 'string' ? j.message : r.status >= 500 ? 'Le serveur Sky Business rencontre un problème. Réessayez dans un instant.' : 'La demande n\'a pas abouti.';
    throw new ApiError(msg.replace(/<[^>]+>/g, ''), j?.code || 'erreur', r.status);
  }
  return { data: j as T, total: Number(r.headers.get('X-WP-Total') || 0), pages: Number(r.headers.get('X-WP-TotalPages') || 0) };
}

/* ---------- Catalogue (marques, villes…) gardé en mémoire et sur le téléphone ---------- */

let catalogue: Catalogue | null = null;
export async function getCatalogue(force = false): Promise<Catalogue> {
  if (catalogue && !force) return catalogue;
  try {
    const { data } = await api<Catalogue>('/catalogue');
    catalogue = data;
    AsyncStorage.setItem('sky_catalogue', JSON.stringify(data)).catch(() => {});
    return data;
  } catch (e) {
    const saved = await AsyncStorage.getItem('sky_catalogue');
    if (saved) return (catalogue = JSON.parse(saved));
    throw e;
  }
}

/* ---------- Formats ---------- */

export function money(n: number | null | undefined) {
  if (!n) return '';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
export function shortPrice(l: Listing) {
  if (!l.prix) return 'Prix sur demande';
  return money(l.prix) + ' FCFA' + (l.periode ? ' / ' + l.periode : '');
}
export function prettyPhone(n: string) {
  const d = (n || '').replace(/\D/g, '');
  return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}
export function intl(n: string) {
  const d = (n || '').replace(/\D/g, '');
  return d.length === 10 ? '225' + d : d;
}
export function ago(iso: string) {
  const t = new Date(iso).getTime();
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'à l\'instant';
  if (s < 3600) return 'il y a ' + Math.floor(s / 60) + ' min';
  if (s < 86400) return 'il y a ' + Math.floor(s / 3600) + ' h';
  const d = new Date(t);
  const days = Math.floor(s / 86400);
  if (days === 1) return 'hier';
  if (days < 7) return 'il y a ' + days + ' jours';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
export function hhmm(iso: string) {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
