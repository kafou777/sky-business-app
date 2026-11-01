import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from './Icon';
import { Button, Field, Notice } from './ui';
import { api, prettyPhone, Profile } from '@/lib/api';
import { useSession } from '@/lib/session';
import { C, F, R } from '@/lib/theme';

/**
 * « Confirmez votre numéro » : code à 6 chiffres reçu par SMS (ou WhatsApp quand il est activé).
 * Rien ne s'affiche si le service n'est pas activé sur le site.
 */
export default function PhoneVerify({ title = 'Confirmez votre numéro', intro }: { title?: string; intro?: string }) {
  const { profile, setProfile } = useSession();
  const [tel, setTel] = useState(profile?.telephone || '');
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; k: 'ok' | 'err' } | null>(null);
  const [wait, setWait] = useState(0);
  useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);

  if (!profile?.otp) return null;
  if (profile.telephone_verifie) {
    return <View style={st.ok}><Icon name="shield" size={18} color={C.ok} /><Text style={st.okText}>Numéro vérifié : {prettyPhone(profile.telephone)}</Text></View>;
  }

  const send = async (canal: string) => {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ message: string }>('/app/telephone/envoyer', { body: { telephone: tel, canal } });
      setStep(2); setWait(60); setMsg({ t: r.data.message, k: 'ok' });
    } catch (e: any) { setMsg({ t: e.message, k: 'err' }); }
    finally { setBusy(false); }
  };
  const check = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ profil: Profile }>('/app/telephone/verifier', { body: { telephone: tel, code } });
      setProfile(r.data.profil);
    } catch (e: any) { setMsg({ t: e.message, k: 'err' }); }
    finally { setBusy(false); }
  };

  return (
    <View style={st.box}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={st.ic}><Icon name="shield" size={20} color={C.accent} /></View>
        <Text style={st.h}>{title}</Text>
      </View>
      <Text style={st.p}>{intro || 'Recevez un code pour prouver que ce numéro est bien le vôtre. Les acheteurs font davantage confiance aux numéros vérifiés.'}</Text>
      {step === 1 ? (
        <>
          <Field label="Votre numéro" value={tel} onChangeText={setTel} keyboardType="phone-pad" placeholder="07 00 00 00 00" />
          {profile.otp.canaux.map((c) => (
            <Button key={c} title={c === 'whatsapp' ? 'Recevoir le code par WhatsApp' : 'Recevoir le code par SMS'} icon={c === 'whatsapp' ? 'whatsapp' : 'message'} kind={c === 'whatsapp' ? 'wa' : 'primary'} onPress={() => send(c)} loading={busy} disabled={tel.replace(/\D/g, '').length < 10} />
          ))}
        </>
      ) : (
        <>
          <Text style={st.p}>Code envoyé au <Text style={{ fontFamily: F.bold, color: C.fg }}>{prettyPhone(tel)}</Text>.</Text>
          <TextInput value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))} keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" placeholder="• • • • • •" placeholderTextColor={C.faint} style={st.code} accessibilityLabel="Code reçu" maxLength={8} />
          <Button title="Valider" onPress={check} loading={busy} disabled={code.length < 4} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Autre numéro" kind="ghost" small onPress={() => { setStep(1); setCode(''); setMsg(null); }} style={{ flex: 1 }} />
            <Button title={wait ? 'Renvoyer (' + wait + ' s)' : 'Renvoyer le code'} kind="ghost" small disabled={!!wait || busy} onPress={() => send(profile.otp!.canaux[0])} style={{ flex: 1 }} />
          </View>
        </>
      )}
      {msg ? <Notice text={msg.t} kind={msg.k} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  box: { gap: 10, backgroundColor: '#fafbff', borderWidth: 1.5, borderColor: C.accentSoft, borderRadius: R.lg, padding: 14 },
  ic: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  h: { fontFamily: F.display, fontSize: 17, color: C.fg, flex: 1 },
  p: { fontFamily: F.body, fontSize: 14, color: C.muted, lineHeight: 20 },
  code: { borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingVertical: 12, textAlign: 'center', fontFamily: F.display, fontSize: 26, letterSpacing: 10, color: C.fg, backgroundColor: C.white },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.okSoft || '#dcf3e6', borderRadius: R.md, padding: 10 },
  okText: { fontFamily: F.semi, fontSize: 14.5, color: C.ok },
});
