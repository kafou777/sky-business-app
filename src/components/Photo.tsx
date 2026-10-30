import { useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';
import Icon from './Icon';
import { C } from '@/lib/theme';

/**
 * Photo d'annonce adaptée aux réseaux mobiles lents :
 * - affiche d'abord la petite version (vignette) si on l'a, puis la grande ;
 * - fond gris avec une icône tant que rien n'est arrivé (jamais un bloc vide) ;
 * - réessaie automatiquement (3 fois) si le téléchargement échoue.
 */
export default function Photo({ uri, thumb, style, fit = 'cover', icon = 'car', priority = 'normal', recyclingKey }: {
  uri?: string | null; thumb?: string | null; style?: StyleProp<ViewStyle>; fit?: ImageContentFit;
  icon?: 'car' | 'building'; priority?: 'low' | 'normal' | 'high'; recyclingKey?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setAttempt(0); setLoaded(false); }, [uri]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onError = () => {
    if (attempt >= 3) return;
    timer.current = setTimeout(() => setAttempt((a) => a + 1), 1200 * (attempt + 1));
  };
  // Après un échec, on force un nouveau téléchargement (paramètre ajouté à l'adresse).
  const src = uri ? (attempt ? uri + (uri.includes('?') ? '&' : '?') + 'r=' + attempt : uri) : null;

  return (
    <View style={[st.box, style]}>
      {!loaded ? <View style={st.ph}><Icon name={icon} size={40} color={C.faint} /></View> : null}
      {src ? (
        <Image key={attempt} source={{ uri: src }} placeholder={thumb ? { uri: thumb } : undefined} placeholderContentFit={fit}
          style={StyleSheet.absoluteFill} contentFit={fit} transition={200} cachePolicy="memory-disk" priority={priority}
          recyclingKey={recyclingKey} onLoad={() => setLoaded(true)} onError={onError} />
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: C.surface2 },
  ph: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
