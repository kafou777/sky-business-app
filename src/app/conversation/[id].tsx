import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/Icon';
import { confirm, Empty, Header, IconButton, info, Loading } from '@/components/ui';
import { api, Conversation, getConfig, hhmm, Message } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

type Thread = { conversation: Conversation; messages: Message[]; ia_ecrit: boolean; supprimes: number[] };

const QUICK_VEH = ['Bonjour, le véhicule est-il toujours disponible ?', 'Le prix est-il négociable ?', 'Où peut-on voir le véhicule ?'];

function dayLabel(iso: string) {
  const d = new Date(iso); const now = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const y = new Date(); y.setDate(now.getDate() - 1);
  if (same(d, now)) return 'Aujourd\'hui';
  if (same(d, y)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ins = useSafeAreaInsets();
  const { profile, setUnread } = useSession();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const last = useRef(0);
  const busy = useRef(false);
  const list = useRef<FlatList<Message>>(null);

  const poll = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const { data } = await api<Thread>('/chat/' + id, { query: { after: last.current } });
      setConv(data.conversation);
      setTyping(!!data.ia_ecrit);
      setMsgs((old) => {
        let next = old.filter((m) => !data.supprimes?.includes(m.id));
        const add = data.messages.filter((m) => !next.some((o) => o.id === m.id));
        if (add.length) next = [...next, ...add];
        return next;
      });
      if (data.messages.length) last.current = data.messages[data.messages.length - 1].id;
      setErr('');
    } catch (e: any) {
      if (!last.current) setErr(e.message);
    } finally { busy.current = false; }
  }, [id]);

  useEffect(() => {
    if (!profile) return;
    poll().then(() => api<{ non_lus: number }>('/chat/unread').then((r) => setUnread(r.data.non_lus)).catch(() => {}));
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, [poll, profile, setUnread]);

  // L'assistant écrit : on regarde plus souvent.
  useEffect(() => {
    if (!typing) return;
    const t = setInterval(poll, 1500);
    return () => clearInterval(t);
  }, [typing, poll]);

  if (!profile) return <View style={{ flex: 1, paddingTop: ins.top }}><Empty icon="lock" title="Connexion nécessaire" action="Se connecter" onAction={() => router.replace('/connexion')} /></View>;
  if (err) return <View style={{ flex: 1 }}><Header title="Conversation" /><Empty icon="info" title="Conversation indisponible" text={err} /></View>;
  if (!conv) return <View style={{ flex: 1 }}><Header title="Conversation" /><Loading /></View>;

  const send = async (body?: string) => {
    const t = (body ?? text).trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await api('/chat/' + id, { body: { message: t } });
      setText('');
      await poll();
      if (conv.role === 'buyer' && getConfig()?.assistant_ia) {
        api('/chat/' + id + '/assistant', { method: 'POST', timeout: 90000 }).then(poll).catch(() => {});
        setTimeout(poll, 1200);
      }
    } catch (e: any) { info('Message non envoyé', e.message); }
    finally { setSending(false); }
  };

  const del = async (m: Message) => {
    setSel(null);
    if (!(await confirm('Supprimer ce message ?', 'Il sera retiré pour les deux personnes.', 'Supprimer', true))) return;
    try { await api('/chat/' + id + '/supprimer-message', { body: { message: m.id } }); setMsgs((o) => o.filter((x) => x.id !== m.id)); }
    catch (e: any) { info('Messagerie', e.message); }
  };

  const signaler = async () => {
    if (!(await confirm('Signaler cette conversation ?', 'Sky Business vérifiera les messages (arnaque, propos déplacés…).', 'Signaler', true))) return;
    try { await api('/chat/' + id + '/signaler', { body: { motif: 'Signalé depuis l\'application' } }); info('Merci', 'La conversation a été signalée à Sky Business.'); }
    catch (e: any) { info('Messagerie', e.message); }
  };

  const items = msgs;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={conv.other} sub={conv.annonce?.titre} right={<IconButton name="flag" label="Signaler la conversation" onPress={signaler} color={C.muted} />} />
      {conv.annonce && conv.annonce.lien && !conv.piece ? (
        <Pressable onPress={() => router.push(`/annonce/${conv.annonce!.id}`)} style={st.ann} accessibilityRole="button" accessibilityLabel={'Voir l\'annonce ' + conv.annonce.titre}>
          <View style={st.annPhoto}>{conv.annonce.photo ? <Image source={{ uri: conv.annonce.photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
          <View style={{ flex: 1 }}>
            <Text style={st.annTitle} numberOfLines={1}>{conv.annonce.titre}</Text>
            {conv.annonce.prix ? <Text style={st.annPrice}>{conv.annonce.prix}</Text> : null}
          </View>
          <Icon name="next" size={18} color={C.muted} />
        </Pressable>
      ) : null}

      <FlatList
        ref={list}
        data={items}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 14, gap: 6, flexGrow: 1, justifyContent: items.length ? 'flex-end' : 'center' }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={st.hint}>Écrivez votre premier message ci-dessous.</Text>}
        renderItem={({ item: m, index }) => {
          const prev = items[index - 1];
          const newDay = !prev || new Date(prev.date).toDateString() !== new Date(m.date).toDateString();
          return (
            <View>
              {newDay ? <Text style={st.day}>{dayLabel(m.date)}</Text> : null}
              <Pressable onLongPress={() => (m.moi || profile.administrateur ? del(m) : null)} onPress={() => setSel(sel === m.id ? null : m.id)}
                style={[st.bubble, m.moi ? st.me : st.them, m.ia && st.ia]} accessibilityHint={m.moi ? 'Appui long pour supprimer' : undefined}>
                {m.ia ? <Text style={st.iaLabel}>✦ Assistant IA Sky Business</Text> : null}
                <Text style={[st.text, m.moi && !m.ia && { color: C.white }]} selectable>{m.texte}</Text>
                <Text style={[st.time, m.moi && !m.ia && { color: '#c9ccff' }]}>{hhmm(m.date)}</Text>
              </Pressable>
              {sel === m.id && (m.moi || profile.administrateur) ? (
                <Pressable onPress={() => del(m)} style={[st.delBtn, m.moi ? { alignSelf: 'flex-end' } : null]}><Icon name="trash" size={14} color={C.crit} /><Text style={st.delText}>Supprimer</Text></Pressable>
              ) : null}
            </View>
          );
        }}
        ListFooterComponent={typing ? <View style={[st.bubble, st.them, st.ia, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}><ActivityIndicator size="small" color={C.accent} /><Text style={st.iaLabel}>L'assistant écrit…</Text></View> : undefined}
      />

      {conv.repondre ? (
        <View style={[st.compose, { paddingBottom: ins.bottom + 8 }]}>
          {!items.length && conv.role === 'buyer' ? (
            <View style={st.quick}>
              {QUICK_VEH.map((q) => <Pressable key={q} onPress={() => setText(q)} style={st.q}><Text style={st.qText}>{q}</Text></Pressable>)}
            </View>
          ) : null}
          <View style={st.inputRow}>
            <TextInput value={text} onChangeText={setText} placeholder="Votre message…" placeholderTextColor={C.faint} multiline maxLength={1000} style={st.input} accessibilityLabel="Votre message" />
            <Pressable onPress={() => send()} disabled={!text.trim() || sending} style={[st.send, (!text.trim() || sending) && { opacity: 0.4 }]} accessibilityRole="button" accessibilityLabel="Envoyer">
              {sending ? <ActivityIndicator color={C.white} /> : <Icon name="send" size={20} color={C.white} />}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[st.compose, { paddingBottom: ins.bottom + 10, gap: 8 }]}>
          <Text style={st.hint}>Ce client n'a pas de compte : répondez-lui par WhatsApp.</Text>
          {conv.whatsapp ? <Pressable onPress={() => Linking.openURL(conv.whatsapp)} style={[st.send, { width: undefined, flexDirection: 'row', gap: 8, paddingHorizontal: 18, backgroundColor: C.wa, alignSelf: 'center' }]}><Icon name="whatsapp" size={18} color={C.white} /><Text style={{ color: C.white, fontFamily: F.bold }}>Répondre sur WhatsApp</Text></Pressable> : null}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  ann: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.surface },
  annPhoto: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.surface2, overflow: 'hidden' },
  annTitle: { fontFamily: F.bold, fontSize: 14, color: C.fg },
  annPrice: { fontFamily: F.semi, fontSize: 13, color: C.accent },
  day: { alignSelf: 'center', fontFamily: F.semi, fontSize: 12, color: C.muted, backgroundColor: C.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginVertical: 8, overflow: 'hidden' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, gap: 2 },
  me: { alignSelf: 'flex-end', backgroundColor: C.accent, borderBottomRightRadius: 6 },
  them: { alignSelf: 'flex-start', backgroundColor: C.surface, borderBottomLeftRadius: 6 },
  ia: { backgroundColor: '#eef0ff', borderWidth: 1, borderColor: '#d5d9ff' },
  iaLabel: { fontFamily: F.bold, fontSize: 12, color: C.accent },
  text: { fontFamily: F.body, fontSize: 15.5, lineHeight: 21, color: '#1e1b4b' },
  time: { fontFamily: F.body, fontSize: 11, color: C.faint, alignSelf: 'flex-end' },
  delBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  delText: { fontFamily: F.semi, fontSize: 13, color: C.crit },
  hint: { textAlign: 'center', fontFamily: F.body, fontSize: 14, color: C.muted, padding: 10 },
  compose: { borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 12, paddingTop: 8, backgroundColor: C.white },
  quick: { gap: 6, marginBottom: 8 },
  q: { borderWidth: 1, borderColor: '#c9d0ec', borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  qText: { fontFamily: F.medium, fontSize: 14, color: C.accent },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 46, maxHeight: 130, borderRadius: 23, backgroundColor: C.surface, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: F.body, fontSize: 16, color: C.fg, outlineStyle: 'none' as any },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
});
