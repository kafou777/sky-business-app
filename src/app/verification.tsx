import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import Icon, { IconName } from '@/components/Icon';
import { appendFile, Photo } from '@/components/PhotoPicker';
import { BadgeIcon } from '@/components/Seller';
import PhoneVerify from '@/components/PhoneVerify';
import { Button, Field, Header, info, Loading, Notice } from '@/components/ui';
import { api, Profile, VerifState } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

type Info = {
  ouvert: boolean; tarif: string; paiement: string; conditions: string; url: string;
  avantages: { icone: string; titre: string; texte: string }[]; etapes: string[];
  etat: VerifState | null; entreprise: string; telephone: string;
};
const ICON: Record<string, IconName> = { star: 'star', shop: 'building' };
const DOCS: { k: 'doc_rccm' | 'doc_id' | 'doc_lieu'; label: string; help: string; required: boolean }[] = [
  { k: 'doc_rccm', label: 'RCCM de l\'entreprise', help: 'Photo nette du registre du commerce', required: true },
  { k: 'doc_id', label: 'Pièce d\'identité du gérant', help: 'CNI, passeport ou carte consulaire (recto)', required: true },
  { k: 'doc_lieu', label: 'Votre établissement (facultatif)', help: 'Showroom, garage, agence…', required: false },
];

