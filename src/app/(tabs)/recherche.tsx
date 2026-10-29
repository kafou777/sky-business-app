import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputInstance, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { ListingRow } from '@/components/ListingCard';
import { Button, Chip, Empty, Field, IconButton, Opt, Select } from '@/components/ui';
import { api, Catalogue, getCatalogue, Listing, money } from '@/lib/api';
import { lieuOptions } from '@/lib/options';
import { C, F, R } from '@/lib/theme';

type Filters = {
  type: 'vehicule' | 'immobilier';
  rubrique: string; operation: string; marque: string; modele: string; lieu: string;
  carrosserie: string; carburant: string; transmission: string; type_de_bien: string;
  prix_min: string; prix_max: string; annee_min: string; km_max: string; tri: string; vendeur: string; vendeur_nom: string;
};
const EMPTY: Filters = { type: 'vehicule', rubrique: '', operation: '', marque: '', modele: '', lieu: '', carrosserie: '', carburant: '', transmission: '', type_de_bien: '', prix_min: '', prix_max: '', annee_min: '', km_max: '', tri: '', vendeur: '', vendeur_nom: '' };

const TRIS: Opt[] = [
  { id: '', nom: 'Plus récentes' }, { id: 'prix_asc', nom: 'Prix croissant' }, { id: 'prix_desc', nom: 'Prix décroissant' }, { id: 'annee_desc', nom: 'Année (plus récentes)' },
];

