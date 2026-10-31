import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ListingCard } from './ListingCard';
import { Listing } from '@/lib/api';
import { C } from '@/lib/theme';

const W = 280;
const GAP = 12;
const STEP = W + GAP;

/**
 * Carrousel « À la une » qui défile tout seul (une carte toutes les 3,5 s) et revient à la première
 * après la dernière (6 cartes maximum), comme sur dubizzle. S'arrête quand on le touche, quand l'écran
 * n'est plus visible ou quand l'application passe en arrière-plan ; reprend ensuite.
 */
export default function AutoCarousel({ data, delay = 3500 }: { data: Listing[]; delay?: number }) {
  const ref = useRef<FlatList<Listing>>(null);
  const idx = useRef(0);
  const [cur, setCur] = useState(0);
  const touching = useRef(false);
  const resumeAt = useRef(0);
  const [active, setActive] = useState(true);
  const items = data.slice(0, 6);

  useFocusEffect(useCallback(() => { setActive(true); return () => setActive(false); }, []));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!active || items.length < 2) return;
    const t = setInterval(() => {
      if (touching.current || Date.now() < resumeAt.current) return;
      const next = idx.current + 1 >= items.length ? 0 : idx.current + 1; // après la 6e : retour à la 1re
      idx.current = next;
      setCur(next);
      ref.current?.scrollToOffset({ offset: next * STEP, animated: true });
    }, delay);
    return () => clearInterval(t);
  }, [active, items.length, delay]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.x / STEP)));
    idx.current = i;
    setCur(i);
  };

  return (
    <View>
      <FlatList ref={ref} horizontal data={items} keyExtractor={(l) => 'v' + l.id} showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.list} snapToInterval={STEP} decelerationRate="fast" snapToAlignment="start"
        getItemLayout={(_, i) => ({ length: STEP, offset: STEP * i, index: i })}
        onScrollBeginDrag={() => { touching.current = true; }}
        onScrollEndDrag={() => { touching.current = false; resumeAt.current = Date.now() + 6000; }}
        onMomentumScrollEnd={settle}
        renderItem={({ item }) => <ListingCard l={item} width={W} />} />
      {items.length > 1 ? (
        <View style={st.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {items.map((_, i) => <View key={i} style={[st.dot, i === cur && st.dotOn]} />)}
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  list: { paddingHorizontal: 16, gap: GAP, flexDirection: 'row' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.line },
  dotOn: { width: 18, backgroundColor: C.accent },
});
