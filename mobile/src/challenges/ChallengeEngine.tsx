import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Challenge, ChallengeCategoryKey, categoryFor, challengeCategories, challenges, formatPrice } from './challengeEngineData';

type Props = {
  onInvite: () => void;
  membershipTier: string;
};

export function ChallengeEngineScreen({ onInvite, membershipTier }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<ChallengeCategoryKey | 'all'>('all');
  const [selected, setSelected] = useState<Challenge | null>(null);

  const visibleChallenges = useMemo(
    () => categoryFilter === 'all' ? challenges : challenges.filter((challenge) => challenge.category === categoryFilter),
    [categoryFilter],
  );
  const featured = useMemo(() => challenges.find((challenge) => challenge.featured) ?? challenges[0], []);

  if (selected) {
    const category = categoryFor(selected.category);
    return <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => setSelected(null)} accessibilityRole="button"><Text style={styles.backLink}>← Alla uppdrag</Text></Pressable>
      <View style={[styles.detailHero, { backgroundColor: category.color }]}>
        <Text style={styles.detailKicker}>UTVALT UPPDRAG</Text>
        <Text style={styles.detailLevel}>Nivå {selected.level} · {category.label}</Text>
        <Text style={styles.detailTitle}>{selected.title}</Text>
        <Text style={styles.detailDescription}>{selected.description}</Text>
      </View>
      <View style={styles.detailMetaRow}>
        <View style={styles.detailMeta}><Text style={styles.metaLabel}>VARIGHET</Text><Text style={styles.metaValue}>{selected.durationMinutes} min</Text></View>
        <View style={styles.detailMeta}><Text style={styles.metaLabel}>MEDLEMSPRIS</Text><Text style={styles.metaValue}>{formatPrice(selected.memberPriceSek)}</Text></View>
        <View style={styles.detailMeta}><Text style={styles.metaLabel}>PLATS</Text><Text style={styles.metaValue}>{selected.area}</Text></View>
      </View>
      <Text style={styles.detailPartner}>Hos {selected.partner} · {selected.area}</Text>
      <View style={styles.goalCard}>
        <Text style={styles.goalLabel}>MÅLET</Text>
        <Text style={styles.goalText}>{selected.goal}</Text>
        <Text style={styles.goalLabel}>BELÖNING</Text>
        <Text style={styles.rewardText}>{selected.reward}</Text>
      </View>
      <Text style={styles.sectionTitle}>Så fungerar uppdraget</Text>
      {selected.stages.map((stage) => (
        <View key={stage.number} style={styles.stageRow}>
          <View style={styles.stageMarkerWrap}>
            <View style={[styles.stageMarker, { backgroundColor: category.color }]}><Text style={styles.stageMarkerText}>{stage.number}</Text></View>
            {stage.number < selected.stages.length && <View style={styles.stageLine} />}
          </View>
          <View style={styles.stageCopy}>
            <Text style={styles.stageTitle}>Steg {stage.number} – {stage.title}</Text>
            <Text style={styles.stageDescription}>{stage.description}</Text>
          </View>
        </View>
      ))}
      <Pressable style={styles.primary} onPress={onInvite} accessibilityRole="button"><Text style={styles.primaryText}>Bjud in en match  →</Text></Pressable>
      <Text style={styles.safetyNote}>Ni båda bekräftar uppdraget innan det bokas. Avboka kostnadsfritt fram till 24 timmar innan.</Text>
    </ScrollView>;
  }

  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.kicker}>UPPDRAG</Text>
    <Text style={styles.title}>En anledning att ses.</Text>
    <Text style={styles.lead}>Uppdrag är upplevelser med ett mål, flera steg och en belöning — skapade för att göras tillsammans. Med ditt {membershipTier === 'free' ? 'Free' : membershipTier === 'plus' ? 'Plus' : membershipTier === 'premium' ? 'Premium' : 'Adventure'}-medlemskap ser du medlemspriser och tillgängliga uppdrag.</Text>

    <Pressable style={[styles.featuredCard, { backgroundColor: categoryFor(featured.category).color }]} onPress={() => setSelected(featured)} accessibilityRole="button">
      <View style={styles.featuredTop}><Text style={styles.featuredKicker}>UTVALT UPPDRAG</Text><Text style={styles.featuredLevel}>Nivå {featured.level} · {categoryFor(featured.category).label}</Text></View>
      <Text style={styles.featuredTitle}>{featured.title}</Text>
      <Text style={styles.featuredDescription}>{featured.description}</Text>
      <View style={styles.featuredMeta}>
        <Text style={styles.featuredMetaText}>{featured.stages.length} steg</Text>
        <Text style={styles.featuredMetaText}>{featured.durationMinutes} min</Text>
        <Text style={styles.featuredMetaText}>{formatPrice(featured.memberPriceSek)}</Text>
      </View>
      <View style={styles.featuredCta}><Text style={styles.featuredCtaText}>Se uppdraget  →</Text></View>
    </Pressable>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
      <Pressable style={[styles.categoryChip, categoryFilter === 'all' && styles.categoryChipActive]} onPress={() => setCategoryFilter('all')} accessibilityRole="button">
        <Text style={[styles.categoryChipText, categoryFilter === 'all' && styles.categoryChipTextActive]}>Alla</Text>
      </Pressable>
      {challengeCategories.map((category) => (
        <Pressable key={category.key} style={[styles.categoryChip, categoryFilter === category.key && styles.categoryChipActive]} onPress={() => setCategoryFilter(categoryFilter === category.key ? 'all' : category.key)} accessibilityRole="button">
          <Text style={styles.categoryChipIcon}>{category.icon}</Text>
          <Text style={[styles.categoryChipText, categoryFilter === category.key && styles.categoryChipTextActive]}>{category.label}</Text>
        </Pressable>
      ))}
    </ScrollView>

    <View style={styles.grid}>
      {visibleChallenges.map((challenge) => {
        const category = categoryFor(challenge.category);
        return <Pressable key={challenge.id} style={styles.missionCard} onPress={() => setSelected(challenge)} accessibilityRole="button">
          <View style={[styles.missionAccent, { backgroundColor: category.color }]} />
          <View style={styles.missionBody}>
            <View style={styles.missionTop}>
              <Text style={[styles.missionCategory, { color: category.color }]}>{category.icon}  {category.label} · Nivå {challenge.level}</Text>
              <Text style={styles.missionPrice}>{formatPrice(challenge.memberPriceSek)}</Text>
            </View>
            <Text style={styles.missionTitle}>{challenge.title}</Text>
            <Text style={styles.missionDescription} numberOfLines={2}>{challenge.description}</Text>
            <Text style={styles.missionMeta}>{challenge.stages.length} steg · {challenge.durationMinutes} min · {challenge.partner}, {challenge.area}</Text>
          </View>
        </Pressable>;
      })}
    </View>

    <View style={styles.howCard}>
      <Text style={styles.howTitle}>Hur ett uppdrag fungerar</Text>
      <Text style={styles.howStep}>1. Välj ett uppdrag och bjud in en match.</Text>
      <Text style={styles.howStep}>2. Ni båda bekräftar tid och plats hos partnern.</Text>
      <Text style={styles.howStep}>3. Genomför stegen tillsammans — kommunikation är en del av målet.</Text>
      <Text style={styles.howStep}>4. Samla credits och välj om ni vill fortsätta med nästa uppdrag.</Text>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 44 },
  kicker: { color: '#9ba49b', fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginBottom: 14 },
  title: { color: '#27483d', fontSize: 38, fontWeight: '600', lineHeight: 42, marginBottom: 12 },
  lead: { color: '#819087', fontSize: 15, lineHeight: 23, marginBottom: 20 },
  featuredCard: { borderRadius: 14, padding: 20, marginBottom: 18 },
  featuredTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  featuredKicker: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  featuredLevel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700' },
  featuredTitle: { color: '#fff', fontSize: 27, fontWeight: '700', lineHeight: 32, marginBottom: 8 },
  featuredDescription: { color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 20 },
  featuredMeta: { flexDirection: 'row', gap: 12, marginTop: 14 },
  featuredMetaText: { color: '#fff', fontSize: 12, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  featuredCta: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 7, paddingHorizontal: 14, paddingVertical: 10 },
  featuredCtaText: { color: '#27483d', fontSize: 13, fontWeight: '800' },
  categoryRow: { gap: 8, paddingVertical: 4, marginBottom: 10 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#dce2d6', backgroundColor: '#fff', borderRadius: 7, paddingHorizontal: 11, paddingVertical: 9 },
  categoryChipActive: { borderColor: '#a8c66d', backgroundColor: '#e7f0d8' },
  categoryChipIcon: { fontSize: 12, color: '#526f35' },
  categoryChipText: { color: '#7d8b82', fontSize: 12, fontWeight: '600' },
  categoryChipTextActive: { color: '#526f35', fontWeight: '800' },
  grid: { gap: 12 },
  missionCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e4e5dc' },
  missionAccent: { width: 5 },
  missionBody: { flex: 1, padding: 15 },
  missionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  missionCategory: { fontSize: 11, fontWeight: '800' },
  missionPrice: { color: '#bd8068', fontSize: 12, fontWeight: '800' },
  missionTitle: { color: '#27483d', fontSize: 19, fontWeight: '700', marginBottom: 4 },
  missionDescription: { color: '#53645a', fontSize: 13, lineHeight: 19 },
  missionMeta: { color: '#819087', fontSize: 11, marginTop: 9, fontWeight: '600' },
  howCard: { backgroundColor: '#e8f0d9', borderRadius: 12, padding: 16, marginTop: 18 },
  howTitle: { color: '#27483d', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  howStep: { color: '#53665d', fontSize: 13, lineHeight: 22 },
  backLink: { color: '#66833d', fontSize: 13, fontWeight: '700', marginBottom: 14 },
  detailHero: { borderRadius: 14, padding: 20 },
  detailKicker: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10 },
  detailLevel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  detailTitle: { color: '#fff', fontSize: 30, fontWeight: '700', lineHeight: 35, marginBottom: 10 },
  detailDescription: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 21 },
  detailMetaRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  detailMeta: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e5dc', borderRadius: 10, padding: 12 },
  metaLabel: { color: '#9ba49b', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  metaValue: { color: '#27483d', fontSize: 15, fontWeight: '800', marginTop: 4 },
  detailPartner: { color: '#66833d', fontSize: 13, fontWeight: '700', marginTop: 12 },
  goalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginTop: 14, marginBottom: 18 },
  goalLabel: { color: '#9ba49b', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 5, marginTop: 6 },
  goalText: { color: '#27483d', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  rewardText: { color: '#bd8068', fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: '#27483d', fontSize: 17, fontWeight: '800', marginBottom: 14 },
  stageRow: { flexDirection: 'row', marginBottom: 4 },
  stageMarkerWrap: { width: 34, alignItems: 'center' },
  stageMarker: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stageMarkerText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stageLine: { width: 2, flex: 1, backgroundColor: '#dce2d6', marginVertical: 3 },
  stageCopy: { flex: 1, paddingBottom: 20, paddingLeft: 4 },
  stageTitle: { color: '#27483d', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  stageDescription: { color: '#53665d', fontSize: 13, lineHeight: 19 },
  primary: { backgroundColor: '#27483d', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 14 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  safetyNote: { color: '#8a978e', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 14 },
});
