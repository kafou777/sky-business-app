import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ListingRow } from '@/components/ListingCard';
import { Empty, Header, Loading } from '@/components/ui';
import { api, Listing } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C } from '@/lib/theme';

export default function Favoris() {
  const { profile, favs } = useSession();
  const [list, setList] = useState<Listing[] | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const ids = Array.from(favs);
    if (!ids.length) { setList([]); return; }
    try { const { data } = await api<Listing[]>('/annonces', { query: { type: 'tous', ids: ids.join(','), inclure_vendus: 1 } }); setList(data); setErr(''); }
    catch (e: any) { setErr(e.message); setList((l) => l || []); }
  }, [favs]);
  useFocusEffect(useCallback(() => { if (profile) load(); }, [load, profile]));

  if (!profile) return <View style={{ flex: 1 }}><Header title="Mes favoris" /><Empty icon="heart" title="Vos coups de cœur" text="Connectez-vous pour garder vos annonces préférées sur le site et dans l'application." action="Se connecter" onAction={() => router.push('/connexion')} /></View>;
  const shown = (list || []).filter((l) => favs.has(l.id));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Mes favoris" sub={shown.length ? shown.length + ' annonce' + (shown.length > 1 ? 's' : '') : undefined} />
      {list === null ? <Loading /> : (
        <FlatList data={shown} keyExtractor={(l) => String(l.id)} contentContainerStyle={{ paddingTop: 14, paddingBottom: 30, flexGrow: 1 }}
          renderItem={({ item }) => <ListingRow l={item} />}
          ListEmptyComponent={err ? <Empty icon="globe" title="Connexion impossible" text={err} action="Réessayer" onAction={load} /> : <Empty icon="heart" title="Aucun favori" text="Touchez le cœur d'une annonce pour la retrouver ici." action="Parcourir les annonces" onAction={() => router.push('/recherche')} />} />
      )}
    </View>
  );
}
