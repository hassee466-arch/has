import { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Animated, Image, Linking, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableHighlight, useWindowDimensions, View } from 'react-native';
import { supabase } from './src/lib/supabase';
import { ChallengeEngineScreen } from './src/challenges/ChallengeEngine';
import { MembershipScreen } from './src/membership/MembershipScreen';
import { IdentityGate } from './src/verification/IdentityGate';
import { ProfileJourneyScreen } from './src/profile/ProfileJourney';
import { ageFromDateOfBirth, emptyProfileJourney, ProfileJourney } from './src/profile/profileJourneyData';

type Profile = {
  id: string;
  display_name: string;
  age: number | null;
  city: string;
  profession: string;
  bio: string;
  interests: string[];
  image_urls: string[];
  is_visible: boolean;
  looking_for: string;
  lifestyle: { smoking?: string; alcohol?: string; children?: string };
  chat_color?: string;
  chat_panel_color?: string;
  chat_panel_pattern?: ChatPanelPattern;
};

type ChatPanelPattern = 'plain' | 'dots' | 'stripes' | 'hearts' | 'flowers' | 'waves';

type Screen = 'discover' | 'connections' | 'challenges' | 'chat' | 'profile' | 'membership' | 'chatSettings' | 'dateRating';
type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export default function App() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [screen, setScreen] = useState<Screen>('discover');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileJourney, setProfileJourney] = useState<ProfileJourney>(emptyProfileJourney);
  const [profileJourneyError, setProfileJourneyError] = useState('');
  const [matches, setMatches] = useState<Profile[]>([]);
  const [mutualIds, setMutualIds] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [chatTarget, setChatTarget] = useState<Profile | null>(null);
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; sender_id: string; body: string; created_at: string }>>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [membershipTier, setMembershipTier] = useState('free');
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'unverified' | 'verified' | 'pending' | 'manual_review' | 'needs_retry' | 'rejected'>('loading');
  const [chatColor, setChatColor] = useState('#f1d8cc');
  const [chatPanelColor, setChatPanelColor] = useState('#f7f5ef');
  const [chatPanelPattern, setChatPanelPattern] = useState<ChatPanelPattern>('plain');
  const [chatSettings, setChatSettings] = useState({
    notifications: true,
    sound: true,
    readReceipts: true,
    typingIndicator: true,
    onlineStatus: true,
    messagePreview: true,
  });
  const [ratingTarget, setRatingTarget] = useState<Profile | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
        setAuthError('');
        setAuthNotice('Välj ett nytt lösenord för ditt konto.');
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleAuthUrl = async (url: string) => {
      try {
        const parsedUrl = new URL(url);
        const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
        const isRecovery = parsedUrl.searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
        const code = parsedUrl.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (isRecovery) {
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (error) throw error;
          }
        }
        if (isRecovery) {
          setAuthMode('reset');
          setAuthError('');
          setAuthNotice('Välj ett nytt lösenord för ditt konto.');
        }
      } catch (error) {
        setAuthMode('login');
        setAuthError(error instanceof Error ? error.message : 'Återställningslänken kunde inte användas. Begär en ny länk.');
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => { void handleAuthUrl(url); });
    void Linking.getInitialURL().then((url) => { if (url) return handleAuthUrl(url); }).catch(() => undefined);
    return () => subscription.remove();
  }, []);

  async function loadData(userId: string) {
    const columns = 'id, display_name, age, city, profession, bio, interests, image_urls, is_visible, looking_for, lifestyle, chat_color, chat_panel_color, chat_panel_pattern';
    const baseColumns = 'id, display_name, age, city, profession, bio, interests, image_urls, is_visible';
    const initialResults = await Promise.all([
      supabase.from('profiles').select(columns).eq('id', userId).maybeSingle(),
      supabase.from('profiles').select(columns).eq('is_visible', true).neq('id', userId).order('created_at', { ascending: false }),
    ]);
    let ownRow: Partial<Profile> | null = initialResults[0].data;
    let matchRows: Partial<Profile>[] = initialResults[1].data ?? [];
    let loadError = initialResults[0].error ?? initialResults[1].error;
    if (loadError) {
      const fallbackResults = await Promise.all([
        supabase.from('profiles').select(baseColumns).eq('id', userId).maybeSingle(),
        supabase.from('profiles').select(baseColumns).eq('is_visible', true).neq('id', userId).order('created_at', { ascending: false }),
      ]);
      ownRow = fallbackResults[0].data;
      matchRows = fallbackResults[1].data ?? [];
      loadError = fallbackResults[0].error ?? fallbackResults[1].error;
    }
    if (loadError) {
      Alert.alert('Kunde inte läsa profiler', loadError.message);
      return;
    }
    setProfile(ownRow ? {
      id: ownRow.id ?? userId,
      display_name: ownRow.display_name ?? '',
      age: ownRow.age ?? null,
      city: ownRow.city ?? '',
      profession: ownRow.profession ?? '',
      bio: ownRow.bio ?? '',
      interests: ownRow.interests ?? [],
      image_urls: ownRow.image_urls ?? [],
      is_visible: ownRow.is_visible ?? false,
      looking_for: ownRow.looking_for ?? 'Seriöst',
      lifestyle: ownRow.lifestyle ?? {},
      chat_color: ownRow.chat_color ?? '#f1d8cc',
      chat_panel_color: ownRow.chat_panel_color ?? '#f7f5ef',
      chat_panel_pattern: ownRow.chat_panel_pattern ?? 'plain',
    } : {
      id: userId,
      display_name: typeof session?.user.user_metadata?.display_name === 'string' ? session.user.user_metadata.display_name : '',
      age: null,
      city: '',
      profession: '',
      bio: '',
      interests: [],
      image_urls: [],
      is_visible: false,
      looking_for: '',
      lifestyle: {},
      chat_color: '#f1d8cc',
      chat_panel_color: '#f7f5ef',
      chat_panel_pattern: 'plain',
    });
    setChatColor(ownRow?.chat_color ?? '#f1d8cc');
    setChatPanelColor(ownRow?.chat_panel_color ?? '#f7f5ef');
    setChatPanelPattern(ownRow?.chat_panel_pattern ?? 'plain');

    if (ownRow) {
      const journeyResults = await Promise.all([
        supabase.from('profile_personal_details').select('date_of_birth, gender, interested_in, nationality, languages').eq('user_id', userId).maybeSingle(),
        supabase.from('profile_introductions').select('video_url, voice_url').eq('user_id', userId).maybeSingle(),
        supabase.from('profile_personality').select('answers').eq('user_id', userId).maybeSingle(),
        supabase.from('profile_dating_intentions').select('goals, partner_qualities').eq('user_id', userId).maybeSingle(),
        supabase.from('profile_activity_interests').select('activities').eq('user_id', userId).maybeSingle(),
        supabase.from('profile_challenge_preferences').select('challenge_types, adventure_level, interested').eq('user_id', userId).maybeSingle(),
        supabase.from('profile_lifestyle').select('answers, is_public').eq('user_id', userId).maybeSingle(),
        supabase.from('profile_partner_preferences').select('preferences').eq('user_id', userId).maybeSingle(),
        supabase.from('profile_availability').select('available_times, budget, food_preferences, venue_preferences, try_new_activities, first_date_setting').eq('user_id', userId).maybeSingle(),
        supabase.from('profile_safety').select('adult_confirmed, guidelines_accepted, profile_visible').eq('user_id', userId).maybeSingle(),
      ]);
      if (!journeyResults[0].data) setScreen('profile');
      const journeyError = journeyResults.find((result) => result.error)?.error;
      if (journeyError) {
        setProfileJourneyError(`Kunde inte läsa profilen. Kör supabase/mobile-profile-journey.sql först. ${journeyError.message}`);
        setProfileJourney(emptyProfileJourney);
      } else {
        const [personal, introduction, personality, intentions, activities, challenges, lifestyle, partner, availability, safety] = journeyResults.map((result) => result.data ?? {});
        const savedPersonal = personal as { date_of_birth?: string; gender?: string; interested_in?: string[]; nationality?: string; languages?: string };
        const savedIntentions = intentions as { goals?: string[]; partner_qualities?: string[] };
        const savedChallenges = challenges as { challenge_types?: string[]; adventure_level?: number; interested?: boolean };
        const savedLifestyle = lifestyle as { answers?: Partial<ProfileJourney['lifestyle']>; is_public?: boolean };
        const savedPartner = partner as { preferences?: Partial<ProfileJourney['partner']> };
        const savedAvailability = availability as { available_times?: string[]; budget?: string; food_preferences?: string[]; venue_preferences?: string[]; try_new_activities?: string; first_date_setting?: string };
        const savedSafety = safety as { adult_confirmed?: boolean; guidelines_accepted?: boolean; profile_visible?: boolean };
        setProfileJourney({
          ...emptyProfileJourney,
          personal: { dateOfBirth: savedPersonal.date_of_birth ?? '', gender: savedPersonal.gender ?? '', interestedIn: savedPersonal.interested_in ?? [], nationality: savedPersonal.nationality ?? '', languages: savedPersonal.languages ?? '' },
          introduction: { videoUrl: (introduction as { video_url?: string }).video_url ?? '', voiceUrl: (introduction as { voice_url?: string }).voice_url ?? '' },
          personality: { ...emptyProfileJourney.personality, ...((personality as { answers?: Partial<ProfileJourney['personality']> }).answers ?? {}) },
          intentions: { goals: savedIntentions.goals ?? [], qualities: savedIntentions.partner_qualities ?? [] },
          activities: (activities as { activities?: string[] }).activities ?? ownRow.interests ?? [],
          challenges: { types: savedChallenges.challenge_types ?? [], adventureLevel: savedChallenges.adventure_level ?? 3, interested: savedChallenges.interested ?? true },
          lifestyle: { ...emptyProfileJourney.lifestyle, ...(savedLifestyle.answers ?? {}), visible: savedLifestyle.is_public ?? false },
          partner: { ...emptyProfileJourney.partner, ...(savedPartner.preferences ?? {}) },
          availability: { times: savedAvailability.available_times ?? [], budget: savedAvailability.budget ?? '', foodPreferences: savedAvailability.food_preferences ?? [], venuePreferences: savedAvailability.venue_preferences ?? [], tryNewActivities: savedAvailability.try_new_activities ?? '', firstDateSetting: savedAvailability.first_date_setting ?? '' },
          safety: { adultConfirmed: savedSafety.adult_confirmed ?? false, guidelinesAccepted: savedSafety.guidelines_accepted ?? false, profileVisible: savedSafety.profile_visible ?? Boolean(ownRow.is_visible) },
        });
        setProfileJourneyError('');
      }
    } else {
      setScreen('profile');
      setProfileJourney(emptyProfileJourney);
      setProfileJourneyError('');
    }
    setMatches(matchRows.map((row) => ({
      id: row.id ?? '',
      display_name: row.display_name ?? '',
      age: row.age ?? null,
      city: row.city ?? '',
      profession: row.profession ?? '',
      bio: row.bio ?? '',
      interests: row.interests ?? [],
      image_urls: row.image_urls ?? [],
      is_visible: row.is_visible ?? true,
      looking_for: row.looking_for ?? 'Seriöst',
      lifestyle: row.lifestyle ?? {},
    })));
    const [actions, incomingLikes] = await Promise.all([
      supabase.from('match_actions').select('target_id').eq('actor_id', userId).eq('action', 'like'),
      supabase.from('match_actions').select('actor_id').eq('target_id', userId).eq('action', 'like'),
    ]);
    if (!actions.error && !incomingLikes.error) {
      const outgoingIds = (actions.data ?? []).map((row) => row.target_id);
      const incomingIds = new Set((incomingLikes.data ?? []).map((row) => row.actor_id));
      setMutualIds(outgoingIds.filter((id) => incomingIds.has(id)));
    }
    const blocks = await supabase.from('blocked_profiles').select('blocked_id').eq('blocker_id', userId);
    if (!blocks.error) setBlockedIds((blocks.data ?? []).map((row) => row.blocked_id));
    const verification = await supabase.from('identity_verifications').select('status').eq('user_id', userId).maybeSingle();
    if (verification.error) {
      setVerificationStatus('unverified');
    } else if (!verification.data) {
      setVerificationStatus('unverified');
    } else {
      setVerificationStatus(verification.data.status as typeof verificationStatus);
    }
    setMatchIndex(0);
  }

  useEffect(() => {
    if (!session) return;
    // Profile data must synchronize after the persisted auth session is restored.
    // eslint-disable-next-line react/set-state-in-effect
    void loadData(session.user.id);
  }, [session]);

  const submitAuth = async () => {
    if (authSubmitting) return;
    setAuthError('');
    setAuthNotice('');
    if (!email.trim().includes('@') || (authMode !== 'forgot' && password.length < 6) || (authMode === 'signup' && !name.trim())) {
      setAuthError(authMode === 'signup' ? 'Fyll i namn, e-post och minst 6 tecken lösenord.' : authMode === 'forgot' ? 'Ange en giltig e-postadress.' : 'Ange giltig e-post och minst 6 tecken lösenord.');
      return;
    }
    if (authMode === 'reset' && password !== confirmPassword) {
      setAuthError('Lösenorden matchar inte.');
      return;
    }
    setAuthSubmitting(true);
    try {
      if (authMode === 'forgot') {
        const redirectTo = Platform.OS === 'web' ? window.location.origin : 'jannahu://reset-password';
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error) setAuthError(error.message);
        else setAuthNotice('Om kontot finns skickar vi en återställningslänk till din e-post.');
      } else if (authMode === 'reset') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) setAuthError(error.message);
        else {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) throw signOutError;
          setAuthMode('login');
          setPassword('');
          setConfirmPassword('');
          setAuthNotice('Lösenordet är uppdaterat. Logga in med ditt nya lösenord.');
        }
      } else {
        const result = authMode === 'login'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } });
        if (result.error) setAuthError(result.error.message);
        else if (authMode === 'signup' && !result.data.session) setAuthNotice('Kontot är skapat. Kontrollera din e-post och bekräfta kontot innan du loggar in.');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Anslutningen misslyckades. Kontrollera internet och försök igen.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const updateProfile = (field: keyof Profile, value: string | number | boolean | string[] | Profile['lifestyle'] | null) => {
    setProfile((current) => current ? { ...current, [field]: value } : current);
  };

  const updateProfileJourney = <K extends keyof ProfileJourney>(section: K, value: ProfileJourney[K]) => {
    setProfileJourney((current) => ({ ...current, [section]: value }));
  };

  const saveProfile = async (step: number): Promise<boolean> => {
    if (!profile || !session) return false;
    const age = ageFromDateOfBirth(profileJourney.personal.dateOfBirth);
    if (!profile.display_name.trim() || !profile.city.trim() || age === null || age < 18) {
      setProfileJourneyError('Fyll i namn och stad samt ett giltigt födelsedatum för personer som är 18+.');
      return false;
    }
    setSaving(true);
    setProfileJourneyError('');
    try {
      const profileUpdates: Profile = { ...profile, age };
      if (step === 3) profileUpdates.looking_for = profileJourney.intentions.goals[0] ?? '';
      if (step === 4) profileUpdates.interests = profileJourney.activities;
      if (step === 6) profileUpdates.lifestyle = profileJourney.lifestyle.visible
        ? { ...profile.lifestyle, smoking: profileJourney.lifestyle.smoking, alcohol: profileJourney.lifestyle.alcohol }
        : {};
      if (step === 9) profileUpdates.is_visible = profileJourney.safety.profileVisible;
      const profileResult = await supabase.from('profiles').upsert(profileUpdates);
      if (profileResult.error) throw profileResult.error;

      const userId = session.user.id;
      let writeError: { message: string } | null = null;
      switch (step) {
        case 0: {
          const { error } = await supabase.from('profile_personal_details').upsert({ user_id: userId, date_of_birth: profileJourney.personal.dateOfBirth, gender: profileJourney.personal.gender, interested_in: profileJourney.personal.interestedIn, nationality: profileJourney.personal.nationality || null, languages: profileJourney.personal.languages || null });
          writeError = error;
          break;
        }
        case 1: {
          const { error } = await supabase.from('profile_introductions').upsert({ user_id: userId, video_url: profileJourney.introduction.videoUrl || null, voice_url: profileJourney.introduction.voiceUrl || null });
          writeError = error;
          break;
        }
        case 2: {
          const { error } = await supabase.from('profile_personality').upsert({ user_id: userId, answers: profileJourney.personality });
          writeError = error;
          break;
        }
        case 3: {
          const { error } = await supabase.from('profile_dating_intentions').upsert({ user_id: userId, goals: profileJourney.intentions.goals, partner_qualities: profileJourney.intentions.qualities });
          writeError = error;
          break;
        }
        case 4: {
          const { error } = await supabase.from('profile_activity_interests').upsert({ user_id: userId, activities: profileJourney.activities });
          writeError = error;
          break;
        }
        case 5: {
          const { error } = await supabase.from('profile_challenge_preferences').upsert({ user_id: userId, challenge_types: profileJourney.challenges.types, adventure_level: profileJourney.challenges.adventureLevel, interested: profileJourney.challenges.interested });
          writeError = error;
          break;
        }
        case 6: {
          const { error } = await supabase.from('profile_lifestyle').upsert({ user_id: userId, answers: profileJourney.lifestyle, is_public: profileJourney.lifestyle.visible });
          writeError = error;
          break;
        }
        case 7: {
          const { error } = await supabase.from('profile_partner_preferences').upsert({ user_id: userId, preferences: profileJourney.partner });
          writeError = error;
          break;
        }
        case 8: {
          const { error } = await supabase.from('profile_availability').upsert({ user_id: userId, available_times: profileJourney.availability.times, budget: profileJourney.availability.budget || null, food_preferences: profileJourney.availability.foodPreferences, venue_preferences: profileJourney.availability.venuePreferences, try_new_activities: profileJourney.availability.tryNewActivities || null, first_date_setting: profileJourney.availability.firstDateSetting || null });
          writeError = error;
          break;
        }
        case 9: {
          const { error } = await supabase.from('profile_safety').upsert({ user_id: userId, adult_confirmed: profileJourney.safety.adultConfirmed, guidelines_accepted: profileJourney.safety.guidelinesAccepted, profile_visible: profileJourney.safety.profileVisible });
          writeError = error;
          break;
        }
      }
      if (writeError) throw writeError;
      setProfile(profileUpdates);
      return true;
    } catch (error) {
      setProfileJourneyError(`Kunde inte spara profilresan. Kör supabase/mobile-profile-journey.sql först. ${error instanceof Error ? error.message : ''}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateChatColor = async (color: string) => {
    const previousColor = chatColor;
    setChatColor(color);
    if (!profile || !session) return;
    const { error } = await supabase.from('profiles').update({ chat_color: color }).eq('id', session.user.id);
    if (error) {
      Alert.alert('Kunde inte spara färg', error.message);
      setChatColor((current) => current === color ? profile.chat_color ?? previousColor : current);
    } else {
      setProfile((current) => current ? { ...current, chat_color: color } : current);
    }
  };

  const updateChatPanelColor = async (color: string) => {
    const previousColor = chatPanelColor;
    setChatPanelColor(color);
    if (!profile || !session) return;
    const { error } = await supabase.from('profiles').update({ chat_panel_color: color }).eq('id', session.user.id);
    if (error) {
      Alert.alert('Kunde inte spara bakgrundsfärg', error.message);
      setChatPanelColor((current) => current === color ? profile.chat_panel_color ?? previousColor : current);
    } else {
      setProfile((current) => current ? { ...current, chat_panel_color: color } : current);
    }
  };

  const updateChatPanelPattern = async (pattern: ChatPanelPattern) => {
    const previousPattern = chatPanelPattern;
    setChatPanelPattern(pattern);
    if (!profile || !session) return;
    const { error } = await supabase.from('profiles').update({ chat_panel_pattern: pattern }).eq('id', session.user.id);
    if (error) {
      Alert.alert('Kunde inte spara bakgrundsmönster', error.message);
      setChatPanelPattern((current) => current === pattern ? profile.chat_panel_pattern ?? previousPattern : current);
    } else {
      setProfile((current) => current ? { ...current, chat_panel_pattern: pattern } : current);
    }
  };

  const submitDateRating = async (rating: number, comment: string) => {
    if (!ratingTarget || !session) return;
    
    try {
      const { error } = await supabase.from('match_actions').upsert({
        actor_id: session.user.id,
        target_id: ratingTarget.id,
        action: 'rating',
        rating: rating,
        comment: comment,
      }, { onConflict: 'actor_id,target_id' });
      
      if (error) {
        Alert.alert('Kunde inte spara betyg', error.message);
      } else {
        Alert.alert('Tack!', 'Ditt betyg har sparats.');
        setRatingTarget(null);
        setScreen('connections');
      }
    } catch (err) {
      Alert.alert('Kunde inte spara betyg', 'Ett fel uppstod.');
    }
  };

  const openReactionPicker = (target: Profile) => {
    console.log('Opening reaction picker for:', target.display_name);
    setEmojiPickerTarget(target);
    setShowEmojiPicker(true);
  };

  const closeEmojiPicker = () => {
    setShowEmojiPicker(false);
    setEmojiPickerTarget(null);
  };

  const sendReaction = async (emoji: string) => {
    if (!emojiPickerTarget || !session) return;
    
    try {
      const { error } = await supabase.from('match_actions').upsert({
        actor_id: session.user.id,
        target_id: emojiPickerTarget.id,
        action: 'reaction',
        emoji: emoji,
      }, { onConflict: 'actor_id,target_id' });
      
      if (error) {
        Alert.alert('Kunde inte skicka emoji', error.message);
      } else {
        Alert.alert('Skickat!', `${emoji} har skickats till ${emojiPickerTarget.display_name}.`);
        closeEmojiPicker();
      }
    } catch (err) {
      Alert.alert('Kunde inte skicka emoji', 'Ett fel uppstod.');
    }
  };

  const pickProfileImage = async () => {
    if (!profile || !session) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Bildåtkomst behövs', 'Tillåt bildåtkomst för att lägga till en profilbild.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82, allowsEditing: true, aspect: [4, 5] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const path = `${session.user.id}/${Date.now()}.jpg`;
    const upload = await supabase.storage.from('profile-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (upload.error) {
      Alert.alert('Kunde inte ladda upp bilden', upload.error.message);
      return;
    }
    const publicUrl = supabase.storage.from('profile-images').getPublicUrl(upload.data.path).data.publicUrl;
    setProfile((current) => current ? { ...current, image_urls: [publicUrl, ...current.image_urls].slice(0, 7) } : current);
  };

  const decideMatch = async (match: Profile, liked: boolean) => {
    if (!session || !match) return;
    const { error } = await supabase.from('match_actions').upsert({ actor_id: session.user.id, target_id: match.id, action: liked ? 'like' : 'pass' }, { onConflict: 'actor_id,target_id' });
    if (error) {
      Alert.alert('Kunde inte spara ditt val', error.message);
      return;
    }
    if (liked) {
      const reciprocal = await supabase.from('match_actions').select('actor_id').eq('actor_id', match.id).eq('target_id', session.user.id).eq('action', 'like').maybeSingle();
      if (reciprocal.error) Alert.alert('Matchningen kunde inte kontrolleras', reciprocal.error.message);
      else if (reciprocal.data) {
        setMutualIds((current) => current.includes(match.id) ? current : [...current, match.id]);
        Alert.alert('Det är en match!', `Du och ${match.display_name} gillar varandra.`);
      }
    }
    setMatchIndex((value) => Math.min(value + 1, matches.length));
  };

  const blockProfile = async (target: Profile) => {
    if (!session) return;
    const { error } = await supabase.from('blocked_profiles').upsert({ blocker_id: session.user.id, blocked_id: target.id });
    if (!error) {
      setBlockedIds((current) => current.includes(target.id) ? current : [...current, target.id]);
      setMutualIds((current) => current.filter((id) => id !== target.id));
    }
  };

  const reportProfile = async (target: Profile) => {
    if (!session) return;
    const { error } = await supabase.from('profile_reports').insert({ reporter_id: session.user.id, reported_id: target.id, reason: 'Rapporterad från mobilappen' });
    Alert.alert(error ? 'Kunde inte rapportera' : 'Tack', error ? error.message : 'Rapporten har skickats.');
  };

  const openChat = async (target: Profile) => {
    if (!session) return;
    if (!mutualIds.includes(target.id)) {
      Alert.alert('Chatten är låst', 'Ni behöver gilla varandra innan ni kan skriva.');
      return;
    }
    setChatTarget(target);
    const firstMember = session.user.id < target.id ? session.user.id : target.id;
    const secondMember = session.user.id < target.id ? target.id : session.user.id;
    const existing = await supabase.from('conversations').select('id').eq('member_a', firstMember).eq('member_b', secondMember).maybeSingle();
    if (existing.data) {
      setChatConversationId(existing.data.id);
      const result = await supabase.from('messages').select('id, sender_id, body, created_at').eq('conversation_id', existing.data.id).order('created_at', { ascending: true });
      if (!result.error) setMessages(result.data ?? []);
    } else {
      setChatConversationId(null);
      setMessages([]);
    }
    setScreen('chat');
  };

  const sendMessage = async () => {
    if (!session || !chatTarget || !draftMessage.trim()) return;
    const firstMember = session.user.id < chatTarget.id ? session.user.id : chatTarget.id;
    const secondMember = session.user.id < chatTarget.id ? chatTarget.id : session.user.id;
    let conversation = await supabase.from('conversations').select('id').eq('member_a', firstMember).eq('member_b', secondMember).maybeSingle();
    if (!conversation.data) {
      const created = await supabase.from('conversations').insert({ member_a: firstMember, member_b: secondMember }).select('id').single();
      if (created.error) {
        Alert.alert('Kunde inte starta chatten', created.error.message);
        return;
      }
      conversation = created;
    }
    if (conversation.data) {
      const result = await supabase.from('messages').insert({ conversation_id: conversation.data.id, sender_id: session.user.id, body: draftMessage.trim() }).select('id, sender_id, body, created_at').single();
      if (!result.error && result.data) {
        setChatConversationId(conversation.data.id);
        setMessages((current) => [...current, result.data]);
      } else if (result.error) Alert.alert('Meddelandet kunde inte skickas', result.error.message);
      setDraftMessage('');
    }
  };

  if (loading) return <View style={styles.center}><Text style={styles.muted}>Laddar Jannahu…</Text></View>;
  if (!session || authMode === 'reset') return <AuthScreen mode={authMode} email={email} password={password} confirmPassword={confirmPassword} name={name} error={authError} notice={authNotice} submitting={authSubmitting} onModeChange={(mode) => { setAuthMode(mode); setAuthError(''); setAuthNotice(''); }} onEmail={setEmail} onPassword={setPassword} onConfirmPassword={setConfirmPassword} onName={setName} onForgotPassword={() => { setAuthMode('forgot'); setAuthError(''); setAuthNotice(''); }} onBackToLogin={() => { setAuthMode('login'); setPassword(''); setConfirmPassword(''); setAuthError(''); setAuthNotice(''); }} onSubmit={submitAuth} />;

  const sumsubReady = Boolean(process.env.EXPO_PUBLIC_SUMSUB_ENABLED);
  // Verification is paused in development: set EXPO_PUBLIC_VERIFICATION_PAUSED=false to re-enable the gate.
  const verificationPaused = process.env.EXPO_PUBLIC_VERIFICATION_PAUSED !== 'false';
  if (!verificationPaused) {
    if (verificationStatus === 'loading') return <View style={styles.center}><Text style={styles.muted}>Kontrollerar verifiering…</Text></View>;
    if (verificationStatus !== 'verified') return <IdentityGate status={verificationStatus} emailVerified={Boolean(session.user.email_confirmed_at)} providerReady={sumsubReady} onStartVerification={() => { if (!sumsubReady) return; }} onRefresh={() => { setVerificationStatus('loading'); void loadData(session.user.id); }} onLogout={() => void supabase.auth.signOut()} />;
  }

  const currentMatch = matches[matchIndex];
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <View style={styles.header}><View><Text style={styles.brand}>möt</Text><Text style={styles.kicker}>DATE WITH INTENTION</Text></View><View style={styles.headerActions}><Pressable onPress={() => setScreen(screen === 'profile' ? 'discover' : 'profile')}><Text style={styles.headerAction}>{screen === 'profile' ? 'Upptäck' : 'Profil'}</Text></Pressable><Pressable onPress={() => setScreen(screen === 'connections' ? 'discover' : 'connections')}><Text style={styles.headerAction}>{screen === 'connections' ? 'Upptäck' : `❤️ ${mutualIds.length}`}</Text></Pressable><Pressable onPress={() => setScreen(screen === 'challenges' ? 'discover' : 'challenges')}><Text style={styles.headerAction}>{screen === 'challenges' ? 'Upptäck' : '⭐'}</Text></Pressable><Pressable onPress={() => setScreen(screen === 'membership' ? 'discover' : 'membership')}><Text style={styles.headerAction}>{screen === 'membership' ? 'Upptäck' : 'Medlemskap'}</Text></Pressable></View></View>
    {screen === 'discover' ? <DiscoverScreen match={matches.filter((match) => !blockedIds.includes(match.id))[matchIndex]} remaining={matches.filter((match) => !blockedIds.includes(match.id)).length - matchIndex} onDecision={decideMatch} onProfile={() => setScreen('profile')} onReaction={openReactionPicker} showEmojiPicker={showEmojiPicker} emojiPickerTarget={emojiPickerTarget} onSendEmoji={sendReaction} onCloseEmojiPicker={closeEmojiPicker} /> : screen === 'connections' ? <ConnectionsScreen matches={matches.filter((match) => mutualIds.includes(match.id) && !blockedIds.includes(match.id))} onChat={openChat} onBlock={blockProfile} onReport={reportProfile} onRate={(target) => { setRatingTarget(target); setScreen('dateRating'); }} /> : screen === 'challenges' ? <ChallengeEngineScreen membershipTier={membershipTier} onInvite={() => setScreen('connections')} /> : screen === 'membership' ? <MembershipScreen currentTier={membershipTier} onSelectTier={(tier) => { setMembershipTier(tier); Alert.alert('Medlemskap valt', 'Betalning aktiveras när betalningssteget kopplas på. Ditt val är sparat för den här sessionen.'); }} /> : screen === 'chatSettings' ? <ChatSettingsScreen settings={chatSettings} onSettingsChange={setChatSettings} onBack={() => setScreen(chatTarget ? 'chat' : 'connections')} chatColor={chatColor} onChatColorChange={updateChatColor} chatPanelColor={chatPanelColor} onChatPanelColorChange={updateChatPanelColor} chatPanelPattern={chatPanelPattern} onChatPanelPatternChange={updateChatPanelPattern} /> : screen === 'dateRating' && ratingTarget ? <DateRatingScreen target={ratingTarget} onBack={() => setScreen('connections')} onSubmit={submitDateRating} /> : screen === 'chat' && chatTarget ? <ChatScreen target={chatTarget} currentUserId={session.user.id} conversationId={chatConversationId} messages={messages} draft={draftMessage} onDraft={setDraftMessage} onSend={sendMessage} onBack={() => setScreen('connections')} onOpenSettings={() => setScreen('chatSettings')} chatColor={chatColor} chatPanelColor={chatPanelColor} chatPanelPattern={chatPanelPattern} /> : profile ? <ProfileJourneyScreen profile={profile} journey={profileJourney} email={session.user.email ?? ''} emailVerified={Boolean(session.user.email_confirmed_at)} saveError={profileJourneyError} saving={saving} onUpdateProfile={updateProfile} onUpdateJourney={updateProfileJourney} onPickImage={pickProfileImage} onSave={saveProfile} onComplete={() => setScreen('discover')} onLogout={() => void supabase.auth.signOut()} chatColor={chatColor} onUpdateChatColor={updateChatColor} /> : <View style={styles.empty}><Text style={styles.emptyTitle}>Din profil förbereds</Text><Text style={styles.muted}>Vi kunde inte läsa din profil än.</Text></View>}
  </SafeAreaView>;
}

function AuthScreen(props: { mode: AuthMode; email: string; password: string; confirmPassword: string; name: string; error: string; notice: string; submitting: boolean; onModeChange: (mode: 'login' | 'signup') => void; onEmail: (value: string) => void; onPassword: (value: string) => void; onConfirmPassword: (value: string) => void; onName: (value: string) => void; onForgotPassword: () => void; onBackToLogin: () => void; onSubmit: () => void }) {
  const title = props.mode === 'login' ? 'Välkommen tillbaka.' : props.mode === 'signup' ? 'Börja möta på riktigt.' : props.mode === 'forgot' ? 'Återställ lösenord.' : 'Välj ett nytt lösenord.';
  const intro = props.mode === 'login' ? 'Logga in för att upptäcka riktiga medlemmar.' : props.mode === 'signup' ? 'Skapa ett konto och välj när din profil ska synas.' : props.mode === 'forgot' ? 'Vi skickar en återställningslänk till din e-post.' : 'Använd minst 6 tecken och välj ett lösenord du inte använt tidigare.';
  const submitLabel = props.submitting ? 'Vänta…' : props.mode === 'login' ? 'Logga in  →' : props.mode === 'signup' ? 'Skapa konto  →' : props.mode === 'forgot' ? 'Skicka återställningslänk  →' : 'Spara nytt lösenord  →';

  return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><ScrollView contentContainerStyle={styles.auth} keyboardShouldPersistTaps="handled">
    <Text style={styles.brand}>möt</Text><Text style={styles.kicker}>DATE WITH INTENTION</Text><Text style={styles.title}>{title}</Text><Text style={styles.lead}>{intro}</Text>
    {props.mode === 'signup' && <TextInput style={styles.input} placeholder="Namn" value={props.name} onChangeText={props.onName} autoCapitalize="words" editable={!props.submitting} />}
    {props.mode !== 'reset' && <TextInput style={styles.input} placeholder="E-post" value={props.email} onChangeText={props.onEmail} keyboardType="email-address" autoCapitalize="none" editable={!props.submitting} />}
    {(props.mode === 'login' || props.mode === 'signup') && <TextInput style={styles.input} placeholder="Lösenord" value={props.password} onChangeText={props.onPassword} secureTextEntry editable={!props.submitting} />}
    {props.mode === 'reset' && <>
      <TextInput style={styles.input} placeholder="Nytt lösenord" value={props.password} onChangeText={props.onPassword} secureTextEntry editable={!props.submitting} />
      <TextInput style={styles.input} placeholder="Bekräfta nytt lösenord" value={props.confirmPassword} onChangeText={props.onConfirmPassword} secureTextEntry editable={!props.submitting} />
    </>}
    <Text style={styles.error} accessibilityLiveRegion="polite">{props.error}</Text>
    {props.notice ? <Text style={styles.authNotice} accessibilityLiveRegion="polite">{props.notice}</Text> : null}
    <Pressable style={[styles.primary, props.submitting && styles.primaryDisabled]} onPress={() => void props.onSubmit()} disabled={props.submitting} accessibilityRole="button" accessibilityState={{ disabled: props.submitting }}><Text style={styles.primaryText}>{submitLabel}</Text></Pressable>
    {props.mode === 'login' && <Pressable onPress={props.onForgotPassword} disabled={props.submitting}><Text style={styles.link}>Glömt lösenordet?</Text></Pressable>}
    {props.mode === 'login' || props.mode === 'signup'
      ? <Pressable onPress={() => props.onModeChange(props.mode === 'login' ? 'signup' : 'login')} disabled={props.submitting}><Text style={styles.link}>{props.mode === 'login' ? 'Ny på Jannahu? Skapa konto' : 'Har du redan ett konto? Logga in'}</Text></Pressable>
      : <Pressable onPress={props.onBackToLogin} disabled={props.submitting}><Text style={styles.link}>Tillbaka till inloggning</Text></Pressable>}
  </ScrollView></SafeAreaView>;
}

function DiscoverScreen({ match, remaining, onDecision, onProfile, onReaction, showEmojiPicker, emojiPickerTarget, onSendEmoji, onCloseEmojiPicker }: { match?: Profile; remaining: number; onDecision: (match: Profile, liked: boolean) => void; onProfile: () => void; onReaction: (match: Profile) => void; showEmojiPicker: boolean; emojiPickerTarget: Profile | null; onSendEmoji: (emoji: string) => void; onCloseEmojiPicker: () => void }) {
  const emojis = ['😀', '😍', '🥰', '😎', '🤩', '🔥', '⭐', '💕', '💖', '💗', '❤️', '🌟', '✨', '🎉', '🥳', '🤗', '😊', '🥺', '😇', '👋'];
  const flyAnim = useRef(new Animated.Value(0)).current;
  const [fireworks, setFireworks] = useState<Array<{ id: number; emoji: string; x: number; y: number; scale: number; opacity: number }>>([]);
  const fireworksId = useRef(0);
  
  const handleSendEmoji = (selectedEmoji: string) => {
    flyAnim.setValue(0);
    
    Animated.timing(flyAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    setTimeout(() => {
      const newFireworks = Array.from({ length: 12 }, (_, i) => ({
        id: fireworksId.current++,
        emoji: selectedEmoji,
        x: Math.random() * 300 - 150,
        y: Math.random() * 200 - 100,
        scale: 1,
        opacity: 1,
      }));
      setFireworks(newFireworks);
      
      newFireworks.forEach((fw, i) => {
        setTimeout(() => {
          setFireworks(prev => prev.map(f => f.id === fw.id ? { ...f, scale: 1.5, opacity: 0.8 } : f));
        }, i * 50);
        setTimeout(() => {
          setFireworks(prev => prev.map(f => f.id === fw.id ? { ...f, scale: 0, opacity: 0 } : f));
        }, 300 + i * 50);
      });
      
      setTimeout(() => {
        setFireworks([]);
        onSendEmoji(selectedEmoji);
      }, 600);
    }, 500);
  };
  
  if (!match) return <View style={styles.empty}><Text style={styles.emptyTitle}>Inga fler profiler ännu</Text><Text style={styles.muted}>Nya medlemmar visas här när de väljer att synas.</Text><Pressable style={styles.secondary} onPress={onProfile}><Text style={styles.secondaryText}>Öppna min profil</Text></Pressable></View>;
  return <ScrollView contentContainerStyle={styles.content}><Text style={styles.kicker}>UPPTÄCK</Text><Text style={styles.title}>Någon att upptäcka.</Text><Text style={styles.lead}>{remaining} synliga profiler kvar</Text>
    {showEmojiPicker && emojiPickerTarget && (
      <View style={styles.inlineEmojiPicker}>
        <View style={styles.inlineEmojiPickerHeader}>
          <Text style={styles.inlineEmojiPickerTitle}>Skicka emoji till {emojiPickerTarget.display_name}</Text>
          <TouchableOpacity onPress={onCloseEmojiPicker} style={styles.inlineEmojiPickerClose}>
            <Text style={styles.inlineEmojiPickerCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineEmojiPickerContent}>
          {emojis.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.inlineEmojiButton}
              onPress={() => handleSendEmoji(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.inlineEmojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )}
    <View style={styles.card}>{match.image_urls?.[0] ? <Image source={{ uri: match.image_urls[0] }} style={styles.photo} /> : <View style={[styles.photo, styles.photoFallback]}><Text style={styles.fallbackText}>{match.display_name.charAt(0)}</Text></View>}<View style={styles.cardBody}><Text style={styles.name}>{match.display_name}{match.age ? `, ${match.age}` : ''}</Text><Text style={styles.muted}>{[match.profession, match.city].filter(Boolean).join(' · ')}</Text>{match.bio ? <Text style={styles.bio}>{match.bio}</Text> : null}<View style={styles.tags}>{match.interests.slice(0, 4).map((interest) => <Text key={interest} style={styles.tag}>{interest}</Text>)}</View></View></View>
    <Animated.View style={[styles.flyingEmojiContainer, { transform: [{ translateY: flyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -350] }) }] }]}>
      <Text style={styles.flyingEmoji}>⭐</Text>
    </Animated.View>
    {fireworks.map(fw => (
      <Animated.View key={fw.id} style={[styles.firework, { left: '50%', top: '30%', marginLeft: fw.x, marginTop: fw.y, transform: [{ scale: fw.scale }], opacity: fw.opacity }]}>
        <Text style={styles.fireworkEmoji}>{fw.emoji}</Text>
      </Animated.View>
    ))}
    <View style={styles.actions}><TouchableOpacity style={styles.pass} onPress={() => onDecision(match, false)} activeOpacity={0.7}><Text style={styles.actionText}>×</Text></TouchableOpacity><TouchableOpacity style={styles.superLike} onPress={() => onReaction(match)} activeOpacity={0.7}><Text style={styles.actionText}>⭐</Text></TouchableOpacity><TouchableOpacity style={styles.like} onPress={() => onDecision(match, true)} activeOpacity={0.7}><Text style={styles.actionText}>♡</Text></TouchableOpacity></View></ScrollView>;
}

function ConnectionsScreen({ matches, onChat, onBlock, onReport, onRate }: { matches: Profile[]; onChat: (target: Profile) => void; onBlock: (target: Profile) => void; onReport: (target: Profile) => void; onRate: (target: Profile) => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = width >= 1100 ? '31.5%' : width >= 720 ? '48.5%' : '100%';
  const matchCount = matches.length === 1 ? '1 person gillar dig tillbaka.' : `${matches.length} personer gillar dig tillbaka.`;

  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.kicker}>MATCHNINGAR</Text>
    <Text style={styles.title}>Det börjar med ett hej.</Text>
    <Text style={styles.lead}>{matches.length ? matchCount : 'När ni gillar varandra visas er matchning här.'}</Text>
    <View style={styles.matchesGrid}>
      {matches.map((match) => <View key={match.id} style={[styles.matchCard, { width: cardWidth }]}>
        <View style={styles.matchPhotoFrame}>
          {match.image_urls[0] ? <Image source={{ uri: match.image_urls[0] }} style={styles.matchPhoto} resizeMode="cover" /> : <View style={[styles.matchPhoto, styles.matchPhotoFallback]}><Text style={styles.matchInitial}>{match.display_name.charAt(0).toUpperCase()}</Text></View>}
          <View style={styles.matchBadge}><Text style={styles.matchBadgeText}>Ni gillar varandra</Text></View>
        </View>
        <View style={styles.matchCardBody}>
          <Text style={styles.matchName}>{match.display_name}{match.age ? `, ${match.age}` : ''}</Text>
          <Text style={styles.matchDetails}>{[match.profession, match.city].filter(Boolean).join(' · ') || 'Lägg till fler profiluppgifter'}</Text>
          {match.bio ? <Text style={styles.matchBio} numberOfLines={3}>{match.bio}</Text> : null}
          {match.interests.length ? <View style={styles.matchInterests}>{match.interests.slice(0, 3).map((interest) => <Text key={interest} style={styles.matchInterest}>{interest}</Text>)}</View> : null}
          <View style={styles.matchActions}>
            <Pressable style={styles.matchActionButton} onPress={() => onChat(match)}><Text style={styles.matchActionText}>Skriv</Text></Pressable>
            <Pressable style={styles.matchActionButton} onPress={() => onRate(match)}><Text style={styles.matchActionText}>Betygsätt</Text></Pressable>
          </View>
          <View style={styles.matchSafetyActions}><Pressable onPress={() => onBlock(match)}><Text style={styles.matchSafetyText}>Blockera</Text></Pressable><Pressable onPress={() => onReport(match)}><Text style={styles.matchSafetyText}>Rapportera</Text></Pressable></View>
        </View>
      </View>)}
    </View>
  </ScrollView>;
}

function ChatScreen({ target, currentUserId, conversationId, messages, draft, onDraft, onSend, onBack, onOpenSettings, chatColor, chatPanelColor, chatPanelPattern }: { target: Profile; currentUserId: string; conversationId: string | null; messages: Array<{ id: string; sender_id: string; body: string; created_at: string }>; draft: string; onDraft: (value: string) => void; onSend: () => void; onBack: () => void; onOpenSettings: () => void; chatColor: string; chatPanelColor: string; chatPanelPattern: ChatPanelPattern }) {
  const [localMessage, setLocalMessage] = useState(messages);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const commonEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '😍', '🤔', '😊', '😎', '🥰', '😢', '😡', '👋', '✨', '💕', '🙏', '💪', '🎁', '🌟'];

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Nu';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} tim`;
    if (diffDays < 7) return `${diffDays} dag`;
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  };

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`mobile-chat-${conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, ({ new: row }) => {
      setLocalMessage((current) => current.some((message) => message.id === row.id) ? current : [...current, row as typeof messages[number]]);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId]);

  // Reconcile parent-loaded history with realtime messages when opening a chat.
  // eslint-disable-next-line react/set-state-in-effect
  useEffect(() => setLocalMessage(messages), [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (localMessage.length > 0 && !showScrollBottom) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [localMessage, showScrollBottom]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    setShowScrollBottom(!isCloseToBottom);
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  return <View style={[styles.chat, { backgroundColor: chatPanelColor }]}>
    <View style={[styles.chatHeader, { backgroundColor: chatPanelColor }]}>
      <Pressable onPress={onBack} style={styles.chatBackButton}>
        <Text style={styles.chatBackText}>←</Text>
      </Pressable>
      <View style={styles.chatHeaderCenter}>
        <Text style={styles.chatHeaderName}>{target.display_name}</Text>
        <Text style={styles.chatHeaderSubtitle}>Samtal</Text>
      </View>
      <View style={styles.chatHeaderRight}>
        <Pressable onPress={onOpenSettings} style={styles.chatSettingsButton}>
          <Text style={styles.chatSettingsText}>⚙️</Text>
        </Pressable>
      </View>
    </View>
    <View style={[styles.chatMessageArea, { backgroundColor: chatPanelColor }]}>
      <ChatPattern pattern={chatPanelPattern} color={chatPanelColor} />
      <ScrollView
        ref={scrollViewRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
      {localMessage.length ? localMessage.map((message) => {
        const isOwnMessage = message.sender_id === currentUserId;
        return <View key={message.id} style={[styles.messageRow, !isOwnMessage && styles.messageRowIncoming]}><View style={[styles.messageBubble, isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleIncoming, isOwnMessage && { backgroundColor: chatColor }]}><Text style={[styles.messageSender, isOwnMessage && styles.messageSenderOwn]}>{isOwnMessage ? 'Du' : target.display_name}</Text><Text style={[styles.messageText, isOwnMessage && styles.messageTextOwn]}>{message.body}</Text><Text style={[styles.messageTime, isOwnMessage && styles.messageTimeOwn]}>{formatRelativeTime(message.created_at)}</Text></View></View>;
      }) : <View style={styles.chatEmpty}><Text style={styles.chatEmptyIcon}>💬</Text><Text style={styles.chatEmptyText}>Skriv ett hej och börja samtalet</Text></View>}
      </ScrollView>
    </View>
    {showScrollBottom && <Pressable style={styles.scrollBottomButton} onPress={scrollToBottom}><Text style={styles.scrollBottomText}>↓</Text></Pressable>}
    
    {/* Emoji Picker */}
    {showEmojiPicker && (
      <View style={[styles.emojiPicker, { backgroundColor: chatPanelColor }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiPickerContent}>
          {commonEmojis.map((emoji) => (
            <Pressable
              key={emoji}
              style={styles.emojiButton}
              onPress={() => {
                onDraft(draft + emoji);
                setShowEmojiPicker(false);
              }}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable style={styles.emojiCloseButton} onPress={() => setShowEmojiPicker(false)}>
          <Text style={styles.emojiCloseText}>✕</Text>
        </Pressable>
      </View>
    )}
    
    <View style={[styles.composer, { backgroundColor: chatPanelColor }]}>
      <Pressable style={styles.emojiToggle} onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
        <Text style={styles.emojiToggleText}>😊</Text>
      </Pressable>
      <TextInput style={styles.composerInput} value={draft} onChangeText={onDraft} placeholder="Skriv ett meddelande" />
      <Pressable style={styles.sendButton} onPress={onSend}><Text style={styles.sendText}>→</Text></Pressable>
    </View>
  </View>;
}

function ChatPattern({ pattern, color }: { pattern: ChatPanelPattern; color: string }) {
  if (pattern === 'plain') return null;
  const glyphs: Record<Exclude<ChatPanelPattern, 'plain'>, string> = {
    dots: '•',
    stripes: '╱',
    hearts: '♡',
    flowers: '✿',
    waves: '〰',
  };
  const [red, green, blue] = color.match(/[0-9a-f]{2}/gi)?.map((channel) => Number.parseInt(channel, 16)) ?? [255, 255, 255];
  const glyphColor = red * 0.299 + green * 0.587 + blue * 0.114 > 150 ? '#27483d' : '#ffffff';

  return (
    <View pointerEvents="none" style={styles.chatPattern}>
      {Array.from({ length: 7 }, (_, row) => (
        <View key={row} style={styles.chatPatternRow}>
          {Array.from({ length: 7 }, (_, column) => (
            <Text key={column} style={[styles.chatPatternGlyph, { color: glyphColor }]}>{glyphs[pattern]}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ChatSettingsScreen({ settings, onSettingsChange, onBack, chatColor, onChatColorChange, chatPanelColor, onChatPanelColorChange, chatPanelPattern, onChatPanelPatternChange }: { settings: { notifications: boolean; sound: boolean; readReceipts: boolean; typingIndicator: boolean; onlineStatus: boolean; messagePreview: boolean }; onSettingsChange: (settings: any) => void; onBack: () => void; chatColor: string; onChatColorChange: (color: string) => void; chatPanelColor: string; onChatPanelColorChange: (color: string) => void; chatPanelPattern: ChatPanelPattern; onChatPanelPatternChange: (pattern: ChatPanelPattern) => void }) {
  const toggleSetting = (key: keyof typeof settings) => {
    onSettingsChange({ ...settings, [key]: !settings[key] });
  };

  const colorOptions = [
    { color: '#f1d8cc', label: 'Rosa', emoji: '🌸' },
    { color: '#d4e5f7', label: 'Blå', emoji: '💙' },
    { color: '#e7f0d8', label: 'Grön', emoji: '🌿' },
    { color: '#f5eadf', label: 'Beige', emoji: '🤎' },
    { color: '#e8e0f0', label: 'Lila', emoji: '💜' },
    { color: '#f7e8e8', label: 'Korall', emoji: '🧡' },
  ];
  const panelColorOptions = [
    { color: '#f7f5ef', label: 'Neutral', emoji: '◯' },
    { color: '#ffffff', label: 'White', emoji: '○' },
    { color: '#272727', label: 'Black', emoji: '●' },
    { color: '#808080', label: 'Gray', emoji: '◐' },
    ...colorOptions,
    ...['#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80', '#00ffff', '#0080ff', '#0000ff', '#8000ff', '#ff00ff', '#ff0080'].map((color) => ({ color, label: color, emoji: '●' })),
  ];
  const patternOptions: { key: ChatPanelPattern; label: string; preview: string }[] = [
    { key: 'plain', label: 'Plain', preview: ' ' },
    { key: 'dots', label: 'Dots', preview: '· · ·' },
    { key: 'stripes', label: 'Stripes', preview: '╱ ╱ ╱' },
    { key: 'hearts', label: 'Hearts', preview: '♡ ♥ ♡' },
    { key: 'flowers', label: 'Flowers', preview: '✿ ❀ ✿' },
    { key: 'waves', label: 'Waves', preview: '〰 〰 〰' },
  ];
  const [customPanelColor, setCustomPanelColor] = useState(chatPanelColor);
  const [customColorError, setCustomColorError] = useState('');

  const applyCustomPanelColor = () => {
    const normalizedColor = customPanelColor.trim().startsWith('#')
      ? customPanelColor.trim()
      : `#${customPanelColor.trim()}`;
    if (!/^#[0-9a-fA-F]{6}$/.test(normalizedColor)) {
      setCustomColorError('Enter a 6-digit hex color, for example #AABBCC.');
      return;
    }
    setCustomColorError('');
    setCustomPanelColor(normalizedColor.toLowerCase());
    onChatPanelColorChange(normalizedColor.toLowerCase());
  };

  return <View style={styles.settingsScreen}>
    <View style={styles.settingsHeader}>
      <Pressable onPress={onBack} style={styles.settingsBackButton}>
        <Text style={styles.settingsBackText}>←</Text>
      </Pressable>
      <Text style={styles.settingsTitle}>Chattinställningar</Text>
      <View style={styles.settingsSpacer} />
    </View>
    <ScrollView style={styles.settingsContent}>
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Aviseringar</Text>
        <View style={styles.settingsRow}>
          <View style={styles.settingsRowLeft}>
            <Text style={styles.settingsLabel}>Push-aviseringar</Text>
            <Text style={styles.settingsHint}>Få aviseringar när du får nya meddelanden</Text>
          </View>
          <Pressable 
            style={[styles.toggle, settings.notifications && styles.toggleActive]} 
            onPress={() => toggleSetting('notifications')}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.notifications }}
            accessibilityLabel="Push-aviseringar"
            accessibilityHint="Aktivera eller inaktivera push-aviseringar för nya meddelanden"
          >
            <View style={[styles.toggleKnob, settings.notifications && styles.toggleKnobActive]} />
          </Pressable>
        </View>
        <View style={styles.settingsRow}>
          <View style={styles.settingsRowLeft}>
            <Text style={styles.settingsLabel}>Ljud</Text>
            <Text style={styles.settingsHint}>Spela upp ljud vid nya meddelanden</Text>
          </View>
          <Pressable 
            style={[styles.toggle, settings.sound && styles.toggleActive]} 
            onPress={() => toggleSetting('sound')}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.sound }}
            accessibilityLabel="Ljud"
            accessibilityHint="Aktivera eller inaktivera ljud för nya meddelanden"
          >
            <View style={[styles.toggleKnob, settings.sound && styles.toggleKnobActive]} />
          </Pressable>
        </View>
        <View style={styles.settingsRow}>
          <View style={styles.settingsRowLeft}>
            <Text style={styles.settingsLabel}>Meddelandeförhandsvisning</Text>
            <Text style={styles.settingsHint}>Visa innehåll i aviseringar</Text>
          </View>
          <Pressable 
            style={[styles.toggle, settings.messagePreview && styles.toggleActive]} 
            onPress={() => toggleSetting('messagePreview')}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.messagePreview }}
            accessibilityLabel="Meddelandeförhandsvisning"
            accessibilityHint="Visa eller dölj meddelandetext i aviseringar"
          >
            <View style={[styles.toggleKnob, settings.messagePreview && styles.toggleKnobActive]} />
          </Pressable>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Meddelandefärg</Text>
        
        {/* Color Options */}
        <View style={styles.colorPickerContainer}>
          {colorOptions.map((option) => (
            <Pressable
              key={option.color}
              style={({ pressed }) => [
                styles.colorOption,
                chatColor === option.color && styles.colorOptionActive,
                pressed && { opacity: 0.7 }
              ]}
              onPress={() => onChatColorChange(option.color)}
              accessibilityRole="button"
              accessibilityState={{ selected: chatColor === option.color }}
              accessibilityLabel={`${option.label} chattfärg`}
            >
              <View style={[styles.colorSwatch, { backgroundColor: option.color }]}>
                {chatColor === option.color && <Text style={styles.colorCheckmark}>✓</Text>}
              </View>
              <Text style={[styles.colorLabel, chatColor === option.color && styles.colorLabelActive]}>
                {option.emoji} {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Chattbakgrund · alla färger</Text>
        <Text style={styles.settingsHint}>Välj en färgpalett eller skriv valfri hexkod.</Text>
        <View style={styles.colorPickerContainer}>
          {panelColorOptions.map((option) => (
            <Pressable
              key={option.color}
              style={({ pressed }) => [
                styles.colorOption,
                chatPanelColor === option.color && styles.colorOptionActive,
                pressed && { opacity: 0.7 }
              ]}
              onPress={() => {
                setCustomPanelColor(option.color);
                onChatPanelColorChange(option.color);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: chatPanelColor === option.color }}
              accessibilityLabel={`${option.label} chattbakgrund`}
            >
              <View style={[styles.colorSwatch, { backgroundColor: option.color }]}>
                {chatPanelColor === option.color && <Text style={styles.colorCheckmark}>✓</Text>}
              </View>
              <Text style={[styles.colorLabel, chatPanelColor === option.color && styles.colorLabelActive]}>
                {option.emoji} {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.customColorRow}>
          <View style={[styles.customColorPreview, { backgroundColor: /^#[0-9a-fA-F]{6}$/.test(customPanelColor) ? customPanelColor : chatPanelColor }]} />
          <TextInput
            style={styles.customColorInput}
            value={customPanelColor}
            onChangeText={(value) => {
              setCustomPanelColor(value);
              setCustomColorError('');
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={applyCustomPanelColor}
            maxLength={7}
            placeholder="#AABBCC"
            accessibilityLabel="Hex color code for chat background"
          />
          <Pressable style={styles.customColorButton} onPress={applyCustomPanelColor}>
            <Text style={styles.customColorButtonText}>Apply</Text>
          </Pressable>
        </View>
        {customColorError ? <Text style={styles.customColorError}>{customColorError}</Text> : null}
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Chattmönster</Text>
        <View style={styles.patternOptions}>
          {patternOptions.map((option) => (
            <Pressable
              key={option.key}
              style={({ pressed }) => [
                styles.patternOption,
                chatPanelPattern === option.key && styles.patternOptionActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => onChatPanelPatternChange(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: chatPanelPattern === option.key }}
              accessibilityLabel={`Chat background pattern: ${option.label}`}
            >
              <Text style={styles.patternPreview}>{option.preview}</Text>
              <Text style={styles.colorLabel}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Integritet</Text>
        <View style={styles.settingsRow}>
          <View style={styles.settingsRowLeft}>
            <Text style={styles.settingsLabel}>Läskvitnes</Text>
            <Text style={styles.settingsHint}>Visa när du har läst meddelanden</Text>
          </View>
          <Pressable 
            style={[styles.toggle, settings.readReceipts && styles.toggleActive]} 
            onPress={() => toggleSetting('readReceipts')}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.readReceipts }}
            accessibilityLabel="Läskvitnes"
            accessibilityHint="Visa andra när du har läst deras meddelanden"
          >
            <View style={[styles.toggleKnob, settings.readReceipts && styles.toggleKnobActive]} />
          </Pressable>
        </View>
        <View style={styles.settingsRow}>
          <View style={styles.settingsRowLeft}>
            <Text style={styles.settingsLabel}>Online-status</Text>
            <Text style={styles.settingsHint}>Visa när du är online för andra</Text>
          </View>
          <Pressable 
            style={[styles.toggle, settings.onlineStatus && styles.toggleActive]} 
            onPress={() => toggleSetting('onlineStatus')}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.onlineStatus }}
            accessibilityLabel="Online-status"
            accessibilityHint="Visa andra när du är online i appen"
          >
            <View style={[styles.toggleKnob, settings.onlineStatus && styles.toggleKnobActive]} />
          </Pressable>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Chattupplevelse</Text>
        <View style={styles.settingsRow}>
          <View style={styles.settingsRowLeft}>
            <Text style={styles.settingsLabel}>Skrivindikator</Text>
            <Text style={styles.settingsHint}>Visa när någon skriver ett meddelande</Text>
          </View>
          <Pressable 
            style={[styles.toggle, settings.typingIndicator && styles.toggleActive]} 
            onPress={() => toggleSetting('typingIndicator')}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings.typingIndicator }}
            accessibilityLabel="Skrivindikator"
            accessibilityHint="Visa en indikator när någon skriver ett meddelande till dig"
          >
            <View style={[styles.toggleKnob, settings.typingIndicator && styles.toggleKnobActive]} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  </View>;
}

function DateRatingScreen({ target, onBack, onSubmit }: { target: Profile; onBack: () => void; onSubmit: (rating: number, comment: string) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const submitRating = () => {
    if (rating === 0) {
      Alert.alert('Välj betyg', 'Vänligen välj ett betyg mellan 1 och 5 stjärnor.');
      return;
    }
    onSubmit(rating, comment);
  };

  return <View style={styles.ratingScreen}>
    <View style={styles.ratingHeader}>
      <Pressable onPress={onBack} style={styles.ratingBackButton}>
        <Text style={styles.ratingBackText}>←</Text>
      </Pressable>
      <Text style={styles.ratingTitle}>Betygsätt datum</Text>
      <View style={styles.ratingSpacer} />
    </View>

    <ScrollView style={styles.ratingContent}>
      <View style={styles.ratingTargetCard}>
        <Text style={styles.ratingTargetName}>{target.display_name}</Text>
        <Text style={styles.ratingTargetInfo}>{target.age ? `${target.age} år` : ''} {target.city ? `· ${target.city}` : ''}</Text>
      </View>

      <View style={styles.ratingSection}>
        <Text style={styles.ratingSectionTitle}>Hur gick det?</Text>
        <Text style={styles.ratingSectionSubtitle}>Välj betyg för ditt datum med {target.display_name}</Text>
        
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
              accessibilityRole="button"
              accessibilityState={{ selected: rating >= star }}
              accessibilityLabel={`${star} stjärnor`}
            >
              <Text style={[styles.star, rating >= star && styles.starActive]}>★</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.ratingLabel}>
          {rating === 0 ? 'Välj betyg' : 
           rating === 1 ? 'Dåligt' :
           rating === 2 ? 'Okej' :
           rating === 3 ? 'Bra' :
           rating === 4 ? 'Mycket bra' : 'Utmärkt'}
        </Text>
      </View>

      <View style={styles.ratingSection}>
        <Text style={styles.ratingSectionTitle}>Kommentar (valfritt)</Text>
        <TextInput
          style={styles.ratingComment}
          value={comment}
          onChangeText={setComment}
          placeholder="Berätta gärna mer om din upplevelse..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>

    <View style={styles.ratingFooter}>
      <Pressable style={[styles.ratingSubmit, rating === 0 && styles.ratingSubmitDisabled]} onPress={submitRating} disabled={rating === 0}>
        <Text style={styles.ratingSubmitText}>Spara betyg</Text>
      </Pressable>
    </View>
  </View>;
}

function EmojiReactionScreen({ target, onBack, onSend }: { target: Profile; onBack: () => void; onSend: (emoji: string) => void }) {
  const emojis = ['😀', '😍', '🥰', '😎', '🤩', '🔥', '⭐', '💕', '💖', '💗', '❤️', '🌟', '✨', '🎉', '🥳', '🤗', '😊', '🥺', '😇', '👋'];

  return <View style={styles.emojiReactionScreen}>
    <View style={styles.emojiReactionHeader}>
      <Pressable onPress={onBack} style={styles.emojiReactionBackButton}>
        <Text style={styles.emojiReactionBackText}>←</Text>
      </Pressable>
      <Text style={styles.emojiReactionTitle}>Skicka emoji</Text>
      <View style={styles.emojiReactionSpacer} />
    </View>

    <ScrollView style={styles.emojiReactionContent}>
      <View style={styles.emojiReactionTargetCard}>
        <Text style={styles.emojiReactionTargetName}>{target.display_name}</Text>
        <Text style={styles.emojiReactionTargetInfo}>{target.age ? `${target.age} år` : ''} {target.city ? `· ${target.city}` : ''}</Text>
      </View>

      <View style={styles.emojiReactionSection}>
        <Text style={styles.emojiReactionSectionTitle}>Välj en emoji</Text>
        <Text style={styles.emojiReactionSectionSubtitle}>Skicka en emoji till {target.display_name} för att visa intresse</Text>
        
        <View style={styles.emojiReactionGrid}>
          {emojis.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiReactionButton}
              onPress={() => {
                Alert.alert('Skickar emoji', emoji);
                onSend(emoji);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={emoji}
            >
              <Text style={styles.emojiReactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f7f5ef',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f5ef' },
  auth: { flexGrow: 1, justifyContent: 'center', padding: 26 },
  content: { padding: 22, paddingBottom: 44 },
  profileContent: { paddingBottom: 52 },
  profileHeading: { marginBottom: 8 },
  profileIntro: { color: '#819087', fontSize: 14, lineHeight: 21, marginTop: -3, marginBottom: 20 },
  header: { paddingHorizontal: 22, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e4e5dc' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brand: { color: '#27483d', fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  kicker: { color: '#9ba49b', fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginBottom: 14 },
  title: { color: '#27483d', fontSize: 38, fontWeight: '600', lineHeight: 42, marginBottom: 12 },
  lead: { color: '#819087', fontSize: 15, lineHeight: 23, marginBottom: 24 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce2d6', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 12, color: '#27483d', fontSize: 15 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  primary: { backgroundColor: '#27483d', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 6, marginBottom: 18 },
  primaryDisabled: { opacity: 0.65 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  link: { color: '#688b42', textAlign: 'center', fontWeight: '700', padding: 12 },
  error: { color: '#bd7565', minHeight: 20, fontSize: 12 },
  authNotice: { color: '#456d48', marginBottom: 12, fontSize: 13, lineHeight: 19 },
  headerAction: { color: '#688b42', fontWeight: '700', fontSize: 14 },
  profileHero: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f0d9', borderRadius: 16, padding: 18, marginBottom: 16 },
  avatar: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#a9bf70' },
  avatarImage: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#dfe8d4' },
  avatarText: { color: '#27483d', fontSize: 22, fontWeight: '800' },
  profileHeroCopy: { marginLeft: 14 },
  imageAction: { color: '#66833d', fontSize: 12, fontWeight: '700', marginTop: 7 },
  completion: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 22 },
  completionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  completionValue: { color: '#66833d', fontSize: 14, fontWeight: '800' },
  progress: { height: 7, borderRadius: 4, backgroundColor: '#e4e9df', overflow: 'hidden', marginTop: 10 },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#a8c66d' },
  profilePhoto: { height: 300, position: 'relative', overflow: 'hidden', borderRadius: 6, backgroundColor: '#e5e9de', marginBottom: 14 },
  profilePhotoImage: { width: '100%', height: '100%' },
  profilePhotoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#e8f0d9' },
  profilePhotoInitials: { color: '#27483d', fontSize: 58, fontWeight: '700' },
  profilePhotoPrompt: { maxWidth: 220, marginTop: 7, color: '#68806f', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  profilePhotoOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 13, backgroundColor: 'rgba(25, 43, 35, 0.78)' },
  profilePhotoEyebrow: { color: '#e6eddd', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  profilePhotoCount: { marginTop: 4, color: '#c5d0c2', fontSize: 10, fontWeight: '600' },
  profilePhotoAction: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8 },
  profilePhotoActionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  profileProgress: { backgroundColor: '#fff', borderRadius: 6, padding: 15, marginBottom: 12 },
  previewAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce2d6', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 13, marginBottom: 18 },
  previewActionText: { color: '#526f35', fontSize: 14, fontWeight: '700' },
  previewActionArrow: { color: '#526f35', fontSize: 18, fontWeight: '700' },
  profileSection: { paddingTop: 22, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#e4e5dc' },
  profileSectionHeading: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  profileSectionNumber: { width: 34, paddingTop: 2, color: '#c47c65', fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  profileSectionHeadingCopy: { flex: 1 },
  profileSectionTitle: { color: '#27483d', fontSize: 19, fontWeight: '700' },
  profileSectionHint: { marginTop: 4, color: '#819087', fontSize: 12, lineHeight: 18 },
  fieldGroup: { flex: 1, marginBottom: 13 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  fieldLabel: { color: '#52645a', fontSize: 12, fontWeight: '700', marginBottom: 7 },
  fieldCounter: { color: '#98a198', fontSize: 10 },
  profileInput: { minHeight: 48, borderWidth: 1, borderColor: '#dce2d6', borderRadius: 5, paddingHorizontal: 13, paddingVertical: 11, backgroundColor: '#fff', color: '#27483d', fontSize: 14 },
  profileBioInput: { minHeight: 112, textAlignVertical: 'top', lineHeight: 21, paddingTop: 13 },
  ageField: { flex: 0.72 },
  cityField: { flex: 1.28 },
  selectionCount: { marginLeft: 34, marginTop: -4, color: '#819087', fontSize: 11 },
  hiddenNotice: { backgroundColor: '#f5eadf', borderRadius: 10, padding: 13, marginVertical: 14 },
  hiddenNoticeText: { color: '#765640', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  previewCard: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', marginTop: 14 },
  previewPhoto: { height: 390, position: 'relative', backgroundColor: '#dfe8d4' },
  previewImage: { width: '100%', height: '100%', backgroundColor: '#dfe8d4' },
  previewImageCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingVertical: 16, backgroundColor: 'rgba(25, 43, 35, 0.78)' },
  previewHeroName: { color: '#fff', fontSize: 27, fontWeight: '700' },
  previewHeroDetails: { color: '#e2e9df', fontSize: 13, marginTop: 3 },
  previewBody: { padding: 18 },
  previewBio: { color: '#53665d', fontSize: 15, lineHeight: 22, marginTop: 14 },
  previewText: { color: '#53665d', fontSize: 14, lineHeight: 21 },
  previewSectionLabel: { color: '#9ba49b', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 21, marginBottom: 9 },
  previewInterests: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  previewInterest: { borderWidth: 1, borderColor: '#dce2d6', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 7, color: '#526f35', fontSize: 12 },
  sectionLabel: { color: '#9ba49b', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 8, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowInput: { flex: 1 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 18 },
  interest: { borderWidth: 1, borderColor: '#dce2d6', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  interestActive: { borderColor: '#a8c66d', backgroundColor: '#e7f0d8' },
  interestText: { color: '#7d8b82', fontSize: 12 },
  interestTextActive: { color: '#526f35', fontWeight: '700' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  choice: { borderWidth: 1, borderColor: '#dce2d6', backgroundColor: '#fff', borderRadius: 7, paddingHorizontal: 13, paddingVertical: 10 },
  choiceActive: { borderColor: '#a8c66d', backgroundColor: '#e7f0d8' },
  choiceText: { color: '#7d8b82', fontSize: 12 },
  choiceTextActive: { color: '#526f35', fontWeight: '700' },
  preferenceBlock: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  preferenceRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#edf0e9' },
  preferenceLabel: { color: '#27483d', fontWeight: '700', fontSize: 13, marginBottom: 7 },
  preferenceChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  preferenceOption: { borderWidth: 1, borderColor: '#e4e8e0', borderRadius: 4, paddingHorizontal: 9, paddingVertical: 7 },
  preferenceOptionActive: { borderColor: '#a8c66d', backgroundColor: '#e7f0d8' },
  preferenceChoice: { color: '#8a978e', fontSize: 11 },
  preferenceChoiceActive: { color: '#66833d', fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginTop: 10, boxShadow: '0px 7px 15px rgba(39, 72, 61, 0.12)', elevation: 3 },
  photo: { width: '100%', height: 310, backgroundColor: '#dfe8d4' },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: '#27483d', fontSize: 80, fontWeight: '700' },
  cardBody: { padding: 18 },
  matchesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  matchCard: { backgroundColor: '#fff', borderColor: '#e4e5dc', borderWidth: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 4 },
  matchPhotoFrame: { position: 'relative' },
  matchPhoto: { width: '100%', height: 240, backgroundColor: '#dfe8d4' },
  matchPhotoFallback: { alignItems: 'center', justifyContent: 'center' },
  matchInitial: { color: '#27483d', fontSize: 68, fontWeight: '700' },
  matchBadge: { position: 'absolute', left: 12, top: 12, backgroundColor: '#f7f5ef', borderRadius: 5, paddingHorizontal: 9, paddingVertical: 7 },
  matchBadgeText: { color: '#526f35', fontSize: 11, fontWeight: '700' },
  matchCardBody: { padding: 16 },
  matchName: { color: '#27483d', fontSize: 21, fontWeight: '700' },
  matchDetails: { color: '#819087', fontSize: 13, lineHeight: 20, marginTop: 3 },
  matchBio: { color: '#53645a', fontSize: 13, lineHeight: 19, marginTop: 10 },
  matchInterests: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  matchInterest: { color: '#526f35', backgroundColor: '#e7f0d8', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: '600' },
  matchActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  matchActionButton: { flex: 1, backgroundColor: '#27483d', borderRadius: 7, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  matchActionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  matchSafetyActions: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingTop: 12 },
  matchSafetyText: { color: '#9b6c61', fontSize: 11, fontWeight: '600' },
  ratingScreen: { flex: 1, backgroundColor: '#f7f5ef' },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e5dc' },
  ratingBackButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ratingBackText: { fontSize: 24, fontWeight: '700', color: '#27483d' },
  ratingTitle: { flex: 1, marginLeft: 8, color: '#27483d', fontSize: 18, fontWeight: '700' },
  ratingSpacer: { width: 40 },
  ratingContent: { flex: 1 },
  ratingTargetCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, margin: 16, marginBottom: 24 },
  ratingTargetName: { color: '#27483d', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  ratingTargetInfo: { color: '#819087', fontSize: 14 },
  ratingSection: { backgroundColor: '#fff', borderRadius: 16, padding: 20, margin: 16, marginBottom: 0 },
  ratingSectionTitle: { color: '#27483d', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  ratingSectionSubtitle: { color: '#819087', fontSize: 14, marginBottom: 20 },
  starsContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  starButton: { padding: 8 },
  star: { fontSize: 40, color: '#dce2d6' },
  starActive: { color: '#f5a623' },
  ratingLabel: { color: '#27483d', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  ratingComment: { backgroundColor: '#f7f5ef', borderWidth: 1, borderColor: '#dce2d6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#27483d', fontSize: 15, minHeight: 100 },
  ratingFooter: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e4e5dc' },
  ratingSubmit: { backgroundColor: '#27483d', borderRadius: 12, padding: 16, alignItems: 'center' },
  ratingSubmitDisabled: { opacity: 0.5 },
  ratingSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  challengeCard: { backgroundColor: '#fff', borderRadius: 14, padding: 17, marginBottom: 12 },
  challengeTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  challengeCategory: { color: '#66833d', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  challengeCredits: { color: '#bd8068', fontSize: 12, fontWeight: '700' },
  challengeTitle: { color: '#27483d', fontSize: 21, fontWeight: '700', marginBottom: 7 },
  challengeMeta: { color: '#66833d', fontSize: 12, marginTop: 14, fontWeight: '700' },
  chat: { flex: 1, backgroundColor: '#f7f5ef' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e5dc' },
  chatBackButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chatBackText: { fontSize: 24, fontWeight: '700', color: '#27483d' },
  chatHeaderCenter: { flex: 1, marginLeft: 8 },
  chatHeaderName: { color: '#27483d', fontSize: 18, fontWeight: '700' },
  chatHeaderSubtitle: { color: '#819087', fontSize: 12, marginTop: 2 },
  chatHeaderRight: { width: 40, alignItems: 'flex-end' },
  chatSettingsButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chatSettingsText: { fontSize: 20 },
  chatMessageArea: { flex: 1, position: 'relative' },
  chatPattern: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'space-around', padding: 6 },
  chatPatternRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  chatPatternGlyph: { opacity: 0.16, fontSize: 20, fontWeight: '700' },
  messageList: { flex: 1, backgroundColor: 'transparent' },
  messageContent: { gap: 10, paddingVertical: 16, paddingHorizontal: 16 },
  messageRow: { width: '100%', flexDirection: 'row', justifyContent: 'flex-start' },
  messageRowIncoming: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '82%', borderRadius: 12, padding: 12 },
  messageBubbleIncoming: { backgroundColor: '#e7f0d8', borderTopRightRadius: 4 },
  messageBubbleOwn: { backgroundColor: '#f1d8cc', borderTopLeftRadius: 4 },
  messageSender: { color: '#66833d', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  messageSenderOwn: { color: '#935c4f' },
  messageText: { color: '#27483d', fontSize: 14, lineHeight: 20 },
  messageTextOwn: { color: '#27483d' },
  messageTime: { color: '#819087', fontSize: 10, marginTop: 5, textAlign: 'right' },
  messageTimeOwn: { color: '#819087' },
  chatEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  chatEmptyIcon: { fontSize: 48, marginBottom: 12 },
  chatEmptyText: { color: '#819087', fontSize: 14, textAlign: 'center' },
  scrollBottomButton: { position: 'absolute', right: 16, bottom: 90, width: 44, height: 44, borderRadius: 22, backgroundColor: '#27483d', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  scrollBottomText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  composer: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e4e5dc' },
  composerInput: { flex: 1, backgroundColor: '#f7f5ef', borderWidth: 1, borderColor: '#dce2d6', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, color: '#27483d' },
  emojiToggle: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emojiToggleText: { fontSize: 24 },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#27483d', alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emojiPicker: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#e4e5dc' },
  emojiPickerContent: { gap: 8 },
  emojiButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#f7f5ef' },
  emojiText: { fontSize: 24 },
  emojiCloseButton: { position: 'absolute', right: 12, top: 12, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#dce2d6' },
  emojiCloseText: { color: '#52645a', fontSize: 16, fontWeight: '700' },
  name: { color: '#27483d', fontSize: 27, fontWeight: '700' },
  muted: { color: '#8a978e', fontSize: 13, lineHeight: 20 },
  bio: { color: '#53645a', fontSize: 14, lineHeight: 21, marginTop: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16 },
  tag: { color: '#66833d', backgroundColor: '#e7f0d8', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 6, fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 22 },
  pass: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: '#dfa895', alignItems: 'center', justifyContent: 'center' },
  superLike: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: '#f5a623', alignItems: 'center', justifyContent: 'center' },
  like: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: '#a8c66d', alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 29, color: '#688b42' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyTitle: { color: '#27483d', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  secondary: { borderWidth: 1, borderColor: '#a8c66d', borderRadius: 10, padding: 14, marginTop: 20 },
  secondaryText: { color: '#66833d', fontWeight: '700' },
  visibility: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 6, padding: 16, marginTop: 16, marginBottom: 12 },
  visibilityCopy: { flex: 1, paddingRight: 12 },
  sectionTitle: { color: '#27483d', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#dce2d6', padding: 3 },
  switchOn: { backgroundColor: '#a8c66d' },
  switchKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  switchKnobOn: { alignSelf: 'flex-end' },
  settingsScreen: { flex: 1, backgroundColor: '#f7f5ef' },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e5dc' },
  settingsBackButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  settingsBackText: { fontSize: 24, fontWeight: '700', color: '#27483d' },
  settingsTitle: { flex: 1, marginLeft: 8, color: '#27483d', fontSize: 18, fontWeight: '700' },
  settingsSpacer: { width: 40 },
  settingsContent: { flex: 1 },
  settingsSection: { backgroundColor: '#fff', marginTop: 16, padding: 0 },
  settingsSectionTitle: { paddingHorizontal: 16, paddingVertical: 12, color: '#819087', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1ede6' },
  settingsRowLeft: { flex: 1, paddingRight: 12 },
  settingsLabel: { color: '#27483d', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  settingsHint: { color: '#819087', fontSize: 12, lineHeight: 16 },
  toggle: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#dce2d6', padding: 3 },
  toggleActive: { backgroundColor: '#a8c66d' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleKnobActive: { alignSelf: 'flex-end' },
  colorPickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16, zIndex: 1 },
  colorOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 2, borderColor: '#dce2d6', borderRadius: 12, backgroundColor: '#fff', minWidth: 110, zIndex: 2 },
  colorOptionInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorOptionActive: { borderColor: '#66833d', backgroundColor: '#e7f0d8', borderWidth: 2 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorCheckmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  colorLabel: { color: '#718077', fontSize: 13, fontWeight: '500' },
  colorLabelActive: { color: '#405c39', fontWeight: '700' },
  customColorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  customColorPreview: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#dce2d6' },
  customColorInput: { flex: 1, borderWidth: 1, borderColor: '#dce2d6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#27483d', fontSize: 15 },
  customColorButton: { backgroundColor: '#27483d', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  customColorButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  customColorError: { paddingHorizontal: 16, paddingBottom: 14, color: '#a34747', fontSize: 12 },
  patternOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  patternOption: { alignItems: 'center', justifyContent: 'center', minWidth: 96, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 2, borderColor: '#dce2d6', borderRadius: 12 },
  patternOptionActive: { borderColor: '#66833d', backgroundColor: '#e7f0d8' },
  patternPreview: { color: '#27483d', fontSize: 20, minHeight: 26, marginBottom: 5 },
  colorPreviewSection: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f7f5ef', gap: 16 },
  previewBubbleContainer: { flex: 1 },
  previewBubble: { maxWidth: '100%', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  previewBubbleText: { color: '#27483d', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  previewBubbleTime: { color: '#819087', fontSize: 10, textAlign: 'right' },
  previewLabel: { color: '#819087', fontSize: 12, fontWeight: '600' },
  emojiReactionScreen: { flex: 1, backgroundColor: '#f7f5ef' },
  emojiReactionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e5dc' },
  emojiReactionBackButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emojiReactionBackText: { fontSize: 24, fontWeight: '700', color: '#27483d' },
  emojiReactionTitle: { flex: 1, marginLeft: 8, color: '#27483d', fontSize: 18, fontWeight: '700' },
  emojiReactionSpacer: { width: 40 },
  emojiReactionContent: { flex: 1 },
  emojiReactionTargetCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, margin: 16, marginBottom: 24 },
  emojiReactionTargetName: { color: '#27483d', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  emojiReactionTargetInfo: { color: '#819087', fontSize: 14 },
  emojiReactionSection: { backgroundColor: '#fff', borderRadius: 16, padding: 20, margin: 16, marginBottom: 0 },
  emojiReactionSectionTitle: { color: '#27483d', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emojiReactionSectionSubtitle: { color: '#819087', fontSize: 14, marginBottom: 20 },
  emojiReactionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  emojiReactionButton: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#f7f5ef' },
  emojiReactionEmoji: { fontSize: 36 },
  inlineEmojiPicker: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e4e5dc' },
  inlineEmojiPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inlineEmojiPickerTitle: { color: '#27483d', fontSize: 16, fontWeight: '700' },
  inlineEmojiPickerClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#f7f5ef' },
  inlineEmojiPickerCloseText: { color: '#52645a', fontSize: 18, fontWeight: '700' },
  inlineEmojiPickerContent: { gap: 10 },
  inlineEmojiButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f7f5ef' },
  inlineEmojiText: { fontSize: 28 },
  flyingEmojiContainer: { position: 'absolute', bottom: 80, left: '50%', marginLeft: -30, zIndex: 10 },
  flyingEmoji: { fontSize: 60 },
  firework: { position: 'absolute', zIndex: 20 },
  fireworkEmoji: { fontSize: 30 },
});
