import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Status = 'unverified' | 'pending' | 'manual_review' | 'needs_retry' | 'rejected';

type Props = {
  status: Status;
  emailVerified: boolean;
  onStartVerification: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  providerReady: boolean;
};

const statusCopy: Record<Status, { title: string; body: string }> = {
  unverified: {
    title: 'Verifiera din identitet för att aktivera kontot.',
    body: 'Jannahu är en plattform för verifierade medlemmar. Innan du kan matcha, chatta eller boka uppdrag ber vi dig bekräfta vem du är.',
  },
  pending: {
    title: 'Verifieringen är inskickad.',
    body: 'Vi väntar på det officiella resultatet från verifieringsleverantören. Kontot aktiveras automatiskt när det godkänns.',
  },
  manual_review: {
    title: 'Din verifiering granskas manuellt.',
    body: 'Vissa kontroller behöver mänsklig granskning. Vi meddelar dig så snart granskningen är klar.',
  },
  needs_retry: {
    title: 'Verifieringen behöver göras om.',
    body: 'Den första kontrollen gick inte att slutföra. Starta en ny verifiering när du är redo.',
  },
  rejected: {
    title: 'Verifieringen kunde inte godkännas.',
    body: 'Kontakta supporten om du anser att det är fel. Ditt konto förblir begränsat tills frågan är löst.',
  },
};

export function IdentityGate({ status, emailVerified, onStartVerification, onRefresh, onLogout, providerReady }: Props) {
  const copy = statusCopy[status];
  const canStart = status === 'unverified' || status === 'needs_retry';

  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.brand}>möt</Text>
    <Text style={styles.kicker}>IDENTITETSSKYDD</Text>
    <Text style={styles.title}>{copy.title}</Text>
    <Text style={styles.body}>{copy.body}</Text>

    <View style={styles.routes}>
      <View style={styles.routeCard}>
        <Text style={styles.routeRegion}>Sverige</Text>
        <Text style={styles.routeMethod}>BankID</Text>
        <Text style={styles.routeDescription}>Snabb verifiering med svenskt BankID.</Text>
      </View>
      <View style={styles.routeCard}>
        <Text style={styles.routeRegion}>Internationellt</Text>
        <Text style={styles.routeMethod}>Pass / nationellt ID</Text>
        <Text style={styles.routeDescription}>Stödda pass eller id-kort, med selfie- och livskontroll.</Text>
      </View>
    </View>

    <View style={styles.checks}>
      <View style={styles.checkRow}>
        <View style={[styles.checkDot, emailVerified && styles.checkDotDone]}><Text style={styles.checkMark}>{emailVerified ? '✓' : '·'}</Text></View>
        <Text style={styles.checkText}>{emailVerified ? 'E-post verifierad' : 'Verifiera din e-post först'}</Text>
      </View>
      <View style={styles.checkRow}>
        <View style={styles.checkDot}><Text style={styles.checkMark}>·</Text></View>
        <Text style={styles.checkText}>Identitetsverifiering</Text>
      </View>
      <View style={styles.checkRow}>
        <View style={styles.checkDot}><Text style={styles.checkMark}>·</Text></View>
        <Text style={styles.checkText}>18+ ålderskrav via verifierad identitet</Text>
      </View>
    </View>

    {canStart && <Pressable style={[styles.primary, !providerReady && styles.primaryDisabled]} onPress={onStartVerification} disabled={!providerReady} accessibilityRole="button" accessibilityState={{ disabled: !providerReady }}>
      <Text style={styles.primaryText}>{providerReady ? 'Starta säker verifiering  →' : 'Verifiering kopplas på snart'}</Text>
    </Pressable>}
    {!providerReady && <Text style={styles.note}>Identitetsverifiering kräver en verifieringsleverantör (Sumsub) med konfigurerat konto. När integrationen aktiveras startar BankID- och passflödet här. Dokumenten hanteras av leverantören — Jannahu lagrar bara verifieringsresultatet, aldrig passbilder eller dokumentdata.</Text>}
    {canStart && <Pressable onPress={onRefresh}><Text style={styles.link}>Uppdatera status</Text></Pressable>}
    <Pressable onPress={onLogout}><Text style={styles.logout}>Logga ut</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 26, backgroundColor: '#f7f5ef' },
  brand: { color: '#27483d', fontSize: 30, fontWeight: '700', letterSpacing: -1 },
  kicker: { color: '#9ba49b', fontSize: 10, fontWeight: '800', letterSpacing: 1.6, marginTop: 20, marginBottom: 12 },
  title: { color: '#27483d', fontSize: 30, lineHeight: 36, fontWeight: '700', marginBottom: 12 },
  body: { color: '#53665d', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  routes: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  routeCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e5dc', borderRadius: 10, padding: 13 },
  routeRegion: { color: '#9ba49b', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  routeMethod: { color: '#27483d', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  routeDescription: { color: '#819087', fontSize: 11, lineHeight: 16 },
  checks: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e5dc', borderRadius: 10, padding: 13, marginBottom: 16, gap: 9 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  checkDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#e8f0d9', alignItems: 'center', justifyContent: 'center' },
  checkDotDone: { backgroundColor: '#a8c66d' },
  checkMark: { color: '#27483d', fontSize: 13, fontWeight: '800' },
  checkText: { color: '#53665d', fontSize: 12, flex: 1 },
  primary: { backgroundColor: '#27483d', borderRadius: 10, padding: 15, alignItems: 'center' },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  note: { color: '#819087', fontSize: 11, lineHeight: 17, marginTop: 14 },
  link: { color: '#66833d', textAlign: 'center', fontWeight: '700', padding: 14, fontSize: 13 },
  logout: { color: '#9b6c61', textAlign: 'center', fontWeight: '700', padding: 8, fontSize: 12 },
});
