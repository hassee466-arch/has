export type ProfileJourney = {
  personal: {
    dateOfBirth: string;
    gender: string;
    interestedIn: string[];
    nationality: string;
    languages: string;
  };
  introduction: {
    videoUrl: string;
    voiceUrl: string;
  };
  personality: {
    socialStyle: string;
    planningStyle: string;
    adventure: string;
    competition: string;
    conversation: string;
    novelty: string;
  };
  intentions: {
    goals: string[];
    qualities: string[];
  };
  activities: string[];
  challenges: {
    types: string[];
    adventureLevel: number;
  };
  lifestyle: {
    smoking: string;
    alcohol: string;
    exercise: string;
    pets: string;
    travel: string;
    social: string;
    weekends: string[];
    sleep: string;
    visible: boolean;
  };
  partner: {
    ageMin: number;
    ageMax: number;
    distanceKm: number;
    genders: string[];
    intentions: string[];
    sharedInterests: string[];
    lifestyle: string[];
  };
  availability: {
    times: string[];
    budget: string;
  };
  safety: {
    adultConfirmed: boolean;
    guidelinesAccepted: boolean;
    profileVisible: boolean;
  };
};

export const emptyProfileJourney: ProfileJourney = {
  personal: { dateOfBirth: '', gender: '', interestedIn: [], nationality: '', languages: '' },
  introduction: { videoUrl: '', voiceUrl: '' },
  personality: { socialStyle: '', planningStyle: '', adventure: '', competition: '', conversation: '', novelty: '' },
  intentions: { goals: [], qualities: [] },
  activities: [],
  challenges: { types: [], adventureLevel: 3 },
  lifestyle: { smoking: '', alcohol: '', exercise: '', pets: '', travel: '', social: '', weekends: [], sleep: '', visible: false },
  partner: { ageMin: 18, ageMax: 70, distanceKm: 50, genders: [], intentions: [], sharedInterests: [], lifestyle: [] },
  availability: { times: [], budget: '' },
  safety: { adultConfirmed: false, guidelinesAccepted: false, profileVisible: false },
};

export const profileJourneySteps = [
  'Personlig information',
  'Bilder och introduktion',
  'Personlighet',
  'Dejtingintentioner',
  'Intressen och aktiviteter',
  'Utmaningspersonlighet',
  'Livsstil',
  'Partnerpreferenser',
  'Redo för utmaningar',
  'Trygghet och verifiering',
] as const;

export const activityCategories = [
  { title: 'Mat & fika', activities: ['Kafé', 'Restaurang', 'Laga mat', 'Bageri'] },
  { title: 'Äventyr', activities: ['Vandring', 'Resor', 'Upptäcktsfärd', 'Klättring'] },
  { title: 'Spel', activities: ['Bowling', 'Minigolf', 'Escape room', 'Brädspel'] },
  { title: 'Skapa', activities: ['Måla', 'Fotografi', 'Keramik', 'Workshop'] },
  { title: 'Kultur', activities: ['Museum', 'Konsert', 'Bio', 'Teater'] },
  { title: 'Rörelse', activities: ['Träning', 'Cykling', 'Dans', 'Yoga'] },
  { title: 'Lugn & natur', activities: ['Promenad', 'Natur', 'Spa', 'Picknick'] },
];

export function normalizeDateOfBirth(value: string): string | null {
  const input = value.trim();
  const yearFirst = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(input);
  const dayFirst = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(input);
  const year = Number(yearFirst?.[1] ?? dayFirst?.[3]);
  const month = Number(yearFirst?.[2] ?? dayFirst?.[2]);
  const day = Number(yearFirst?.[3] ?? dayFirst?.[1]);
  if (!yearFirst && !dayFirst) return null;
  const birthDate = new Date(year, month - 1, day);
  if (birthDate.getFullYear() !== year || birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function ageFromDateOfBirth(dateOfBirth: string): number | null {
  const normalized = normalizeDateOfBirth(dateOfBirth);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday = today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}