export default function Search() {
  const params = useLocalSearchParams<Record<string, string>>();
  const ins = useSafeAreaInsets();
  const [f, setF] = useState<Filters>(EMPTY);
  const [q, setQ] = useState('');
  const [qDeb, setQDeb] = useState('');
  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<Catalogue | null>(null);
  const input = useRef<TextInputInstance>(null);
  const reqId = useRef(0);

  useEffect(() => { getCatalogue().then(setCat).catch(() => {}); }, []);

  // Arrivée depuis l'accueil (catégorie, marque…) : on repart de ces critères.
  useEffect(() => {
    if (!params.t) return;
    setF({ ...EMPTY, type: params.type === 'immobilier' ? 'immobilier' : 'vehicule', rubrique: params.rubrique || '', marque: params.marque || '', operation: params.operation || '', vendeur: params.vendeur || '', vendeur_nom: params.vendeur_nom || '' });
    setQ(''); setQDeb('');
    if (params.focus) setTimeout(() => input.current?.focus(), 350);
  }, [params.t]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { const t = setTimeout(() => setQDeb(q.trim()), 450); return () => clearTimeout(t); }, [q]);

  const query = useMemo(() => {
    const veh = f.type === 'vehicule';
    return {
      type: f.type, q: qDeb, tri: f.tri, lieu: f.lieu, prix_min: f.prix_min.replace(/\D/g, ''), prix_max: f.prix_max.replace(/\D/g, ''),
      rubrique: veh ? f.rubrique : '', marque: veh ? f.modele || f.marque : '', carrosserie: veh ? f.carrosserie : '', carburant: veh ? f.carburant : '',
      transmission: veh ? f.transmission : '', annee_min: veh ? f.annee_min : '', km_max: veh ? f.km_max.replace(/\D/g, '') : '',
      operation: veh ? '' : f.operation, type_de_bien: veh ? '' : f.type_de_bien, vendeur: f.vendeur, per_page: 20,
    };
  }, [f, qDeb]);

  const load = useCallback(async (p: number) => {
    const id = ++reqId.current;
    setLoading(true); setErr('');
    try {
      const r = await api<Listing[]>('/annonces', { query: { ...query, page: p } });
      if (id !== reqId.current) return;
      setItems((old) => (p === 1 ? r.data : [...old, ...r.data.filter((x) => !old.some((o) => o.id === x.id))]));
      setTotal(r.total); setPages(r.pages || 1); setPage(p);
    } catch (e: any) {
      if (id === reqId.current) setErr(e.message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(1); }, [load]);

  const set = (k: keyof Filters, v: string) => setF((o) => ({ ...o, [k]: v, ...(k === 'marque' ? { modele: '' } : {}) }));
  const brand = cat?.marques.find((b) => String(b.id) === f.marque);
  const lieux = useMemo(() => lieuOptions(cat), [cat]);
  const name = (list: { id: number; nom: string }[] | undefined, id: string) => list?.find((x) => String(x.id) === id)?.nom || '';

  const active: { k: keyof Filters; label: string }[] = [];
  if (f.vendeur) active.push({ k: 'vendeur', label: 'Annonces de ' + (f.vendeur_nom || 'ce vendeur') });
  if (f.type === 'vehicule' && f.marque) active.push({ k: 'marque', label: (brand?.nom || 'Marque') + (f.modele ? ' ' + name(brand?.modeles, f.modele) : '') });
  if (f.lieu) active.push({ k: 'lieu', label: lieux.find((l) => String(l.id) === f.lieu)?.nom || 'Lieu' });
  if (f.prix_min) active.push({ k: 'prix_min', label: 'Dès ' + money(Number(f.prix_min.replace(/\D/g, ''))) + ' F' });
  if (f.prix_max) active.push({ k: 'prix_max', label: 'Max ' + money(Number(f.prix_max.replace(/\D/g, ''))) + ' F' });
  if (f.type === 'vehicule') {
    if (f.carrosserie) active.push({ k: 'carrosserie', label: name(cat?.carrosseries, f.carrosserie) });
    if (f.carburant) active.push({ k: 'carburant', label: name(cat?.carburants, f.carburant) });
    if (f.transmission) active.push({ k: 'transmission', label: name(cat?.transmissions, f.transmission) });
    if (f.annee_min) active.push({ k: 'annee_min', label: 'Depuis ' + f.annee_min });
    if (f.km_max) active.push({ k: 'km_max', label: '≤ ' + money(Number(f.km_max.replace(/\D/g, ''))) + ' km' });
  } else if (f.type_de_bien) active.push({ k: 'type_de_bien', label: name(cat?.types_de_bien, f.type_de_bien) });

  const rubs: Opt[] = f.type === 'vehicule'
    ? [{ id: '', nom: 'Tout' }, { id: 'vente', nom: 'À vendre' }, { id: 'location', nom: 'Location' }, { id: 'import', nom: 'Import' }]
    : [{ id: '', nom: 'Tout' }, { id: 'location', nom: 'À louer' }, { id: 'vente', nom: 'À vendre' }];
  const rubVal = f.type === 'vehicule' ? f.rubrique : f.operation;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.head, { paddingTop: ins.top + 8 }]}>
        <View style={st.searchRow}>
          <View style={st.search}>
            <Icon name="search" size={20} color={C.muted} />
            <TextInput ref={input} value={q} onChangeText={setQ} placeholder={f.type === 'vehicule' ? 'Marque, modèle, mot-clé…' : 'Villa, appartement, quartier…'} placeholderTextColor={C.faint}
              style={st.searchInput} returnKeyType="search" accessibilityLabel="Rechercher" />
            {q ? <Pressable onPress={() => setQ('')} accessibilityLabel="Effacer" hitSlop={8}><Icon name="close" size={18} color={C.muted} /></Pressable> : null}
          </View>
          <IconButton name="filter" label="Filtres" onPress={() => setOpen(true)} bg={C.accent} color={C.white} badge={active.length || undefined} />
        </View>
        <View style={st.typeRow}>
          {(['vehicule', 'immobilier'] as const).map((t) => (
            <Pressable key={t} onPress={() => setF({ ...EMPTY, type: t, tri: f.tri })} style={[st.typeBtn, f.type === t && st.typeOn]} accessibilityRole="tab" accessibilityState={{ selected: f.type === t }}>
              <Icon name={t === 'vehicule' ? 'car' : 'building'} size={18} color={f.type === t ? C.accent : C.muted} />
              <Text style={[st.typeText, f.type === t && { color: C.accent }]}>{t === 'vehicule' ? 'Véhicules' : 'Immobilier'}</Text>
            </Pressable>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 10 }}>
          {rubs.map((r) => <Chip key={r.id} label={r.nom} active={rubVal === r.id} onPress={() => set(f.type === 'vehicule' ? 'rubrique' : 'operation', String(r.id))} />)}
          {active.map((a) => (
            <Pressable key={a.k} onPress={() => set(a.k, '')} style={st.activeChip} accessibilityLabel={'Retirer le filtre ' + a.label}>
              <Text style={st.activeText}>{a.label}</Text><Icon name="close" size={14} color={C.accent} />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => <ListingRow l={item} />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 30, flexGrow: 1 }}
        onEndReachedThreshold={0.6}
        onEndReached={() => { if (!loading && page < pages) load(page + 1); }}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={st.countRow}>
            <Text style={st.count}>{loading && page === 1 ? 'Recherche…' : total ? money(total) + ' annonce' + (total > 1 ? 's' : '') : ''}</Text>
            <SortButton value={f.tri} onChange={(v) => set('tri', v)} />
          </View>
        }
        ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 40 }} color={C.accent} size="large" /> : err ? (
          <Empty icon="globe" title="Connexion impossible" text={err} action="Réessayer" onAction={() => load(1)} />
        ) : (
          <Empty icon="search" title="Aucune annonce" text="Essayez d'autres critères ou retirez un filtre." action={active.length || q ? 'Effacer la recherche' : undefined} onAction={() => { setQ(''); setF({ ...EMPTY, type: f.type }); }} />
        )}
        ListFooterComponent={loading && page > 1 ? <ActivityIndicator color={C.accent} style={{ margin: 20 }} /> : undefined}
      />

      <FiltersModal visible={open} onClose={() => setOpen(false)} f={f} setF={setF} cat={cat} lieux={lieux} total={total} loading={loading} />
    </View>
  );
}

