import type { Opt } from '@/components/ui';
import { Catalogue } from './api';

/** Communes « Cocody, Abidjan », triées par ville. */
export function lieuOptions(cat: Catalogue | null, cityToo = true): Opt[] {
  if (!cat) return [];
  const byId = new Map(cat.lieux.map((l) => [l.id, l]));
  return cat.lieux
    .filter((l) => cityToo || l.parent)
    .map((l) => ({ id: l.id, nom: l.parent ? l.nom + ', ' + (byId.get(l.parent)?.nom || '') : l.nom + ' (toute la ville)', sort: (l.parent ? byId.get(l.parent)?.nom || '' : l.nom) + (l.parent ? ' ' + l.nom : '') }))
    .sort((a, b) => a.sort.localeCompare(b.sort, 'fr'))
    .map(({ id, nom }) => ({ id, nom }));
}


/** Lieux pour publier : « Abidjan – Cocody », et les villes sans commune. */
export function lieuPublish(cat: Catalogue | null): Opt[] {
  if (!cat) return [];
  const parents = cat.lieux.filter((l) => !l.parent).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const out: Opt[] = [];
  for (const p of parents) {
    const subs = cat.lieux.filter((l) => l.parent === p.id).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    if (subs.length) subs.forEach((s) => out.push({ id: s.id, nom: p.nom + ' – ' + s.nom }));
    else out.push({ id: p.id, nom: p.nom });
  }
  return out;
}
