import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Field, Header, Notice } from '@/components/ui';
import { api, setToken } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F } from '@/lib/theme';

export default function SupprimerCompte() {
  const { profile, logout } = useSession();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const go = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api<{ message: string }>('/app/compte/supprimer', { body: { mot_de_passe: pw } });
      setDone(r.data.message);
      await setToken(null);
      await logout();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Header title="Supprimer mon compte" />
      <View style={{ padding: 16, gap: 16 }}>
        {done ? (
          <>
            <Notice text={done} kind="ok" />
            <Button title="Retour à l'accueil" onPress={() => router.replace('/')} />
          </>
        ) : profile ? (
          <Card>
            <Text style={st.h2}>Cette action est définitive</Text>
            <Text style={st.p}>• Votre compte est supprimé du site et de l'application.</Text>
            <Text style={st.p}>• Toutes vos annonces et leurs photos sont supprimées.</Text>
            <Text style={st.p}>• Vos demandes déjà envoyées à Sky Business (pièces, cotations) restent dans ses dossiers pour leur suivi.</Text>
            {err ? <Notice text={err} kind="err" /> : null}
            <Field label="Confirmez avec votre mot de passe" value={pw} onChangeText={setPw} secure autoComplete="current-password" />
            <Button title="Supprimer définitivement mon compte" kind="danger" icon="trash" onPress={go} loading={busy} disabled={!pw} />
          </Card>
        ) : <Notice text="Vous n'êtes pas connecté." />}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  h2: { fontFamily: F.display, fontSize: 19, color: C.crit },
  p: { fontFamily: F.body, fontSize: 15, color: C.fg, lineHeight: 22 },
});
