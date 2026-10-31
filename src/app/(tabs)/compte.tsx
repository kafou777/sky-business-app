import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from '@/components/Icon';
import { Button, confirm } from '@/components/ui';
import { Avatar, BadgeIcon } from '@/components/Seller';
import { getConfig, intl, prettyPhone, siteUrl } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

function Item({ icon, label, sub, onPress, color = C.fg, badge }: { icon: IconName; label: string; sub?: string; onPress: () => void; color?: string; badge?: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.item, pressed && { backgroundColor: C.surface }]} accessibilityRole="button" accessibilityLabel={label}>
      <View style={st.itemIcon}><Icon name={icon} size={20} color={color === C.fg ? C.accent : color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[st.itemText, { color }]}>{label}</Text>
        {sub ? <Text style={st.itemSub}>{sub}</Text> : null}
      </View>
      {badge ? <View style={st.badge}><Text style={st.badgeText}>{badge}</Text></View> : null}
      <Icon name="next" size={18} color={C.faint} />
    </Pressable>
  );
}

export default function Compte() {
  const ins = useSafeAreaInsets();
  const { profile, logout, unread, favs } = useSession();
  const cfg = getConfig();
  const version = Constants.expoConfig?.version || '1.0.0';
  const vs = profile?.verification?.statut;
  // Professionnel pas (ou plus) vérifié : bannière « Obtenez le badge » (comme dubizzle), et une fenêtre une seule fois.
  const promo = !!profile && !profile.administrateur && (vs === 'possible' || vs === 'expire' || vs === 'refusee');
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    if (!promo || !profile) return;
    const k = 'sky_verif_popup_' + profile.id;
    AsyncStorage.getItem(k).then((v) => { if (!v) { setSheet(true); AsyncStorage.setItem(k, '1').catch(() => {}); } }).catch(() => {});
  }, [promo, profile]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: ins.top + 12, paddingBottom: 40 }}>
      <Text style={[st.h1, { paddingHorizontal: 16 }]}>Compte</Text>

      {profile ? (
        <View style={st.hero}>
          <Pressable onPress={() => router.push('/profil')} accessibilityRole="button" accessibilityLabel="Changer ma photo de profil"><Avatar uri={profile.photo} name={profile.nom} /></Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[st.name, { flexShrink: 1 }]} numberOfLines={1}>{profile.entreprise || profile.nom}</Text>
              {vs === 'verifie' ? <BadgeIcon size={18} /> : null}
            </View>
            <Text style={st.sub} numberOfLines={1}>{profile.email}</Text>
            {profile.telephone ? <Text style={st.sub}>{prettyPhone(profile.telephone)}</Text> : null}
          </View>
          {profile.administrateur ? <View style={st.admin}><Text style={st.adminText}>Admin</Text></View> : null}
        </View>
      ) : (
        <View style={[st.hero, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <Text style={st.name}>Bienvenue sur Sky Business</Text>
          <Text style={st.sub}>Connectez-vous pour publier, écrire aux vendeurs et garder vos favoris.</Text>
          <Button title="Se connecter ou créer un compte" onPress={() => router.push('/connexion')} style={{ marginTop: 12 }} />
        </View>
      )}

      {promo ? (
        <Pressable onPress={() => setSheet(true)} style={st.promo} accessibilityRole="button" accessibilityLabel="Obtenez le badge vérifié">
          <BadgeIcon size={40} />
          <View style={{ flex: 1 }}>
            <Text style={st.promoT}>{vs === 'expire' ? 'Renouvelez votre badge vérifié' : 'Obtenez le badge vérifié'}</Text>
            <Text style={st.promoP}>Plus de visibilité{'\n'}Plus de confiance de vos clients</Text>
          </View>
          <Icon name="next" size={22} color={C.fg} />
        </Pressable>
      ) : vs === 'attente' ? (
        <Pressable onPress={() => router.push('/verification')} style={[st.promo, { backgroundColor: C.warnSoft }]} accessibilityRole="button">
          <Icon name="clock" size={28} color={C.warn} />
          <View style={{ flex: 1 }}><Text style={st.promoT}>Badge vérifié : demande en cours</Text><Text style={st.promoP}>L'équipe Sky Business examine votre dossier.</Text></View>
        </Pressable>
      ) : null}

      {profile ? (
        <View style={st.group}>
          {vs === 'verifie' ? <Item icon="star" label="Mon profil public et mes avis" sub={profile.verification?.jusqu_affiche ? 'Badge vérifié jusqu\'au ' + profile.verification.jusqu_affiche : undefined} onPress={() => router.push(`/vendeur/${profile.id}`)} /> : null}
          <Item icon="list" label="Mes annonces" sub="En ligne, en attente, vendues" onPress={() => router.push('/mes-annonces')} />
          <Item icon="heart" label="Mes favoris" onPress={() => router.push('/favoris')} badge={favs.size || undefined} />
          <Item icon="message" label="Messages" onPress={() => router.push('/messages')} badge={unread || undefined} />
           <Item icon="edit" label="Mon profil" sub="Photo, nom, téléphone, WhatsApp, mot de passe" onPress={() => router.push('/profil')} />
        </View>
      ) : null}

      <View style={st.group}>
        <Item icon="wrench" label="Commander une pièce détachée" onPress={() => router.push('/pieces')} />
        {profile?.administrateur ? <Item icon="gear" label="Administration du site" sub="Tableau de bord Sky Business" onPress={() => WebBrowser.openBrowserAsync(siteUrl('/wp-admin/admin.php?page=sky-tableau'))} /> : null}
      </View>

      {cfg ? (
        <View style={st.group}>
          <Item icon="phone" label="Appeler Sky Business" sub={prettyPhone(cfg.contact.telephone)} onPress={() => Linking.openURL('tel:+' + intl(cfg.contact.telephone))} />
          <Item icon="whatsapp" label="WhatsApp Sky Business" sub={prettyPhone(cfg.contact.whatsapp)} color={C.wa} onPress={() => Linking.openURL('https://wa.me/' + intl(cfg.contact.whatsapp))} />
          <Item icon="mail" label="Écrire un e-mail" sub={cfg.contact.email} onPress={() => Linking.openURL('mailto:' + cfg.contact.email)} />
          <Item icon="globe" label="Site internet" sub={cfg.site.replace(/^https?:\/\//, '').replace(/\/$/, '')} onPress={() => WebBrowser.openBrowserAsync(cfg.site)} />
          {cfg.confidentialite ? <Item icon="shield" label="Politique de confidentialité" onPress={() => WebBrowser.openBrowserAsync(cfg.confidentialite)} /> : null}
        </View>
      ) : null}

      {profile ? (
        <View style={st.group}>
          <Item icon="logout" label="Se déconnecter" onPress={async () => { if (await confirm('Se déconnecter ?', 'Vous pourrez vous reconnecter à tout moment.', 'Se déconnecter')) logout(); }} />
          {!profile.administrateur ? <Item icon="trash" label="Supprimer mon compte" color={C.crit} onPress={() => router.push('/supprimer-compte')} /> : null}
        </View>
      ) : null}

      <Text style={st.version}>Sky Business · version {version}</Text>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={st.sheetBack} onPress={() => setSheet(false)}>
          <Pressable style={[st.sheet, { paddingBottom: ins.bottom + 18 }]} onPress={() => {}}>
            <Text style={st.sheetH}>Faites vérifier votre entreprise sur Sky Business !</Text>
            <View style={st.sheetArt}><BadgeIcon size={86} /></View>
            <Text style={st.sheetP}>Badge bleu sur toutes vos annonces, avis de vos clients et plus de confiance des acheteurs. Une demande en quelques minutes.</Text>
            <Pressable onPress={() => { setSheet(false); router.push('/verification'); }}><Text style={st.sheetLink}>En savoir plus sur la vérification</Text></Pressable>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <Button title="Plus tard" kind="secondary" onPress={() => setSheet(false)} style={{ flex: 1 }} />
              <Button title="Me faire vérifier" onPress={() => { setSheet(false); router.push('/verification'); }} style={{ flex: 1.3 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 28, color: C.fg },
  hero: { margin: 16, padding: 16, borderRadius: R.xl, backgroundColor: C.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontFamily: F.display, fontSize: 24 },
  name: { fontFamily: F.display, fontSize: 19, color: C.fg },
  sub: { fontFamily: F.body, fontSize: 14, color: C.muted, lineHeight: 20 },
  admin: { backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  adminText: { fontFamily: F.bold, fontSize: 12, color: '#1b1400' },
  group: { marginHorizontal: 16, marginBottom: 14, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, overflow: 'hidden', backgroundColor: C.white },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.line },
  itemIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontFamily: F.semi, fontSize: 15.5 },
  itemSub: { fontFamily: F.body, fontSize: 13, color: C.muted },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.crit, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: C.white, fontFamily: F.bold, fontSize: 12 },
  promo: { marginHorizontal: 16, marginBottom: 14, padding: 16, borderRadius: R.lg, backgroundColor: '#e9f1ff', flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#0f1233', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  promoT: { fontFamily: F.display, fontSize: 17, color: C.fg },
  promoP: { fontFamily: F.body, fontSize: 14, color: C.muted, lineHeight: 20 },
  sheetBack: { flex: 1, backgroundColor: 'rgba(15,18,51,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  sheetH: { fontFamily: F.display, fontSize: 22, color: C.fg, textAlign: 'center' },
  sheetArt: { alignSelf: 'center', width: 150, height: 150, borderRadius: 75, backgroundColor: '#eef4ff', alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  sheetP: { fontFamily: F.body, fontSize: 15.5, color: C.fg, textAlign: 'center', lineHeight: 22 },
  sheetLink: { fontFamily: F.bold, fontSize: 15, color: C.accent, textAlign: 'center', textDecorationLine: 'underline' },
  version: { textAlign: 'center', fontFamily: F.body, fontSize: 12, color: C.faint, marginTop: 6 },
});
