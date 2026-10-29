import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from '@/components/Icon';
import { Button, confirm } from '@/components/ui';
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: ins.top + 12, paddingBottom: 40 }}>
      <Text style={[st.h1, { paddingHorizontal: 16 }]}>Compte</Text>

      {profile ? (
        <View style={st.hero}>
          <View style={st.avatar}><Text style={st.avatarText}>{profile.nom.slice(0, 1).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={st.name} numberOfLines={1}>{profile.entreprise || profile.nom}</Text>
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

      {profile ? (
        <View style={st.group}>
          <Item icon="list" label="Mes annonces" sub="En ligne, en attente, vendues" onPress={() => router.push('/mes-annonces')} />
          <Item icon="heart" label="Mes favoris" onPress={() => router.push('/favoris')} badge={favs.size || undefined} />
          <Item icon="message" label="Messages" onPress={() => router.push('/messages')} badge={unread || undefined} />
          <Item icon="edit" label="Mon profil" sub="Nom, téléphone, WhatsApp, mot de passe" onPress={() => router.push('/profil')} />
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
  version: { textAlign: 'center', fontFamily: F.body, fontSize: 12, color: C.faint, marginTop: 6 },
});
