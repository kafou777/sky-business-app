import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { useCart } from '@/lib/cart';
import { C, F } from '@/lib/theme';

/** Bouton flottant « Panier (n) » sur les écrans de la boutique. */
export default function CartButton() {
  const { count } = useCart();
  const ins = useSafeAreaInsets();
  if (!count) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Voir le panier, ' + count + ' article' + (count > 1 ? 's' : '')} onPress={() => router.push('/panier')}
      style={({ pressed }) => [st.btn, { bottom: ins.bottom + 16 }, pressed && { opacity: 0.9 }]}>
      <Icon name="bag" size={20} color={C.white} />
      <Text style={st.text}>Panier</Text>
      <Text style={st.n}>{count}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  btn: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingHorizontal: 18, borderRadius: 26, backgroundColor: C.accent, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  text: { fontFamily: F.bold, fontSize: 15, color: C.white },
  n: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: C.gold, color: '#1b1400', fontFamily: F.bold, fontSize: 13, textAlign: 'center', lineHeight: 24, paddingHorizontal: 6, overflow: 'hidden' },
});
