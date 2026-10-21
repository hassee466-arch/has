export type ChallengeCategoryKey = 'mystery' | 'competition' | 'creative' | 'adventure' | 'connection' | 'teamwork';

export type ChallengeCategory = {
  key: ChallengeCategoryKey;
  label: string;
  icon: string;
  color: string;
  tagline: string;
};

export type MissionStage = {
  number: number;
  title: string;
  description: string;
};

export type Challenge = {
  id: string;
  title: string;
  category: ChallengeCategoryKey;
  level: 1 | 2 | 3;
  durationMinutes: number;
  memberPriceSek: number | null;
  partner: string;
  area: string;
  description: string;
  goal: string;
  reward: string;
  featured?: boolean;
  stages: MissionStage[];
};

export const challengeCategories: ChallengeCategory[] = [
  { key: 'mystery', label: 'Mysterieuppdrag', icon: '◍', color: '#4a3f66', tagline: 'Lös ledtrådar och upptäck överraskningar tillsammans.' },
  { key: 'competition', label: 'Tävling', icon: '⚑', color: '#7c4a2d', tagline: 'Spel, minigolf och vänliga tävlingar.' },
  { key: 'creative', label: 'Skapa tillsammans', icon: '✦', color: '#3d5a63', tagline: 'Måla, laga mat och bygg något tillsammans.' },
  { key: 'adventure', label: 'Äventyr', icon: '↗', color: '#2d4a3e', tagline: 'Utforska staden genom uppdrag.' },
  { key: 'connection', label: 'Kontakt', icon: '♡', color: '#8a4a52', tagline: 'Samtalsspel och personlig upptäckt.' },
  { key: 'teamwork', label: 'Samarbete', icon: '⌁', color: '#5d6636', tagline: 'Slutför en gemensam uppgift mot klockan.' },
];

