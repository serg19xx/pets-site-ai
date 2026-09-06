/**
 * Curated official links: Canada animal ownership / welfare / related federal law.
 * Not legal advice. Update checkedAt when an editor verifies a URL.
 * n8n monitor (agents/n8n/docs/learn-legal-monitor.md) should alert on dead/moved pages.
 */

export const LEARN_LEGAL_REGIONS = [
  'federal',
  'qc',
  'on',
  'bc',
  'ab',
  'mb',
  'sk',
  'ns',
  'nb',
  'nl',
  'pe',
  'yt',
  'nt',
  'nu',
] as const

export type LearnLegalRegion = (typeof LEARN_LEGAL_REGIONS)[number]

export const LEARN_LEGAL_TOPICS = [
  'cruelty',
  'welfare',
  'ownership',
  'breeding',
  'health',
  'wildlife',
] as const

export type LearnLegalTopic = (typeof LEARN_LEGAL_TOPICS)[number]

export interface LearnLegalLink {
  id: string
  region: LearnLegalRegion
  /** Prefer official government / legislature URLs. */
  url: string
  titleEn: string
  titleFr: string
  noteEn: string
  noteFr: string
  topics: LearnLegalTopic[]
  /** ISO date when an editor last confirmed the URL still works. */
  checkedAt: string
}

/** Province order on the page: Quebec first (soft-launch), then alpha by English name. */
export const LEARN_LEGAL_PROVINCE_ORDER: Exclude<LearnLegalRegion, 'federal'>[] = [
  'qc',
  'ab',
  'bc',
  'mb',
  'nb',
  'nl',
  'nt',
  'ns',
  'nu',
  'on',
  'pe',
  'sk',
  'yt',
]

const CHECKED = '2026-09-06'

