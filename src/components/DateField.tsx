import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { IconButton } from './ui';
import { C, F, R } from '@/lib/theme';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const ymd = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const frDate = (s: string) => { if (!s) return ''; const d = parse(s); return d.getDate() + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear(); };

/** Choix d'une date dans un calendrier (identique sur Android, iPhone et web). */
export default function DateField({ label, value, onChange, min }: { label: string; value: string; onChange: (v: string) => void; min?: string }) {
  const [open, setOpen] = useState(false);
  const minD = min ? parse(min) : null;
  const start = value ? parse(value) : minD || new Date();
  const [month, setMonth] = useState(new Date(start.getFullYear(), start.getMonth(), 1));

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) out.push(new Date(month.getFullYear(), month.getMonth(), d, 12));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={st.label}>{label}</Text>
      <Pressable onPress={() => { setMonth(new Date(start.getFullYear(), start.getMonth(), 1)); setOpen(true); }} style={st.input} accessibilityRole="button" accessibilityLabel={label + ' : ' + (value ? frDate(value) : 'choisir')}>
        <Icon name="calendar" size={18} color={C.muted} />
        <Text style={[st.inputText, !value && { color: C.faint }]} numberOfLines={1}>{value ? frDate(value) : 'Choisir'}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={st.overlay} onPress={() => setOpen(false)}>
          <Pressable style={st.sheet} onPress={() => {}}>
            <View style={st.head}>
              <IconButton name="back" label="Mois précédent" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
              <Text style={st.month}>{MOIS[month.getMonth()]} {month.getFullYear()}</Text>
              <IconButton name="next" label="Mois suivant" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
            </View>
            <View style={st.grid}>
              {JOURS.map((j, i) => <Text key={'j' + i} style={st.dow}>{j}</Text>)}
              {cells.map((d, i) => {
                if (!d) return <View key={i} style={st.cell} />;
                const off = !!minD && d < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate(), 0);
                const on = value === ymd(d);
                return (
                  <Pressable key={i} disabled={off} onPress={() => { onChange(ymd(d)); setOpen(false); }} style={[st.cell, on && st.on]} accessibilityRole="button" accessibilityState={{ disabled: off, selected: on }} accessibilityLabel={frDate(ymd(d))}>
                    <Text style={[st.day, off && { color: '#c3c6d8' }, on && { color: C.white, fontFamily: F.bold }]}>{d.getDate()}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  label: { fontFamily: F.semi, fontSize: 14, color: C.fg },
  input: { minHeight: 52, borderWidth: 1, borderColor: C.line, borderRadius: R.md, backgroundColor: C.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputText: { flex: 1, fontFamily: F.body, fontSize: 15, color: C.fg },
  overlay: { flex: 1, backgroundColor: 'rgba(15,18,51,0.4)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: C.white, borderRadius: R.xl, padding: 14, maxWidth: 420, width: '100%', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  month: { fontFamily: F.display, fontSize: 18, color: C.fg, textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dow: { width: '14.28%', textAlign: 'center', fontFamily: F.bold, fontSize: 12, color: C.muted, paddingVertical: 6 },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  on: { backgroundColor: C.accent },
  day: { fontFamily: F.medium, fontSize: 15, color: C.fg },
});
