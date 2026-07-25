import React, { useState, useEffect } from "react";
import {
  ChefHat, Utensils, Layers, Plus, Search, ChevronRight, ArrowLeft, Pencil, X, Check,
  Settings, Download, Share, Smartphone, Info,
  Clock, LogOut, Trash2, Lock, Languages, Loader2, ThumbsUp, Star, GitBranch, Sprout,
  FlaskConical, Blend, Eye, Calendar, Thermometer, Percent,
  Heart, BookOpen, Bell, LineChart, ChevronDown, ChevronUp, Home, Sparkles
} from "lucide-react";
import { supabase } from "./supabase";

/* In het ritme van het land — receptenboek van Wilde Wortels, Landgoed de Beug (Odijk).
   Biologisch, seizoensgebonden, uit eigen moestuin.
   Basistechnieken die uitwaaieren in variaties per (tuin)ingrediënt, met
   seizoenslabels, fermentatie-batchregistratie, smaakcombinaties, een reken-
   tool per recept en een gastmodus (alleen lezen). Alles origineel. */

/* =====================================================================
   INLOG-INSTELLING — het enige dat je zelf hoeft aan te passen.
   Zet hier per kok het e-mailadres dat je in Supabase hebt aangemaakt
   (Authentication -> Users). Wachtwoorden staan NIET in de code;
   die typt iedere kok zelf in op het inlogscherm.
   ===================================================================== */
const COOK_EMAILS = {
  Michael: "michael@debeug.nl",
  Stef: "stef@debeug.nl",
  Simon: "simon@debeug.nl",
  Isa: "isa@debeug.nl",
  Kim: "kim@debeug.nl",
};

const TEAM = [
  { name: "Michael", role: "Chef" },
  { name: "Stef", role: "Souschef" },
  { name: "Simon", role: "Zelfstandig kok" },
  { name: "Isa", role: "Leerling kok" },
  { name: "Kim", role: "Hulpkok" },
];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const fill = (str, x) => str.split("{x}").join(x).split("{X}").join(cap(x));

const SEASONS = ["Lente", "Zomer", "Herfst", "Winter"];

// Receptcategorieën voor het keuzemenu bij een nieuw recept
const RECIPE_CATEGORIES = [
  "Fermentatie","Fermentatie · dranken","Fermentatie · azijn","Fermentatie · zuivel",
  "Pickles & zuur","Chutney & jam","Kruiden & zout","Oliën & vinaigrettes",
  "Sauzen & emulsies","Gels","Purees","Schuim & espuma","Mousses",
  "Sorbet & ijs","Zoet & patisserie","Fruit & garnituur",
  "Tuin · rauw","Tuin · geroosterd","Tuin · gegrild","Tuin · gestoomd","Tuin · gerookt","Tuin · confit",
  "Krokant & garnituur","Crumbles & garnituur","Garnituur",
  "Vlees","Vis","Zuivel","Fonds & bouillon","Deeg & brood","Zonder categorie",
];

// Standaard streefwaarden voor de fermentatie-eindcontrole
const FERMENT_TARGETS = {
  Melkzuur: { phStart: 6.0, phEnd: 3.5, note: "Melkzuur: pH zakt van ~6,0 naar onder 3,5 (voedselveilig)." },
  Suikerfermentatie: { phStart: null, phEnd: null, note: "Suikerfermentatie: stuur op smaak, bruis en (bij drank) alcohol; pH minder leidend." },
  Azijnfermentatie: { phStart: null, phEnd: 3.0, note: "Azijn: verzuurt tot pH ~2,5–3,0; heeft zuurstof nodig (doek, geen deksel)." },
};
// Standaard handelingsschema per fermentatiemethode (voor herinneringen)
const FERMENT_ACTIONS = {
  Melkzuur: [{ label: "Controleer onderdompeling en proef", everyDays: 2 }],
  Suikerfermentatie: [{ label: "Roer om / voed en ontlucht de fles", everyDays: 1 }],
  Azijnfermentatie: [{ label: "Proef en controleer de moeder", everyDays: 3 }],
};


// ---------- sorteren op seizoen ----------
// Welk seizoen is het nu? (meteorologisch: maart–mei lente, enz.)
function currentSeason(d) {
  const m = (d || new Date()).getMonth();
  if (m >= 2 && m <= 4) return "Lente";
  if (m >= 5 && m <= 7) return "Zomer";
  if (m >= 8 && m <= 10) return "Herfst";
  return "Winter";
}
// Rangorde: eerst wat nú in seizoen is, dan het hele jaar door, daarna de
// komende seizoenen op volgorde. Binnen elke groep wordt alfabetisch gesorteerd.
function seasonRank(seasons) {
  const list = seasons && seasons.length ? seasons : ["Hele jaar"];
  const now = SEASONS.indexOf(currentSeason());
  let best = 9;
  for (const s of list) {
    if (s === "Hele jaar") { best = Math.min(best, 1); continue; }
    const i = SEASONS.indexOf(s);
    if (i < 0) continue;
    const dist = (i - now + SEASONS.length) % SEASONS.length;
    best = Math.min(best, dist === 0 ? 0 : dist + 1);
  }
  return best;
}
const bySeasonThenName = (aSeasons, aName, bSeasons, bName) =>
  seasonRank(aSeasons) - seasonRank(bSeasons) || aName.localeCompare(bName, "nl");
// "Laatst toegevoegd": zelfgemaakte items hebben een id met een tijdstempel
// (r/d/cl + Date.now()); hoe hoger, hoe recenter. Seed-items komen daarna.
function recencyKey(id) {
  const m = String(id || "").match(/(\d{10,})/);
  return m ? Number(m[1]) : 0;
}
const byNewest = (a, b) => recencyKey(b.id) - recencyKey(a.id) || a.name.localeCompare(b.name, "nl");

// ---------- bereidingstekst slim opdelen in stappen ----------
// Een kok typt de hele bereiding vaak in één keer. Deze functie knipt dat in
// losse stappen: eerst op nummering (1. 2. of "stap 1"), anders op regels, en
// anders op zinnen — waarbij komma-getallen (2,5%) en afkortingen (bv.) heel blijven.
const STEP_ABBR = ["bv","bijv","ca","evt","ong","zgn","incl","excl","etc","max","min","nr","tbv","dwz","oa","mln","gr","ml","cl","dl","kg","tl","el"];
function splitSteps(raw) {
  const text = String(raw || "").replace(/\r/g, "").trim();
  if (!text) return [];

  // 1. Genummerd: "1. ", "2) ", "Stap 3:"
  const numbered = text.split(/(?:^|\n|\s)(?:stap\s*)?\(?(?:\d{1,2})[.):]\s+/i)
    .map((x) => x.trim()).filter(Boolean);
  if (numbered.length > 1) return numbered;

  // 2. Losse regels of opsommingstekens
  const lines = text.split(/\n+/).map((x) => x.replace(/^[-•*–\u2022\s]+/, "").trim()).filter(Boolean);
  if (lines.length > 1) return lines;

  // 3. Zinnen — met bescherming van getallen en afkortingen
  let safe = text.replace(/(\d)[.,](\d)/g, "$1\u0001$2");
  for (const a of STEP_ABBR) safe = safe.replace(new RegExp("\\b" + a + "\\.", "gi"), (m) => m.slice(0, -1) + "\u0002");
  const words = safe.split(/\s+/);
  const out = [];
  let cur = "";
  for (let i = 0; i < words.length; i++) {
    cur += (cur ? " " : "") + words[i];
    const ends = /[.!?][")\u2019\u201d]?$/.test(words[i]);
    const next = words[i + 1];
    const nextStartsNew = !next || /^[A-ZÀ-Ü\u201c"(]/.test(next);
    if (ends && nextStartsNew && cur.replace(/\s/g, "").length > 12) { out.push(cur); cur = ""; }
  }
  if (cur.trim()) out.push(cur.trim());
  // losse flarden bij de vorige stap voegen
  const merged = [];
  for (const p of out) {
    if (merged.length && p.replace(/\s/g, "").length < 15) merged[merged.length - 1] += " " + p;
    else merged.push(p);
  }
  const restore = (x) => x.replace(/\u0001/g, ",").replace(/\u0002/g, ".").trim();
  return merged.map(restore).filter(Boolean);
}

// ---------- zoeken dat tegen een typefout kan ----------
// Toetsen die op een QWERTY-toetsenbord naast elkaar liggen: een vergissing
// daartussen (biet/bier) telt maar half, zodat zoeken vergevingsgezind is.
const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const KEY_NEIGHBOURS = (() => {
  const map = {};
  KEY_ROWS.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const set = new Set();
      if (c > 0) set.add(row[c - 1]);
      if (c < row.length - 1) set.add(row[c + 1]);
      [r - 1, r + 1].forEach((rr) => {
        const other = KEY_ROWS[rr];
        if (!other) return;
        [c - 1, c, c + 1].forEach((cc) => { if (cc >= 0 && other[cc]) set.add(other[cc]); });
      });
      map[row[c]] = set;
    }
  });
  return map;
})();
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const nearKey = (a, b) => !!(KEY_NEIGHBOURS[a] && KEY_NEIGHBOURS[a].has(b));

// Afstand tussen twee woorden: verwisselde letters en buurtoetsen tellen half.
function typoDistance(a, b, cap) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > cap) return cap + 1;
  let two = null, one = [];
  for (let j = 0; j <= n; j++) one[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= n; j++) {
      const sub = a[i - 1] === b[j - 1] ? 0 : nearKey(a[i - 1], b[j - 1]) ? 0.5 : 1;
      let v = Math.min(one[j] + 1, cur[j - 1] + 1, one[j - 1] + sub);
      if (two && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, two[j - 2] + 0.5);
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > cap) return cap + 1;
    two = one; one = cur;
  }
  return one[n];
}
// Hoe langer het woord, hoe meer we vergeven.
const typoBudget = (len) => (len <= 3 ? 0 : len <= 5 ? 1 : len <= 8 ? 1.5 : 2);

// Zit 'needle' in 'haystack'? Kleine typefouten worden vergeven.
function softMatch(haystack, needle) {
  const q = norm(needle).trim();
  if (!q) return true;
  const h = norm(haystack);
  if (h.includes(q)) return true;
  const hWords = h.split(/[^a-z0-9]+/).filter(Boolean);
  return q.split(/\s+/).filter(Boolean).every((w) => {
    if (h.includes(w)) return true;
    if (w.length < 4) return false;
    const cap = typoBudget(w.length);
    for (const hw of hWords) {
      if (typoDistance(hw, w, cap) <= cap) return true;
      if (hw.length > w.length && typoDistance(hw.slice(0, Math.ceil(w.length + cap)), w, cap) <= cap) return true;
    }
    return false;
  });
}
// Meerdere velden tegelijk doorzoeken.
const softMatchAny = (fields, needle) => !norm(needle).trim() || fields.some((f) => softMatch(f || "", needle));

// ---------- schoonmaak ----------
const CLEANING_AREAS = ["Keuken", "Bijkeuken", "Afwasruimte", "Koelruimte", "Opslag"];
const CLEANING_SEED = [
  { id:"k-werkbanken", name:"Werkbanken", area:"Keuken", intervalDays:1, minutes:15 },
  { id:"k-oven", name:"Oven", area:"Keuken", intervalDays:1, minutes:15 },
  { id:"k-wasbak", name:"Wasbak", area:"Keuken", intervalDays:1, minutes:10 },
  { id:"k-snijmachine", name:"Snijmachine", area:"Keuken", intervalDays:1, minutes:10 },
  { id:"k-vario", name:"Vario", area:"Keuken", intervalDays:1, minutes:10 },
  { id:"k-vloer", name:"Vloer", area:"Keuken", intervalDays:1, minutes:20 },
  { id:"k-spatwanden", name:"Spatwanden", area:"Keuken", intervalDays:1, minutes:10 },
  { id:"k-deur", name:"Deur", area:"Keuken", intervalDays:7, minutes:10 },
  { id:"k-onderwerkbank", name:"Onder de midden werkbank", area:"Keuken", intervalDays:7, minutes:20 },
  { id:"k-vacuum", name:"Vacumeerapparaat", area:"Keuken", intervalDays:7, minutes:15 },
  { id:"k-afzuigkap", name:"Afzuigkap", area:"Keuken", intervalDays:14, minutes:40 },
  { id:"k-koelwerkbank", name:"Koelwerkbank", area:"Keuken", intervalDays:14, minutes:30 },
  { id:"k-prullenbak", name:"Prullenbak", area:"Keuken", intervalDays:14, minutes:15 },
  { id:"b-vloer", name:"Vloer", area:"Bijkeuken", intervalDays:7, minutes:15 },
  { id:"b-werkbank", name:"Werkbank", area:"Bijkeuken", intervalDays:7, minutes:10 },
  { id:"b-wc", name:"Wc's", area:"Bijkeuken", intervalDays:7, minutes:20 },
  { id:"a-machine", name:"Afwasmachine schoon", area:"Afwasruimte", intervalDays:1, minutes:15 },
  { id:"a-werkbanken", name:"Werkbanken", area:"Afwasruimte", intervalDays:1, minutes:10 },
  { id:"a-vloer", name:"Vloer", area:"Afwasruimte", intervalDays:1, minutes:15 },
  { id:"a-onderwerkbank", name:"Onder de werkbank", area:"Afwasruimte", intervalDays:7, minutes:20 },
  { id:"a-seal", name:"Sealapparaat", area:"Afwasruimte", intervalDays:7, minutes:10 },
  { id:"a-vriezerijs", name:"Vriezer ontdooien", area:"Afwasruimte", intervalDays:30, minutes:45 },
  { id:"a-magazijnrek", name:"Magazijnrek", area:"Afwasruimte", intervalDays:30, minutes:30 },
  { id:"a-deuren", name:"Deuren", area:"Afwasruimte", intervalDays:30, minutes:15 },
  { id:"c-temperaturen", name:"Temperatuurcontrole", area:"Koelruimte", intervalDays:7, minutes:10 },
  { id:"c-celvloer", name:"Koelcel vloer", area:"Koelruimte", intervalDays:7, minutes:20 },
  { id:"c-celopruimen", name:"Koelcel opruimen", area:"Koelruimte", intervalDays:7, minutes:25 },
  { id:"c-houdbaarheid", name:"Houdbaarheid checken", area:"Koelruimte", intervalDays:7, minutes:20 },
  { id:"c-voorruimte", name:"Voorruimte vloer", area:"Koelruimte", intervalDays:7, minutes:15 },
  { id:"c-rekken", name:"Koelcel rekken", area:"Koelruimte", intervalDays:30, minutes:30 },
  { id:"c-vriezer", name:"Vriezer opruimen", area:"Koelruimte", intervalDays:30, minutes:45 },
  { id:"o-opruimen", name:"Opruimen", area:"Opslag", intervalDays:30, minutes:45 },
  { id:"o-vloer", name:"Vloer vegen", area:"Opslag", intervalDays:30, minutes:20 },
];
const CHECK_HOUR = 16, CHECK_MIN = 45; // dagelijkse schoonmaakcontrole
const TEMP_TASK_ID = "c-temperaturen"; // schoonmaaktaak die aan de HACCP-log hangt
const DAY_DONE_ID = "__dag-afgerond";  // markeert dat de schoonmaak van vandaag is afgerond

// HACCP: welke apparaten wekelijks gemeten worden en wat de grenzen zijn.
const HACCP_UNITS = [
  { id:"koelcel",      name:"Koelcel",       target:"0 tot 4 °C",      min:0,    max:4 },
  { id:"koelwerkbank", name:"Koelwerkbank",  target:"0 tot 4 °C",      min:0,    max:4 },
  { id:"vrieskast",    name:"Vrieskast",     target:"−18 °C of lager", min:-99,  max:-18 },
  { id:"vriescel",     name:"Vriescel",      target:"−18 °C of lager", min:-99,  max:-18 },
];
// IJkcontrole: thermometer in smeltend ijswater hoort 0 °C te geven (±1 °C).
const CALIB_TOLERANCE = 1;
const inRange = (u, v) => v === null || v === undefined || isNaN(v) ? null : (v >= u.min && v <= u.max);
const fmtTemp = (v) => (v === null || v === undefined || v === "" ? "—" : String(v).replace(".", ",") + " °C");

