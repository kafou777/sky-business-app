import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Panier de la boutique d'accessoires, gardé sur le téléphone. */
export type CartItem = { id: number; nom: string; prix: number; photo: string; qte: number };

const KEY = 'sky_panier';
let items: CartItem[] = [];
let loaded = false;
const subs = new Set<(c: CartItem[]) => void>();

function emit() {
  subs.forEach((f) => f(items));
  AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
}

async function load() {
  if (loaded) return;
  loaded = true;
  try { items = JSON.parse((await AsyncStorage.getItem(KEY)) || '[]') || []; } catch { items = []; }
  subs.forEach((f) => f(items));
}

export const cart = {
  add(a: { id: number; nom: string; prix: number; photo?: string; img?: string }, qte = 1) {
    const l = items.find((x) => x.id === a.id);
    items = l ? items.map((x) => (x.id === a.id ? { ...x, qte: Math.min(50, x.qte + qte) } : x))
      : [...items, { id: a.id, nom: a.nom, prix: a.prix || 0, photo: a.photo || a.img || '', qte: Math.min(50, qte) }];
    emit();
  },
  setQte(id: number, qte: number) { items = items.map((x) => (x.id === id ? { ...x, qte: Math.max(1, Math.min(50, qte)) } : x)); emit(); },
  remove(id: number) { items = items.filter((x) => x.id !== id); emit(); },
  clear() { items = []; emit(); },
};

export function useCart() {
  const [c, setC] = useState<CartItem[]>(items);
  useEffect(() => {
    subs.add(setC);
    load();
    setC(items);
    return () => { subs.delete(setC); };
  }, []);
  const count = c.reduce((n, i) => n + i.qte, 0);
  const total = c.reduce((n, i) => n + i.prix * i.qte, 0);
  const incomplet = c.some((i) => !i.prix);
  return { items: c, count, total, incomplet };
}
