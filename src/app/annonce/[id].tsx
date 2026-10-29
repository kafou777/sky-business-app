import { useEffect, useState } from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from '@/components/Icon';
import { PriceText } from '@/components/ListingCard';
import { Badge, Button, Empty, IconButton, info, Loading } from '@/components/ui';
import { ago, api, Listing, money, prettyPhone } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ins = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile, favs, toggleFav } = useSession();
  const [l, setL] = useState<Listing | null>(null);
  const [err, setErr] = useState('');
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const W = Math.min(width, 700);

  useEffect(() => {
    api<Listing>('/annonces/' + id).then((r) => setL(r.data)).catch((e) => setErr(e.message));
  }, [id, profile?.id]);

  if (err) return <View style={{ flex: 1, paddingTop: ins.top }}><Empty icon="info" title="Annonce indisponible" text={err} action="Retour" onAction={() => router.back()} /></View>;
  if (!l) return <Loading />;

  const c = l.contact;
  const fav = favs.has(l.id);
  const veh = l.type === 'vehicule';
  const rows: [IconName, string, string | number | null | undefined][] = veh ? [
    ['calendar', 'Année', l.annee],
    ['gauge', 'Kilométrage', l.kilometrage != null ? (money(l.kilometrage) || '0') + ' km' : null],
    ['fuel', 'Carburant', l.carburant],
    ['gear', 'Boîte', l.transmission],
    ['car', 'Carrosserie', l.carrosserie],
    ['tag', 'État', l.etat],
    ['star', 'Couleur', l.couleur],
    ['sparkles', 'Puissance', l.puissance],
    ['info', 'Portes', l.portes],
    ['info', 'Intérieur', l.interieur],
    ['ship', 'Provenance', l.provenance],
  ] : [
    ['building', 'Type de bien', l.type_de_bien],
    ['tag', 'Opération', l.operation === 'location' ? 'Location' : 'Vente'],
    ['pin', 'Quartier', l.quartier],
  ];

  const message = async () => {
    if (!profile) { router.push('/connexion'); return; }
    if (l.a_moi) { router.push({ pathname: '/messages', params: { pour: String(l.id) } }); return; }
    setStarting(true);
    try {
      const r = await api<{ id: number }>('/chat/start', { body: { annonce: l.id } });
      router.push(`/conversation/${r.data.id}`);
    } catch (e: any) { info('Messagerie', e.message); }
    finally { setStarting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + ins.bottom }}>
        <View style={{ width: '100%', height: W * 0.75, backgroundColor: C.surface }}>
          {l.photos.length ? (
            <FlatList horizontal pagingEnabled data={l.photos} keyExtractor={(u, i) => i + u} showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
              onScroll={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))} scrollEventThrottle={64}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => setZoom(index)} accessibilityLabel={'Photo ' + (index + 1) + ' sur ' + l.photos.length + ', agrandir'}>
                  <Image source={{ uri: item }} style={{ width: W, height: W * 0.75 }} contentFit="cover" transition={120} />
                </Pressable>
              )} />
          ) : <View style={st.noPhoto}><Icon name={veh ? 'car' : 'building'} size={60} color={C.faint} /></View>}
          <View style={[st.topBar, { top: ins.top + 6 }]}>
            <IconButton name="back" label="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <IconButton name="share" label="Partager" onPress={() => Share.share({ message: l.titre + ' – ' + l.prix_affiche + '\n' + l.url, url: l.url })} />
              <IconButton name="heart" label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} color={fav ? C.crit : C.fg} onPress={() => (profile ? toggleFav(l.id).catch(() => {}) : router.push('/connexion'))} />
            </View>
          </View>
          {l.photos.length > 1 ? <View style={st.counter}><Text style={st.counterText}>{idx + 1} / {l.photos.length}</Text></View> : null}
        </View>

        <View style={st.main}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {l.vendu ? <Badge label={l.rubrique === 'location' ? 'Loué' : 'Vendu'} kind="crit" /> : null}
            {l.vip ? <Badge label="★ À la une" kind="gold" /> : null}
            {veh && l.rubrique ? <Badge label={{ vente: 'À vendre', location: 'Location', import: 'Disponible à l\'import' }[l.rubrique] || l.rubrique} /> : null}
            {!veh ? <Badge label={l.operation === 'location' ? 'À louer' : 'À vendre'} /> : null}
          </View>
          <Text style={st.title} selectable>{l.titre}</Text>
          <PriceText l={l} size={26} />
          <View style={st.metaRow}>
            {l.lieu ? <View style={st.meta}><Icon name="pin" size={15} color={C.muted} /><Text style={st.metaText}>{l.lieu}</Text></View> : null}
            <View style={st.meta}><Icon name="clock" size={15} color={C.muted} /><Text style={st.metaText}>Publiée {ago(l.date)}</Text></View>
          </View>

          {l.cotation && !l.vendu ? (
            <Pressable onPress={() => router.push(`/cotation/${l.id}`)} style={st.cot} accessibilityRole="button">
              <View style={st.cotIcon}><Icon name="file" size={22} color={C.goldFg} /></View>
              <View style={{ flex: 1 }}>
                <Text style={st.cotTitle}>Obtenir une cotation</Text>
                <Text style={st.cotText}>Recevez par e-mail une cotation officielle pour vos dates.</Text>
              </View>
              <Icon name="next" size={20} color={C.goldFg} />
            </Pressable>
          ) : null}

          <Text style={st.h}>Caractéristiques</Text>
          <View style={st.grid}>
            {rows.filter((r) => r[2]).map(([ic, k, v]) => (
              <View key={k} style={st.cell}>
                <Icon name={ic} size={18} color={C.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={st.cellK}>{k}</Text>
                  <Text style={st.cellV} numberOfLines={2}>{String(v)}</Text>
                </View>
              </View>
            ))}
          </View>

          {l.description ? (<><Text style={st.h}>Description</Text><Text style={st.desc} selectable>{l.description}</Text></>) : null}

          {c ? (
            <View style={st.seller}>
              <View style={st.avatar}><Text style={st.avatarText}>{(c.nom || 'S').slice(0, 1).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.sellerName}>{c.nom}</Text>
                <Text style={st.sellerSub}>{c.vendeur ? (c.pro ? 'Professionnel' : 'Particulier') + (c.depuis ? ' · membre depuis ' + c.depuis : '') : 'Annonce Sky Business'}</Text>
                <Text style={st.sellerSub}>{prettyPhone(c.telephone)}</Text>
              </View>
            </View>
          ) : null}

          <View style={st.safe}>
            <Icon name="shield" size={18} color={C.ok} />
            <Text style={st.safeText}>Conseil : voyez le véhicule ou le bien et vérifiez les documents avant tout paiement.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[st.bar, { paddingBottom: ins.bottom + 10 }]}>
        {l.a_moi ? (
          <Button title="Messages reçus pour cette annonce" icon="message" onPress={message} style={{ flex: 1 }} />
        ) : (
          <>
            {c ? <Pressable onPress={() => Linking.openURL(c.appel)} style={st.call} accessibilityRole="button" accessibilityLabel={'Appeler ' + c.nom}><Icon name="phone" size={22} color={C.accent} /></Pressable> : null}
            {c ? <Button title="WhatsApp" icon="whatsapp" kind="wa" onPress={() => Linking.openURL(c.lien_whatsapp)} style={{ flex: 1 }} /> : null}
            <Button title="Message" icon="message" onPress={message} loading={starting} style={{ flex: 1 }} />
          </>
        )}
      </View>

      <Modal visible={zoom !== null} onRequestClose={() => setZoom(null)} animationType="fade">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <FlatList horizontal pagingEnabled data={l.photos} initialScrollIndex={zoom ?? 0} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(u, i) => 'z' + i} renderItem={({ item }) => <Image source={{ uri: item }} style={{ width, height: '100%' }} contentFit="contain" />} />
          <View style={[st.topBar, { top: ins.top + 6, justifyContent: 'flex-end' }]}>
            <IconButton name="close" label="Fermer" onPress={() => setZoom(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  noPhoto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  counter: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(15,18,51,0.72)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  counterText: { color: C.white, fontFamily: F.bold, fontSize: 13 },
  main: { padding: 16, gap: 8, maxWidth: 700, width: '100%', alignSelf: 'center' },
  title: { fontFamily: F.display, fontSize: 24, lineHeight: 29, color: C.fg, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: F.body, fontSize: 14, color: C.muted },
  cot: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.goldSoft, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: '#f6dc8f' },
  cotIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  cotTitle: { fontFamily: F.bold, fontSize: 16, color: C.fg },
  cotText: { fontFamily: F.body, fontSize: 13, color: C.goldFg },
  h: { fontFamily: F.display, fontSize: 19, color: C.fg, marginTop: 18, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '48.5%', flexGrow: 1, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.surface, borderRadius: R.md, padding: 12 },
  cellK: { fontFamily: F.body, fontSize: 12, color: C.muted },
  cellV: { fontFamily: F.bold, fontSize: 14, color: C.fg },
  desc: { fontFamily: F.body, fontSize: 15, lineHeight: 23, color: C.fg },
  seller: { marginTop: 18, flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: R.lg, padding: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontFamily: F.display, fontSize: 20 },
  sellerName: { fontFamily: F.bold, fontSize: 16, color: C.fg },
  sellerSub: { fontFamily: F.body, fontSize: 13, color: C.muted },
  safe: { marginTop: 12, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.okSoft, borderRadius: R.md, padding: 12 },
  safeText: { flex: 1, fontFamily: F.medium, fontSize: 13, color: C.ok, lineHeight: 18 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line },
  call: { width: 52, height: 52, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
});
