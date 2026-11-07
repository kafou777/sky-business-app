import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '@/components/Icon';
import Photo from '@/components/Photo';
import { Button, Card, Empty, Field, Header, Notice, Segmented } from '@/components/ui';
import { api, money } from '@/lib/api';
import { cart, useCart } from '@/lib/cart';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

/** Panier : récapitulatif + coordonnées → commande enregistrée puis envoyée sur WhatsApp. */
export default function Panier() {
  const { items, total, incomplet } = useCart();
  const { profile } = useSession();
  const [d, setD] = useState({ nom: '', tel: '', mode: 'livraison', adresse: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ ref: string; wa: string; message: string } | null>(null);
  const set = (k: keyof typeof d) => (v: string) => setD((o) => ({ ...o, [k]: v }));

  useEffect(() => {
    AsyncStorage.getItem('sky_client').then((s) => {
      const c = s ? JSON.parse(s) : {};
      setD((o) => ({ ...o, nom: o.nom || c.nom || (profile && !profile.administrateur ? profile.nom : '') || '', tel: o.tel || c.tel || (profile && !profile.administrateur ? profile.telephone : '') || '', adresse: o.adresse || c.adresse || '' }));
    }).catch(() => {});
  }, [profile]);

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="Commande envoyée" />
        <Empty icon="check" title={'Commande ' + done.ref} text={done.message} action="Ouvrir WhatsApp" onAction={() => Linking.openURL(done.wa)} />
        <Button title="Retour à la boutique" kind="ghost" onPress={() => router.replace('/boutique')} style={{ marginHorizontal: 24 }} />
      </View>
    );
  }

  const send = async () => {
    setErr('');
    const tel = d.tel.replace(/\D/g, '').replace(/^225(?=\d{10}$)/, '');
    if (!d.nom.trim()) return setErr('Indiquez votre nom.');
    if (tel.length !== 10) return setErr('Indiquez un numéro de téléphone à 10 chiffres.');
    if (d.mode === 'livraison' && !d.adresse.trim()) return setErr('Indiquez la commune ou l\'adresse de livraison.');
    setBusy(true);
    try {
      AsyncStorage.setItem('sky_client', JSON.stringify({ nom: d.nom, tel: d.tel, adresse: d.adresse })).catch(() => {});
      const r = await api<{ ref: string; wa: string; message: string }>('/accessoires/commande', { body: { ...d, tel, panier: items.map((i) => ({ id: i.id, qte: i.qte })) } });
      cart.clear();
      setDone(r.data);
      Linking.openURL(r.data.wa).catch(() => {});
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior="padding">
      <Header title="Votre panier" sub={items.length ? items.reduce((n, i) => n + i.qte, 0) + ' article(s)' : undefined} />
      {!items.length ? (
        <Empty icon="bag" title="Votre panier est vide" text="Ajoutez des accessoires depuis la boutique." action="Voir la boutique" onAction={() => router.replace('/boutique')} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
          <Card style={{ gap: 12 }}>
            {items.map((i) => (
              <View key={i.id} style={st.line}>
                <Pressable onPress={() => router.push(`/accessoire/${i.id}`)} style={st.thumb}><Photo uri={i.photo} style={StyleSheet.absoluteFill} recyclingKey={'cart' + i.id} /></Pressable>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={st.name} numberOfLines={2}>{i.nom}</Text>
                  <Text style={[st.p, !i.prix && { color: C.warn }]}>{i.prix ? money(i.prix * i.qte) + ' FCFA' : 'Prix sur demande'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={st.qty}>
                      <Pressable onPress={() => cart.setQte(i.id, i.qte - 1)} style={st.qBtn} accessibilityLabel="Retirer un"><Icon name="minus" size={16} /></Pressable>
                      <Text style={st.qVal}>{i.qte}</Text>
                      <Pressable onPress={() => cart.setQte(i.id, i.qte + 1)} style={st.qBtn} accessibilityLabel="Ajouter un"><Icon name="plus" size={16} /></Pressable>
                    </View>
                    <Pressable onPress={() => cart.remove(i.id)} hitSlop={8} accessibilityLabel={'Retirer ' + i.nom}><Text style={st.rm}>Retirer</Text></Pressable>
                  </View>
                </View>
              </View>
            ))}
            <View style={st.total}>
              <View><Text style={st.totalLabel}>Total</Text>{incomplet ? <Text style={st.totalSub}>+ articles à prix sur demande</Text> : null}</View>
              <Text style={st.totalVal}>{total ? money(total) + ' FCFA' : 'À confirmer'}</Text>
            </View>
          </Card>

          <Card style={{ gap: 12 }}>
            <Text style={st.h2}>Vos coordonnées</Text>
            <Field label="Votre nom *" value={d.nom} onChangeText={set('nom')} autoComplete="name" />
            <Field label="Téléphone *" value={d.tel} onChangeText={set('tel')} keyboardType="phone-pad" placeholder="07 00 00 00 00" autoComplete="tel" />
            <Segmented options={[{ id: 'livraison', nom: 'Livraison' }, { id: 'retrait', nom: 'Retrait à Cocody' }]} value={d.mode} onChange={set('mode')} />
            {d.mode === 'livraison' ? <Field label="Commune / adresse de livraison *" value={d.adresse} onChangeText={set('adresse')} placeholder="Ex. : Cocody Angré, 8e tranche" /> : null}
            <Field label="Précisions (facultatif)" value={d.note} onChangeText={set('note')} multiline placeholder="Modèle et année du véhicule, couleur…" />
          </Card>

          {err ? <Notice text={err} kind="err" /> : null}
          <Button title="Envoyer la commande sur WhatsApp" icon="whatsapp" kind="wa" onPress={send} loading={busy} />
          <Text style={st.help}>La commande est enregistrée chez Sky Business, puis WhatsApp s'ouvre avec le récapitulatif : appuyez sur « Envoyer ». Nous vous rappelons pour confirmer le prix, la compatibilité et la livraison.</Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  line: { flexDirection: 'row', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  thumb: { width: 64, height: 80, borderRadius: R.sm, overflow: 'hidden', backgroundColor: C.surface },
  name: { fontFamily: F.bold, fontSize: 14.5, color: C.fg },
  p: { fontFamily: F.semi, fontSize: 13.5, color: C.muted },
  qty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: R.sm },
  qBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  qVal: { minWidth: 24, textAlign: 'center', fontFamily: F.bold, fontSize: 15, color: C.fg },
  rm: { fontFamily: F.semi, fontSize: 13.5, color: C.crit },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: F.display, fontSize: 18, color: C.fg },
  totalSub: { fontFamily: F.body, fontSize: 12, color: C.warn },
  totalVal: { fontFamily: F.display, fontSize: 19, color: C.accent },
  h2: { fontFamily: F.display, fontSize: 18, color: C.fg },
  help: { fontFamily: F.body, fontSize: 13, color: C.muted, lineHeight: 19, textAlign: 'center' },
});
