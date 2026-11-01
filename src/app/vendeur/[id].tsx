import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Icon from '@/components/Icon';
import { ListingRow } from '@/components/ListingCard';
import { Avatar, Stars, VerifiedBadge } from '@/components/Seller';
import { Button, Empty, Header, info, Loading, Notice } from '@/components/ui';
import { api, Avis, Listing, money, Vendeur } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

const TRIS = [{ id: 'recent', nom: 'Les plus récents' }, { id: 'note_haute', nom: 'Meilleures notes' }, { id: 'note_basse', nom: 'Notes les plus basses' }];
const fr = (n: number) => String(n).replace('.', ',');

export default function VendeurScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useSession();
  const [v, setV] = useState<Vendeur | null>(null);
  const [err, setErr] = useState('');
  const [tri, setTri] = useState('recent');
  const [ads, setAds] = useState<Listing[]>([]);
  const [form, setForm] = useState(false);

  const load = useCallback(async (t = tri) => {
    try {
      const r = await api<Vendeur>(`/vendeurs/${id}`, { query: { tri: t } });
      setV(r.data); setErr('');
    } catch (e: any) { setErr(e.message); }
  }, [id, tri]);

  useEffect(() => {
    load();
    api<Listing[]>('/annonces', { query: { vendeur: id, type: 'tous', per_page: 20 } }).then((r) => setAds(r.data)).catch(() => {});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <View style={{ flex: 1, backgroundColor: C.bg }}><Header title="Vendeur" /><Empty icon="user" title="Profil introuvable" text={err} /></View>;
  if (!v) return <View style={{ flex: 1, backgroundColor: C.bg }}><Header title="Vendeur" /><Loading /></View>;
  const s = v.avis;
  const atouts = s && !Array.isArray(s.atouts) ? Object.entries(s.atouts) : [];
  const label = (k: string) => v.atouts_possibles.find((a) => a.id === k)?.nom || k;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior="padding">
      <Header title={v.pro ? 'Profil de l\'entreprise' : 'Profil du vendeur'} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={st.hero}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar uri={v.photo} name={v.nom} size={78} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={st.name} numberOfLines={2}>{v.nom}</Text>
                {v.verifie ? <VerifiedBadge name={v.nom} size={22} sky={v.sky} /> : null}
              </View>
              <Text style={st.sub}>{v.sky ? 'Professionnel · propriétaire de la plateforme' : (v.pro ? 'Professionnel' : 'Particulier') + ' · depuis ' + v.depuis_affiche}</Text>
              {v.tel_verifie ? <View style={[st.vchip, { backgroundColor: '#dcf3e6' }]}><Icon name="phone" size={12} color={C.ok} /><Text style={[st.vchipText, { color: C.ok }]}>Téléphone vérifié</Text></View> : null}
              {v.verifie ? <View style={st.vchip}><Icon name="shield" size={13} color="#1a56b8" /><Text style={st.vchipText}>{v.sky ? 'Entreprise certifiée' : 'Entreprise vérifiée par Sky Business'}</Text></View> : null}
            </View>
          </View>
          {v.apropos ? <Text style={st.about}>{v.apropos}</Text> : null}
          <View style={st.kpis}>
            {s ? <Kpi label="Note" value={s.nb ? fr(s.moyenne) + ' ★' : '–'} /> : null}
            {s ? <Kpi label="Avis" value={String(s.nb)} /> : null}
            <Kpi label="Annonces" value={money(v.annonces) || '0'} />
          </View>
        </View>

        {s ? (
          <View style={st.card}>
            <Text style={st.h2}>Notes et avis</Text>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <View style={{ gap: 4, width: 108 }}>
                <Text style={st.score}>{s.nb ? fr(s.moyenne) : '–'}<Text style={st.score5}> / 5</Text></Text>
                <Stars value={s.moyenne} size={15} />
                <Text style={st.sub}>{s.nb ? s.nb + ' avis' : 'Aucun avis'}</Text>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = s.repartition[String(n)] || 0;
                  return (
                    <View key={n} style={st.barRow}>
                      <Text style={st.barN}>{n}</Text>
                      <View style={st.bar}><View style={[st.barFill, { width: (s.nb ? (100 * c) / s.nb : 0) + '%' }]} /></View>
                      <Text style={st.barC}>({c})</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            {atouts.length ? (
              <>
                <Text style={st.h3}>Points forts selon les clients</Text>
                <View style={st.tags}>{atouts.map(([k, n]) => <View key={k} style={st.tag}><Text style={st.tagText}>{label(k)}</Text><View style={st.tagN}><Text style={st.tagNText}>{n}</Text></View></View>)}</View>
              </>
            ) : null}

            {v.peut_noter ? (
              form ? (
                <ReviewForm v={v} onDone={(m) => { setForm(false); info('Merci', m); load(); }} onCancel={() => setForm(false)} />
              ) : (
                <Button title={v.mon_avis ? 'Modifier mon avis' : 'Laisser un avis'} icon="star" kind="secondary"
                  onPress={() => (profile ? setForm(true) : router.push('/connexion'))} />
              )
            ) : null}

            {v.liste && v.liste.total ? (
              <>
                <View style={st.sortRow}>
                  <Text style={st.h3}>{v.liste.total} avis</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                    {TRIS.map((t) => (
                      <Pressable key={t.id} onPress={() => { setTri(t.id); load(t.id); }} style={[st.sort, tri === t.id && st.sortOn]} accessibilityRole="button" accessibilityState={{ selected: tri === t.id }}>
                        <Text style={[st.sortText, tri === t.id && { color: C.accent }]}>{t.nom}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                {v.liste.avis.map((a) => <ReviewItem key={a.id} a={a} canReport={!!profile && !a.mien} />)}
              </>
            ) : null}
          </View>
        ) : null}

        <Text style={st.h2}>Annonces en ligne ({v.annonces})</Text>
        {ads.length ? ads.map((l) => <ListingRow key={l.id} l={l} />) : <Text style={st.sub}>Aucune annonce en ligne pour le moment.</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <View style={{ flex: 1 }}><Text style={st.kpiL}>{label}</Text><Text style={st.kpiV}>{value}</Text></View>;
}

function ReviewItem({ a, canReport }: { a: Avis; canReport: boolean }) {
  const [rep, setRep] = useState(false);
  const report = async () => {
    try { const r = await api<{ message: string }>(`/app/avis/${a.id}/signaler`, { body: { motif: 'Signalé depuis l\'application' } }); setRep(true); info('Avis signalé', r.data.message); }
    catch (e: any) { info('Signalement', e.message); }
  };
  return (
    <View style={st.rev}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Avatar uri={a.photo} name={a.auteur} size={40} />
        <View style={{ flex: 1 }}><Text style={st.revName}>{a.auteur}</Text><Text style={st.revSub}>Client · {a.date_affiche}</Text></View>
      </View>
      <Stars value={a.note} size={16} />
      {a.atouts.length ? <View style={st.tags}>{a.atouts.map((t) => <View key={t} style={[st.tag, { paddingVertical: 3 }]}><Text style={[st.tagText, { fontSize: 13 }]}>{t}</Text></View>)}</View> : null}
      {a.texte ? <Text style={st.revText}>{a.texte}</Text> : null}
      {canReport && !rep ? <Pressable onPress={report} hitSlop={8}><Text style={st.report}>Signaler cet avis</Text></Pressable> : null}
    </View>
  );
}

function ReviewForm({ v, onDone, onCancel }: { v: Vendeur; onDone: (msg: string) => void; onCancel: () => void }) {
  const m = v.mon_avis;
  const [note, setNote] = useState(m?.note || 0);
  const [tags, setTags] = useState<string[]>(m ? v.atouts_possibles.filter((x) => m.atouts.includes(x.nom)).map((x) => x.id) : []);
  const [texte, setTexte] = useState(m?.texte || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const send = async () => {
    if (!note) { setErr('Choisissez une note de 1 à 5 étoiles.'); return; }
    setBusy(true); setErr('');
    try { const r = await api<{ message: string }>(`/app/vendeurs/${v.id}/avis`, { body: { note, atouts: tags, texte } }); onDone(r.data.message); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <View style={st.form}>
      <Text style={st.h3}>Votre note</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setNote(n)} hitSlop={4} accessibilityRole="button" accessibilityLabel={n + ' étoile' + (n > 1 ? 's' : '')} accessibilityState={{ selected: note === n }}>
            <Text style={{ fontSize: 38, color: n <= note ? '#f5b301' : '#d9dbe6' }}>★</Text>
          </Pressable>
        ))}
      </View>
      <Text style={st.h3}>Ses points forts (facultatif)</Text>
      <View style={st.tags}>
        {v.atouts_possibles.map((a) => {
          const on = tags.includes(a.id);
          return (
            <Pressable key={a.id} onPress={() => setTags((t) => (on ? t.filter((x) => x !== a.id) : [...t, a.id]))} style={[st.tag, on && st.tagOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Text style={[st.tagText, on && { color: C.accent }]}>{a.nom}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={st.h3}>Votre avis (facultatif)</Text>
      <TextInput value={texte} onChangeText={setTexte} multiline maxLength={1000} placeholder="Comment s'est passé votre achat ou votre visite ?" placeholderTextColor={C.faint} style={st.input} />
      <Text style={st.revSub}>Votre prénom et l'initiale de votre nom seront affichés avec votre avis.</Text>
      {err ? <Notice text={err} kind="err" /> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Annuler" kind="secondary" onPress={onCancel} style={{ flex: 1 }} />
        <Button title={m ? 'Mettre à jour' : 'Publier mon avis'} onPress={send} loading={busy} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: C.white, borderRadius: R.xl, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  name: { fontFamily: F.display, fontSize: 21, color: C.fg, flexShrink: 1 },
  sub: { fontFamily: F.body, fontSize: 14, color: C.muted },
  vchip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#e8f1ff', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  vchipText: { fontFamily: F.bold, fontSize: 12.5, color: '#1a56b8' },
  about: { fontFamily: F.body, fontSize: 15, color: C.fg, lineHeight: 21 },
  kpis: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 },
  kpiL: { fontFamily: F.body, fontSize: 13, color: C.muted },
  kpiV: { fontFamily: F.display, fontSize: 21, color: C.fg },
  card: { backgroundColor: C.white, borderRadius: R.xl, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  h2: { fontFamily: F.display, fontSize: 20, color: C.fg },
  h3: { fontFamily: F.bold, fontSize: 15.5, color: C.fg },
  score: { fontFamily: F.display, fontSize: 38, color: C.fg, lineHeight: 42 },
  score5: { fontSize: 16, color: C.muted },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barN: { width: 10, fontFamily: F.body, fontSize: 13, color: C.muted },
  bar: { flex: 1, height: 8, borderRadius: 99, backgroundColor: C.surface2, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 99, backgroundColor: '#f5b301' },
  barC: { width: 30, fontFamily: F.body, fontSize: 13, color: C.muted, textAlign: 'right' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.line, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.white },
  tagOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  tagText: { fontFamily: F.semi, fontSize: 14, color: C.fg },
  tagN: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  tagNText: { fontFamily: F.bold, fontSize: 12, color: C.fg },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sort: { borderWidth: 1.5, borderColor: C.line, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  sortOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  sortText: { fontFamily: F.semi, fontSize: 12.5, color: C.muted },
  rev: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, gap: 8 },
  revName: { fontFamily: F.bold, fontSize: 15.5, color: C.fg },
  revSub: { fontFamily: F.body, fontSize: 13, color: C.muted },
  revText: { fontFamily: F.body, fontSize: 15, color: C.fg, lineHeight: 21 },
  report: { fontFamily: F.semi, fontSize: 13, color: C.muted, textDecorationLine: 'underline' },
  form: { gap: 10, backgroundColor: '#fafbff', borderRadius: R.lg, borderWidth: 1.5, borderColor: C.accentSoft, padding: 14 },
  input: { borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, padding: 12, minHeight: 90, textAlignVertical: 'top', fontFamily: F.body, fontSize: 15, color: C.fg, backgroundColor: C.white },
});
