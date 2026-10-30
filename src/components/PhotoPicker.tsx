import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Icon from './Icon';
import { info } from './ui';
import { C, F, R } from '@/lib/theme';

export type Photo = { uri: string; name: string; type: string; width?: number; height?: number; key?: string };

let seq = 0;
/** Photo choisie : on garde l'original (affichage fiable), la réduction se fait au moment de l'envoi. */
function fromAsset(a: ImagePicker.ImagePickerAsset): Photo {
  seq += 1;
  return { uri: a.uri, name: `photo-${Date.now()}-${seq}.jpg`, type: a.mimeType || 'image/jpeg', width: a.width, height: a.height, key: `${Date.now()}-${seq}` };
}

/**
 * Allège la photo juste avant l'envoi, sans perte visible :
 * 1280 px au plus grand côté (le site affiche 1024 px), WebP qualité 82 sur Android (JPEG 85 sur iPhone).
 * Une photo de téléphone de 3 à 6 Mo passe à environ 150-250 Ko : envoi bien plus rapide.
 * Les informations cachées (position GPS…) sont retirées au passage.
 */
async function shrink(p: Photo): Promise<Photo> {
  if (Platform.OS === 'web') return p;
  try {
    const MAX = 1280;
    const w = p.width || 0, h = p.height || 0;
    const actions = Math.max(w, h) > MAX ? [{ resize: w >= h ? { width: MAX } : { height: MAX } }] : [];
    const webp = Platform.OS === 'android';
    const r = await manipulateAsync(p.uri, actions, { compress: webp ? 0.82 : 0.85, format: webp ? SaveFormat.WEBP : SaveFormat.JPEG });
    const name = p.name.replace(/\.[a-z0-9]+$/i, '') + (webp ? '.webp' : '.jpg');
    return { ...p, uri: r.uri, name, type: webp ? 'image/webp' : 'image/jpeg' };
  } catch {
    return p;
  }
}

/** Ajoute un fichier à un envoi (téléphone ou version web). */
export async function appendFile(form: FormData, field: string, photo: Photo) {
  const p = await shrink(photo);
  if (Platform.OS === 'web') {
    const blob = await (await fetch(p.uri)).blob();
    form.append(field, blob, p.name);
  } else {
    form.append(field, { uri: p.uri, name: p.name, type: p.type } as any);
  }
}

export default function PhotoPicker({ photos, onChange, max = 12, label = 'Photos', help }: { photos: Photo[]; onChange: (p: Photo[]) => void; max?: number; label?: string; help?: string }) {
  const [busy, setBusy] = useState(false);
  // Taille des vignettes en pixels (les pourcentages s'affichent mal sur certains Android).
  const { width: winW } = useWindowDimensions();
  const [gridW, setGridW] = useState(0);
  const size = Math.floor(((gridW || Math.min(winW, 640) - 32) - 16) / 3);
  // Toujours la liste à jour (évite de perdre une photo quand on en ajoute une autre).
  const latest = useRef(photos);
  latest.current = photos;

  const add = async (camera: boolean) => {
    const left = max - photos.length;
    if (left <= 0) { info('Photos', `Maximum ${max} photos.`); return; }
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && Platform.OS !== 'web') { info('Autorisation nécessaire', camera ? 'Autorisez l\'appareil photo dans les réglages du téléphone.' : 'Autorisez l\'accès aux photos dans les réglages du téléphone.'); return; }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsMultipleSelection: !camera && left > 1, selectionLimit: left, orderedSelection: true, exif: false };
    setBusy(true);
    try {
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.length) return;
      const out = res.assets.slice(0, left).map(fromAsset);
      if (res.assets.length > left) info('Photos', `Seules les ${left} premières photos ont été ajoutées (maximum ${max}).`);
      onChange([...latest.current, ...out]);
    } catch (e: any) {
      info('Photos', 'Impossible d\'ouvrir les photos : ' + (e?.message || 'erreur inconnue'));
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
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[st.label, { flex: 1 }]}>{label} ({photos.length}/{max})</Text>
        {photos.length ? <Pressable onPress={() => onChange([])} hitSlop={8} accessibilityRole="button"><Text style={st.clear}>Tout retirer</Text></Pressable> : null}
      </View>
      {help ? <Text style={st.help}>{help}</Text> : null}
      <View style={st.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
        {photos.map((p, i) => (
          <View key={p.key || p.uri + i} style={[st.cell, { width: size, height: size }]}>
            <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={p.key || p.uri} />
            {i === 0 ? <View style={st.main}><Text style={st.mainText}>Principale</Text></View> : (
              <Pressable onPress={() => onChange([p, ...photos.filter((_, j) => j !== i)])} style={[st.mini, { left: 4 }]} accessibilityLabel={'Mettre la photo ' + (i + 1) + ' en principale'}>
                <Icon name="star" size={14} color={C.goldFg} />
              </Pressable>
            )}
            <Pressable onPress={() => onChange(photos.filter((_, j) => j !== i))} style={[st.mini, { right: 4 }]} accessibilityLabel={'Retirer la photo ' + (i + 1)}>
              <Icon name="close" size={14} color={C.crit} stroke={2.6} />
            </Pressable>
          </View>
        ))}
        {photos.length < max ? (
          <Pressable onPress={choose} style={[st.cell, st.add, { width: size, height: size }]} accessibilityRole="button" accessibilityLabel="Ajouter des photos" disabled={busy}>
            {busy ? <ActivityIndicator color={C.accent} /> : (<><Icon name="camera" size={26} color={C.accent} /><Text style={st.addText}>Ajouter</Text></>)}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  label: { fontFamily: F.semi, fontSize: 14, color: C.fg },
  clear: { fontFamily: F.bold, fontSize: 13.5, color: C.crit },
  help: { fontFamily: F.body, fontSize: 13, color: C.muted, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  cell: { borderRadius: R.md, overflow: 'hidden', backgroundColor: C.surface2 },
  add: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#c9d0ec', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: C.accentSoft },
  addText: { fontFamily: F.bold, fontSize: 13, color: C.accent },
  main: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,26,158,0.85)', paddingVertical: 3 },
  mainText: { color: C.white, fontFamily: F.bold, fontSize: 11, textAlign: 'center' },
  mini: { position: 'absolute', top: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
});