export const challenges: Challenge[] = [
  {
    id: 'connection-30',
    title: '30-minuterskontakten',
    category: 'connection',
    level: 2,
    durationMinutes: 30,
    memberPriceSek: 49,
    partner: 'Bröd & Blom',
    area: 'Södermalm',
    description: 'Ett kafébaserat uppdrag designat för två personer som vill lära känna varandra bortom småprat.',
    goal: 'Hitta tre saker ni båda vill utforska tillsammans.',
    reward: '20 credits var · fika ingår i priset',
    featured: true,
    stages: [
      { number: 1, title: 'Första intrycket', description: 'Var och en väljer tre frågor att ställa till den andra.' },
      { number: 2, title: 'Mysteriet', description: 'Gissa tre saker om varandras intressen utan att fråga rakt ut.' },
      { number: 3, title: 'Samarbete', description: 'Planera tillsammans en drömhelg med en begränsad budget.' },
      { number: 4, title: 'Beslutet', description: 'Bestäm var för sig om ni vill ta ett nytt uppdrag tillsammans.' },
    ],
  },
  {
    id: 'mystery-cafe',
    title: 'Den försvunna beställningen',
    category: 'mystery',
    level: 1,
    durationMinutes: 45,
    memberPriceSek: 79,
    partner: 'Lera Studio',
    area: 'Vasastan',
    description: 'En ledtråd gömmer sig i caféet. Tillsammans följer ni spåret till en överraskning som väntar på er.',
    goal: 'Lös alla tre ledtrådar innan tiden tar slut.',
    reward: '25 credits var · överraskning ingår',
    stages: [
      { number: 1, title: 'Första ledtråden', description: 'Personalen ger er den första ledtråden när ni checkar in.' },
      { number: 2, title: 'Samarbete', description: 'Kombinera era svar för att hitta nästa steg.' },
      { number: 3, title: 'Avslöjandet', description: 'Hitta överraskningen som gömts för er.' },
    ],
  },
  {
    id: 'competition-minigolf',
    title: 'Minigolf-duellen',
    category: 'competition',
    level: 1,
    durationMinutes: 60,
    memberPriceSek: 99,
    partner: 'Green & Putt',
    area: 'Gärdet',
    description: 'Nio hål, en poängtavla och en vänskapsfråga vid varje hål. Den som förlorar bjuder på eftersnacket.',
    goal: 'Spela igenom banan och svara på frågan vid varje hål.',
    reward: '30 credits till vinnaren · 10 credits var',
    stages: [
      { number: 1, title: 'Uppvärmning', description: 'Tre första hålen med en enkel fråga per hål.' },
      { number: 2, title: 'Mittpartiet', description: 'Frågorna blir djupare i takt med spelet.' },
      { number: 3, title: 'Finalen', description: 'Sista hålet avgör duellen — och bjudningen.' },
    ],
  },
  {
    id: 'creative-clay',
    title: 'Lera för två',
    category: 'creative',
    level: 2,
    durationMinutes: 75,
    memberPriceSek: 149,
    partner: 'Lera Studio',
    area: 'Vasastan',
    description: 'Forma något tillsammans utan att prata om vad det ska bli. Konstverket avslöjar sig i slutet.',
    goal: 'Skapa ett gemensamt föremål utan att avslöja planen för varandra.',
    reward: '50 credits var · ni tar med skapelsen hem',
    stages: [
      { number: 1, title: 'Materialen', description: 'Välj lera och verktyg utan att diskutera idén.' },
      { number: 2, title: 'Formandet', description: 'Bygg vidare på varandras drag, i tystnad.' },
      { number: 3, title: 'Avslöjandet', description: 'Berätta vad ni trodde ni skapade — och vad det blev.' },
    ],
  },
  {
    id: 'adventure-view',
    title: 'Vyn över stan',
    category: 'adventure',
    level: 2,
    durationMinutes: 60,
    memberPriceSek: null,
    partner: 'Monteliusvägen',
    area: 'Södermalm',
    description: 'Ett vandringsuppdrag längs Monteliusvägen med tre stationer och en bildskatt att hitta tillsammans.',
    goal: 'Besök alla tre stationer och hitta den gömda utsikten.',
    reward: 'Gratis uppdrag · 15 credits var',
    stages: [
      { number: 1, title: 'Startpunkten', description: 'Möt upp vid Ivar Los park och hämta första kartan.' },
      { number: 2, title: 'Stationerna', description: 'Lös ett litet uppdrag vid varje utsiktspunkt.' },
      { number: 3, title: 'Målet', description: 'Hitta den gömda utsikten och dela bilden tillsammans.' },
    ],
  },
  {
    id: 'teamwork-escape',
    title: '30 minuter mot klockan',
    category: 'teamwork',
    level: 3,
    durationMinutes: 30,
    memberPriceSek: 189,
    partner: 'Riddle Room',
    area: 'Norrmalm',
    description: 'Ett kompakt escape-uppdrag där ni måste dela upp ledtrådar, lås och beslut för att klara rummet i tid.',
    goal: 'Slutför rummet innan klockan når noll.',
    reward: '60 credits var vid lyckad flykt',
    stages: [
      { number: 1, title: 'Innescanning', description: 'Fyra minuter att kartlägga rummet tillsammans.' },
      { number: 2, title: 'Fördelningen', description: 'Dela upp gåtorna — ingen får göra allt själv.' },
      { number: 3, title: 'Slutspurten', description: 'Kombinera era lösningar och öppna sista låset.' },
    ],
  },
  {
    id: 'connection-questions',
    title: '36 frågor, en kopp kaffe',
    category: 'connection',
    level: 1,
    durationMinutes: 45,
    memberPriceSek: 39,
    partner: 'Kaffeverket',
    area: 'Sankt Eriksplan',
    description: 'En kuraterad frågeserie som går från lättsamt till personligt, designad för att bygga riktig kontakt.',
    goal: 'Svara på alla tre nivåer av frågor, i ert eget tempo.',
    reward: '15 credits var · espresso ingår',
    stages: [
      { number: 1, title: 'Lättsamt', description: 'Tolv snabba frågor om vardag, favoriter och vanor.' },
      { number: 2, title: 'Personligt', description: 'Tolv frågor om drömmar, rädslor och stolthet.' },
      { number: 3, title: 'Djupet', description: 'Tolv frågor som bara passar när samtalet känns tryggt.' },
    ],
  },
  {
    id: 'mystery-city',
    title: 'Stadens hemlighet',
    category: 'mystery',
    level: 3,
    durationMinutes: 90,
    memberPriceSek: 129,
    partner: 'City Quest',
    area: 'Gamla stan',
    description: 'En vandrande mysteriejakt genom Gamla stan där varje svar öppnar nästa del av historien.',
    goal: 'Avslöja berättelsen bakom stadens hemlighet tillsammans.',
    reward: '40 credits var · avslutningsfika ingår',
    stages: [
      { number: 1, title: 'Prologen', description: 'Få första kapitlet och kartans startpunkt.' },
      { number: 2, title: 'Förföljelsen', description: 'Följ ledtrådarna genom gränderna, ett kapitel i taget.' },
      { number: 3, title: 'Finalen', description: 'Lös det sista mysteriet vid vattnet.' },
    ],
  },
  {
    id: 'competition-bowling',
    title: 'Bowlingkvällen',
    category: 'competition',
    level: 2,
    durationMinutes: 75,
    memberPriceSek: 119,
    partner: 'Bowl & Talk',
    area: 'Fridhemsplan',
    description: 'En serie med tre korta serier där varje förlorad serie kostar ett ärligt svar.',
    goal: 'Spela tre serier — och svara ärligt när du tappar en.',
    reward: '35 credits var · dryck ingår',
    stages: [
      { number: 1, title: 'Första serien', description: 'Uppvärmning och första frågan till förloraren.' },
      { number: 2, title: 'Revanschen', description: 'Den som ligger under får välja nästa fråga.' },
      { number: 3, title: 'Finalserien', description: 'Sista serien avgör vem som bjuder på nästa uppdrag.' },
    ],
  },
  {
    id: 'creative-photo',
    title: 'En timme i färg',
    category: 'creative',
    level: 1,
    durationMinutes: 60,
    memberPriceSek: null,
    partner: 'Fotografiska',
    area: 'Stadsgården',
    description: 'Fotografera varandras syn på samma plats och jämför bilderna i slutet av uppdraget.',
    goal: 'Fånga tio bilder var — samma plats, två perspektiv.',
    reward: 'Gratis uppdrag · 20 credits var',
    stages: [
      { number: 1, title: 'Perspektiven', description: 'Fem bilder var på det ni ser olika.' },
      { number: 2, title: 'Porträttet', description: 'En bild var av den andra, i deras favoritljus.' },
      { number: 3, title: 'Galleriet', description: 'Jämför era bilder och välj varandras favorit.' },
    ],
  },
  {
    id: 'adventure-islands',
    title: 'Ö-hoppningen',
    category: 'adventure',
    level: 3,
    durationMinutes: 120,
    memberPriceSek: 69,
    partner: 'Waxholmsbolaget',
    area: 'Skärgården',
    description: 'Tre öar, tre små uppdrag och en färjetidtabell att hålla — ett större äventyr för rätt par.',
    goal: 'Besök tre öar och slutför ett uppdrag på varje.',
    reward: '45 credits var · picknickkarta ingår',
    stages: [
      { number: 1, title: 'Färjan ut', description: 'Planera rutten tillsammans innan avfärd.' },
      { number: 2, title: 'Öarna', description: 'Ett litet uppdrag per ö, från lekfullt till personligt.' },
      { number: 3, title: 'Hemresan', description: 'Sammanfatta dagen med var sin höjdpunkt.' },
    ],
  },
  {
    id: 'teamwork-cook',
    title: 'Middagsuppdraget',
    category: 'teamwork',
    level: 2,
    durationMinutes: 90,
    memberPriceSek: 159,
    partner: 'Kök & Co',
    area: 'Kungsholmen',
    description: 'Laga en trerättersmiddag tillsammans från en hemlig ingredienslåda — menyn avslöjas först på plats.',
    goal: 'Servera en komplett middag inom 90 minuter.',
    reward: '55 credits var · middagen ingår',
    stages: [
      { number: 1, title: 'Lådan', description: 'Öppna ingredienslådan och fördela arbetsuppgifterna.' },
      { number: 2, title: 'Matlagningen', description: 'Laga mot klockan, en rätt var i taget.' },
      { number: 3, title: 'Serveringen', description: 'Duka upp och ät det ni skapade tillsammans.' },
    ],
  },
];

export function categoryFor(key: ChallengeCategoryKey): ChallengeCategory {
  return challengeCategories.find((category) => category.key === key) ?? challengeCategories[0];
}

export function formatPrice(price: number | null): string {
  return price === null ? 'Gratis' : `${price} kr`;
}
