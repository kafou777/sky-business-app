import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Icon from '@/components/Icon';
import PhotoPicker, { appendFile, Photo } from '@/components/PhotoPicker';
import { Button, Card, Check, Empty, Field, Header, Notice, Opt, Select } from '@/components/ui';
import { api, Catalogue, getCatalogue, getConfig } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

type Item = { nom: string; ref: string; qte: string };

export default function Pieces() {
  const { profile } = useSession();
  const cfg = getConfig();
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [d, setD] = useState({ marque: '', modele: '', vehicule_autre: '', annee: '', motorisation: '', boite: '', chassis: '', etat: 'indifferent', urgence: 'normal', budget: '', infos: '', nom: '', telephone: '', whatsapp: '', contact: 'whatsapp', commune: '', livraison: 'retrait', email: '' });
  const [same, setSame] = useState(true);
  const [items, setItems] = useState<Item[]>([{ nom: '', ref: '', qte: '1' }]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [cg, setCg] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ numero: string; message: string } | null>(null);
  const set = (k: keyof typeof d) => (v: string) => setD((o) => ({ ...o, [k]: v, ...(k === 'marque' ? { modele: '' } : {}) }));

  useEffect(() => { getCatalogue().then(setCat).catch(() => {}); }, []);
  useEffect(() => {
    if (profile && !profile.administrateur) setD((o) => ({ ...o, nom: o.nom || profile.nom, telephone: o.telephone || profile.telephone, email: o.email || profile.email }));
  }, [profile]);

  const brand = cat?.marques.find((b) => String(b.id) === d.marque);
  const toOpts = (l?: Opt[]) => l || [];
  const year = new Date().getFullYear();
  const years: Opt[] = Array.from({ length: year + 2 - 1960 }, (_, i) => ({ id: year + 1 - i, nom: String(year + 1 - i) }));
  const P = cfg?.pieces;

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="Pièces détachées" />
        <Empty icon="check" title={'Demande ' + done.numero + ' envoyée'} text={done.message} action="Retour" onAction={() => router.back()} />
      </View>
    );
  }

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const form = new FormData();
      Object.entries(d).forEach(([k, v]) => { if (v !== '' && !(k === 'whatsapp' && same)) form.append(k, v); });
      if (same) form.append('whatsapp_meme', '1');
      items.filter((i) => i.nom.trim()).forEach((i) => { form.append('piece_nom[]', i.nom); form.append('piece_ref[]', i.ref); form.append('piece_qte[]', i.qte || '1'); });
      for (const p of photos) await appendFile(form, 'photos[]', p);
      if (cg[0]) await appendFile(form, 'carte_grise', cg[0]);
      const r = await api<{ numero: string; message: string }>('/app/pieces', { form, timeout: 180000 });
      setDone(r.data);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior="padding">
      <Header title="Commander une pièce" sub="Sky Business la trouve pour vous" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {err ? <Notice text={err} kind="err" /> : null}
        <Card>
          <Text style={st.h2}>Votre véhicule</Text>
          <Select label="Marque *" value={d.marque} options={(cat?.marques || []).map((b) => ({ id: b.id, nom: b.nom }))} onChange={(o) => set('marque')(String(o.id))} searchable />
          <Select label="Modèle" value={d.modele} disabled={!brand} placeholder={brand ? 'Choisir le modèle…' : 'Choisissez d\'abord la marque'} options={(brand?.modeles || []).map((m) => ({ id: m.id, nom: m.nom }))} onChange={(o) => set('modele')(String(o.id))} searchable />
          <Field label="Marque ou modèle absent de la liste ?" value={d.vehicule_autre} onChangeText={set('vehicule_autre')} placeholder="Ex. Toyota Land Cruiser Prado" />
          <View style={st.two}>
            <View style={{ flex: 1 }}><Select label="Année *" value={d.annee} options={years} onChange={(o) => set('annee')(String(o.id))} /></View>
            <View style={{ flex: 1 }}><Select label="Motorisation" value={d.motorisation} options={toOpts(P?.motorisation)} onChange={(o) => set('motorisation')(String(o.id))} placeholder="Je ne sais pas" /></View>
          </View>
          <Select label="Boîte de vitesses" value={d.boite} options={toOpts(P?.boite)} onChange={(o) => set('boite')(String(o.id))} placeholder="Je ne sais pas" />
          <Field label="Numéro de châssis (VIN) *" value={d.chassis} onChangeText={set('chassis')} autoCapitalize="none" placeholder="Sur la carte grise (17 caractères)" help="Ou ajoutez une photo de la carte grise ci-dessous." />
          <PhotoPicker label="Photo de la carte grise" photos={cg} onChange={setCg} max={1} />
        </Card>

        <Card>
          <Text style={st.h2}>Pièce(s) recherchée(s)</Text>
          {items.map((it, i) => (
            <View key={i} style={st.item}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[st.label, { flex: 1 }]}>Pièce {i + 1}</Text>
                {items.length > 1 ? <Pressable onPress={() => setItems(items.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={'Retirer la pièce ' + (i + 1)}><Icon name="trash" size={18} color={C.crit} /></Pressable> : null}
              </View>
              <Field label="Nom de la pièce *" value={it.nom} onChangeText={(v) => setItems(items.map((x, j) => (j === i ? { ...x, nom: v } : x)))} placeholder="Ex. plaquettes de frein avant" />
              <View style={st.two}>
                <Field style={{ flex: 2 }} label="Référence (facultatif)" value={it.ref} onChangeText={(v) => setItems(items.map((x, j) => (j === i ? { ...x, ref: v } : x)))} />
                <Field style={{ flex: 1 }} label="Quantité" value={it.qte} onChangeText={(v) => setItems(items.map((x, j) => (j === i ? { ...x, qte: v.replace(/\D/g, '').slice(0, 2) } : x)))} keyboardType="number-pad" />
              </View>
            </View>
          ))}
          {items.length < 5 ? <Button small kind="secondary" icon="plus" title="Ajouter une autre pièce" onPress={() => setItems([...items, { nom: '', ref: '', qte: '1' }])} /> : null}
          <PhotoPicker label="Photos de la pièce" photos={photos} onChange={setPhotos} max={6} help="Ancienne pièce, étiquette, emplacement : cela nous aide à trouver la bonne." />
          <View style={st.two}>
            <View style={{ flex: 1 }}><Select label="État souhaité" value={d.etat} options={toOpts(P?.etat)} onChange={(o) => set('etat')(String(o.id))} /></View>
            <View style={{ flex: 1 }}><Select label="Délai" value={d.urgence} options={toOpts(P?.urgence)} onChange={(o) => set('urgence')(String(o.id))} /></View>
          </View>
          <Field label="Budget maximum (FCFA, facultatif)" value={d.budget} onChangeText={(v) => set('budget')(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          <Field label="Informations supplémentaires" value={d.infos} onChangeText={set('infos')} multiline maxLength={1000} />
        </Card>

        <Card>
          <Text style={st.h2}>Vos coordonnées</Text>
          <Field label="Nom et prénoms *" value={d.nom} onChangeText={set('nom')} autoCapitalize="words" />
          <Field label="Téléphone *" value={d.telephone} onChangeText={set('telephone')} keyboardType="phone-pad" placeholder="07 00 00 00 00" />
          <Check label="Même numéro pour WhatsApp" value={same} onChange={setSame} />
          {!same ? <Field label="Numéro WhatsApp" value={d.whatsapp} onChangeText={set('whatsapp')} keyboardType="phone-pad" /> : null}
          <Select label="Comment vous contacter ?" value={d.contact} options={toOpts(P?.contact)} onChange={(o) => set('contact')(String(o.id))} />
          <Field label="Commune" value={d.commune} onChangeText={set('commune')} placeholder="Ex. Cocody" />
          <Select label="Récupération" value={d.livraison} options={toOpts(P?.livraison)} onChange={(o) => set('livraison')(String(o.id))} />
          <Field label="E-mail (facultatif)" value={d.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
        </Card>
        <Button title="Envoyer ma demande" icon="send" onPress={submit} loading={busy} disabled={!d.nom || !d.telephone || !items.some((i) => i.nom.trim())} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  h2: { fontFamily: F.display, fontSize: 19, color: C.fg },
  label: { fontFamily: F.bold, fontSize: 14, color: C.accent },
  two: { flexDirection: 'row', gap: 10 },
  item: { gap: 10, padding: 12, borderRadius: R.md, backgroundColor: C.surface },
});
