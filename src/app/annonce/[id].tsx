import { useEffect, useState } from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Photo from '@/components/Photo';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Icon, { IconName } from '@/components/Icon';
import { ListingCard, PriceText } from '@/components/ListingCard';
import MapEmbed from '@/components/MapEmbed';
import { Badge, Button, Empty, IconButton, info, Loading } from '@/components/ui';
import { ago, api, Listing, money, prettyPhone, cardPhotos } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

const INTEL_ICON: Record<string, IconName> = { tag: 'tag', star: 'star', gauge: 'gauge', cal: 'calendar', leaf: 'fuel', gear: 'gear', ship: 'ship', image: 'image', shield: 'shield' };

function VerifiedBadge() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" accessibilityLabel="Vérifié">
      <Path fill="#1a73e8" d="M12 1.5l2.6 1.9 3.2-.2 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.2L12 22.5l-2.6-1.9-3.2.2-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.2z" />
      <Path d="m8 12.2 2.7 2.7L16.3 9" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

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
  const [sim, setSim] = useState<Listing[]>([]);
  const [more, setMore] = useState(false);
  const W = Math.min(width, 700);

  useEffect(() => {
    api<Listing>('/annonces/' + id).then((r) => {
      setL(r.data);
      const q = r.data.type === 'vehicule' && r.data.marque_id ? { type: 'vehicule', marque: r.data.marque_id } : { type: r.data.type, operation: r.data.operation };
      api<Listing[]>('/annonces', { query: { ...q, exclure: r.data.id, per_page: 10 } }).then((x) => setSim(x.data)).catch(() => {});
    }).catch((e) => setErr(e.message));
  }, [id, profile?.id]);

  if (err) return <View style={{ flex: 1, paddingTop: ins.top }}><Empty icon="info" title="Annonce indisponible" text={err} action="Retour" onAction={() => router.back()} /></View>;
  if (!l) return <Loading />;

  const c = l.contact;
  const fav = favs.has(l.id);
  const veh = l.type === 'vehicule';
  const pts = (!Array.isArray(l.intel) && l.intel?.points) || [];
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
              initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3} getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
              onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
              onScroll={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))} scrollEventThrottle={64}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => setZoom(index)} accessibilityLabel={'Photo ' + (index + 1) + ' sur ' + l.photos.length + ', agrandir'}>
                  <Photo uri={item} thumb={(index === 0 && cardPhotos.get(l.id)) || l.vignettes?.[index]} style={{ width: W, height: W * 0.75 }} icon={veh ? 'car' : 'building'} priority={index === 0 ? 'high' : 'normal'} />
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
        {veh && l.vendeur?.sky ? (
          <Pressable onPress={() => info('Exclusivement chez Sky Business', 'Ce véhicule est proposé directement par Sky Business. Pour le voir, l\'essayer ou réserver, contactez l\'équipe par appel, WhatsApp ou message.')}
            style={st.band} accessibilityRole="button" accessibilityLabel="Exclusivement chez Sky Business, en savoir plus">
            <Icon name="star" size={18} color={C.gold} fill={C.gold} />
            <Text style={st.bandText}>Exclusivement chez Sky Business</Text>
            <Icon name="info" size={18} color={C.white} />
          </Pressable>
        ) : null}

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

          {c ? (
            <Pressable onPress={() => (l.vendeur && l.vendeur.id ? router.push({ pathname: '/recherche', params: { type: l.type, vendeur: String(l.vendeur.id), vendeur_nom: c.nom, t: String(Date.now()) } }) : undefined)}
              style={st.seller} accessibilityRole={l.vendeur?.id ? 'button' : undefined} accessibilityLabel={'Vendeur : ' + c.nom}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={st.sellerName} numberOfLines={1}>{l.vendeur?.sky ? 'Sky Business' : c.nom}</Text>
                  {l.vendeur?.sky || c.pro ? <VerifiedBadge /> : null}
                </View>
                {l.vendeur?.annonces ? <Text style={st.sellerSub}>{money(l.vendeur.annonces)} annonce{l.vendeur.annonces > 1 ? 's' : ''} en ligne</Text> : null}
                <Text style={st.sellerSub}>{l.vendeur?.sky ? 'Annonce publiée par Sky Business' : l.vendeur?.texte ? 'Numéro indiqué par le vendeur dans l\'annonce' : (c.pro ? 'Professionnel' : 'Particulier') + (l.vendeur?.depuis ? ' · sur Sky Business depuis ' + l.vendeur.depuis : '')}</Text>
              </View>
              {l.vendeur?.sky ? (
                <View style={st.sellerLogo}><Image source={require('../../../assets/icon.png')} style={{ width: 44, height: 44 }} contentFit="contain" /></View>
              ) : (
                <View style={st.avatar}><Text style={st.avatarText}>{(c.nom || 'V').slice(0, 1).toUpperCase()}</Text></View>
              )}
            </Pressable>
          ) : null}

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

          {l.desc_ia || pts.length ? (
            <View style={st.sbi}>
              <View style={st.sbiPill}><Icon name="sparkles" size={16} color={C.white} /><Text style={st.sbiPillText}>Sky Business Intelligence</Text></View>
              {l.desc_ia ? (
                <>
                  <View style={st.sbiRow}><Text style={st.sbiH}>Description</Text><Text style={st.sbiTag}>IA générée</Text></View>
                  <Text style={st.sbiText} numberOfLines={more ? undefined : 5}>{l.desc_ia}</Text>
                  {more ? <Text style={st.sbiNote}>Texte rédigé automatiquement par une intelligence artificielle à partir des informations de l'annonce. Vérifiez les détails avec le vendeur.</Text> : null}
                  <Pressable onPress={() => setMore(!more)} hitSlop={8}><Text style={st.sbiMore}>{more ? 'Réduire' : 'En savoir plus'}</Text></Pressable>
                </>
              ) : null}
              {pts.length ? (
                <>
                  <View style={[st.sbiRow, l.desc_ia ? { marginTop: 10 } : null]}><Text style={st.sbiH}>Analyse Sky Business</Text><Text style={st.sbiTag}>Points forts</Text></View>
                  {pts.map(([ic, t, d]) => (
                    <View key={t} style={st.pt}>
                      <View style={st.ptIcon}><Icon name={INTEL_ICON[ic] || 'check'} size={18} color={C.accent} /></View>
                      <View style={{ flex: 1 }}><Text style={st.ptT}>{t}</Text><Text style={st.ptD}>{d}</Text></View>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          ) : null}

          {l.carte ? (
            <>
              <Text style={st.h}>Emplacement</Text>
              <MapEmbed url={l.carte.embed} />
              <View style={st.mapFoot}>
                <View style={{ flex: 1 }}><Text style={st.cellV}>{l.carte.lieu}</Text><Text style={st.cellK}>Emplacement approximatif</Text></View>
                <Pressable onPress={() => Linking.openURL(l.carte!.lien)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={st.mapLink}>Ouvrir dans Google Maps</Text><Icon name="external" size={15} color={C.accent} /></Pressable>
              </View>
            </>
          ) : null}

          <View style={st.safe}>
            <Icon name="shield" size={18} color={C.ok} />
            <Text style={st.safeText}>Conseil : voyez le véhicule ou le bien et vérifiez les documents avant tout paiement.</Text>
          </View>
        </View>
        {sim.length ? (
          <View style={{ marginTop: 6 }}>
            <Text style={[st.h, { paddingHorizontal: 16, marginTop: 8, marginBottom: 12 }]}>{veh && l.marque ? 'Autres ' + l.marque : 'Annonces similaires'}</Text>
            <FlatList horizontal data={sim} keyExtractor={(x) => 's' + x.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => <ListingCard l={item} width={230} low />} />
          </View>
        ) : null}
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
          <FlatList horizontal pagingEnabled data={l.grandes?.length === l.photos.length ? l.grandes : l.photos} initialScrollIndex={zoom ?? 0} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3}
            keyExtractor={(u, i) => 'z' + i} renderItem={({ item, index }) => <Photo uri={item} thumb={l.photos[index]} style={{ width, height: '100%', backgroundColor: '#000' }} fit="contain" />} />
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
  seller: { marginTop: 14, flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1.5, borderColor: C.line, borderRadius: R.lg, padding: 16, backgroundColor: C.white },
  sellerLogo: { width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderColor: '#f1d27a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffaf0' },
  band: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.accent, paddingVertical: 11, paddingHorizontal: 16 },
  bandText: { fontFamily: F.bold, fontSize: 16, color: C.white },
  sbi: { marginTop: 18, borderRadius: R.lg, padding: 16, paddingTop: 22, backgroundColor: '#f6f4ff', borderWidth: 1, borderColor: '#e2dcff', gap: 6 },
  sbiPill: { position: 'absolute', top: -13, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#5b3fd6', borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 5 },
  sbiPillText: { color: C.white, fontFamily: F.bold, fontSize: 12.5 },
  sbiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sbiH: { fontFamily: F.display, fontSize: 18, color: C.fg },
  sbiTag: { fontFamily: F.semi, fontSize: 12, color: '#5b3fd6' },
  sbiText: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.fg },
  sbiNote: { fontFamily: F.body, fontSize: 12, lineHeight: 17, color: C.muted, fontStyle: 'italic' },
  sbiMore: { fontFamily: F.bold, fontSize: 14, color: '#5b3fd6', marginTop: 2 },
  pt: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: C.white, borderRadius: R.md, padding: 12, marginTop: 6 },
  ptIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  ptT: { fontFamily: F.bold, fontSize: 15, color: C.fg },
  ptD: { fontFamily: F.body, fontSize: 13.5, lineHeight: 19, color: C.muted },
  mapFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  mapLink: { fontFamily: F.bold, fontSize: 13.5, color: C.accent },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontFamily: F.display, fontSize: 20 },
  sellerName: { fontFamily: F.display, fontSize: 19, color: C.fg, flexShrink: 1 },
  sellerSub: { fontFamily: F.body, fontSize: 14.5, color: C.muted },
  safe: { marginTop: 12, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.okSoft, borderRadius: R.md, padding: 12 },
  safeText: { flex: 1, fontFamily: F.medium, fontSize: 13, color: C.ok, lineHeight: 18 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line },
  call: { width: 52, height: 52, borderRadius: R.md, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
});
