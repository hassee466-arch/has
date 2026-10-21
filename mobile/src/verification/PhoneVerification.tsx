import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  phone: string;
  verified: boolean;
  onSendCode: (phone: string) => Promise<string | null>;
  onVerifyCode: (phone: string, code: string) => Promise<string | null>;
};

export function PhoneVerification({ phone: initialPhone, verified, onSendCode, onVerifyCode }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await onSendCode(phone.trim());
      if (result) {
        setError(result);
        return;
      }
      setCodeSent(true);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await onVerifyCode(phone.trim(), code.trim());
      if (result) {
        setError(result);
        return;
      }
      setCode('');
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return <View style={styles.container}>
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text style={styles.title}>{verified ? 'Telefonnummer verifierat' : 'Verifiera telefonnummer (valfritt)'}</Text>
        <Text style={styles.hint}>{verified ? initialPhone : 'Vi skickar en engångskod via SMS. Ange numret med landskod, till exempel +46701234567.'}</Text>
      </View>
      {verified && <Text style={styles.statusDone}>KLAR</Text>}
    </View>
    {!verified && <>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={(value) => { setPhone(value); setError(''); }}
        placeholder="+46701234567"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        accessibilityLabel="Telefonnummer med landskod"
      />
      {codeSent && <TextInput
        style={styles.input}
        value={code}
        onChangeText={(value) => { setCode(value); setError(''); }}
        placeholder="SMS-kod"
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={8}
        accessibilityLabel="SMS verification code"
      />}
      <Pressable
        style={[styles.button, busy && styles.disabled]}
        onPress={() => { void (codeSent ? verifyCode() : sendCode()); }}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? 'Vänta…' : codeSent ? 'Bekräfta kod' : 'Skicka SMS-kod'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  container: { padding: 13, marginBottom: 9, borderWidth: 1, borderColor: '#e4e5dc', borderRadius: 5, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  copy: { flex: 1 },
  title: { color: '#27483d', fontSize: 12, fontWeight: '700' },
  hint: { color: '#819087', fontSize: 11, lineHeight: 16, marginTop: 4 },
  statusDone: { color: '#66833d', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  input: { borderWidth: 1, borderColor: '#dce2d6', borderRadius: 5, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, color: '#27483d' },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 2, borderRadius: 5, backgroundColor: '#27483d' },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: '#a95f4d', fontSize: 12, lineHeight: 18, marginTop: 8 },
});
