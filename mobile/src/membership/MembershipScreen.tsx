import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { businessMetrics, cafeExample, fundRules, growthPhases, membershipTiers, revenueSources } from './membershipData';

type Props = {
  currentTier: string;
  onSelectTier: (tierKey: string) => void;
};

export function MembershipScreen({ currentTier, onSelectTier }: Props) {
  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.kicker}>MEDLEMSKAP</Text>
    <Text style={styles.title}>Dejter som bär sig.</Text>
    <Text style={styles.lead}>Medlemskap finansierar verkliga möten. Partnerföretag får nya kunder. Jannahu återinvesterar en del i dina dejter — aldrig mer än budgeten tillåter.</Text>

    <Text style={styles.sectionTitle}>Välj ditt medlemskap</Text>
    {membershipTiers.map((tier) => {
      const isCurrent = currentTier === tier.key;
      return <Pressable key={tier.key} style={[styles.tierCard, isCurrent && styles.tierCardCurrent]} onPress={() => onSelectTier(tier.key)} accessibilityRole="button" accessibilityState={{ selected: isCurrent }}>
        <View style={[styles.tierAccent, { backgroundColor: tier.color }]} />
        <View style={styles.tierBody}>
          <View style={styles.tierTop}>
            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.tierPrice}>{tier.priceSek === 0 ? 'Gratis' : `${tier.priceSek} kr/mån`}</Text>
          </View>
          <Text style={styles.tierSupport}>Dejtstöd: {tier.monthlyDateSupport}/månad</Text>
          <View style={styles.tierPerks}>{tier.perks.map((perk) => <Text key={perk} style={styles.tierPerk}>✓ {perk}</Text>)}</View>
          {isCurrent && <Text style={styles.tierCurrent}>Ditt nuvarande medlemskap</Text>}
          {!isCurrent && <Text style={styles.tierCta}>Välj {tier.name}  →</Text>}
        </View>
      </Pressable>;
    })}

    <View style={styles.fundCard}>
      <Text style={styles.fundKicker}>DATE INVESTMENT FUND</Text>
      <Text style={styles.fundTitle}>Jannahu investerar i dina dejter.</Text>
      <Text style={styles.fundDescription}>En fast del av medlemsintäkterna går till att göra godkända dejter billigare. Stödet är en budgetpost — inte kontanter — och används bara för genomförda aktiviteter.</Text>
      <View style={styles.fundRules}>
        {fundRules.map((rule) => <View key={rule.title} style={styles.fundRule}>
          <Text style={styles.fundRuleTitle}>{rule.title}</Text>
          <Text style={styles.fundRuleDescription}>{rule.description}</Text>
        </View>)}
      </View>
    </View>

    <Text style={styles.sectionTitle}>Så fungerar en subventionerad dejt</Text>
    <View style={styles.exampleCard}>
      <Text style={styles.exampleTitle}>Exempel: cafédejt</Text>
      <View style={styles.exampleRows}>
        <View style={styles.exampleRow}><Text style={styles.exampleLabel}>Ordinarie menypris</Text><Text style={styles.exampleValue}>{cafeExample.menuPrice} kr</Text></View>
        <View style={styles.exampleRow}><Text style={styles.exampleLabel}>Partnerns rabatterade pris</Text><Text style={styles.exampleValue}>{cafeExample.partnerPrice} kr</Text></View>
        <View style={styles.exampleRow}><Text style={styles.exampleLabel}>Medlemmen betalar</Text><Text style={[styles.exampleValue, styles.exampleHighlight]}>{cafeExample.memberPays} kr</Text></View>
        <View style={styles.exampleRow}><Text style={styles.exampleLabel}>Jannahu investerar</Text><Text style={styles.exampleValue}>{cafeExample.jannahuInvests} kr</Text></View>
        <View style={styles.exampleDivider} />
        <View style={styles.exampleRow}><Text style={styles.exampleLabel}>Partnern får</Text><Text style={styles.exampleValue}>{cafeExample.partnerReceives} kr</Text></View>
        <View style={styles.exampleRow}><Text style={styles.exampleLabel}>Jannahu:s provision (10 %)</Text><Text style={styles.exampleValue}>{cafeExample.commission} kr</Text></View>
        <View style={styles.exampleRow}><Text style={[styles.exampleLabel, styles.exampleBold]}>Bidrag från bokningen</Text><Text style={[styles.exampleValue, styles.exampleBold]}>{cafeExample.contribution} kr</Text></View>
      </View>
      <Text style={styles.exampleNote}>Alla tre parter får värde av samma transaktion: du får en billigare dejt, partnern får en ny kund, och Jannahu finansierar stödet inom sin budget.</Text>
    </View>

    <Text style={styles.sectionTitle}>Så tjänar Jannahu pengar</Text>
    {revenueSources.map((source) => <View key={source.name} style={styles.sourceRow}>
      <View style={styles.sourceDot} />
      <View style={styles.sourceCopy}>
        <Text style={styles.sourceName}>{source.name}</Text>
        <Text style={styles.sourceDescription}>{source.description}</Text>
      </View>
    </View>)}
    <Text style={styles.principle}>Vi tar aldrig betalt per meddelande eller per match. Affären belönar verkliga möten och genomförda aktiviteter.</Text>

    <Text style={styles.sectionTitle}>Tillväxtfaserna</Text>
    {growthPhases.map((phase, index) => <View key={phase} style={styles.phaseRow}>
      <View style={styles.phaseNumber}><Text style={styles.phaseNumberText}>{index + 1}</Text></View>
      <Text style={styles.phaseText}>{phase}</Text>
    </View>)}

    <Text style={styles.sectionTitle}>Nyckeltalen vi följer</Text>
    <View style={styles.metricsCard}>
      {businessMetrics.map((metric) => <View key={metric.name} style={styles.metricRow}>
        <Text style={styles.metricName}>{metric.name}</Text>
        <Text style={styles.metricDescription}>{metric.description}</Text>
      </View>)}
    </View>

    <View style={styles.principleCard}>
      <Text style={styles.principleCardTitle}>The company grows when people meet.</Text>
      <Text style={styles.principleCardText}>Jannahu ska aldrig lova mer dejtstöd än företaget har råd att finansiera. Ingen ska behöva betala för en romantisk relation.</Text>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 44 },
  kicker: { color: '#9ba49b', fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginBottom: 14 },
  title: { color: '#27483d', fontSize: 38, fontWeight: '600', lineHeight: 42, marginBottom: 12 },
  lead: { color: '#819087', fontSize: 15, lineHeight: 23, marginBottom: 22 },
  sectionTitle: { color: '#27483d', fontSize: 17, fontWeight: '800', marginTop: 20, marginBottom: 12 },
  tierCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e4e5dc', marginBottom: 11 },
  tierCardCurrent: { borderColor: '#a8c66d', borderWidth: 2 },
  tierAccent: { width: 5 },
  tierBody: { flex: 1, padding: 15 },
  tierTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierName: { color: '#27483d', fontSize: 19, fontWeight: '800' },
  tierPrice: { color: '#526f35', fontSize: 15, fontWeight: '800' },
  tierSupport: { color: '#bd8068', fontSize: 12, fontWeight: '700', marginTop: 3 },
  tierPerks: { marginTop: 9, gap: 4 },
  tierPerk: { color: '#53665d', fontSize: 12, lineHeight: 19 },
  tierCurrent: { color: '#66833d', fontSize: 11, fontWeight: '800', marginTop: 10 },
  tierCta: { color: '#66833d', fontSize: 12, fontWeight: '700', marginTop: 10 },
  fundCard: { backgroundColor: '#2d4a3e', borderRadius: 14, padding: 18, marginTop: 20 },
  fundKicker: { color: '#d8f27c', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 8 },
  fundTitle: { color: '#fff', fontSize: 21, fontWeight: '800', lineHeight: 27, marginBottom: 8 },
  fundDescription: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 20 },
  fundRules: { marginTop: 14, gap: 10 },
  fundRule: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 11 },
  fundRuleTitle: { color: '#fff', fontSize: 12, fontWeight: '800', marginBottom: 3 },
  fundRuleDescription: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 17 },
  exampleCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e4e5dc', padding: 16 },
  exampleTitle: { color: '#27483d', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  exampleRows: { gap: 7 },
  exampleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exampleLabel: { color: '#53665d', fontSize: 13 },
  exampleValue: { color: '#27483d', fontSize: 13, fontWeight: '700' },
  exampleHighlight: { color: '#526f35' },
  exampleBold: { fontWeight: '800' },
  exampleDivider: { height: 1, backgroundColor: '#e4e5dc', marginVertical: 5 },
  exampleNote: { color: '#819087', fontSize: 11, lineHeight: 17, marginTop: 12 },
  sourceRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  sourceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#a8c66d', marginTop: 5 },
  sourceCopy: { flex: 1 },
  sourceName: { color: '#27483d', fontSize: 13, fontWeight: '800' },
  sourceDescription: { color: '#819087', fontSize: 12, lineHeight: 18, marginTop: 2 },
  principle: { color: '#526f35', fontSize: 12, fontWeight: '700', backgroundColor: '#e7f0d8', borderRadius: 8, padding: 12, marginTop: 6, lineHeight: 18 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 9 },
  phaseNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#27483d', alignItems: 'center', justifyContent: 'center' },
  phaseNumberText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  phaseText: { flex: 1, color: '#53665d', fontSize: 13, lineHeight: 19 },
  metricsCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e4e5dc', padding: 14 },
  metricRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f0f2ec' },
  metricName: { color: '#27483d', fontSize: 13, fontWeight: '800' },
  metricDescription: { color: '#819087', fontSize: 11, marginTop: 2 },
  principleCard: { backgroundColor: '#e8f0d9', borderRadius: 12, padding: 16, marginTop: 22 },
  principleCardTitle: { color: '#27483d', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  principleCardText: { color: '#53665d', fontSize: 12, lineHeight: 19 },
});
