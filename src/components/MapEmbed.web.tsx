import { createElement } from 'react';
import { View } from 'react-native';
import { C, R } from '@/lib/theme';

export default function MapEmbed({ url, height = 220 }: { url: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.surface }}>
      {createElement('iframe', { src: url, style: { border: 0, width: '100%', height: '100%' }, loading: 'lazy', title: 'Carte' })}
    </View>
  );
}
