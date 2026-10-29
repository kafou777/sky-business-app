import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { C, R } from '@/lib/theme';

/** Carte Google (emplacement approximatif) intégrée dans la fiche. */
export default function MapEmbed({ url, height = 220 }: { url: string; height?: number }) {
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${url}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></body></html>`;
  return (
    <View style={{ height, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.surface }}>
      <WebView source={{ html, baseUrl: 'https://www.google.com' }} style={{ flex: 1, backgroundColor: C.surface }} scrollEnabled={false} nestedScrollEnabled javaScriptEnabled originWhitelist={['*']} setSupportMultipleWindows={false} />
    </View>
  );
}
