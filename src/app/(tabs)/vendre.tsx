import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, ScrollViewInstance, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PhotoPicker, { appendFile, Photo } from '@/components/PhotoPicker';
import { Button, Card, Check, Empty, Field, Loading, Notice, Opt, Segmented, Select } from '@/components/ui';
import { api, Catalogue, getCatalogue, getConfig, money } from '@/lib/api';
import { lieuPublish } from '@/lib/options';
import { useSession } from '@/lib/session';
import { C, F } from '@/lib/theme';

type Form = Record<string, string>;
const DRAFT = 'sky_brouillon_annonce';
const INIT: Form = { categorie: 'vente', marque: '', modele: '', annee: '', kilometrage: '', carburant: '', transmission: '', carrosserie: '', couleur: '', etat: '', puissance: '', prix: '', telephone: '', lieu: '', quartier: '', description: '', provenance: '', prix_periode: 'jour', immo_titre: '', immo_statut: 'louer', type_de_bien: '', immo_periode: 'mois', type_vendeur: '', entreprise: '', une: '', une_jours: '0' };

export default function Vendre() {
  const ins = useSafeAreaInsets();
  const { profile, ready } = useSession();
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [f, setF] = useState<Form>(INIT);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ message: string; id: number; live: boolean } | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const cfg = getConfig();
  const staff = !!profile?.administrateur;

  useEffect(() => { getCatalogue().then(setCat).catch((e) => setErr(e.message)); }, []);
  useEffect(() => {
    AsyncStorage.getItem(DRAFT).then((s) => { if (s) { try { const d = JSON.parse(s); setF({ ...INIT, ...d.f }); setPhotos(d.photos || []); } catch {} } });
  }, []);
  useEffect(() => { if (profile && !f.telephone) setF((o) => ({ ...o, telephone: profile.telephone || '' })); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => AsyncStorage.setItem(DRAFT, JSON.stringify({ f, photos })).catch(() => {}), 600);
    return () => clearTimeout(t);
  }, [f, photos]);

  const set = (k: string) => (v: string) => setF((o) => ({ ...o, [k]: v, ...(k === 'marque' ? { modele: '' } : {}) }));
  const brand = cat?.marques.find((b) => String(b.id) === f.marque);
  const lieux = useMemo(() => lieuPublish(cat), [cat]);
  const opts = (l?: { id: number; nom: string }[]): Opt[] => (l || []).map((x) => ({ id: x.id, nom: x.nom }));
  const year = new Date().getFullYear();
  const years: Opt[] = Array.from({ length: (cfg?.annee_max || year + 1) - 1979 }, (_, i) => { const y = (cfg?.annee_max || year + 1) - i; return { id: y, nom: String(y) }; });
  const immo = staff && f.categorie === 'immobilier';
  const maxDesc = cfg?.description_max || 1000;

  if (!ready) return <Loading />;
  if (!profile) {
    return (
      <View style={{ flex: 1, paddingTop: ins.top, backgroundColor: C.bg }}>
        <Text style={[st.h1, { paddingHorizontal: 16, paddingTop: 12 }]}>Vendre</Text>
        <Empty icon="car" title="Vendez votre véhicule" text="Créez un compte gratuit ou connectez-vous pour publier votre annonce avec photos." action="Se connecter ou créer un compte" onAction={() => router.push('/connexion')} />
      </View>
    );
  }
  if (done) {
    return (
      <View style={{ flex: 1, paddingTop: ins.top, backgroundColor: C.bg }}>
        <Empty icon="check" title={done.live ? 'Annonce en ligne' : 'Annonce envoyée'} text={done.message} />
        <View style={{ padding: 20, gap: 10, paddingBottom: ins.bottom + 20 }}>
          {done.live ? <Button title="Voir l'annonce" onPress={() => router.push(`/annonce/${done.id}`)} /> : <Button title="Voir mes annonces" onPress={() => router.push('/mes-annonces')} />}
          <Button title="Publier une autre annonce" kind="secondary" onPress={() => setDone(null)} />
        </View>
      </View>
    );
  }

  const fail = (m: string) => { setErr(m); scroll.current?.scrollTo({ y: 0, animated: true }); };

  const submit = async () => {
    setErr('');
    if (!photos.length) return fail('Ajoutez au moins une photo.');
    if (immo) {
      if (!f.immo_titre.trim()) return fail('Indiquez le titre de l\'annonce.');
      if (!f.type_de_bien) return fail('Choisissez le type de bien.');
    } else {
      if (!f.marque) return fail('Choisissez la marque du véhicule.');
      if (!f.modele) return fail('Choisissez le modèle du véhicule.');
      if (!f.annee) return fail('Indiquez l\'année du véhicule.');
      if (f.categorie === 'import' && !f.provenance) return fail('Indiquez le pays de provenance du véhicule.');
      if (!staff && !profile.type_vendeur && !f.type_vendeur) return fail('Indiquez si vous êtes un particulier ou un professionnel.');
    }
    if (!f.prix || Number(f.prix) < (immo ? 1 : f.categorie === 'location' && staff ? 1000 : 100000)) return fail('Indiquez le prix en FCFA.');
    if (f.categorie !== 'import' && !f.lieu) return fail(immo ? 'Indiquez la ville et la commune du bien.' : 'Indiquez la ville et la commune où se trouve le véhicule.');
    if (!staff && f.telephone.replace(/\D/g, '').length < 8) return fail('Indiquez votre numéro de téléphone.');
    setBusy(true);
    try {
      const form = new FormData();
      const send: Form = { ...f };
      if (!staff) { delete send.categorie; delete send.une; delete send.une_jours; }
      Object.entries(send).forEach(([k, v]) => { if (v !== '') form.append(k, v); });
      for (const p of photos) await appendFile(form, 'photos[]', p);
      const r = await api<{ id: number; statut: string; message: string }>('/app/annonces', { form, timeout: 240000 });
      setDone({ message: r.data.message, id: r.data.id, live: r.data.statut === 'publish' });
      setF({ ...INIT, telephone: f.telephone }); setPhotos([]);
      AsyncStorage.removeItem(DRAFT).catch(() => {});
    } catch (e: any) { fail(e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingTop: ins.top + 12, paddingBottom: 40, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Text style={st.h1}>{staff ? 'Publier une annonce' : 'Vendre mon véhicule'}</Text>
        <Text style={st.lead}>{staff ? 'Compte administrateur : l\'annonce est mise en ligne directement.' : 'Votre annonce sera vérifiée par Sky Business avant sa mise en ligne.'}</Text>
        {err ? <Notice text={err} kind="err" /> : null}

        {staff ? (
          <Card>
            <Select label="Catégorie" value={f.categorie} onChange={(o) => set('categorie')(String(o.id))}
              options={[{ id: 'vente', nom: 'Voitures à vendre' }, { id: 'location', nom: 'Location de véhicules' }, { id: 'import', nom: 'Disponible à l\'import' }, ...(profile.peut_publier_immobilier ? [{ id: 'immobilier', nom: 'Immobilier' }] : [])]} />
            {f.categorie === 'location' ? <Segmented value={f.prix_periode} onChange={set('prix_periode')} options={[{ id: 'jour', nom: 'Prix par jour' }, { id: 'mois', nom: 'Prix par mois' }]} /> : null}
            <Check label="★ Publier aussi dans les « Offres à la une »" value={f.une === '1'} onChange={(v) => set('une')(v ? '1' : '')} />
            {f.une === '1' ? <Select label="Durée à la une" value={f.une_jours} onChange={(o) => set('une_jours')(String(o.id))} options={[{ id: '0', nom: 'Sans limite' }, { id: '7', nom: '7 jours' }, { id: '15', nom: '15 jours' }, { id: '30', nom: '30 jours' }]} /> : null}
          </Card>
        ) : null}

        <PhotoPicker photos={photos} onChange={setPhotos} max={cfg?.max_photos || 12} help="La première photo est la photo principale. Photos nettes, de jour, sous plusieurs angles." />

        {immo ? (
          <Card>
            <Text style={st.h2}>Le bien immobilier</Text>
            <Field label="Titre de l'annonce *" value={f.immo_titre} onChangeText={set('immo_titre')} maxLength={120} placeholder="Ex. Villa 4 pièces à louer – Riviera Synacassi 2" />
            <Segmented value={f.immo_statut} onChange={set('immo_statut')} options={[{ id: 'louer', nom: 'À louer' }, { id: 'vendre', nom: 'À vendre' }]} />
            <Select label="Type de bien *" value={f.type_de_bien} options={opts(cat?.types_de_bien)} onChange={(o) => set('type_de_bien')(String(o.id))} />
            {f.immo_statut === 'louer' ? <Segmented value={f.immo_periode} onChange={set('immo_periode')} options={[{ id: 'mois', nom: 'Loyer par mois' }, { id: 'jour', nom: 'Prix par jour' }]} /> : null}
          </Card>
        ) : (
          <Card>
            <Text style={st.h2}>Le véhicule</Text>
            <Select label="Marque *" value={f.marque} options={opts(cat?.marques)} onChange={(o) => set('marque')(String(o.id))} searchable />
            <Select label="Modèle *" value={f.modele} disabled={!brand} placeholder={brand ? 'Choisir le modèle…' : 'Choisissez d\'abord la marque'} options={opts(brand?.modeles)} onChange={(o) => set('modele')(String(o.id))} searchable />
            <View style={st.two}>
              <View style={{ flex: 1 }}><Select label="Année *" value={f.annee} options={years} onChange={(o) => set('annee')(String(o.id))} /></View>
              <Field style={{ flex: 1 }} label="Kilométrage" value={f.kilometrage ? money(Number(f.kilometrage)) : ''} onChangeText={(v) => set('kilometrage')(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="km" />
            </View>
            <View style={st.two}>
              <View style={{ flex: 1 }}><Select label="Carburant" value={f.carburant} options={opts(cat?.carburants)} onChange={(o) => set('carburant')(String(o.id))} /></View>
              <View style={{ flex: 1 }}><Select label="Boîte" value={f.transmission} options={opts(cat?.transmissions)} onChange={(o) => set('transmission')(String(o.id))} /></View>
            </View>
            <View style={st.two}>
              <View style={{ flex: 1 }}><Select label="Carrosserie" value={f.carrosserie} options={opts(cat?.carrosseries)} onChange={(o) => set('carrosserie')(String(o.id))} /></View>
              <View style={{ flex: 1 }}><Select label="Couleur" value={f.couleur} options={opts(cat?.couleurs)} onChange={(o) => set('couleur')(String(o.id))} /></View>
            </View>
            <View style={st.two}>
              <View style={{ flex: 1 }}><Select label="État" value={f.etat} options={opts(cat?.etats)} onChange={(o) => set('etat')(String(o.id))} /></View>
              <Field style={{ flex: 1 }} label="Puissance" value={f.puissance} onChangeText={set('puissance')} placeholder="Ex. 150 ch" />
            </View>
            {staff && f.categorie === 'import' ? (
              <Select label="Pays de provenance *" value={f.provenance} options={(cfg?.provenances || []).map((p) => ({ id: p.id, nom: p.nom }))} onChange={(o) => set('provenance')(String(o.id))} help="Le prix sera affiché HT (hors taxes, hors douane)." />
            ) : null}
          </Card>
        )}

        {!staff && !profile.type_vendeur ? (
          <Card>
            <Text style={st.h2}>Vous êtes</Text>
            <Segmented value={f.type_vendeur} onChange={set('type_vendeur')} options={[{ id: 'particulier', nom: 'Particulier' }, { id: 'pro', nom: 'Professionnel' }]} />
            {f.type_vendeur === 'pro' ? <Field label="Nom de l'entreprise (facultatif)" value={f.entreprise} onChangeText={set('entreprise')} /> : null}
          </Card>
        ) : null}

        <Card>
          <Text style={st.h2}>Prix et contact</Text>
          <Field label={'Prix (FCFA) *' + (f.categorie === 'location' ? ' – par ' + f.prix_periode : immo && f.immo_statut === 'louer' ? ' – par ' + f.immo_periode : '')} value={f.prix ? money(Number(f.prix)) : ''} onChangeText={(v) => set('prix')(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Ex. 12 500 000" />
          {!staff ? <Field label="Votre téléphone (appels et WhatsApp) *" value={f.telephone} onChangeText={set('telephone')} keyboardType="phone-pad" placeholder="07 00 00 00 00" help="Affiché sur votre annonce pour que les acheteurs vous appellent." /> : null}
          {f.categorie !== 'import' || immo ? (
            <>
              <Select label="Ville et commune *" value={f.lieu} options={lieux} onChange={(o) => set('lieu')(String(o.id))} searchable />
              <Field label="Quartier (facultatif)" value={f.quartier} onChangeText={set('quartier')} placeholder="Ex. Riviera 3" />
            </>
          ) : null}
        </Card>

        <Card>
          <Text style={st.h2}>Description</Text>
          <Field label="Décrivez votre annonce" value={f.description} onChangeText={set('description')} multiline maxLength={maxDesc} placeholder={immo ? 'Pièces, surface, équipements, conditions…' : 'État, options, entretien, historique…'} help={f.description.length + ' / ' + maxDesc + ' caractères'} />
        </Card>

        <Button title={busy ? 'Envoi en cours… (ne quittez pas)' : staff ? 'Publier l\'annonce' : 'Envoyer mon annonce'} onPress={submit} loading={busy} icon="send" />
        <Text style={st.small}>Le brouillon est gardé sur votre téléphone tant que l'annonce n'est pas envoyée.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 28, color: C.fg },
  h2: { fontFamily: F.display, fontSize: 19, color: C.fg },
  lead: { fontFamily: F.body, fontSize: 14.5, color: C.muted, marginTop: -8, lineHeight: 20 },
  two: { flexDirection: 'row', gap: 10 },
  small: { fontFamily: F.body, fontSize: 12.5, color: C.faint, textAlign: 'center' },
});
