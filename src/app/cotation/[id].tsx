import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateField, { parse, ymd } from '@/components/DateField';
import { Button, Card, Empty, Field, Header, Loading, Notice, Select } from '@/components/ui';
import { api, Listing, money } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

export default function Cotation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useSession();
  const [l, setL] = useState<Listing | null>(null);
  const [err, setErr] = useState('');
  const [d, setD] = useState({ societe: '', nom: '', email: '', tel: '', debut: '', fin: '', lieu: '', chauffeur: '', usage: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; k: 'ok' | 'err' } | null>(null);
  const [sent, setSent] = useState('');
  const set = (k: keyof typeof d) => (v: string) => setD((o) => ({ ...o, [k]: v }));

  useEffect(() => { api<Listing>('/annonces/' + id).then((r) => setL(r.data)).catch((e) => setErr(e.message)); }, [id]);
  useEffect(() => {
    if (profile && !profile.administrateur) setD((o) => ({ ...o, nom: o.nom || profile.nom, email: o.email || profile.email, tel: o.tel || profile.telephone }));
  }, [profile]);

  if (err) return <View style={{ flex: 1 }}><Header title="Cotation" /><Empty icon="info" title="Annonce indisponible" text={err} /></View>;
  if (!l) return <View style={{ flex: 1 }}><Header title="Cotation" /><Loading /></View>;
  if (!l.cotation) return <View style={{ flex: 1 }}><Header title="Cotation" /><Empty icon="info" title="Cotation indisponible" text="La cotation en ligne concerne les véhicules en location." /></View>;

  const today = ymd(new Date());
  const days = d.debut && d.fin ? Math.round((parse(d.fin).getTime() - parse(d.debut).getTime()) / 864e5) + 1 : 0;
  const per = l.periode || 'jour';
  const qte = per === 'mois' ? Math.ceil(days / 30) : days;
  const unit = per === 'mois' ? 'mois' : qte > 1 ? 'jours' : 'jour';

  const submit = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ message: string; numero: string }>('/app/cotation', { body: { annonce: l.id, ...d } });
      setSent(r.data.message);
    } catch (e: any) { setMsg({ t: e.message, k: 'err' }); }
    finally { setBusy(false); }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="Cotation" />
        <Empty icon="check" title="Demande envoyée" text={sent} action="Retour à l'annonce" onAction={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior="padding">
      <Header title="Obtenir une cotation" sub={l.titre} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Text style={st.lead}>Recevez par e-mail une cotation officielle Sky Business pour ce véhicule, calculée sur le tarif affiché ({l.prix ? money(l.prix) + ' FCFA ' + (l.periode ? '/ ' + l.periode : '') : 'prix communiqué dans la cotation'}).</Text>
        {msg ? <Notice text={msg.t} kind={msg.k} /> : null}
        <Card>
          <Text style={st.h2}>Vos dates</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <DateField label="Début *" value={d.debut} min={today} onChange={(v) => setD((o) => ({ ...o, debut: v, fin: o.fin && o.fin < v ? '' : o.fin }))} />
            <DateField label="Fin *" value={d.fin} min={d.debut || today} onChange={set('fin')} />
          </View>
          {days > 0 ? (
            <View style={st.est}>
              <Text style={st.estText}>{l.prix ? 'Estimation : ' + qte + ' ' + unit + ' × ' + money(l.prix) + ' = ' + money(qte * l.prix) + ' FCFA' : days + ' jour(s) — prix communiqué dans la cotation'}</Text>
            </View>
          ) : null}
          <Field label="Lieu de prise en charge" value={d.lieu} onChangeText={set('lieu')} placeholder="Ex. Aéroport FHB, Cocody…" />
          <Select label="Chauffeur" value={d.chauffeur} onChange={(o) => set('chauffeur')(String(o.id))} options={[{ id: '', nom: 'Je ne sais pas' }, { id: 'oui', nom: 'Avec chauffeur' }, { id: 'non', nom: 'Sans chauffeur' }]} />
          <Field label="Utilisation prévue" value={d.usage} onChangeText={set('usage')} placeholder="Ex. navettes aéroport, Abidjan uniquement / intérieur du pays" />
        </Card>
        <Card>
          <Text style={st.h2}>Vos coordonnées</Text>
          <Field label="Société / organisme (facultatif)" value={d.societe} onChangeText={set('societe')} help="Nom qui figurera sur la cotation." />
          <Field label="Nom et prénoms *" value={d.nom} onChangeText={set('nom')} autoCapitalize="words" />
          <Field label="E-mail (pour recevoir la cotation) *" value={d.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Téléphone / WhatsApp *" value={d.tel} onChangeText={set('tel')} keyboardType="phone-pad" placeholder="07 00 00 00 00" />
          <Field label="Précisions" value={d.message} onChangeText={set('message')} multiline maxLength={800} placeholder="Nombre de passagers, horaires, autres besoins…" />
        </Card>
        <Button title="Recevoir ma cotation par e-mail" onPress={submit} loading={busy} disabled={!d.debut || !d.fin || !d.nom || !d.email || !d.tel} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  lead: { fontFamily: F.body, fontSize: 14.5, color: C.muted, lineHeight: 20 },
  h2: { fontFamily: F.display, fontSize: 19, color: C.fg },
  est: { backgroundColor: C.accentSoft, borderRadius: R.md, padding: 12 },
  estText: { fontFamily: F.bold, fontSize: 14.5, color: C.accent },
});