// Interval in gewone taal
function intervalLabel(d) {
  if (d === 1) return "dagelijks";
  if (d === 2) return "om de dag";
  if (d === 7) return "wekelijks";
  if (d === 14) return "elke 2 weken";
  if (d === 30) return "maandelijks";
  if (d === 90) return "per kwartaal";
  return "elke " + d + " dagen";
}
// Lokale datum als YYYY-MM-DD (niet toISOString: dat is UTC en verspringt 's avonds).
function localDate(d) {
  const x = d ? new Date(d) : new Date();
  return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
}
const isoDate = (d) => localDate(d);
const daysAgo = (iso) => Math.floor((new Date().setHours(0,0,0,0) - new Date(iso).setHours(0,0,0,0)) / 86400000);
// Weeknummer (ISO) voor het logboek per week
function weekKey(iso) {
  const d = new Date(iso + "T00:00:00");
  const t = new Date(d.valueOf());
  t.setDate(t.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(t.getFullYear(), 0, 4);
  const wk = 1 + Math.round(((t - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return t.getFullYear() + "-W" + String(wk).padStart(2, "0");
}
// Status van een schoonmaaktaak: wanneer voor het laatst gedaan en is hij nu nodig?
function taskStatus(task, logs) {
  if (task.id === DAY_DONE_ID) return { last: null, since: null, due: false, overdue: false, history: [] };
  const mine = logs.filter((l) => l.taskId === task.id).sort((a, b) => (a.doneDate < b.doneDate ? 1 : -1));
  const last = mine[0] || null;
  const since = last ? daysAgo(last.doneDate) : null;
  const due = last === null || since >= task.intervalDays;
  const overdue = last !== null && since > task.intervalDays;
  return { last, since, due, overdue, history: mine };
}

// ------- tuinproducten per groep -------
const ROOT = ["rode biet","chioggia biet","gele biet","knolselderij","wortel","pastinaak","aardpeer","meiknol","koolrabi","radijs","ui","utrechtse ui","knoflook"];
const BRASSICA = ["rode kool","savooikool","spitskool","palmkool","boerenkool","chinese kool","paksoi","amsoi"];
const LEAFY = ["snijbiet","andijvie","bindsla","rucola","rode eikenbladsla","ijsbergsla","veldsla","spinazie","amaranth","groenlof","rode melde","tuinzuring"];
const STALK = ["venkel","bleekselderij","kardoen","courgette","komkommer","tomaat"];
const BEAN = ["princessenbonen","sperziebonen","snijbonen","pronkbonen","peultjes","erwten","kapucijners"];
const GFRUIT = ["aardbei","framboos","braam","aalbes","blauwe bes","japanse wijnbes","pruim","reine claude","appel","peer","kweepeer","mispel","druif","rabarber"];
const GHERB = ["bieslook","peterselie","rozemarijn","tijm","laurier","dragon","lavas","munt","citroenmelisse","salie","oregano","koriander","tuinzuring"];
const GFLOWER = ["goudsbloem","korenbloem","dahlia","leeuwenbek","afrikaantjes","oost-indische kers","madelief","kamille","lavendel","courgettebloem"];
const GARDEN_ALL = [...ROOT,...BRASSICA,...LEAFY,...STALK,...BEAN,...GFRUIT,...GHERB,...GFLOWER];

// oude (niet-tuin / voorraad) lijsten, blijven bruikbaar
const FRUIT = ["mango","framboos","passievrucht","aardbei","braam","perzik","abrikoos","kers","bosbes","vijg","granaatappel","rabarber","appel","peer","ananas","mandarijn","bloedsinaasappel","citroen","limoen","yuzu","lychee","banaan","kokos","guave","papaja","meloen","druif","kiwi"];
const VEG = ["knolselderij","wortel","doperwt","bloemkool","pastinaak","pompoen","aardappel","rode biet","zoete aardappel","mais","spinazie","aubergine","courgette","broccoli","venkel","prei","asperge","tomaat"];
const HERB = ["basilicum","bieslook","peterselie","dille","koriander","dragon","munt","kervel","waterkers","zuring"];
const NUT = ["hazelnoot","amandel","pistache","walnoot","pecan","pinda","cashew","macadamia","sesam","zonnebloempit"];
const FRUIT_ONLY = FRUIT.filter((x) => !GARDEN_ALL.includes(x));
const VEG_ONLY = VEG.filter((x) => !GARDEN_ALL.includes(x));
const HERB_ONLY = HERB.filter((x) => !GARDEN_ALL.includes(x));

const SEASON = {
  "komkommer":["Zomer"],"tomaat":["Zomer"],"pruim":["Zomer","Herfst"],"reine claude":["Zomer","Herfst"],
  "aardbei":["Lente","Zomer"],"aalbes":["Zomer"],"braam":["Zomer","Herfst"],"rode kool":["Herfst","Winter"],
  "savooikool":["Herfst","Winter"],"spitskool":["Lente","Zomer"],"koolrabi":["Lente","Zomer","Herfst"],
  "venkel":["Zomer","Herfst"],"snijbiet":["Zomer","Herfst"],"rode biet":["Zomer","Herfst","Winter"],
  "chioggia biet":["Zomer","Herfst","Winter"],"gele biet":["Zomer","Herfst","Winter"],"palmkool":["Herfst","Winter"],
  "boerenkool":["Herfst","Winter"],"andijvie":["Zomer","Herfst"],"bindsla":["Lente","Zomer"],
  "rucola":["Lente","Zomer","Herfst"],"appel":["Herfst","Winter"],"peer":["Herfst","Winter"],
  "japanse wijnbes":["Zomer"],"ui":["Herfst","Winter"],"utrechtse ui":["Lente","Zomer"],
  "bieslook":["Lente","Zomer","Herfst"],"peterselie":["Lente","Zomer","Herfst"],"rozemarijn":["Hele jaar"],
  "tijm":["Hele jaar"],"laurier":["Hele jaar"],"dragon":["Lente","Zomer","Herfst"],"lavas":["Lente","Zomer"],
  "munt":["Lente","Zomer","Herfst"],"citroenmelisse":["Zomer"],"salie":["Lente","Zomer","Herfst"],
  "kweepeer":["Herfst"],"mispel":["Herfst","Winter"],"courgette":["Zomer"],"courgettebloem":["Zomer"],
  "radijs":["Lente","Zomer"],"meiknol":["Lente"],"knolselderij":["Herfst","Winter"],"amaranth":["Zomer"],
  "rode eikenbladsla":["Lente","Zomer","Herfst"],"paksoi":["Lente","Zomer","Herfst"],"goudsbloem":["Zomer","Herfst"],
  "korenbloem":["Zomer"],"dahlia":["Zomer","Herfst"],"leeuwenbek":["Zomer"],"afrikaantjes":["Zomer","Herfst"],
  "kamille":["Zomer"],"lavendel":["Zomer"],"princessenbonen":["Zomer","Herfst"],"sperziebonen":["Zomer","Herfst"],
  "snijbonen":["Zomer","Herfst"],"pronkbonen":["Zomer","Herfst"],"peultjes":["Lente","Zomer"],"erwten":["Lente","Zomer"],
  "kapucijners":["Zomer"],"ijsbergsla":["Zomer"],"veldsla":["Herfst","Winter"],"knoflook":["Zomer","Herfst"],
  "rode melde":["Lente","Zomer"],"rabarber":["Lente"],"framboos":["Zomer","Herfst"],"oregano":["Zomer"],
  "tuinzuring":["Lente","Zomer"],"koriander":["Zomer"],"druif":["Herfst"],"blauwe bes":["Zomer"],
  "wortel":["Zomer","Herfst","Winter"],"pastinaak":["Herfst","Winter"],"aardpeer":["Herfst","Winter"],
  "oost-indische kers":["Zomer","Herfst"],"spinazie":["Lente","Herfst"],"chinese kool":["Herfst"],"amsoi":["Herfst"],
  "kardoen":["Herfst","Winter"],"bleekselderij":["Zomer","Herfst"],"groenlof":["Winter"],"madelief":["Lente","Zomer"],
};
const seasonOf = (m) => SEASON[m] || ["Hele jaar"];

const BASES = [
  // ---- oude basistechnieken (voorraad + tuin overlap) ----
  { id:"mousse", baseName:"Vruchtenmousse", noun:"Mousse", generic:"fruit", category:"Mousses", yield:"≈ 650 g", chefsPick:true, endorsements:["Michael","Stef"], gear:"Thermoblender", mains:FRUIT.slice(0,24),
    ingredients:[{item:"Puree van {x}",amount:"250 g"},{item:"Slagroom",amount:"200 g"},{item:"Suiker",amount:"40 g"},{item:"Gelatineblaadjes",amount:"3 blaadjes"},{item:"Citroensap",amount:"10 g"}],
    steps:["Week de gelatine.","Verwarm een derde van de puree van {x} en los de gelatine op.","Meng met de rest en het citroensap; koel tot lobbig.","Spatel de halfgeslagen room erdoor; 3 uur opstijven."] },
  { id:"gel", baseName:"Vruchtengel", noun:"Gel", generic:"fruit", category:"Gels", yield:"≈ 400 g", chefsPick:true, gear:"Thermoblender", mains:FRUIT,
    ingredients:[{item:"Sap/puree van {x}",amount:"400 g"},{item:"Agar-agar",amount:"3 g"},{item:"Suiker",amount:"20 g"}],
    steps:["Kook sap van {x} met agar 2 min.","Laat opstijven en mix glad.","Passeer in een knijpfles."] },
  { id:"sorbet", baseName:"Fruitsorbet", noun:"Sorbet", generic:"fruit", category:"Sorbet & ijs", yield:"≈ 700 g", chefsPick:true, gear:"Sorbetmachine", mains:FRUIT_ONLY,
    ingredients:[{item:"Puree van {x}",amount:"500 g"},{item:"Suikersiroop",amount:"150 g"},{item:"Glucose",amount:"30 g"},{item:"Citroensap",amount:"15 g"}],
    steps:["Meng alles glad.","Rijp 4 uur koud.","Draai in de sorbetmachine; bewaar op -18°C."] },
  { id:"crumble", baseName:"Notencrumble", noun:"Crumble", generic:"noot", category:"Crumbles & garnituur", yield:"≈ 250 g", mains:NUT,
    ingredients:[{item:"{X}, gehakt",amount:"100 g"},{item:"Bloem",amount:"60 g"},{item:"Boter",amount:"60 g"},{item:"Suiker",amount:"40 g"}],
    steps:["Wrijf tot kruimels en meng de {x} erdoor.","Bak 12 min op 170°C.","Laat krokant afkoelen."] },
  { id:"ganache", baseName:"Ganache", generic:"chocolade", category:"Zoet & patisserie", yield:"≈ 420 g", mode:"flavor", chefsPick:true,
    ingredients:[{item:"Chocolade",amount:"200 g"},{item:"Room",amount:"200 g"},{item:"Boter",amount:"20 g"}],
    steps:["Verwarm de room.","Giet over de chocolade en emulgeer.","Roer de boter erdoor."],
    variations:[{name:"Pure ganache"},{name:"Melkchocoladeganache",add:"Iets minder room."},{name:"Witte ganache",add:"Meer chocolade voor stevigheid."},{name:"Koffieganache",add:"Trek de room met koffie."},{name:"Frambozenganache",add:"Deel room vervangen door frambozenpuree.",season:["Zomer","Herfst"]},{name:"Muntganache",add:"Trek met verse munt; zeef.",season:["Lente","Zomer","Herfst"]},{name:"Kweeperenganache",add:"Vervang deel room door kweeperenpuree.",season:["Herfst"]},{name:"Lavendelganache",add:"Trek kort met lavendel.",season:["Zomer"]}] },
  { id:"anglaise", baseName:"Crème anglaise", generic:"vanille", category:"Zoet & patisserie", yield:"≈ 550 g", mode:"flavor", chefsPick:true,
    ingredients:[{item:"Melk",amount:"250 g"},{item:"Room",amount:"250 g"},{item:"Eidooiers",amount:"5 stuks"},{item:"Suiker",amount:"60 g"}],
    steps:["Verwarm melk en room.","Klop dooiers met suiker; bind tot 82°C.","Passeer en koel snel."],
    variations:[{name:"Vanille-anglaise",add:"Trek met vanille."},{name:"Koffie-anglaise",add:"Trek met koffie."},{name:"Citroenmelisse-anglaise",add:"Trek met citroenmelisse uit de tuin.",season:["Zomer"]},{name:"Laurier-anglaise",add:"Trek kort met verse laurier."},{name:"Salie-anglaise",add:"Trek met salie.",season:["Lente","Zomer","Herfst"]},{name:"Kamille-anglaise",add:"Trek met kamillebloemen.",season:["Zomer"]}] },
  { id:"icecream", baseName:"Roomijs", generic:"vanille", category:"Sorbet & ijs", yield:"≈ 900 g", mode:"flavor", chefsPick:true, gear:"Sorbetmachine",
    ingredients:[{item:"Melk",amount:"500 g"},{item:"Room",amount:"250 g"},{item:"Eidooiers",amount:"6 stuks"},{item:"Suiker",amount:"150 g"}],
    steps:["Maak een anglaise (82°C).","Rijp 12 uur.","Draai in de sorbetmachine."],
    variations:[{name:"Vanille-roomijs",add:"Trek met vanille."},{name:"Karamel-roomijs",add:"Deel suiker vervangen door karamel."},{name:"Hazelnoot-roomijs",add:"Roer pralinépasta erdoor."},{name:"Braam-roomijs",add:"Roer braampuree door de gerijpte basis.",season:["Zomer","Herfst"]},{name:"Aardbei-roomijs",add:"Roer aardbeienpuree erdoor.",season:["Lente","Zomer"]},{name:"Rabarber-roomijs",add:"Roer rabarbercompote erdoor.",season:["Lente"]},{name:"Honing-tijm-roomijs",add:"Zoet met honing en trek met tijm."}] },
  { id:"caramel", baseName:"Karamel", generic:"karamel", category:"Zoet & patisserie", yield:"≈ 350 g", mode:"flavor",
    ingredients:[{item:"Suiker",amount:"200 g"},{item:"Room",amount:"150 g"},{item:"Boter",amount:"40 g"}],
    steps:["Smelt de suiker amberkleurig.","Blus met warme room.","Roer de boter erdoor."],
    variations:[{name:"Klassieke karamel"},{name:"Gezouten karamel",add:"Werk af met fleur de sel."},{name:"Miso-karamel",add:"Roer witte miso erdoor."},{name:"Butterscotch",add:"Bruine suiker en extra boter."}] },
  { id:"beurreblanc", baseName:"Beurre blanc", generic:"boter", category:"Sauzen & emulsies", yield:"≈ 300 g", mode:"flavor", chefsPick:true, endorsements:["Michael"],
    ingredients:[{item:"Sjalot",amount:"1 stuk"},{item:"Witte wijn",amount:"100 g"},{item:"Azijn",amount:"50 g"},{item:"Koude boter",amount:"200 g"}],
    steps:["Reduceer tot bijna droog.","Monteer koude boter buiten het vuur.","Passeer; niet koken."],
    variations:[{name:"Klassieke beurre blanc"},{name:"Dille-beurre blanc",add:"Roer dille erdoor."},{name:"Dragon-beurre blanc",add:"Roer dragon erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Beurre rouge",add:"Rode wijn i.p.v. witte."},{name:"Mosterd-beurre blanc",add:"Lepel mosterd erdoor."}] },
  { id:"mayo", baseName:"Emulsie / mayonaise", generic:"emulsie", category:"Sauzen & emulsies", yield:"≈ 300 g", mode:"flavor", chefsPick:true,
    ingredients:[{item:"Eidooier",amount:"1 stuk"},{item:"Mosterd",amount:"10 g"},{item:"Neutrale olie",amount:"250 g"},{item:"Azijn",amount:"10 g"}],
    steps:["Klop dooier met mosterd.","Druppel de olie erbij.","Op smaak met azijn."],
    variations:[{name:"Klassieke mayonaise"},{name:"Aioli",add:"Knoflook uit de tuin."},{name:"Bieslookmayonaise",add:"Fijne bieslook erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Mosterdmayonaise",add:"Extra grove mosterd."},{name:"Sojasaus-mayonaise",add:"Werk af met sojasaus."},{name:"Oost-Indische-kersmayonaise",add:"Roer fijne blaadjes erdoor voor peperigheid.",season:["Zomer","Herfst"]}] },
  { id:"vinaigrette", baseName:"Vinaigrette", generic:"vinaigrette", category:"Oliën & vinaigrettes", yield:"≈ 150 g", mode:"flavor",
    ingredients:[{item:"Azijn",amount:"30 g"},{item:"Olie",amount:"90 g"},{item:"Mosterd",amount:"5 g"}],
    steps:["Klop azijn met mosterd en zout.","Monteer met olie."],
    variations:[{name:"Klassieke vinaigrette"},{name:"Sjalottenvinaigrette",add:"Fijne sjalot erdoor."},{name:"Honing-mosterdvinaigrette",add:"Honing toevoegen."},{name:"Dragonvinaigrette",add:"Dragon erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Frambozenvinaigrette",add:"Frambozenazijn + wat puree.",season:["Zomer","Herfst"]}] },
  { id:"jus", baseName:"Jus / reductie", generic:"jus", category:"Sauzen & emulsies", yield:"≈ 400 g", mode:"flavor", endorsements:["Michael","Stef"],
    ingredients:[{item:"Fond",amount:"1 l"},{item:"Rode wijn",amount:"200 g"},{item:"Sjalot",amount:"2 stuks"},{item:"Boter",amount:"30 g"}],
    steps:["Reduceer wijn met sjalot.","Voeg fond toe; reduceer napperend.","Monteer met boter; passeer."],
    variations:[{name:"Rodewijnjus"},{name:"Portjus",add:"Port toevoegen."},{name:"Tijm-knoflookjus",add:"Trek met tijm en knoflook."},{name:"Peperjus",add:"Gebroken peper."}] },
  { id:"tuile", baseName:"Tuile", generic:"tuile", category:"Krokant & garnituur", yield:"≈ 12 tuiles", mode:"flavor",
    ingredients:[{item:"Bloem",amount:"50 g"},{item:"Boter",amount:"50 g"},{item:"Suiker/Parmezaan",amount:"50 g"},{item:"Eiwit",amount:"50 g"}],
    steps:["Meng glad.","Strijk dun uit.","Bak 6–8 min op 170°C; vorm warm."],
    variations:[{name:"Parmezaantuile"},{name:"Broodtuile",add:"Broodkruim i.p.v. bloem."},{name:"Sesamtuile",add:"Sesam erover."},{name:"Boekweittuile",add:"Deel boekweit."}] },

  // ---- TUIN: bereiden ----
  { id:"roast", baseName:"Geroosterde tuingroente", varTemplate:"Geroosterde {x}", generic:"tuingroente", category:"Tuin · geroosterd", yield:"4 porties", chefsPick:true, endorsements:["Michael","Simon"], gear:"Combi-oven / iVario",
    mains:[...ROOT,"venkel","bleekselderij","kardoen","courgette","tomaat",...BRASSICA,"princessenbonen","sperziebonen","snijbonen","pronkbonen"],
    ingredients:[{item:"{X}",amount:"800 g"},{item:"Olijfolie",amount:"3 el"},{item:"Zout",amount:"naar smaak"},{item:"Tijm",amount:"enkele takjes"}],
    steps:["Maak de {x} schoon en snijd in gelijke stukken.","Meng met olie, zout en tijm.","Rooster op 200°C tot gaar en gekaramelliseerd."] },
  { id:"grill", baseName:"Gegrilde tuingroente", varTemplate:"Gegrilde {x}", generic:"tuingroente", category:"Tuin · gegrild", yield:"4 porties", gear:"Black Bastard",
    mains:[...ROOT,...STALK,"spitskool","palmkool","savooikool"],
    ingredients:[{item:"{X}",amount:"600 g"},{item:"Olie",amount:"2 el"},{item:"Zout",amount:"naar smaak"}],
    steps:["Grill de {x} op de Black Bastard tot mooie strepen.","Gaar door aan de koele kant of in de combi-oven.","Maak af met zout en olie."] },
  { id:"steam", baseName:"Gestoomde tuingroente", varTemplate:"Gestoomde {x}", generic:"tuingroente", category:"Tuin · gestoomd", yield:"4 porties", gear:"Combi-oven",
    mains:[...ROOT.slice(0,10),"venkel","bleekselderij","kardoen","courgette",...BRASSICA.slice(0,4)],
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Zout",amount:"een snuf"}],
    steps:["Stoom de {x} beetgaar in de combi-oven.","Schrik indien nodig.","Breng op smaak."] },
  { id:"gpuree", baseName:"Tuinpuree", noun:"Puree", generic:"tuingroente", category:"Purees", yield:"≈ 500 g", chefsPick:true, endorsements:["Stef","Kim"], gear:"Thermoblender",
    mains:[...ROOT,...BRASSICA,"spinazie",...STALK],
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Boter",amount:"50 g"},{item:"Room of bouillon",amount:"150 g"},{item:"Zout",amount:"naar smaak"}],
    steps:["Gaar de {x} zacht.","Mix in de thermoblender tot zijdezacht.","Breng op smaak en passeer."] },
  { id:"gpickle", baseName:"Tuinpickle", varTemplate:"Gepekelde {x}", generic:"tuingroente", category:"Pickles & zuur", yield:"≈ 400 g", chefsPick:true, gear:"Robot Coupe snijder",
    mains:[...ROOT,...STALK,...BEAN,"rode kool","spitskool"],
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Azijn",amount:"200 g"},{item:"Suiker",amount:"80 g"},{item:"Zout",amount:"8 g"}],
    steps:["Snijd de {x} op de Robot Coupe.","Kook de pekel en giet over de {x}.","Laat minimaal 1 uur trekken."] },
  { id:"gchip", baseName:"Tuinchips", varTemplate:"Chip van {x}", generic:"tuingroente", category:"Krokant & garnituur", yield:"≈ 20 chips", gear:"Droogoven / iVario",
    mains:[...ROOT,"palmkool","boerenkool","courgette"],
    ingredients:[{item:"Dunne plakjes {x}",amount:"1 stuk"},{item:"Zout",amount:"naar smaak"}],
    steps:["Snijd flinterdun.","Droog in de droogoven of frituur krokant in de iVario.","Zout licht."] },
  { id:"gespuma", baseName:"Tuin-espuma", noun:"Espuma", generic:"tuingroente", category:"Schuim & espuma", yield:"1 sifon", gear:"Sifon",
    mains:["rode biet","chioggia biet","gele biet","knolselderij","wortel","pastinaak","aardpeer","meiknol","koolrabi","ui","knoflook","erwten","venkel","bleekselderij"],
    ingredients:[{item:"Puree van {x}",amount:"400 g"},{item:"Room",amount:"100 g"},{item:"Gelatineblaadje",amount:"1 blaadje"}],
    steps:["Meng warme puree van {x} met room en gelatine.","Passeer en vul een sifon; 2 patronen.","Koel 2 uur; schud voor gebruik."] },
  { id:"ggel", baseName:"Tuingel", noun:"Gel", generic:"tuingroente", category:"Gels", yield:"≈ 400 g", gear:"Thermoblender",
    mains:["rode biet","chioggia biet","gele biet","knolselderij","wortel","pastinaak","aardpeer","meiknol","koolrabi","ui","venkel","bleekselderij","courgette","komkommer","tomaat"],
    ingredients:[{item:"Sap van {x}",amount:"400 g"},{item:"Agar-agar",amount:"3 g"},{item:"Zout",amount:"snuf"}],
    steps:["Kook sap van {x} met agar 2 min.","Laat opstijven en mix glad.","Passeer in een knijpfles."] },
  { id:"gconfit", baseName:"Geconfijte tuingroente", varTemplate:"Geconfijte {x}", generic:"tuingroente", category:"Tuin · confit", yield:"naar behoefte",
    mains:["knoflook","ui","utrechtse ui","tomaat","rode biet","aardpeer","meiknol"],
    ingredients:[{item:"{X}",amount:"naar behoefte"},{item:"Olijfolie",amount:"om onder te dompelen"},{item:"Tijm & laurier",amount:"naar smaak"}],
    steps:["Dompel de {x} onder in olie met aromaten.","Gaar langzaam op 80–90°C tot zacht.","Bewaar in de olie."] },
  { id:"gsmoke", baseName:"Gerookte tuingroente", varTemplate:"Gerookte {x}", generic:"tuingroente", category:"Tuin · gerookt", yield:"naar behoefte", gear:"Black Bastard",
    mains:[...ROOT,"rode kool","boerenkool"],
    ingredients:[{item:"{X}",amount:"naar behoefte"},{item:"Rookmot",amount:"1 handvol"}],
    steps:["Rook de {x} koud of warm op de Black Bastard.","Laat rusten zodat de rook zich zet.","Bewaar afgedekt."] },
  { id:"gtartaar", baseName:"Groentetartaar", varTemplate:"Tartaar van {x}", generic:"tuingroente", category:"Tuin · rauw", yield:"4 porties",
    mains:["rode biet","tomaat","courgette","koolrabi","radijs","chioggia biet"],
    ingredients:[{item:"{X}, brunoise",amount:"300 g"},{item:"Sjalot",amount:"1 stuk"},{item:"Mosterd & olie",amount:"naar smaak"},{item:"Bieslook",amount:"1 el"}],
    steps:["Snijd de {x} in fijne brunoise.","Meng met sjalot, mosterd, olie en bieslook.","Breng op smaak en dresseer met een ring."] },
  { id:"gcarp", baseName:"Groentecarpaccio", varTemplate:"Carpaccio van {x}", generic:"tuingroente", category:"Tuin · rauw", yield:"4 porties",
    mains:["rode biet","chioggia biet","gele biet","koolrabi","meiknol","pastinaak","courgette"],
    ingredients:[{item:"{X}",amount:"300 g"},{item:"Olijfolie",amount:"2 el"},{item:"Zout & peper",amount:"naar smaak"}],
    steps:["Snijd de {x} flinterdun op de snijmachine.","Leg dakpansgewijs op het bord.","Maak af met olie, zout en kruiden."] },
  { id:"gbouillon", baseName:"Groentebouillon", noun:"Bouillon", generic:"tuingroente", category:"Fonds & bouillon", yield:"≈ 1 l",
    mains:ROOT.slice(0,10),
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Ui & prei",amount:"200 g"},{item:"Water",amount:"1,5 l"},{item:"Kruiden",amount:"bouquet"}],
    steps:["Snijd de {x} grof.","Trek 45 min tegen de kook aan.","Zeef en breng op smaak."] },

  // ---- TUIN: kruiden & bloemen ----
  { id:"gherboil", baseName:"Kruidenolie", varTemplate:"Olie van {x}", generic:"kruid", category:"Oliën & vinaigrettes", yield:"≈ 250 g", chefsPick:true, gear:"Thermoblender",
    mains:GHERB,
    ingredients:[{item:"{X}",amount:"100 g"},{item:"Neutrale olie",amount:"250 g"}],
    steps:["Blancheer de {x} kort en dep droog.","Mix met olie tot 70°C.","Laat uitlekken door een doek."] },
  { id:"gsalt", baseName:"Kruidenzout", varTemplate:"Zout van {x}", generic:"kruid", category:"Kruiden & zout", yield:"≈ 220 g", gear:"Droogoven",
    mains:[...GHERB,"lavendel","goudsbloem"],
    ingredients:[{item:"{X}",amount:"40 g"},{item:"Grof zeezout",amount:"200 g"}],
    steps:["Droog de {x} in de droogoven.","Vermaal met het zout.","Bewaar droog en afgesloten."] },
  { id:"gbutter", baseName:"Kruidenboter", varTemplate:"Boter van {x}", generic:"kruid", category:"Zuivel", yield:"≈ 280 g",
    mains:GHERB.filter((h) => h !== "laurier"),
    ingredients:[{item:"Zachte boter",amount:"250 g"},{item:"{X}, fijn",amount:"30 g"},{item:"Zout",amount:"snuf"}],
    steps:["Meng de zachte boter met de {x} en zout.","Rol op in folie.","Koel tot stevig."] },
  { id:"gpesto", baseName:"Pesto", varTemplate:"Pesto van {x}", generic:"kruid", category:"Sauzen & emulsies", yield:"≈ 300 g",
    mains:["bieslook","peterselie","dragon","lavas","munt","oregano","koriander","tuinzuring"],
    ingredients:[{item:"{X}",amount:"80 g"},{item:"Pompoenpit of amandel",amount:"30 g"},{item:"Kaas",amount:"40 g"},{item:"Olijfolie",amount:"120 g"}],
    steps:["Rooster de pitten.","Mix {x}, pitten en kaas grof.","Monteer met olie; op smaak."] },
  { id:"gherbgel", baseName:"Kruidengel", noun:"Gel", generic:"kruid", category:"Gels", yield:"≈ 300 g", gear:"Thermoblender",
    mains:GHERB.slice(0,10),
    ingredients:[{item:"Sap of aftreksel van {x}",amount:"300 g"},{item:"Agar-agar",amount:"3 g"}],
    steps:["Kook het sap of aftreksel van {x} met agar 2 min.","Opstijven en glad mixen.","Passeer in een knijpfles."] },
  { id:"fvinegar", baseName:"Bloemenazijn", varTemplate:"Azijn van {x}", generic:"bloem", category:"Oliën & vinaigrettes", yield:"≈ 300 g",
    mains:GFLOWER,
    ingredients:[{item:"{X}",amount:"30 g"},{item:"Witte-wijnazijn",amount:"300 g"}],
    steps:["Doe de {x} in de azijn.","Laat 2 weken op een donkere plek trekken.","Zeef en bottel."] },
  { id:"pflower", baseName:"Gepekelde bloemen", varTemplate:"Gepekelde {x}", generic:"bloem", category:"Pickles & zuur", yield:"≈ 150 g",
    mains:GFLOWER,
    ingredients:[{item:"{X}",amount:"50 g"},{item:"Rijstazijn",amount:"100 g"},{item:"Suiker",amount:"30 g"},{item:"Zout",amount:"3 g"}],
    steps:["Breng de pekel aan de kook en laat afkoelen.","Leg de {x} onder de pekel.","Laat minimaal 1 dag trekken."] },
  { id:"candyflower", baseName:"Gekonfijte bloemen", varTemplate:"Gekonfijte {x}", generic:"bloem", category:"Zoet & patisserie", yield:"naar behoefte", gear:"Droogoven",
    mains:GFLOWER.filter((f) => f !== "courgettebloem"),
    ingredients:[{item:"{X}",amount:"20 g"},{item:"Eiwit",amount:"1 stuk"},{item:"Fijne suiker",amount:"100 g"}],
    steps:["Bestrijk de {x} dun met eiwit.","Bestrooi met suiker.","Droog in de droogoven tot krokant."] },

  // ---- TUIN: fruit ----
  { id:"gsorbet", baseName:"Tuinsorbet", noun:"Sorbet", generic:"tuinfruit", category:"Sorbet & ijs", yield:"≈ 700 g", chefsPick:true, gear:"Sorbetmachine",
    mains:GFRUIT,
    ingredients:[{item:"Puree van {x}",amount:"500 g"},{item:"Suikersiroop",amount:"150 g"},{item:"Glucose",amount:"30 g"},{item:"Citroensap",amount:"15 g"}],
    steps:["Mix alles glad.","Draai in de sorbetmachine.","Bewaar op -18°C."] },
  { id:"gcompote", baseName:"Tuincompote", noun:"Compote", generic:"tuinfruit", category:"Chutney & jam", yield:"≈ 400 g",
    mains:GFRUIT,
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Suiker",amount:"80 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Wel de {x} met suiker.","Laat zachtjes inkoken tot compote.","Op smaak met citroen; koel."] },
  { id:"gjam", baseName:"Tuinconfituur", noun:"Confituur", generic:"tuinfruit", category:"Chutney & jam", yield:"≈ 3 potten",
    mains:GFRUIT,
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Geleisuiker",amount:"500 g"},{item:"Citroensap",amount:"20 g"}],
    steps:["Kook de {x} met geleisuiker.","4 min doorkoken; test op koud bordje.","Vul potten heet af."] },
  { id:"gcoulis", baseName:"Tuincoulis", noun:"Coulis", generic:"tuinfruit", category:"Gels", yield:"≈ 350 g",
    mains:GFRUIT,
    ingredients:[{item:"Puree van {x}",amount:"300 g"},{item:"Poedersuiker",amount:"40 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Mix alles glad.","Op smaak; verdun voor een lopende saus.","Passeer en koel."] },
  { id:"gdry", baseName:"Gedroogd fruitpoeder", varTemplate:"Poeder van {x}", generic:"tuinfruit", category:"Krokant & garnituur", yield:"≈ 60 g", gear:"Droogoven",
    mains:GFRUIT,
    ingredients:[{item:"Puree van {x}",amount:"300 g"}],
    steps:["Strijk dun uit op een mat.","Droog op 60°C tot leerachtig.","Maal tot poeder; bewaar droog."] },
  { id:"gpoach", baseName:"Gepocheerd tuinfruit", varTemplate:"Gepocheerde {x}", generic:"tuinfruit", category:"Fruit & garnituur", yield:"4 porties",
    mains:["peer","appel","pruim","reine claude","kweepeer","mispel","rabarber","druif"],
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Water",amount:"500 g"},{item:"Suiker",amount:"200 g"},{item:"Laurier",amount:"1 blad"}],
    steps:["Breng de siroop aan de kook.","Pocheer de {x} zacht.","Laat afkoelen in de siroop."] },

  // ---- TUIN: bonen ----
  { id:"beanpuree", baseName:"Bonenpuree", noun:"Puree", generic:"bonen", category:"Purees", yield:"≈ 400 g", gear:"Thermoblender",
    mains:BEAN,
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Olijfolie",amount:"40 g"},{item:"Knoflook",amount:"1 teen"},{item:"Zout",amount:"naar smaak"}],
    steps:["Gaar de {x} zacht.","Mix met olie en knoflook glad.","Breng op smaak."] },
  { id:"beanroast", baseName:"Geroosterde bonen", varTemplate:"Geblisterde {x}", generic:"bonen", category:"Tuin · geroosterd", yield:"4 porties", gear:"iVario",
    mains:BEAN,
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Olie",amount:"2 el"},{item:"Zout",amount:"naar smaak"}],
    steps:["Blancheer de {x} kort.","Blister heet in de iVario met olie.","Maak af met zout en kruiden."] },

  // ---- FERMENTATIE ----
  { id:"lacto", baseName:"Melkzuurgefermenteerde groente", varTemplate:"Gefermenteerde {x}", generic:"tuingroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:10}, chefsPick:true, endorsements:["Simon","Stef"], gear:"Fermentatiemateriaal",
    mains:[...ROOT,...BRASSICA,...STALK],
    ingredients:[{item:"{X}",amount:"1 kg"},{item:"Zout (2,5%)",amount:"25 g"},{item:"Water (indien nodig)",amount:"naar behoefte"}],
    steps:["Weeg de {x} en 2,5% zout af.","Kneus of meng tot vocht vrijkomt; pak strak in onder de pekel.","Ferment 7–14 dagen op ±20°C; proef en koel bij de gewenste zuurte."] },
  { id:"kraut", baseName:"Zuurkoolstijl", varTemplate:"Zuurkool van {x}", generic:"kool", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:21}, gear:"Fermentatiemateriaal",
    mains:BRASSICA,
    ingredients:[{item:"{X}, gesneden",amount:"1 kg"},{item:"Zout (2,5%)",amount:"25 g"}],
    steps:["Snijd de {x} fijn en meng met 2,5% zout.","Kneed tot er pekel vrijkomt en stamp aan onder het vocht.","Ferment 2–4 weken op ±20°C; koel bij gewenste zuurte."] },
  { id:"kimchi", baseName:"Kimchi-stijl", varTemplate:"Kimchi van {x}", generic:"kool", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:5}, gear:"Fermentatiemateriaal",
    mains:["chinese kool","paksoi","amsoi","rode kool","koolrabi","radijs"],
    ingredients:[{item:"{X}",amount:"1 kg"},{item:"Zout",amount:"25 g"},{item:"Kimchipasta (ui, knoflook, gember, chili)",amount:"200 g"}],
    steps:["Zout de {x} en laat 2 uur wellen; spoel en dep.","Meng met de pasta.","Ferment 3–7 dagen op ±20°C; daarna koelen."] },
  { id:"fhot", baseName:"Gefermenteerde hotsauce", varTemplate:"Hotsauce van {x}", generic:"groente", category:"Fermentatie", yield:"≈ 500 g", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:22,days:14}, gear:"Fermentatiemateriaal",
    mains:["tomaat","radijs","ui","knoflook","rode biet"],
    ingredients:[{item:"{X} + chili",amount:"500 g"},{item:"Zout (2,5%)",amount:"13 g"}],
    steps:["Mix de {x} met chili en zout.","Ferment 1–2 weken onder pekel op ±22°C.","Mix glad, passeer en bottel; koel."] },
  { id:"fcaper", baseName:"Gefermenteerde bloemknoppen", varTemplate:"Kappertjes van {x}", generic:"bloem", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:3.5,tempC:20,days:7}, gear:"Fermentatiemateriaal",
    mains:["oost-indische kers","madelief","goudsbloem"],
    ingredients:[{item:"Knoppen van {x}",amount:"200 g"},{item:"Zout (3,5%)",amount:"7 g"},{item:"Water",amount:"200 g"}],
    steps:["Leg de knoppen onder een 3,5% pekel.","Ferment 1–2 weken op ±20°C.","Bewaar in de pekel; gebruik als kappertjes."] },

  // ---- FERMENTATIE: melkzuur (uitbreiding) ----
  { id:"kvass", baseName:"Groentekvass", varTemplate:"Kvass van {x}", generic:"tuingroente", category:"Fermentatie · dranken", yield:"≈ 1,5 l", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:5}, gear:"Fermentatiemateriaal",
    mains:["rode biet","gele biet","chioggia biet","wortel","knolselderij"],
    ingredients:[{item:"{X}, grof gesneden",amount:"500 g"},{item:"Water",amount:"1,5 l"},{item:"Zout (2,5% van totaal)",amount:"50 g"}],
    steps:["Doe de {x} met het water en zout in een pot; alles onder het vocht.","Ferment 3–7 dagen op ±20°C; roer dagelijks even om.","Zeef, proef op zuurte en bottel; bewaar koud en ontlucht de flessen dagelijks."] },
  { id:"dongchimi", baseName:"Waterkimchi (dongchimi-stijl)", varTemplate:"Waterkimchi van {x}", generic:"knolgroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:18,days:7}, gear:"Fermentatiemateriaal",
    mains:["meiknol","radijs","chinese kool","koolrabi"],
    ingredients:[{item:"{X}, in parten",amount:"1 kg"},{item:"Water",amount:"1 l"},{item:"Zout (2,5% van totaal)",amount:"50 g"},{item:"Knoflook, gember, ui",amount:"naar smaak"}],
    steps:["Leg de {x} met de aromaten onder de pekel.","Ferment 5–10 dagen op ±18°C tot de pekel licht bruist.","Serveer de groente én de sprankelende pekel ijskoud."] },
  { id:"fstem", baseName:"Gefermenteerde stelen", varTemplate:"Gefermenteerde stelen van {x}", generic:"steelgroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:10}, gear:"Fermentatiemateriaal",
    mains:["snijbiet","bleekselderij","kardoen","paksoi"],
    ingredients:[{item:"Stelen van {x}, in stukken",amount:"500 g"},{item:"Zout (2,5%)",amount:"13 g"},{item:"Water (indien nodig)",amount:"naar behoefte"}],
    steps:["Snijd de stelen van de {x} op maat en weeg 2,5% zout af.","Pak strak in onder de pekel.","Ferment 7–14 dagen op ±20°C; de stelen blijven knapperig."] },
  { id:"fherbpaste", baseName:"Gefermenteerde kruidenpasta", varTemplate:"Kruidenpasta van {x}", generic:"kruid", category:"Fermentatie", yield:"1 potje", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:5,tempC:20,days:14}, gear:"Fermentatiemateriaal",
    mains:["lavas","dragon","koriander","peterselie","bieslook","tuinzuring"],
    ingredients:[{item:"{X}, fijngehakt",amount:"200 g"},{item:"Zout (5%)",amount:"10 g"}],
    steps:["Hak de {x} fijn en kneed met 5% zout tot een natte pasta.","Druk luchtvrij aan in een klein potje.","Ferment 2 weken op ±20°C; daarna koel bewaren als smaakmaker."] },
  { id:"fvat", baseName:"Pekelgroenten uit het vat", varTemplate:"{X} uit het vat", generic:"tuingroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:3.5,tempC:18,days:10}, gear:"Fermentatiemateriaal",
    mains:["komkommer","courgette","meiknol","radijs"],
    ingredients:[{item:"{X}, heel of in stukken",amount:"1 kg"},{item:"Water",amount:"1 l"},{item:"Zout (3,5% van het water)",amount:"35 g"},{item:"Dille, knoflook & een druivenblad",amount:"per pot"}],
    steps:["Leg de {x} met dille, knoflook en een druivenblad (voor de knapperigheid) in de pot.","Giet de 3,5% pekel erover; alles onder het vocht.","Ferment 7–14 dagen op ±18°C; koel bij de gewenste zuurte."] },
  { id:"fkosho", baseName:"Tuinkosho", varTemplate:"Kosho van {x}", generic:"citrus", category:"Fermentatie", yield:"1 potje", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:10,tempC:20,days:7}, gear:"Fermentatiemateriaal",
    mains:["citroen","limoen","yuzu"],
    ingredients:[{item:"Schilrasp en sap van {x}",amount:"100 g"},{item:"Oost-Indische kers (blad en bloem), fijngehakt",amount:"50 g"},{item:"Zout (10%)",amount:"15 g"}],
    steps:["Meng rasp en sap van {x} met de fijngehakte Oost-Indische kers en 10% zout.","Ferment 1 week op ±20°C in een klein potje.","Rijp daarna koel; gebruik met mate als scherpe condiment."] },
  { id:"zoutpruim", baseName:"Zoutpruimen (umeboshi-stijl)", varTemplate:"Zoutpruimen van {x}", generic:"steenfruit", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:10,tempC:20,days:30}, gear:"Fermentatiemateriaal / droogoven",
    mains:["pruim","reine claude"],
    ingredients:[{item:"{X}, net niet rijp",amount:"1 kg"},{item:"Zout (10%)",amount:"100 g"},{item:"Rode melde (als shiso-alternatief)",amount:"een handvol"}],
    steps:["Wrijf de {x} in met het zout en verzwaar zodat er pekel vrijkomt.","Ferment 4 weken op ±20°C met de rode melde erbij voor kleur en aroma.","Droog de vruchten daarna kort na in de droogoven en bewaar in de eigen pekel."] },
  { id:"fmustard", baseName:"Gefermenteerde mosterd", generic:"mosterd", category:"Fermentatie", yield:"≈ 300 g", mode:"flavor", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:5}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Geel en bruin mosterdzaad",amount:"150 g"},{item:"Zuurkoolpekel (levend)",amount:"150 g"},{item:"Zout (2,5%)",amount:"8 g"}],
    steps:["Week het mosterdzaad in de levende zuurkoolpekel met het zout.","Ferment 3–5 dagen op ±20°C; roer dagelijks.","Maal grof of glad en rijp koel — de scherpte verzacht met de tijd."],
    variations:[{name:"Klassieke gefermenteerde mosterd"},{name:"Honingmosterd",add:"Roer na fermentatie honing erdoor."},{name:"Dragonmosterd",add:"Meng fijngehakte dragon erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Bietenmosterd",add:"Vervang een deel pekel door bietensap."}] },
  { id:"cultzuivel", baseName:"Gekweekte zuivel", generic:"zuivel", category:"Fermentatie · zuivel", yield:"≈ 500 g", mode:"flavor", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:0,tempC:24,days:1}, gear:"KitchenAid",
    ingredients:[{item:"Room of melk",amount:"500 g"},{item:"Karnemelk met levende culturen (starter)",amount:"50 g"}],
    steps:["Verwarm de zuivel tot ±24°C en roer de starter erdoor.","Laat 18–24 uur afgedekt op kamertemperatuur dikken.","Koel terug; klaar als basis of om verder te verwerken."],
    variations:[{name:"Crème fraîche"},{name:"Karnemelk",add:"Gebruik melk i.p.v. room; langer laten aanzuren."},{name:"Gekweekte boter",add:"Klop de gekweekte room in de KitchenAid tot boter en karnemelk; was de boter koud."}] },

  // ---- FERMENTATIE: suikerfermentatie (dranken) ----
  { id:"gingerbeer", baseName:"Gemberbier", generic:"gember", category:"Fermentatie · dranken", yield:"≈ 2 l", mode:"flavor", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:22,days:4}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Gemberbug (actieve starter)",amount:"100 g"},{item:"Verse gember, geraspt",amount:"60 g"},{item:"Suiker",amount:"160 g"},{item:"Water",amount:"2 l"},{item:"Citroensap",amount:"30 g"}],
    steps:["Meng water, suiker, gember, citroensap en de actieve gemberbug.","Ferment 2–4 dagen op ±22°C tot het bruist; zeef en bottel.","LET OP druk: gebruik beugelflessen of PET en ontlucht dagelijks; koel serveren."],
    variations:[{name:"Klassiek gemberbier"},{name:"Citroen-gemberbier",add:"Extra citroenrasp bij het bottelen."},{name:"Munt-gemberbier",add:"Trek munt mee in de tweede fermentatie.",season:["Lente","Zomer","Herfst"]},{name:"Frambozen-gemberbier",add:"Handvol frambozen in de fles voor kleur en smaak.",season:["Zomer","Herfst"]}] },
  { id:"waterkefir", baseName:"Waterkefir", generic:"kefir", category:"Fermentatie · dranken", yield:"≈ 1,5 l", mode:"flavor", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:22,days:2}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Waterkefirkorrels",amount:"60 g"},{item:"Suiker",amount:"70 g"},{item:"Water",amount:"1,5 l"},{item:"Ongezwavelde rozijn & schijfje citroen",amount:"per pot"}],
    steps:["Los de suiker op in het water en voeg korrels, rozijn en citroen toe.","Ferment 24–48 uur op kamertemperatuur; zeef de korrels terug voor de volgende ronde.","Bottel voor een tweede fermentatie van 1–2 dagen; ontlucht dagelijks en koel."],
    variations:[{name:"Klassieke waterkefir"},{name:"Aardbei-waterkefir",add:"Aardbeien in de tweede fermentatie.",season:["Lente","Zomer"]},{name:"Frambozen-waterkefir",add:"Frambozen in de tweede fermentatie.",season:["Zomer","Herfst"]},{name:"Citroenmelisse-waterkefir",add:"Takjes citroenmelisse in de fles.",season:["Zomer"]},{name:"Munt-waterkefir",add:"Verse munt in de fles.",season:["Lente","Zomer","Herfst"]}] },
  { id:"kombucha", baseName:"Kombucha", generic:"thee", category:"Fermentatie · dranken", yield:"≈ 2 l", mode:"flavor", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:23,days:10}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Sterke thee (zwart of groen)",amount:"2 l"},{item:"Suiker",amount:"160 g"},{item:"SCOBY + starterthee",amount:"1 stuk + 200 g"}],
    steps:["Zoet de thee, laat afkoelen en voeg SCOBY en starterthee toe.","Ferment 7–14 dagen op ±23°C onder een doek; proef vanaf dag 7.","Bottel (eventueel met fruit of kruiden voor de tweede fermentatie); ontlucht dagelijks."],
    variations:[{name:"Klassieke kombucha"},{name:"Appelkombucha",add:"Appelsap of -stukjes in de tweede fermentatie.",season:["Herfst","Winter"]},{name:"Druivenkombucha",add:"Gekneusde druiven in de fles.",season:["Herfst"]},{name:"Kruidenkombucha",add:"Tweede fermentatie met tijm of salie."}] },
  { id:"tepache", baseName:"Schillenbrouwsel", varTemplate:"Schillenbrouwsel van {x}", generic:"fruit", category:"Fermentatie · dranken", yield:"≈ 2 l", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:22,days:3}, gear:"Fermentatiemateriaal",
    mains:["appel","peer","kweepeer","ananas"],
    ingredients:[{item:"Schillen en klokhuizen van {x}",amount:"400 g"},{item:"Suiker of rietsuiker",amount:"150 g"},{item:"Water",amount:"2 l"},{item:"Kaneel of specerijen",amount:"naar smaak"}],
    steps:["Doe de schillen van {x} met suiker, water en specerijen in een pot; dek af met een doek.","Ferment 2–4 dagen op ±22°C tot het licht bruist (wilde gist van de schil).","Zeef, bottel en koel; ontlucht dagelijks. Mooi zero-waste uit de keuken."] },
  { id:"wildesoda", baseName:"Wilde bruislimonade", varTemplate:"Wilde bruis van {x}", generic:"bloem", category:"Fermentatie · dranken", yield:"≈ 2 l", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:22,days:3}, gear:"Fermentatiemateriaal",
    mains:["kamille","lavendel","citroenmelisse","munt","goudsbloem","korenbloem"],
    ingredients:[{item:"{X} (vers, ongewassen voor de wilde gist)",amount:"40 g"},{item:"Suiker",amount:"150 g"},{item:"Water",amount:"2 l"},{item:"Citroensap",amount:"30 g"}],
    steps:["Meng alles in een pot en dek af met een doek; roer 2× per dag.","Ferment 2–4 dagen op ±22°C tot er belletjes verschijnen.","Zeef en bottel; LET OP druk — beugelfles of PET, dagelijks ontluchten, koel serveren."] },
  { id:"landwijn", baseName:"Landwijn", varTemplate:"Landwijn van {x}", generic:"tuinfruit", category:"Fermentatie · dranken", yield:"≈ 5 l", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:20,days:21}, gear:"Fermentatiemateriaal (mandfles + waterslot)",
    mains:["druif","appel","pruim","braam","framboos","aalbes"],
    ingredients:[{item:"{X}, gekneusd",amount:"3 kg"},{item:"Suiker",amount:"800 g"},{item:"Water",amount:"tot 5 l"},{item:"Wijngist (of wild, met geduld)",amount:"1 zakje"}],
    steps:["Kneus de {x}, voeg suikerwater en gist toe in een mandfles met waterslot.","Ferment 2–4 weken op ±20°C tot het waterslot stil valt.","Hevel over van het bezinksel en laat minimaal 2 maanden rijpen."] },
  { id:"cider", baseName:"Boerderijcider", varTemplate:"Cider van {x}", generic:"fruit", category:"Fermentatie · dranken", yield:"≈ 5 l", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:18,days:14}, gear:"Sapcentrifuge + waterslot",
    mains:["appel","peer","kweepeer"],
    ingredients:[{item:"Sap van {x} (sapcentrifuge)",amount:"5 l"},{item:"Cidergist (of wild)",amount:"1 zakje"}],
    steps:["Pers het sap van {x} en doe het met de gist in een mandfles met waterslot.","Ferment 2–3 weken op ±18°C tot droog.","Hevel over, laat klaren en bottel; kort nagisten op fles voor bubbels (ontlucht bij twijfel)."] },
  { id:"honingknoflook", baseName:"Honing-knoflook", generic:"knoflook", category:"Fermentatie", yield:"1 pot", mode:"flavor", ferment:true, fermentMethod:"Suikerfermentatie", fermentDefaults:{saltPct:0,tempC:20,days:30}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Knoflooktenen, gepeld",amount:"250 g"},{item:"Rauwe honing",amount:"om onder te dompelen"}],
    steps:["Dompel de gepelde tenen volledig onder in rauwe honing.","Keer de pot de eerste 2 weken dagelijks; ontlucht het deksel regelmatig.","Na ±1 maand zacht en rond van smaak; wordt maandenlang beter."],
    variations:[{name:"Klassieke honing-knoflook",season:["Zomer","Herfst"]},{name:"Honing-knoflook met chili",add:"Voeg gedroogde chili toe.",season:["Zomer","Herfst"]},{name:"Honing-knoflook met tijm",add:"Takjes tijm mee in de pot.",season:["Zomer","Herfst"]}] },

  // ---- FERMENTATIE: azijn (tweetraps, met moeder en zuurstof) ----
  { id:"fruitazijnlevend", baseName:"Levende fruitazijn", varTemplate:"Levende azijn van {x}", generic:"tuinfruit", category:"Fermentatie · azijn", yield:"≈ 1 l", ferment:true, fermentMethod:"Azijnfermentatie", fermentDefaults:{saltPct:0,tempC:24,days:30}, gear:"Fermentatiemateriaal",
    mains:["appel","peer","druif","framboos","braam","pruim"],
    ingredients:[{item:"{X}, gekneusd",amount:"500 g"},{item:"Water",amount:"1 l"},{item:"Suiker",amount:"100 g"},{item:"Levende azijn of azijnmoeder",amount:"scheut"}],
    steps:["Laat de {x} met suikerwater eerst enkele dagen tot alcohol vergisten (doek erover, dagelijks roeren).","Zeef en voeg de azijnmoeder toe; dek af met een doek — azijn heeft zuurstof nodig, dus géén deksel.","Laat 3–6 weken op ±24°C verzuren; proef, zeef en bottel."] },
  { id:"wijnazijn", baseName:"Wijnazijn van restjes", generic:"wijn", category:"Fermentatie · azijn", yield:"≈ 1 l", mode:"flavor", ferment:true, fermentMethod:"Azijnfermentatie", fermentDefaults:{saltPct:0,tempC:24,days:45}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Wijnresten (open flessen)",amount:"1 l"},{item:"Water",amount:"250 g"},{item:"Azijnmoeder of levende azijn",amount:"scheut"}],
    steps:["Verdun de wijnresten iets met water en voeg de azijnmoeder toe.","Dek af met een doek (zuurstof!) en zet weg op ±24°C.","Proef na 4–6 weken; zeef, bottel en bewaar de moeder voor de volgende ronde."],
    variations:[{name:"Rodewijnazijn"},{name:"Wittewijnazijn"},{name:"Ciderazijn",add:"Gebruik eigen cider als basis."}] },
  { id:"kombuchaazijn", baseName:"Kombucha-azijn", generic:"kombucha", category:"Fermentatie · azijn", yield:"≈ 1 l", mode:"flavor", ferment:true, fermentMethod:"Azijnfermentatie", fermentDefaults:{saltPct:0,tempC:23,days:30}, gear:"Fermentatiemateriaal",
    ingredients:[{item:"Kombucha (doorgefermenteerd)",amount:"1 l"}],
    steps:["Laat kombucha bewust 3–4 weken langer doorfermenteren onder een doek.","Proef tot de zuurgraad die van azijn benadert.","Zeef en bottel; gebruik als frisse azijn in dressings en pekels."],
    variations:[{name:"Klassieke kombucha-azijn"},{name:"Kruiden-kombucha-azijn",add:"Trek na het bottelen met tijm of dragon."}] },

  // ---- voorraad-basistechnieken (extra breedte) ----
  { id:"coulis", baseName:"Fruitcoulis", noun:"Coulis", generic:"fruit", category:"Gels", yield:"≈ 350 g", mains:FRUIT_ONLY,
    ingredients:[{item:"Puree van {x}",amount:"300 g"},{item:"Poedersuiker",amount:"40 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Mix puree van {x} met suiker en citroen.","Verdun voor een lopende saus.","Passeer en koel."] },
  { id:"compote", baseName:"Fruitcompote", noun:"Compote", generic:"fruit", category:"Chutney & jam", yield:"≈ 400 g", mains:FRUIT_ONLY,
    ingredients:[{item:"{X} in stukken",amount:"400 g"},{item:"Suiker",amount:"80 g"},{item:"Citroensap",amount:"10 g"}],
    steps:["Wel de {x} met suiker.","Kook zachtjes in tot compote.","Op smaak en koel."] },
  { id:"jam", baseName:"Fruitconfituur", noun:"Confituur", generic:"fruit", category:"Chutney & jam", yield:"≈ 3 potten", mains:FRUIT_ONLY,
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Geleisuiker",amount:"500 g"},{item:"Citroensap",amount:"20 g"}],
    steps:["Kook met geleisuiker.","4 min doorkoken; test op een koud bordje.","Vul potten heet af."] },
  { id:"fpowder", baseName:"Fruitpoeder", varTemplate:"Poeder van {x}", generic:"fruit", category:"Krokant & garnituur", yield:"≈ 60 g", gear:"Droogoven", mains:FRUIT_ONLY,
    ingredients:[{item:"Puree van {x}",amount:"300 g"}],
    steps:["Strijk dun uit op een mat.","Droog op 60°C tot leerachtig.","Maal tot poeder."] },
  { id:"pearl", baseName:"Fruitparels", varTemplate:"Parels van {x}", generic:"fruit", category:"Garnituur", yield:"≈ 150 g", mains:FRUIT,
    ingredients:[{item:"Sap van {x}",amount:"200 g"},{item:"Agar-agar",amount:"2 g"},{item:"IJskoude olie",amount:"500 ml"}],
    steps:["Kook sap van {x} met agar.","Druppel in ijskoude olie.","Zeef en spoel."] },
  { id:"fchip", baseName:"Fruitchip", varTemplate:"Fruitchip van {x}", generic:"fruit", category:"Krokant & garnituur", yield:"≈ 20 chips", gear:"Droogoven", mains:FRUIT,
    ingredients:[{item:"Dunne plakjes {x}",amount:"1 stuk"},{item:"Poedersuiker",amount:"naar behoefte"}],
    steps:["Snijd flinterdun.","Bestrooi licht met suiker.","Droog op 90°C tot krokant."] },
  { id:"fleather", baseName:"Fruitleer", varTemplate:"Fruitleer van {x}", generic:"fruit", category:"Krokant & garnituur", yield:"1 vel", gear:"Droogoven", mains:FRUIT,
    ingredients:[{item:"Puree van {x}",amount:"400 g"},{item:"Suiker",amount:"30 g"}],
    steps:["Strijk de puree dun uit.","Droog op 60°C tot buigzaam.","Snijd op maat."] },
  { id:"fvinegar2", baseName:"Fruitazijn", varTemplate:"Azijn van {x}", generic:"fruit", category:"Oliën & vinaigrettes", yield:"≈ 300 g", mains:FRUIT,
    ingredients:[{item:"{X}",amount:"150 g"},{item:"Witte-wijnazijn",amount:"300 g"}],
    steps:["Doe de {x} in de azijn.","Laat 2 weken trekken.","Zeef en bottel."] },
  { id:"chutney", baseName:"Fruitchutney", varTemplate:"Chutney van {x}", generic:"fruit", category:"Chutney & jam", yield:"≈ 3 potten", mains:FRUIT,
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Ui",amount:"100 g"},{item:"Azijn",amount:"100 g"},{item:"Suiker",amount:"120 g"},{item:"Specerijen",amount:"naar smaak"}],
    steps:["Fruit de ui aan.","Voeg {x}, azijn, suiker en specerijen toe.","Kook in tot chutney; vul heet af."] },
  { id:"vpuree", baseName:"Groentepuree (voorraad)", noun:"Puree", generic:"groente", category:"Purees", yield:"≈ 500 g", gear:"Thermoblender", mains:VEG_ONLY,
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Boter",amount:"50 g"},{item:"Melk of bouillon",amount:"200 g"},{item:"Zout",amount:"naar smaak"}],
    steps:["Gaar de {x} zacht.","Mix in de thermoblender glad.","Op smaak en passeer."] },
  { id:"vespuma", baseName:"Groente-espuma (voorraad)", noun:"Espuma", generic:"groente", category:"Schuim & espuma", yield:"1 sifon", gear:"Sifon", mains:VEG_ONLY,
    ingredients:[{item:"Puree van {x}",amount:"400 g"},{item:"Room",amount:"100 g"},{item:"Gelatineblaadje",amount:"1 blaadje"}],
    steps:["Meng warme puree van {x} met room en gelatine.","Vul een sifon; 2 patronen.","Koel; schud voor gebruik."] },
  { id:"vpickle", baseName:"Gepekelde groente (voorraad)", varTemplate:"Gepekelde {x}", generic:"groente", category:"Pickles & zuur", yield:"≈ 400 g", mains:VEG_ONLY,
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Azijn",amount:"200 g"},{item:"Suiker",amount:"80 g"},{item:"Zout",amount:"8 g"}],
    steps:["Snijd de {x} op maat.","Kook de pekel en giet over de {x}.","Laat minimaal 1 uur trekken."] },
  { id:"vchip", baseName:"Groentechip (voorraad)", varTemplate:"Groentechip van {x}", generic:"groente", category:"Krokant & garnituur", yield:"≈ 20 chips", gear:"iVario", mains:VEG_ONLY.filter((v) => !["doperwt","mais"].includes(v)),
    ingredients:[{item:"Dunne plakjes {x}",amount:"1 stuk"},{item:"Zout",amount:"naar smaak"}],
    steps:["Snijd flinterdun.","Frituur of droog krokant.","Zout licht."] },
  { id:"vgel", baseName:"Groentegel (voorraad)", noun:"Gel", generic:"groente", category:"Gels", yield:"≈ 400 g", gear:"Thermoblender", mains:VEG_ONLY.filter((v) => !["aardappel","aubergine","doperwt"].includes(v)),
    ingredients:[{item:"Sap van {x}",amount:"400 g"},{item:"Agar-agar",amount:"3 g"}],
    steps:["Kook sap van {x} met agar 2 min.","Opstijven en glad mixen.","Passeer in een knijpfles."] },
  { id:"herboil2", baseName:"Kruidenolie (voorraad)", varTemplate:"Olie van {x}", generic:"kruid", category:"Oliën & vinaigrettes", yield:"≈ 250 g", gear:"Thermoblender", mains:HERB_ONLY,
    ingredients:[{item:"{X}",amount:"100 g"},{item:"Neutrale olie",amount:"250 g"}],
    steps:["Blancheer de {x} kort en dep droog.","Mix met olie tot 70°C.","Laat uitlekken door een doek."] },
  { id:"herbgel2", baseName:"Kruidengel (voorraad)", noun:"Gel", generic:"kruid", category:"Gels", yield:"≈ 300 g", mains:HERB_ONLY,
    ingredients:[{item:"Sap van {x}",amount:"300 g"},{item:"Agar-agar",amount:"3 g"}],
    steps:["Kook sap van {x} met agar 2 min.","Opstijven en mixen.","Passeer."] },
  { id:"pesto2", baseName:"Pesto (voorraad)", varTemplate:"Pesto van {x}", generic:"kruid", category:"Sauzen & emulsies", yield:"≈ 300 g", mains:HERB_ONLY,
    ingredients:[{item:"{X}",amount:"80 g"},{item:"Pijnboompitten of amandel",amount:"30 g"},{item:"Kaas",amount:"40 g"},{item:"Olijfolie",amount:"120 g"}],
    steps:["Rooster de pitten.","Mix {x}, pitten en kaas grof.","Monteer met olie; op smaak."] },
  { id:"praline", baseName:"Praliné", varTemplate:"Praliné van {x}", generic:"noot", category:"Zoet & patisserie", yield:"≈ 300 g", mains:NUT.slice(0,8),
    ingredients:[{item:"{X}",amount:"150 g"},{item:"Suiker",amount:"150 g"},{item:"Water",amount:"40 g"}],
    steps:["Rooster de {x}.","Maak een karamel.","Meng, laat hard worden en mix tot pasta."] },
  { id:"nutpaste", baseName:"Notenpasta", varTemplate:"Pasta van {x}", generic:"noot", category:"Zoet & patisserie", yield:"≈ 200 g", mains:NUT.slice(0,8),
    ingredients:[{item:"Geroosterde {x}",amount:"200 g"},{item:"Zout",amount:"snuf"}],
    steps:["Rooster de {x} goudbruin.","Mix tot gladde pasta.","Bewaar afgesloten."] },
  { id:"patissiere", baseName:"Crème pâtissière", generic:"vanille", category:"Zoet & patisserie", yield:"≈ 650 g", mode:"flavor",
    ingredients:[{item:"Melk",amount:"500 g"},{item:"Eidooiers",amount:"4 stuks"},{item:"Suiker",amount:"100 g"},{item:"Maïzena",amount:"40 g"}],
    steps:["Verwarm de melk.","Bind met dooiers, suiker en maïzena.","Kook 2 min door; koel afgedekt."],
    variations:[{name:"Vanillebanketbakkersroom",add:"Trek met vanille."},{name:"Koffiebanketbakkersroom",add:"Trek met koffie."},{name:"Citroenbanketbakkersroom",add:"Citroenrasp toevoegen."},{name:"Pistachebanketbakkersroom",add:"Pistachepasta erdoor."},{name:"Pralinébanketbakkersroom",add:"Pralinépasta erdoor."},{name:"Kaneelbanketbakkersroom",add:"Trek met kaneel."},{name:"Laurierbanketbakkersroom",add:"Trek kort met laurier."},{name:"Chocoladebanketbakkersroom",add:"Chocolade oplossen."}] },
  { id:"hollandaise", baseName:"Hollandaisefamilie", generic:"boter", category:"Sauzen & emulsies", yield:"≈ 300 g", mode:"flavor",
    ingredients:[{item:"Eidooiers",amount:"3 stuks"},{item:"Geklaarde boter",amount:"200 g"},{item:"Citroensap",amount:"10 g"},{item:"Reductie",amount:"20 g"}],
    steps:["Klop dooiers met reductie au bain-marie tot ruban.","Monteer met de boter.","Op smaak met citroen."],
    variations:[{name:"Hollandaise"},{name:"Béarnaise",add:"Dragonreductie en verse dragon.",season:["Lente","Zomer","Herfst"]},{name:"Choron",add:"Tomatenconcentraat door de béarnaise."},{name:"Maltaise",add:"Bloedsinaasappel.",season:["Winter"]},{name:"Mousseline",add:"Opgeslagen room erdoor."},{name:"Paloise",add:"Munt i.p.v. dragon.",season:["Lente","Zomer","Herfst"]}] },
  { id:"sponge", baseName:"Sifon-spons", generic:"spons", category:"Zoet & patisserie", yield:"≈ 8 stuks", mode:"flavor", gear:"Sifon",
    ingredients:[{item:"Eiwit",amount:"100 g"},{item:"Eidooier",amount:"60 g"},{item:"Suiker",amount:"60 g"},{item:"Bloem",amount:"40 g"}],
    steps:["Mix glad en passeer in een sifon.","2 patronen; vul bekers tot een derde.","Gaar 40 sec in de magnetron."],
    variations:[{name:"Bietenspons",add:"Kleur met bietenpoeder."},{name:"Basilicumspons",add:"Verse basilicum door het beslag.",season:["Zomer"]},{name:"Citroenspons",add:"Citroenrasp."},{name:"Chocoladespons",add:"Cacao toevoegen."},{name:"Pistachespons",add:"Pistachepasta."},{name:"Zuringspons",add:"Verse zuring door het beslag.",season:["Lente","Zomer"]},{name:"Peterseliespons",add:"Geblancheerde peterselie door het beslag.",season:["Lente","Zomer","Herfst"]}] },
  { id:"granita", baseName:"Granité", generic:"fruit", category:"Sorbet & ijs", yield:"≈ 700 g", mode:"flavor", gear:"Vriezer",
    ingredients:[{item:"Sap of aftreksel",amount:"600 g"},{item:"Suiker",amount:"80 g"},{item:"Citroensap",amount:"15 g"}],
    steps:["Meng en breng op smaak.","Vries in en schraap elk half uur met een vork.","Bewaar luchtig bevroren."],
    variations:[{name:"Aardbei-granité",season:["Lente","Zomer"]},{name:"Framboos-granité",season:["Zomer","Herfst"]},{name:"Druiven-granité",season:["Herfst"]},{name:"Appel-granité",season:["Herfst","Winter"]},{name:"Rabarber-granité",season:["Lente"]},{name:"Citroenmelisse-granité",season:["Zomer"]},{name:"Munt-granité",season:["Lente","Zomer","Herfst"]},{name:"Kamille-granité",season:["Zomer"]}] },
  { id:"kruidensuiker", baseName:"Kruidensuiker", varTemplate:"Suiker van {x}", generic:"kruid", category:"Zoet & patisserie", yield:"≈ 220 g", gear:"Droogoven", mains:["munt","citroenmelisse","lavendel","kamille","rozemarijn","tijm"],
    ingredients:[{item:"{X}",amount:"20 g"},{item:"Suiker",amount:"200 g"}],
    steps:["Droog de {x} in de droogoven.","Vermaal met de suiker.","Bewaar droog en afgesloten."] },

  { id:"siroop", baseName:"Kruiden- en bloemensiroop", varTemplate:"Siroop van {x}", generic:"kruid", category:"Zoet & patisserie", yield:"≈ 500 g",
    mains:["munt","citroenmelisse","lavendel","kamille","rozemarijn","tijm","salie","lavas","goudsbloem","korenbloem"],
    ingredients:[{item:"{X}",amount:"30 g"},{item:"Water",amount:"300 g"},{item:"Suiker",amount:"300 g"}],
    steps:["Breng water en suiker aan de kook.","Voeg de {x} toe en laat van het vuur 20 min afgedekt trekken.","Zeef, koel terug en bewaar in de koeling."] },
  { id:"gedroogd", baseName:"Gedroogde kruiden & bloemen", varTemplate:"Gedroogde {x}", generic:"kruid", category:"Kruiden & zout", yield:"1 pot", gear:"Droogoven",
    mains:[...GHERB,"kamille","lavendel","goudsbloem","korenbloem"],
    ingredients:[{item:"{X}",amount:"1 bos"}],
    steps:["Was de {x} en dep goed droog.","Droog op 40–50°C tot ritselend droog.","Verkruimel en bewaar luchtdicht en donker."] },

  // ---- VLEES (voornamelijk varken, soms rund) ----
  { id:"pork", baseName:"Varkensvlees (eigen varkens)", generic:"varken", category:"Vlees", yield:"naar behoefte", mode:"flavor", diet:"Varkensvlees", gear:"iVario / Black Bastard", endorsements:["Michael"],
    ingredients:[{item:"Varkensvlees (eigen varkens)",amount:"1 kg"},{item:"Zout",amount:"18 g/kg"},{item:"Aromaten",amount:"naar smaak"}],
    steps:["Kruid het vlees ruim, bij voorkeur een dag vooraf.","Gaar langzaam in de iVario of op de Black Bastard tot zacht.","Laat rusten en maak af."],
    variations:[{name:"Gegaarde procureur"},{name:"Gelakte buik"},{name:"Pulled schouder"},{name:"Varkenswang in eigen jus"},{name:"Krokante krosse"}] },
  { id:"beef", baseName:"Rundvlees", generic:"rund", category:"Vlees", yield:"naar behoefte", mode:"flavor", diet:"Rundvlees", gear:"iVario",
    ingredients:[{item:"Rundvlees",amount:"1 kg"},{item:"Zout",amount:"18 g/kg"},{item:"Wortel, ui, tijm",amount:"mirepoix"}],
    steps:["Kleur het vlees rondom.","Smoor langzaam met mirepoix tot zacht.","Reduceer het vocht tot jus."],
    variations:[{name:"Gesmoorde sukade"},{name:"Short rib van het bot"},{name:"Runderwang"}] },
];

