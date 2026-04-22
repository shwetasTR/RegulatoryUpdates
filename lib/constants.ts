import { ProductModule } from './types';

export const PRODUCT_MODULES: Record<number, ProductModule> = {
  1: {
    id: 1,
    name: "Tariff & Duty Calculator",
    team: "Tax & Duty Engine",
    timezones: ["🇸🇬", "🇬🇧"],
    description: "Calculates landed cost including all duties and tariffs",
    triggers: ["tariff", "duty", "rate", "section 232", "section 301", "section 122", "htsus"]
  },
  2: {
    id: 2,
    name: "Classification & HTS Management",
    team: "Classification Engine",
    timezones: ["🇺🇸", "🇮🇳"],
    description: "Maps products to HTS codes, manages classification rulings",
    triggers: ["hts", "classification", "htsus", "chapter 99", "ruling", "tariff schedule"]
  },
  3: {
    id: 3,
    name: "Restricted Party Screening",
    team: "Screening Engine",
    timezones: ["🇺🇸", "🇮🇪"],
    description: "Screens against OFAC SDN, Entity List, denied persons",
    triggers: ["sdn", "ofac", "sanctions", "entity list", "screening", "denied"]
  },
  4: {
    id: 4,
    name: "Free Trade Agreement (FTA) Management",
    team: "FTA & Origin",
    timezones: ["🇺🇸", "🇳🇱"],
    description: "Manages FTA qualification, rules of origin, preferential rates",
    triggers: ["fta", "usmca", "preferential", "origin", "bilateral", "trade deal"]
  },
  5: {
    id: 5,
    name: "Export Controls & Licensing",
    team: "Export Controls",
    timezones: ["🇺🇸", "🇬🇧"],
    description: "Determines export license requirements, ECCN classification",
    triggers: ["export", "bis", "entity list", "ear", "itar", "license"]
  },
  6: {
    id: 6,
    name: "Customs Entry & Filing",
    team: "Entry Filing Engine",
    timezones: ["🇺🇸", "🇵🇭"],
    description: "Manages import entry filing via ACE, drawback, FTZ",
    triggers: ["ace", "entry", "filing", "catair", "drawback", "ftz", "manifest"]
  },
  7: {
    id: 7,
    name: "Forced Labor & Supply Chain Compliance",
    team: "Supply Chain Compliance",
    timezones: ["🇺🇸", "🇭🇰"],
    description: "Screens against UFLPA entity list, manages WRO compliance",
    triggers: ["uflpa", "forced labor", "wro", "section 307", "xinjiang"]
  },
  8: {
    id: 8,
    name: "Sanctions & Trade Finance",
    team: "Sanctions & Finance",
    timezones: ["🇺🇸", "🇸🇬", "🇬🇧"],
    description: "Trade finance compliance, vessel screening, sanctions monitoring",
    triggers: ["sanctions", "ofac", "general license", "trade finance", "vessel"]
  },
  9: {
    id: 9,
    name: "Regulatory Content & Knowledge Base",
    team: "Content & Editorial",
    timezones: ["🇺🇸", "🇬🇧", "🇦🇺"],
    description: "Regulatory reference content, country guides, client alerts",
    triggers: ["*"]
  },
  10: {
    id: 10,
    name: "Alerts & Notification Engine",
    team: "Platform Engineering",
    timezones: ["🇺🇸", "🇮🇳"],
    description: "Routes real-time regulatory alerts to subscribers",
    triggers: ["*"]
  }
};

export const FTA_AGREEMENTS = [
  {
    id: "USMCA",
    name: "USMCA",
    fullName: "US-Mexico-Canada Agreement",
    status: "Active",
    reviewDate: "2026-07-01",
    baseRate: "0% (qualifying)",
    notes: "Mandatory 6-year review deadline approaching"
  },
  {
    id: "US-UK-EPD",
    name: "US-UK EPD",
    fullName: "US-UK Economic Partnership Deal",
    status: "Active",
    baseRate: "10% pharma, 25%/15% metals",
    notes: "Bilateral agreement in effect"
  },
  {
    id: "US-EU-Framework",
    name: "US-EU Framework",
    fullName: "US-EU Framework Agreement",
    status: "Pending Parliament Vote",
    baseRate: "15% pharma, 50% metals",
    notes: "European Parliament vote on hold"
  },
  {
    id: "US-Japan-STIA",
    name: "US-Japan STIA",
    fullName: "US-Japan Strategic Trade & Investment Agreement",
    status: "Active",
    baseRate: "15% pharma, 50% metals",
    notes: "Active bilateral agreement"
  },
  {
    id: "US-Korea-STID",
    name: "US-Korea STID",
    fullName: "US-Korea Strategic Trade & Investment Deal",
    status: "Active",
    baseRate: "15% pharma, 15-50% metals",
    notes: "Active bilateral agreement"
  },
  {
    id: "US-China-Truce",
    name: "US-China Truce",
    fullName: "US-China Trade Truce",
    status: "Temporary",
    baseRate: "10% reciprocal",
    notes: "Expires November 10, 2026"
  }
];
