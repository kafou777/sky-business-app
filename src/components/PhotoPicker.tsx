import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import Icon from './Icon';
import { info } from './ui';
import { C, F, R } from '@/lib/theme';

export type Photo = { uri: string; name: string; type: string };

/** Réduit la photo (1600 px, JPEG) : envoi plus rapide sur les réseaux mobiles. */
async function shrink(a: ImagePicker.ImagePickerAsset, i: number): Promise<Photo> {
  try {
    const ctx = ImageManipulator.manipulate(a.uri);
    const big = Math.max(a.width || 0, a.height || 0);
    if (big > 1600) ctx.resize(a.width >= a.height ? { width: 1600 } : { height: 1600 });
    const img = await ctx.renderAsync();
    const r = await img.saveAsync({ compress: 0.72, format: SaveFormat.JPEG });
    return { uri: r.uri, name: `photo-${Date.now()}-${i}.jpg`, type: 'image/jpeg' };
  } catch {
    return { uri: a.uri, name: a.fileName || `photo-${Date.now()}-${i}.jpg`, type: a.mimeType || 'image/jpeg' };
  }
}

/** Ajoute un fichier à un envoi (téléphone ou version web). */
export async function appendFile(form: FormData, field: string, p: Photo) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(p.uri)).blob();
    form.append(field, blob, p.name);
  } else {
    form.append(field, { uri: p.uri, name: p.name, type: p.type } as any);
  }
}

export default function PhotoPicker({ photos, onChange, max = 12, label = 'Photos', help }: { photos: Photo[]; onChange: (p: Photo[]) => void; max?: number; label?: string; help?: string }) {
  const [busy, setBusy] = useState(false);

  const add = async (camera: boolean) => {
    const left = max - photos.length;
    if (left <= 0) { info('Photos', `Maximum ${max} photos.`); return; }
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && Platform.OS !== 'web') { info('Autorisation nécessaire', camera ? 'Autorisez l\'appareil photo dans les réglages du téléphone.' : 'Autorisez l\'accès aux photos dans les réglages du téléphone.'); return; }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: !camera, selectionLimit: left, orderedSelection: true, exif: false };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.length) return;
    setBusy(true);
    try {
      const out: Photo[] = [];
      for (let i = 0; i < Math.min(res.assets.length, left); i++) out.push(await shrink(res.assets[i], photos.length + i));
      onChange([...photos, ...out]);
    } finally { setBusy(false); }
  };

  const choose = () => {
    if (Platform.OS === 'web') { add(false); return; }
    Alert.alert('Ajouter des photos', undefined, [
      { text: 'Prendre une photo', onPress: () => add(true) },
      { text: 'Choisir dans la galerie', onPress: () => add(false) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={st.label}>{label} ({photos.length}/{max})</Text>
      {help ? <Text style={st.help}>{help}</Text> : null}
      <View style={st.grid}>
        {photos.map((p, i) => (
          <View key={p.uri} style={st.cell}>
            <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            {i === 0 ? <View style={st.main}><Text style={st.mainText}>Principale</Text></View> : (
              <Pressable onPress={() => onChange([p, ...photos.filter((x) => x !== p)])} style={[st.mini, { left: 4 }]} accessibilityLabel={'Mettre la photo ' + (i + 1) + ' en principale'}>
                <Icon name="star" size={14} color={C.goldFg} />
              </Pressable>
            )}
            <Pressable onPress={() => onChange(photos.filter((x) => x !== p))} style={[st.mini, { right: 4 }]} accessibilityLabel={'Retirer la photo ' + (i + 1)}>
              <Icon name="close" size={14} color={C.crit} stroke={2.6} />
            </Pressable>
          </View>
        ))}
        {photos.length < max ? (
          <Pressable onPress={choose} style={[st.cell, st.add]} accessibilityRole="button" accessibilityLabel="Ajouter des photos" disabled={busy}>
            {busy ? <ActivityIndicator color={C.accent} /> : (<><Icon name="camera" size={26} color={C.accent} /><Text style={st.addText}>Ajouter</Text></>)}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  label: { fontFamily: F.semi, fontSize: 14, color: C.fg },
  help: { fontFamily: F.body, fontSize: 13, color: C.muted, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '31.5%', aspectRatio: 1, borderRadius: R.md, overflow: 'hidden', backgroundColor: C.surface },
  add: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#c9d0ec', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: C.accentSoft },
  addText: { fontFamily: F.bold, fontSize: 13, color: C.accent },
  main: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,26,158,0.85)', paddingVertical: 3 },
  mainText: { color: C.white, fontFamily: F.bold, fontSize: 11, textAlign: 'center' },
  mini: { position: 'absolute', top: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
});
