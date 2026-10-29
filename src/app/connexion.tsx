import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, IconButton, Notice, Segmented } from '@/components/ui';
import { api, getConfig } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

export default function Connexion() {
  const ins = useSafeAreaInsets();
  const { login, register } = useSession();
  const cfg = getConfig();
  const [tab, setTab] = useState<'connexion' | 'inscription' | 'oubli'>('connexion');
  const [d, setD] = useState({ identifiant: '', mot_de_passe: '', nom: '', telephone: '', email: '', type_vendeur: '', entreprise: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; k: 'ok' | 'err' } | null>(null);
  const set = (k: keyof typeof d) => (v: string) => setD((o) => ({ ...o, [k]: v }));

  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const submit = async () => {
    setMsg(null); setBusy(true);
    try {
      if (tab === 'connexion') {
        await login(d.identifiant.trim(), d.mot_de_passe);
        done();
      } else if (tab === 'inscription') {
        if (!d.type_vendeur) throw new Error('Indiquez si vous êtes un particulier ou un professionnel.');
        await register({ nom: d.nom.trim(), telephone: d.telephone, email: d.email.trim(), mot_de_passe: d.mot_de_passe, type_vendeur: d.type_vendeur, entreprise: d.entreprise });
        done();
      } else {
        const r = await api<{ message: string }>('/app/mot-de-passe-oublie', { body: { email: d.email.trim() } });
        setMsg({ t: r.data.message, k: 'ok' });
      }
    } catch (e: any) {
      setMsg({ t: e.message, k: 'err' });
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: ins.top + (Platform.OS === 'ios' ? 12 : 16), paddingBottom: ins.bottom + 30, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Image source={require('../../assets/logo-wordmark.png')} style={{ width: 150, height: 39 }} contentFit="contain" accessibilityLabel="Sky Business" />
          <IconButton name="close" label="Fermer" onPress={done} bg={C.surface} />
        </View>
        <Text style={st.title}>{tab === 'connexion' ? 'Connexion' : tab === 'inscription' ? 'Créer un compte' : 'Mot de passe oublié'}</Text>
        <Text style={st.lead}>{tab === 'connexion' ? 'Utilisez le même compte que sur le site Sky Business : e-mail, identifiant ou numéro de téléphone.' : tab === 'inscription' ? 'Gratuit. Publiez vos véhicules, discutez avec les vendeurs et retrouvez vos favoris.' : 'Indiquez l\'adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.'}</Text>

        {tab !== 'oubli' ? (
          <Segmented value={tab} onChange={(v) => { setTab(v as any); setMsg(null); setD((o) => ({ ...o, mot_de_passe: '' })); }} options={[{ id: 'connexion', nom: 'J\'ai un compte' }, { id: 'inscription', nom: 'Nouveau compte' }]} />
        ) : null}

        {msg ? <Notice text={msg.t} kind={msg.k} /> : null}

        {tab === 'connexion' ? (
          <>
            <Field label="E-mail, identifiant ou téléphone" value={d.identifiant} onChangeText={set('identifiant')} autoCapitalize="none" autoComplete="username" placeholder="ex. 07 00 00 00 00" />
            <Field label="Mot de passe" value={d.mot_de_passe} onChangeText={set('mot_de_passe')} secure autoComplete="current-password" />
            <Button title="Se connecter" onPress={submit} loading={busy} disabled={!d.identifiant || !d.mot_de_passe} />
            <Pressable onPress={() => { setTab('oubli'); setMsg(null); }} style={{ alignSelf: 'center', padding: 8 }}><Text style={st.link}>Mot de passe oublié ?</Text></Pressable>
          </>
        ) : tab === 'inscription' ? (
          <>
            <Field label="Nom et prénoms" value={d.nom} onChangeText={set('nom')} autoComplete="name" autoCapitalize="words" />
            <Field label="Téléphone" value={d.telephone} onChangeText={set('telephone')} keyboardType="phone-pad" autoComplete="tel" placeholder="07 00 00 00 00" help="Affiché sur vos annonces pour les appels et WhatsApp." />
            <Field label="E-mail" value={d.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Field label="Mot de passe" value={d.mot_de_passe} onChangeText={set('mot_de_passe')} secure autoComplete="new-password" help="8 caractères minimum." />
            <Text style={st.label}>Vous êtes</Text>
            {(cfg?.types_vendeur || [{ id: 'particulier', nom: 'Particulier', aide: 'Je vends mon propre véhicule' }, { id: 'pro', nom: 'Professionnel', aide: 'Garage, concessionnaire, revendeur' }]).map((t) => (
              <Pressable key={t.id} onPress={() => set('type_vendeur')(t.id)} style={[st.radio, d.type_vendeur === t.id && st.radioOn]} accessibilityRole="radio" accessibilityState={{ checked: d.type_vendeur === t.id }}>
                <View style={[st.dot, d.type_vendeur === t.id && { borderColor: C.accent }]}>{d.type_vendeur === t.id ? <View style={st.dotIn} /> : null}</View>
                <View style={{ flex: 1 }}><Text style={st.radioT}>{t.nom}</Text><Text style={st.radioS}>{t.aide}</Text></View>
              </Pressable>
            ))}
            {d.type_vendeur === 'pro' ? <Field label="Nom de l'entreprise (facultatif)" value={d.entreprise} onChangeText={set('entreprise')} placeholder="Ex. Auto Prestige Cocody" /> : null}
            <Button title="Créer mon compte" onPress={submit} loading={busy} disabled={!d.nom || !d.telephone || !d.email || !d.mot_de_passe} />
            {cfg?.confidentialite ? (
              <Text style={st.small}>En créant un compte, vous acceptez notre <Text style={st.link} onPress={() => WebBrowser.openBrowserAsync(cfg.confidentialite)}>politique de confidentialité</Text>.</Text>
            ) : null}
          </>
        ) : (
          <>
            <Field label="E-mail" value={d.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Button title="Recevoir le lien" onPress={submit} loading={busy} disabled={!d.email} />
            <Pressable onPress={() => { setTab('connexion'); setMsg(null); }} style={{ alignSelf: 'center', padding: 8 }}><Text style={st.link}>Retour à la connexion</Text></Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  title: { fontFamily: F.display, fontSize: 28, color: C.fg, marginTop: 6 },
  lead: { fontFamily: F.body, fontSize: 15, color: C.muted, lineHeight: 21, marginTop: -6 },
  label: { fontFamily: F.semi, fontSize: 14, color: C.fg, marginBottom: -6 },
  link: { fontFamily: F.bold, fontSize: 15, color: C.accent },
  small: { fontFamily: F.body, fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },
  radio: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line },
  radioOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  dotIn: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.accent },
  radioT: { fontFamily: F.bold, fontSize: 15, color: C.fg },
  radioS: { fontFamily: F.body, fontSize: 13, color: C.muted },
});