// Vereniging van de seizoenen van alle hoofdingrediënten van een basis.
// Dekt de basis het hele jaar (of alle vier de seizoenen), dan "Hele jaar".
function unionSeason(mains) {
  const set = new Set();
  for (const m of mains) for (const s of seasonOf(m)) set.add(s);
  if (set.has("Hele jaar") || SEASONS.every((s) => set.has(s))) return ["Hele jaar"];
  return SEASONS.filter((s) => set.has(s));
}

function buildLibrary() {
  const out = [];
  for (const b of BASES) {
    const noun = b.noun || b.baseName;
    out.push({
      id: b.id, name: b.baseName + " (basis)", category: b.category, yield: b.yield,
      ingredients: b.ingredients.map((x) => ({ item: fill(x.item, b.generic), amount: x.amount })),
      steps: b.steps.map((s) => fill(s, b.generic)),
      endorsements: b.endorsements ? [...b.endorsements] : [], chefsPick: !!b.chefsPick,
      baseId: null, baseName: null, isBase: true,
      season: b.mode === "flavor" ? ["Hele jaar"] : unionSeason(b.mains), garden: false,
      diet: b.diet || "Vegetarisch", ferment: !!b.ferment, fermentMethod: b.fermentMethod || null, fermentDefaults: b.fermentDefaults || null,
      gear: b.gear || null, updatedBy: "Keukenteam", updatedAt: "startbibliotheek",
    });
    if (b.mode === "flavor") {
      for (const v of b.variations) {
        out.push({
          id: b.id + "-" + slug(v.name), name: v.name, category: b.category, yield: b.yield,
          ingredients: b.ingredients.map((x) => ({ ...x })),
          steps: v.add ? [...b.steps, "Variatie: " + v.add] : [...b.steps],
          endorsements: [], chefsPick: false, baseId: b.id, baseName: b.baseName, isBase: false,
          season: v.season || ["Hele jaar"], garden: false, diet: b.diet || "Vegetarisch",
          ferment: !!b.ferment, fermentMethod: b.fermentMethod || null, fermentDefaults: b.fermentDefaults || null, gear: b.gear || null,
          updatedBy: "Keukenteam", updatedAt: "startbibliotheek",
        });
      }
    } else {
      for (const m of b.mains) {
        const nm = b.varTemplate ? fill(b.varTemplate, m) : noun + " van " + m;
        out.push({
          id: b.id + "-" + slug(m), name: nm, category: b.category, yield: b.yield,
          ingredients: b.ingredients.map((x) => ({ item: fill(x.item, m), amount: x.amount })),
          steps: b.steps.map((s) => fill(s, m)),
          endorsements: [], chefsPick: false, baseId: b.id, baseName: b.baseName, isBase: false,
          season: seasonOf(m), garden: GARDEN_ALL.includes(m), diet: b.diet || "Vegetarisch",
          ferment: !!b.ferment, fermentMethod: b.fermentMethod || null, fermentDefaults: b.fermentDefaults || null, gear: b.gear || null,
          updatedBy: "Keukenteam", updatedAt: "startbibliotheek",
        });
      }
    }
  }
  return out;
}

