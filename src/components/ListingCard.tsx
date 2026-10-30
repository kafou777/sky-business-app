import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Icon from './Icon';
import Photo from './Photo';
import { Listing, money } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

export function specs(l: Listing) {
  if (l.type === 'immobilier') return [l.type_de_bien, l.operation === 'location' ? 'À louer' : 'À vendre'].filter(Boolean).join(' · ');
  return [l.annee, l.kilometrage != null && l.rubrique !== 'location' ? (money(l.kilometrage) || '0') + ' km' : null, l.transmission, l.carburant].filter(Boolean).join(' · ');
}

export function PriceText({ l, size = 17 }: { l: Listing; size?: number }) {
  return (
    <Text style={[st.price, { fontSize: size }]} numberOfLines={1}>
      {l.prix ? money(l.prix) : 'Prix sur demande'}
      {l.prix ? <Text style={st.cur}> FCFA{l.periode ? ' / ' + l.periode : l.rubrique === 'import' ? ' HT' : ''}</Text> : null}
    </Text>
  );
}

function Fav({ id }: { id: number }) {
  const { profile, favs, toggleFav } = useSession();
  const on = favs.has(id);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={on ? 'Retirer des favoris' : 'Ajouter aux favoris'} hitSlop={10}
      onPress={() => (profile ? toggleFav(id).catch(() => {}) : router.push('/connexion'))} style={st.fav}>
      <Icon name="heart" size={19} color={on ? C.crit : C.fg} fill={on ? C.crit : 'rgba(255,255,255,0.0)'} />
    </Pressable>
  );
}

/** Carte verticale (carrousels de l'accueil). */
export function ListingCard({ l, width = 250 }: { l: Listing; width?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={l.titre + ', ' + (l.prix ? money(l.prix) + ' francs CFA' : 'prix sur demande')}
      onPress={() => router.push(`/annonce/${l.id}`)} style={({ pressed }) => [st.card, { width }, pressed && { opacity: 0.9 }]}>
      <View style={[st.photo, { height: width * 0.66 }]}>
        <Photo uri={l.photos[0]} style={StyleSheet.absoluteFill} icon={l.type === 'immobilier' ? 'building' : 'car'} recyclingKey={String(l.id)} />
        <Badges l={l} />
        <Fav id={l.id} />
      </View>
      <View style={st.body}>
        <PriceText l={l} />
        <Text style={st.title} numberOfLines={1}>{l.titre}</Text>
        <Text style={st.meta} numberOfLines={1}>{specs(l)}</Text>
        {l.lieu ? <View style={st.row}><Icon name="pin" size={13} color={C.muted} /><Text style={st.meta} numberOfLines={1}>{l.lieu}</Text></View> : null}
      </View>
    </Pressable>
  );
}

/** Carte pleine largeur (résultats de recherche, favoris). */
export function ListingRow({ l, extra }: { l: Listing; extra?: React.ReactNode }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={l.titre} onPress={() => router.push(`/annonce/${l.id}`)}
      style={({ pressed }) => [st.rowCard, pressed && { opacity: 0.92 }]}>
      <View style={st.rowPhoto}>
        <Photo uri={l.photos[0]} style={StyleSheet.absoluteFill} icon={l.type === 'immobilier' ? 'building' : 'car'} recyclingKey={String(l.id)} />
        <Badges l={l} />
        <Fav id={l.id} />
        {l.nb_photos > 1 ? <View style={st.count}><Icon name="camera" size={13} color={C.white} /><Text style={st.countText}>{l.nb_photos}</Text></View> : null}
      </View>
      <View style={[st.body, { paddingBottom: 14 }]}>
        <PriceText l={l} size={19} />
        <Text style={[st.title, { fontSize: 16 }]} numberOfLines={2}>{l.titre}</Text>
        <Text style={st.meta} numberOfLines={1}>{specs(l)}</Text>
        {l.lieu ? <View style={st.row}><Icon name="pin" size={13} color={C.muted} /><Text style={st.meta} numberOfLines={1}>{l.lieu}</Text></View> : null}
        {extra}
      </View>
    </Pressable>
  );
}

function Badges({ l }: { l: Listing }) {
  return (
    <View style={st.badges}>
      {l.vendu ? <Text style={[st.badge, { backgroundColor: C.crit, color: C.white }]}>{l.rubrique === 'location' ? 'LOUÉ' : 'VENDU'}</Text> : null}
      {l.vip ? <Text style={[st.badge, { backgroundColor: C.gold, color: '#1b1400' }]}>★ À LA UNE</Text> : null}
      {l.rubrique === 'import' ? <Text style={[st.badge, { backgroundColor: C.white, color: C.accent }]}>IMPORT{l.provenance ? ' · ' + l.provenance.split(' (')[0].toUpperCase() : ''}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  photo: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 12, gap: 3 },
  price: { fontFamily: F.display, color: C.accent },
  cur: { fontFamily: F.semi, fontSize: 12, color: C.muted },
  title: { fontFamily: F.bold, fontSize: 15, color: C.fg },
  meta: { fontFamily: F.body, fontSize: 13, color: C.muted, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badges: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6, flexWrap: 'wrap', right: 52 },
  badge: { fontFamily: F.bold, fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, overflow: 'hidden' },
  fav: { position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  rowCard: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: 'hidden', marginHorizontal: 16, marginBottom: 14 },
  rowPhoto: { height: 210, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15,18,51,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  countText: { color: C.white, fontFamily: F.bold, fontSize: 12 },
});
