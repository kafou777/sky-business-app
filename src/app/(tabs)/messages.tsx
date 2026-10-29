import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { confirm, Empty, info, Loading } from '@/components/ui';
import { ago, api, Conversation } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

export default function Messages() {
  const ins = useSafeAreaInsets();
  const { profile, setUnread } = useSession();
  const { pour } = useLocalSearchParams<{ pour?: string }>();
  const [list, setList] = useState<Conversation[] | null>(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filtre, setFiltre] = useState<number>(0);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const { data } = await api<{ conversations: Conversation[]; non_lus: number }>('/chat');
      setList(data.conversations); setUnread(data.non_lus || 0); setErr('');
    } catch (e: any) { setErr(e.message); setList((l) => l || []); }
  }, [profile, setUnread]);

  useFocusEffect(useCallback(() => {
    setFiltre(pour ? Number(pour) : 0);
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load, pour]));

  if (!profile) {
    return (
      <View style={{ flex: 1, paddingTop: ins.top, backgroundColor: C.bg }}>
        <Text style={[st.h1, { paddingHorizontal: 16, paddingTop: 12 }]}>Messages</Text>
        <Empty icon="message" title="Vos conversations" text="Connectez-vous pour écrire aux vendeurs et à Sky Business, et recevoir leurs réponses." action="Se connecter" onAction={() => router.push('/connexion')} />
      </View>
    );
  }

  const shown = (list || []).filter((c) => !filtre || c.annonce?.id === filtre);

  const remove = async (c: Conversation) => {
    if (!(await confirm('Supprimer la conversation ?', 'Elle disparaîtra de votre messagerie.', 'Supprimer', true))) return;
    try { await api('/chat/' + c.id + '/supprimer', { method: 'POST' }); load(); } catch (e: any) { info('Messagerie', e.message); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.head, { paddingTop: ins.top + 12 }]}>
        <Text style={st.h1}>Messages</Text>
        {filtre ? (
          <Pressable onPress={() => { setFiltre(0); router.setParams({ pour: '' }); }} style={st.filtre}>
            <Text style={st.filtreText} numberOfLines={1}>Pour : {shown[0]?.annonce?.titre || 'cette annonce'}</Text>
            <Icon name="close" size={14} color={C.accent} />
          </Pressable>
        ) : null}
      </View>
      {list === null ? <Loading /> : (
        <FlatList
          data={shown}
          keyExtractor={(c) => String(c.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={C.accent} colors={[C.accent]} />}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
          ListEmptyComponent={err ? <Empty icon="globe" title="Connexion impossible" text={err} action="Réessayer" onAction={load} /> : (
            <Empty icon="message" title={filtre ? 'Aucun message pour cette annonce' : 'Aucune conversation'} text={filtre ? 'Les acheteurs intéressés pourront vous écrire depuis votre annonce.' : 'Écrivez à un vendeur depuis une annonce : la conversation apparaîtra ici.'} />
          )}
          renderItem={({ item: c }) => (
            <Pressable onPress={() => router.push(`/conversation/${c.id}`)} onLongPress={() => remove(c)} style={({ pressed }) => [st.row, pressed && { backgroundColor: C.surface }]}
              accessibilityRole="button" accessibilityLabel={'Conversation avec ' + c.other + (c.non_lus ? ', ' + c.non_lus + ' non lus' : '')} accessibilityHint="Appui long pour supprimer">
              <View style={st.thumb}>
                {c.annonce?.photo ? <Image source={{ uri: c.annonce.photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name={c.piece ? 'wrench' : 'car'} size={24} color={C.faint} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[st.name, c.non_lus ? { color: C.fg } : null]} numberOfLines={1}>{c.other}</Text>
                  {c.dernier ? <Text style={st.time}>{ago(c.dernier.date)}</Text> : null}
                </View>
                <Text style={st.ann} numberOfLines={1}>{c.annonce?.titre}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[st.last, c.non_lus ? { color: C.fg, fontFamily: F.semi } : null]} numberOfLines={1}>{c.dernier ? (c.dernier.moi ? 'Vous : ' : '') + c.dernier.texte : ''}</Text>
                  {c.non_lus ? <View style={st.badge}><Text style={st.badgeText}>{c.non_lus}</Text></View> : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line, gap: 8 },
  h1: { fontFamily: F.display, fontSize: 28, color: C.fg },
  filtre: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.accentSoft, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7, maxWidth: '100%' },
  filtreText: { fontFamily: F.semi, fontSize: 13, color: C.accent, flexShrink: 1 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line, alignItems: 'center' },
  thumb: { width: 60, height: 60, borderRadius: 14, backgroundColor: C.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontFamily: F.bold, fontSize: 16, color: C.fg },
  time: { fontFamily: F.body, fontSize: 12, color: C.faint },
  ann: { fontFamily: F.medium, fontSize: 13, color: C.accent },
  last: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.muted },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: C.crit, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: C.white, fontFamily: F.bold, fontSize: 12 },
});