const CURATED = [
  { id:"c-tomato-mousse", name:"Hartige tomatenmousse", category:"Mousses", yield:"≈ 550 g",
    ingredients:[{item:"Gezeefde tomaten (passata)",amount:"300 g"},{item:"Slagroom",amount:"200 g"},{item:"Gelatineblaadjes",amount:"3 blaadjes"},{item:"Basilicum, fijngesneden",amount:"enkele blaadjes"},{item:"Zout & peper",amount:"naar smaak"}],
    steps:["Week de gelatine en los op in een derde van de warme passata.","Meng met de rest van de passata en breng stevig op smaak met zout en peper.","Koel tot lobbig en spatel de halfgeslagen room en de basilicum erdoor.","Laat minimaal 3 uur opstijven."],
    endorsements:["Michael"], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:true, diet:"Vegetarisch", ferment:false, gear:"Thermoblender", updatedBy:"Michael", updatedAt:"1 week geleden" },
  { id:"c-caprese-mozz", name:"Gerookte mozzarella", category:"Zuivel", yield:"4 porties",
    ingredients:[{item:"Buffelmozzarella",amount:"2 bollen"},{item:"Beukenrookmot",amount:"1 handvol"},{item:"Olijfolie",amount:"om in te wrijven"},{item:"Zeezout",amount:"om af te maken"}],
    steps:["Laat de mozzarella uitlekken en dep droog.","Rook koud 8–10 min zonder hitte.","Trek in stukken en maak af."],
    endorsements:["Michael","Simon"], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Black Bastard", updatedBy:"Simon", updatedAt:"1 week geleden" },
  { id:"c-olive-crumble", name:"Olijvencrumble", category:"Crumbles & garnituur", yield:"≈ 200 g",
    ingredients:[{item:"Zwarte olijven, ontpit",amount:"150 g"},{item:"Panko",amount:"60 g"},{item:"Olijfolie",amount:"20 g"}],
    steps:["Droog de olijven en maal tot poeder.","Rooster de panko goudbruin.","Meng en bewaar krokant."],
    endorsements:["Kim","Michael"], chefsPick:true, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Droogoven", updatedBy:"Kim", updatedAt:"3 dagen geleden" },
  { id:"c-balsamic-pearls", name:"Balsamicoparels", category:"Garnituur", yield:"≈ 150 g",
    ingredients:[{item:"Balsamicoazijn",amount:"150 g"},{item:"Agar-agar",amount:"1,5 g"},{item:"IJskoude olie",amount:"500 ml"}],
    steps:["Kook de balsamico met agar.","Druppel in ijskoude olie tot parels.","Zeef en spoel."],
    endorsements:["Isa"], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Isa", updatedAt:"4 dagen geleden" },
];

const LIBRARY = buildLibrary();
const initialRecipes = [...CURATED, ...LIBRARY];

const seedDishes = [
  { id:"d1", name:"Salade Caprese", course:"Zomervoorgerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Gedeconstrueerde caprese met tomaat uit eigen tuin, rook en kruid.",
    plating:"Quenelle hartige tomatenmousse, gerookte mozzarella, gel van basilicum, olijvencrumble en balsamicoparels.",
    recipeIds:["c-tomato-mousse","c-caprese-mozz","herbgel2-basilicum","c-olive-crumble","c-balsamic-pearls"],
    updatedBy:"Michael", updatedAt:"2 dagen geleden" },
  { id:"d2", name:"Drie bieten uit eigen tuin", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Rode, gele en chioggia biet in verschillende texturen, met appel en dragon.",
    plating:"Geroosterde rode biet, carpaccio van chioggia biet, gepekelde gele biet, compote van appel en olie van dragon.",
    recipeIds:["roast-rode-biet","gcarp-chioggia-biet","gpickle-gele-biet","gcompote-appel","gherboil-dragon"],
    updatedBy:"Stef", updatedAt:"1 dag geleden" },
  { id:"d3", name:"Courgette & tuinbloemen", course:"Zomertussengerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Gegrilde courgette met eetbare bloemen en frisse kruiden uit de tuin.",
    plating:"Gegrilde courgette, puree van courgette, gepekelde courgettebloem, azijn van goudsbloem en olie van bieslook.",
    recipeIds:["grill-courgette","gpuree-courgette","pflower-courgettebloem","fvinegar-goudsbloem","gherboil-bieslook"],
    updatedBy:"Simon", updatedAt:"3 dagen geleden" },
  { id:"d4", name:"Boerenkool & eigen varken", course:"Winterhoofdgerecht", season:["Winter"], diet:"Varkensvlees",
    description:"Winters bord met langgegaard varken van eigen varkens en boerenkool.",
    plating:"Gegaarde procureur, puree van boerenkool, geroosterde pastinaak, gefermenteerde rode kool en tijm-knoflookjus.",
    recipeIds:["pork-gegaarde-procureur","gpuree-boerenkool","roast-pastinaak","lacto-rode-kool","jus-tijm-knoflookjus"],
    updatedBy:"Michael", updatedAt:"2 dagen geleden" },
  { id:"d5", name:"Aardbei, rabarber & kamille", course:"Lentedessert", season:["Lente"], diet:"Vegetarisch",
    description:"Frisse lente met aardbei en rabarber uit de tuin, en een vleugje kamille.",
    plating:"Gepocheerde rabarber, sorbet van aardbei, coulis van aardbei en anglaise van kamille.",
    recipeIds:["gpoach-rabarber","gsorbet-aardbei","gcoulis-aardbei","anglaise-kamille-anglaise"],
    updatedBy:"Isa", updatedAt:"4 dagen geleden" },
  { id:"d6", name:"Knolselderij & appel", course:"Wintervoorgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Zijdezachte knolselderij met zoetzure appel en hazelnoot.",
    plating:"Puree van knolselderij, geroosterde knolselderij, compote van appel, crumble van hazelnoot en beurre blanc.",
    recipeIds:["gpuree-knolselderij","roast-knolselderij","gcompote-appel","crumble-hazelnoot","beurreblanc-klassieke-beurre-blanc"],
    updatedBy:"Stef", updatedAt:"5 dagen geleden" },
  { id:"d7", name:"Tomaten van het erf", course:"Zomervoorgerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Tomaat uit eigen tuin in vier texturen, met rook en kruid.",
    plating:"Mousse van tomaat, tartaar van tomaat, gefermenteerde hotsauce van tomaat, olie van bieslook en olijvencrumble.",
    recipeIds:["c-tomato-mousse","gtartaar-tomaat","fhot-tomaat","gherboil-bieslook","c-olive-crumble"],
    updatedBy:"Michael", updatedAt:"1 dag geleden" },
  { id:"d8", name:"Venkel, peer & walnoot", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Gegrilde venkel met gepocheerde peer en een noot van walnoot.",
    plating:"Gegrilde venkel, gel van venkel, gepocheerde peer, olie van dragon en pasta van walnoot.",
    recipeIds:["grill-venkel","ggel-venkel","gpoach-peer","gherboil-dragon","nutpaste-walnoot"],
    updatedBy:"Simon", updatedAt:"2 dagen geleden" },
  { id:"d9", name:"Erwt, munt & radijs", course:"Lentetussengerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Zoete erwten uit de tuin met frisse munt en knapperige radijs.",
    plating:"Espuma van erwten, puree van erwten, gepekelde radijs, olie van munt en gel van munt.",
    recipeIds:["gespuma-erwten","beanpuree-erwten","gpickle-radijs","gherboil-munt","gherbgel-munt"],
    updatedBy:"Isa", updatedAt:"2 dagen geleden" },
  { id:"d10", name:"Rabarber & kamille", course:"Lentedessert", season:["Lente"], diet:"Vegetarisch",
    description:"Rabarber uit de tuin, licht bloemig met kamille.",
    plating:"Gepocheerde rabarber, sorbet van rabarber, coulis van rabarber, anglaise van kamille en gekonfijte kamille.",
    recipeIds:["gpoach-rabarber","gsorbet-rabarber","gcoulis-rabarber","anglaise-kamille-anglaise","candyflower-kamille"],
    updatedBy:"Isa", updatedAt:"3 dagen geleden" },
  { id:"d11", name:"Wortel in texturen", course:"Herfsttussengerecht", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Wortel uit eigen tuin, van geroosterd tot krokant, met koriander.",
    plating:"Geroosterde wortel, puree van wortel, chip van wortel, gepekelde wortel en olie van koriander.",
    recipeIds:["roast-wortel","gpuree-wortel","gchip-wortel","gpickle-wortel","gherboil-koriander"],
    updatedBy:"Kim", updatedAt:"3 dagen geleden" },
  { id:"d12", name:"Aardpeer & hazelnoot", course:"Wintervoorgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Nootachtige aardpeer met hazelnoot en beurre blanc.",
    plating:"Puree van aardpeer, geroosterde aardpeer, chip van aardpeer, crumble van hazelnoot en beurre blanc.",
    recipeIds:["gpuree-aardpeer","roast-aardpeer","gchip-aardpeer","crumble-hazelnoot","beurreblanc-klassieke-beurre-blanc"],
    updatedBy:"Stef", updatedAt:"4 dagen geleden" },
  { id:"d13", name:"Rode kool, appel & eigen varken", course:"Winterhoofdgerecht", season:["Winter"], diet:"Varkensvlees",
    description:"Gelakte buik van eigen varkens met gefermenteerde rode kool en appel.",
    plating:"Gelakte buik, gefermenteerde rode kool, compote van appel, puree van knolselderij en tijm-knoflookjus.",
    recipeIds:["pork-gelakte-buik","lacto-rode-kool","gcompote-appel","gpuree-knolselderij","jus-tijm-knoflookjus"],
    updatedBy:"Michael", updatedAt:"1 dag geleden" },
  { id:"d14", name:"Gerookte biet & geitenkaas", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Drie bieten, gerookt en rauw, met dragon en balsamico.",
    plating:"Gerookte rode biet, carpaccio van chioggia biet, gepekelde gele biet, olie van dragon en balsamicoparels.",
    recipeIds:["gsmoke-rode-biet","gcarp-chioggia-biet","gpickle-gele-biet","gherboil-dragon","c-balsamic-pearls"],
    updatedBy:"Simon", updatedAt:"2 dagen geleden" },
  { id:"d15", name:"Courgette, bloem & munt", course:"Zomertussengerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Gegrilde courgette met eetbare bloem en frisse munt.",
    plating:"Gegrilde courgette, tartaar van courgette, gepekelde courgettebloem, olie van munt en azijn van goudsbloem.",
    recipeIds:["grill-courgette","gtartaar-courgette","pflower-courgettebloem","gherboil-munt","fvinegar-goudsbloem"],
    updatedBy:"Kim", updatedAt:"4 dagen geleden" },
  { id:"d16", name:"Pruim, amandel & laurier", course:"Zomerdessert", season:["Zomer","Herfst"], diet:"Vegetarisch",
    description:"Zoete pruim en reine claude met amandel en een vleugje laurier.",
    plating:"Gepocheerde pruim, sorbet van pruim, compote van reine claude, pasta van amandel en anglaise van laurier.",
    recipeIds:["gpoach-pruim","gsorbet-pruim","gcompote-reine-claude","nutpaste-amandel","anglaise-laurier-anglaise"],
    updatedBy:"Isa", updatedAt:"5 dagen geleden" },

  // ---- 50 nieuwe gerechten (met fermentatiecomponenten), toegevoegd na peer review ----
  // ---------- LENTE ----------
  { id:"d17", name:"Asperge, mousseline & radijs uit het vat", course:"Lentevoorgerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Romige asperge met luchtige mousseline en een zuur accent uit het fermentatievat.",
    plating:"Puree van asperge, mousseline, olie van bieslook en radijs uit het vat.",
    recipeIds:["vpuree-asperge","hollandaise-mousseline","gherboil-bieslook","fvat-radijs"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d18", name:"Meiknol in twee fermentaties", course:"Lentetussengerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Meiknol rauw, als waterkimchi en uit het vat — fris, sprankelend en knapperig.",
    plating:"Carpaccio van meiknol, waterkimchi van meiknol met sprankelende pekel, meiknol uit het vat, olie van dille en zout van bieslook.",
    recipeIds:["gcarp-meiknol","dongchimi-meiknol","fvat-meiknol","herboil2-dille","gsalt-bieslook"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d19", name:"Radijs, gekweekte boter & loof", course:"Lentevoorgerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Radijs met eigen gekweekte boter en een zure kruidenpasta van tuinzuring.",
    plating:"Tartaar en hele radijs, gekweekte boter, radijs uit het vat, kruidenpasta van tuinzuring en zout van bieslook.",
    recipeIds:["gtartaar-radijs","cultzuivel-gekweekte-boter","fvat-radijs","fherbpaste-tuinzuring","gsalt-bieslook"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d20", name:"Rabarber, crème fraîche & munt", course:"Lentedessert", season:["Lente"], diet:"Vegetarisch",
    description:"Zacht gepocheerde rabarber met eigen gekweekte crème fraîche en frisse munt.",
    plating:"Gepocheerde rabarber, quenelle crème fraîche, rabarber-granité en suiker van munt.",
    recipeIds:["gpoach-rabarber","cultzuivel-cre-me-frai-che","granita-rabarber-granite","kruidensuiker-munt"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d21", name:"Spitskool, dragonmosterd & zuurkool", course:"Lentetussengerecht", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"Gegrilde spitskool met gefermenteerde dragonmosterd en jonge zuurkool van dezelfde kool.",
    plating:"Gegrilde spitskool, dragonmosterd, zuurkool van spitskool, olie van dragon en olijvencrumble.",
    recipeIds:["grill-spitskool","fmustard-dragonmosterd","kraut-spitskool","gherboil-dragon","c-olive-crumble"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d22", name:"Spinazie & tuinzuring", course:"Lentevoorgerecht", season:["Lente"], diet:"Vegetarisch",
    description:"Groen op groen: spinazie, zure tuinzuring en een luchtige zuringspons.",
    plating:"Puree van spinazie, zuringspons, kruidenpasta van tuinzuring en crème fraîche.",
    recipeIds:["gpuree-spinazie","sponge-zuringspons","fherbpaste-tuinzuring","cultzuivel-cre-me-frai-che"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d23", name:"Gelakte buik, meiknol & lentegroen", course:"Lentehoofdgerecht", season:["Lente"], diet:"Varkensvlees",
    description:"Buik van eigen varkens met sprankelende waterkimchi en spinazie uit de tuin.",
    plating:"Gelakte buik, waterkimchi van meiknol, puree van spinazie, gefermenteerde mosterd en tijm-knoflookjus.",
    recipeIds:["pork-gelakte-buik","dongchimi-meiknol","gpuree-spinazie","fmustard-klassieke-gefermenteerde-mosterd","jus-tijm-knoflookjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d24", name:"Aardbei & gekweekte room", course:"Lentedessert", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"Aardbei uit de tuin met zure room en een frisse scheut aardbei-waterkefir.",
    plating:"Sorbet en coulis van aardbei, crème fraîche, suiker van munt en aan tafel een scheut aardbei-waterkefir.",
    recipeIds:["gsorbet-aardbei","gcoulis-aardbei","cultzuivel-cre-me-frai-che","kruidensuiker-munt","waterkefir-aardbei-waterkefir"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d55", name:"Paksoi, stelen & kimchi", course:"Lentetussengerecht", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"Paksoi in drie gedaanten: gefermenteerde stelen, kimchi en een umami-mayonaise.",
    plating:"Gefermenteerde stelen van paksoi, kimchi van paksoi, sojasaus-mayonaise, olie van bieslook en sesamtuile.",
    recipeIds:["fstem-paksoi","kimchi-paksoi","mayo-sojasaus-mayonaise","gherboil-bieslook","tuile-sesamtuile"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d64", name:"Munt & chocolade", course:"Lentedessert", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"Chocolade met munt uit de tuin, van ganache tot granité.",
    plating:"Muntganache, munt-granité, vanille-roomijs, suiker van munt en een glaasje munt-waterkefir.",
    recipeIds:["ganache-muntganache","granita-munt-granite","icecream-vanille-roomijs","kruidensuiker-munt","waterkefir-munt-waterkefir"], updatedBy:"Kim", updatedAt:"zojuist" },

  // ---------- ZOMER ----------
  { id:"d25", name:"Tomaat, zoutpruim & basilicum", course:"Zomervoorgerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Zomertomaat met de diepe umami van eigen zoutpruimen en gerookte mozzarella.",
    plating:"Tartaar van tomaat, fijngehakte zoutpruim, gerookte mozzarella, olie van basilicum en zout van oregano.",
    recipeIds:["gtartaar-tomaat","zoutpruim-pruim","c-caprese-mozz","herboil2-basilicum","gsalt-oregano"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d26", name:"Komkommer uit het vat & dille", course:"Zomervoorgerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Knapperige vatkomkommer met rauwe courgette, dille en frisse gel.",
    plating:"Komkommer uit het vat, carpaccio van courgette, gel van komkommer, olie van dille en crème fraîche.",
    recipeIds:["fvat-komkommer","gcarp-courgette","ggel-komkommer","herboil2-dille","cultzuivel-cre-me-frai-che"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d27", name:"Erwt, lavas & tuinbloemen", course:"Zomertussengerecht", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"Zoete erwt met de bouillonachtige diepte van gefermenteerde lavas en gepekelde bloemen.",
    plating:"Espuma van erwten, geblisterde peultjes, kruidenpasta van lavas, gepekelde goudsbloem en gel van munt.",
    recipeIds:["gespuma-erwten","beanroast-peultjes","fherbpaste-lavas","pflower-goudsbloem","gherbgel-munt"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d28", name:"Courgettebloem, kosho & citroen", course:"Zomertussengerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Gegrilde courgette met de scherpte van tuinkosho en een gepekelde bloem.",
    plating:"Gegrilde courgette, gepekelde courgettebloem, kosho van citroen, gel van courgette en olie van munt.",
    recipeIds:["grill-courgette","pflower-courgettebloem","fkosho-citroen","ggel-courgette","gherboil-munt"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d29", name:"Bonen van de vuurplaats", course:"Zomertussengerecht", season:["Zomer","Herfst"], diet:"Vegetarisch",
    description:"Geblisterde bonen met aioli, gefermenteerde dragon en zoetzuur.",
    plating:"Geblisterde sperziebonen, gepekelde sperziebonen, aioli, kruidenpasta van dragon en olijvencrumble.",
    recipeIds:["beanroast-sperziebonen","gpickle-sperziebonen","mayo-aioli","fherbpaste-dragon","c-olive-crumble"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d30", name:"Pulled schouder, jonge zuurkool & hotsauce", course:"Zomerhoofdgerecht", season:["Zomer"], diet:"Varkensvlees",
    description:"Zomers barbecuebord van eigen varkens met jonge zuurkool en gefermenteerde tomatenhotsauce.",
    plating:"Pulled schouder, zuurkool van spitskool, hotsauce van tomaat, puree van erwten en gepekelde ui.",
    recipeIds:["pork-pulled-schouder","kraut-spitskool","fhot-tomaat","beanpuree-erwten","gpickle-ui"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d31", name:"Framboos, gember & citroenmelisse", course:"Zomerdessert", season:["Zomer"], diet:"Vegetarisch",
    description:"Framboos in drie temperaturen met de bruis van eigen frambozen-gemberbier.",
    plating:"Sorbet en coulis van framboos, framboos-granité, anglaise van citroenmelisse en aan tafel frambozen-gemberbier.",
    recipeIds:["gsorbet-framboos","gcoulis-framboos","granita-framboos-granite","anglaise-citroenmelisse-anglaise","gingerbeer-frambozen-gemberbier"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d32", name:"Blauwe bes, lavendel & honing", course:"Zomerdessert", season:["Zomer"], diet:"Vegetarisch",
    description:"Zomerbessen met bloemige lavendel uit de pluktuin.",
    plating:"Compote en sorbet van blauwe bes, lavendelganache, gekonfijte lavendel en een glaasje wilde bruis van lavendel.",
    recipeIds:["gcompote-blauwe-bes","gsorbet-blauwe-bes","ganache-lavendelganache","candyflower-lavendel","wildesoda-lavendel"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d33", name:"Aalbes & wilde bruis", course:"Zomerdessert", season:["Zomer"], diet:"Vegetarisch",
    description:"Zure aalbes met een wild gefermenteerde kamillebruis van eigen bloemen.",
    plating:"Sorbet en confituur van aalbes, sesamtuile, suiker van kamille en een glaasje wilde bruis van kamille.",
    recipeIds:["gsorbet-aalbes","gjam-aalbes","tuile-sesamtuile","kruidensuiker-kamille","wildesoda-kamille"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d34", name:"Venkel, kosho & goudsbloem", course:"Zomertussengerecht", season:["Zomer","Herfst"], diet:"Vegetarisch",
    description:"Anijsachtige venkel van de grill met citrusscherpte en bloemenazijn.",
    plating:"Gegrilde venkel, kosho van limoen, azijn van goudsbloem, carpaccio van koolrabi en olie van munt.",
    recipeIds:["grill-venkel","fkosho-limoen","fvinegar-goudsbloem","gcarp-koolrabi","gherboil-munt"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d56", name:"Utrechtse ui & honingmosterd", course:"Zomertussengerecht", season:["Lente","Zomer"], diet:"Vegetarisch",
    description:"De eigen Utrechtse ui, gefermenteerd en geconfijt, met zoete gefermenteerde mosterd.",
    plating:"Geconfijte en gefermenteerde Utrechtse ui, honingmosterd, gel van bieslook en olijvencrumble.",
    recipeIds:["gconfit-utrechtse-ui","lacto-utrechtse-ui","fmustard-honingmosterd","gherbgel-bieslook","c-olive-crumble"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d61", name:"Courgette, bonen & aioli", course:"Zomerhoofdgerecht", season:["Zomer"], diet:"Vegetarisch",
    description:"Vegetarisch zomerhoofdgerecht van de Black Bastard met knoflook in twee fermentaties.",
    plating:"Gegrilde courgette, geblisterde snijbonen, aioli, hotsauce van knoflook en pesto van oregano.",
    recipeIds:["grill-courgette","beanroast-snijbonen","mayo-aioli","fhot-knoflook","gpesto-oregano"], updatedBy:"Michael", updatedAt:"zojuist" },

  // ---------- HERFST ----------
  { id:"d35", name:"Biet, kvass & dille", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Gerookte biet met een lepel van de eigen bietenkvass — aards en licht sprankelend.",
    plating:"Gerookte rode biet, carpaccio van gele biet, lepel bietenkvass, olie van dille en balsamicoparels.",
    recipeIds:["gsmoke-rode-biet","gcarp-gele-biet","kvass-rode-biet","herboil2-dille","c-balsamic-pearls"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d36", name:"Pompoen, honing-knoflook & salie", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Zoete pompoen met zachte tenen honing-knoflook en herfstsalie.",
    plating:"Puree en chip van pompoen, honing-knoflook, boter van salie en zout van salie.",
    recipeIds:["vpuree-pompoen","vchip-pompoen","honingknoflook-klassieke-honing-knoflook","gbutter-salie","gsalt-salie"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d37", name:"Kimchi-bord uit de herfsttuin", course:"Herfsttussengerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Chinese kool op twee manieren gefermenteerd, met koriander uit de tuin.",
    plating:"Kimchi en waterkimchi van chinese kool, gefermenteerde stelen van paksoi, kruidenpasta en olie van koriander.",
    recipeIds:["kimchi-chinese-kool","dongchimi-chinese-kool","fstem-paksoi","fherbpaste-koriander","gherboil-koriander"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d38", name:"Kweepeer, cider & laurier", course:"Herfstdessert", season:["Herfst"], diet:"Vegetarisch",
    description:"Gepocheerde kweepeer met eigen kweeperencider en karamel.",
    plating:"Gepocheerde kweepeer, poeder van kweepeer, karamel, anglaise van laurier en een glaasje cider van kweepeer.",
    recipeIds:["gpoach-kweepeer","gdry-kweepeer","caramel-klassieke-karamel","anglaise-laurier-anglaise","cider-kweepeer"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d39", name:"Druif, landwijn & walnoot", course:"Herfstdessert", season:["Herfst"], diet:"Vegetarisch",
    description:"Druiven van eigen stok, van granité tot landwijn.",
    plating:"Gepocheerde druif, druiven-granité, coulis van druif, crumble van walnoot en een glaasje landwijn van druif.",
    recipeIds:["gpoach-druif","granita-druiven-granite","gcoulis-druif","crumble-walnoot","landwijn-druif"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d40", name:"Procureur, appel & levende azijn", course:"Herfsthoofdgerecht", season:["Herfst","Winter"], diet:"Varkensvlees",
    description:"Langzaam gegaarde procureur met appel en de eigen levende appelazijn.",
    plating:"Gegaarde procureur, compote van appel, levende azijn van appel door de jus, puree van knolselderij en portjus.",
    recipeIds:["pork-gegaarde-procureur","gcompote-appel","fruitazijnlevend-appel","gpuree-knolselderij","jus-portjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d42", name:"Amsoi, kimchi & sesam", course:"Herfsttussengerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Mosterdachtige amsoi, scherp gefermenteerd, met salieboter en sesam.",
    plating:"Kimchi en gefermenteerde amsoi, boter van salie, hotsauce van ui en sesamtuile.",
    recipeIds:["kimchi-amsoi","lacto-amsoi","gbutter-salie","fhot-ui","tuile-sesamtuile"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d43", name:"Wortel, zoutpruim & dragon", course:"Herfsttussengerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Zoete geroosterde wortel met het umami-zuur van zoutpruimen van reine claude.",
    plating:"Geroosterde wortel, espuma en chip van wortel, fijngehakte zoutpruim van reine claude en kruidenpasta van dragon.",
    recipeIds:["roast-wortel","gespuma-wortel","gchip-wortel","zoutpruim-reine-claude","fherbpaste-dragon"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d44", name:"Appelschil & karnemelk", course:"Herfstdessert", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Zero waste: schillenbrouwsel van appel met eigen karnemelk en fruitleer.",
    plating:"Compote van appel, karnemelk-ijsschaafsel, fruitleer van appel, suiker van tijm en een glaasje schillenbrouwsel van appel.",
    recipeIds:["gcompote-appel","cultzuivel-karnemelk","fleather-appel","kruidensuiker-tijm","tepache-appel"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d57", name:"Krokante krosse & zuren", course:"Herfstvoorgerecht", season:["Herfst","Winter"], diet:"Varkensvlees",
    description:"Krokant van eigen varkens met gefermenteerde en gepekelde zuren ertegenover.",
    plating:"Krokante krosse, bietenmosterd, gepekelde ui, hotsauce van ui en mosterdmayonaise.",
    recipeIds:["pork-krokante-krosse","fmustard-bietenmosterd","gpickle-ui","fhot-ui","mayo-mosterdmayonaise"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d62", name:"Herfstbord van het land", course:"Herfsthoofdgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Vegetarisch herfsthoofdgerecht: biet, pompoen en zuurkool met beurre rouge.",
    plating:"Geroosterde rode biet, puree van pompoen, zuurkool van rode kool, crumble van hazelnoot en beurre rouge.",
    recipeIds:["roast-rode-biet","vpuree-pompoen","kraut-rode-kool","crumble-hazelnoot","beurreblanc-beurre-rouge"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d65", name:"Fermentenbord van het land", course:"Herfstvoorgerecht", season:["Herfst"], diet:"Vegetarisch",
    description:"Proeverij van het fermentatievat: vijf huisgemaakte fermenten om te delen.",
    plating:"Gefermenteerde venkel, komkommer uit het vat, kimchi van koolrabi, hotsauce van rode biet en gefermenteerde mosterd.",
    recipeIds:["lacto-venkel","fvat-komkommer","kimchi-koolrabi","fhot-rode-biet","fmustard-klassieke-gefermenteerde-mosterd"], updatedBy:"Stef", updatedAt:"zojuist" },

  // ---------- WINTER ----------
  { id:"d41", name:"Sukade, kardoen & mosterd", course:"Winterhoofdgerecht", season:["Winter"], diet:"Rundvlees",
    description:"Gesmoorde sukade met gefermenteerde kardoenstelen en eigen mosterd.",
    plating:"Gesmoorde sukade, gefermenteerde stelen van kardoen, puree van pastinaak, gefermenteerde mosterd en rodewijnjus.",
    recipeIds:["beef-gesmoorde-sukade","fstem-kardoen","gpuree-pastinaak","fmustard-klassieke-gefermenteerde-mosterd","jus-rodewijnjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d45", name:"Varkenswang, zuurkool & aardappel", course:"Winterhoofdgerecht", season:["Winter"], diet:"Varkensvlees",
    description:"Zachte varkenswang in eigen jus met savooizuurkool en bietenmosterd.",
    plating:"Varkenswang in eigen jus, zuurkool van savooikool, puree van aardappel, bietenmosterd en tijm-knoflookjus.",
    recipeIds:["pork-varkenswang-in-eigen-jus","kraut-savooikool","vpuree-aardappel","fmustard-bietenmosterd","jus-tijm-knoflookjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d46", name:"Groenlof, peer & walnoot", course:"Wintervoorgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Bittere groenlof met zoete peer en de eigen levende perenazijn in de dressing.",
    plating:"Blaadjes groenlof, gepocheerde peer, levende azijn van peer in de honing-mosterdvinaigrette en crumble van walnoot.",
    recipeIds:["gpoach-peer","fruitazijnlevend-peer","vinaigrette-honing-mosterdvinaigrette","crumble-walnoot"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d47", name:"Winterkoolbord", course:"Wintertussengerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Boerenkool in texturen met gefermenteerde biet en geconfijte knoflook.",
    plating:"Puree en chip van boerenkool, gefermenteerde boerenkool, hotsauce van rode biet en geconfijte knoflook.",
    recipeIds:["gpuree-boerenkool","gchip-boerenkool","lacto-boerenkool","fhot-rode-biet","gconfit-knoflook"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d48", name:"Pastinaak, honing-knoflook & tijm", course:"Wintertussengerecht", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Zoete pastinaak met tijm-honing-knoflook en beurre blanc.",
    plating:"Geroosterde pastinaak, puree en chip van pastinaak, honing-knoflook met tijm en beurre blanc.",
    recipeIds:["roast-pastinaak","gpuree-pastinaak","gchip-pastinaak","honingknoflook-honing-knoflook-met-tijm","beurreblanc-klassieke-beurre-blanc"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d49", name:"Veldsla, biet & hazelnoot", course:"Wintervoorgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Winterse salade van veldsla met biet in twee bereidingen en gefermenteerde ui.",
    plating:"Veldsla, carpaccio en geconfijte rode biet, gefermenteerde ui, sjalottenvinaigrette en crumble van hazelnoot.",
    recipeIds:["gcarp-rode-biet","gconfit-rode-biet","lacto-ui","vinaigrette-sjalottenvinaigrette","crumble-hazelnoot"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d50", name:"Knolselderij in het geheel", course:"Winterhoofdgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Vegetarisch winterhoofdgerecht: knolselderij geroosterd, gerookt en als kvass.",
    plating:"Geroosterde en gerookte knolselderij, lepel knolselderijkvass, mosterd-beurre blanc en zout van rozemarijn.",
    recipeIds:["roast-knolselderij","gsmoke-knolselderij","kvass-knolselderij","beurreblanc-mosterd-beurre-blanc","gsalt-rozemarijn"], updatedBy:"Simon", updatedAt:"zojuist" },
  { id:"d51", name:"Short rib & gefermenteerde ui", course:"Winterhoofdgerecht", season:["Herfst","Winter"], diet:"Rundvlees",
    description:"Short rib van het bot met ui in twee fermentaties en aardpeer.",
    plating:"Short rib van het bot, gefermenteerde ui, hotsauce van ui, puree van aardpeer en rodewijnjus.",
    recipeIds:["beef-short-rib-van-het-bot","lacto-ui","fhot-ui","gpuree-aardpeer","jus-rodewijnjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d52", name:"Mispel, karamel & laurier", course:"Winterdessert", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Vergeten fruit: mispel met gezouten karamel en laurier.",
    plating:"Gepocheerde mispel, compote van mispel, gezouten karamel afgeblust met levende appelazijn, anglaise van laurier en boekweittuile.",
    recipeIds:["gpoach-mispel","gcompote-mispel","caramel-gezouten-karamel","fruitazijnlevend-appel","anglaise-laurier-anglaise","tuile-boekweittuile"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d53", name:"Winterappel & cider", course:"Winterdessert", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Appel van de boomgaard met karamelroomijs en eigen cider.",
    plating:"Gepocheerde appel, karamel-roomijs, fruitchip van appel, kaneelbanketbakkersroom en een glaasje cider van appel.",
    recipeIds:["gpoach-appel","icecream-karamel-roomijs","fchip-appel","patissiere-kaneelbanketbakkersroom","cider-appel"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d54", name:"Bloedsinaasappel in de winter", course:"Winterdessert", season:["Winter"], diet:"Vegetarisch",
    description:"Winterzon op het bord: bloedsinaasappel met pistache en een streep kombucha-azijn.",
    plating:"Mousse, sorbet en gel van bloedsinaasappel, crumble van pistache en een streep kombucha-azijn.",
    recipeIds:["mousse-bloedsinaasappel","sorbet-bloedsinaasappel","gel-bloedsinaasappel","crumble-pistache","kombuchaazijn-klassieke-kombucha-azijn"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d58", name:"Kardoen & beurre blanc", course:"Wintertussengerecht", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Vergeten groente kardoen, geroosterd en gefermenteerd, met klassieke botersaus.",
    plating:"Geroosterde kardoen, gefermenteerde stelen van kardoen, beurre blanc, olijvencrumble en zout van tijm.",
    recipeIds:["roast-kardoen","fstem-kardoen","beurreblanc-klassieke-beurre-blanc","c-olive-crumble","gsalt-tijm"], updatedBy:"Stef", updatedAt:"zojuist" },
  { id:"d59", name:"Chioggia, yuzu-kosho & rozemarijn", course:"Wintervoorgerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Gestreepte chioggia met de winterse scherpte van yuzu-kosho.",
    plating:"Carpaccio van chioggia biet, geconfijte rode biet, kosho van yuzu, olie van waterkers en zout van rozemarijn.",
    recipeIds:["gcarp-chioggia-biet","gconfit-rode-biet","fkosho-yuzu","herboil2-waterkers","gsalt-rozemarijn"], updatedBy:"Kim", updatedAt:"zojuist" },
  { id:"d60", name:"Gelakte buik, kimchi & pinda", course:"Winterhoofdgerecht", season:["Winter"], diet:"Varkensvlees",
    description:"Winterse buik van eigen varkens met rodekoolkimchi en pindacrunch.",
    plating:"Gelakte buik, kimchi van rode kool, puree van zoete aardappel, crumble van pinda en peperjus.",
    recipeIds:["pork-gelakte-buik","kimchi-rode-kool","vpuree-zoete-aardappel","crumble-pinda","jus-peperjus"], updatedBy:"Michael", updatedAt:"zojuist" },
  { id:"d63", name:"Peer, ganache & walnoot", course:"Winterdessert", season:["Herfst","Winter"], diet:"Vegetarisch",
    description:"Gepocheerde peer met pure ganache en walnoot uit de herfstvoorraad.",
    plating:"Gepocheerde peer, pure ganache, pasta van walnoot, vanille-roomijs en een glaasje cider van peer.",
    recipeIds:["gpoach-peer","ganache-pure-ganache","nutpaste-walnoot","icecream-vanille-roomijs","cider-peer"], updatedBy:"Isa", updatedAt:"zojuist" },
  { id:"d66", name:"Wortel, kvass & gember", course:"Wintertussengerecht", season:["Winter"], diet:"Vegetarisch",
    description:"Winterwortel met wortelkvass en een warme gemberbiersaus.",
    plating:"Puree en chip van wortel, lepel wortelkvass, ingekookte saus van klassiek gemberbier en kruidenpasta van koriander.",
    recipeIds:["gpuree-wortel","gchip-wortel","kvass-wortel","gingerbeer-klassiek-gemberbier","fherbpaste-koriander"], updatedBy:"Simon", updatedAt:"zojuist" },
];

const PRODUCT_INFO = {
  "rode biet": { kcal:"43 kcal", note:"Aardse knol, rijk aan foliumzuur, kalium, vezels en nitraat (goed voor de bloeddruk) en de antioxidant betanine die de rode kleur geeft.", gebruik:"Rauw geraspt, geroosterd, gepekeld of als kvass; combineert met geitenkaas, appel en noot.", oogst:"hele jaar, hoofdoogst najaar; goed te bewaren" },
  "tomaat": { kcal:"18 kcal", note:"Zomervrucht boordevol vitamine C en lycopeen (een antioxidant die door verhitten juist beter opneembaar wordt).", gebruik:"Rauw, geroosterd, als saus, coulis of gefermenteerde hotsauce.", oogst:"zomer tot vroege herfst" },
  "aardbei": { kcal:"32 kcal", note:"Zoete zomervrucht, zeer rijk aan vitamine C en mangaan, laag in calorieën.", gebruik:"Rauw, als coulis, sorbet, jam of in een waterkefir; houdt van zuur en peper.", oogst:"late lente en zomer" },
  "courgette": { kcal:"17 kcal", note:"Milde zomergroente die voor ~95% uit water bestaat; licht verteerbaar, wat kalium en vitamine C.", gebruik:"Gegrild, rauw als carpaccio, of gefermenteerd; leunt op kruid en zuur.", oogst:"zomer" },
  "venkel": { kcal:"20–40 kcal", note:"Seizoensproduct uit eigen moestuin.", gebruik:"Rauw of gegaard, passend bij het seizoen.", oogst:"afhankelijk van het seizoen" },
  "appel": { kcal:"52 kcal", note:"Zoetzuur pitfruit met pectine (goed voor jam en de spijsvertering) en vitamine C net onder de schil.", gebruik:"Rauw, compote, cider, azijn of schillenbrouwsel; klassiek bij varken en kool.", oogst:"najaar; lang houdbaar" },
  "peer": { kcal:"57 kcal", note:"Zoet, bloemig pitfruit met vezels en wat vitamine C; rijp snel van binnen naar buiten.", gebruik:"Gepocheerd, als cider, azijn of in dessert; bij blauwe kaas, walnoot en chocolade.", oogst:"najaar" },
  "rode kool": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "boerenkool": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "pastinaak": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "wortel": { kcal:"41 kcal", note:"Zoete wortelgroente vol bètacaroteen (vitamine A) dat met een beetje vet beter opneembaar is.", gebruik:"Rauw, geroosterd, als puree of kvass; houdt van komijn, sinaasappel en dragon.", oogst:"hele jaar, hoofdoogst zomer–najaar" },
  "knolselderij": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "rabarber": { kcal:"21 kcal", note:"Zure lentesteel; alleen de stelen eten (het blad bevat oxaalzuur). Vezelrijk en caloriearm.", gebruik:"Compote, sorbet of gepocheerd; vraagt suiker en houdt van aardbei en munt.", oogst:"lente tot vroege zomer" },
  "braam": { kcal:"40–60 kcal", note:"Seizoensfruit uit eigen tuin, rijk aan vitamine C en antioxidanten; caloriearm.", gebruik:"Rauw, als compote, sorbet, jam of azijn; balanceer het zoet met wat zuur.", oogst:"zomer tot najaar" },
  "framboos": { kcal:"40–60 kcal", note:"Seizoensfruit uit eigen tuin, rijk aan vitamine C en antioxidanten; caloriearm.", gebruik:"Rauw, als compote, sorbet, jam of azijn; balanceer het zoet met wat zuur.", oogst:"zomer tot najaar" },
  "pruim": { kcal:"40–60 kcal", note:"Seizoensfruit uit eigen tuin, rijk aan vitamine C en antioxidanten; caloriearm.", gebruik:"Rauw, als compote, sorbet, jam of azijn; balanceer het zoet met wat zuur.", oogst:"zomer tot najaar" },
  "druif": { kcal:"40–60 kcal", note:"Seizoensfruit uit eigen tuin, rijk aan vitamine C en antioxidanten; caloriearm.", gebruik:"Rauw, als compote, sorbet, jam of azijn; balanceer het zoet met wat zuur.", oogst:"zomer tot najaar" },
  "kweepeer": { kcal:"40–60 kcal", note:"Seizoensfruit uit eigen tuin, rijk aan vitamine C en antioxidanten; caloriearm.", gebruik:"Rauw, als compote, sorbet, jam of azijn; balanceer het zoet met wat zuur.", oogst:"zomer tot najaar" },
  "erwten": { kcal:"60–90 kcal", note:"Peulvrucht met plantaardig eiwit en vezels; niet geschikt om rauw te fermenteren.", gebruik:"Kort geblancheerd, geblisterd of gepekeld; bij hartige, nootachtige smaken.", oogst:"zomer" },
  "sperziebonen": { kcal:"60–90 kcal", note:"Peulvrucht met plantaardig eiwit en vezels; niet geschikt om rauw te fermenteren.", gebruik:"Kort geblancheerd, geblisterd of gepekeld; bij hartige, nootachtige smaken.", oogst:"zomer" },
  "radijs": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "komkommer": { kcal:"20–40 kcal", note:"Seizoensproduct uit eigen moestuin.", gebruik:"Rauw of gegaard, passend bij het seizoen.", oogst:"afhankelijk van het seizoen" },
  "ui": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "knoflook": { kcal:"149 kcal", note:"Krachtige smaakmaker met allicine, dat vrijkomt bij snijden en antibacterieel werkt.", gebruik:"Rauw, geconfijt, zwart gefermenteerd of in honing; basis van vrijwel elke hartige bereiding.", oogst:"zomer; goed te bewaren" },
  "munt": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "dille": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "dragon": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "oost-indische kers": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "varkensvlees": { kcal:"242 kcal", note:"Van de eigen varkens; eiwitrijk met B-vitamines. Buik en schouder lenen zich voor langzaam garen.", gebruik:"Gelakt, pulled of gebraden; bij appel, venkel, mosterd en zuurkool.", oogst:"hele jaar" },
  "rundvlees": { kcal:"250 kcal", note:"Eiwit- en ijzerrijk; taaie delen als sukade en short rib worden mals bij lang smoren.", gebruik:"Gesmoord of van het bot; bij rodewijnjus, wortel en gefermenteerde ui.", oogst:"hele jaar" },
  "aalbes": { kcal:"44 kcal", note:"Kleine, frisse rode bes rijk aan vitamine C en antioxidanten; caloriearm en vezelrijk, laag suikergehalte.", gebruik:"Als garnering, in jam, compote, sorbet of sap; van nature hoog in pectine, dus mooi voor gelei.", oogst:"juli" },
  "savooikool": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "spitskool": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "koolrabi": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "snijbiet": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "chioggia biet": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "gele biet": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "palmkool": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "andijvie": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "bindsla": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "rucola": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "japanse wijnbes": { kcal:"40–60 kcal", note:"Seizoensfruit uit eigen tuin, rijk aan vitamine C en antioxidanten; caloriearm.", gebruik:"Rauw, als compote, sorbet, jam of azijn; balanceer het zoet met wat zuur.", oogst:"zomer tot najaar" },
  "utrechtse ui": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "bieslook": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "peterselie": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "rozemarijn": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "tijm": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "laurier": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "lavas": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "citroenmelisse": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "salie": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "uiensoepboom": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "mispel": { kcal:"40–60 kcal", note:"Seizoensfruit uit eigen tuin, rijk aan vitamine C en antioxidanten; caloriearm.", gebruik:"Rauw, als compote, sorbet, jam of azijn; balanceer het zoet met wat zuur.", oogst:"zomer tot najaar" },
  "courgettebloem": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "meiknol": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "amaranth": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "rode eikenbladsla": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "paksoi": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "goudsbloem": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "korenbloem": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "dahlia": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "leeuwenbek": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "kamille": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "lavendel": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "afrikaantjes": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "princessenbonen": { kcal:"60–90 kcal", note:"Peulvrucht met plantaardig eiwit en vezels; niet geschikt om rauw te fermenteren.", gebruik:"Kort geblancheerd, geblisterd of gepekeld; bij hartige, nootachtige smaken.", oogst:"zomer" },
  "snijbonen": { kcal:"60–90 kcal", note:"Peulvrucht met plantaardig eiwit en vezels; niet geschikt om rauw te fermenteren.", gebruik:"Kort geblancheerd, geblisterd of gepekeld; bij hartige, nootachtige smaken.", oogst:"zomer" },
  "pronkbonen": { kcal:"60–90 kcal", note:"Peulvrucht met plantaardig eiwit en vezels; niet geschikt om rauw te fermenteren.", gebruik:"Kort geblancheerd, geblisterd of gepekeld; bij hartige, nootachtige smaken.", oogst:"zomer" },
  "peultjes": { kcal:"60–90 kcal", note:"Peulvrucht met plantaardig eiwit en vezels; niet geschikt om rauw te fermenteren.", gebruik:"Kort geblancheerd, geblisterd of gepekeld; bij hartige, nootachtige smaken.", oogst:"zomer" },
  "kapucijners": { kcal:"60–90 kcal", note:"Peulvrucht met plantaardig eiwit en vezels; niet geschikt om rauw te fermenteren.", gebruik:"Kort geblancheerd, geblisterd of gepekeld; bij hartige, nootachtige smaken.", oogst:"zomer" },
  "ijsbergsla": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "veldsla": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "rode melde": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "oregano": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "reine claude": { kcal:"40–60 kcal", note:"Seizoensfruit uit eigen tuin, rijk aan vitamine C en antioxidanten; caloriearm.", gebruik:"Rauw, als compote, sorbet, jam of azijn; balanceer het zoet met wat zuur.", oogst:"zomer tot najaar" },
  "tuinzuring": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "koriander": { kcal:"—", note:"Tuinkruid dat vooral smaak en aroma brengt; in kleine hoeveelheden gebruikt.", gebruik:"Vers door gerechten, als olie, pesto, gefermenteerde pasta of infuus.", oogst:"lente tot najaar, vaak vers te oogsten" },
  "blauwe bes": { kcal:"40–60 kcal", note:"Seizoensfruit uit eigen tuin, rijk aan vitamine C en antioxidanten; caloriearm.", gebruik:"Rauw, als compote, sorbet, jam of azijn; balanceer het zoet met wat zuur.", oogst:"zomer tot najaar" },
  "aardpeer": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "aardpeer bloem": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
  "spinazie": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "chinese kool": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "amsoi": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "kardoen": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "bleekselderij": { kcal:"30–45 kcal", note:"Knol- of wortelgroente met vezels en kalium; goed te bewaren.", gebruik:"Rauw, geroosterd, als puree, pickle of ferment.", oogst:"zomer tot najaar; lang houdbaar" },
  "groenlof": { kcal:"20–35 kcal", note:"Blad- of koolgroente met vitamine K, C en vezels; kool bevat glucosinolaten.", gebruik:"Rauw, kort gegaard, geroosterd of gefermenteerd (kimchi, zuurkool).", oogst:"afhankelijk van soort, veel in koelere maanden" },
  "madelief": { kcal:"—", note:"Eetbare bloem uit de pluktuin; brengt kleur, aroma en soms peperigheid.", gebruik:"Als garnering, gepekeld, in azijn, siroop of een wilde bruis.", oogst:"zomer bij bloei" },
};

const PAIRINGS = [
  { name:"rode biet", pairs:["geitenkaas","appel","walnoot","dille","sinaasappel","mierikswortel","dragon"], note:"Aards en zoet; houdt van zuur en noot." },
  { name:"tomaat", pairs:["basilicum","mozzarella","olijf","knoflook","ui","oregano","aardbei"], note:"Zomers, zuur en umami." },
  { name:"aardbei", pairs:["rabarber","basilicum","balsamico","zwarte peper","room","munt"], note:"Zoet met tegenwicht van zuur en peper." },
  { name:"courgette", pairs:["munt","citroen","knoflook","feta","tijm","courgettebloem"], note:"Mild; leunt op kruid en zuur." },
  { name:"venkel", pairs:["sinaasappel","appel","dille","citroen","varkensvlees"], note:"Anijs; fris citrus en zoet." },
  { name:"appel", pairs:["kaneel","kweepeer","karamel","walnoot","salie","varkensvlees","rode kool"], note:"Zoetzuur; klassiek bij varken en kool." },
  { name:"peer", pairs:["blauwe kaas","walnoot","chocolade","tijm","rode wijn"], note:"Zoet en bloemig." },
  { name:"rode kool", pairs:["appel","kaneel","ui","kruidnagel","varkensvlees"], note:"Zoetzuur winters." },
  { name:"boerenkool", pairs:["knoflook","citroen","chili","aardappel","varkensvlees"], note:"Stevig en aards." },
  { name:"pastinaak", pairs:["honing","tijm","appel","hazelnoot","nootmuskaat"], note:"Zoet en nootachtig." },
  { name:"wortel", pairs:["komijn","sinaasappel","gember","koriander","honing"], note:"Zoet; warme specerijen." },
  { name:"knolselderij", pairs:["appel","mosterd","truffel","hazelnoot","tijm"], note:"Nootachtig en romig." },
  { name:"rabarber", pairs:["aardbei","gember","vanille","sinaasappel","room"], note:"Scherp zuur; zoet nodig." },
  { name:"braam", pairs:["appel","vanille","tijm","chocolade","laurier"], note:"Donker en zoetzuur." },
  { name:"framboos", pairs:["chocolade","rozemarijn","lychee","room","amandel"], note:"Fris zuur; goed bij chocolade." },
  { name:"pruim", pairs:["amandel","kaneel","laurier","rode wijn","salie"], note:"Zoet en warm." },
  { name:"druif", pairs:["walnoot","blauwe kaas","rozemarijn","varkensvlees"], note:"Zoet; goed bij kaas." },
  { name:"kweepeer", pairs:["appel","peer","vanille","laurier","varkensvlees"], note:"Parfumig; wil pocheren." },
  { name:"erwten", pairs:["munt","citroen","ricotta","dragon"], note:"Zoet en fris." },
  { name:"sperziebonen", pairs:["knoflook","tomaat","bonenkruid","amandel"], note:"Knapperig en groen." },
  { name:"radijs", pairs:["boter","zout","citroen","dille"], note:"Peperig; boter en zuur." },
  { name:"komkommer", pairs:["dille","munt","yoghurt","citroen"], note:"Fris en waterig." },
  { name:"ui", pairs:["tijm","laurier","azijn","kaas"], note:"Zoet bij karamelliseren." },
  { name:"knoflook", pairs:["tijm","olijfolie","peterselie","citroen"], note:"Basis; zacht confijten." },
  { name:"munt", pairs:["erwten","aardbei","komkommer","chocolade","lam"], note:"Fris; zoet en groen." },
  { name:"dille", pairs:["rode biet","komkommer","mosterd","citroen"], note:"Anijsachtig; bij biet en zuur." },
  { name:"dragon", pairs:["ei","citroen","venkel","mosterd"], note:"Anijs; klassiek in emulsies." },
  { name:"oost-indische kers", pairs:["zachte kaas","komkommer","ei","radijs"], note:"Peperig blad en bloem." },
  { name:"varkensvlees", pairs:["appel","venkel","salie","mosterd","kweepeer","rode kool"], note:"Vet vraagt zuur en zoet." },
  { name:"rundvlees", pairs:["ui","tijm","rode wijn","mierikswortel","wortel"], note:"Krachtig; umami en pit." },
  { name:"aalbes", pairs:["wild","room","vanille","munt","witte chocolade"], note:"Fris-zuur; mooi bij wild en room." },
  { name:"savooikool", pairs:["spek","ui","nootmuskaat","aardappel","kastanje"], note:"Zacht en aards; wintergroente." },
  { name:"spitskool", pairs:["karwij","boter","spek","mosterd","appel"], note:"Fijn en zoet; snel gaar." },
  { name:"koolrabi", pairs:["appel","mosterd","dille","ham","mierikswortel"], note:"Fris en knapperig, rauw of gestoomd." },
  { name:"snijbiet", pairs:["knoflook","rozijn","pijnboompit","citroen","ricotta"], note:"Aards blad, stevige steel." },
  { name:"chioggia biet", pairs:["geitenkaas","sinaasappel","walnoot","dille","honing"], note:"Mild en zoet; mooi rauw voor de ringen." },
  { name:"gele biet", pairs:["venkel","sinaasappel","tijm","geitenkaas","walnoot"], note:"Zachter en zoeter dan rode biet." },
  { name:"palmkool", pairs:["knoflook","ansjovis","chili","pecorino","witte bonen"], note:"Diep en aards; houdt van pit." },
  { name:"andijvie", pairs:["spek","ui","mosterd","aardappel","ei"], note:"Bitter blad; vraagt vet en zoet." },
  { name:"bindsla", pairs:["radijs","ei","bieslook","mosterd"], note:"Zachte kropsla; luchtige dressing." },
  { name:"rucola", pairs:["parmezaan","citroen","pijnboompit","tomaat","balsamico"], note:"Peperig; zuur en zout in balans." },
  { name:"japanse wijnbes", pairs:["room","vanille","honing","citroen"], note:"Zoetzurige bes; simpel houden." },
  { name:"utrechtse ui", pairs:["ei","boter","kruiden","aardappel"], note:"Milde bosui; rauw als afwerking." },
  { name:"bieslook", pairs:["ei","aardappel","zure room","vis","kaas"], note:"Zachte ui; rauw op het laatst." },
  { name:"peterselie", pairs:["knoflook","citroen","boter","vis","ui"], note:"Fris groen; gremolata." },
  { name:"rozemarijn", pairs:["lam","aardappel","knoflook","citroen","honing"], note:"Krachtig hars; met mate." },
  { name:"tijm", pairs:["ui","paddenstoel","citroen","wortel","gevogelte"], note:"Aards en warm; verdraagt lang garen." },
  { name:"laurier", pairs:["tomaat","peulvrucht","room","wild","melk"], note:"Achtergrondkruid; trekt in vocht." },
  { name:"lavas", pairs:["aardappel","ei","bouillon","tomaat","selderij"], note:"Maggi-achtig; krachtig, dus doseren." },
  { name:"citroenmelisse", pairs:["aardbei","perzik","room","honing","thee"], note:"Citrusblad; fris in zoet." },
  { name:"salie", pairs:["varkensvlees","boter","pompoen","appel","witte bonen"], note:"Warm en wat bitter; met bruine boter." },
  { name:"uiensoepboom", pairs:["aardappel","ei","boter","kaas"], note:"Blad met uiensmaak; als bieslook gebruiken." },
  { name:"mispel", pairs:["appel","peer","kaneel","room","walnoot"], note:"Rijp (bletted); zoet en moutig." },
  { name:"courgettebloem", pairs:["ricotta","citroen","munt","parmezaan"], note:"Delicaat; vullen en frituren." },
  { name:"meiknol", pairs:["boter","dragon","citroen","ei"], note:"Jonge meiraap; fijn en zoet." },
  { name:"amaranth", pairs:["knoflook","citroen","tomaat","sesam"], note:"Blad als spinazie; zaad als graan." },
  { name:"rode eikenbladsla", pairs:["walnoot","peer","blauwe kaas","sjalot"], note:"Zachte bittere sla; noot en fruit." },
  { name:"paksoi", pairs:["knoflook","gember","sojasaus","sesam","chili"], note:"Knapperige steel; kort roerbakken." },
  { name:"goudsbloem", pairs:["rijst","wortel","ei","boter"], note:"Arme-mans-saffraan; kleur en mild." },
  { name:"korenbloem", pairs:["komkommer","kaas","citroen"], note:"Vooral kleur; mild zoetig." },
  { name:"dahlia", pairs:["hazelnoot","boter","appel"], note:"Knol nootachtig als aardappel; bloem decoratief." },
  { name:"leeuwenbek", pairs:["salade","kruiden","citroen"], note:"Eetbare bloem; licht bitter, als garnituur." },
  { name:"kamille", pairs:["appel","honing","room","peer","vanille"], note:"Bloemig-appelig; in zoet en thee." },
  { name:"lavendel", pairs:["honing","citroen","bosvruchten","chocolade"], note:"Sterk parfum; heel spaarzaam." },
  { name:"afrikaantjes", pairs:["citrus","wortel","tomaat"], note:"Citrus-anijs blad; als kruid en kleur." },
  { name:"princessenbonen", pairs:["knoflook","boter","bonenkruid","amandel","sjalot"], note:"Fijne boon; kort garen." },
  { name:"snijbonen", pairs:["spek","ui","tomaat","bonenkruid"], note:"Stevig; goed in stoof." },
  { name:"pronkbonen", pairs:["tomaat","knoflook","spek","salie"], note:"Grote boon; hartige begeleiders." },
  { name:"peultjes", pairs:["munt","boter","citroen","sesam"], note:"Zoet en knapperig; kort." },
  { name:"kapucijners", pairs:["spek","ui","augurk","mosterd"], note:"Stevige peul; klassiek Hollands." },
  { name:"ijsbergsla", pairs:["tomaat","ui","yoghurt","citroen"], note:"Knapperig en neutraal; frisse dressing." },
  { name:"veldsla", pairs:["walnoot","spek","ei","sjalot","biet"], note:"Zacht en nootachtig; wintersalade." },
  { name:"rode melde", pairs:["knoflook","citroen","ei"], note:"Als spinazie; kleurt mooi." },
  { name:"oregano", pairs:["tomaat","olijfolie","knoflook","courgette","kaas"], note:"Zuiders; gedroogd sterker." },
  { name:"reine claude", pairs:["amandel","vanille","honing","laurier"], note:"Zoete groene pruim; simpel houden." },
  { name:"tuinzuring", pairs:["ei","vis","room","aardappel"], note:"Citroenzuur blad; snijdt door vet." },
  { name:"koriander", pairs:["limoen","chili","knoflook","komijn","kokos"], note:"Fris; blad laat toevoegen." },
  { name:"blauwe bes", pairs:["citroen","vanille","room","kaneel","munt"], note:"Zoet; wil zuur en vanille." },
  { name:"aardpeer", pairs:["hazelnoot","tijm","citroen","ui","spek"], note:"Nootachtig zoet; puree of chip." },
  { name:"aardpeer bloem", pairs:["garnituur","honing"], note:"Zonnebloemachtige bloem; decoratief." },
  { name:"spinazie", pairs:["knoflook","nootmuskaat","room","ei","citroen"], note:"Mild blad; room en muskaat." },
  { name:"chinese kool", pairs:["gember","knoflook","sojasaus","chili"], note:"Zacht; rauw of fermenteren (kimchi)." },
  { name:"amsoi", pairs:["knoflook","sojasaus","gember","sesam"], note:"Mosterdachtig blad; roerbak." },
  { name:"kardoen", pairs:["parmezaan","boter","ansjovis","citroen"], note:"Artisjokachtig; blancheren tegen bitter." },
  { name:"bleekselderij", pairs:["appel","walnoot","blauwe kaas","ui"], note:"Fris en zoutig; rauw of fond." },
  { name:"groenlof", pairs:["sinaasappel","blauwe kaas","walnoot","honing"], note:"Bitter; zoet en zout eroverheen." },
  { name:"madelief", pairs:["salade","kruiden"], note:"Madeliefje; milde eetbare bloem als garnituur." },
];

const seedBatches = [
  { id:"b1", product:"Zuurkool van rode kool", type:"Zuurkool", method:"Melkzuur", startDate:"2026-07-08", days:21, saltPct:2.5, tempC:20, amount:"3 kg", pH:3.6, notes:"Mooie zuurgraad, bijna klaar.", done:false, by:"Simon" },
  { id:"b2", product:"Kimchi van chinese kool", type:"Kimchi", method:"Melkzuur", startDate:"2026-07-16", days:5, saltPct:2.5, tempC:21, amount:"2 kg", pH:4.2, notes:"Dag 5, begint te bruisen.", done:false, by:"Stef" },
  { id:"b3", product:"Gefermenteerde knoflook-hotsauce", type:"Hotsauce", method:"Melkzuur", startDate:"2026-06-20", days:14, saltPct:2.5, tempC:22, amount:"1,5 kg", pH:3.4, notes:"Afgerond en gebotteld.", done:true, by:"Michael" },
];

// ---------- helpers ----------
function scaleAmount(str, f) {
  if (f === 1 || !str) return str;
  const frac = { "½":0.5,"¼":0.25,"¾":0.75,"⅓":1/3,"⅔":2/3,"⅛":0.125 };
  const m = str.match(/\d+(?:[.,]\d+)?/);
  if (m) {
    const val = parseFloat(m[0].replace(",", ".")) * f;
    let out = Math.round(val * 100) / 100;
    return str.slice(0, m.index) + String(out).replace(".", ",") + str.slice(m.index + m[0].length);
  }
  const fc = Object.keys(frac).find((k) => str.includes(k));
  if (fc) {
    let out = Math.round(frac[fc] * f * 100) / 100;
    return str.replace(fc, String(out).replace(".", ","));
  }
  return str;
}
function roleLabel(role) {
  return { chef: "Chef", souschef: "Souschef", kok: "Zelfstandig kok",
           leerling: "Leerling kok", hulpkok: "Hulpkok", guest: "Gast" }[role] || role;
}
function daysBetween(iso) {
  const d = new Date(iso); if (isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}


// ---------- huisstijl (Landgoed de Beug) ----------
const T = { paper:"#f2f0e8", green:"#3a4b30", ink:"#2b3823", line:"#e3e0d4" };
const serif = { fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif" };
const inputCls = "input px-3 py-2.5 placeholder:text-neutral-400";
const seasonStyle = {
  Lente:{ background:"#e4ecdc", color:"#3f5a34" },
  Zomer:{ background:"#f1ead2", color:"#7a6420" },
  Herfst:{ background:"#efe0d3", color:"#8a5a34" },
  Winter:{ background:"#dfe6e6", color:"#3f5560" },
};

function BrandCSS() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap');
html{font-size:17px}
.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
.no-scrollbar::-webkit-scrollbar{display:none}
.serif{font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif}
.ink{color:#2b3823}.mute{color:#6f7263}.acc{color:#3a4b30}
.ff:focus{outline:none}
.ff:focus-visible{outline:none;box-shadow:0 0 0 2px #3a4b30}
.card{background:#fff;border:1px solid #e3e0d4;border-radius:14px}
.cardh{transition:border-color .15s}.cardh:hover{border-color:#8fa07d}
.btnp{background:#3a4b30;color:#f4f2ea;transition:background .15s}.btnp:hover{background:#2b3823}
.btno{border:1px solid #d8d5c8;color:#3a4b30;background:#fff;transition:border-color .15s,color .15s}.btno:hover{border-color:#3a4b30}
.pill{background:#e8ebe0;color:#565a4b;transition:color .15s}.pill:hover{color:#2b3823}
.pillon{background:#3a4b30;color:#f4f2ea}
.chip{background:#eceadf;color:#5b5e4f}
.tintbox{background:#eef1e7;border:1px solid #e0e5d6}
.input{width:100%;border:1px solid #d8d5c8;background:#fff;border-radius:10px;font-size:15px;color:#33352c}
.input:focus{outline:none;box-shadow:0 0 0 2px #3a4b30;border-color:#3a4b30}
.divi{border-top:1px solid #ece9dd}
::selection{background:#dfe4d3}
`}</style>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("gerechten");
  const [recipes, setRecipes] = useState(initialRecipes);
  const [dishes, setDishes] = useState(seedDishes);
  const [batches, setBatches] = useState(seedBatches);
  const [stack, setStack] = useState([{ screen: "list" }]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [pairings, setPairings] = useState(PAIRINGS);
  const [openCounts, setOpenCounts] = useState({});
  const [dismissedNotices, setDismissedNotices] = useState({});
  const [dishDraft, setDishDraft] = useState(null);
  const [cleaningTasks, setCleaningTasks] = useState(CLEANING_SEED);
  const [cleaningLogs, setCleaningLogs] = useState([]);
  const [techNotes, setTechNotes] = useState(TECH_NOTES_SEED);
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkDone, setCheckDone] = useState(null);
  const [newPairing, setNewPairing] = useState(0);
  const [haccpLogs, setHaccpLogs] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBip = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    try { if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) setInstalled(true); } catch (e) {}
    try { if (window.navigator && window.navigator.standalone) setInstalled(true); } catch (e) {}
    return () => { window.removeEventListener("beforeinstallprompt", onBip); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  const doInstall = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); try { await deferredPrompt.userChoice; } catch (e) {} setDeferredPrompt(null); };

  // ---------- Supabase: sessie volgen ----------
  const live = !!supabase; // zonder sleutels draait de app als demo
  useEffect(() => {
    if (!live) return;
    let alive = true;
    const applySession = async (session) => {
      if (!alive) return;
      if (!session) { setUser(null); return; }
      const { data } = await supabase.from("profiles").select("name, role").eq("id", session.user.id).single();
      if (!alive) return;
      const role = data?.role || "guest";
      setUser({ name: data?.name || "Gast", role: roleLabel(role), canEdit: role !== "guest" });
    };
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => applySession(session));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [live]);

  // ---------- Supabase: gedeelde laag laden + live meekijken ----------
  const loadShared = async () => {
    if (!live) return;
    const [ov, cu, en, pk, di, ba, hi, fp, dh, ct, cl, tn, hc] = await Promise.all([
      supabase.from("recipe_overrides").select("*"),
      supabase.from("recipes_custom").select("*"),
      supabase.from("recipe_endorsements").select("*"),
      supabase.from("recipe_opens").select("*"),
      supabase.from("dishes").select("*"),
      supabase.from("ferment_batches").select("*").order("created_at", { ascending: false }),
      supabase.from("recipe_hidden").select("recipe_id"),
      supabase.from("flavor_pairings").select("*"),
      supabase.from("dish_hidden").select("dish_id"),
      supabase.from("cleaning_tasks").select("*"),
      supabase.from("cleaning_logs").select("*").order("done_date", { ascending: false }),
      supabase.from("technique_notes").select("*"),
      supabase.from("haccp_logs").select("*").order("check_date", { ascending: false }),
    ]);
    let recs = [...initialRecipes];
    const ovMap = new Map((ov.data || []).map((r) => [r.id, r.data]));
    recs = recs.map((r) => (ovMap.has(r.id) ? { ...r, ...ovMap.get(r.id) } : r));
    recs = [...(cu.data || []).map((r) => r.data), ...recs];
    const byRec = {};
    (en.data || []).forEach((e) => { (byRec[e.recipe_id] = byRec[e.recipe_id] || []).push(e.user_name); });
    recs = recs.map((r) => ({ ...r, endorsements: byRec[r.id] || [] }));
    const oc = {};
    (pk.data || []).forEach((p) => { oc[p.recipe_id] = p.count || 0; });
    setOpenCounts(oc);
    const hidden = new Set((hi.data || []).map((h) => h.recipe_id));
    recs = recs.filter((r) => !hidden.has(r.id));
    setRecipes(recs);
    const fpRows = fp.data || [];
    const fpMap = new Map(fpRows.map((x) => [x.name, x]));
    setPairings([
      ...PAIRINGS.map((p) => fpMap.has(p.name) ? { name: p.name, pairs: fpMap.get(p.name).pairs || [], note: fpMap.get(p.name).note || "", season: fpMap.get(p.name).season || [], addedAt: fpMap.get(p.name).added_at || 0 } : p),
      ...fpRows.filter((x) => !PAIRINGS.some((p) => p.name === x.name)).map((x) => ({ name: x.name, pairs: x.pairs || [], note: x.note || "", season: x.season || [], addedAt: x.added_at || Date.now() })),
    ]);
    // Schoonmaak: databasetaken overschrijven of vullen de standaardlijst aan.
    const ctRows = ct.data || [];
    const ctMap = new Map(ctRows.map((r) => [r.id, r]));
    const merged = [
      ...CLEANING_SEED.map((t) => { const r = ctMap.get(t.id); return r ? { id: r.id, name: r.name, area: r.area, intervalDays: r.interval_days, minutes: r.minutes, active: r.active !== false } : { ...t, active: true }; }),
      ...ctRows.filter((r) => !CLEANING_SEED.some((t) => t.id === r.id)).map((r) => ({ id: r.id, name: r.name, area: r.area, intervalDays: r.interval_days, minutes: r.minutes, active: r.active !== false })),
    ];
    setCleaningTasks(merged.filter((t) => t.active !== false));
    setCleaningLogs((cl.data || []).map((r) => ({ id: r.id, taskId: r.task_id, doneDate: r.done_date, doneBy: r.done_by, note: r.note || "", edits: Array.isArray(r.edits) ? r.edits : [] })));
    setHaccpLogs((hc.data || []).map((r) => ({ id: r.id, checkDate: r.check_date, doneBy: r.done_by, values: r.values || {}, calibration: r.calibration || {}, note: r.note || "", edits: Array.isArray(r.edits) ? r.edits : [] })));
    const tnMap = { ...TECH_NOTES_SEED };
    (tn.data || []).forEach((r) => { if (Array.isArray(r.lines) && r.lines.length) tnMap[r.key] = r.lines; });
    setTechNotes(tnMap);
    const dbDishes = (di.data || []).map((d) => ({
      id: d.id, name: d.name, course: d.course, description: d.description, plating: d.plating,
      recipeIds: d.recipe_ids || [], season: d.season || [], diet: d.diet || "Vegetarisch",
      updatedBy: d.updated_by || "—", updatedAt: "opgeslagen",
    }));
    // Samenvoegen: nieuwe gerechten uit de database bovenaan, de startgerechten
    // blijven staan (met eventuele bewerkingen uit de database eroverheen).
    const hiddenDishes = new Set((dh.data || []).map((x) => x.dish_id));
    setDishes([
      ...dbDishes.filter((d) => !seedDishes.some((sd) => sd.id === d.id)),
      ...seedDishes.map((sd) => dbDishes.find((d) => d.id === sd.id) || sd),
    ].filter((d) => !hiddenDishes.has(d.id)));
    setBatches((ba.data || []).map((b) => ({
      id: b.id, product: b.product, type: b.type, startDate: b.start_date, days: b.days,
      saltPct: Number(b.salt_pct), tempC: Number(b.temp_c), amount: b.amount,
      pH: b.ph === null ? null : Number(b.ph), notes: b.notes || "", done: !!b.done, by: b.by || "—",
      finishedDate: b.finished_date || null, log: Array.isArray(b.log) ? b.log : [], actionsDone: Array.isArray(b.actions_done) ? b.actions_done : [],
      recipeId: b.recipe_id || null, method: b.method || b.type || null,
    })));
  };
  useEffect(() => {
    if (!live || !user) return;
    loadShared();
    const ch = supabase.channel("gedeeld")
      .on("postgres_changes", { event: "*", schema: "public" }, () => loadShared())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [live, !!user]);

  const current = stack[stack.length - 1];
  const push = (s) => { setStack((st) => [...st, s]); try { window.history.pushState({ app: "ritme" }, ""); } catch (e) {} };
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const resetTo = (s) => setStack([s]);
  const goBack = () => { if (stack.length > 1) { try { window.history.back(); } catch (e) { back(); } } };
  const goHome = () => { resetTo({ screen: "list" }); setSection("gerechten"); };
  useEffect(() => {
    const onPop = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const recipeById = (id) => recipes.find((r) => r.id === id);
  const dishById = (id) => dishes.find((d) => d.id === id);
  const usageCount = (id) => dishes.filter((d) => d.recipeIds.includes(id)).length;
  const variationsOf = (id) => recipes.filter((r) => r.baseId === id);
  const flash = (msg, undo) => {
    const t = { msg, undo, at: Date.now() };
    setToast(t);
    setTimeout(() => setToast((cur) => (cur && cur.at === t.at ? null : cur)), undo ? 7000 : 2200);
  };
  const canEdit = !!user && user.canEdit;

  const dbFail = (error) => { if (error) flash("Opslaan lukte niet — probeer opnieuw"); return !!error; };

  // Melding bij inloggen (alleen koks): batches die klaar zijn of een handeling vragen.
  const [noticeShown, setNoticeShown] = useState(false);
  useEffect(() => {
    if (!user || !user.canEdit || noticeShown || batches.length === 0) return;
    const { ready, due } = collectNotices(batches);
    const n = ready.length + due.length;
    if (n === 0) return;
    setNoticeShown(true);
    flash(n === 1 ? "1 batch vraagt aandacht" : n + " batches vragen aandacht");
  }, [user, batches, noticeShown]);

  const saveRecipe = async (data, editingId) => {
    const stamped = { ...data, updatedBy: user.name, updatedAt: "zojuist" };
    if (editingId) {
      const existing = recipes.find((r) => r.id === editingId);
      const merged = { ...existing, ...stamped };
      if (live) {
        const table = existing && existing.custom ? "recipes_custom" : "recipe_overrides";
        const { error } = await supabase.from(table).upsert({ id: editingId, data: merged, updated_by: user.name, updated_at: new Date().toISOString() });
        if (dbFail(error)) return;
      }
      setRecipes((rs) => rs.map((r) => (r.id === editingId ? merged : r)));
    } else {
      const rec = { ...stamped, id: "r" + Date.now(), endorsements: [], chefsPick: false, baseId: null, isBase: false,
        season: stamped.season && stamped.season.length ? stamped.season : ["Hele jaar"], garden: false,
        diet: stamped.diet || "Vegetarisch", ferment: !!stamped.ferment,
        fermentMethod: stamped.ferment ? (stamped.fermentMethod || "Melkzuur") : null,
        fermentDefaults: stamped.ferment ? (stamped.fermentDefaults || null) : null, custom: true };
      if (live) {
        const { error } = await supabase.from("recipes_custom").upsert({ id: rec.id, data: rec, updated_by: user.name, updated_at: new Date().toISOString() });
        if (dbFail(error)) return;
      }
      setRecipes((rs) => [rec, ...rs]);
      flash(live ? "Opgeslagen — zichtbaar voor het hele team" : "Opgeslagen (demo: alleen op dit apparaat)");
      return rec.id;
    }
    flash(live ? "Opgeslagen — zichtbaar voor het hele team" : "Opgeslagen (demo: alleen op dit apparaat)");
  };
  const saveDish = async (data, editingId) => {
    const stamped = { ...data, updatedBy: user.name, updatedAt: "zojuist" };
    const id = editingId || "d" + Date.now();
    if (live) {
      const { error } = await supabase.from("dishes").upsert({
        id, name: stamped.name, course: stamped.course, description: stamped.description,
        plating: stamped.plating, recipe_ids: stamped.recipeIds, season: stamped.season,
        diet: stamped.diet, updated_by: user.name, updated_at: new Date().toISOString(),
      });
      if (dbFail(error)) return;
    }
    if (editingId) setDishes((ds) => ds.map((d) => (d.id === editingId ? { ...d, ...stamped } : d)));
    else setDishes((ds) => [{ ...stamped, id }, ...ds]);
    flash(live ? "Opgeslagen — zichtbaar voor het hele team" : "Opgeslagen (demo: alleen op dit apparaat)");
  };
  const persistBatch = async (b) => {
    if (!live) return true;
    const { error } = await supabase.from("ferment_batches").upsert({
      id: b.id, product: b.product, type: b.type, start_date: b.startDate, days: b.days,
      salt_pct: b.saltPct, temp_c: b.tempC, amount: b.amount, ph: b.pH, notes: b.notes,
      done: b.done, by: b.by, finished_date: b.finishedDate, log: b.log || [], actions_done: b.actionsDone || [],
      recipe_id: b.recipeId || null, method: b.method || b.type || null,
    });
    return !dbFail(error);
  };
  const saveBatch = async (data, editingId) => {
    if (editingId) {
      const existing = batches.find((x) => x.id === editingId);
      const b = { ...existing, ...data };
      if (!(await persistBatch(b))) return;
      setBatches((bs) => bs.map((x) => (x.id === editingId ? b : x)));
      flash("Batch bijgewerkt");
      return;
    }
    const b = { ...data, id: "b" + Date.now(), by: user.name, finishedDate: null, log: data.log || [] };
    if (!(await persistBatch(b))) return;
    setBatches((bs) => [b, ...bs]);
    flash("Batch geregistreerd");
  };
  const addBatchMeasurement = async (id, m) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const entry = { date: m.date, ph: m.ph === "" ? null : Number(m.ph), brix: m.brix === "" ? null : Number(m.brix), tempC: m.tempC === "" ? null : Number(m.tempC), note: m.note || "", by: user.name };
    const nb = { ...b, log: [...(b.log || []), entry], pH: entry.ph ?? b.pH };
    if (!(await persistBatch(nb))) return;
    setBatches((bs) => bs.map((x) => (x.id === id ? nb : x)));
    flash("Meting toegevoegd aan het logboek");
  };
  const deleteBatchMeasurement = async (id, idx) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const nb = { ...b, log: (b.log || []).filter((_, i) => i !== idx) };
    if (!(await persistBatch(nb))) return;
    setBatches((bs) => bs.map((x) => (x.id === id ? nb : x)));
  };
  const toggleBatchDone = async (id) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const nb = { ...b, done: !b.done, finishedDate: !b.done ? new Date().toISOString().slice(0, 10) : null };
    if (!(await persistBatch(nb))) return;
    setBatches((bs) => bs.map((x) => (x.id === id ? nb : x)));
  };
  const deleteBatch = async (id) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const ok = window.confirm('Batch "' + b.product + '" definitief verwijderen voor het hele team?');
    if (!ok) return;
    if (live) {
      const { error } = await supabase.from("ferment_batches").delete().eq("id", id);
      if (dbFail(error)) return;
    }
    setBatches((bs) => bs.filter((x) => x.id !== id));
    flash(live ? "Batch verwijderd voor het hele team" : "Batch verwijderd (demo: alleen dit apparaat)");
  };
  const ackAction = async (id, label) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const today = localDate();
    if ((b.actionsDone || []).some((a) => a.date === today && a.label === label)) return;
    const nb = { ...b, actionsDone: [...(b.actionsDone || []).filter((a) => a.date >= today), { date: today, label, by: user.name }] };
    if (!(await persistBatch(nb))) return;
    setBatches((bs) => bs.map((x) => (x.id === id ? nb : x)));
    flash(label === READY_KEY ? "Melding afgevinkt" : "Handeling afgevinkt");
  };
  const removeCleaningLog = async (id, quiet) => {
    if (live) {
      const { error } = await supabase.from("cleaning_logs").delete().eq("id", id);
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => ls.filter((x) => x.id !== id));
    if (!quiet) flash("Aftekening verwijderd");
  };
  const deleteCleaningLog = async (id) => {
    const l = cleaningLogs.find((x) => x.id === id);
    if (!l) return;
    const t = cleaningTasks.find((x) => x.id === l.taskId);
    if (!window.confirm("Aftekening van " + (t ? t.name : "deze taak") + " op " + l.doneDate + " verwijderen?")) return;
    removeCleaningLog(id);
  };
  const signCleaning = async (taskId, quiet) => {
    const today = localDate();
    const row = { id: "cl" + Date.now(), taskId, doneDate: today, doneBy: user.name, note: "", edits: [] };
    if (live) {
      const { error } = await supabase.from("cleaning_logs").insert({ id: row.id, task_id: taskId, done_date: today, done_by: user.name, note: "", edits: [] });
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => [row, ...ls]);
    if (!quiet) flash("Afgetekend door " + user.name, () => removeCleaningLog(row.id, true));
    return row.id;
  };
  const markDayDone = async () => {
    const today = localDate();
    if (cleaningLogs.some((l) => l.taskId === DAY_DONE_ID && l.doneDate === today)) return;
    const row = { id: "dd" + Date.now(), taskId: DAY_DONE_ID, doneDate: today, doneBy: user.name, note: "", edits: [] };
    if (live) {
      const { error } = await supabase.from("cleaning_logs").insert({ id: row.id, task_id: DAY_DONE_ID, done_date: today, done_by: user.name, note: "", edits: [] });
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => [row, ...ls]);
    setCheckOpen(false);
    setCheckDone(today); // popup vandaag niet meer openen
    flash("Dag afgerond", () => removeCleaningLog(row.id, true));
  };
  const undoDayDone = async () => {
    const today = localDate();
    const l = cleaningLogs.find((x) => x.taskId === DAY_DONE_ID && x.doneDate === today);
    if (!l) return;
    await removeCleaningLog(l.id, true);
    flash("Dag heropend");
  };
  const saveHaccp = async (data, editingId) => {
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    if (editingId) {
      const old = haccpLogs.find((x) => x.id === editingId);
      const nl = { ...old, ...data, edits: [...((old && old.edits) || []), { at: now, by: user.name }] };
      if (live) {
        const { error } = await supabase.from("haccp_logs").update({ check_date: nl.checkDate, values: nl.values, calibration: nl.calibration, note: nl.note, edits: nl.edits }).eq("id", editingId);
        if (dbFail(error)) return;
      }
      setHaccpLogs((ls) => ls.map((x) => (x.id === editingId ? nl : x)));
      flash("Meting bijgewerkt");
      return;
    }
    const row = { id: "hp" + Date.now(), checkDate: data.checkDate, doneBy: user.name, values: data.values, calibration: data.calibration, note: data.note, edits: [] };
    if (live) {
      const { error } = await supabase.from("haccp_logs").insert({ id: row.id, check_date: row.checkDate, done_by: user.name, values: row.values, calibration: row.calibration, note: row.note, edits: [] });
      if (dbFail(error)) return;
    }
    setHaccpLogs((ls) => [row, ...ls]);
    const clId = await signCleaning(TEMP_TASK_ID, true); // taak meteen aftekenen
    flash("Temperaturen vastgelegd", () => { removeHaccpLog(row.id, true); if (clId) removeCleaningLog(clId, true); });
  };
  const removeHaccpLog = async (id, quiet) => {
    if (live) {
      const { error } = await supabase.from("haccp_logs").delete().eq("id", id);
      if (dbFail(error)) return;
    }
    setHaccpLogs((ls) => ls.filter((x) => x.id !== id));
    if (!quiet) flash("Meting verwijderd");
  };
  const deleteHaccpLog = async (id) => {
    const l = haccpLogs.find((x) => x.id === id);
    if (!l) return;
    if (!window.confirm("Temperatuurmeting van " + l.checkDate + " verwijderen?")) return;
    removeHaccpLog(id);
  };
  const editCleaningLog = async (logId, note) => {
    const l = cleaningLogs.find((x) => x.id === logId);
    if (!l || (l.note || "") === note) { return; }
    const edit = { at: new Date().toISOString().slice(0, 16).replace("T", " "), by: user.name, from: l.note || "", to: note };
    const nl = { ...l, note, edits: [...(l.edits || []), edit] };
    if (live) {
      const { error } = await supabase.from("cleaning_logs").update({ note: nl.note, edits: nl.edits }).eq("id", logId);
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => ls.map((x) => (x.id === logId ? nl : x)));
    flash("Opmerking bijgewerkt");
  };
  const saveCleaningTask = async (data, editingId) => {
    const id = editingId || "ct" + Date.now();
    const row = { id, name: data.name, area: data.area, intervalDays: data.intervalDays, minutes: data.minutes, active: true };
    if (live) {
      const { error } = await supabase.from("cleaning_tasks").upsert({ id, name: row.name, area: row.area, interval_days: row.intervalDays, minutes: row.minutes, active: true, updated_by: user.name, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setCleaningTasks((ts) => (ts.some((t) => t.id === id) ? ts.map((t) => (t.id === id ? row : t)) : [...ts, row]));
    flash(live ? "Taak opgeslagen voor het hele team" : "Taak opgeslagen (demo)");
  };
  const deleteCleaningTask = async (id) => {
    const t = cleaningTasks.find((x) => x.id === id);
    if (!t) return;
    if (!window.confirm('Taak "' + t.name + '" verwijderen uit de schoonmaaklijst?')) return;
    if (live) {
      const { error } = await supabase.from("cleaning_tasks").upsert({ id, name: t.name, area: t.area, interval_days: t.intervalDays, minutes: t.minutes, active: false, updated_by: user.name, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setCleaningTasks((ts) => ts.filter((x) => x.id !== id));
    flash("Taak verwijderd", () => saveCleaningTask({ name: t.name, area: t.area, intervalDays: t.intervalDays, minutes: t.minutes }, id));
  };
  const saveTechNotes = async (key, lines) => {
    if (live) {
      const { error } = await supabase.from("technique_notes").upsert({ key, lines, updated_by: user.name, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setTechNotes((n) => ({ ...n, [key]: lines }));
    flash(live ? "Werkwijze opgeslagen voor het hele team" : "Werkwijze opgeslagen (demo)");
  };
  const toggleEndorse = async (id) => {
    const r = recipes.find((x) => x.id === id);
    const has = r && r.endorsements.includes(user.name);
    if (live) {
      const { error } = has
        ? await supabase.from("recipe_endorsements").delete().eq("recipe_id", id).eq("user_name", user.name)
        : await supabase.from("recipe_endorsements").insert({ recipe_id: id, user_name: user.name });
      if (dbFail(error)) return;
    }
    setRecipes((rs) => rs.map((x) => x.id === id ? { ...x, endorsements: has ? x.endorsements.filter((n) => n !== user.name) : [...x.endorsements, user.name] } : x));
  };
  const savePairing = async (name, pairs, note, season) => {
    const clean = { name: name.trim().toLowerCase(), pairs: pairs.map((x) => x.trim().toLowerCase()).filter(Boolean), note: (note || "").trim(), season: season || [], addedAt: Date.now() };
    if (!clean.name || clean.pairs.length === 0) { flash("Vul een naam en minstens één partner in"); return; }
    if (live) {
      const { error } = await supabase.from("flavor_pairings").upsert({ name: clean.name, pairs: clean.pairs, note: clean.note, season: clean.season, added_at: clean.addedAt, updated_by: user.name, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setPairings((ps) => ps.some((p) => p.name === clean.name) ? ps.map((p) => (p.name === clean.name ? clean : p)) : [...ps, clean]);
    flash(live ? "Smaakcombinatie opgeslagen" : "Opgeslagen (demo: alleen dit apparaat)");
  };
  const resetPairing = async (name) => {
    const orig = PAIRINGS.find((p) => p.name === name);
    const ok = window.confirm(orig ? 'Aanpassingen aan "' + name + '" terugdraaien naar het origineel?' : '"' + name + '" verwijderen voor het hele team?');
    if (!ok) return;
    if (live) { const { error } = await supabase.from("flavor_pairings").delete().eq("name", name); if (dbFail(error)) return; }
    setPairings((ps) => (orig ? ps.map((p) => (p.name === name ? orig : p)) : ps.filter((p) => p.name !== name)));
    flash(orig ? "Origineel hersteld" : "Smaakcombinatie verwijderd");
  };
  const deleteDish = async (id) => {
    const d = dishes.find((x) => x.id === id);
    if (!d) return;
    const ok = window.confirm('"' + d.name + '" verwijderen voor het hele team?');
    if (!ok) return;
    const isSeedDish = seedDishes.some((sd) => sd.id === id);
    if (live) {
      let error = null;
      if (isSeedDish) ({ error } = await supabase.from("dish_hidden").upsert({ dish_id: id, by: user.name }));
      else ({ error } = await supabase.from("dishes").delete().eq("id", id));
      if (dbFail(error)) return;
      if (isSeedDish) await supabase.from("dishes").delete().eq("id", id); // eventuele bewerking mee opruimen
    }
    setDishes((ds) => ds.filter((x) => x.id !== id));
    goBack();
    flash(live ? "Gerecht verwijderd voor het hele team" : "Gerecht verwijderd (demo: alleen dit apparaat)");
  };
  const deleteRecipe = async (id) => {
    const r = recipes.find((x) => x.id === id);
    if (!r) return;
    const ok = window.confirm('"' + r.name + '" verwijderen voor het hele team?');
    if (!ok) return;
    if (live) {
      let error = null;
      if (r.custom) ({ error } = await supabase.from("recipes_custom").delete().eq("id", id));
      else ({ error } = await supabase.from("recipe_hidden").upsert({ recipe_id: id, by: user.name }));
      if (dbFail(error)) return;
      // opruimen: likes, openingen en eventuele aanpassing
      await supabase.from("recipe_endorsements").delete().eq("recipe_id", id);
      await supabase.from("recipe_opens").delete().eq("recipe_id", id);
      await supabase.from("recipe_overrides").delete().eq("id", id);
    }
    setRecipes((rs) => rs.filter((x) => x.id !== id));
    goBack();
    flash(live ? "Recept verwijderd voor het hele team" : "Recept verwijderd (demo: alleen dit apparaat)");
  };
  const bumpOpenCount = async (id) => {
    setOpenCounts((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    if (live) { try { await supabase.rpc("bump_recipe_open", { rid: id }); } catch (e) {} }
  };

  const todayKey = localDate();
  const swipe = useSwipeSections(section, (s) => { setSection(s); setSearch(""); });

  // Dagelijkse schoonmaakcontrole om 16:45 (alleen voor koks, één keer per dag).
  useEffect(() => {
    if (!user || !user.canEdit) return;
    const tick = () => {
      const now = new Date();
      const key = localDate(now);
      const past = now.getHours() > CHECK_HOUR || (now.getHours() === CHECK_HOUR && now.getMinutes() >= CHECK_MIN);
      const afgerond = cleaningLogs.some((l) => l.taskId === DAY_DONE_ID && l.doneDate === key);
      // Niet openen als de dag al is afgerond of als de popup vandaag al is gezien/gesloten.
      if (past && !afgerond && checkDone !== key) { setCheckOpen(true); setCheckDone(key); }
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [user, checkDone, cleaningLogs]);

  if (!user) return <><BrandCSS /><Login onPick={setUser} live={live} /></>;
  const openRecipe = (id) => { bumpOpenCount(id); push({ screen: "recipeDetail", id }); };
  const fabAction = () => {
    if (section === "gerechten") push({ screen: "dishForm", editing: null });
    else if (section === "recepten") push({ screen: "recipeForm", editing: null });
    else if (section === "fermentatie") push({ screen: "batchForm", prefill: null });
    else if (section === "smaak") setNewPairing((n) => n + 1);
  };
  const showFab = current.screen === "list" && canEdit && section !== "technieken" && section !== "schoonmaak";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.paper, color: "#33352c" }}>
      <BrandCSS />
      <Header user={user} onHome={goHome} onOpenSettings={() => push({ screen: "settings" })} onSignOut={() => { if (live) supabase.auth.signOut(); setUser(null); resetTo({ screen: "list" }); }} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-28">
        {current.screen === "list" && (
          <div {...swipe}>
            <SectionNav section={section} setSection={(s) => { setSection(s); setSearch(""); }} />
            {canEdit && !dismissedNotices[todayKey] && (
              <NoticeBanner batches={batches} canAck={canEdit} onAck={ackAction} onOpen={() => setSection("fermentatie")} onDismiss={() => setDismissedNotices((d) => ({ ...d, [todayKey]: true }))} />
            )}
            {section === "gerechten" && <DishList dishes={dishes} search={search} setSearch={setSearch} onOpen={(id) => push({ screen: "dishDetail", id })} />}
            {section === "recepten" && <RecipeList recipes={recipes} openCounts={openCounts} search={search} setSearch={setSearch} onOpen={openRecipe} />}
            {section === "fermentatie" && <FermentList batches={batches} recipes={recipes} canEdit={canEdit} onToggleDone={toggleBatchDone} onDeleteBatch={deleteBatch} onEditBatch={(id) => push({ screen: "batchForm", editing: id })} onOpenLog={(id) => push({ screen: "batchLog", id })} onOpenRecipe={openRecipe} onNewFermentRecipe={() => push({ screen: "recipeForm", editing: null, fermentDefault: true })} onStartBatch={() => push({ screen: "batchForm", prefill: null })} onAck={ackAction} />}
            {section === "smaak" && <FlavorList pairings={pairings} canEdit={canEdit} onSave={savePairing} onReset={resetPairing} openNew={newPairing} onOpenedNew={() => setNewPairing(0)} onSearchRecipes={(n) => { setSection("recepten"); setSearch(n); }} />}
            {section === "technieken" && <TechniquesList notes={techNotes} canEdit={canEdit} onSaveNotes={saveTechNotes} />}
            {section === "schoonmaak" && <CleaningList tasks={cleaningTasks} logs={cleaningLogs} haccpLogs={haccpLogs} canEdit={canEdit} user={user}
              dayDone={cleaningLogs.find((l) => l.taskId === DAY_DONE_ID && l.doneDate === todayKey) || null}
              onDayDone={markDayDone} onUndoDayDone={undoDayDone}
              onSign={signCleaning} onEditLog={editCleaningLog} onDeleteLog={deleteCleaningLog}
              onOpenHaccp={() => push({ screen: "haccpForm", editing: null })}
              onEditHaccp={(id) => push({ screen: "haccpForm", editing: id })}
              onDeleteHaccp={deleteHaccpLog}
              onNewTask={() => push({ screen: "cleaningForm", editing: null })}
              onEditTask={(id) => push({ screen: "cleaningForm", editing: id })}
              onDeleteTask={deleteCleaningTask} />}
          </div>
        )}
        {current.screen === "dishDetail" && <DishDetail dish={dishById(current.id)} recipeById={recipeById} canEdit={canEdit} onBack={goBack} onEdit={() => push({ screen: "dishForm", editing: current.id })} onOpenRecipe={openRecipe} onDelete={deleteDish} />}
        {current.screen === "recipeDetail" && (() => { const r = recipeById(current.id); return (
          <RecipeDetail recipe={r} user={user} canEdit={canEdit} usageCount={usageCount(current.id)}
            baseRecipe={r?.baseId ? recipeById(r.baseId) : null} variations={r?.isBase ? variationsOf(current.id) : []}
            onBack={goBack} onEdit={() => push({ screen: "recipeForm", editing: current.id })} onEndorse={toggleEndorse}
            openCount={openCounts[current.id] || 0} onOpenRecipe={openRecipe} onDelete={deleteRecipe}
            onStartBatch={() => push({ screen: "batchForm", prefill: r })} />
        ); })()}
        {current.screen === "dishForm" && <DishForm dish={current.editing ? dishById(current.editing) : null} draft={dishDraft} allRecipes={recipes} recipeById={recipeById}
          onNewRecipe={(st) => { setDishDraft(st); push({ screen: "recipeForm", editing: null, fromDish: true }); }}
          onCancel={() => { setDishDraft(null); goBack(); }}
          onSave={(d) => { setDishDraft(null); saveDish(d, current.editing); goBack(); }} />}
        {current.screen === "recipeForm" && <RecipeForm recipe={current.editing ? recipeById(current.editing) : null} fermentDefault={!!current.fermentDefault} onCancel={goBack}
          onSave={async (d) => { const newId = await saveRecipe(d, current.editing);
            if (current.fromDish && newId) setDishDraft((dr) => (dr ? { ...dr, recipeIds: [...(dr.recipeIds || []), newId] } : dr));
            goBack(); }} />}
        {current.screen === "batchForm" && <BatchForm prefill={current.prefill} editing={current.editing ? batches.find((b) => b.id === current.editing) : null} fermentRecipes={recipes.filter((r) => r.ferment)} onCancel={goBack} onSave={(d) => { saveBatch(d, current.editing); setSection("fermentatie"); goBack(); }} />}
        {current.screen === "batchLog" && <BatchLogScreen batch={batches.find((b) => b.id === current.id)} canEdit={canEdit} onBack={goBack} onAdd={(m) => addBatchMeasurement(current.id, m)} onDeleteRow={(i) => deleteBatchMeasurement(current.id, i)} />}
        {current.screen === "haccpForm" && <HaccpForm editing={current.editing ? haccpLogs.find((l) => l.id === current.editing) : null} onCancel={goBack} onSave={(d) => { saveHaccp(d, current.editing); goBack(); }} />}
        {current.screen === "cleaningForm" && <CleaningTaskForm task={current.editing ? cleaningTasks.find((t) => t.id === current.editing) : null} onCancel={goBack} onSave={(d) => { saveCleaningTask(d, current.editing); goBack(); }} />}
        {current.screen === "settings" && <SettingsScreen onBack={goBack} installed={installed} canInstall={!!deferredPrompt} onInstall={doInstall} />}
      </main>

      {showFab && (
        <button onClick={fabAction} className="btnp ff fixed bottom-6 right-4 sm:right-6 z-20 inline-flex items-center gap-2 rounded-full pl-4 pr-5 py-3 shadow-lg font-medium text-sm">
          <Plus size={19} /> {section === "gerechten" ? "Nieuw gerecht" : section === "recepten" ? "Nieuw recept" : section === "smaak" ? "Nieuwe smaakcombinatie" : "Nieuwe batch"}
        </button>
      )}
      {checkOpen && canEdit && (
        <CleaningCheckModal tasks={cleaningTasks} logs={cleaningLogs} user={user} canEdit={canEdit}
          onSign={signCleaning} onDayDone={markDayDone} onClose={() => setCheckOpen(false)}
          onOpenSection={() => { setCheckOpen(false); resetTo({ screen: "list" }); setSection("schoonmaak"); }} />
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-full text-sm px-4 py-2 shadow-lg" style={{ background: T.ink, color: T.paper }}>
          <span className="inline-flex items-center gap-2"><Check size={16} /> {toast.msg}</span>
          {toast.undo && <button onClick={() => { const u = toast.undo; setToast(null); u(); }} className="ff font-semibold underline shrink-0">Ongedaan maken</button>}
        </div>
      )}
    </div>
  );
}

function Wordmark({ size = "small", onHome }) {
  if (size === "large") return (
    <div className="text-center">
      <div className="text-[12.5px] font-semibold tracking-widest uppercase acc mb-3">Wilde Wortels · Landgoed de Beug</div>
      <h1 className="serif ink text-4xl leading-tight">In het ritme<br />van het land</h1>
      <div className="flex items-center justify-center gap-3 mt-3 mute text-[12.5px] tracking-widest uppercase">
        <span className="h-px w-6" style={{ background: "#c7c8b6" }} /> Odijk · sinds 1554 <span className="h-px w-6" style={{ background: "#c7c8b6" }} />
      </div>
    </div>
  );
  const Tag = onHome ? "button" : "div";
  return (
    <Tag onClick={onHome} className={"flex items-center gap-2 min-w-0 text-left " + (onHome ? "ff rounded-lg" : "")} title={onHome ? "Naar startscherm" : undefined}>
      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: T.green }}><Sprout size={15} style={{ color: T.paper }} /></span>
      <span className="serif ink text-base leading-none truncate">In het ritme van het land</span>
    </Tag>
  );
}

function Login({ onPick, live }) {
  const [chosen, setChosen] = useState(null);   // gekozen kok (live-modus)
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const pickCook = async (m) => {
    if (!live) { onPick({ ...m, canEdit: true }); return; }
    setChosen(m); setPw(""); setErr(null);
  };
  const submitPw = async () => {
    if (!chosen || !pw || busy) return;
    setBusy(true); setErr(null);
    const email = COOK_EMAILS[chosen.name];
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) setErr("Inloggen lukte niet. Controleer het wachtwoord.");
    // bij succes zet de sessie-listener in App de gebruiker vanzelf
  };
  const pickGuest = async () => {
    if (!live) { onPick({ name: "Gast", role: "Gast", canEdit: false }); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) setErr("Gasttoegang lukte niet. Probeer opnieuw.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: T.paper, color: "#33352c" }}>
      <div className="w-full max-w-sm">
        <Wordmark size="large" />
        <p className="mute text-center text-sm mt-5 mb-8">Het receptenboek van de moestuinkeuken.</p>

        {!chosen && (
          <>
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold tracking-widest uppercase acc mb-3"><Lock size={13} /> Kies je naam</div>
            <div className="space-y-2">
              {TEAM.map((m) => (
                <button key={m.name} onClick={() => pickCook(m)} className="card cardh ff w-full flex items-center gap-3 px-3 py-3 text-left">
                  <span className="w-9 h-9 shrink-0 rounded-full font-semibold flex items-center justify-center serif" style={{ background: "#e8ebe0", color: T.green }}>{m.name[0]}</span>
                  <span><span className="block font-medium ink">{m.name}</span><span className="block text-xs mute">{m.role}</span></span>
                </button>
              ))}
            </div>
            <button onClick={pickGuest} disabled={busy} className="ff w-full mt-3 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm mute disabled:opacity-60" style={{ border: "1px dashed #cfccbe" }}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Verder als gast (alleen lezen)
            </button>
            {err && <p className="text-xs mt-3 text-center" style={{ color: "#a23b2c" }}>{err}</p>}
            <p className="text-xs mute mt-5 leading-relaxed">{live ? "Log in met je eigen wachtwoord. Gasten kijken mee maar kunnen niets wijzigen." : "Demo-modus: er is nog geen database gekoppeld, wijzigingen blijven alleen op dit apparaat."}</p>
          </>
        )}

        {chosen && (
          <>
            <div className="card p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 shrink-0 rounded-full font-semibold flex items-center justify-center serif" style={{ background: "#e8ebe0", color: T.green }}>{chosen.name[0]}</span>
                <span><span className="block font-medium ink">{chosen.name}</span><span className="block text-xs mute">{chosen.role}</span></span>
              </div>
              <label className="block text-sm font-medium ink mb-1.5">Wachtwoord</label>
              <input type="password" autoFocus className="input px-3 py-2.5" value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitPw(); }}
                placeholder="Je wachtwoord" />
              {err && <p className="text-xs mt-2" style={{ color: "#a23b2c" }}>{err}</p>}
              <button onClick={submitPw} disabled={busy || !pw} className="btnp ff w-full mt-3 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium py-2.5 disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} Inloggen
              </button>
            </div>
            <button onClick={() => { setChosen(null); setErr(null); }} className="ff w-full mt-3 text-sm mute hover:opacity-70">Terug naar namen</button>
          </>
        )}
      </div>
    </div>
  );
}

function Header({ user, onHome, onOpenSettings, onSignOut }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(242,240,232,0.9)", borderBottom: "1px solid " + T.line }}>
      <div className="w-full max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button onClick={onHome} className="ff shrink-0 inline-flex items-center justify-center rounded-xl w-10 h-10 hover:opacity-70" style={{ background: "#e8ebe0", color: T.green }} title="Naar startscherm"><Home size={20} /></button>
          <Wordmark onHome={onHome} />
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {!user.canEdit && <span className="inline-flex items-center gap-1 text-xs mute"><Eye size={13} /> Gast</span>}
          <span className="w-8 h-8 rounded-full font-semibold text-xs flex items-center justify-center serif shrink-0" style={{ background: "#e8ebe0", color: T.green }} title={user.name + " · " + user.role}>{user.name[0]}</span>
          <button onClick={onOpenSettings} className="mute hover:opacity-70 focus:outline-none shrink-0" title="Instellingen"><Settings size={19} /></button>
          <button onClick={onSignOut} className="mute hover:opacity-70 focus:outline-none shrink-0" title="Uitloggen"><LogOut size={19} /></button>
        </div>
      </div>
    </header>
  );
}

function SettingsScreen({ onBack, installed, canInstall, onInstall }) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const iOS = /iphone|ipad|ipod/i.test(ua);
  return (
    <div>
      <BackBar onBack={onBack} />
      <h1 className="serif ink text-3xl leading-tight">Instellingen</h1>

      <SectionTitle>App installeren</SectionTitle>
      <div className="card p-4">
        {installed ? (
          <div className="flex items-center gap-2 text-sm ink"><Check size={16} className="acc" /> De app staat op je beginscherm — je opent 'm nu schermvullend.</div>
        ) : canInstall ? (
          <>
            <p className="text-sm mute mb-3">Zet <span className="ink font-medium">In het ritme van het land</span> op je beginscherm. De app opent dan schermvullend, zonder browserbalk, en start sneller.</p>
            <button onClick={onInstall} className="btnp ff inline-flex items-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5"><Download size={16} /> Installeer als app</button>
          </>
        ) : iOS ? (
          <div className="text-sm mute space-y-2">
            <p className="ink font-medium flex items-center gap-1.5"><Share size={15} className="acc" /> Op iPhone of iPad (Safari)</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Tik onderin op de <span className="ink">Deel</span>-knop.</li>
              <li>Kies <span className="ink">Zet op beginscherm</span>.</li>
              <li>Bevestig met <span className="ink">Voeg toe</span>.</li>
            </ol>
          </div>
        ) : (
          <div className="text-sm mute space-y-2">
            <p className="ink font-medium flex items-center gap-1.5"><Smartphone size={15} className="acc" /> Toevoegen aan beginscherm</p>
            <p>Open het browsermenu (de drie puntjes) en kies <span className="ink">App installeren</span> of <span className="ink">Toevoegen aan startscherm</span>. Zodra je browser dit ondersteunt, verschijnt hier vanzelf een groene installatieknop.</p>
          </div>
        )}
      </div>
      <p className="text-xs mute mt-2 flex items-start gap-1.5"><Info size={13} className="shrink-0 mt-0.5" /> Installeren werkt op jullie eigen webadres, nadat de app is gepubliceerd. In deze preview is de knop nog niet actief.</p>

      <SectionTitle>Over</SectionTitle>
      <div className="card p-4 text-sm mute space-y-1">
        <div className="serif ink text-lg leading-tight">In het ritme van het land</div>
        <div>Wilde Wortels · Landgoed de Beug · Odijk</div>
        <div>Digitaal receptenboek van de moestuinkeuken · versie 1.0</div>
      </div>
    </div>
  );
}

const SECTIONS = [
  { id: "gerechten", label: "Gerechten", icon: <Utensils size={16} /> },
  { id: "recepten", label: "Recepten", icon: <Layers size={16} /> },
  { id: "fermentatie", label: "Fermenteren", icon: <FlaskConical size={16} /> },
  { id: "smaak", label: "Smaak", icon: <Blend size={16} /> },
  { id: "technieken", label: "Technieken", icon: <BookOpen size={16} /> },
  { id: "schoonmaak", label: "Schoonmaak", icon: <Sparkles size={16} /> },
];

// Horizontaal vegen om tussen de secties te wisselen. Verticaal scrollen en
// horizontaal scrollende stroken (filters) blijven gewoon werken.
function useSwipeSections(section, setSection) {
  const start = React.useRef(null);
  const onStart = (e) => {
    const t = e.touches ? e.touches[0] : e;
    start.current = { x: t.clientX, y: t.clientY, el: e.target };
  };
  const onEnd = (e) => {
    if (!start.current) return;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    const st = start.current; start.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.8) return; // vooral horizontaal
    // Niet vegen binnen een horizontaal scrollbaar element (bv. de filterstroken).
    let el = st.el;
    while (el && el !== document.body) {
      if (el.scrollWidth > el.clientWidth + 4 && getComputedStyle(el).overflowX !== "visible") return;
      el = el.parentElement;
    }
    const i = SECTIONS.findIndex((x) => x.id === section);
    const ni = dx < 0 ? i + 1 : i - 1;
    if (ni >= 0 && ni < SECTIONS.length) setSection(SECTIONS[ni].id);
  };
  return { onTouchStart: onStart, onTouchEnd: onEnd };
}

function SectionNav({ section, setSection }) {
  const items = SECTIONS;
  const scroller = React.useRef(null);
  const btns = React.useRef({});
  // De actieve knop netjes in het midden schuiven, ook na een swipe.
  useEffect(() => {
    const wrap = scroller.current, btn = btns.current[section];
    if (!wrap || !btn) return;
    const target = btn.offsetLeft - (wrap.clientWidth - btn.clientWidth) / 2;
    wrap.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [section]);
  return (
    <div ref={scroller} className="flex gap-1.5 overflow-x-auto pt-2 pb-1 -mx-4 px-4 no-scrollbar">
      {items.map((it) => (
        <button key={it.id} ref={(el) => { btns.current[it.id] = el; }} onClick={() => setSection(it.id)} className={"ff shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium " + (section === it.id ? "pillon" : "pill")}>
          {it.icon}{it.label}
        </button>
      ))}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative mt-4 mb-3">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input pl-9 pr-3 py-2.5 placeholder:text-neutral-400" />
    </div>
  );
}

const DISH_COURSES = ["Amuse", "Borrel", "Lunch", "Voorgerecht", "Tussengerecht", "Hoofdgerecht", "Dessert", "Friandise"];
const COURSE_FILTERS = ["Alle", ...DISH_COURSES];

function DishList({ dishes, search, setSearch, onOpen }) {
  const [courseF, setCourseF] = useState("Alle");
  const [sortMode, setSortMode] = useState("seizoen");
  const q = search.trim().toLowerCase();
  let shown = dishes.filter((d) => softMatchAny([d.name, d.course, d.description], q));
  if (courseF !== "Alle") shown = shown.filter((d) => d.course.toLowerCase().includes(courseF.toLowerCase()));
  shown = [...shown].sort((a, b) =>
    sortMode === "nieuw" ? byNewest(a, b)
    : sortMode === "az" ? a.name.localeCompare(b.name, "nl")
    : bySeasonThenName(a.season, a.name, b.season, b.name));
  return (
    <div>
      <SearchBar value={search} onChange={setSearch} placeholder="Zoek gerechten" />
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2 -mx-4 px-4 text-xs">
        {COURSE_FILTERS.map((c) => (
          <button key={c} onClick={() => setCourseF(c)} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (courseF === c ? "pillon" : "pill")}>{c}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mb-2 text-xs overflow-x-auto no-scrollbar -mx-4 px-4">
        <span className="mute shrink-0">Sorteer:</span>
        <button onClick={() => setSortMode("seizoen")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "seizoen" ? "pillon" : "pill")}>Seizoen</button>
        <button onClick={() => setSortMode("nieuw")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "nieuw" ? "pillon" : "pill")}>Laatst toegevoegd</button>
        <button onClick={() => setSortMode("az")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "az" ? "pillon" : "pill")}>A–Z</button>
      </div>
      <div className="text-right text-xs mute mb-2">{shown.length} {shown.length === 1 ? "gerecht" : "gerechten"}</div>
      <div className="space-y-2.5">
        {shown.map((d) => (
          <button key={d.id} onClick={() => onOpen(d.id)} className="card cardh ff w-full text-left p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold uppercase tracking-widest acc mb-1">{d.course}</div>
              <div className="serif ink text-xl leading-tight">{d.name}</div>
              <div className="text-sm mute mt-1 line-clamp-2">{d.description}</div>
              <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs mute">
                <span className="inline-flex items-center gap-1"><Layers size={13} className="acc" /> {d.recipeIds.length} recepten</span>
                {d.season && d.season.map((s) => <SeasonPill key={s} s={s} />)}
                {d.diet && d.diet !== "Vegetarisch" && <MeatPill diet={d.diet} />}
              </div>
            </div>
            <ChevronRight size={18} className="mt-1 shrink-0" style={{ color: "#c4c2b2" }} />
          </button>
        ))}
        {shown.length === 0 && <Empty label="Geen gerechten gevonden." />}
      </div>
    </div>
  );
}

function RecipeList({ recipes, openCounts, search, setSearch, onOpen }) {
  const [sortMode, setSortMode] = useState("seizoen");
  const [seasonF, setSeasonF] = useState("Alle");
  const [limit, setLimit] = useState(60);
  const q = search.trim().toLowerCase();
  const oc = openCounts || {};
  let shown = recipes.filter((r) => softMatchAny([r.name, r.category, r.baseName], q));
  if (seasonF !== "Alle") shown = shown.filter((r) => r.season.includes(seasonF) || r.season.includes("Hele jaar"));
  const pop = (r) => (oc[r.id] || 0) + (r.endorsements.length * 3);
  const sorted = [...shown].sort((a, b) => {
    if (sortMode === "az") return a.name.localeCompare(b.name, "nl");
    if (sortMode === "nieuw") return byNewest(a, b);
    if (sortMode === "used") {
      if (pop(b) !== pop(a)) return pop(b) - pop(a);
      if (a.isBase !== b.isBase) return a.isBase ? -1 : 1;
      return a.name.localeCompare(b.name, "nl");
    }
    return bySeasonThenName(a.season, a.name, b.season, b.name);
  });
  const visible = sorted.slice(0, limit);
  return (
    <div>
      <SearchBar value={search} onChange={(v) => { setSearch(v); setLimit(60); }} placeholder="Zoek recept of basis (bv. puree, biet)" />
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2 -mx-4 px-4 text-xs">
        {["Alle", ...SEASONS].map((s) => (
          <button key={s} onClick={() => { setSeasonF(s); setLimit(60); }} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (seasonF === s ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-1 -mx-4 px-4 text-xs">
        <span className="mute shrink-0">Sorteer</span>
        <button onClick={() => setSortMode("seizoen")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "seizoen" ? "pillon" : "pill")}>Seizoen</button>
        <button onClick={() => setSortMode("nieuw")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "nieuw" ? "pillon" : "pill")}>Laatst toegevoegd</button>
        <button onClick={() => setSortMode("used")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "used" ? "pillon" : "pill")}>Veel gebruikt</button>
        <button onClick={() => setSortMode("az")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "az" ? "pillon" : "pill")}>A–Z</button>
      </div>
      <div className="text-right text-xs mute mb-2">{sorted.length} {sorted.length === 1 ? "recept" : "recepten"}</div>
      <div className="space-y-2.5">
        {visible.map((r) => (
          <button key={r.id} onClick={() => onOpen(r.id)} className="card cardh ff w-full text-left p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="serif ink text-lg leading-tight truncate">{r.name}</span>
                {r.isBase && <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e8ebe0", color: T.green }}><GitBranch size={10} /> basis</span>}
                {r.ferment && <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e6e9df", color: "#46603f" }}><FlaskConical size={10} /> ferment</span>}
              </div>
              <div className="text-sm mute mt-0.5 truncate">{r.category} · {r.yield}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[12.5px]">
                {r.garden && <span className="inline-flex items-center gap-1 acc"><Sprout size={12} /> tuin</span>}
                {r.season.filter((s) => s !== "Hele jaar").map((s) => <SeasonPill key={s} s={s} />)}
                {r.endorsements.length > 0 && <span className="inline-flex items-center gap-1 mute"><Heart size={12} /> {r.endorsements.length}</span>}
                {r.diet !== "Vegetarisch" && <MeatPill diet={r.diet} />}
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0" style={{ color: "#c4c2b2" }} />
          </button>
        ))}
        {sorted.length > limit && <button onClick={() => setLimit((l) => l + 100)} className="ff w-full rounded-xl text-sm mute py-3" style={{ border: "1px dashed #cfccbe" }}>Toon meer ({sorted.length - limit} resterend)</button>}
        {sorted.length === 0 && <Empty label="Niets gevonden voor dit seizoen of deze zoekterm." />}
      </div>
    </div>
  );
}

function SeasonPill({ s }) {
  const st = seasonStyle[s] || { background: "#eceadf", color: "#5b5e4f" };
  return <span className="inline-flex items-center rounded-full text-[11.5px] font-medium px-1.5 py-0.5" style={st}>{s}</span>;
}
function MeatPill({ diet }) { return <span className="inline-flex items-center rounded-full text-[11.5px] font-medium px-1.5 py-0.5" style={{ background: "#ecdcd6", color: "#8a4a3a" }}>{diet}</span>; }

const FERMENT_METHODS = ["Melkzuur", "Suikerfermentatie", "Azijnfermentatie"];

function FermentList({ batches, recipes, canEdit, onToggleDone, onDeleteBatch, onEditBatch, onOpenLog, onOpenRecipe, onNewFermentRecipe, onStartBatch, onAck }) {
  const [limit, setLimit] = useState(30);
  const [seasonF, setSeasonF] = useState("Alle");
  const [methodF, setMethodF] = useState("Alle");
  const [fSort, setFSort] = useState("seizoen");
  const [q, setQ] = useState("");
  const openAction = batches.some((b) => !b.done && (batchStatus(b).due.length > 0 || batchStatus(b).ready));
  const [openActive, setOpenActive] = useState(openAction);
  const [touchedActive, setTouchedActive] = useState(false);
  // Zolang niemand het handmatig heeft omgezet, volgt het paneel de openstaande handelingen.
  useEffect(() => { if (!touchedActive) setOpenActive(openAction); }, [openAction, touchedActive]);
  const [openDone, setOpenDone] = useState(false);
  const searching = q.trim().length > 0;
  const showActive = openActive && !searching;
  const active = batches.filter((b) => !b.done);
  const done = batches.filter((b) => b.done);
  let fermentRecipes = recipes.filter((r) => r.ferment);
  const query = q.trim().toLowerCase();
  if (query) fermentRecipes = fermentRecipes.filter((r) => softMatchAny([r.name, r.category, r.fermentMethod], query));
  if (seasonF !== "Alle") fermentRecipes = fermentRecipes.filter((r) => r.season.includes(seasonF) || r.season.includes("Hele jaar"));
  if (methodF !== "Alle") fermentRecipes = fermentRecipes.filter((r) => r.fermentMethod === methodF);
  fermentRecipes = fermentRecipes.sort((a, b) => {
    if (a.isBase !== b.isBase) return a.isBase ? -1 : 1;
    if (fSort === "nieuw") return byNewest(a, b);
    if (fSort === "az") return a.name.localeCompare(b.name, "nl");
    return bySeasonThenName(a.season, a.name, b.season, b.name);
  });
  return (
    <div>
      <SearchBar value={q} onChange={(v) => { setQ(v); setLimit(30); }} placeholder="Zoek een fermentatierecept" />
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { setTouchedActive(true); setOpenActive((o) => !o); }} className="ff inline-flex items-center gap-1" disabled={searching}>
          {!searching && (openActive ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />)}
          <Eyebrow>Actieve batches ({active.length})</Eyebrow>
        </button>
        {canEdit && <button onClick={onStartBatch} className="ff inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70 mb-2"><Plus size={14} /> Nieuwe batch</button>}
      </div>
      {showActive && (active.length > 0
        ? <div className="grid grid-cols-2 gap-2.5">{active.map((b) => <BatchCard key={b.id} b={b} canEdit={canEdit} onToggleDone={onToggleDone} onDelete={onDeleteBatch} onEdit={onEditBatch} onOpenLog={onOpenLog} onAck={onAck} />)}</div>
        : <Empty label="Nog geen actieve batches." />)}
      {done.length > 0 && <>
        <button onClick={() => setOpenDone((o) => !o)} className="ff mt-5 mb-2 flex items-center gap-1">
          {openDone ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />}
          <Eyebrow>Afgerond ({done.length})</Eyebrow>
        </button>
        {openDone && <div className="grid grid-cols-2 gap-2.5">{done.map((b) => <BatchCard key={b.id} b={b} canEdit={canEdit} onToggleDone={onToggleDone} onDelete={onDeleteBatch} onEdit={onEditBatch} onOpenLog={onOpenLog} onAck={onAck} />)}</div>}
      </>}
      <div className="mt-7 flex items-center justify-between"><Eyebrow>Fermentatierecepten</Eyebrow>
        {canEdit && <button onClick={onNewFermentRecipe} className="ff inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70 mb-2"><Plus size={14} /> Nieuw fermentatierecept</button>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2 -mx-4 px-4 text-xs">
        {["Alle", ...SEASONS].map((s) => (
          <button key={s} onClick={() => { setSeasonF(s); setLimit(30); }} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (seasonF === s ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2 -mx-4 px-4 text-xs">
        {["Alle", ...FERMENT_METHODS].map((m) => (
          <button key={m} onClick={() => { setMethodF(m); setLimit(30); }} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (methodF === m ? "pillon" : "pill")}>{m === "Alle" ? "Alle methodes" : m}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mb-2 text-xs overflow-x-auto no-scrollbar -mx-4 px-4">
        <span className="mute shrink-0">Sorteer:</span>
        <button onClick={() => setFSort("seizoen")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (fSort === "seizoen" ? "pillon" : "pill")}>Seizoen</button>
        <button onClick={() => setFSort("nieuw")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (fSort === "nieuw" ? "pillon" : "pill")}>Laatst toegevoegd</button>
        <button onClick={() => setFSort("az")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (fSort === "az" ? "pillon" : "pill")}>A–Z</button>
      </div>
      <div className="text-right text-xs mute mb-2">{fermentRecipes.length} recepten</div>
      <div className="space-y-2.5">
        {fermentRecipes.slice(0, limit).map((r) => (
          <button key={r.id} onClick={() => onOpenRecipe(r.id)} className="card cardh ff w-full text-left p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="serif ink text-lg leading-tight truncate">{r.name}</span>
                {r.isBase && <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e8ebe0", color: T.green }}><GitBranch size={10} /> basis</span>}
                {r.fermentMethod && <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e6e9df", color: "#46603f" }}><FlaskConical size={10} /> {r.fermentMethod}</span>}
              </div>
              <div className="text-sm mute mt-0.5 truncate">{r.category} · {r.yield}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[12.5px]">
                {r.season.filter((sx) => sx !== "Hele jaar").map((sx) => <SeasonPill key={sx} s={sx} />)}
                {r.endorsements.length > 0 && <span className="inline-flex items-center gap-1 mute"><Heart size={12} /> {r.endorsements.length}</span>}
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0" style={{ color: "#c4c2b2" }} />
          </button>
        ))}
        {fermentRecipes.length > limit && <button onClick={() => setLimit((l) => l + 50)} className="ff w-full rounded-xl text-sm mute py-3" style={{ border: "1px dashed #cfccbe" }}>Toon meer ({fermentRecipes.length - limit} resterend)</button>}
        {fermentRecipes.length === 0 && <Empty label="Geen fermentatierecept gevonden." />}
      </div>
    </div>
  );
}

// Welke batches vragen vandaag aandacht? (klaar of handeling verschuldigd)
function collectNotices(batches) {
  const ready = [], due = [];
  for (const b of batches) {
    if (b.done) continue;
    const st = batchStatus(b);
    if (st.ready) ready.push({ b, day: st.day });
    else if (st.due.length) due.push({ b, label: st.due[0] });
  }
  return { ready, due };
}

function NoticeBanner({ batches, canAck, onAck, onOpen, onDismiss }) {
  const { ready, due } = collectNotices(batches);
  if (ready.length === 0 && due.length === 0) return null;
  return (
    <div className="rounded-xl p-4 mt-4" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold flex items-center gap-1.5 text-sm"><Bell size={15} /> Fermentatie vraagt aandacht</div>
          <ul className="mt-1.5 space-y-1 text-sm">
            {ready.map(({ b, day }) => (
              <li key={b.id} className="flex items-start gap-1.5">
                <Check size={14} className="shrink-0 mt-0.5" />
                <span className="flex-1"><span className="font-medium">{b.product}</span> is klaar — dag {day}/{b.days}</span>
                {canAck && <button onClick={() => onAck(b.id, READY_KEY)} className="ff shrink-0 rounded-md px-1.5 py-0.5 text-[12.5px] font-semibold" style={{ background: "#e6dcc2" }} title="Gezien — verberg tot morgen">Afvinken</button>}
              </li>
            ))}
            {due.map(({ b, label }) => (
              <li key={b.id + label} className="flex items-start gap-1.5">
                <FlaskConical size={14} className="shrink-0 mt-0.5" />
                <span className="flex-1"><span className="font-medium">{b.product}</span>: {label.toLowerCase()}</span>
                {canAck && <button onClick={() => onAck(b.id, label)} className="ff shrink-0 rounded-md px-1.5 py-0.5 text-[12.5px] font-semibold" style={{ background: "#e6dcc2" }} title="Gedaan — verberg tot de volgende beurt">Afvinken</button>}
              </li>
            ))}
          </ul>
          <button onClick={onOpen} className="ff mt-2.5 inline-flex items-center gap-1 text-xs font-semibold underline">Naar fermentatie</button>
        </div>
        <button onClick={onDismiss} className="ff shrink-0 rounded-lg p-1 hover:opacity-70" title="Verberg voor vandaag"><X size={16} /></button>
      </div>
    </div>
  );
}

// Wat moet er vandaag met deze batch gebeuren, en is hij klaar?
function batchStatus(b) {
  const day = daysBetween(b.startDate);
  const today = localDate();
  const acked = (b.actionsDone || []).filter((a) => a.date === today).map((a) => a.label);
  const readyRaw = !b.done && day >= b.days;
  const ready = readyRaw && !acked.includes(READY_KEY);
  const actions = FERMENT_ACTIONS[b.method] || FERMENT_ACTIONS[b.type] || [];
  const due = [];
  if (!b.done) for (const a of actions) {
    if (a.everyDays && day > 0 && day % a.everyDays === 0 && !acked.includes(a.label)) due.push(a.label);
  }
  return { day, ready, readyRaw, due, acked };
}
const READY_KEY = "__klaar";

function BatchCard({ b, canEdit, onToggleDone, onDelete, onEdit, onOpenLog, onAck }) {
  const [open, setOpen] = useState(false);
  const { day, ready, readyRaw, due, acked } = batchStatus(b);
  const tgt = FERMENT_TARGETS[b.method] || FERMENT_TARGETS[b.type];
  const lastPh = (b.log && b.log.length) ? [...b.log].reverse().find((e) => e.ph != null) : null;
  const lastBrix = (b.log && b.log.length) ? [...b.log].reverse().find((e) => e.brix != null) : null;
  return (
    <div className="card p-3 flex flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <span className="serif ink text-[17px] leading-tight break-words min-w-0">{b.product}</span>
        {b.done
          ? <span className="shrink-0 text-[11.5px] font-semibold rounded-full px-1.5 py-0.5" style={{ background: "#e8ebe0", color: T.green }}>Klaar</span>
          : readyRaw
            ? <span className="shrink-0 text-[11.5px] font-semibold rounded-full px-1.5 py-0.5" style={{ background: "#dfead6", color: "#3a4b30" }}>{day}/{b.days} ✓</span>
            : <span className="shrink-0 text-[11.5px] font-semibold rounded-full px-1.5 py-0.5 pillon">{day}/{b.days}</span>}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1 text-[12.5px] mute">
        <span className="truncate">{b.method || b.type}</span>
        <span className="shrink-0">
          {tgt && tgt.phEnd != null && <>pH ≤ {String(tgt.phEnd).replace(".", ",")}{lastPh != null && <span className="ink font-medium"> · {String(lastPh.ph).replace(".", ",")}</span>}</>}
          {lastBrix != null && <> · {String(lastBrix.brix).replace(".", ",")}°Bx</>}
          {b.done && b.finishedDate && <>{b.finishedDate}</>}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <div className="min-w-0 flex-1">
          {!b.done && due.length > 0 && (
            <div className="flex items-center gap-1 text-[12px] font-medium leading-tight rounded-md px-1.5 py-1" style={{ background: "#f3ecdc", color: "#6a5326" }}>
              <span className="flex-1 truncate" title={due[0]}>{due[0]}</span>
              {canEdit && onAck && <button onClick={() => onAck(b.id, due[0])} className="ff shrink-0 hover:opacity-70" title="Gedaan"><Check size={13} /></button>}
            </div>
          )}
          {!b.done && due.length === 0 && acked.length > 0 && (
            <span className="text-[12px] rounded-md px-1.5 py-0.5 inline-flex items-center gap-1" style={{ background: "#e8ebe0", color: T.green }}><Check size={12} /> Afgevinkt</span>
          )}
        </div>
        <button onClick={() => setOpen((o) => !o)} className="ff shrink-0 inline-flex items-center gap-0.5 text-[12px] font-medium acc">{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{open ? "Minder" : "Details"}</button>
      </div>
      {open && (
        <div className="mt-1.5 pt-1.5 border-t text-[12px] mute leading-snug" style={{ borderColor: T.line }}>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span>Start {b.startDate}</span>
            {b.finishedDate && <span>Klaar {b.finishedDate}</span>}
            <span>Zout {b.saltPct}%</span>
            <span>{b.tempC}°C</span>
            <span>pH {b.pH ?? "—"}</span>
            <span>{(b.log || []).length} metingen</span>
            {b.amount && b.amount !== "—" && <span>{b.amount}</span>}
            <span>door {b.by}</span>
          </div>
          {b.notes && <p className="mt-1 italic">{b.notes}</p>}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <button onClick={() => onOpenLog(b.id)} className="inline-flex items-center gap-1 font-medium acc hover:opacity-70"><LineChart size={12} /> Logboek</button>
              <button onClick={() => onEdit(b.id)} className="inline-flex items-center gap-1 font-medium acc hover:opacity-70"><Pencil size={12} /> Bewerk</button>
              <button onClick={() => onToggleDone(b.id)} className="inline-flex items-center gap-1 font-medium acc hover:opacity-70"><Check size={12} /> {b.done ? "Heropen" : "Afronden"}</button>
              <button onClick={() => onDelete(b.id)} className="inline-flex items-center gap-1 font-medium hover:opacity-70" style={{ color: "#8a4a3a" }}><Trash2 size={12} /> Wis</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FlavorList({ pairings, canEdit, onSave, onReset, onSearchRecipes, openNew, onOpenedNew }) {
  const [q, setQ] = useState("");
  const [sortMode, setSortMode] = useState("seizoen");
  const [open, setOpen] = useState(null);
  const [infoFor, setInfoFor] = useState(null);
  const [editing, setEditing] = useState(null); // naam van item in bewerking, of "__new"
  const [fName, setFName] = useState("");
  const [fPairs, setFPairs] = useState("");
  const [fNote, setFNote] = useState("");
  const [fSeason, setFSeason] = useState([]);
  const startEdit = (p) => { setEditing(p ? p.name : "__new"); setFName(p ? p.name : ""); setFPairs(p ? p.pairs.join(", ") : ""); setFNote(p ? p.note : ""); setFSeason(p && p.season ? p.season.filter((x) => x !== "Hele jaar") : []); if (p) setOpen(p.name); };
  const submit = () => { onSave(fName, fPairs.split(","), fNote, SEASONS.filter((x) => fSeason.includes(x))); setEditing(null); };
  useEffect(() => {
    if (!openNew) return;
    setEditing("__new"); setFName(""); setFPairs(""); setFNote(""); setFSeason([]);
    onOpenedNew && onOpenedNew();
  }, [openNew]);
  const isSeed = (name) => PAIRINGS.some((p) => p.name === name);
  const [seasonF, setSeasonF] = useState("Alle");
  const inSeason = (p) => { const ss = (p.season && p.season.length) ? p.season : seasonOf(p.name); return ss.includes(seasonF) || ss.includes("Hele jaar"); };
  const seasonsOf = (p) => (p.season && p.season.length) ? p.season : seasonOf(p.name);
  const shown = pairings
    .filter((p) => softMatchAny([p.name, p.pairs.join(" "), p.note], q))
    .filter((p) => seasonF === "Alle" || inSeason(p))
    .sort((a, b) =>
      sortMode === "nieuw" ? ((b.addedAt || 0) - (a.addedAt || 0) || a.name.localeCompare(b.name, "nl"))
      : sortMode === "az" ? a.name.localeCompare(b.name, "nl")
      : bySeasonThenName(seasonsOf(a), a.name, seasonsOf(b), b.name));
  return (
    <div>
      {editing === "__new" && (
        <PairingForm title="Nieuw product" name={fName} setName={setFName} nameLocked={false} pairs={fPairs} setPairs={setFPairs} note={fNote} setNote={setFNote} season={fSeason} setSeason={setFSeason} onSubmit={submit} onCancel={() => setEditing(null)} />
      )}
      <SearchBar value={q} onChange={setQ} placeholder="Zoek een product of smaak" />
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2 -mx-4 px-4 text-xs">
        {["Alle", ...SEASONS].map((sx) => (
          <button key={sx} onClick={() => setSeasonF(sx)} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (seasonF === sx ? "pillon" : "pill")}>{sx}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mb-2 text-xs overflow-x-auto no-scrollbar -mx-4 px-4">
        <span className="mute shrink-0">Sorteer:</span>
        <button onClick={() => setSortMode("seizoen")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "seizoen" ? "pillon" : "pill")}>Seizoen</button>
        <button onClick={() => setSortMode("nieuw")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "nieuw" ? "pillon" : "pill")}>Laatst toegevoegd</button>
        <button onClick={() => setSortMode("az")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "az" ? "pillon" : "pill")}>A–Z</button>
      </div>
      <div className="text-right text-xs mute mb-2">{shown.length} producten</div>
      <div className="space-y-2">
        {shown.map((p) => (
          <div key={p.name} className="card overflow-hidden">
            <button onClick={() => setOpen(open === p.name ? null : p.name)} className="ff w-full flex items-center justify-between px-4 py-3 text-left">
              <span className="serif ink text-lg flex items-center gap-2 flex-wrap">{cap(p.name)} {(((p.season && p.season.length) ? p.season : (SEASON[p.name] || [])).filter((s) => s !== "Hele jaar")).map((s) => <SeasonPill key={s} s={s} />)}</span>
              <ChevronRight size={16} className={"transition-transform " + (open === p.name ? "rotate-90" : "")} style={{ color: "#c4c2b2" }} />
            </button>
            {open === p.name && editing !== p.name && (
              <div className="px-4 pb-4 -mt-1">
                <p className="text-xs mute mb-2 italic">{p.note}</p>
                <div className="flex flex-wrap gap-1.5">{p.pairs.map((x) => <span key={x} className="chip rounded-full text-xs font-medium px-2.5 py-1">{x}</span>)}</div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button onClick={() => onSearchRecipes(p.name)} className="inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70"><Search size={12} /> Bekijk recepten met {p.name}</button>
                  {PRODUCT_INFO[p.name] && <button onClick={() => setInfoFor(infoFor === p.name ? null : p.name)} className="inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70"><Info size={12} /> Info</button>}
                  {canEdit && <button onClick={() => startEdit(p)} className="inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70"><Pencil size={12} /> Bewerken</button>}
                </div>
                {infoFor === p.name && PRODUCT_INFO[p.name] && (
                  <div className="tintbox rounded-xl p-3.5 mt-3 text-sm" style={{ color: "#3f5238" }}>
                    <div className="serif ink text-base leading-tight mb-1.5">{cap(p.name)}</div>
                    <p className="mb-2">{PRODUCT_INFO[p.name].note}</p>
                    <div className="space-y-1 text-[13px]">
                      {PRODUCT_INFO[p.name].kcal !== "—" && <div><span className="font-semibold">Voedingswaarde:</span> ± {PRODUCT_INFO[p.name].kcal} per 100 g</div>}
                      <div><span className="font-semibold">Gebruik:</span> {PRODUCT_INFO[p.name].gebruik}</div>
                      <div><span className="font-semibold">Oogst:</span> {PRODUCT_INFO[p.name].oogst}</div>
                    </div>
                    <p className="text-[11px] mt-2 opacity-70">Indicatieve waarden; verschilt per ras, rijpheid en seizoen.</p>
                  </div>
                )}
              </div>
            )}
            {open === p.name && editing === p.name && (
              <div className="px-4 pb-4 -mt-1">
                <PairingForm title={"Bewerk " + p.name} name={fName} setName={setFName} nameLocked={true} pairs={fPairs} setPairs={setFPairs} note={fNote} setNote={setFNote} season={fSeason} setSeason={setFSeason} onSubmit={submit} onCancel={() => setEditing(null)}
                  extraLabel={isSeed(p.name) ? "Herstel origineel" : "Verwijderen"} onExtra={() => { setEditing(null); onReset(p.name); }} />
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && <Empty label="Geen combinatie gevonden." />}
      </div>
    </div>
  );
}

function PairingForm({ title, name, setName, nameLocked, pairs, setPairs, note, setNote, season, setSeason, onSubmit, onCancel, extraLabel, onExtra }) {
  const toggleS = (x) => setSeason((a) => (a.includes(x) ? a.filter((y) => y !== x) : [...a, x]));
  return (
    <div className="card p-4 mb-3">
      <div className="text-sm font-medium ink mb-3">{title}</div>
      {!nameLocked && <label className="block mb-3"><span className="block text-sm font-medium ink mb-1.5">Product</span><input className="input px-3 py-2.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. vlierbloesem" /></label>}
      <label className="block mb-3"><span className="block text-sm font-medium ink mb-1.5">Partners (gescheiden door komma's)</span><textarea rows={2} className="input px-3 py-2.5 resize-none" value={pairs} onChange={(e) => setPairs(e.target.value)} placeholder="bv. citroen, honing, room" /></label>
      <label className="block mb-3"><span className="block text-sm font-medium ink mb-1.5">Notitie</span><input className="input px-3 py-2.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Korte typering" /></label>
      {setSeason && <div className="mb-3">
        <span className="block text-sm font-medium ink mb-1.5">Seizoen <span className="mute font-normal">(niets gekozen = volgt de seizoenslijst)</span></span>
        <div className="flex flex-wrap gap-1.5">
          {SEASONS.map((x) => (
            <button key={x} type="button" onClick={() => toggleS(x)} className={"ff rounded-full px-3 py-1.5 text-xs font-medium " + ((season || []).includes(x) ? "pillon" : "pill")}>{x}</button>
          ))}
        </div>
      </div>}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onSubmit} className="btnp ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2"><Check size={15} /> Opslaan</button>
        <button onClick={onCancel} className="btno ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2"><X size={15} /> Annuleren</button>
        {extraLabel && <button onClick={onExtra} className="ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }}><Trash2 size={15} /> {extraLabel}</button>}
      </div>
    </div>
  );
}

// ---------- Technieken: vaste werkwijzes en tabellen ----------
// Jam met 2:1 geleisuiker (500 g geleisuiker per kg schoon fruit).
const JAM_ROWS = [
  { fruit:"Kweepeer", pectine:"zeer hoog", suiker:"500 g", pectineX:"—", zuur:"2 g" },
  { fruit:"Appel", pectine:"hoog", suiker:"500 g", pectineX:"—", zuur:"2 g" },
  { fruit:"Aalbes", pectine:"hoog", suiker:"500 g", pectineX:"—", zuur:"—" },
  { fruit:"Kruisbes", pectine:"hoog", suiker:"500 g", pectineX:"—", zuur:"—" },
  { fruit:"Mispel (rijp)", pectine:"middel", suiker:"500 g", pectineX:"2 g", zuur:"3 g" },
  { fruit:"Pruim / reine claude", pectine:"middel", suiker:"500 g", pectineX:"—", zuur:"3 g" },
  { fruit:"Druif", pectine:"middel", suiker:"500 g", pectineX:"3 g", zuur:"3 g" },
  { fruit:"Braam", pectine:"middel", suiker:"500 g", pectineX:"3 g", zuur:"2 g" },
  { fruit:"Framboos", pectine:"middel", suiker:"500 g", pectineX:"3 g", zuur:"2 g" },
  { fruit:"Japanse wijnbes", pectine:"middel", suiker:"500 g", pectineX:"3 g", zuur:"2 g" },
  { fruit:"Perzik / abrikoos", pectine:"laag–middel", suiker:"500 g", pectineX:"4 g", zuur:"4 g" },
  { fruit:"Blauwe bes", pectine:"laag", suiker:"500 g", pectineX:"5 g", zuur:"4 g" },
  { fruit:"Rabarber", pectine:"laag (zuur hoog)", suiker:"500 g", pectineX:"5 g", zuur:"—" },
  { fruit:"Aardbei", pectine:"laag", suiker:"500 g", pectineX:"6 g", zuur:"4 g" },
  { fruit:"Peer", pectine:"laag", suiker:"500 g", pectineX:"6 g", zuur:"5 g" },
  { fruit:"Kers", pectine:"laag", suiker:"500 g", pectineX:"6 g", zuur:"5 g" },
  { fruit:"Vijg", pectine:"laag", suiker:"500 g", pectineX:"6 g", zuur:"5 g" },
];
// Suikergehaltes voor gedraaid ijs en sorbet (percentage van het totale mengsel).
const ICE_ROWS = [
  { soort:"Roomijs (anglaise-basis)", suiker:"16–18%", glucose:"20–25%", extra:"vet 8–12% · droge stof 36–42%" },
  { soort:"Melkijs / licht roomijs", suiker:"17–19%", glucose:"25%", extra:"vet 4–8%" },
  { soort:"Yoghurt- of karnemelkijs", suiker:"18–20%", glucose:"20%", extra:"zuur vraagt meer suiker" },
  { soort:"Sorbet zuur fruit (framboos, aalbes, rabarber)", suiker:"28–32%", glucose:"20–25%", extra:"stabilisator 0,3–0,5%" },
  { soort:"Sorbet zoet fruit (peer, appel, perzik)", suiker:"26–28%", glucose:"20%", extra:"stabilisator 0,3–0,5%" },
  { soort:"Groente- of kruidensorbet", suiker:"24–26%", glucose:"20%", extra:"proef op zoet/zuur-balans" },
  { soort:"Granité", suiker:"18–22%", glucose:"—", extra:"niet draaien; vriezen en opschrapen" },
  { soort:"Parfait / semifreddo", suiker:"20–22%", glucose:"—", extra:"wordt niet gedraaid; lucht uit eiwit/room" },
];
// Vochtverlies bij roosteren (200 °C, geolied, één laag, schoongemaakt product).
const ROAST_ROWS = [
  { groente:"Tomaat (halve, langzaam)", type:"nat", snij:"5%", verlies:"55–65%", schoon:"2,5 kg", onbewerkt:"2,6 kg" },
  { groente:"Courgette", type:"nat", snij:"5%", verlies:"50–60%", schoon:"2,2 kg", onbewerkt:"2,3 kg" },
  { groente:"Champignon / paddenstoel", type:"nat", snij:"5%", verlies:"45–55%", schoon:"2,0 kg", onbewerkt:"2,1 kg" },
  { groente:"Aubergine", type:"nat", snij:"10%", verlies:"45–55%", schoon:"2,0 kg", onbewerkt:"2,2 kg" },
  { groente:"Ui", type:"nat", snij:"15%", verlies:"40–50%", schoon:"1,8 kg", onbewerkt:"2,1 kg" },
  { groente:"Prei", type:"nat", snij:"40%", verlies:"40–50%", schoon:"1,8 kg", onbewerkt:"3,0 kg" },
  { groente:"Venkel", type:"nat", snij:"25%", verlies:"35–45%", schoon:"1,7 kg", onbewerkt:"2,2 kg" },
  { groente:"Paprika", type:"nat", snij:"20%", verlies:"35–45%", schoon:"1,7 kg", onbewerkt:"2,1 kg" },
  { groente:"Pompoen", type:"middel", snij:"30%", verlies:"30–40%", schoon:"1,5 kg", onbewerkt:"2,2 kg" },
  { groente:"Bloemkool / broccoli", type:"middel", snij:"40%", verlies:"25–35%", schoon:"1,4 kg", onbewerkt:"2,4 kg" },
  { groente:"Wortel", type:"hard", snij:"15%", verlies:"25–35%", schoon:"1,4 kg", onbewerkt:"1,7 kg" },
  { groente:"Pastinaak", type:"hard", snij:"18%", verlies:"25–35%", schoon:"1,4 kg", onbewerkt:"1,7 kg" },
  { groente:"Knolselderij", type:"hard", snij:"30%", verlies:"25–30%", schoon:"1,4 kg", onbewerkt:"2,0 kg" },
  { groente:"Koolrabi", type:"hard", snij:"30%", verlies:"25–30%", schoon:"1,4 kg", onbewerkt:"2,0 kg" },
  { groente:"Aardpeer", type:"hard", snij:"15%", verlies:"20–30%", schoon:"1,3 kg", onbewerkt:"1,6 kg" },
  { groente:"Asperge", type:"hard", snij:"35%", verlies:"20–30%", schoon:"1,3 kg", onbewerkt:"2,1 kg" },
  { groente:"Zoete aardappel", type:"hard", snij:"20%", verlies:"25–30%", schoon:"1,4 kg", onbewerkt:"1,7 kg" },
  { groente:"Aardappel", type:"hard", snij:"18%", verlies:"20–25%", schoon:"1,3 kg", onbewerkt:"1,6 kg" },
  { groente:"Rode biet (in folie)", type:"hard", snij:"12%", verlies:"12–18%", schoon:"1,2 kg", onbewerkt:"1,3 kg" },
];

// Werkwijzes onder de technieken-tabellen; koks kunnen deze aanpassen.
const TECH_NOTES_SEED = {
  jam: [
    "Weeg het schoongemaakte fruit; reken 500 g geleisuiker 2:1 per kg.",
    "Meng losse pectine eerst door een klein deel van de suiker — anders klontert het.",
    "Breng fruit met suiker aan de kook en kook exact 4 minuten hard door.",
    "Voeg citroenzuur pas op het eind toe; pectine geleert bij pH 2,8–3,4.",
    "Koude-schoteltest: een druppel op een ijskoud bordje moet in 30 seconden rimpelen.",
    "Vul af boven 85 °C, sluit direct en keer de potten 5 minuten om.",
  ],
  ijs: [
    "Percentages zijn van het totale mengsel; meet na met een refractometer (°Bx).",
    "Het aandeel glucose is een deel van het suikergewicht: 28% suiker met 25% glucose = 210 g kristalsuiker + 70 g glucose per kg.",
    "Glucosepoeder (DE 38–40) verlaagt de zoetkracht en houdt het ijs smeuïg. Ga niet boven ~25%, anders wordt het taai.",
    "Te weinig suiker geeft een harde, scherpe textuur; te veel suiker laat het ijs niet opstijven.",
    "Laat roomijsbasis 12 uur koud rijpen voor het draaien; draai af op −8 tot −10 °C.",
  ],
  roosteren: [
    "Gemeten bij 200 °C, licht geolied, in één laag, en per stap gewogen.",
    "Snijverlies is van onbewerkt naar schoongemaakt (loof, schil, zaadlijst, houtige delen).",
    "Vochtverlies is wat er daarna in de oven uit verdampt.",
    "Voorbeeld: 4 kg geroosterde courgette? Bestel 4 × 2,3 = ruim 9 kg onbewerkt.",
    "Weeg een keer per seizoen na en pas de waarden aan; jonge tuingroente bevat meer vocht.",
  ],
};

function TechTable({ head, rows }) {
  return (
    <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>{head.map((h) => <th key={h} className="text-left font-semibold ink text-[12.5px] uppercase tracking-wide pb-2 pr-3 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className={i > 0 ? "divi" : ""}>
              {cells.map((c, j) => <td key={j} className={"py-2 pr-3 align-top " + (j === 0 ? "ink font-medium" : "mute")} style={{ whiteSpace: j === 0 ? "normal" : "nowrap" }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TechCard({ title, intro, open, onToggle, children }) {
  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="ff w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="min-w-0">
          <span className="serif ink text-lg block leading-tight">{title}</span>
          <span className="text-xs mute block mt-0.5">{intro}</span>
        </span>
        {open ? <ChevronUp size={18} className="shrink-0" style={{ color: "#c4c2b2" }} /> : <ChevronDown size={18} className="shrink-0" style={{ color: "#c4c2b2" }} />}
      </button>
      {open && <div className="px-4 pb-4 -mt-1">{children}</div>}
    </div>
  );
}

// Werkwijze onder een tabel: leesbaar, en door koks aan te passen.
function TechNotes({ notes, canEdit, onSave, label }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const start = () => { setText(notes.join("\n")); setEditing(true); };
  const save = () => { onSave(text.split("\n").map((l) => l.trim()).filter(Boolean)); setEditing(false); };
  return (
    <div className="tintbox rounded-xl p-3.5 mt-3 text-sm" style={{ color: "#3f5238" }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="font-semibold">{label}</div>
        {canEdit && !editing && <button onClick={start} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium hover:opacity-70"><Pencil size={11} /> Aanpassen</button>}
      </div>
      {editing ? (
        <>
          <textarea rows={Math.max(4, text.split("\n").length + 1)} className={inputCls + " resize-none text-sm"} value={text} onChange={(e) => setText(e.target.value)} placeholder="Eén regel per stap" />
          <p className="text-[12.5px] mt-1 opacity-70">Eén regel per stap. Regels die je leeg laat, vervallen.</p>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={save} className="btnp ff inline-flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1.5"><Check size={13} /> Opslaan</button>
            <button onClick={() => setEditing(false)} className="btno ff inline-flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1.5"><X size={13} /> Annuleren</button>
          </div>
        </>
      ) : (
        <ul className="list-disc list-inside space-y-1">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      )}
    </div>
  );
}

// Overzicht van fermentatiemethodes voor de technieken-pagina.
const FERMENT_GUIDE = [
  { methode:"Melkzuur (groente)", zout:"2,5% pekel", pH:"onder 4,2; streef 3,2–3,6", tijd:"1–4 weken", temp:"18–22 °C", let:"Alles onder de pekel houden; wit gistvlies is onschuldig, pluizige schimmel niet." },
  { methode:"Kimchi", zout:"2,5–3,5%", pH:"onder 4,2", tijd:"3–14 dagen", temp:"18–22 °C, daarna koel", let:"Dagelijks aandrukken; koel zodra de gewenste zuurte is bereikt." },
  { methode:"Zuurkool", zout:"2,5%", pH:"onder 4,1", tijd:"2–4 weken", temp:"18–20 °C", let:"Fijn snijden en kneden tot er genoeg eigen vocht is." },
  { methode:"Hete saus", zout:"2,5–3,5%", pH:"onder 3,8", tijd:"1–2 weken", temp:"20–22 °C", let:"Ontlucht regelmatig; peper kan flink bruisen." },
  { methode:"Suikerfermentatie (dranken)", zout:"—", pH:"3,0–3,5", tijd:"2–7 dagen (1e), 1–3 dagen fles", temp:"20–24 °C", let:"DRUK: beugelfles of PET, dagelijks ontluchten, koel serveren." },
  { methode:"Kombucha", zout:"—", pH:"2,8–3,5", tijd:"7–14 dagen", temp:"22–26 °C", let:"Levende SCOBY nodig; schimmel bovenop betekent weggooien." },
  { methode:"Waterkefir", zout:"—", pH:"3,2–3,8", tijd:"1–2 dagen per stap", temp:"20–24 °C", let:"Korrels terugzetten voor de volgende ronde; nooit metaal gebruiken." },
  { methode:"Azijnfermentatie", zout:"—", pH:"onder 3,5 (zuur)", tijd:"3–6 weken", temp:"22–28 °C", let:"Tweetraps (eerst alcohol, dan azijn); doek erop, azijn heeft zuurstof nodig." },
  { methode:"Gekweekte zuivel", zout:"—", pH:"4,4–4,6", tijd:"12–24 uur", temp:"22–26 °C", let:"Schone materialen; alleen levende starter gebruiken." },
];

function TechniquesList({ notes, canEdit, onSaveNotes }) {
  const [q, setQ] = useState("");
  const [openCards, setOpenCards] = useState({});
  const searching = q.trim().length > 0;
  const hit = (t) => softMatch(t, q);
  const jam = searching ? JAM_ROWS.filter((r) => hit(r.fruit)) : JAM_ROWS;
  const ice = searching ? ICE_ROWS.filter((r) => hit(r.soort)) : ICE_ROWS;
  const roast = searching ? ROAST_ROWS.filter((r) => hit(r.groente) || hit(r.type)) : ROAST_ROWS;
  // Bij zoeken klapt alleen de tabel open die een treffer heeft.
  const isOpen = (key, count) => (searching ? count > 0 : !!openCards[key]);
  const toggle = (key) => setOpenCards((o) => ({ ...o, [key]: !o[key] }));
  const n = (k) => (notes && notes[k]) || TECH_NOTES_SEED[k];
  const nothing = searching && jam.length === 0 && ice.length === 0 && roast.length === 0;
  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Zoek een fruitsoort, groente of bereiding" />
      {nothing && <Empty label="Niets gevonden in de technieken." />}
      <div className="space-y-2.5">
        <TechCard title="Jam & confituur" intro="Met 2:1 geleisuiker — per kg schoongemaakt fruit" open={isOpen("jam", jam.length)} onToggle={() => toggle("jam")}>
          <TechTable head={["Fruit", "Pectine", "Geleisuiker 2:1", "Extra pectine", "Citroenzuur"]}
            rows={jam.map((r) => [r.fruit, r.pectine, r.suiker, r.pectineX, r.zuur])} />
          <TechNotes label="Werkwijze" notes={n("jam")} canEdit={canEdit} onSave={(lines) => onSaveNotes("jam", lines)} />
        </TechCard>

        <TechCard title="Roomijs & sorbet" intro="Suikergehaltes en glucoseverhouding" open={isOpen("ijs", ice.length)} onToggle={() => toggle("ijs")}>
          <TechTable head={["Soort", "Totaal suiker", "Aandeel glucose", "Aandachtspunt"]}
            rows={ice.map((r) => [r.soort, r.suiker, r.glucose, r.extra])} />
          <TechNotes label="Lezen als volgt" notes={n("ijs")} canEdit={canEdit} onSave={(lines) => onSaveNotes("ijs", lines)} />
        </TechCard>

        <TechCard title="Snij- en vochtverlies bij roosteren" intro="Van onbewerkt naar schoongemaakt naar geroosterd" open={isOpen("roosteren", roast.length)} onToggle={() => toggle("roosteren")}>
          <TechTable head={["Groente", "Type", "Snijverlies", "Vochtverlies", "Schoon voor 1 kg", "Onbewerkt voor 1 kg"]}
            rows={roast.map((r) => [r.groente, r.type, r.snij, r.verlies, r.schoon, r.onbewerkt])} />
          <TechNotes label="Zo gebruik je de tabel" notes={n("roosteren")} canEdit={canEdit} onSave={(lines) => onSaveNotes("roosteren", lines)} />
        </TechCard>

        <TechCard title="Fermenteren" intro="Methodes, streefwaarden en aandachtspunten" open={isOpen("fermenteren", (softMatch("fermenteren", q) || softMatch("fermentatie", q)) ? 1 : FERMENT_GUIDE.filter((r) => hit(r.methode) || hit(r.let)).length)} onToggle={() => toggle("fermenteren")}>
          <TechTable head={["Methode", "Zout", "Streef-pH", "Duur", "Temp.", "Let op"]}
            rows={(searching ? FERMENT_GUIDE.filter((r) => hit(r.methode) || hit(r.let)) : FERMENT_GUIDE).map((r) => [r.methode, r.zout, r.pH, r.tijd, r.temp, r.let])} />
          <div className="tintbox rounded-xl p-3.5 mt-3 text-sm" style={{ color: "#3f5238" }}>
            <div className="font-semibold mb-1">Kort per soort</div>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-medium">Melkzuur</span> (zuurkool, kimchi, pekelgroente): melkzuurbacteriën zetten suikers om in zuur. Zout (2,5%) en zuurstofvrij onder de pekel houden de rotters buiten; klaar bij pH onder 4,2.</li>
              <li><span className="font-medium">Suikerfermentatie</span> (gemberbier, kefir, kombucha): gist maakt van suiker koolzuur en wat alcohol. Dit bruist — altijd drukbestendige flessen en dagelijks ontluchten.</li>
              <li><span className="font-medium">Azijn</span>: tweetraps. Eerst vergist gist suiker tot alcohol, daarna zetten azijnbacteriën die om in azijnzuur. Heeft juist zuurstof nodig: doek erop, geen deksel.</li>
              <li><span className="font-medium">Zuivel</span>: melkzuurcultuur dikt room of melk tot crème fraîche, karnemelk of yoghurt.</li>
            </ul>
          </div>
          <div className="tintbox rounded-xl p-3.5 mt-2 text-sm" style={{ color: "#3f5238" }}>
            <div className="font-semibold mb-1">Belangrijke punten</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Meet de pH met de geijkte meter en leg hem vast in het batchlogboek — dat is je HACCP-bewijs.</li>
              <li>Wit vlies (kaamgist) op de pekel is onschuldig en eraf te scheppen; pluizige, gekleurde of behaarde schimmel betekent weggooien.</li>
              <li>Werk schoon: gereedschap en potten heet uitspoelen, handen wassen, geen aangetast product gebruiken.</li>
              <li>Koel zodra de gewenste zuurte is bereikt; kou remt de fermentatie en houdt het product stabiel.</li>
              <li>Proef met een schone lepel, nooit dubbel erin.</li>
            </ul>
          </div>
        </TechCard>
      </div>
    </div>
  );
}

function CleaningList({ tasks, logs, haccpLogs, canEdit, user, dayDone, onDayDone, onUndoDayDone, onSign, onEditLog, onDeleteLog, onNewTask, onEditTask, onDeleteTask, onOpenHaccp, onEditHaccp, onDeleteHaccp }) {
  const [q, setQ] = useState("");
  const [areaF, setAreaF] = useState("Alle");
  const [openAll, setOpenAll] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [noteFor, setNoteFor] = useState(null);
  const [noteText, setNoteText] = useState("");
  const searching = q.trim().length > 0;
  const [openDue, setOpenDue] = useState(true);
  const showDue = openDue && !dayDone;

  const withStatus = tasks.map((t) => ({ t, st: taskStatus(t, logs) }));
  const dueToday = withStatus.filter((x) => x.st.due).sort((a, b) =>
    a.t.intervalDays - b.t.intervalDays
    || CLEANING_AREAS.indexOf(a.t.area) - CLEANING_AREAS.indexOf(b.t.area)
    || (b.st.overdue ? 1 : 0) - (a.st.overdue ? 1 : 0)
    || a.t.name.localeCompare(b.t.name));
  let all = withStatus;
  if (areaF !== "Alle") all = all.filter((x) => x.t.area === areaF);
  if (searching) all = all.filter((x) => softMatchAny([x.t.name, x.t.area, intervalLabel(x.t.intervalDays)], q));
  const areaOrder = (a) => { const i = CLEANING_AREAS.indexOf(a); return i < 0 ? 99 : i; };
  all = all.sort((a, b) => areaOrder(a.t.area) - areaOrder(b.t.area) || a.t.intervalDays - b.t.intervalDays || a.t.name.localeCompare(b.t.name));
  const grouped = CLEANING_AREAS.map((area) => ({ area, items: all.filter((x) => x.t.area === area) })).filter((g) => g.items.length);

  // Logboek per week
  const monday = new Date(); monday.setHours(0,0,0,0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
  const wk = weekKey(isoDate(monday));
  const weekLogs = logs.filter((l) => l.taskId !== DAY_DONE_ID && weekKey(l.doneDate) === wk).sort((a, b) => (a.doneDate < b.doneDate ? 1 : -1));
  const taskName = (id) => { const t = tasks.find((x) => x.id === id); return t ? t.area + " · " + t.name : "Onbekende taak"; };

  const startNote = (l) => { setNoteFor(l.id); setNoteText(l.note || ""); };
  const saveNote = () => { onEditLog(noteFor, noteText); setNoteFor(null); };

  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Zoek een schoonmaaktaak" />

      {dayDone
        ? <div className="rounded-xl p-3.5 mb-3 flex items-start gap-2 text-sm" style={{ background: "#e8ebe0", color: T.green }}>
            <Check size={16} className="shrink-0 mt-0.5" />
            <span className="flex-1">Dag afgerond door <span className="font-medium">{dayDone.doneBy}</span>. De controle komt morgen vanzelf terug.</span>
            <button onClick={onUndoDayDone} className="ff shrink-0 text-xs font-semibold underline">Heropen</button>
          </div>
        : <button onClick={onDayDone} className="btnp ff w-full mb-3 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold px-3 py-3"><Check size={16} /> Dag afgerond</button>}

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setOpenDue((o) => !o)} className="ff inline-flex items-center gap-1" disabled={!!dayDone}>
          {!dayDone && (openDue ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />)}
          <Eyebrow>Vandaag te doen ({dueToday.length})</Eyebrow>
        </button>
        <span className="text-xs mute text-right">{dueToday.length} {dueToday.length === 1 ? "taak" : "taken"}</span>
      </div>
      {!showDue
        ? null
        : dueToday.length === 0
        ? <div className="rounded-xl p-4 text-sm flex items-center gap-2" style={{ background: "#e8ebe0", color: T.green }}><Check size={16} /> Alles is bij — niets te doen vandaag.</div>
        : <div className="card overflow-hidden">
            {dueToday.map((x, i) => (
              <div key={x.t.id} className={"flex items-center gap-3 px-4 py-3 " + (i > 0 ? "divi" : "")}>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold uppercase tracking-wide acc">{x.t.area}</div>
                  <div className="text-[15px] font-medium ink truncate leading-snug">{x.t.name}</div>
                  <div className="text-[12.5px] mute mt-0.5">
                    {intervalLabel(x.t.intervalDays)}
                    {x.st.overdue && <span className="ml-1.5 font-semibold" style={{ color: "#8a4a3a" }}>{x.st.since - x.t.intervalDays} dag(en) over tijd</span>}
                    {!x.st.last && <span className="ml-1.5 mute">nog nooit afgetekend</span>}
                  </div>
                </div>
                {canEdit
                  ? (x.t.id === TEMP_TASK_ID
                      ? <button onClick={() => onOpenHaccp(null)} className="btnp ff shrink-0 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-2.5 py-2" title="Temperaturen invullen"><Thermometer size={14} /> Invullen</button>
                      : <button onClick={() => onSign(x.t.id)} className="btnp ff shrink-0 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-2.5 py-2" title={"Aftekenen als " + user.name}><Check size={14} /> {user.name}</button>)
                  : <span className="text-[12.5px] mute shrink-0">te doen</span>}
              </div>
            ))}
          </div>}

      <button onClick={() => setOpenAll((o) => !o)} className="ff mt-6 mb-2 flex items-center gap-1">
        {openAll || searching ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />}
        <Eyebrow>Alle taken ({all.length})</Eyebrow>
      </button>
      {(openAll || searching) && (
        <>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2 -mx-4 px-4 text-xs">
            {["Alle", ...CLEANING_AREAS].map((a) => (
              <button key={a} onClick={() => setAreaF(a)} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (areaF === a ? "pillon" : "pill")}>{a}</button>
            ))}
          </div>
          {canEdit && <button onClick={onNewTask} className="btno ff mb-2 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2"><Plus size={15} /> Taak toevoegen</button>}
          <div className="space-y-3">
            {grouped.map((g) => (
              <div key={g.area}>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="serif ink text-xl leading-none">{g.area}</span>
                  <span className="text-[12.5px] mute">{g.items.length} taken</span>
                </div>
                <div className="card overflow-hidden">
                  {g.items.map((x, i) => (
                    <div key={x.t.id} className={"flex items-center gap-2 px-3.5 py-2.5 " + (i > 0 ? "divi" : "")}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium ink truncate">{x.t.name}</div>
                        <div className="text-[12.5px] mute mt-0.5 truncate">
                          {intervalLabel(x.t.intervalDays)} ·{" "}
                          {x.st.last ? <>laatst {x.st.since === 0 ? "vandaag" : x.st.since === 1 ? "gisteren" : x.st.since + " dagen geleden"} door {x.st.last.doneBy}</> : "nog nooit afgetekend"}
                        </div>
                      </div>
                      {canEdit && <>
                        {x.t.id === TEMP_TASK_ID
                          ? <button onClick={() => onOpenHaccp(null)} className="ff shrink-0 rounded-lg px-1.5 py-1.5 acc hover:opacity-70" title="Temperaturen invullen"><Thermometer size={15} /></button>
                          : <button onClick={() => onSign(x.t.id)} className="ff shrink-0 rounded-lg px-1.5 py-1.5 acc hover:opacity-70" title="Nu aftekenen"><Check size={15} /></button>}
                        <button onClick={() => onEditTask(x.t.id)} className="ff shrink-0 rounded-lg px-1 py-1.5 acc hover:opacity-70" title="Taak bewerken"><Pencil size={14} /></button>
                        <button onClick={() => onDeleteTask(x.t.id)} className="ff shrink-0 rounded-lg px-1 py-1.5 hover:opacity-70" style={{ color: "#8a4a3a" }} title="Taak verwijderen"><Trash2 size={14} /></button>
                      </>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {all.length === 0 && <Empty label="Geen taak gevonden." />}
          </div>
        </>
      )}

      <div className="mt-7">
        <HaccpBlock logs={haccpLogs} canEdit={canEdit} onOpen={onOpenHaccp} onEdit={onEditHaccp} onDelete={onDeleteHaccp} />
      </div>

      <div className="mt-7 flex items-center justify-between">
        <Eyebrow>Logboek per week</Eyebrow>
        <div className="flex items-center gap-1.5 mb-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="ff pill rounded-md w-7 h-7 flex items-center justify-center" title="Vorige week"><ArrowLeft size={13} /></button>
          <span className="pillon rounded-md px-2 h-7 flex items-center text-[12.5px] font-semibold">{wk.replace("-W", " · week ")}</span>
          <button onClick={() => setWeekOffset((w) => Math.min(0, w + 1))} disabled={weekOffset >= 0} className="ff pill rounded-md w-7 h-7 flex items-center justify-center disabled:opacity-40" title="Volgende week"><ChevronRight size={13} /></button>
        </div>
      </div>
      <div className="text-xs mute mb-2">{isoDate(monday)} t/m {isoDate(sunday)} · {weekLogs.length} aftekeningen</div>
      <div className="space-y-2">
        {weekLogs.map((l) => (
          <div key={l.id} className="card p-3.5">
            <div className="flex items-start gap-2">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#e8ebe0", color: T.green }}><Check size={15} /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium ink">{taskName(l.taskId)}</div>
                  {canEdit && <button onClick={() => onDeleteLog(l.id)} className="ff shrink-0 rounded-lg px-1 py-0.5 hover:opacity-70" style={{ color: "#8a4a3a" }} title="Aftekening verwijderen (bij een misklik)"><Trash2 size={13} /></button>}
                </div>
                <div className="text-[12.5px] mute mt-0.5">{l.doneDate} · afgetekend door <span className="ink font-medium">{l.doneBy}</span></div>
                {l.note && <p className="text-xs mt-1.5 italic" style={{ color: "#3b3d33" }}>{l.note}</p>}
                {(l.edits || []).length > 0 && (
                  <div className="mt-1.5 text-[12.5px] mute space-y-0.5">
                    {l.edits.map((e, i) => (
                      <div key={i} className="flex gap-1"><Pencil size={10} className="shrink-0 mt-0.5" /><span>{e.at} — {e.by} wijzigde de opmerking{e.from ? <> van “{e.from}”</> : <> (was leeg)</>} naar “{e.to}”</span></div>
                    ))}
                  </div>
                )}
                {canEdit && noteFor !== l.id && (
                  <button onClick={() => startNote(l)} className="ff mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium acc hover:opacity-70"><Pencil size={11} /> {l.note ? "Opmerking aanpassen" : "Opmerking toevoegen"}</button>
                )}
                {canEdit && noteFor === l.id && (
                  <div className="mt-2">
                    <textarea rows={2} className={inputCls + " resize-none text-sm"} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Wat is er gedaan of opgevallen?" />
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={saveNote} className="btnp ff inline-flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1.5"><Check size={13} /> Opslaan</button>
                      <button onClick={() => setNoteFor(null)} className="btno ff inline-flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1.5"><X size={13} /> Annuleren</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {weekLogs.length === 0 && <Empty label="Deze week is er nog niets afgetekend." />}
      </div>
    </div>
  );
}

// ---------- HACCP: wekelijkse temperatuurregistratie ----------
function HaccpBlock({ logs, canEdit, onOpen, onEdit, onDelete }) {
  const [openAll, setOpenAll] = useState(false);
  const thisWeek = weekKey(localDate());
  const sorted = [...logs].sort((a, b) => (a.checkDate < b.checkDate ? 1 : -1));
  const doneThisWeek = sorted.find((l) => weekKey(l.checkDate) === thisWeek) || null;
  const shown = openAll ? sorted : sorted.slice(0, 3);
  const warn = (l) => HACCP_UNITS.some((u) => inRange(u, l.values[u.id]) === false) || (l.calibration && l.calibration.ok === false);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Eyebrow>HACCP · temperaturen</Eyebrow>
        {canEdit && <button onClick={() => onOpen(null)} className="ff inline-flex items-center gap-1 text-sm font-medium acc hover:opacity-70 mb-2"><Plus size={15} /> Meting invullen</button>}
      </div>
      {doneThisWeek
        ? <div className="rounded-xl p-3.5 text-sm flex items-start gap-2" style={{ background: "#e8ebe0", color: T.green }}>
            <Check size={16} className="shrink-0 mt-0.5" />
            <span>Deze week gecontroleerd op {doneThisWeek.checkDate} door <span className="font-medium">{doneThisWeek.doneBy}</span>{warn(doneThisWeek) && <span style={{ color: "#8a4a3a" }}> — let op: een waarde valt buiten de grenzen</span>}</span>
          </div>
        : <div className="rounded-xl p-3.5 text-sm flex items-start gap-2" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
            <Bell size={16} className="shrink-0 mt-0.5" />
            <span>Deze week nog niet gecontroleerd. Meet koelcel, koelwerkbank, vrieskast en vriescel, en ijk de thermometer.</span>
          </div>}

      <div className="mt-3 space-y-2">
        {shown.map((l) => (
          <div key={l.id} className="card p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium ink">{l.checkDate} · week {weekKey(l.checkDate).split("-W")[1]}</div>
                <div className="text-[12.5px] mute mt-0.5">afgetekend door <span className="ink font-medium">{l.doneBy}</span></div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onEdit(l.id)} className="ff rounded-lg px-1.5 py-1 acc hover:opacity-70" title="Meting corrigeren"><Pencil size={14} /></button>
                  <button onClick={() => onDelete(l.id)} className="ff rounded-lg px-1.5 py-1 hover:opacity-70" style={{ color: "#8a4a3a" }} title="Meting verwijderen"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[12.5px]">
              {HACCP_UNITS.map((u) => {
                const ok = inRange(u, l.values[u.id]);
                return (
                  <div key={u.id} className="flex items-center justify-between gap-2">
                    <span className="mute truncate">{u.name}</span>
                    <span className="font-medium shrink-0" style={{ color: ok === false ? "#8a4a3a" : "#2b3823" }}>{fmtTemp(l.values[u.id])}{ok === false && " ⚠"}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 text-[12.5px] flex items-center justify-between gap-2">
              <span className="mute">Thermometer geijkt (ijswater)</span>
              <span className="font-medium shrink-0" style={{ color: l.calibration && l.calibration.ok === false ? "#8a4a3a" : "#2b3823" }}>
                {l.calibration && l.calibration.measured !== null && l.calibration.measured !== undefined ? fmtTemp(l.calibration.measured) : "—"}
                {l.calibration && l.calibration.ok === false ? " ⚠ afwijking" : l.calibration && l.calibration.ok ? " ✓" : ""}
              </span>
            </div>
            {l.note && <p className="text-[12.5px] mute mt-1.5 italic">{l.note}</p>}
            {(l.edits || []).length > 0 && (
              <div className="mt-1.5 text-[12px] mute space-y-0.5">
                {l.edits.map((e, i) => <div key={i} className="flex gap-1"><Pencil size={10} className="shrink-0 mt-0.5" /><span>{e.at} — {e.by} corrigeerde deze meting</span></div>)}
              </div>
            )}
          </div>
        ))}
        {sorted.length === 0 && <Empty label="Nog geen temperatuurmetingen vastgelegd." />}
        {sorted.length > 3 && (
          <button onClick={() => setOpenAll((o) => !o)} className="ff w-full rounded-xl text-sm mute py-2.5" style={{ border: "1px dashed #cfccbe" }}>
            {openAll ? "Toon minder" : "Toon alle " + sorted.length + " metingen"}
          </button>
        )}
      </div>
    </div>
  );
}

function HaccpForm({ editing, onCancel, onSave }) {
  const [checkDate, setCheckDate] = useState(editing ? editing.checkDate : new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState(() => {
    const v = {};
    HACCP_UNITS.forEach((u) => { v[u.id] = editing && editing.values[u.id] !== undefined && editing.values[u.id] !== null ? String(editing.values[u.id]) : ""; });
    return v;
  });
  const [calib, setCalib] = useState(editing && editing.calibration && editing.calibration.measured !== null && editing.calibration.measured !== undefined ? String(editing.calibration.measured) : "");
  const [note, setNote] = useState(editing ? editing.note || "" : "");
  const num = (x) => (x === "" || x === "-" ? null : Number(String(x).replace(",", ".")));
  const calibNum = num(calib);
  const calibOk = calibNum === null ? null : Math.abs(calibNum) <= CALIB_TOLERANCE;
  const submit = () => {
    const out = {};
    HACCP_UNITS.forEach((u) => { out[u.id] = num(values[u.id]); });
    onSave({ checkDate, values: out, calibration: { measured: calibNum, ok: calibOk === null ? null : calibOk }, note: note.trim() });
  };
  return (
    <div>
      <FormBar title={editing ? "Meting corrigeren" : "Temperatuurcontrole"} onCancel={onCancel} onSave={submit} saveLabel={editing ? "Opslaan" : "Aftekenen"} />
      <Field label="Datum"><input type="date" className={inputCls} value={checkDate} onChange={(e) => setCheckDate(e.target.value)} /></Field>
      <div className="text-sm font-medium ink mb-1.5">Gemeten temperaturen</div>
      <div className="card overflow-hidden mb-4">
        {HACCP_UNITS.map((u, i) => {
          const ok = inRange(u, num(values[u.id]));
          return (
            <div key={u.id} className={"px-3.5 py-3 " + (i > 0 ? "divi" : "")}>
              <div className="text-sm font-medium ink">{u.name}</div>
              <div className="text-[12.5px] mute mb-1.5">streef: {u.target}</div>
              <div className="flex items-center gap-2">
                <input type="number" step="0.1" inputMode="decimal" className="input px-2.5 py-2 flex-1" value={values[u.id]}
                  onChange={(e) => setValues((v) => ({ ...v, [u.id]: e.target.value }))} placeholder="gemeten temperatuur"
                  style={ok === false ? { borderColor: "#c08a7a", background: "#fdf6f4" } : undefined} />
                <span className="text-sm mute shrink-0">°C</span>
              </div>
            </div>
          );
        })}
      </div>
      {HACCP_UNITS.some((u) => inRange(u, num(values[u.id])) === false) && (
        <div className="rounded-xl p-3.5 mb-4 text-sm" style={{ background: "#f6ecea", border: "1px solid #e0c8c0", color: "#8a4a3a" }}>
          Eén of meer waarden vallen buiten de grenzen. Noteer hieronder welke maatregel je hebt genomen (product verplaatst, monteur gebeld, opnieuw gemeten).
        </div>
      )}
      <div className="text-sm font-medium ink mb-1.5">Thermometer ijken</div>
      <div className="card p-3.5 mb-4">
        <div className="text-[12.5px] mute mb-2">Steek de thermometer in een glas met smeltend ijswater. Hij hoort 0 °C aan te geven; meer dan {CALIB_TOLERANCE} °C afwijking betekent afstellen of vervangen.</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="number" step="0.1" inputMode="decimal" className="input px-2.5 py-2 flex-1 min-w-[8rem]" value={calib} onChange={(e) => setCalib(e.target.value)} placeholder="gemeten in ijswater (°C)"
            style={calibOk === false ? { borderColor: "#c08a7a", background: "#fdf6f4" } : undefined} />
          {calibOk === true && <span className="text-sm font-medium" style={{ color: T.green }}>✓ binnen tolerantie</span>}
          {calibOk === false && <span className="text-sm font-medium" style={{ color: "#8a4a3a" }}>⚠ afwijking van {String(Math.abs(calibNum)).replace(".", ",")} °C</span>}
        </div>
      </div>
      <Field label="Opmerking / genomen maatregel"><textarea rows={3} className={inputCls + " resize-none"} value={note} onChange={(e) => setNote(e.target.value)} placeholder="bv. vriescel stond op −16 °C, deur stond open, opnieuw gemeten na een uur: −19 °C" /></Field>
      <p className="text-xs mute -mt-2">Na opslaan wordt de schoonmaaktaak “Temperatuurcontrole” automatisch afgetekend op jouw naam.</p>
    </div>
  );
}

function CleaningTaskForm({ task, onCancel, onSave }) {
  const [name, setName] = useState(task?.name || "");
  const [area, setArea] = useState(task?.area || CLEANING_AREAS[0]);
  const [intervalDays, setIntervalDays] = useState(task ? String(task.intervalDays) : "7");
  const submit = () => { if (!name.trim()) return; onSave({ name: name.trim(), area, intervalDays: Number(intervalDays) || 1 }); };
  return (
    <div>
      <FormBar title={task ? "Taak bewerken" : "Nieuwe schoonmaaktaak"} onCancel={onCancel} onSave={submit} />
      <Field label="Wat moet er schoongemaakt worden?"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Vloer fermentatieruimte" /></Field>
      <Field label="Ruimte"><select className={inputCls} value={area} onChange={(e) => setArea(e.target.value)}>{CLEANING_AREAS.map((a) => <option key={a}>{a}</option>)}</select></Field>
      <Field label="Om de hoeveel dagen"><input type="number" min="1" className={inputCls} value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} /></Field>
      <div className="flex flex-wrap gap-1.5 -mt-2">
        {[1, 2, 3, 7, 14, 30, 90].map((d) => (
          <button key={d} type="button" onClick={() => setIntervalDays(String(d))} className={"ff rounded-full px-2.5 py-1 text-xs font-medium " + (String(d) === intervalDays ? "pillon" : "pill")}>{intervalLabel(d)}</button>
        ))}
      </div>
      <p className="text-xs mute mt-4">De taak verschijnt vanzelf bovenaan zodra hij weer aan de beurt is, en verdwijnt daar zodra iemand hem aftekent.</p>
    </div>
  );
}

// Dagelijkse controle om 16:45
function CleaningCheckModal({ tasks, logs, user, canEdit, onSign, onDayDone, onClose, onOpenSection }) {
  const withStatus = tasks.map((t) => ({ t, st: taskStatus(t, logs) }));
  const open = withStatus.filter((x) => x.st.due);
  const doneToday = logs.filter((l) => l.taskId !== DAY_DONE_ID && l.doneDate === localDate());
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,56,35,0.45)" }}>
      <div className="w-full max-w-md rounded-2xl p-5 shadow-xl" style={{ background: T.paper, maxHeight: "80vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="serif ink text-xl leading-tight">Schoonmaakcontrole</div>
            <div className="text-xs mute mt-0.5">Het is {String(CHECK_HOUR).padStart(2, "0")}:{String(CHECK_MIN).padStart(2, "0")} — tijd om af te tekenen.</div>
          </div>
          <button onClick={onClose} className="ff mute hover:opacity-70"><X size={18} /></button>
        </div>
        <button onClick={onDayDone} className="btnp ff w-full mt-3 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold px-3 py-3"><Check size={16} /> Dag afgerond</button>
        <div className="mt-3 text-sm" style={{ color: "#3b3d33" }}>
          Vandaag afgetekend: <span className="font-medium ink">{doneToday.length}</span> · nog open: <span className="font-medium ink">{open.length}</span>
        </div>
        {open.length === 0
          ? <div className="mt-3 rounded-xl p-3.5 text-sm flex items-center gap-2" style={{ background: "#e8ebe0", color: T.green }}><Check size={16} /> Alles is afgetekend. Mooi werk.</div>
          : <div className="card overflow-hidden mt-3">
              {open.map((x, i) => (
                <div key={x.t.id} className={"flex items-center gap-2 px-3 py-2.5 " + (i > 0 ? "divi" : "")}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm ink truncate">{x.t.name}</div>
                    <div className="text-[12.5px] mute">{x.t.area}{x.st.overdue && <span className="ml-1 font-semibold" style={{ color: "#8a4a3a" }}>over tijd</span>}</div>
                  </div>
                  {canEdit && <button onClick={() => onSign(x.t.id)} className="btnp ff shrink-0 inline-flex items-center gap-1 rounded-lg text-xs font-semibold px-2 py-1.5"><Check size={13} /> {user.name}</button>}
                </div>
              ))}
            </div>}
        <div className="flex items-center gap-2 mt-4">
          <button onClick={onOpenSection} className="btno ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2">Naar schoonmaaklijst</button>
          <button onClick={onClose} className="ff text-sm mute underline">Sluiten</button>
        </div>
      </div>
    </div>
  );
}

function BackBar({ onBack, onEdit }) {
  return (
    <div className="flex items-center justify-between pt-3 pb-2">
      <button onClick={onBack} className="ff inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2.5 hover:opacity-80" style={{ background: "#e8ebe0", color: T.green }}><ArrowLeft size={18} /> Terug</button>
      {onEdit && <button onClick={onEdit} className="ff inline-flex items-center gap-1.5 text-sm font-medium acc rounded-lg px-3 py-2.5 hover:opacity-70" style={{ border: "1px solid #cfe0c4" }}><Pencil size={15} /> Bewerken</button>}
    </div>
  );
}
function EditMeta({ by, at }) { return <div className="flex items-center gap-1.5 text-xs mute mt-2"><Clock size={12} /> Laatst bewerkt door <span className="ink font-medium">{by}</span> · {at}</div>; }
function Eyebrow({ children }) { return <h3 className="text-[12.5px] font-semibold uppercase tracking-widest acc mb-2">{children}</h3>; }

function DishDetail({ dish, recipeById, canEdit, onBack, onEdit, onOpenRecipe, onDelete }) {
  if (!dish) return null;
  return (
    <div>
      <BackBar onBack={onBack} onEdit={canEdit ? onEdit : null} />
      <div className="text-[12.5px] font-semibold uppercase tracking-widest acc mb-1">{dish.course}</div>
      <h1 className="serif ink text-3xl leading-tight">{dish.name}</h1>
      <div className="flex flex-wrap gap-2 mt-2.5">{dish.season && dish.season.map((s) => <SeasonPill key={s} s={s} />)}{dish.diet && dish.diet !== "Vegetarisch" && <MeatPill diet={dish.diet} />}</div>
      <p className="mute mt-2 leading-relaxed">{dish.description}</p>
      {canEdit && (
        <button onClick={() => onDelete(dish.id)} className="ff mt-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }}><Trash2 size={15} /> Verwijderen</button>
      )}
      <EditMeta by={dish.updatedBy} at={dish.updatedAt} />
      <SectionTitle>Onderdelen</SectionTitle>
      <div className="space-y-2">
        {dish.recipeIds.map((id) => { const r = recipeById(id); if (!r) return null; return (
          <button key={id} onClick={() => onOpenRecipe(id)} className="card cardh ff w-full text-left p-3.5 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#e8ebe0", color: T.green }}><Layers size={15} /></span>
            <div className="flex-1 min-w-0"><div className="font-medium ink truncate">{r.name}</div><div className="text-xs mute">{r.category}</div></div>
            <ChevronRight size={16} style={{ color: "#c4c2b2" }} />
          </button>
        ); })}
      </div>
      {dish.plating && <><SectionTitle>Dressering</SectionTitle><p className="card p-4 mute leading-relaxed">{dish.plating}</p></>}
    </div>
  );
}

function RecipeDetail({ recipe, user, canEdit, usageCount, openCount, baseRecipe, variations, onBack, onEdit, onEndorse, onOpenRecipe, onStartBatch, onDelete }) {
  const [factor, setFactor] = useState(1);
  if (!recipe) return null;
  const endorsed = recipe.endorsements.includes(user.name);
  const fmt = (f) => { const r = Math.round(f * 100) / 100; return String(r).replace(".", ","); };
  const critical = criticalValues(recipe);
  return (
    <div>
      <BackBar onBack={onBack} onEdit={canEdit ? onEdit : null} />
      <h1 className="serif ink text-3xl leading-tight">{recipe.name}</h1>
      <div className="flex flex-wrap gap-2 mt-3">
        <Chip>{recipe.category}</Chip>
        {recipe.fermentMethod && <Chip>{recipe.fermentMethod}</Chip>}
        {recipe.gear && <Chip>{recipe.gear}</Chip>}
        {recipe.garden && <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1" style={{ background: "#e4ecdc", color: "#3f5a34" }}><Sprout size={12} /> eigen tuin</span>}
        {recipe.season.filter((s) => s !== "Hele jaar").map((s) => <SeasonPill key={s} s={s} />)}
        {recipe.diet !== "Vegetarisch" && <MeatPill diet={recipe.diet} />}
        {recipe.isBase && <span className="inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-1" style={{ background: "#e8ebe0", color: T.green }}><GitBranch size={12} /> basisrecept</span>}
      </div>

      {baseRecipe && <button onClick={() => onOpenRecipe(baseRecipe.id)} className="ff mt-3 inline-flex items-center gap-1.5 text-sm acc hover:opacity-70"><GitBranch size={14} /> Variatie op {recipe.baseName} — bekijk de basis</button>}

      {critical.length > 0 && (
        <div className="mt-4 rounded-xl p-3.5 text-sm" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
          <div className="font-semibold flex items-center gap-1.5 mb-1"><Info size={14} /> Let op de kritische waarden</div>
          <ul className="list-disc list-inside space-y-0.5">{critical.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button onClick={() => onEndorse(recipe.id)} className={"ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2 " + (endorsed ? "btnp" : "btno")}><Heart size={15} fill={endorsed ? "currentColor" : "none"} /> {endorsed ? "Geliked" : "Like"} · {recipe.endorsements.length}</button>
          {recipe.ferment && <button onClick={onStartBatch} className="ff btno inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2"><FlaskConical size={15} /> Registreer batch</button>}
          <button onClick={() => onDelete(recipe.id)} className="ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }}><Trash2 size={15} /> Verwijderen</button>
        </div>
      )}
      <div className="text-xs mute mt-2.5">Gebruikt in {usageCount} {usageCount === 1 ? "gerecht" : "gerechten"}{typeof openCount === "number" && openCount > 0 && <> · {openCount}× geopend</>}{recipe.endorsements.length > 0 && <> · geliket door {recipe.endorsements.join(", ")}</>}</div>
      <EditMeta by={recipe.updatedBy} at={recipe.updatedAt} />

      <div className="flex items-center gap-2 mt-6 mb-1 flex-wrap">
        <span className="text-[12.5px] font-semibold uppercase tracking-widest acc">Hoeveelheid</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setFactor((f) => Math.max(0.015625, f / 2))} className="ff pill rounded-md w-8 h-8 flex items-center justify-center text-xs font-bold" title="Halveren">×½</button>
          <button onClick={() => setFactor((f) => Math.min(64, f * 2))} className="ff pill rounded-md w-8 h-8 flex items-center justify-center text-xs font-bold" title="Verdubbelen">×2</button>
          <span className="pillon rounded-md px-2.5 h-8 flex items-center text-xs font-semibold">×{fmt(factor)}</span>
          {factor !== 1 && <button onClick={() => setFactor(1)} className="ff mute text-xs underline">reset</button>}
        </div>
        {factor !== 1 && <span className="text-xs mute">Opbrengst: {scaleAmount(recipe.yield, factor)}</span>}
      </div>
      <div className="card overflow-hidden">
        {recipe.ingredients.map((ing, i) => (
          <div key={i} className={"flex items-center justify-between px-4 py-2.5 text-sm " + (i > 0 ? "divi" : "")}><span style={{ color: "#3b3d33" }}>{ing.item}</span><span className={"font-medium " + (factor !== 1 ? "acc" : "mute")}>{scaleAmount(ing.amount, factor)}</span></div>
        ))}
      </div>

      {recipe.fermentDefaults && (
        <div className="mt-4 tintbox rounded-xl p-4 text-sm" style={{ color: "#3f5238" }}>
          <div className="font-semibold flex items-center gap-1.5 mb-1"><FlaskConical size={14} /> Fermentatie-richtlijn</div>
          Zout {recipe.fermentDefaults.saltPct}% · ±{recipe.fermentDefaults.tempC}°C · ±{recipe.fermentDefaults.days} dagen.
          {recipe.fermentMethod && FERMENT_TARGETS[recipe.fermentMethod] && <> {FERMENT_TARGETS[recipe.fermentMethod].note}</>}
        </div>
      )}

      <SectionTitle>Bereiding</SectionTitle>
      <ol className="space-y-2.5">
        {recipe.steps.map((s, i) => (<li key={i} className="flex gap-3"><span className="w-6 h-6 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center mt-0.5" style={{ background: T.green, color: T.paper }}>{i + 1}</span><span className="leading-relaxed" style={{ color: "#3b3d33" }}>{s}</span></li>))}
      </ol>

      {recipe.isBase && variations.length > 0 && (
        <><SectionTitle>Variaties ({variations.length})</SectionTitle>
        <div className="flex flex-wrap gap-2">{variations.map((v) => <button key={v.id} onClick={() => onOpenRecipe(v.id)} className="btno ff rounded-full text-sm px-3 py-1.5">{v.name}</button>)}</div></>
      )}
    </div>
  );
}

// Bepaalt welke waarden bij dit recept expliciet bewaakt moeten worden.
function criticalValues(r) {
  const out = [];
  const cat = (r.category || "").toLowerCase();
  const name = (r.name || "").toLowerCase();
  if (r.ferment && r.fermentMethod === "Melkzuur") out.push("Zuurgraad: pH moet onder 3,5 zakken (voedselveilig). Meet met een pH-meter, niet op het oog.");
  if (r.ferment && r.fermentMethod === "Azijnfermentatie") out.push("Zuurgraad: verzuurt tot pH ~2,5–3,0. Heeft zuurstof nodig — afdekken met doek, geen luchtdicht deksel.");
  if (r.ferment && r.fermentMethod === "Suikerfermentatie") out.push("Suiker & druk: houd het suikergehalte en de bruis in de gaten; ontlucht flessen dagelijks.");
  if (r.fermentDefaults && typeof r.fermentDefaults.saltPct === "number" && r.fermentDefaults.saltPct > 0) out.push("Zoutgehalte: weeg exact " + String(r.fermentDefaults.saltPct).replace(".", ",") + "% van het productgewicht af — bepaalt de veiligheid.");
  if (!r.ferment && (cat.includes("pickle") || cat.includes("zuur")) ) out.push("Zuurgraad: gebruik voldoende azijn in de pekel voor houdbaarheid.");
  if (!r.ferment && (cat.includes("jam") || cat.includes("compote") || name.includes("jam") || name.includes("confituur"))) out.push("Suiker & zuur: suiker- en citroenzuurverhouding bepalen de gelering en houdbaarheid — zie Technieken › Jam.");
  if (cat.includes("sorbet") || cat.includes("ijs")) out.push("Suikergehalte: bepaalt de zachtheid/schepbaarheid — zie Technieken › Roomijs & sorbet.");
  return out;
}

function SectionTitle({ children }) { return <h2 className="text-[12.5px] font-semibold uppercase tracking-widest acc mt-7 mb-2.5">{children}</h2>; }
function Chip({ children }) { return <span className="chip inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1">{children}</span>; }
function Empty({ label }) { return <div className="text-center text-sm mute card py-10 px-4" style={{ borderStyle: "dashed" }}>{label}</div>; }
function Field({ label, children }) { return <label className="block mb-4"><span className="block text-sm font-medium ink mb-1.5">{label}</span>{children}</label>; }

function FormBar({ title, onCancel, onSave, saveLabel = "Opslaan" }) {
  return (
    <div className="flex items-center justify-between pt-4 pb-4">
      <button onClick={onCancel} className="ff inline-flex items-center gap-1 text-sm mute hover:opacity-70"><X size={16} /> Annuleren</button>
      <span className="serif ink text-lg">{title}</span>
      <button onClick={onSave} className="btnp ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2"><Check size={16} /> {saveLabel}</button>
    </div>
  );
}

function RecipeForm({ recipe, fermentDefault, onCancel, onSave }) {
  const [name, setName] = useState(recipe?.name || "");
  const [category, setCategory] = useState(recipe?.category || (fermentDefault ? "Fermentatie" : ""));
  const [yieldVal, setYieldVal] = useState(recipe?.yield || "");
  const [ingredients, setIngredients] = useState(recipe?.ingredients?.length ? recipe.ingredients : [{ item: "", amount: "" }]);
  const [steps, setSteps] = useState(recipe?.steps?.length ? recipe.steps : [""]);
  const [seasons, setSeasons] = useState((recipe?.season || []).filter((s) => s !== "Hele jaar"));
  const [diet, setDiet] = useState(recipe?.diet || "Vegetarisch");
  const [ferment, setFerment] = useState(!!recipe?.ferment || !!fermentDefault);
  const [fermentMethod, setFermentMethod] = useState(recipe?.fermentMethod || "Melkzuur");
  const fd = recipe?.fermentDefaults;
  const [fSalt, setFSalt] = useState(fd ? String(fd.saltPct) : "2.5");
  const [fTemp, setFTemp] = useState(fd ? String(fd.tempC) : "20");
  const [fDays, setFDays] = useState(fd ? String(fd.days) : "10");
  const [translating, setTranslating] = useState(false);
  const [err, setErr] = useState(null);
  const setIng = (i, k, v) => setIngredients((a) => a.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const setStep = (i, v) => setSteps((a) => a.map((x, idx) => (idx === i ? v : x)));
  // Eén veld opdelen zodra de kok het verlaat, en een knop om alles te verdelen.
  const splitOne = (i) => setSteps((a) => {
    const parts = splitSteps(a[i]);
    if (parts.length < 2) return a;
    return [...a.slice(0, i), ...parts, ...a.slice(i + 1)];
  });
  const splitAll = () => setSteps((a) => a.flatMap((x) => { const p = splitSteps(x); return p.length ? p : [x]; }));
  const toggleSeason = (s) => setSeasons((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
  async function handleTranslate() {
    setTranslating(true); setErr(null);
    try {
      const prompt = "Je bent een professionele Nederlandse keukenvertaler. Vertaal de tekstvelden naar het Nederlands, laat al-Nederlandse velden ongewijzigd, en houd hoeveelheden/eenheden exact gelijk. Geef UITSLUITEND geldige JSON terug, zonder markdown, in deze vorm:\n{\"name\":\"...\",\"category\":\"...\",\"yield\":\"...\",\"ingredients\":[{\"item\":\"...\",\"amount\":\"...\"}],\"steps\":[\"...\"]}\n\nRecept:\n" + JSON.stringify({ name, category, yield: yieldVal, ingredients, steps });
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json();
      const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      const p = JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
      if (p.name) setName(p.name); if (p.category) setCategory(p.category); if (p.yield) setYieldVal(p.yield);
      if (Array.isArray(p.ingredients) && p.ingredients.length) setIngredients(p.ingredients);
      if (Array.isArray(p.steps) && p.steps.length) setSteps(p.steps);
    } catch (e) { setErr("Vertalen lukte niet. Probeer opnieuw."); } finally { setTranslating(false); }
  }
  const submit = () => { if (!name.trim()) return; onSave({
    name: name.trim(), category: category.trim() || "Zonder categorie", yield: yieldVal.trim() || "—",
    ingredients: ingredients.filter((x) => x.item.trim()), steps: steps.filter((x) => x.trim()),
    season: seasons.length ? SEASONS.filter((s) => seasons.includes(s)) : ["Hele jaar"],
    diet,
    ferment,
    fermentMethod: ferment ? fermentMethod : null,
    fermentDefaults: ferment ? { saltPct: Number(String(fSalt).replace(",", ".")) || 0, tempC: Number(fTemp) || 20, days: Number(fDays) || 0 } : null,
  }); };
  return (
    <div>
      <FormBar title={recipe ? "Recept bewerken" : "Nieuw recept"} onCancel={onCancel} onSave={submit} />
      <button onClick={handleTranslate} disabled={translating} className="ff w-full mb-1.5 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium py-2.5 disabled:opacity-60" style={{ background: "#eef1e7", border: "1px solid #d6ddc9", color: T.green }}>{translating ? (<><Loader2 size={15} className="animate-spin" /> Bezig met vertalen…</>) : (<><Languages size={15} /> Vertaal naar Nederlands</>)}</button>
      <p className="text-xs mute mb-4">Recept in een andere taal? Vertaal in één tik.</p>
      {err && <p className="text-xs mb-3" style={{ color: "#a23b2c" }}>{err}</p>}
      <Field label="Naam"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Gefermenteerde rode biet" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categorie"><select className={inputCls} value={RECIPE_CATEGORIES.includes(category) ? category : (category ? "__custom" : "")} onChange={(e) => { if (e.target.value === "__custom") setCategory(category && !RECIPE_CATEGORIES.includes(category) ? category : "Zonder categorie"); else setCategory(e.target.value); }}>
          <option value="" disabled>Kies een categorie…</option>
          {RECIPE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__custom">Anders…</option>
        </select></Field>
        <Field label="Opbrengst"><input className={inputCls} value={yieldVal} onChange={(e) => setYieldVal(e.target.value)} placeholder="1 pot" /></Field>
      </div>
      {category && !RECIPE_CATEGORIES.includes(category) && <Field label="Eigen categorie"><input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Typ een categorie" /></Field>}
      <div className="text-sm font-medium ink mb-1.5">Seizoen <span className="mute font-normal">(niets gekozen = hele jaar)</span></div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SEASONS.map((s) => (
          <button key={s} type="button" onClick={() => toggleSeason(s)} className={"ff rounded-full px-3 py-1.5 text-xs font-medium " + (seasons.includes(s) ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <Field label="Dieet"><select className={inputCls} value={diet} onChange={(e) => setDiet(e.target.value)}>{["Vegetarisch","Varkensvlees","Rundvlees"].map((d) => <option key={d}>{d}</option>)}</select></Field>
      <div className="tintbox rounded-xl p-4 mb-4">
        <button type="button" onClick={() => setFerment((f) => !f)} className="ff w-full flex items-center gap-3 text-left">
          <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={ferment ? { background: T.green, color: T.paper } : { border: "1px solid #cfccbe", background: "#fff" }}>{ferment && <Check size={13} />}</span>
          <span className="text-sm font-medium ink inline-flex items-center gap-1.5"><FlaskConical size={15} className="acc" /> Dit is een fermentatierecept</span>
        </button>
        {ferment && (
          <div className="mt-3">
            <Field label="Fermentatiemethode"><select className={inputCls} value={fermentMethod} onChange={(e) => setFermentMethod(e.target.value)}>{FERMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></Field>
            <div className="text-sm font-medium ink mb-1.5">Batchrichtlijn <span className="mute font-normal">(voorgevuld bij een nieuwe batch)</span></div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Zout (%)"><input type="number" step="0.1" className={inputCls} value={fSalt} onChange={(e) => setFSalt(e.target.value)} /></Field>
              <Field label="Temp (°C)"><input type="number" className={inputCls} value={fTemp} onChange={(e) => setFTemp(e.target.value)} /></Field>
              <Field label="Dagen"><input type="number" className={inputCls} value={fDays} onChange={(e) => setFDays(e.target.value)} /></Field>
            </div>
            <p className="text-xs mute -mt-2">Verschijnt met de methode als filter op de fermentatiepagina, en is daar direct als batch te starten.</p>
          </div>
        )}
      </div>
      <div className="text-sm font-medium ink mb-1.5">Ingrediënten</div>
      <div className="space-y-2 mb-2">{ingredients.map((ing, i) => (
        <div key={i} className="flex gap-2">
          <input className={inputCls + " flex-1 min-w-0"} style={{ width: "auto" }} value={ing.item} onChange={(e) => setIng(i, "item", e.target.value)} placeholder="Ingrediënt" />
          <input className={inputCls} style={{ width: "7rem", flex: "0 0 7rem" }} value={ing.amount} onChange={(e) => setIng(i, "amount", e.target.value)} placeholder="Hoeveelheid" />
          <button onClick={() => setIngredients((a) => a.filter((_, idx) => idx !== i))} className="mute hover:opacity-60 px-1"><Trash2 size={16} /></button>
        </div>))}
      </div>
      <AddRow onClick={() => setIngredients((a) => [...a, { item: "", amount: "" }])} label="Ingrediënt toevoegen" />
      <div className="flex items-center justify-between gap-2 mt-5 mb-1.5">
        <span className="text-sm font-medium ink">Bereiding</span>
        {steps.some((x) => splitSteps(x).length > 1) && (
          <button type="button" onClick={splitAll} className="ff inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70"><GitBranch size={13} /> Verdeel in stappen</button>
        )}
      </div>
      <p className="text-xs mute mb-2 -mt-1">Typ of plak gerust de hele bereiding in één vak — bij het verlaten van het vak deelt de app hem zelf op in stappen, die je daarna gewoon kunt bijschaven.</p>
      <div className="space-y-2 mb-2">{steps.map((s, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="w-6 h-6 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center mt-2" style={{ background: "#e8ebe0", color: T.green }}>{i + 1}</span>
          <textarea rows={2} className={inputCls + " flex-1 resize-none"} value={s} onChange={(e) => setStep(i, e.target.value)} onBlur={() => splitOne(i)} placeholder="Beschrijf de stap — of plak de hele bereiding" />
          <button onClick={() => setSteps((a) => a.filter((_, idx) => idx !== i))} className="mute hover:opacity-60 px-1 mt-2"><Trash2 size={16} /></button>
        </div>))}
      </div>
      <AddRow onClick={() => setSteps((a) => [...a, ""])} label="Stap toevoegen" />
    </div>
  );
}

function DishForm({ dish, draft, allRecipes, recipeById, onCancel, onSave, onNewRecipe }) {
  const init = draft || dish;
  const [name, setName] = useState(init?.name || "");
  const [course, setCourse] = useState(init?.course || "");
  const [description, setDescription] = useState(init?.description || "");
  const [plating, setPlating] = useState(init?.plating || "");
  const [recipeIds, setRecipeIds] = useState(init?.recipeIds || []);
  const [seasons, setSeasons] = useState((init?.season || []).filter((s) => s !== "Hele jaar"));
  const [diet, setDiet] = useState(init?.diet || "Vegetarisch");
  const [pick, setPick] = useState("");
  const [limit, setLimit] = useState(40);
  const toggle = (id) => setRecipeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const toggleSeason = (s) => setSeasons((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
  const suggestCourse = (g) => setCourse(seasons.length === 1 ? seasons[0] + g.toLowerCase() : g);
  const q = pick.trim().toLowerCase();
  const found = q ? allRecipes.filter((r) => softMatchAny([r.name, r.category], q)) : allRecipes;
  const matches = found.slice(0, limit);
  const currentState = () => ({ name, course, description, plating, recipeIds, season: SEASONS.filter((s) => seasons.includes(s)), diet });
  const submit = () => { if (!name.trim()) return; onSave({ ...currentState(), name: name.trim(), course: course.trim() || "Gerecht", description: description.trim(), plating: plating.trim() }); };
  return (
    <div>
      <FormBar title={dish ? "Gerecht bewerken" : "Nieuw gerecht"} onCancel={onCancel} onSave={submit} />
      <Field label="Naam"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Drie bieten uit eigen tuin" /></Field>
      <div className="text-sm font-medium ink mb-1.5">Seizoen <span className="mute font-normal">(voor het seizoensfilter)</span></div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SEASONS.map((s) => (
          <button key={s} type="button" onClick={() => toggleSeason(s)} className={"ff rounded-full px-3 py-1.5 text-xs font-medium " + (seasons.includes(s) ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <Field label="Gang"><input className={inputCls} value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Herfstvoorgerecht" /></Field>
      <div className="flex flex-wrap gap-1.5 -mt-2 mb-4">
        {DISH_COURSES.map((g) => (
          <button key={g} type="button" onClick={() => suggestCourse(g)} className="ff pill rounded-full px-2.5 py-1 text-xs font-medium">{g}</button>
        ))}
      </div>
      <Field label="Dieet"><select className={inputCls} value={diet} onChange={(e) => setDiet(e.target.value)}>{["Vegetarisch","Varkensvlees","Rundvlees"].map((d) => <option key={d}>{d}</option>)}</select></Field>
      <Field label="Omschrijving"><textarea rows={2} className={inputCls + " resize-none"} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Korte regel over het gerecht" /></Field>
      <div className="text-sm font-medium ink mb-1.5 mt-1">Recepten in dit gerecht <span className="mute font-normal">({recipeIds.length})</span></div>
      {recipeIds.length > 0 && <div className="flex flex-wrap gap-1.5 mb-2">{recipeIds.map((id, i) => { const r = recipeById(id); if (!r) return null; return <span key={id} className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2 py-1" style={{ background: "#e8ebe0", color: T.green }}>#{i + 1} {r.name}<button onClick={() => toggle(id)}><X size={12} /></button></span>; })}</div>}
      <div className="relative mb-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" /><input value={pick} onChange={(e) => { setPick(e.target.value); setLimit(40); }} placeholder="Zoek een recept om toe te voegen" className={inputCls + " pl-9"} /></div>
      {onNewRecipe && (
        <button type="button" onClick={() => onNewRecipe(currentState())} className="btno ff mb-2 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2"><Plus size={15} /> Nieuw recept maken en toevoegen</button>
      )}
      <div className="text-xs mute mb-1.5">{found.length} {found.length === 1 ? "recept" : "recepten"} beschikbaar</div>
      <div className="card overflow-auto mb-2 max-h-72">
        {matches.map((r, i) => { const on = recipeIds.includes(r.id); return (
          <button key={r.id} onClick={() => toggle(r.id)} className={"ff w-full flex items-center gap-3 px-4 py-3 text-left " + (i > 0 ? "divi" : "")}>
            <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={on ? { background: T.green, color: T.paper } : { border: "1px solid #cfccbe" }}>{on && <Check size={13} />}</span>
            <div className="flex-1 min-w-0"><div className="text-sm font-medium ink truncate">{r.name}</div><div className="text-xs mute">{r.category}</div></div>
          </button>); })}
        {matches.length === 0 && <div className="px-4 py-6 text-center text-sm mute">Geen recept gevonden.</div>}
      </div>
      {found.length > limit && <button type="button" onClick={() => setLimit((l) => l + 100)} className="ff w-full rounded-xl text-sm mute py-2.5 mb-5" style={{ border: "1px dashed #cfccbe" }}>Toon meer ({found.length - limit} resterend)</button>}
      {found.length <= limit && <div className="mb-5" />}
      <Field label="Dressering"><textarea rows={3} className={inputCls + " resize-none"} value={plating} onChange={(e) => setPlating(e.target.value)} placeholder="Hoe het op het bord komt" /></Field>
    </div>
  );
}

function BatchForm({ prefill, editing, fermentRecipes, onCancel, onSave }) {
  const src = editing || prefill;
  const fd = prefill?.fermentDefaults;
  const [product, setProduct] = useState(editing ? editing.product : (prefill ? prefill.name : ""));
  const [type, setType] = useState(editing ? (editing.method || editing.type) : (prefill?.fermentMethod || "Melkzuur"));
  const [recipeId, setRecipeId] = useState(editing ? (editing.recipeId || null) : (prefill?.id || null));
  const [startDate, setStartDate] = useState(editing ? editing.startDate : new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(editing ? String(editing.days) : (fd ? String(fd.days) : "10"));
  const [saltPct, setSaltPct] = useState(editing ? String(editing.saltPct) : (fd ? String(fd.saltPct) : "2.5"));
  const [tempC, setTempC] = useState(editing ? String(editing.tempC) : (fd ? String(fd.tempC) : "20"));
  const [amount, setAmount] = useState(editing ? (editing.amount === "—" ? "" : editing.amount) : "");
  const [pH, setPH] = useState(editing && editing.pH != null ? String(editing.pH) : "");
  const [notes, setNotes] = useState(editing ? editing.notes : "");
  const [pick, setPick] = useState("");
  const applyRecipe = (r) => {
    setProduct(r.name); setRecipeId(r.id);
    if (r.fermentMethod) setType(r.fermentMethod);
    if (r.fermentDefaults) { setSaltPct(String(r.fermentDefaults.saltPct)); setTempC(String(r.fermentDefaults.tempC)); setDays(String(r.fermentDefaults.days)); }
    setPick("");
  };
  const pickMatches = pick.trim() ? (fermentRecipes || []).filter((r) => softMatchAny([r.name, r.fermentMethod, r.category], pick)).slice(0, 8) : [];
  const isMethod = FERMENT_METHODS.includes(type);
  const tgt = FERMENT_TARGETS[type];
  const submit = () => { if (!product.trim()) return; onSave({ product: product.trim(), type, method: isMethod ? type : type, recipeId, startDate, days: Number(days) || 0, saltPct: Number(saltPct) || 0, tempC: Number(tempC) || 0, amount: amount.trim() || "—", pH: pH ? Number(pH) : null, notes: notes.trim(), done: editing ? editing.done : false }); };
  return (
    <div>
      <FormBar title={editing ? "Batch bewerken" : "Nieuwe batch"} onCancel={onCancel} onSave={submit} saveLabel={editing ? "Opslaan" : "Registreer"} />
      {!editing && <>
        <div className="text-sm font-medium ink mb-1.5">Kies een fermentatierecept <span className="mute font-normal">(vult naam, methode en richtlijn in)</span></div>
        <div className="relative mb-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" /><input value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Zoek een fermentatierecept" className={inputCls + " pl-9"} /></div>
        {pickMatches.length > 0 && (
          <div className="card overflow-hidden mb-4">
            {pickMatches.map((r, i) => (
              <button key={r.id} onClick={() => applyRecipe(r)} className={"ff w-full flex items-center gap-3 px-4 py-3 text-left " + (i > 0 ? "divi" : "")}>
                <FlaskConical size={15} className="acc shrink-0" />
                <div className="flex-1 min-w-0"><div className="text-sm font-medium ink truncate">{r.name}</div><div className="text-xs mute">{r.fermentMethod || r.category}{r.fermentDefaults ? " · " + r.fermentDefaults.saltPct + "% · " + r.fermentDefaults.days + " dgn" : ""}</div></div>
              </button>
            ))}
          </div>
        )}
      </>}
      <Field label="Product / recept"><input className={inputCls} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="bv. Zuurkool van rode kool" /></Field>
      <Field label="Type / methode"><select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>{["Melkzuur","Suikerfermentatie","Azijnfermentatie","Zuurkool","Kimchi","Hotsauce","Kappertjes","Kombucha","Waterkefir","Gemberbier","Wilde drank","Landwijn / cider","Zuivel","Zoutpruimen","Anders"].map((t) => <option key={t}>{t}</option>)}</select></Field>
      {tgt && <p className="text-xs mute -mt-2 mb-4">{tgt.note}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Startdatum"><input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="Duur (dagen)"><input type="number" className={inputCls} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
        <Field label="Zoutgehalte (%)"><input type="number" step="0.1" className={inputCls} value={saltPct} onChange={(e) => setSaltPct(e.target.value)} /></Field>
        <Field label="Temperatuur (°C)"><input type="number" className={inputCls} value={tempC} onChange={(e) => setTempC(e.target.value)} /></Field>
        <Field label="Hoeveelheid"><input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="bv. 3 kg" /></Field>
        <Field label="Start-pH (optioneel)"><input type="number" step="0.1" className={inputCls} value={pH} onChange={(e) => setPH(e.target.value)} placeholder="bv. 6,0" /></Field>
      </div>
      <Field label="Notities"><textarea rows={2} className={inputCls + " resize-none"} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Waarnemingen, proefnotities…" /></Field>
      <p className="text-xs mute -mt-2">Metingen (pH, suiker) over de dagen leg je vast in het logboek, na het opslaan van de batch.</p>
    </div>
  );
}

function BatchLogScreen({ batch, canEdit, onBack, onAdd, onDeleteRow }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ph, setPh] = useState("");
  const [brix, setBrix] = useState("");
  const [tempC, setTempC] = useState("");
  const [note, setNote] = useState("");
  if (!batch) return null;
  const tgt = FERMENT_TARGETS[batch.method] || FERMENT_TARGETS[batch.type];
  const rows = [...(batch.log || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const submit = () => { if (!date) return; onAdd(batch.id, { date, ph, brix, tempC, note }); setPh(""); setBrix(""); setTempC(""); setNote(""); };
  return (
    <div>
      <BackBar onBack={onBack} />
      <div className="text-[12.5px] font-semibold uppercase tracking-widest acc mb-1">Fermentatie-logboek</div>
      <h1 className="serif ink text-2xl leading-tight">{batch.product}</h1>
      <div className="flex flex-wrap gap-2 mt-2 text-xs mute">
        <span className="inline-flex items-center gap-1"><Calendar size={12} /> Start {batch.startDate}</span>
        {batch.finishedDate && <span className="inline-flex items-center gap-1"><Check size={12} /> Afgerond {batch.finishedDate}</span>}
        <span className="inline-flex items-center gap-1"><FlaskConical size={12} /> {batch.method || batch.type}</span>
        {tgt && tgt.phEnd != null && <span className="inline-flex items-center gap-1">Doel pH ≤ {String(tgt.phEnd).replace(".", ",")}</span>}
      </div>
      <p className="text-xs mute mt-2">Leg pH en suikergehalte over de dagen vast. Dit logboek toont het verloop en dient als bewijs voor de Keuringsdienst van Waren.</p>

      {canEdit && (
        <div className="card p-4 mt-4">
          <div className="text-sm font-medium ink mb-3">Nieuwe meting</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="pH"><input type="number" step="0.01" className={inputCls} value={ph} onChange={(e) => setPh(e.target.value)} placeholder="bv. 3,8" /></Field>
            <Field label="Suiker (°Brix)"><input type="number" step="0.1" className={inputCls} value={brix} onChange={(e) => setBrix(e.target.value)} placeholder="optioneel" /></Field>
            <Field label="Temp (°C)"><input type="number" className={inputCls} value={tempC} onChange={(e) => setTempC(e.target.value)} placeholder="optioneel" /></Field>
          </div>
          <Field label="Notitie"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="bv. geproefd, mooi zuur" /></Field>
          <button onClick={submit} className="btnp ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-4 py-2.5"><Plus size={15} /> Meting toevoegen</button>
        </div>
      )}

      <SectionTitle>Metingen ({rows.length})</SectionTitle>
      {rows.length === 0 ? <Empty label="Nog geen metingen vastgelegd." /> : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-x-3 px-4 py-2 text-[12.5px] font-semibold uppercase tracking-wide acc" style={{ borderBottom: "1px solid " + T.line }}>
            <span>Datum</span><span>pH</span><span>°Bx</span><span>°C</span><span></span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={"grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-x-3 items-center px-4 py-2.5 text-sm " + (i > 0 ? "divi" : "")}>
              <span className="mute text-xs">{r.date}</span>
              <span className="ink font-medium">{r.ph != null ? String(r.ph).replace(".", ",") : "—"}</span>
              <span className="mute">{r.brix != null ? String(r.brix).replace(".", ",") : "—"}</span>
              <span className="mute">{r.tempC != null ? r.tempC : "—"}</span>
              {canEdit ? <button onClick={() => onDeleteRow(batch.id, batch.log.indexOf(r))} className="justify-self-end hover:opacity-70" style={{ color: "#8a4a3a" }}><Trash2 size={13} /></button> : <span />}
              {r.note && <span className="col-span-5 text-xs mute italic mt-0.5">{r.note}{r.by ? " · " + r.by : ""}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddRow({ onClick, label }) { return <button onClick={onClick} className="ff inline-flex items-center gap-1.5 text-sm font-medium acc hover:opacity-70"><Plus size={15} /> {label}</button>; }
