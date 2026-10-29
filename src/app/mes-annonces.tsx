import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ListingRow } from '@/components/ListingCard';
import { Badge, Button, confirm, Empty, Header, IconButton, info, Loading } from '@/components/ui';
import { api, Listing } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C } from '@/lib/theme';

export default function MesAnnonces() {
  const { profile } = useSession();
  const [list, setList] = useState<Listing[] | null>(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await api<Listing[]>('/app/mes-annonces'); setList(data); setErr(''); }
    catch (e: any) { setErr(e.message); setList((l) => l || []); }
  }, []);
  useFocusEffect(useCallback(() => { if (profile) load(); }, [load, profile]));

  if (!profile) return <View style={{ flex: 1 }}><Header title="Mes annonces" /><Empty icon="lock" title="Connexion nécessaire" action="Se connecter" onAction={() => router.push('/connexion')} /></View>;

  const sold = async (l: Listing) => {
    const loc = l.rubrique === 'location';
    if (!(await confirm(l.vendu ? 'Remettre en vente ?' : loc ? 'Marquer comme loué ?' : 'Marquer comme vendu ?', l.vendu ? 'L\'annonce redeviendra disponible.' : 'L\'annonce restera visible avec la mention « ' + (loc ? 'Loué' : 'Vendu') + ' ».'))) return;
    try { await api('/app/annonces/' + l.id + '/vendu', { body: { vendu: !l.vendu } }); load(); } catch (e: any) { info('Mes annonces', e.message); }
  };
  const del = async (l: Listing) => {
    if (!(await confirm('Supprimer l\'annonce ?', '« ' + l.titre + ' » sera retirée du site et de l\'application.', 'Supprimer', true))) return;
    try { await api('/app/annonces/' + l.id + '/supprimer', { method: 'POST' }); setList((o) => (o || []).filter((x) => x.id !== l.id)); } catch (e: any) { info('Mes annonces', e.message); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Mes annonces" sub={list ? list.length + ' annonce' + (list.length > 1 ? 's' : '') : undefined} />
      {list === null ? <Loading /> : (
        <FlatList data={list} keyExtractor={(l) => String(l.id)} contentContainerStyle={{ paddingTop: 14, paddingBottom: 30, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} colors={[C.accent]} tintColor={C.accent} />}
          ListEmptyComponent={err ? <Empty icon="globe" title="Connexion impossible" text={err} action="Réessayer" onAction={load} /> : <Empty icon="car" title="Aucune annonce" text="Publiez votre premier véhicule : c'est gratuit." action="Publier une annonce" onAction={() => router.push('/vendre')} />}
          renderItem={({ item: l }) => (
            <ListingRow l={l} extra={
              <View style={{ gap: 10, marginTop: 8 }}>
                <Badge label={l.statut_label || ''} kind={l.vendu ? 'crit' : l.statut === 'publish' ? 'ok' : 'warn'} />
                {l.statut === 'pending' ? <Text style={st.note}>Sky Business vérifie votre annonce avant sa mise en ligne.</Text> : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {l.statut === 'publish' ? <Button small kind="secondary" title={l.vendu ? 'Remettre en vente' : l.rubrique === 'location' ? 'Marquer loué' : 'Marquer vendu'} onPress={() => sold(l)} style={{ flex: 1 }} /> : null}
                  {l.statut === 'publish' ? <Button small kind="secondary" icon="message" title="Messages" onPress={() => router.push({ pathname: '/messages', params: { pour: String(l.id) } })} style={{ flex: 1 }} /> : null}
                  <IconButton name="trash" label="Supprimer l'annonce" color={C.crit} bg={C.critSoft} onPress={() => del(l)} />
                </View>
              </View>
            } />
          )} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  note: { fontSize: 13, color: C.warn },
});
