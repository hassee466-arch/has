import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ageFromDateOfBirth, activityCategories, normalizeDateOfBirth, ProfileJourney, profileJourneySteps } from './profileJourneyData';

type ProfileBasics = {
  display_name: string;
  age: number | null;
  city: string;
  profession: string;
  bio: string;
  image_urls: string[];
  is_visible: boolean;
};

type ProfileField = keyof ProfileBasics;
type UpdateJourney = <K extends keyof ProfileJourney>(section: K, value: ProfileJourney[K]) => void;

type Props = {
  profile: ProfileBasics;
  journey: ProfileJourney;
  email: string;
  emailVerified: boolean;
  saveError: string;
  saving: boolean;
  onUpdateProfile: (field: ProfileField, value: ProfileBasics[ProfileField]) => void;
  onUpdateJourney: UpdateJourney;
  onPickImage: () => void;
  onSave: (step: number) => Promise<boolean>;
  onComplete: () => void;
  onLogout: () => void;
  chatColor: string;
  onUpdateChatColor: (color: string) => void;
};

const genderOptions = ['Kvinna', 'Man', 'Icke-binär', 'Annat'];
const intentionOptions = ['Seriöst förhållande', 'Långsiktigt', 'Dejta utan stress', 'Vänskap först', 'Lära känna nya', 'Öppet för vad som händer'];
const qualityOptions = ['Ärlighet', 'Lojalitet', 'Humor', 'Ambition', 'Vänlighet', 'Kommunikation', 'Mognad'];
const challengeOptions = ['Lugna', 'Roliga', 'Romantiska', 'Utomhus', 'Tävlingsinriktade', 'Kreativa', 'Överraskande'];
const availabilityOptions = ['Vardagsmorgon', 'Vardagskväll', 'Fredag kväll', 'Lördag', 'Söndag'];
const budgetOptions = ['0–100 kr', '100–200 kr', '200–400 kr', '400–600 kr', 'Flexibelt'];
const chatColorOptions = [
  { color: '#f1d8cc', label: 'Rosa', emoji: '🌸' },
  { color: '#d4e5f7', label: 'Blå', emoji: '💙' },
  { color: '#e7f0d8', label: 'Grön', emoji: '🌿' },
  { color: '#f5eadf', label: 'Beige', emoji: '🤎' },
  { color: '#e8e0f0', label: 'Lila', emoji: '💜' },
  { color: '#f7e8e8', label: 'Korall', emoji: '🧡' },
];

