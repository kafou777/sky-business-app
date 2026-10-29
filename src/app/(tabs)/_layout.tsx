import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router/js-tabs';
import Icon, { IconName } from '@/components/Icon';
import { useSession } from '@/lib/session';
import { C, F } from '@/lib/theme';

const ico = (name: IconName) => ({ color, focused }: { color: unknown; focused: boolean }) => <Icon name={name} size={24} color={String(color ?? C.muted)} stroke={focused ? 2.4 : 2} />;

export default function TabsLayout() {
  const { unread } = useSession();
  const ins = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontFamily: F.semi, fontSize: 11.5, lineHeight: 16 },
        tabBarStyle: { backgroundColor: C.white, borderTopColor: C.line, height: 66 + ins.bottom, paddingTop: 6, paddingBottom: ins.bottom + 8 },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: ico('home') }} />
      <Tabs.Screen name="recherche" options={{ title: 'Rechercher', tabBarIcon: ico('search') }} />
      <Tabs.Screen name="vendre" options={{
        title: 'Vendre',
        tabBarIcon: () => (
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', marginTop: -16, borderWidth: 4, borderColor: C.white }}>
            <Icon name="plus" size={24} color="#1b1400" stroke={2.8} />
          </View>
        ),
        tabBarLabelStyle: { fontFamily: F.bold, fontSize: 11.5, color: C.fg },
      }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ico('message'), tabBarBadge: unread ? (unread > 99 ? '99+' : unread) : undefined, tabBarBadgeStyle: { backgroundColor: C.crit, fontFamily: F.bold, fontSize: 11 } }} />
      <Tabs.Screen name="compte" options={{ title: 'Compte', tabBarIcon: ico('user') }} />
    </Tabs>
  );
}
