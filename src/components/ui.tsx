import { ReactNode, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardTypeOptions, Modal, Platform, Pressable, StyleProp, StyleSheet,
  Text, TextInput, TextStyle, View, ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon, { IconName } from './Icon';
import { C, F, R } from '@/lib/theme';

/* ---------- Textes ---------- */

export function T({ children, style, v = 'body', numberOfLines, selectable }: { children: ReactNode; style?: StyleProp<TextStyle>; v?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label' | 'muted' | 'price'; numberOfLines?: number; selectable?: boolean }) {
  return <Text selectable={selectable} numberOfLines={numberOfLines} style={[s.t, s[v], style]}>{children}</Text>;
}

/* ---------- Boutons ---------- */

type BtnKind = 'primary' | 'secondary' | 'gold' | 'wa' | 'ghost' | 'danger';
export function Button({ title, onPress, kind = 'primary', icon, loading, disabled, style, small }: { title: string; onPress?: () => void; kind?: BtnKind; icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const k = btn[kind];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: k.bg, borderColor: k.border }, (disabled || loading) && { opacity: 0.55 }, pressed && { opacity: 0.85 }, style]}>
      {loading ? <ActivityIndicator color={k.fg} /> : (
        <>
          {icon ? <Icon name={icon} size={small ? 16 : 19} color={k.fg} /> : null}
          <Text style={[s.btnText, small && { fontSize: 14 }, { color: k.fg }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
const btn: Record<BtnKind, { bg: string; fg: string; border: string }> = {
  primary: { bg: C.accent, fg: C.white, border: C.accent },
  secondary: { bg: C.white, fg: C.accent, border: C.line },
  gold: { bg: C.gold, fg: '#1b1400', border: C.gold },
  wa: { bg: C.wa, fg: C.white, border: C.wa },
  ghost: { bg: 'transparent', fg: C.accent, border: 'transparent' },
  danger: { bg: C.white, fg: C.crit, border: '#f3c4c0' },
};

export function IconButton({ name, onPress, label, color = C.fg, bg = C.white, size = 22, badge }: { name: IconName; onPress: () => void; label: string; color?: string; bg?: string; size?: number; badge?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={({ pressed }) => [s.iconBtn, { backgroundColor: bg }, pressed && { opacity: 0.7 }]}>
      <Icon name={name} size={size} color={color} />
      {badge ? <View style={s.badge}><Text style={s.badgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress}
      style={({ pressed }) => [s.chip, active && s.chipOn, pressed && { opacity: 0.8 }]}>
      {icon ? <Icon name={icon} size={16} color={active ? C.white : C.accent} /> : null}
      <Text style={[s.chipText, active && { color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, kind = 'accent' }: { label: string; kind?: 'accent' | 'gold' | 'ok' | 'warn' | 'crit' | 'muted' }) {
  const m = { accent: [C.accentSoft, C.accent], gold: [C.goldSoft, C.goldFg], ok: [C.okSoft, C.ok], warn: [C.warnSoft, C.warn], crit: [C.critSoft, C.crit], muted: [C.surface, C.muted] }[kind];
  return <View style={[s.tag, { backgroundColor: m[0] }]}><Text style={[s.tagText, { color: m[1] }]}>{label}</Text></View>;
}

/* ---------- En-tête des écrans secondaires ---------- */

export function Header({ title, right, back = true, sub }: { title: string; right?: ReactNode; back?: boolean; sub?: string }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: ins.top + 6 }]}>
      {back ? <IconButton name="back" label="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : <View style={{ width: 8 }} />}
      <View style={{ flex: 1 }}>
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={s.headerSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/* ---------- Champs ---------- */

export function Field({ label, value, onChangeText, placeholder, keyboardType, secure, multiline, maxLength, help, error, autoCapitalize, autoComplete, style, right }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: KeyboardTypeOptions; secure?: boolean; multiline?: boolean;
  maxLength?: number; help?: string; error?: string; autoCapitalize?: 'none' | 'sentences' | 'words'; autoComplete?: any; style?: StyleProp<ViewStyle>; right?: ReactNode;
}) {
  const [hide, setHide] = useState(true);
  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.input, multiline && { minHeight: 110, alignItems: 'flex-start' }, !!error && { borderColor: C.crit }]}>
        <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={C.faint}
          keyboardType={keyboardType} secureTextEntry={secure && hide} multiline={multiline} maxLength={maxLength} autoCapitalize={autoCapitalize}
          autoComplete={autoComplete} textAlignVertical={multiline ? 'top' : 'center'}
          style={[s.inputText, multiline && { minHeight: 96, paddingTop: 12 }]} />
        {secure ? <Pressable accessibilityLabel={hide ? 'Afficher le mot de passe' : 'Masquer le mot de passe'} onPress={() => setHide(!hide)} hitSlop={8} style={{ padding: 6 }}><Icon name={hide ? 'eye' : 'eyeOff'} size={20} color={C.muted} /></Pressable> : right}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : help ? <Text style={s.help}>{help}</Text> : null}
    </View>
  );
}

export type Opt = { id: string | number; nom: string; sub?: string };

/** Liste déroulante (s'ouvre en plein écran, avec recherche si la liste est longue). */
export function Select({ label, value, options, onChange, placeholder = 'Choisir…', help, disabled, searchable }: { label: string; value: string | number | null | undefined; options: Opt[]; onChange: (v: Opt) => void; placeholder?: string; help?: string; disabled?: boolean; searchable?: boolean }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => String(o.id) === String(value ?? ''));
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label + ' : ' + (cur ? cur.nom : placeholder)} disabled={disabled} onPress={() => setOpen(true)}
        style={[s.input, disabled && { opacity: 0.5 }]}>
        <Text style={[s.inputText, { color: cur ? C.fg : C.faint }]} numberOfLines={1}>{cur ? cur.nom : placeholder}</Text>
        <Icon name="down" size={18} color={C.muted} />
      </Pressable>
      {help ? <Text style={s.help}>{help}</Text> : null}
      <Picker visible={open} title={label} options={options} value={value} searchable={searchable ?? options.length > 12} onClose={() => setOpen(false)} onPick={(o) => { setOpen(false); onChange(o); }} />
    </View>
  );
}

export function Picker({ visible, title, options, value, onClose, onPick, searchable }: { visible: boolean; title: string; options: Opt[]; value?: string | number | null; onClose: () => void; onPick: (o: Opt) => void; searchable?: boolean }) {
  const [q, setQ] = useState('');
  const ins = useSafeAreaInsets();
  const list = useMemo(() => {
    const n = norm(q);
    return n ? options.filter((o) => norm(o.nom + ' ' + (o.sub || '')).includes(n)) : options;
  }, [q, options]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? ins.top : 0 }}>
        <View style={s.sheetHead}>
          <Text style={[s.headerTitle, { flex: 1 }]}>{title}</Text>
          <IconButton name="close" label="Fermer" onPress={onClose} />
        </View>
        {searchable ? (
          <View style={[s.input, { marginHorizontal: 16, marginBottom: 8 }]}>
            <Icon name="search" size={18} color={C.muted} />
            <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Rechercher…" placeholderTextColor={C.faint} style={s.inputText} accessibilityLabel="Rechercher dans la liste" />
          </View>
        ) : null}
        <FlatList data={list} keyExtractor={(o) => String(o.id)} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: ins.bottom + 24 }}
          renderItem={({ item }) => {
            const on = String(item.id) === String(value ?? '');
            return (
              <Pressable onPress={() => onPick(item)} style={({ pressed }) => [s.option, pressed && { backgroundColor: C.surface }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.optionText, on && { color: C.accent, fontFamily: F.bold }]}>{item.nom}</Text>
                  {item.sub ? <Text style={s.help}>{item.sub}</Text> : null}
                </View>
                {on ? <Icon name="check" size={20} color={C.accent} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={[s.help, { padding: 20 }]}>Aucun résultat.</Text>} />
      </View>
    </Modal>
  );
}

export function norm(t: string) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function Segmented({ options, value, onChange }: { options: Opt[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = String(o.id) === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(String(o.id))} style={[s.segItem, on && s.segOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Text style={[s.segText, on && { color: C.accent }]} numberOfLines={1}>{o.nom}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Check({ label, value, onChange, help }: { label: string; value: boolean; onChange: (v: boolean) => void; help?: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }} accessibilityRole="checkbox" accessibilityState={{ checked: value }}>
      <View style={[s.box, value && { backgroundColor: C.accent, borderColor: C.accent }]}>{value ? <Icon name="check" size={15} color={C.white} stroke={3} /> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.optionText}>{label}</Text>
        {help ? <Text style={s.help}>{help}</Text> : null}
      </View>
    </Pressable>
  );
}

/* ---------- États ---------- */

export function Loading({ label }: { label?: string }) {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={C.accent} />
      {label ? <Text style={[s.help, { marginTop: 10 }]}>{label}</Text> : null}
    </View>
  );
}

export function Empty({ icon = 'info', title, text, action, onAction }: { icon?: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={[s.center, { gap: 10, padding: 28 }]}>
      <View style={s.emptyIcon}><Icon name={icon} size={30} color={C.accent} /></View>
      <Text style={[s.h3, { textAlign: 'center' }]}>{title}</Text>
      {text ? <Text style={[s.muted, { textAlign: 'center' }]}>{text}</Text> : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ marginTop: 6, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

export function Notice({ text, kind = 'info' }: { text: string; kind?: 'info' | 'ok' | 'err' | 'warn' }) {
  const m = { info: [C.accentSoft, C.accent], ok: [C.okSoft, C.ok], err: [C.critSoft, C.crit], warn: [C.warnSoft, C.warn] }[kind];
  return <View style={[s.notice, { backgroundColor: m[0] }]} accessibilityLiveRegion="polite"><Text style={[s.noticeText, { color: m[1] }]}>{text}</Text></View>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/* ---------- Confirmation (fonctionne aussi dans la version web) ---------- */

export function confirm(title: string, message: string, ok = 'Confirmer', danger = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm ? globalThis.confirm(title + '\n\n' + message) : true);
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: danger ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
export function info(title: string, message: string) {
  if (Platform.OS === 'web') { globalThis.alert?.(title + '\n\n' + message); return; }
  Alert.alert(title, message);
}

/* ---------- Styles ---------- */

export const s = StyleSheet.create({
  t: { color: C.fg, fontFamily: F.body, fontSize: 15, lineHeight: 21 },
  h1: { fontFamily: F.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.4 },
  h2: { fontFamily: F.display, fontSize: 21, lineHeight: 26, letterSpacing: -0.2 },
  h3: { fontFamily: F.bold, fontSize: 17, lineHeight: 22, color: C.fg },
  body: {},
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontFamily: F.semi, fontSize: 14, color: C.fg },
  muted: { color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  price: { fontFamily: F.display, fontSize: 19, color: C.accent },
  help: { color: C.muted, fontSize: 13, lineHeight: 18, fontFamily: F.body },
  error: { color: C.crit, fontSize: 13, lineHeight: 18, fontFamily: F.semi },
  btn: { minHeight: 52, borderRadius: R.md, borderWidth: 1.5, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSmall: { minHeight: 40, paddingHorizontal: 12, borderRadius: R.sm },
  btnText: { fontFamily: F.bold, fontSize: 16 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.crit, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.white },
  badgeText: { color: C.white, fontSize: 10, fontFamily: F.bold },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, backgroundColor: C.white },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontFamily: F.semi, fontSize: 14, color: C.fg },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  tagText: { fontFamily: F.bold, fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingBottom: 8, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.line },
  headerTitle: { fontFamily: F.display, fontSize: 19, color: C.fg },
  headerSub: { fontFamily: F.body, fontSize: 13, color: C.muted },
  input: { minHeight: 52, borderWidth: 1, borderColor: C.line, borderRadius: R.md, backgroundColor: C.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputText: { flex: 1, fontFamily: F.body, fontSize: 16, color: C.fg, paddingVertical: Platform.OS === 'web' ? 14 : 10, outlineStyle: 'none' as any },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.line, gap: 10 },
  optionText: { fontFamily: F.medium, fontSize: 16, color: C.fg },
  seg: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.md, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: R.sm, alignItems: 'center' },
  segOn: { backgroundColor: C.white, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  segText: { fontFamily: F.semi, fontSize: 14, color: C.muted },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: C.faint, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: R.md, padding: 14 },
  noticeText: { fontFamily: F.semi, fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
});
