import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { appendFile } from '@/components/PhotoPicker';
import { Avatar } from '@/components/Seller';
import { router } from 'expo-router';
import { Button, Card, confirm, Empty, Field, Header, info, Notice, Segmented } from '@/components/ui';
import { api, Profile, setToken } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F } from '@/lib/theme';

export default function ProfilScreen() {
  const { profile, setProfile } = useSession();
  const [d, setD] = useState({ nom: profile?.nom || '', telephone: profile?.telephone || '', whatsapp: profile?.whatsapp || '', type_vendeur: profile?.type_vendeur || '', entreprise: profile?.entreprise || '' });
  const [pw, setPw] = useState({ mot_de_passe: '', nouveau_mot_de_passe: '' });
  const [busy, setBusy] = useState<'' | 'p' | 'm' | 'photo'>('');
  const [msg, setMsg] = useState<{ t: string; k: 'ok' | 'err' } | null>(null);
  if (!profile) return <Empty icon="lock" title="Connexion nécessaire" action="Se connecter" onAction={() => router.replace('/connexion')} />;
  const set = (k: keyof typeof d) => (v: string) => setD((o) => ({ ...o, [k]: v }));

  const save = async () => {
    setBusy('p'); setMsg(null);
    try {
      const body: Record<string, string> = { nom: d.nom, telephone: d.telephone, whatsapp: d.whatsapp };
      if (!profile.administrateur && d.type_vendeur) { body.type_vendeur = d.type_vendeur; body.entreprise = d.entreprise; }
      const r = await api<{ profil: Profile }>('/app/profil', { body });
      setProfile(r.data.profil); setMsg({ t: 'Profil enregistré.', k: 'ok' });
    } catch (e: any) { setMsg({ t: e.message, k: 'err' }); }
    finally { setBusy(''); }
  };
  const changePw = async () => {
    setBusy('m'); setMsg(null);
    try {
      const r = await api<{ profil: Profile; jeton: string }>('/app/profil', { body: pw });
      await setToken(r.data.jeton); setProfile(r.data.profil);
      setPw({ mot_de_passe: '', nouveau_mot_de_passe: '' });
      setMsg({ t: 'Mot de passe changé. Vos autres appareils ont été déconnectés.', k: 'ok' });
    } catch (e: any) { setMsg({ t: e.message, k: 'err' }); }
    finally { setBusy(''); }
  };

  const photo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && Platform.OS !== 'web') { info('Autorisation nécessaire', 'Autorisez l\'accès aux photos dans les réglages du téléphone.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: true, aspect: [1, 1] });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    setBusy('photo'); setMsg(null);
    try {
      const form = new FormData();
      await appendFile(form, 'photo', { uri: a.uri, name: 'profil.jpg', type: a.mimeType || 'image/jpeg', width: a.width, height: a.height });
      const res = await api<{ profil: Profile }>('/app/profil/photo', { form, timeout: 120000 });
      setProfile(res.data.profil); setMsg({ t: 'Photo de profil enregistrée.', k: 'ok' });
    } catch (e: any) { setMsg({ t: e.message, k: 'err' }); }
    finally { setBusy(''); }
  };
  const removePhoto = async () => {
    if (!(await confirm('Retirer la photo ?', 'Votre initiale s\'affichera à la place.', 'Retirer', true))) return;
    setBusy('photo');
    try { const res = await api<{ profil: Profile }>('/app/profil/photo', { body: { retirer: 1 } }); setProfile(res.data.profil); }
    catch (e: any) { setMsg({ t: e.message, k: 'err' }); }
    finally { setBusy(''); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior="padding">
      <Header title="Mon profil" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {msg ? <Notice text={msg.t} kind={msg.k} /> : null}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar uri={profile.photo} name={profile.nom} size={84} />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={st.h2}>Photo de profil</Text>
              <Text style={st.muted}>Visible sur vos annonces et dans les messages. Un logo ou une photo nette de vous.</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={profile.photo ? 'Changer la photo' : 'Choisir une photo'} icon="camera" kind="secondary" onPress={photo} loading={busy === 'photo'} style={{ flex: 1 }} small />
            {profile.photo ? <Button title="Retirer" kind="ghost" onPress={removePhoto} small /> : null}
          </View>
        </Card>
        <Card>
          <Text style={st.h2}>Informations</Text>
          <Field label="Nom et prénoms" value={d.nom} onChangeText={set('nom')} autoCapitalize="words" />
          <Field label="Téléphone (appels)" value={d.telephone} onChangeText={set('telephone')} keyboardType="phone-pad" help="Affiché sur vos annonces. Vous pouvez aussi vous connecter avec ce numéro." />
          <Field label="WhatsApp (si différent)" value={d.whatsapp} onChangeText={set('whatsapp')} keyboardType="phone-pad" placeholder="Laisser vide = même numéro" />
          <Text style={st.label}>E-mail</Text>
          <Text style={st.muted}>{profile.email}</Text>
          {!profile.administrateur ? (
            <>
              <Text style={st.label}>Vous êtes</Text>
              <Segmented value={d.type_vendeur} onChange={set('type_vendeur')} options={[{ id: 'particulier', nom: 'Particulier' }, { id: 'pro', nom: 'Professionnel' }]} />
              {d.type_vendeur === 'pro' ? <Field label="Nom de l'entreprise" value={d.entreprise} onChangeText={set('entreprise')} /> : null}
            </>
          ) : null}
          <Button title="Enregistrer" onPress={save} loading={busy === 'p'} />
        </Card>
        <Card>
          <Text style={st.h2}>Mot de passe</Text>
          <Field label="Mot de passe actuel" value={pw.mot_de_passe} onChangeText={(v) => setPw((o) => ({ ...o, mot_de_passe: v }))} secure autoComplete="current-password" />
          <Field label="Nouveau mot de passe" value={pw.nouveau_mot_de_passe} onChangeText={(v) => setPw((o) => ({ ...o, nouveau_mot_de_passe: v }))} secure autoComplete="new-password" help="8 caractères minimum. Le même pour le site et l'application." />
          <Button title="Changer le mot de passe" kind="secondary" onPress={changePw} loading={busy === 'm'} disabled={!pw.mot_de_passe || pw.nouveau_mot_de_passe.length < 8} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  h2: { fontFamily: F.display, fontSize: 19, color: C.fg },
  label: { fontFamily: F.semi, fontSize: 14, color: C.fg, marginBottom: -6 },
  muted: { fontFamily: F.body, fontSize: 15, color: C.muted },
});