export function ProfileJourneyScreen({ profile, journey, email, emailVerified, saveError, saving, onUpdateProfile, onUpdateJourney, onPickImage, onSave, onComplete, onLogout, chatColor, onUpdateChatColor }: Props) {
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState('');
  const [finished, setFinished] = useState(false);

  const toggle = (values: string[], value: string) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  const validateStep = () => {
    if (step === 0) {
      const age = ageFromDateOfBirth(journey.personal.dateOfBirth);
      if (!profile.display_name.trim() || !profile.city.trim() || !journey.personal.gender || !journey.personal.interestedIn.length) return 'Fyll i namn, stad, kön och vem du vill träffa.';
      if (age === null) return 'Ange födelsedatum som ÅÅÅÅ-MM-DD.';
      if (age < 0) return 'Födelsedatumet kan inte ligga i framtiden.';
      if (age < 18) return 'Jannahu är endast för personer som har fyllt 18 år.';
    }
    if (step === 1 && (!profile.image_urls.length || !profile.bio.trim())) return 'Lägg till en profilbild och en kort introduktion.';
    if (step === 2 && Object.values(journey.personality).some((answer) => !answer)) return 'Besvara varje fråga för att fortsätta.';
    if (step === 3 && !journey.intentions.goals.length) return 'Välj minst en dejtingintention.';
    if (step === 4 && journey.activities.length < 3) return 'Välj minst tre aktiviteter du tycker om.';
    if (step === 5 && !journey.challenges.types.length) return 'Välj minst en typ av utmaning.';
    if (step === 7) {
      if (journey.partner.ageMin < 18 || journey.partner.ageMax > 100 || journey.partner.ageMin > journey.partner.ageMax) return 'Kontrollera åldersspannet. Alla du kan träffa måste vara 18+.';
      if (!journey.partner.genders.length) return 'Välj vem du vill upptäcka.';
    }
    if (step === 8 && (!journey.availability.times.length || !journey.availability.budget)) return 'Välj när du kan ses och en ungefärlig dejtbudget.';
    if (step === 9 && !emailVerified) return 'Verifiera din e-postadress innan du slutför profilen.';
    if (step === 9 && (!journey.safety.adultConfirmed || !journey.safety.guidelinesAccepted)) return 'Bekräfta att du är 18+ och godkänn communityreglerna.';
    return '';
  };

  const continueStep = async () => {
    const error = validateStep();
    setStepError(error);
    if (error) return;
    const saved = await onSave(step);
    if (!saved) return;
    if (step === profileJourneySteps.length - 1) {
      setFinished(true);
      return;
    }
    setStep((current) => current + 1);
  };

  const goBack = () => {
    setStepError('');
    setStep((current) => Math.max(0, current - 1));
  };

  const updateBirthDate = (value: string) => {
    const normalized = normalizeDateOfBirth(value);
    onUpdateJourney('personal', { ...journey.personal, dateOfBirth: normalized ?? value });
    const age = normalized ? ageFromDateOfBirth(normalized) : null;
    if (age !== null) onUpdateProfile('age', age);
  };

  const pickGender = (value: string, selected: string[]) => onUpdateJourney('personal', { ...journey.personal, [selected === journey.personal.interestedIn ? 'interestedIn' : 'gender']: value });
  const patchPersonal = (field: keyof ProfileJourney['personal'], value: string | string[]) => onUpdateJourney('personal', { ...journey.personal, [field]: value });
  const patchPersonality = (field: keyof ProfileJourney['personality'], value: string) => onUpdateJourney('personality', { ...journey.personality, [field]: value });
  const patchIntentions = (field: keyof ProfileJourney['intentions'], value: string[]) => onUpdateJourney('intentions', { ...journey.intentions, [field]: value });
  const patchLifestyle = (field: keyof ProfileJourney['lifestyle'], value: string | string[] | boolean) => onUpdateJourney('lifestyle', { ...journey.lifestyle, [field]: value });
  const patchPartner = (field: keyof ProfileJourney['partner'], value: number | string[]) => onUpdateJourney('partner', { ...journey.partner, [field]: value });
  const patchAvailability = (field: keyof ProfileJourney['availability'], value: string | string[]) => onUpdateJourney('availability', { ...journey.availability, [field]: value });
  const enteredAge = ageFromDateOfBirth(journey.personal.dateOfBirth);
  const birthDateHint = !journey.personal.dateOfBirth
    ? 'Ange t.ex. 23/05/1990 eller 1990-05-23. Datumet visas aldrig.'
    : enteredAge === null
      ? journey.personal.dateOfBirth.length < 8
        ? 'Du kan skriva DD/MM/ÅÅÅÅ eller ÅÅÅÅ-MM-DD.'
        : 'Datumet känns ogiltigt. Kontrollera dag, månad och år.'
    : enteredAge < 18
      ? enteredAge < 0 ? 'Födelsedatumet kan inte ligga i framtiden.' : `Du är ${enteredAge} år. Du måste ha fyllt 18 år.`
      : `${enteredAge} år · ditt födelsedatum visas aldrig`;

  if (finished) return <ScrollView contentContainerStyle={styles.finished}>
    <Text style={styles.finishedMark}>✓</Text>
    <Text style={styles.eyebrow}>DIN PROFIL ÄR KLAR</Text>
    <Text style={styles.finishedTitle}>Nu börjar det verkliga mötet. 🎉</Text>
    <Text style={styles.body}>Vi använder dina intressen, din personlighet och när du kan ses för att hitta utmaningar som passar dig.</Text>
    <Pressable style={styles.primary} onPress={onComplete}><Text style={styles.primaryText}>Upptäck Jannahu  →</Text></Pressable>
    <Pressable onPress={onLogout}><Text style={styles.logout}>Logga ut</Text></Pressable>
  </ScrollView>;

  return <View style={styles.screen}>
    <View style={styles.progressHeader}>
      <View style={styles.progressCopy}><Text style={styles.eyebrow}>SKAPA DIN PROFIL</Text><Text style={styles.stepCount}>STEG {step + 1} AV {profileJourneySteps.length}</Text></View>
      <Text style={styles.stepName}>{profileJourneySteps[step]}</Text>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((step + 1) / profileJourneySteps.length) * 100}%` }]} /></View>
    </View>

    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {step === 0 && <>
        <StepHeading number="01" title="Börja med dig." description="Det viktigaste för att skapa en trygg och relevant matchning." />
        <Field label="Förnamn"><TextInput style={styles.input} value={profile.display_name} onChangeText={(value) => onUpdateProfile('display_name', value)} placeholder="Ditt förnamn" autoCapitalize="words" /></Field>
        <Field label="Födelsedatum"><TextInput style={styles.input} value={journey.personal.dateOfBirth} onChangeText={updateBirthDate} placeholder="t.ex. 23/05/1990" keyboardType="numbers-and-punctuation" maxLength={10} /><Text style={styles.fieldHint}>{birthDateHint}</Text></Field>
        <Field label="Kön"><OptionSet options={genderOptions} selected={journey.personal.gender ? [journey.personal.gender] : []} onChange={(values) => patchPersonal('gender', values[0] ?? '')} /></Field>
        <Field label="Jag är intresserad av"><OptionSet options={genderOptions} selected={journey.personal.interestedIn} onChange={(values) => patchPersonal('interestedIn', values)} multiple /></Field>
        <View style={styles.twoFields}><Field label="Stad" style={styles.flexField}><TextInput style={styles.input} value={profile.city} onChangeText={(value) => onUpdateProfile('city', value)} placeholder="Stockholm" /></Field><Field label="Yrke (valfritt)" style={styles.flexField}><TextInput style={styles.input} value={profile.profession} onChangeText={(value) => onUpdateProfile('profession', value)} placeholder="Vad gör du?" /></Field></View>
        <View style={styles.twoFields}><Field label="Nationalitet (valfritt)" style={styles.flexField}><TextInput style={styles.input} value={journey.personal.nationality} onChangeText={(value) => patchPersonal('nationality', value)} placeholder="Sverige" /></Field><Field label="Språk (valfritt)" style={styles.flexField}><TextInput style={styles.input} value={journey.personal.languages} onChangeText={(value) => patchPersonal('languages', value)} placeholder="Svenska, engelska" /></Field></View>
      </>}

      {step === 1 && <>
        <StepHeading number="02" title="Ett ansikte. Din röst." description="Visa lite av hur det känns att möta dig." />
        <Field label={`Bilder · ${profile.image_urls.length} av 7`}><View style={styles.photoGrid}>{profile.image_urls.map((uri, index) => <View key={`${uri}-${index}`} style={styles.photoCell}><Image source={{ uri }} style={styles.photo} /><Text style={styles.photoCaption}>{index === 0 ? 'Huvudbild' : `Bild ${index + 1}`}</Text></View>)}{profile.image_urls.length < 7 && <Pressable style={styles.addPhoto} onPress={onPickImage}><Text style={styles.addPhotoIcon}>＋</Text><Text style={styles.addPhotoText}>{profile.image_urls.length ? 'Lägg till bild' : 'Välj huvudbild'}</Text></Pressable>}</View></Field>
        <Field label={`Kort introduktion · ${profile.bio.length} av 300`}><TextInput style={[styles.input, styles.bioInput]} value={profile.bio} onChangeText={(value) => onUpdateProfile('bio', value)} placeholder="Vad tycker du om att prata om, upptäcka eller göra?" multiline maxLength={300} textAlignVertical="top" /></Field>
        <Field label="Videointroduktion (valfritt)"><TextInput style={styles.input} value={journey.introduction.videoUrl} onChangeText={(value) => onUpdateJourney('introduction', { ...journey.introduction, videoUrl: value })} placeholder="Länk till din video" autoCapitalize="none" keyboardType="url" /></Field>
        <Field label="Röstintroduktion (valfritt)"><TextInput style={styles.input} value={journey.introduction.voiceUrl} onChangeText={(value) => onUpdateJourney('introduction', { ...journey.introduction, voiceUrl: value })} placeholder="Länk till ditt röstklipp" autoCapitalize="none" keyboardType="url" /></Field>
        <Field label="Chattfärg"><View style={styles.colorRow}>{chatColorOptions.map((option) => <Pressable key={option.color} style={[styles.colorOption, chatColor === option.color && styles.colorOptionActive]} onPress={() => onUpdateChatColor(option.color)}><View style={[styles.colorSwatch, { backgroundColor: option.color }]} /><Text style={[styles.colorLabel, chatColor === option.color && styles.colorLabelActive]}>{option.emoji} {option.label}</Text></Pressable>)}</View></Field>
      </>}

      {step === 2 && <>
        <StepHeading number="03" title="Hur känns du?" description="Det finns inga rätt svar. Välj det som brukar stämma." />
        <Field label="I ett nytt sällskap är jag oftast"><OptionSet options={['Lyssnar in', 'Tar gärna initiativ', 'Lite av båda']} selected={[journey.personality.socialStyle]} onChange={(values) => patchPersonality('socialStyle', values[0] ?? '')} /></Field>
        <Field label="En ledig dag planerar jag helst"><OptionSet options={['I förväg', 'Tar dagen som den kommer', 'En blandning']} selected={[journey.personality.planningStyle]} onChange={(values) => patchPersonality('planningStyle', values[0] ?? '')} /></Field>
        <Field label="När något oväntat händer"><OptionSet options={['Blir nyfiken', 'Vill gärna veta mer först', 'Beror på dagen']} selected={[journey.personality.adventure]} onChange={(values) => patchPersonality('adventure', values[0] ?? '')} /></Field>
        <Field label="Jag gillar tävlingar"><OptionSet options={['Ja, ge mig en utmaning', 'För skojs skull', 'Inte så mycket']} selected={[journey.personality.competition]} onChange={(values) => patchPersonality('competition', values[0] ?? '')} /></Field>
        <Field label="Ett bra samtal har gärna"><OptionSet options={['Djup och eftertanke', 'Humor och lätthet', 'Både och']} selected={[journey.personality.conversation]} onChange={(values) => patchPersonality('conversation', values[0] ?? '')} /></Field>
        <Field label="Att prova något nytt"><OptionSet options={['Gärna ofta', 'Ibland, med rätt person', 'Helst sådant jag känner till']} selected={[journey.personality.novelty]} onChange={(values) => patchPersonality('novelty', values[0] ?? '')} /></Field>
      </>}

      {step === 3 && <>
        <StepHeading number="04" title="Vad hoppas du hitta?" description="Du kan välja flera och ändra när livet ändras." />
        <Field label="Dejtingintentioner"><OptionSet options={intentionOptions} selected={journey.intentions.goals} onChange={(values) => patchIntentions('goals', values)} multiple /></Field>
        <Field label="Vad uppskattar du hos en partner?" hint="Välj egenskaper som betyder något för dig."><OptionSet options={qualityOptions} selected={journey.intentions.qualities} onChange={(values) => patchIntentions('qualities', values)} multiple /></Field>
      </>}

      {step === 4 && <>
        <StepHeading number="05" title="Vad vill du göra tillsammans?" description="Välj aktiviteter som kan bli början på en utmaning." />
        {activityCategories.map((category) => <Field key={category.title} label={category.title}><OptionSet options={category.activities} selected={journey.activities} onChange={(values) => onUpdateJourney('activities', values)} multiple /></Field>)}
        <Text style={styles.selectionCount}>{journey.activities.length} aktiviteter valda · välj minst 3</Text>
      </>}

      {step === 5 && <>
        <StepHeading number="06" title="Vilka utmaningar lockar?" description="Vi använder det här för att föreslå upplevelser som passar din energi." />
        <Field label="Jag skulle tacka ja till"><OptionSet options={challengeOptions} selected={journey.challenges.types} onChange={(values) => onUpdateJourney('challenges', { ...journey.challenges, types: values })} multiple /></Field>
        <Field label="Hur äventyrlig känner du dig?" hint="1 är lugnt tempo · 5 är gärna något helt nytt"><View style={styles.scaleRow}>{[1, 2, 3, 4, 5].map((level) => <Pressable key={level} style={[styles.scaleButton, journey.challenges.adventureLevel === level && styles.scaleButtonActive]} onPress={() => onUpdateJourney('challenges', { ...journey.challenges, adventureLevel: level })} accessibilityRole="radio" accessibilityState={{ checked: journey.challenges.adventureLevel === level }}><Text style={[styles.scaleNumber, journey.challenges.adventureLevel === level && styles.scaleNumberActive]}>{level}</Text></Pressable>)}</View><View style={styles.scaleLabels}><Text style={styles.fieldHint}>Lugnt</Text><Text style={styles.fieldHint}>Äventyrligt</Text></View></Field>
      </>}

      {step === 6 && <>
        <StepHeading number="07" title="Din vardag, på ditt sätt." description="Dela bara det som hjälper er att hitta en bra upplevelse." />
        <Field label="Rökning"><OptionSet options={['Rökfri', 'Ibland', 'Röker', 'Vill inte ange']} selected={[journey.lifestyle.smoking]} onChange={(values) => patchLifestyle('smoking', values[0] ?? '')} /></Field>
        <Field label="Alkohol"><OptionSet options={['Aldrig', 'Ibland', 'Ofta', 'Vill inte ange']} selected={[journey.lifestyle.alcohol]} onChange={(values) => patchLifestyle('alcohol', values[0] ?? '')} /></Field>
        <Field label="Motion"><OptionSet options={['Flera gånger i veckan', 'Ibland', 'Promenader räcker', 'Inte min grej']} selected={[journey.lifestyle.exercise]} onChange={(values) => patchLifestyle('exercise', values[0] ?? '')} /></Field>
        <Field label="Djur"><OptionSet options={['Har husdjur', 'Tycker om djur', 'Allergisk', 'Vill inte ange']} selected={[journey.lifestyle.pets]} onChange={(values) => patchLifestyle('pets', values[0] ?? '')} /></Field>
        <Field label="Resor"><OptionSet options={['Så ofta jag kan', 'Några gånger om året', 'Gillar bäst nära hemmet']} selected={[journey.lifestyle.travel]} onChange={(values) => patchLifestyle('travel', values[0] ?? '')} /></Field>
        <Field label="Socialt tempo"><OptionSet options={['Många planer och människor', 'Små sällskap', 'Lugn och ro', 'Lite av varje']} selected={[journey.lifestyle.social]} onChange={(values) => patchLifestyle('social', values[0] ?? '')} /></Field>
        <Field label="En ledig helg"><OptionSet options={['Lugn hemma', 'Träffa vänner', 'Ut på äventyr', 'Lite av varje']} selected={journey.lifestyle.weekends} onChange={(values) => patchLifestyle('weekends', values)} multiple /></Field>
        <Field label="Sömnrytm (valfritt)"><OptionSet options={['Morgonpigg', 'Kvällsmänniska', 'Varierar']} selected={[journey.lifestyle.sleep]} onChange={(values) => patchLifestyle('sleep', values[0] ?? '')} /></Field>
        <View style={styles.privacyRow}><View style={styles.privacyCopy}><Text style={styles.fieldLabel}>Visa livsstil på min profil</Text><Text style={styles.fieldHint}>När avstängd används svaren bara för rekommendationer.</Text></View><Toggle value={journey.lifestyle.visible} onChange={(value) => patchLifestyle('visible', value)} label="Visa livsstil" /></View>
      </>}

      {step === 7 && <>
        <StepHeading number="08" title="Vem vill du möta?" description="Preferenser hjälper oss att sortera, men du kan alltid fortsätta upptäcka." />
        <View style={styles.twoFields}><Field label="Ålder från" style={styles.flexField}><TextInput style={styles.input} value={String(journey.partner.ageMin)} onChangeText={(value) => patchPartner('ageMin', value ? Number(value) : 18)} keyboardType="number-pad" /></Field><Field label="Ålder till" style={styles.flexField}><TextInput style={styles.input} value={String(journey.partner.ageMax)} onChangeText={(value) => patchPartner('ageMax', value ? Number(value) : 18)} keyboardType="number-pad" /></Field></View>
        <Field label={`Avstånd · ${journey.partner.distanceKm} km`}><View style={styles.scaleRow}>{[10, 25, 50, 100].map((distance) => <Pressable key={distance} style={[styles.distanceButton, journey.partner.distanceKm === distance && styles.optionActive]} onPress={() => patchPartner('distanceKm', distance)}><Text style={[styles.optionText, journey.partner.distanceKm === distance && styles.optionTextActive]}>{distance} km</Text></Pressable>)}</View></Field>
        <Field label="Jag vill träffa"><OptionSet options={genderOptions} selected={journey.partner.genders} onChange={(values) => patchPartner('genders', values)} multiple /></Field>
        <Field label="Dejtingintentioner"><OptionSet options={intentionOptions} selected={journey.partner.intentions} onChange={(values) => patchPartner('intentions', values)} multiple /></Field>
        <Field label="Gemensamma aktiviteter"><OptionSet options={activityCategories.flatMap((category) => category.activities)} selected={journey.partner.sharedInterests} onChange={(values) => patchPartner('sharedInterests', values)} multiple /></Field>
        <Field label="Livsstil (valfritt)"><OptionSet options={['Rökfri', 'Aktiv', 'Gillar djur', 'Resvan', 'Social', 'Lugnt tempo']} selected={journey.partner.lifestyle} onChange={(values) => patchPartner('lifestyle', values)} multiple /></Field>
      </>}

      {step === 8 && <>
        <StepHeading number="09" title="När och hur vill du ses?" description="Så kan vi föreslå utmaningar som passar kalendern och plånboken." />
        <Field label="När brukar du kunna ses?"><OptionSet options={availabilityOptions} selected={journey.availability.times} onChange={(values) => patchAvailability('times', values)} multiple /></Field>
        <Field label="En vanlig dejtbudget"><OptionSet options={budgetOptions} selected={[journey.availability.budget]} onChange={(values) => patchAvailability('budget', values[0] ?? '')} /></Field>
      </>}

      {step === 9 && <>
        <StepHeading number="10" title="Trygghet först." description="Det här hjälper oss hålla Jannahu tryggt och respektfullt." />
        <View style={styles.verificationRow}><View style={styles.verificationMark}>{emailVerified ? '✓' : '!'}</View><View style={styles.verificationCopy}><Text style={styles.verificationTitle}>{emailVerified ? 'E-post verifierad' : 'E-post inte verifierad'}</Text><Text style={styles.fieldHint}>{email || 'Verifiera e-postadressen för att stärka kontot.'}</Text></View><Text style={emailVerified ? styles.statusDone : styles.statusPending}>{emailVerified ? 'KLAR' : 'VÄNTAR'}</Text></View>
        <View style={styles.verificationRow}><View style={styles.verificationMarkPending}>·</View><View style={styles.verificationCopy}><Text style={styles.verificationTitle}>Identitetsverifiering (BankID / pass)</Text><Text style={styles.fieldHint}>Kontot aktiveras först när leverantören bekräftar din identitet. Svenska medlemmar kan använda BankID; internationella medlemmar använder pass eller nationellt id-kort.</Text></View><Text style={styles.statusPending}>KRÄVS</Text></View>
        <CheckRow checked={journey.safety.adultConfirmed} onPress={() => onUpdateJourney('safety', { ...journey.safety, adultConfirmed: !journey.safety.adultConfirmed })} label="Jag bekräftar att jag har fyllt 18 år." />
        <CheckRow checked={journey.safety.guidelinesAccepted} onPress={() => onUpdateJourney('safety', { ...journey.safety, guidelinesAccepted: !journey.safety.guidelinesAccepted })} label="Jag godkänner communityreglerna och bemöter andra med respekt." />
        <View style={styles.privacyRow}><View style={styles.privacyCopy}><Text style={styles.fieldLabel}>Visa min profil</Text><Text style={styles.fieldHint}>{journey.safety.profileVisible ? 'Synlig för andra medlemmar' : 'Dold tills du väljer att synas'}</Text></View><Toggle value={journey.safety.profileVisible} onChange={(value) => { onUpdateJourney('safety', { ...journey.safety, profileVisible: value }); onUpdateProfile('is_visible', value); }} label="Visa min profil" /></View>
        <Text style={styles.safetyNote}>Födelsedatum, e-postadress och exakta kontaktuppgifter visas aldrig på din profil. Du kan blockera eller rapportera medlemmar när som helst.</Text>
      </>}

      {stepError ? <Text style={styles.error} accessibilityLiveRegion="polite">{stepError}</Text> : null}
      {saveError ? <Text style={styles.error} accessibilityLiveRegion="polite">{saveError}</Text> : null}
    </ScrollView>

    <View style={styles.footer}>
      {step > 0 ? <Pressable style={styles.backButton} onPress={goBack} disabled={saving}><Text style={styles.backText}>Tillbaka</Text></Pressable> : <View style={styles.backPlaceholder} />}
      <Pressable style={[styles.primary, saving && styles.disabled]} onPress={() => void continueStep()} disabled={saving} accessibilityRole="button" accessibilityState={{ disabled: saving }}><Text style={styles.primaryText}>{saving ? 'Sparar…' : step === profileJourneySteps.length - 1 ? 'Skapa min profil  →' : 'Spara och fortsätt  →'}</Text></Pressable>
    </View>
  </View>;
}

function StepHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return <View style={styles.stepHeading}><Text style={styles.stepNumber}>{number}</Text><View style={styles.stepHeadingCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepDescription}>{description}</Text></View></View>;
}

function Field({ label, hint, style, children }: { label: string; hint?: string; style?: object; children: React.ReactNode }) {
  return <View style={[styles.field, style]}><Text style={styles.fieldLabel}>{label}</Text>{children}{hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}</View>;
}

function OptionSet({ options, selected, onChange, multiple = false }: { options: string[]; selected: string[]; onChange: (values: string[]) => void; multiple?: boolean }) {
  const toggle = (option: string) => {
    if (!multiple) {
      onChange(selected[0] === option ? [] : [option]);
      return;
    }
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };
  return <View style={styles.options}>{options.map((option) => {
    const active = selected.includes(option);
    return <Pressable key={option} style={[styles.option, active && styles.optionActive]} onPress={() => toggle(option)} accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={{ checked: active }}><Text style={[styles.optionText, active && styles.optionTextActive]}>{active ? '✓  ' : ''}{option}</Text></Pressable>;
  })}</View>;
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  return <Pressable style={[styles.toggle, value && styles.toggleActive]} onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }}><View style={[styles.toggleKnob, value && styles.toggleKnobActive]} /></Pressable>;
}

function CheckRow({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return <Pressable style={styles.checkRow} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked }}><View style={[styles.checkbox, checked && styles.checkboxChecked]}><Text style={styles.checkboxMark}>{checked ? '✓' : ''}</Text></View><Text style={styles.checkLabel}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f5ef' },
  progressHeader: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 14, backgroundColor: '#fbfaf7', borderBottomWidth: 1, borderBottomColor: '#e4e5dc' },
  progressCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#9ba49b', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  stepCount: { color: '#66833d', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  stepName: { marginTop: 6, color: '#27483d', fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 4, marginTop: 12, overflow: 'hidden', backgroundColor: '#e4e9df', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#a8c66d' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 30 },
  stepHeading: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  stepNumber: { width: 34, paddingTop: 3, color: '#c47c65', fontSize: 11, fontWeight: '800' },
  stepHeadingCopy: { flex: 1 },
  stepTitle: { color: '#27483d', fontSize: 27, lineHeight: 32, fontWeight: '700' },
  stepDescription: { marginTop: 6, color: '#819087', fontSize: 13, lineHeight: 19 },
  field: { marginBottom: 17 },
  fieldLabel: { color: '#52645a', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  fieldHint: { color: '#89968d', fontSize: 11, lineHeight: 16, marginTop: 6 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#dce2d6', borderRadius: 5, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: '#fff', color: '#27483d', fontSize: 14 },
  bioInput: { minHeight: 100, lineHeight: 20, paddingTop: 12 },
  twoFields: { flexDirection: 'row', gap: 10 },
  flexField: { flex: 1 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { minHeight: 37, justifyContent: 'center', borderWidth: 1, borderColor: '#dce2d6', borderRadius: 5, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: '#fff' },
  optionActive: { borderColor: '#9eb76e', backgroundColor: '#e7f0d8' },
  optionText: { color: '#718077', fontSize: 12, lineHeight: 18 },
  optionTextActive: { color: '#405c39', fontWeight: '700' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCell: { width: '31%', aspectRatio: 0.78, position: 'relative', overflow: 'hidden', borderRadius: 5, backgroundColor: '#e8f0d9' },
  photo: { width: '100%', height: '100%' },
  photoCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 6, paddingVertical: 5, backgroundColor: 'rgba(25,43,35,0.72)', color: '#fff', fontSize: 9, fontWeight: '700' },
  addPhoto: { width: '31%', aspectRatio: 0.78, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#aab89b', borderRadius: 5, backgroundColor: '#f0f4e9' },
  addPhotoIcon: { color: '#66833d', fontSize: 25 },
  addPhotoText: { marginTop: 5, color: '#66833d', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  selectionCount: { color: '#66833d', fontSize: 11, fontWeight: '700', marginTop: 2, marginBottom: 14 },
  scaleRow: { flexDirection: 'row', gap: 7 },
  scaleButton: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dce2d6', borderRadius: 5, backgroundColor: '#fff' },
  scaleButtonActive: { borderColor: '#27483d', backgroundColor: '#27483d' },
  scaleNumber: { color: '#718077', fontSize: 15, fontWeight: '700' },
  scaleNumberActive: { color: '#fff' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  distanceButton: { borderWidth: 1, borderColor: '#dce2d6', borderRadius: 5, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#fff' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: 14, marginTop: 2, borderWidth: 1, borderColor: '#e4e5dc', borderRadius: 5, backgroundColor: '#fff' },
  privacyCopy: { flex: 1 },
  toggle: { width: 46, height: 27, justifyContent: 'center', padding: 3, borderRadius: 14, backgroundColor: '#dce2d6' },
  toggleActive: { backgroundColor: '#a8c66d' },
  toggleKnob: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#fff' },
  toggleKnobActive: { alignSelf: 'flex-end' },
  verificationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: '#e4e5dc', borderRadius: 5, backgroundColor: '#fff' },
  verificationMark: { width: 28, height: 28, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', borderRadius: 14, backgroundColor: '#e7f0d8', color: '#526f35', fontSize: 17, fontWeight: '800' },
  verificationMarkPending: { width: 28, height: 28, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', borderRadius: 14, backgroundColor: '#f3ede1', color: '#a17b50', fontSize: 20, fontWeight: '800' },
  verificationCopy: { flex: 1 },
  verificationTitle: { color: '#27483d', fontSize: 12, fontWeight: '700' },
  statusDone: { color: '#66833d', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  statusPending: { color: '#9b8060', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 13 },
  checkbox: { width: 21, height: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bdc8b7', borderRadius: 4, backgroundColor: '#fff' },
  checkboxChecked: { borderColor: '#66833d', backgroundColor: '#e7f0d8' },
  checkboxMark: { color: '#526f35', fontSize: 14, fontWeight: '800' },
  checkLabel: { flex: 1, color: '#52645a', fontSize: 13, lineHeight: 19 },
  safetyNote: { padding: 13, marginTop: 10, backgroundColor: '#e8f0d9', color: '#52645a', fontSize: 11, lineHeight: 17 },
  error: { color: '#a95f4d', fontSize: 12, lineHeight: 18, marginTop: 2, marginBottom: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 11, paddingBottom: 13, borderTopWidth: 1, borderTopColor: '#e4e5dc', backgroundColor: '#fbfaf7' },
  backPlaceholder: { width: 72 },
  backButton: { minWidth: 72, height: 48, justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#66833d', fontSize: 13, fontWeight: '700' },
  primary: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 5, backgroundColor: '#27483d' },
  primaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  finished: { flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: '#f7f5ef' },
  finishedMark: { width: 50, height: 50, marginBottom: 25, paddingTop: 7, overflow: 'hidden', borderRadius: 25, backgroundColor: '#e7f0d8', color: '#526f35', fontSize: 29, fontWeight: '700', textAlign: 'center' },
  finishedTitle: { marginTop: 12, color: '#27483d', fontSize: 34, lineHeight: 39, fontWeight: '700' },
  body: { marginTop: 12, color: '#718077', fontSize: 14, lineHeight: 22 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#dce2d6', borderRadius: 8, backgroundColor: '#fff' },
  colorOptionActive: { borderColor: '#66833d', backgroundColor: '#e7f0d8' },
  colorSwatch: { width: 24, height: 24, borderRadius: 12 },
  colorLabel: { color: '#718077', fontSize: 12 },
  colorLabelActive: { color: '#405c39', fontWeight: '700' },
  logout: { marginTop: 20, color: '#9b6c61', fontSize: 12, textAlign: 'center', fontWeight: '700' },
});