export default function Verification() {
  const { profile, setProfile } = useSession();
  const [d, setD] = useState<Info | null>(null);
  const [f, setF] = useState({ entreprise: '', rccm: '', ncc: '', adresse: '', telephone: '', message: '' });
  const [docs, setDocs] = useState<Partial<Record<string, Photo>>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const r = await api<Info>('/app/verification');
    setD(r.data);
    setF((o) => ({ ...o, entreprise: o.entreprise || r.data.entreprise, telephone: o.telephone || r.data.telephone }));
  }, []);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load, profile?.id]);

  const pick = async (k: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { info('Autorisation nécessaire', 'Autorisez l\'accès aux photos dans les réglages du téléphone.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (r.canceled || !r.assets?.length) return;
    const a = r.assets[0];
    setDocs((o) => ({ ...o, [k]: { uri: a.uri, name: k + '.jpg', type: a.mimeType || 'image/jpeg', width: a.width, height: a.height } }));
  };

  const send = async () => {
    setErr('');
    if (f.entreprise.trim().length < 2) return setErr('Indiquez le nom de l\'entreprise.');
    if (f.rccm.trim().length < 6) return setErr('Indiquez le numéro RCCM.');
    if (f.adresse.trim().length < 5) return setErr('Indiquez l\'adresse de l\'entreprise.');
    if (!docs.doc_rccm || !docs.doc_id) return setErr('Ajoutez la photo du RCCM et de la pièce d\'identité du gérant.');
    setBusy(true);
    try {
      const form = new FormData();
      Object.entries(f).forEach(([k, v]) => form.append(k, v));
      for (const doc of DOCS) { const p = docs[doc.k]; if (p) await appendFile(form, doc.k, p); }
      const r = await api<{ message: string }>('/app/verification', { form, timeout: 180000 });
      info('Demande envoyée', r.data.message);
      setDocs({});
      await load();
      api<Profile>('/app/profil').then((p) => setProfile(p.data)).catch(() => {});
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (!d) return <View style={{ flex: 1, backgroundColor: C.bg }}><Header title="Badge vérifié" />{err ? <View style={{ padding: 16 }}><Notice text={err} kind="err" /></View> : <Loading />}</View>;
  const e = d.etat;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior="padding">
      <Header title="Badge vérifié" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48, maxWidth: 680, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={st.hero}>
          <BadgeIcon size={56} />
          <Text style={st.h1}>Faites vérifier votre entreprise</Text>
          <Text style={st.lead}>Le badge bleu montre aux acheteurs que vous êtes un professionnel sérieux, contrôlé par Sky Business.</Text>
        </View>

        <Text style={st.h2}>Pourquoi se faire vérifier ?</Text>
        {d.avantages.map((a) => (
          <View key={a.titre} style={st.adv}>
            <View style={st.advIc}>{a.icone === 'badge' ? <BadgeIcon size={24} /> : <Icon name={ICON[a.icone] || 'star'} size={22} color={C.accent} />}</View>
            <View style={{ flex: 1, gap: 2 }}><Text style={st.advT}>{a.titre}</Text><Text style={st.advP}>{a.texte}</Text></View>
          </View>
        ))}

        <Text style={st.h2}>Comment ça marche ?</Text>
        <View style={{ gap: 10 }}>
          {d.etapes.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={st.num}><Text style={st.numT}>{i + 1}</Text></View>
              <Text style={[st.advP, { flex: 1, color: C.fg }]}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={st.price}><Text style={st.priceT}>{d.tarif ? 'Tarif : ' + d.tarif : 'Le tarif vous est communiqué par l\'équipe Sky Business lors de l\'examen de votre demande.'}</Text></View>
        {d.conditions ? <Text style={st.advP}>{d.conditions}</Text> : null}

        <View style={st.box}>
          {!profile ? (
            <>
              <Text style={st.h2}>Demander le badge</Text>
              <Text style={st.advP}>Connectez-vous à votre compte professionnel pour faire la demande.</Text>
              <Button title="Se connecter" onPress={() => router.push('/connexion')} />
            </>
          ) : profile.administrateur ? (
            <Text style={st.advP}>Les comptes de l'équipe Sky Business ont déjà le badge.</Text>
          ) : e?.statut === 'verifie' ? (
            <View style={st.state}><BadgeIcon size={26} /><View style={{ flex: 1 }}><Text style={st.advT}>Votre entreprise est vérifiée</Text><Text style={st.advP}>{e.jusqu_affiche ? 'Badge actif jusqu\'au ' + e.jusqu_affiche + '.' : ''}</Text></View></View>
          ) : e?.statut === 'attente' ? (
            <View style={[st.state, { backgroundColor: C.warnSoft }]}><Icon name="clock" size={24} color={C.warn} /><View style={{ flex: 1 }}><Text style={st.advT}>Demande en cours d'examen</Text><Text style={st.advP}>L'équipe Sky Business vérifie votre dossier et vous contactera très vite.</Text></View></View>
          ) : e?.statut === 'particulier' ? (
            <>
              <Text style={st.h2}>Demander le badge</Text>
              <Text style={st.advP}>Le badge vérifié est réservé aux professionnels (garages, concessionnaires, agences, revendeurs). Passez d'abord votre compte en « Professionnel ».</Text>
              <Button title="Modifier mon profil" onPress={() => router.push('/profil')} />
            </>
          ) : !d.ouvert ? (
            <Text style={st.advP}>Les demandes sont momentanément fermées. Contactez Sky Business pour en savoir plus.</Text>
          ) : profile.otp?.badge && !profile.telephone_verifie ? (
            <>
              <Text style={st.h2}>Demander le badge</Text>
              <Text style={st.advP}><Text style={{ fontFamily: F.bold, color: C.fg }}>Étape 1 sur 2 :</Text> confirmez votre numéro de téléphone. Ensuite, vous pourrez envoyer les informations de votre entreprise.</Text>
              <PhoneVerify title="Confirmez votre numéro" />
            </>
          ) : (
            <>
              <Text style={st.h2}>Demander le badge</Text>
              {profile.otp?.badge ? <Text style={st.advP}><Text style={{ fontFamily: F.bold, color: C.fg }}>Étape 2 sur 2 :</Text> votre numéro est vérifié. Renseignez maintenant votre entreprise.</Text> : null}
              {e?.statut === 'refusee' ? <Notice kind="err" text={'Votre précédente demande n\'a pas été acceptée.' + (e.motif ? ' Motif : ' + e.motif : '') + ' Vous pouvez en envoyer une nouvelle.'} /> : null}
              {e?.statut === 'expire' ? <Notice kind="warn" text={'Votre badge a expiré le ' + e.jusqu_affiche + '. Envoyez une demande de renouvellement.'} /> : null}
              <Field label="Nom de l'entreprise *" value={f.entreprise} onChangeText={(v) => setF((o) => ({ ...o, entreprise: v }))} maxLength={80} />
              <Field label="Numéro RCCM *" value={f.rccm} onChangeText={(v) => setF((o) => ({ ...o, rccm: v }))} placeholder="Ex. CI-ABJ-2020-B-12345" maxLength={40} />
              <Field label="Compte contribuable (NCC)" value={f.ncc} onChangeText={(v) => setF((o) => ({ ...o, ncc: v }))} placeholder="Facultatif" maxLength={20} />
              <Field label="Adresse de l'entreprise *" value={f.adresse} onChangeText={(v) => setF((o) => ({ ...o, adresse: v }))} placeholder="Ex. Cocody Riviera 3, face pharmacie…" maxLength={160} />
              <Field label="Téléphone pour vous joindre *" value={f.telephone} onChangeText={(v) => setF((o) => ({ ...o, telephone: v }))} keyboardType="phone-pad" />
              {DOCS.map((doc) => (
                <Pressable key={doc.k} onPress={() => pick(doc.k)} style={st.doc} accessibilityRole="button" accessibilityLabel={'Ajouter : ' + doc.label}>
                  {docs[doc.k] ? <Image source={{ uri: docs[doc.k]!.uri }} style={st.docImg} contentFit="cover" /> : <View style={[st.docImg, st.docEmpty]}><Icon name="camera" size={22} color={C.accent} /></View>}
                  <View style={{ flex: 1 }}><Text style={st.advT}>{doc.label}{doc.required ? ' *' : ''}</Text><Text style={st.advP}>{docs[doc.k] ? 'Photo ajoutée · toucher pour changer' : doc.help}</Text></View>
                  {docs[doc.k] ? <Icon name="check" size={20} color={C.ok} /> : <Icon name="plus" size={20} color={C.accent} />}
                </Pressable>
              ))}
              <Field label="Message (facultatif)" value={f.message} onChangeText={(v) => setF((o) => ({ ...o, message: v }))} multiline maxLength={500} />
              <Text style={st.small}>Vos documents servent uniquement à la vérification. Ils ne sont jamais publiés et sont supprimés dès que l'équipe a pris sa décision.{d.paiement ? ' Règlement : ' + d.paiement + '.' : ''}</Text>
              {err ? <Notice text={err} kind="err" /> : null}
              <Button title="Envoyer ma demande" onPress={send} loading={busy} />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  h1: { fontFamily: F.display, fontSize: 24, color: C.fg, textAlign: 'center' },
  lead: { fontFamily: F.body, fontSize: 15.5, color: C.muted, textAlign: 'center', lineHeight: 22 },
  h2: { fontFamily: F.display, fontSize: 19, color: C.fg },
  adv: { flexDirection: 'row', gap: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: 14 },
  advIc: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  advT: { fontFamily: F.bold, fontSize: 15.5, color: C.fg },
  advP: { fontFamily: F.body, fontSize: 14, color: C.muted, lineHeight: 20 },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  numT: { color: C.white, fontFamily: F.bold, fontSize: 13 },
  price: { backgroundColor: C.goldSoft, borderRadius: R.md, padding: 12 },
  priceT: { fontFamily: F.semi, fontSize: 14.5, color: C.goldFg },
  box: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: R.xl, padding: 16, gap: 12 },
  state: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#e8f1ff', borderRadius: R.md, padding: 14 },
  doc: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: C.line, borderStyle: 'dashed', borderRadius: R.md, padding: 10 },
  docImg: { width: 54, height: 54, borderRadius: 10 },
  docEmpty: { backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  small: { fontFamily: F.body, fontSize: 13, color: C.muted, lineHeight: 18 },
});