function SortButton({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const cur = TRIS.find((t) => t.id === value) || TRIS[0];
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={st.sort} accessibilityRole="button" accessibilityLabel={'Trier : ' + cur.nom}>
        <Icon name="swap" size={16} color={C.accent} /><Text style={st.sortText}>{cur.nom}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={st.overlay} onPress={() => setOpen(false)}>
          <View style={st.menu}>
            <Text style={[st.typeText, { color: C.fg, padding: 14, paddingBottom: 6 }]}>Trier par</Text>
            {TRIS.map((t) => (
              <Pressable key={t.id} onPress={() => { setOpen(false); onChange(String(t.id)); }} style={st.menuItem}>
                <Text style={[st.menuText, t.id === value && { color: C.accent, fontFamily: F.bold }]}>{t.nom}</Text>
                {t.id === value ? <Icon name="check" size={18} color={C.accent} /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function FiltersModal({ visible, onClose, f, setF, cat, lieux, total, loading }: { visible: boolean; onClose: () => void; f: Filters; setF: (fn: (o: Filters) => Filters) => void; cat: Catalogue | null; lieux: Opt[]; total: number; loading: boolean }) {
  const ins = useSafeAreaInsets();
  const set = (k: keyof Filters, v: string) => setF((o) => ({ ...o, [k]: v, ...(k === 'marque' ? { modele: '' } : {}) }));
  const brand = cat?.marques.find((b) => String(b.id) === f.marque);
  const any: Opt = { id: '', nom: 'Peu importe' };
  const toOpts = (l?: { id: number; nom: string }[]) => [any, ...(l || []).map((x) => ({ id: x.id, nom: x.nom }))];
  const years: Opt[] = [any, ...Array.from({ length: 30 }, (_, i) => { const y = new Date().getFullYear() + 1 - i; return { id: y, nom: 'Depuis ' + y }; })];
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? ins.top : 0 }}>
        <View style={st.modalHead}>
          <Text style={st.modalTitle}>Filtres</Text>
          <Pressable onPress={() => setF((o) => ({ ...EMPTY, type: o.type, tri: o.tri }))} hitSlop={8}><Text style={st.reset}>Tout effacer</Text></Pressable>
          <IconButton name="close" label="Fermer" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          {f.type === 'vehicule' ? (
            <>
              <Select label="Marque" value={f.marque} options={[any, ...(cat?.marques || []).map((b) => ({ id: b.id, nom: b.nom, sub: b.annonces ? b.annonces + ' annonces' : undefined }))]} onChange={(o) => set('marque', String(o.id))} searchable />
              <Select label="Modèle" value={f.modele} disabled={!brand} placeholder={brand ? 'Tous les modèles' : 'Choisissez d\'abord la marque'} options={[{ id: '', nom: 'Tous les modèles' }, ...(brand?.modeles || []).map((m) => ({ id: m.id, nom: m.nom }))]} onChange={(o) => set('modele', String(o.id))} />
            </>
          ) : (
            <Select label="Type de bien" value={f.type_de_bien} options={toOpts(cat?.types_de_bien)} onChange={(o) => set('type_de_bien', String(o.id))} />
          )}
          <Select label="Ville / commune" value={f.lieu} options={[any, ...lieux]} onChange={(o) => set('lieu', String(o.id))} searchable />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field style={{ flex: 1 }} label="Prix minimum" value={f.prix_min ? money(Number(f.prix_min.replace(/\D/g, ''))) : ''} onChangeText={(v) => set('prix_min', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="FCFA" />
            <Field style={{ flex: 1 }} label="Prix maximum" value={f.prix_max ? money(Number(f.prix_max.replace(/\D/g, ''))) : ''} onChangeText={(v) => set('prix_max', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="FCFA" />
          </View>
          {f.type === 'vehicule' ? (
            <>
              <Select label="Année" value={f.annee_min} options={years} onChange={(o) => set('annee_min', String(o.id))} />
              <Field label="Kilométrage maximum" value={f.km_max ? money(Number(f.km_max)) : ''} onChangeText={(v) => set('km_max', v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="km" />
              <Select label="Carrosserie" value={f.carrosserie} options={toOpts(cat?.carrosseries)} onChange={(o) => set('carrosserie', String(o.id))} />
              <Select label="Carburant" value={f.carburant} options={toOpts(cat?.carburants)} onChange={(o) => set('carburant', String(o.id))} />
              <Select label="Boîte de vitesses" value={f.transmission} options={toOpts(cat?.transmissions)} onChange={(o) => set('transmission', String(o.id))} />
            </>
          ) : null}
        </ScrollView>
        <View style={[st.modalFoot, { paddingBottom: ins.bottom + 12 }]}>
          <Button title={loading ? 'Recherche…' : total ? 'Voir les ' + money(total) + ' annonces' : 'Aucune annonce'} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  head: { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.line },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  search: { flex: 1, height: 48, borderRadius: R.md, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 16, color: C.fg, outlineStyle: 'none' as any, height: 48 },
  typeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: R.sm, borderWidth: 1, borderColor: C.line },
  typeOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  typeText: { fontFamily: F.bold, fontSize: 14, color: C.muted },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: R.pill, backgroundColor: C.accentSoft },
  activeText: { fontFamily: F.semi, fontSize: 14, color: C.accent },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  count: { fontFamily: F.semi, fontSize: 14, color: C.muted },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  sortText: { fontFamily: F.bold, fontSize: 14, color: C.accent },
  overlay: { flex: 1, backgroundColor: 'rgba(15,18,51,0.35)', justifyContent: 'flex-end' },
  menu: { backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, paddingBottom: 30 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.line },
  menuText: { fontFamily: F.medium, fontSize: 16, color: C.fg },
  modalHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  modalTitle: { flex: 1, fontFamily: F.display, fontSize: 21, color: C.fg },
  reset: { fontFamily: F.bold, fontSize: 14, color: C.accent },
  modalFoot: { padding: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.white },
});
