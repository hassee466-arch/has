export type MembershipTier = {
  key: string;
  name: string;
  priceSek: number;
  monthlyDateSupport: string;
  perks: string[];
  color: string;
};

export type RevenueSource = {
  name: string;
  description: string;
};

export type FundRule = {
  title: string;
  description: string;
};

export type BusinessMetric = {
  name: string;
  description: string;
};

export const membershipTiers: MembershipTier[] = [
  {
    key: 'free',
    name: 'Free',
    priceSek: 0,
    monthlyDateSupport: '0–20 kr',
    color: '#7d8b82',
    perks: ['Skapa profil', 'Matcha med andra', 'Begränsade uppdrag', 'Tillgång till vissa partnererbjudanden'],
  },
  {
    key: 'plus',
    name: 'Plus',
    priceSek: 99,
    monthlyDateSupport: '40 kr',
    color: '#2d4a3e',
    perks: ['Fler uppdrag', 'Medlemsrabatter hos partners', 'Fler matchningsmöjligheter'],
  },
  {
    key: 'premium',
    name: 'Premium',
    priceSek: 199,
    monthlyDateSupport: '100 kr',
    color: '#4a3f66',
    perks: ['Premiumupplevelser', 'Fler challenge credits', 'Prioriterade bokningar'],
  },
  {
    key: 'adventure',
    name: 'Adventure',
    priceSek: 399,
    monthlyDateSupport: '200 kr',
    color: '#7c4a2d',
    perks: ['Utvalda upplevelser', 'Större månadsbudget för dejtstöd', 'Exklusiva aktiviteter'],
  },
];

export const revenueSources: RevenueSource[] = [
  { name: 'Medlemskap', description: 'Månads- och årsabonnemang som finansierar den löpande verksamheten.' },
  { name: 'Partnerprovision', description: 'Ersättning per genomförd bokning enligt partneravtal.' },
  { name: 'Partnerpaket', description: 'Företag betalar för synlighet och kampanjer i appen.' },
  { name: 'Premiumupplevelser', description: 'Exklusiva aktiviteter med högre pris.' },
  { name: 'Företagsevent', description: 'Betalda sociala evenemang och gruppaktiviteter.' },
];

export const cafeExample = {
  menuPrice: 140,
  partnerPrice: 90,
  memberPays: 50,
  jannahuInvests: 40,
  commissionRate: 0.1,
  commission: 9,
  partnerReceives: 81,
  contribution: 19,
};

export const fundRules: FundRule[] = [
  { title: 'Endast genomförda aktiviteter', description: 'Dejtstödet ges först när aktiviteten faktiskt genomförts och verifierats hos partnern.' },
  { title: 'Tydlig giltighetstid', description: 'Outnyttjat stöd kan löpa ut efter en tydlig period, med villkor som visas före köp.' },
  { title: 'Totalt månadstak', description: 'Jannahu sätter ett tak för hur mycket företaget subventionerar varje månad — aldrig mer än budgeten tillåter.' },
  { title: 'Begränsad användning per medlem', description: 'Varje medlemskap har en egen månadsbudget, så stödet fördelas rättvist.' },
  { title: 'Verifiering mot missbruk', description: 'QR-kod, boknings-ID och partnerkontroll förhindrar falska bokningar.' },
  { title: 'Reserv för återbetalningar', description: 'En del av intäkterna hålls tillgänglig för avbokningar, återbetalningar och tvister.' },
];

export const businessMetrics: BusinessMetric[] = [
  { name: 'Betalande medlemmar', description: 'Återkommande intäkter från abonnemang.' },
  { name: 'Kostnad per ny medlem', description: 'Vad marknadsföringen kostar per ny medlem.' },
  { name: 'Genomförda dejter', description: 'Om appen skapar verkliga möten.' },
  { name: 'Kostnad per subventionerad dejt', description: 'Hur mycket företaget investerar per möte.' },
  { name: 'Partnerintäkt per bokning', description: 'Vad samarbetena genererar.' },
  { name: 'Återkommande bokningar', description: 'Om medlemmarna använder tjänsten igen.' },
  { name: 'Avhopp från medlemskap', description: 'Om medlemmarna upplever tillräckligt värde.' },
];

export const growthPhases = [
  'Lansera i en stad och anslut caféer och restauranger',
  'Introducera bowling, minigolf, bio och andra aktiviteter',
  'Utöka medlemskap och återkommande uppdrag',
  'Samarbeta med hotell, reseföretag och upplevelsearrangörer',
  'Expandera till fler svenska städer och därefter andra länder',
];