export const LEARN_LEGAL_LINKS: LearnLegalLink[] = [
  {
    id: 'ca-criminal-code',
    region: 'federal',
    url: 'https://laws-lois.justice.gc.ca/eng/acts/c-46/',
    titleEn: 'Criminal Code (Canada)',
    titleFr: 'Code criminel (Canada)',
    noteEn:
      'Federal offences including animal cruelty and related provisions. Search the Act for “animal”.',
    noteFr:
      'Infractions fédérales, dont la cruauté envers les animaux. Cherchez « animal » dans la loi.',
    topics: ['cruelty'],
    checkedAt: CHECKED,
  },
  {
    id: 'ca-health-of-animals',
    region: 'federal',
    url: 'https://laws-lois.justice.gc.ca/eng/acts/H-3.3/',
    titleEn: 'Health of Animals Act',
    titleFr: 'Loi sur la santé des animaux',
    noteEn: 'Federal animal health, disease control, and related transport rules (CFIA / ACIA).',
    noteFr:
      'Santé animale fédérale, maladies et règles de transport connexes (ACIA / CFIA).',
    topics: ['health'],
    checkedAt: CHECKED,
  },
  {
    id: 'ca-cfia-animals',
    region: 'federal',
    url: 'https://inspection.canada.ca/en/animal-health',
    titleEn: 'Canadian Food Inspection Agency — Animal health',
    titleFr: 'Agence canadienne d’inspection des aliments — Santé des animaux',
    noteEn: 'Federal agency pages on animal health programs and guidance.',
    noteFr: 'Pages de l’agence fédérale sur les programmes et guides de santé animale.',
    topics: ['health'],
    checkedAt: CHECKED,
  },

  // Quebec first
  {
    id: 'qc-b-3-1',
    region: 'qc',
    url: 'https://www.legisquebec.gouv.qc.ca/en/document/cs/B-3.1',
    titleEn: 'Animal Welfare and Safety Act (B-3.1)',
    titleFr: 'Loi sur le bien-être et la sécurité de l’animal (B-3.1)',
    noteEn: 'Main Quebec statute on companion animal welfare and safety.',
    noteFr: 'Loi principale du Québec sur le bien-être et la sécurité des animaux de compagnie.',
    topics: ['welfare', 'ownership', 'breeding'],
    checkedAt: CHECKED,
  },
  {
    id: 'qc-b-3-1-r0-1',
    region: 'qc',
    url: 'https://www.legisquebec.gouv.qc.ca/en/document/cr/B-3.1,%20r.%200.1',
    titleEn: 'Regulation — welfare of companion animals and equines (B-3.1, r. 0.1)',
    titleFr: 'Règlement — bien-être des animaux de compagnie et équidés (B-3.1, r. 0.1)',
    noteEn: 'Detailed standards of care under Quebec’s Animal Welfare and Safety Act.',
    noteFr: 'Normes de soins détaillées sous la Loi sur le bien-être et la sécurité de l’animal.',
    topics: ['welfare', 'ownership', 'breeding'],
    checkedAt: CHECKED,
  },
  {
    id: 'qc-mapaq-animals',
    region: 'qc',
    url: 'https://www.mapaq.gouv.qc.ca/fr/Productions/santeanimale/Pages/santeanimale.aspx',
    titleEn: 'MAPAQ — Animal health (Quebec)',
    titleFr: 'MAPAQ — Santé animale (Québec)',
    noteEn: 'Quebec ministry landing for animal health topics.',
    noteFr: 'Page du ministère québécois sur la santé animale.',
    topics: ['health', 'welfare'],
    checkedAt: CHECKED,
  },

  {
    id: 'on-paws',
    region: 'on',
    url: 'https://www.ontario.ca/laws/statute/19p13',
    titleEn: 'Provincial Animal Welfare Services Act, 2019',
    titleFr: 'Loi de 2019 sur les services provinciaux visant le bien-être des animaux',
    noteEn: 'Ontario’s main animal welfare statute (PAWS Act).',
    noteFr: 'Loi principale de l’Ontario sur le bien-être animal (loi PAWS).',
    topics: ['welfare', 'cruelty', 'ownership'],
    checkedAt: CHECKED,
  },
  {
    id: 'on-animal-welfare',
    region: 'on',
    url: 'https://www.ontario.ca/page/animal-welfare',
    titleEn: 'Ontario.ca — Animal welfare',
    titleFr: 'Ontario.ca — Bien-être des animaux',
    noteEn: 'Government overview and links for animal welfare in Ontario.',
    noteFr: 'Vue d’ensemble et liens du gouvernement ontarien.',
    topics: ['welfare'],
    checkedAt: CHECKED,
  },

  {
    id: 'bc-pcaa',
    region: 'bc',
    url: 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/00_96372_01',
    titleEn: 'Prevention of Cruelty to Animals Act (BC)',
    titleFr: 'Prevention of Cruelty to Animals Act (C.-B.)',
    noteEn: 'British Columbia’s primary cruelty-prevention statute.',
    noteFr: 'Loi principale de la Colombie-Britannique contre la cruauté envers les animaux.',
    topics: ['cruelty', 'welfare'],
    checkedAt: CHECKED,
  },

  {
    id: 'ab-apa',
    region: 'ab',
    url: 'https://www.canlii.org/en/ab/laws/stat/rsa-2000-c-a-41/latest/rsa-2000-c-a-41.html',
    titleEn: 'Animal Protection Act (Alberta)',
    titleFr: 'Animal Protection Act (Alberta)',
    noteEn: 'Alberta animal protection statute (CanLII consolidation).',
    noteFr: 'Loi albertaine sur la protection des animaux (consolidation CanLII).',
    topics: ['cruelty', 'welfare'],
    checkedAt: CHECKED,
  },
  {
    id: 'ab-animal-health',
    region: 'ab',
    url: 'https://www.alberta.ca/animal-health-and-welfare',
    titleEn: 'Alberta.ca — Animal health and welfare',
    titleFr: 'Alberta.ca — Santé et bien-être des animaux',
    noteEn: 'Provincial overview page for animal health and welfare.',
    noteFr: 'Page provinciale sur la santé et le bien-être des animaux.',
    topics: ['health', 'welfare'],
    checkedAt: CHECKED,
  },

  {
    id: 'mb-animal-care',
    region: 'mb',
    url: 'https://web2.gov.mb.ca/laws/statutes/ccsm/a084.php?lang=en',
    titleEn: 'The Animal Care Act (Manitoba)',
    titleFr: 'Loi sur le soin des animaux (Manitoba)',
    noteEn: 'Manitoba’s Animal Care Act (CCSM).',
    noteFr: 'Loi manitobaine sur le soin des animaux (CCSM).',
    topics: ['welfare', 'cruelty'],
    checkedAt: CHECKED,
  },

  {
    id: 'sk-apa',
    region: 'sk',
    url: 'https://www.canlii.org/en/sk/laws/stat/ss-2018-c-a-21.2/latest/ss-2018-c-a-21.2.html',
    titleEn: 'Animal Protection Act, 2018 (Saskatchewan)',
    titleFr: 'Animal Protection Act, 2018 (Saskatchewan)',
    noteEn: 'Saskatchewan animal protection statute (CanLII consolidation).',
    noteFr: 'Loi de la Saskatchewan sur la protection des animaux (CanLII).',
    topics: ['welfare', 'cruelty'],
    checkedAt: CHECKED,
  },

  {
    id: 'ns-animal-protection-act',
    region: 'ns',
    url: 'https://www.canlii.org/en/ns/laws/stat/sns-2008-c-33/latest/sns-2008-c-33.html',
    titleEn: 'Animal Protection Act (Nova Scotia)',
    titleFr: 'Animal Protection Act (Nouvelle-Écosse)',
    noteEn: 'Nova Scotia animal protection statute (CanLII consolidation).',
    noteFr: 'Loi de la Nouvelle-Écosse sur la protection des animaux (CanLII).',
    topics: ['welfare', 'cruelty'],
    checkedAt: CHECKED,
  },

  {
    id: 'nb-spca-act',
    region: 'nb',
    url: 'https://www.canlii.org/en/nb/laws/stat/rsnb-2014-c-130/latest/rsnb-2014-c-130.html',
    titleEn: 'Society for the Prevention of Cruelty to Animals Act (New Brunswick)',
    titleFr: 'Loi sur la Société protectrice des animaux (Nouveau-Brunswick)',
    noteEn: 'New Brunswick SPCA / animal protection statute (CanLII).',
    noteFr: 'Loi du N.-B. sur la SPA / protection des animaux (CanLII).',
    topics: ['cruelty', 'welfare'],
    checkedAt: CHECKED,
  },
  {
    id: 'nb-laws',
    region: 'nb',
    url: 'https://www2.gnb.ca/content/gnb/en/departments/attorney_general/acts_regulations.html',
    titleEn: 'New Brunswick — Acts and regulations',
    titleFr: 'Nouveau-Brunswick — Lois et règlements',
    noteEn: 'Official portal to search current NB statutes and regulations.',
    noteFr: 'Portail officiel pour chercher les lois et règlements du N.-B.',
    topics: ['welfare'],
    checkedAt: CHECKED,
  },

  {
    id: 'nl-animal-health',
    region: 'nl',
    url: 'https://www.assembly.nl.ca/legislation/sr/statutes/a13-1.htm',
    titleEn: 'Animal Health and Protection Act (Newfoundland and Labrador)',
    titleFr: 'Animal Health and Protection Act (Terre-Neuve-et-Labrador)',
    noteEn: 'NL statute on animal health and protection.',
    noteFr: 'Loi de T.-N.-L. sur la santé et la protection des animaux.',
    topics: ['health', 'welfare', 'cruelty'],
    checkedAt: CHECKED,
  },

  {
    id: 'pe-animal-welfare',
    region: 'pe',
    url: 'https://www.princeedwardisland.ca/en/legislation/animal-welfare-act',
    titleEn: 'Animal Welfare Act (Prince Edward Island)',
    titleFr: 'Animal Welfare Act (Île-du-Prince-Édouard)',
    noteEn: 'PEI animal welfare legislation landing.',
    noteFr: 'Page de la législation de l’Î.-P.-É. sur le bien-être animal.',
    topics: ['welfare', 'cruelty'],
    checkedAt: CHECKED,
  },

  {
    id: 'yt-animal-protection',
    region: 'yt',
    url: 'https://www.canlii.org/en/yk/laws/stat/rsy-2002-c-6/latest/rsy-2002-c-6.html',
    titleEn: 'Animal Protection Act (Yukon)',
    titleFr: 'Animal Protection Act (Yukon)',
    noteEn: 'Yukon animal protection statute (CanLII consolidation).',
    noteFr: 'Loi yukonnaise sur la protection des animaux (CanLII).',
    topics: ['cruelty', 'welfare'],
    checkedAt: CHECKED,
  },

  {
    id: 'nt-animal-protection',
    region: 'nt',
    url: 'https://www.canlii.org/en/nt/laws/stat/snwt-2017-c-9/latest/snwt-2017-c-9.html',
    titleEn: 'Animal Protection Act (Northwest Territories)',
    titleFr: 'Animal Protection Act (Territoires du Nord-Ouest)',
    noteEn: 'NWT animal protection statute (CanLII consolidation). Verify title if renumbered.',
    noteFr: 'Loi des T.N.-O. sur la protection des animaux (CanLII). Vérifiez le titre si renuméroté.',
    topics: ['cruelty', 'welfare'],
    checkedAt: CHECKED,
  },
  {
    id: 'nt-justice-legislation',
    region: 'nt',
    url: 'https://www.justice.gov.nt.ca/en/legislation/',
    titleEn: 'NWT Justice — Legislation',
    titleFr: 'Justice T.N.-O. — Législation',
    noteEn: 'Official legislation list for the Northwest Territories.',
    noteFr: 'Liste officielle des lois des Territoires du Nord-Ouest.',
    topics: ['welfare'],
    checkedAt: CHECKED,
  },

  {
    id: 'nu-legislation',
    region: 'nu',
    url: 'https://www.nunavutlegislation.ca/',
    titleEn: 'Nunavut Legislation',
    titleFr: 'Législation du Nunavut',
    noteEn: 'Search Nunavut consolidated laws for animal / wildlife instruments.',
    noteFr: 'Cherchez les lois consolidées du Nunavut (animaux / faune).',
    topics: ['welfare', 'wildlife'],
    checkedAt: CHECKED,
  },
]

export function learnLegalLinksFederal(): LearnLegalLink[] {
  return LEARN_LEGAL_LINKS.filter((link) => link.region === 'federal')
}

export function learnLegalLinksForRegion(region: LearnLegalRegion): LearnLegalLink[] {
  return LEARN_LEGAL_LINKS.filter((link) => link.region === region)
}

export function learnLegalLinkTitle(link: LearnLegalLink, locale: string): string {
  return locale.startsWith('fr') ? link.titleFr : link.titleEn
}

export function learnLegalLinkNote(link: LearnLegalLink, locale: string): string {
  return locale.startsWith('fr') ? link.noteFr : link.noteEn
}
