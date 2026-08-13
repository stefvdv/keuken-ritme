import React, { useState, useEffect } from "react";
import {
  ChefHat, Utensils, Layers, Plus, Search, ChevronRight, ArrowLeft, Pencil, X, Check,
  Settings, Download, Share, Smartphone, Info,
  Clock, LogOut, Trash2, Lock, Languages, Loader2, ThumbsUp, Star, GitBranch, Sprout,
  FlaskConical, Blend, Eye, Calendar, Thermometer, Percent,
  Heart, BookOpen, Bell, LineChart, ChevronDown, ChevronUp, Home, Sparkles, Printer, AlertTriangle, Minus, Tag, RotateCcw, Receipt
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
// Vast apparaat-account voor de wachtwoord-login (accounts per kok bestaan niet
// meer in de app). Wil je later een neutraal keuken-account: maak in Supabase
// (Authentication → Users) bv. keuken@debeug.nl aan en pas deze regel aan.
const DEVICE_EMAIL = "michael@debeug.nl";
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
  "Groente · rauw","Groente · geroosterd","Groente · gegrild","Groente · gestoomd","Groente · gerookt","Groente · confit",
  "Krokant & garnituur","Crumbles & garnituur","Garnituur",
  "Vlees","Vis","Zuivel","Fonds & bouillon","Deeg & brood","Dranken","Zonder categorie",
];

// Oude categorienamen gelijktrekken: "Tuin · x" heet nu "Groente · x",
// en de losse categorie "Chutney" valt onder "Chutney & jam".
function normCategory(c) {
  const t = String(c || "").trim();
  if (/^tuin\s*·/i.test(t)) return t.replace(/^tuin/i, "Groente");
  if (/^tuin$/i.test(t)) return "Groente";
  if (/^chutney$/i.test(t)) return "Chutney & jam";
  return t;
}

// ---------- allergenen ----------
// Herkent de 14 wettelijke allergenen (EU) in ingrediëntteksten.
// inc: woorddelen, ook in samenstellingen ("tarwebloem", "roomkaas", "pannenkoek"),
// tok: alleen als los woord — voor woorden die in samenstellingen iets anders
//      betekenen ("pasta" wel, "misopasta" niet; "bloem" wel, "zonnebloemolie" niet),
// exc: elk woord waar deze tekst in voorkomt wordt in z'n geheel verwijderd vóór de
//      controle ("melkzuurgefermenteerd" → geen melk, "varkenskrabbetjes" → geen krab).
//      Met een ^ ervoor telt de tekst alleen aan het begin van een woord:
//      "^vermout" verwijdert "vermout(h)" maar laat "havermout" (gluten!) staan.
const ALLERGENS = [
  { label:"Gluten", inc:["tarwe","rogge","gerst","spelt","kamut","haver","couscous","bulgur","griesmeel","paneermeel","panko","patentbloem","bakmeel","volkoren","brood","spaghetti","macaroni","noedel","seitan","bladerdeeg","filodeeg","tortilla","kroepoek","beschuit","zelfrijzend","deeg","koek","speculaas","mout","pepernoot","pepernoten","kruidnoot","kruidnoten"],
    tok:["bier","mie","bloem","pasta","meel","gort","orzo","udon"],
    exc:["bloemkool","boekweit","glutenvrij","maizena","kastanjebloem","rijstbloem","rijstebloem","amandelbloem","kikkererwtenbloem","maisgries","zonnebloem","blad en bloem","bloemen","bloesem","smout","^vermout","koekkruid","speculaaskruid"] },
  { label:"Ei", inc:["mayonaise","aioli","meringue","merengue","kippenei","eendenei","ganzenei","eier","patissiere"],
    tok:["ei","eieren","eitje","eitjes","eigeel","eidooier","dooier","dooiers","eiwit","eiwitten","omelet","advocaat"], exc:[] },
  { label:"Lactose", inc:["melk","boter","room","kaas","yoghurt","kwark","mascarpone","ricotta","mozzarella","parmezaan","pecorino","feta","lactose","kefir","creme fraiche","patissiere","witte chocola"],
    tok:["wei","ghee","paneer"],
    exc:["melkzuur","kokosmelk","havermelk","sojamelk","amandelmelk","rijstmelk","cacaoboter","sheaboter","notenboter","pindakaas","pindaboter","amandelboter","waterkefir","boterhamworst"] },
  { label:"Noten", inc:["amandel","hazelnoot","hazelnoten","walnoot","walnoten","cashew","pecan","pistache","macadamia","paranoot","paranoten","noten","noot","marsepein","praline","frangipane"],
    tok:[],
    exc:["nootmuskaat","notenmuskaat","muskaatnoot","kokosnoot","kokosnoten","pepernoot","pepernoten","kruidnoot","kruidnoten","wasabinoot"] },
  { label:"Pinda", inc:["pinda","wasabinoot"], tok:[], exc:[] },
  // Volledig geraffineerde sojaolie is in de EU uitgezonderd van allergenendeclaratie.
  { label:"Soja", inc:["soja","tofu","tofoe","tempeh","tamari","edamame","ketjap","shoyu","hoisin","teriyaki","miso"], tok:[], exc:["sojaolie"] },
  { label:"Vis", inc:["ansjovis","zalm","tonijn","makreel","haring","kabeljauw","forel","sardine","sardien","schelvis","vissaus","worcester","garum","paling","dorade","heilbot","sprot","zeebaars","snoekbaars","wijting","dashi","bonito","katsuobushi"],
    tok:["vis","baars"], exc:[] },
  { label:"Schaaldieren", inc:["garnaal","garnalen","kreeft","krab","langoustine","scampi","gamba"], tok:[], exc:["krabbetje"] },
  { label:"Weekdieren", inc:["mossel","oester","inktvis","octopus","calamaris","coquille","jakobsschelp","vongole","escargot","kokkel"], tok:["slak","slakken"], exc:["oesterzwam","oesterzwammen"] },
  { label:"Selderij", inc:["selder","selderij"], tok:[], exc:[] },
  { label:"Mosterd", inc:["mosterd"], tok:[], exc:[] },
  { label:"Sesam", inc:["sesam","tahin","gomasio"], tok:[], exc:[] },
  // Wijn (ook wijnazijn) en balsamico bevatten vrijwel altijd sulfiet boven de
  // declaratiegrens; eigen levende azijn zonder "wijn" in de naam blijft vrij.
  { label:"Sulfiet", inc:["sulfiet","zwaveldioxide","wijn","balsamico","e220","e221","e222","e223","e224","e226","e227","e228"], tok:[], exc:["wijnsteen","wijnblad","wijnbladeren","wijngist"] },
  { label:"Lupine", inc:["lupine"], tok:[], exc:[] },
];
function detectAllergens(text) {
  const t = " " + String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]+/g, " ") + " ";
  const out = [];
  for (const a of ALLERGENS) {
    let s = t;
    // Verwijder per uitzondering het hele woord: standaard elk woord waar de tekst
    // in voorkomt; met ^ alleen woorden die er ook mee beginnen (zie hierboven).
    for (const e of a.exc) {
      const p = e.startsWith("^") ? "(^| )" + e.slice(1) + "[a-z0-9-]*" : "[a-z0-9-]*" + e + "[a-z0-9-]*";
      s = s.replace(new RegExp(p, "g"), " ");
    }
    if (a.inc.some((w) => s.includes(w)) || a.tok.some((w) => s.includes(" " + w + " "))) out.push(a.label);
  }
  return out;
}
// Handmatige correcties, met voorrang van specifiek naar algemeen:
// 1. correctie op het ingrediënt in dít recept ({ item, amount, allergens: [...] }),
// 2. app-brede correctie op de ingrediëntnaam (gedeeld met het hele team),
// 3. automatische detectie.
// Een lege lijst telt expliciet als "géén allergeen". Omdat recepten en gerechten
// hun allergenen per ingrediënt opbouwen, werkt elke correctie automatisch door
// in de receptenlijst, gerechten, etiketten en de voorraad.
const ALLERGEN_LABELS = ALLERGENS.map((a) => a.label);
const normAllergenLabel = (l) => (l === "Melk" ? "Lactose" : l); // oude opgeslagen naam
// App-brede correcties: genormaliseerde ingrediëntnaam → lijst. Gevuld vanuit App
// (gedeelde data), zodat losse functies als printLabel er ook bij kunnen.
let GLOBAL_ALLERGEN_FIXES = {};
const setGlobalAllergenFixes = (m) => { GLOBAL_ALLERGEN_FIXES = m || {}; };
const algKey = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
const globalAllergenFixFor = (name) => { const g = GLOBAL_ALLERGEN_FIXES[algKey(name)]; return Array.isArray(g) ? g.map(normAllergenLabel) : null; };
// Alle recepten in een module-variabele: een ingredient mag naar een ander
// recept verwijzen (kruidenrub in buikspek) en dan moeten allergenen en
// kostprijs van dat recept meetellen.
let RECEPTEN = { perId: {} };
const zetRecepten = (rs) => { const m = {}; for (const r of rs || []) if (r && r.id) m[r.id] = r; RECEPTEN = { perId: m }; };
const receptById = (id) => (id && RECEPTEN.perId[id]) || null;
const subRecept = (ing) => (ing && typeof ing === "object" && ing.recipeRef ? receptById(ing.recipeRef) : null);

const ingredientAllergens = (ing) => {
  const item = ing && typeof ing === "object" ? ing.item : ing;
  if (ing && typeof ing === "object" && Array.isArray(ing.allergens)) return ing.allergens.map(normAllergenLabel);
  const g = globalAllergenFixFor(item);
  if (g) return g;
  return detectAllergens(item);
};
const hasAllergenOverride = (ing) => !!(ing && typeof ing === "object" && Array.isArray(ing.allergens));
const recipeAllergens = (r, gezien) => {
  const set = new Set();
  const zien = gezien || new Set();
  if (r && r.id) { if (zien.has(r.id)) return []; zien.add(r.id); } // geen kringetje
  ((r && r.ingredients) || []).forEach((i) => {
    ingredientAllergens(i).forEach((x) => set.add(x));
    const sub = subRecept(i);
    if (sub) recipeAllergens(sub, zien).forEach((x) => set.add(x));
  });
  return ALLERGEN_LABELS.filter((l) => set.has(l));
};
// Allergenen van een ingredientregel, inclusief die van een ingevoegd recept.
const ingRegelAllergenen = (ing) => {
  const set = new Set(ingredientAllergens(ing));
  const sub = subRecept(ing);
  if (sub) recipeAllergens(sub).forEach((x) => set.add(x));
  return ALLERGEN_LABELS.filter((l) => set.has(l));
};
function dishAllergens(d, recipeById) {
  const set = new Set();
  ((d && d.recipeIds) || []).forEach((id) => { const r = recipeById(id); if (r) recipeAllergens(r).forEach((x) => set.add(x)); });
  return ALLERGEN_LABELS.filter((l) => set.has(l));
}

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

// ---------- printen ----------
// Opent een schone printweergave in een nieuw venster (A4), los van de app-UI.
// Printen zonder tabblad-wissel: een onzichtbaar frame in deze pagina print en
// ruimt zichzelf op. Dit voorkomt de veld-blokkade die ontstond doordat het
// print-tabblad de focus meenam — na terugkeren waren tekstvelden dood tot een
// refresh. Geen pop-uptoestemming meer nodig, en de focus blijft gewoon hier.
function printHtmlInPagina(html) {
  try {
    const fr = document.createElement("iframe");
    fr.setAttribute("aria-hidden", "true");
    fr.style.position = "fixed"; fr.style.right = "0"; fr.style.bottom = "0";
    fr.style.width = "0"; fr.style.height = "0"; fr.style.border = "0";
    document.body.appendChild(fr);
    const doc = fr.contentDocument || fr.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    let opgeruimd = false;
    const opruimen = () => {
      if (opgeruimd) return; opgeruimd = true;
      setTimeout(() => {
        try { if (fr.parentNode) fr.parentNode.removeChild(fr); } catch (e) {}
        try { window.focus(); } catch (e) {}
        try { if (document.activeElement && document.activeElement.tagName === "IFRAME") document.activeElement.blur(); } catch (e) {}
      }, 300);
    };
    try { fr.contentWindow.onafterprint = opruimen; } catch (e) {}
    setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { opruimen(); } }, 250);
    setTimeout(opruimen, 120000); // vangnet: ruim ook op als afterprint nooit vuurt
  } catch (e) {}
}

function openPrint(title, bodyHTML) {
  const esc = (x) => String(x == null ? "" : x);
  const html =
    "<!doctype html><html lang='nl'><head><meta charset='utf-8'>" +
    "<title>" + esc(title) + "</title>" +
    "<style>" +
    "@page{size:A4;margin:16mm}" +
    "*{box-sizing:border-box}" +
    "body{font-family:Georgia,'Times New Roman',serif;color:#23261d;margin:0;font-size:12pt;line-height:1.45}" +
    "h1{font-size:22pt;margin:0 0 2pt}h2{font-size:13pt;margin:16pt 0 4pt;border-bottom:1px solid #cfccbe;padding-bottom:3pt}" +
    ".sub{color:#6a6550;font-size:10pt;margin:0 0 10pt}" +
    ".meta{color:#6a6550;font-size:9.5pt;margin-top:2pt}" +
    "ul,ol{margin:4pt 0 8pt;padding-left:18pt}li{margin:2pt 0}" +
    "table{width:100%;border-collapse:collapse;margin:6pt 0 12pt;font-size:10.5pt}" +
    "th,td{border:1px solid #cbc8ba;padding:4pt 6pt;text-align:left;vertical-align:top}" +
    "th{background:#f0eee4;font-size:9.5pt;text-transform:uppercase;letter-spacing:.03em}" +
    ".chips{color:#4a5a3f;font-size:10pt;margin:2pt 0 8pt}" +
    ".warn{color:#8a4a3a;font-weight:bold}" +
    ".foot{margin-top:18pt;color:#8a8570;font-size:8.5pt;border-top:1px solid #e0ddd0;padding-top:6pt}" +
    ".day{margin:10pt 0 2pt;font-weight:bold}" +
    "</style></head><body>" + bodyHTML +
    "<div class='foot'>Ritme · In het ritme van het land — Wilde Wortels, Landgoed de Beug · afgedrukt op " + new Date().toLocaleString("nl-NL") + "</div>" +
    "</body></html>";
  printHtmlInPagina(html);
}
const pEsc = (x) => String(x == null ? "" : x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function printRecipe(r) {
  const ing = (r.ingredients || []).map((x) => "<li>" + pEsc(x.amount) + (x.amount ? " — " : "") + pEsc(x.item) + "</li>").join("");
  const steps = (r.steps || []).map((x) => "<li>" + pEsc(x) + "</li>").join("");
  const chips = [r.category, r.yield && ("opbrengst " + r.yield), r.fermentMethod, (r.season || []).join("/")].filter(Boolean).join(" · ");
  openPrint(r.name, "<h1>" + pEsc(r.name) + "</h1><div class='chips'>" + pEsc(chips) + "</div>" +
    (ing ? "<h2>Ingrediënten</h2><ul>" + ing + "</ul>" : "") +
    (steps ? "<h2>Bereiding</h2><ol>" + steps + "</ol>" : "") +
    (r.fermentDefaults ? (() => { const d = r.fermentDefaults; const parts = [d.saltPct ? d.saltPct + "% zout" : null, d.sugarPct ? d.sugarPct + "% suiker" : null, d.tempC ? d.tempC + " °C" : null, d.days ? d.days + " dagen" : null, d.phTarget != null ? "streef-pH " + d.phTarget : null].filter(Boolean); return parts.length ? "<p class='meta'>Richtwaarden: " + parts.join(" · ") + "</p>" : ""; })() : ""));
}

function printDish(d, recipeById) {
  const onderdelen = (d.recipeIds || []).map((id) => { const r = recipeById(id); return r ? "<li>" + pEsc(r.name) + " <span class='meta'>(" + pEsc(r.category) + ")</span></li>" : ""; }).join("");
  const chips = [d.course, (d.season || []).join("/"), d.diet].filter(Boolean).join(" · ");
  openPrint(d.name, "<h1>" + pEsc(d.name) + "</h1><div class='chips'>" + pEsc(chips) + "</div>" +
    (d.description ? "<p class='sub'>" + pEsc(d.description) + "</p>" : "") +
    (onderdelen ? "<h2>Onderdelen</h2><ul>" + onderdelen + "</ul>" : "") +
    (d.plating ? "<h2>Dressering</h2><p>" + pEsc(d.plating) + "</p>" : ""));
}

// Schoonmaaklogboek van een week als tabel per dag.
function printCleaning(weekLabel, range, days, taskName) {
  let body = "<h1>Schoonmaaklogboek</h1><div class='sub'>" + pEsc(weekLabel) + " · " + pEsc(range) + "</div>";
  if (!days.length) body += "<p>Geen registraties deze week.</p>";
  for (const day of days) {
    body += "<div class='day'>" + pEsc(day.label) + (day.off ? " — vrije dag (bedrijf dicht)" : "") + "</div>";
    if (!day.off) {
      body += "<table><thead><tr><th>Taak</th><th>Afgetekend door</th><th>Opmerking</th></tr></thead><tbody>";
      for (const l of day.items) body += "<tr><td>" + pEsc(taskName(l.taskId)) + "</td><td>" + pEsc(l.doneBy) + "</td><td>" + pEsc(l.note) + "</td></tr>";
      body += "</tbody></table>";
    }
  }
  openPrint("Schoonmaaklogboek — " + weekLabel, body);
}

// HACCP: temperaturen + registraties als tabellen.
function printHaccp(tempLogs, records) {
  let body = "<h1>HACCP-logboek</h1><div class='sub'>Temperatuur, bereiding, terugkoelen en leveringen</div>";
  body += "<h2>Temperatuurcontrole (om de dag)</h2>";
  if (!tempLogs.length) body += "<p>Nog geen metingen.</p>";
  else {
    body += "<table><thead><tr><th>Datum</th>" + HACCP_UNITS.map((u) => "<th>" + pEsc(u.name) + "</th>").join("") + "<th>IJking</th><th>Door</th></tr></thead><tbody>";
    for (const l of [...tempLogs].sort((a, b) => (a.checkDate < b.checkDate ? 1 : -1))) {
      body += "<tr><td>" + pEsc(fmtDMY(l.checkDate)) + "</td>" +
        HACCP_UNITS.map((u) => { const v = l.values[u.id]; const bad = inRange(u, v) === false; return "<td" + (bad ? " class='warn'" : "") + ">" + (v == null ? "—" : String(v).replace(".", ",") + " °C") + "</td>"; }).join("") +
        "<td>" + (l.calibration && l.calibration.measured != null ? String(l.calibration.measured).replace(".", ",") + " °C" : "—") + "</td><td>" + pEsc(l.doneBy) + "</td></tr>";
    }
    body += "</tbody></table>";
  }
  for (const [kind, cfg] of Object.entries(HACCP_KINDS)) {
    const rows = records.filter((r) => r.kind === kind).sort((a, b) => (a.date < b.date ? 1 : -1));
    body += "<h2>" + pEsc(cfg.label) + "</h2>";
    if (!rows.length) { body += "<p>Nog niets geregistreerd.</p>"; continue; }
    body += "<table><thead><tr><th>Datum</th>" + cfg.cols.map((c) => "<th>" + pEsc(c.label) + "</th>").join("") + "<th>Door</th></tr></thead><tbody>";
    for (const r of rows) {
      const bad = cfg.ok(r) === false;
      body += "<tr><td>" + pEsc(fmtDMY(r.date)) + "</td>" +
        cfg.cols.map((c) => "<td>" + (c.type === "num" ? (r[c.id] == null ? "—" : String(r[c.id]).replace(".", ",") + " °C") : pEsc(r[c.id])) + "</td>").join("") +
        "<td>" + pEsc(r.by) + (bad ? " <span class='warn'>⚠</span>" : "") + "</td></tr>";
    }
    body += "</tbody></table>";
  }
  openPrint("HACCP-logboek", body);
}

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
const byNewest = (a, b) => recencyKey(b.id) - recencyKey(a.id) || bySeasonThenName(a.season, a.name, b.season, b.name);

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
  const result = merged.map(restore).filter(Boolean);
  if (result.length > 1) return result;

  // 4. Geen punten of regels? Splits vóór keukenwerkwoorden in de gebiedende
  // wijs ("meng … roer … voeg … draai … bak af …"), en knip verbindings-
  // woorden aan het eind van elke stap weg.
  if (text.length > 60) {
    const werkw = "meng|roer|voeg|draai|bak|kook|breng|schep|snijd|snij|giet|laat|zet|haal|klop|spatel|verwarm|verhit|doe|pureer|mix|kneed|rol|vouw|bestrooi|bedek|verdeel|schenk|gaar|stoof|blancheer|pocheer|rooster|grill|stoom|koel|zeef|blus|fruit|smelt|week|marineer|pekel|vacumeer|vul|verwijder|schil|rasp|hak|pers|weeg|frituur|wentel|paneer|serveer|garneer|proef|bewaar";
    const delen = text.split(new RegExp("(?=\\b(?:" + werkw + ")\\b)", "i")).map((x) => x.trim()).filter(Boolean);
    if (delen.length > 1) {
      const schoon = delen
        .map((x) => x.replace(/(?:[,;]\s*|\s+)(en|dan|en dan|vervolgens|daarna|hierna|nu)\s*$/i, "").trim())
        .filter((x) => x.replace(/\s/g, "").length > 2);
      // korte flarden bij de vorige voegen
      const samen = [];
      for (const p of schoon) {
        if (samen.length && p.replace(/\s/g, "").length < 12) samen[samen.length - 1] += " " + p;
        else samen.push(p);
      }
      if (samen.length > 1) return samen;
    }
  }
  return result;
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
    // Typefout-tolerantie pas vanaf 6 letters: bij korte woorden is één letter
    // verschil vaak een ánder woord (zoet/zout, peer/peen) in plaats van een typo.
    if (w.length < 6) return false;
    const cap = typoBudget(w.length);
    for (const hw of hWords) {
      if (typoDistance(hw, w, cap) <= cap) return true;
      // Prefix-vergelijking op meerdere lengtes, zodat een typo vóór een
      // samenstelling ook matcht ("courgete" → "courgette(jam)").
      for (let L = w.length; L <= Math.ceil(w.length + cap); L++) {
        if (hw.length > w.length && hw.length >= L && typoDistance(hw.slice(0, L), w, cap) <= cap) return true;
      }
    }
    return false;
  });
}
// Meerdere velden tegelijk doorzoeken.
const softMatchAny = (fields, needle) => !norm(needle).trim() || fields.some((f) => softMatch(f || "", needle));
// Strikte variant zonder typo-tolerantie: elk zoekwoord moet letterlijk (als
// deel van een woord) voorkomen. "madeleine" matcht dus níet "madelief".
const strictMatchAny = (fields, needle) => {
  const woorden = norm(needle).trim().split(/\s+/).filter(Boolean);
  if (!woorden.length) return true;
  const hooi = norm(fields.filter(Boolean).join(" "));
  return woorden.every((w) => hooi.includes(w));
};

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
  { id:"h-bereiding", name:"HACCP · bereiding registreren", area:"Koelruimte", intervalDays:7, minutes:10 },
  { id:"h-terugkoelen", name:"HACCP · terugkoelen registreren", area:"Koelruimte", intervalDays:7, minutes:10 },
  { id:"h-levering", name:"HACCP · levering registreren", area:"Koelruimte", intervalDays:7, minutes:10 },
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
const REMIND_HOUR = 18; // tweede herinnering als de eerste is weggeklikt
const RITME_VERSIE = "2026-08-14f"; // versiestempel — check dit na elke deploy
const AUTO_OFF_HOUR = 2; // vanaf dit uur wordt een lege gisteren automatisch "bedrijf dicht"
const WORKDAY_START = 7, WORKDAY_END = 17; // 17:00 sluiten — HACCP-banners alleen binnen werktijd
// Recept dat gegaard wordt (oven, koken, stoven …): herkend op naam + stappen.
function isCookedRecipe(r) {
  const t = ((r && r.name) || "") + " " + (((r && r.steps) || []).join(" "));
  return /\b(oven|garen|gaart?|gaar|koken?|kookt|gekookt|stoven?|stooft?|gestoofd|bakken?|bakt|gebakken|frituren?|frituurt?|sous.?vide|blancheer|blancheren|pocheer|pocheren|rooster(en|t)?|geroosterd|grill(en|t)?|stomen?|stoomt|gestoomd|karamelliseer)\b/i.test(t);
}
const binnenWerkdag = (d) => { const m = d.getHours() * 60 + d.getMinutes(); return m >= WORKDAY_START * 60 && m <= WORKDAY_END * 60; };
const COOK_OPEN_MS = 2 * 60000; // recept ≥ 2 minuten open = er wordt echt mee gewerkt
const naamMatch = (a, b) => { const x = norm(String(a || "")).trim(), y = norm(String(b || "")).trim(); return !!x && !!y && (x.includes(y) || y.includes(x)); };
// De "keukendag" loopt tot 02:00 's nachts: metingen, afvinkingen en het wegklikken
// van de aandacht-banner gelden tot dan; om 02:00 begint de nieuwe dag en komt de
// banner terug met de aandacht (metingen, handelingen) voor die dag.
function kitchenDate(d) { const x = d ? new Date(d) : new Date(); if (x.getHours() < AUTO_OFF_HOUR) x.setDate(x.getDate() - 1); return localDate(x); }
const TEMP_TASK_ID = "c-temperaturen"; // schoonmaaktaak die aan de HACCP-log hangt
// Extra HACCP-registraties (elk een eigen wekelijkse schoonmaaktaak).
const HACCP_KIND_TASK = {
  bereiding: "h-bereiding",
  terugkoelen: "h-terugkoelen",
  levering: "h-levering",
};
const HACCP_TASK_KIND = { "h-bereiding": "bereiding", "h-terugkoelen": "terugkoelen", "h-levering": "levering" };
const DAY_DONE_ID = "__dag-afgerond";  // markeert dat de schoonmaak van vandaag is afgerond
const DAY_OFF_ID  = "__vrije-dag";     // markeert een dag waarop het bedrijf dicht was

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
// Weergave van datums, overal in de app: dag-maand-jaar. Intern (opslag,
// vergelijkingen, datumvelden) blijft alles ISO (jaar-maand-dag).
const fmtDMY = (iso) => { const t = String(iso || "").slice(0, 10); const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + "-" + m[2] + "-" + m[1] : t; };
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
  if (task.id === DAY_DONE_ID || task.id === DAY_OFF_ID) return { last: null, since: null, due: false, overdue: false, history: [] };
  const mine = logs.filter((l) => l.taskId === task.id).sort((a, b) => (a.doneDate < b.doneDate ? 1 : -1));
  const last = mine[0] || null;
  // Vrije dagen (bedrijf dicht) tellen niet mee: die kun je niet poetsen.
  const offDates = new Set(logs.filter((l) => l.taskId === DAY_OFF_ID).map((l) => l.doneDate));
  const rawSince = last ? daysAgo(last.doneDate) : null;
  let since = rawSince;
  if (last && rawSince != null) {
    let off = 0;
    const d = new Date(last.doneDate + "T12:00:00");
    for (let i = 1; i <= rawSince; i++) { d.setDate(d.getDate() + 1); if (offDates.has(localDate(d))) off++; }
    since = rawSince - off;
  }
  const due = last === null || since >= task.intervalDays;
  const overdue = last !== null && since > task.intervalDays;
  return { last, since, rawSince, due, overdue, history: mine };
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
const FRUIT = ["framboos","passievrucht","aardbei","braam","perzik","abrikoos","kers","bosbes","vijg","granaatappel","rabarber","appel","peer","mandarijn","bloedsinaasappel","citroen","limoen","yuzu","banaan","kokos","druif","kiwi"];
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
    ingredients:[{item:"Ui",amount:"1 stuk"},{item:"Witte wijn",amount:"100 g"},{item:"Azijn",amount:"50 g"},{item:"Koude boter",amount:"200 g"}],
    steps:["Reduceer tot bijna droog.","Monteer koude boter buiten het vuur.","Passeer; niet koken."],
    variations:[{name:"Klassieke beurre blanc"},{name:"Dille-beurre blanc",add:"Roer dille erdoor."},{name:"Dragon-beurre blanc",add:"Roer dragon erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Beurre rouge",add:"Rode wijn i.p.v. witte."},{name:"Mosterd-beurre blanc",add:"Lepel mosterd erdoor."}] },
  { id:"mayo", baseName:"Emulsie / mayonaise", generic:"emulsie", category:"Sauzen & emulsies", yield:"≈ 300 g", mode:"flavor", chefsPick:true,
    ingredients:[{item:"Eidooier",amount:"1 stuk"},{item:"Mosterd",amount:"10 g"},{item:"Neutrale olie",amount:"250 g"},{item:"Azijn",amount:"10 g"}],
    steps:["Klop dooier met mosterd.","Druppel de olie erbij.","Op smaak met azijn."],
    variations:[{name:"Klassieke mayonaise"},{name:"Aioli",add:"Knoflook uit de tuin."},{name:"Bieslookmayonaise",add:"Fijne bieslook erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Mosterdmayonaise",add:"Extra grove mosterd."},{name:"Sojasaus-mayonaise",add:"Werk af met sojasaus."},{name:"Oost-Indische-kersmayonaise",add:"Roer fijne blaadjes erdoor voor peperigheid.",season:["Zomer","Herfst"]}] },
  { id:"vinaigrette", baseName:"Vinaigrette", generic:"vinaigrette", category:"Oliën & vinaigrettes", yield:"≈ 150 g", mode:"flavor",
    ingredients:[{item:"Azijn",amount:"30 g"},{item:"Olie",amount:"90 g"},{item:"Mosterd",amount:"5 g"}],
    steps:["Klop azijn met mosterd en zout.","Monteer met olie."],
    variations:[{name:"Klassieke vinaigrette"},{name:"Uienvinaigrette",add:"Fijne ui erdoor."},{name:"Honing-mosterdvinaigrette",add:"Honing toevoegen."},{name:"Dragonvinaigrette",add:"Dragon erdoor.",season:["Lente","Zomer","Herfst"]},{name:"Frambozenvinaigrette",add:"Frambozenazijn + wat puree.",season:["Zomer","Herfst"]}] },
  { id:"jus", baseName:"Jus / reductie", generic:"jus", category:"Sauzen & emulsies", yield:"≈ 400 g", mode:"flavor", endorsements:["Michael","Stef"],
    ingredients:[{item:"Fond",amount:"1 l"},{item:"Rode wijn",amount:"200 g"},{item:"Ui",amount:"2 stuks"},{item:"Boter",amount:"30 g"}],
    steps:["Reduceer wijn met ui.","Voeg fond toe; reduceer napperend.","Monteer met boter; passeer."],
    variations:[{name:"Rodewijnjus"},{name:"Portjus",add:"Port toevoegen."},{name:"Tijm-knoflookjus",add:"Trek met tijm en knoflook."},{name:"Peperjus",add:"Gebroken peper."}] },
  { id:"tuile", baseName:"Tuile", generic:"tuile", category:"Krokant & garnituur", yield:"≈ 12 tuiles", mode:"flavor",
    ingredients:[{item:"Bloem",amount:"50 g"},{item:"Boter",amount:"50 g"},{item:"Suiker/Parmezaan",amount:"50 g"},{item:"Eiwit",amount:"50 g"}],
    steps:["Meng glad.","Strijk dun uit.","Bak 6–8 min op 170°C; vorm warm."],
    variations:[{name:"Parmezaantuile"},{name:"Broodtuile",add:"Broodkruim i.p.v. bloem."},{name:"Sesamtuile",add:"Sesam erover."},{name:"Boekweittuile",add:"Deel boekweit."}] },

  // ---- TUIN: bereiden ----
  { id:"roast", baseName:"Geroosterde tuingroente", varTemplate:"Geroosterde {x}", generic:"tuingroente", category:"Groente · geroosterd", yield:"4 porties", chefsPick:true, endorsements:["Michael","Simon"], gear:"Combi-oven / iVario",
    mains:[...ROOT,"venkel","bleekselderij","kardoen","courgette","tomaat",...BRASSICA,"princessenbonen","sperziebonen","snijbonen","pronkbonen"],
    ingredients:[{item:"{X}",amount:"800 g"},{item:"Olijfolie",amount:"3 el"},{item:"Zout",amount:"naar smaak"},{item:"Tijm",amount:"enkele takjes"}],
    steps:["Maak de {x} schoon en snijd in gelijke stukken.","Meng met olie, zout en tijm.","Rooster op 200°C tot gaar en gekaramelliseerd."] },
  { id:"grill", baseName:"Gegrilde tuingroente", varTemplate:"Gegrilde {x}", generic:"tuingroente", category:"Groente · gegrild", yield:"4 porties", gear:"Black Bastard",
    mains:[...ROOT,...STALK,"spitskool","palmkool","savooikool"],
    ingredients:[{item:"{X}",amount:"600 g"},{item:"Olie",amount:"2 el"},{item:"Zout",amount:"naar smaak"}],
    steps:["Grill de {x} op de Black Bastard tot mooie strepen.","Gaar door aan de koele kant of in de combi-oven.","Maak af met zout en olie."] },
  { id:"steam", baseName:"Gestoomde tuingroente", varTemplate:"Gestoomde {x}", generic:"tuingroente", category:"Groente · gestoomd", yield:"4 porties", gear:"Combi-oven",
    mains:[...ROOT.slice(0,10),"venkel","bleekselderij","kardoen","courgette",...BRASSICA.slice(0,4)],
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Zout",amount:"een snuf"}],
    steps:["Stoom de {x} beetgaar in de combi-oven.","Schrik indien nodig.","Breng op smaak."] },
  { id:"gpuree", baseName:"Groentepuree", noun:"Puree", generic:"tuingroente", category:"Purees", yield:"≈ 500 g", chefsPick:true, endorsements:["Stef","Kim"], gear:"Thermoblender",
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
  { id:"gconfit", baseName:"Geconfijte tuingroente", varTemplate:"Geconfijte {x}", generic:"tuingroente", category:"Groente · confit", yield:"naar behoefte",
    mains:["knoflook","ui","utrechtse ui","tomaat","rode biet","aardpeer","meiknol"],
    ingredients:[{item:"{X}",amount:"naar behoefte"},{item:"Olijfolie",amount:"om onder te dompelen"},{item:"Tijm & laurier",amount:"naar smaak"}],
    steps:["Dompel de {x} onder in olie met aromaten.","Gaar langzaam op 80–90°C tot zacht.","Bewaar in de olie."] },
  { id:"gsmoke", baseName:"Gerookte tuingroente", varTemplate:"Gerookte {x}", generic:"tuingroente", category:"Groente · gerookt", yield:"naar behoefte", gear:"Black Bastard",
    mains:[...ROOT,"rode kool","boerenkool"],
    ingredients:[{item:"{X}",amount:"naar behoefte"},{item:"Rookmot",amount:"1 handvol"}],
    steps:["Rook de {x} koud of warm op de Black Bastard.","Laat rusten zodat de rook zich zet.","Bewaar afgedekt."] },
  { id:"gtartaar", baseName:"Groentetartaar", varTemplate:"Tartaar van {x}", generic:"tuingroente", category:"Groente · rauw", yield:"4 porties",
    mains:["rode biet","tomaat","courgette","koolrabi","radijs","chioggia biet"],
    ingredients:[{item:"{X}, brunoise",amount:"300 g"},{item:"Ui",amount:"1 stuk"},{item:"Mosterd & olie",amount:"naar smaak"},{item:"Bieslook",amount:"1 el"}],
    steps:["Snijd de {x} in fijne brunoise.","Meng met ui, mosterd, olie en bieslook.","Breng op smaak en dresseer met een ring."] },
  { id:"gcarp", baseName:"Groentecarpaccio", varTemplate:"Carpaccio van {x}", generic:"tuingroente", category:"Groente · rauw", yield:"4 porties",
    mains:["rode biet","chioggia biet","gele biet","koolrabi","meiknol","pastinaak","courgette"],
    ingredients:[{item:"{X}",amount:"300 g"},{item:"Olijfolie",amount:"2 el"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"}],
    steps:["Snijd de {x} flinterdun op de snijmachine.","Leg dakpansgewijs op het bord.","Maak af met olie, zout en kruiden."] },
  { id:"gbouillon", baseName:"Groentebouillon", noun:"Bouillon", generic:"tuingroente", category:"Fonds & bouillon", yield:"≈ 1 l",
    mains:ROOT.slice(0,10),
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Ui",amount:"100 g"},{item:"Prei",amount:"100 g"},{item:"Water",amount:"1,5 l"},{item:"Kruiden",amount:"bouquet"}],
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
    ingredients:[{item:"{X}",amount:"50 g"},{item:"Naturel azijn",amount:"100 g"},{item:"Suiker",amount:"30 g"},{item:"Zout",amount:"3 g"}],
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
  { id:"beanroast", baseName:"Geroosterde bonen", varTemplate:"Geblisterde {x}", generic:"bonen", category:"Groente · geroosterd", yield:"4 porties", gear:"iVario",
    mains:BEAN,
    ingredients:[{item:"{X}",amount:"400 g"},{item:"Olie",amount:"2 el"},{item:"Zout",amount:"naar smaak"}],
    steps:["Blancheer de {x} kort.","Blister heet in de iVario met olie.","Maak af met zout en kruiden."] },

  // ---- FERMENTATIE ----
  { id:"lacto", baseName:"Melkzuurgefermenteerde groente", varTemplate:"Ferment {x}", generic:"tuingroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:10}, chefsPick:true, endorsements:["Simon","Stef"], gear:"Fermentatiemateriaal",
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
  { id:"fhot", baseName:"Ferment hotsauce", varTemplate:"Hotsauce van {x}", generic:"groente", category:"Fermentatie", yield:"≈ 500 g", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:22,days:14}, gear:"Fermentatiemateriaal",
    mains:["tomaat","radijs","ui","knoflook","rode biet"],
    ingredients:[{item:"{X} + chili",amount:"500 g"},{item:"Zout (2,5%)",amount:"13 g"}],
    steps:["Mix de {x} met chili en zout.","Ferment 1–2 weken onder pekel op ±22°C.","Mix glad, passeer en bottel; koel."] },
  { id:"fcaper", baseName:"Ferment bloemknoppen", varTemplate:"Kappertjes van {x}", generic:"bloem", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:3.5,tempC:20,days:7}, gear:"Fermentatiemateriaal",
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
    ingredients:[{item:"{X}, in parten",amount:"1 kg"},{item:"Water",amount:"1 l"},{item:"Zout (2,5% van totaal)",amount:"50 g"},{item:"Knoflook",amount:"naar smaak"},{item:"Gember",amount:"naar smaak"},{item:"Ui",amount:"naar smaak"}],
    steps:["Leg de {x} met de aromaten onder de pekel.","Ferment 5–10 dagen op ±18°C tot de pekel licht bruist.","Serveer de groente én de sprankelende pekel ijskoud."] },
  { id:"fstem", baseName:"Ferment stelen", varTemplate:"Ferment stelen van {x}", generic:"steelgroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:10}, gear:"Fermentatiemateriaal",
    mains:["snijbiet","bleekselderij","kardoen","paksoi"],
    ingredients:[{item:"Stelen van {x}, in stukken",amount:"500 g"},{item:"Zout (2,5%)",amount:"13 g"},{item:"Water (indien nodig)",amount:"naar behoefte"}],
    steps:["Snijd de stelen van de {x} op maat en weeg 2,5% zout af.","Pak strak in onder de pekel.","Ferment 7–14 dagen op ±20°C; de stelen blijven knapperig."] },
  { id:"fherbpaste", baseName:"Ferment kruidenpasta", varTemplate:"Kruidenpasta van {x}", generic:"kruid", category:"Fermentatie", yield:"1 potje", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:5,tempC:20,days:14}, gear:"Fermentatiemateriaal",
    mains:["lavas","dragon","koriander","peterselie","bieslook","tuinzuring"],
    ingredients:[{item:"{X}, fijngehakt",amount:"200 g"},{item:"Zout (5%)",amount:"10 g"}],
    steps:["Hak de {x} fijn en kneed met 5% zout tot een natte pasta.","Druk luchtvrij aan in een klein potje.","Ferment 2 weken op ±20°C; daarna koel bewaren als smaakmaker."] },
  { id:"fvat", baseName:"Pekelgroenten uit het vat", varTemplate:"{X} uit het vat", generic:"tuingroente", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:3.5,tempC:18,days:10}, gear:"Fermentatiemateriaal",
    mains:["komkommer","courgette","meiknol","radijs"],
    ingredients:[{item:"{X}, heel of in stukken",amount:"1 kg"},{item:"Water",amount:"1 l"},{item:"Zout (3,5% van het water)",amount:"35 g"},{item:"Dille",amount:"per pot"},{item:"Knoflook",amount:"per pot"},{item:"Druivenblad",amount:"1 st"}],
    steps:["Leg de {x} met dille, knoflook en een druivenblad (voor de knapperigheid) in de pot.","Giet de 3,5% pekel erover; alles onder het vocht.","Ferment 7–14 dagen op ±18°C; koel bij de gewenste zuurte."] },
  { id:"fkosho", baseName:"Tuinkosho", varTemplate:"Kosho van {x}", generic:"citrus", category:"Fermentatie", yield:"1 potje", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:10,tempC:20,days:7}, gear:"Fermentatiemateriaal",
    mains:["citroen","limoen","yuzu"],
    ingredients:[{item:"Schilrasp en sap van {x}",amount:"100 g"},{item:"Oost-Indische kers (blad en bloem), fijngehakt",amount:"50 g"},{item:"Zout (10%)",amount:"15 g"}],
    steps:["Meng rasp en sap van {x} met de fijngehakte Oost-Indische kers en 10% zout.","Ferment 1 week op ±20°C in een klein potje.","Rijp daarna koel; gebruik met mate als scherpe condiment."] },
  { id:"zoutpruim", baseName:"Zoutpruimen (umeboshi-stijl)", varTemplate:"Zoutpruimen van {x}", generic:"steenfruit", category:"Fermentatie", yield:"1 pot", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:10,tempC:20,days:30}, gear:"Fermentatiemateriaal / droogoven",
    mains:["pruim","reine claude"],
    ingredients:[{item:"{X}, net niet rijp",amount:"1 kg"},{item:"Zout (10%)",amount:"100 g"},{item:"Rode melde (als shiso-alternatief)",amount:"een handvol"}],
    steps:["Wrijf de {x} in met het zout en verzwaar zodat er pekel vrijkomt.","Ferment 4 weken op ±20°C met de rode melde erbij voor kleur en aroma.","Droog de vruchten daarna kort na in de droogoven en bewaar in de eigen pekel."] },
  { id:"fmustard", baseName:"Ferment mosterd", generic:"mosterd", category:"Fermentatie", yield:"≈ 300 g", mode:"flavor", ferment:true, fermentMethod:"Melkzuur", fermentDefaults:{saltPct:2.5,tempC:20,days:5}, gear:"Fermentatiemateriaal",
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
    mains:["appel","peer","kweepeer"],
    ingredients:[{item:"Schillen en klokhuizen van {x}",amount:"400 g"},{item:"Suiker of rietsuiker",amount:"150 g"},{item:"Water",amount:"2 l"},{item:"Kaneelpoeder",amount:"naar smaak"}],
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
  { id:"coulis", baseName:"Fruitcoulis", noun:"Coulis", varTemplate:"Coulis van {x}", generic:"fruit", category:"Sauzen & emulsies", yield:"≈ 500 g", mains:FRUIT,
    ingredients:[{item:"{X}",amount:"500 g"},{item:"Suiker",amount:"60 g"},{item:"Citroensap",amount:"15 g"}],
    steps:["Kook de {x} kort met de suiker tot het vocht loskomt.","Blender glad met het citroensap.","Zeef fijn en koel terug; breng op smaak met extra suiker of citroen."] },
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
  { id:"chutney", baseName:"Fruitchutney", varTemplate:"Chutney van {x}", generic:"fruit", category:"Chutney & jam", yield:"≈ 3 potten", mains:[...FRUIT,"pruim","reine claude","kweepeer"],
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
    ingredients:[{item:"Rundvlees",amount:"1 kg"},{item:"Zout",amount:"18 g/kg"},{item:"Wortel",amount:"200 g"},{item:"Ui",amount:"200 g"},{item:"Tijm",amount:"2 takjes"}],
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
      id: b.id, name: b.baseName, category: b.category, yield: b.yield,
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
    ingredients:[{item:"Gezeefde tomaten (passata)",amount:"300 g"},{item:"Slagroom",amount:"200 g"},{item:"Gelatineblaadjes",amount:"3 blaadjes"},{item:"Basilicum, fijngesneden",amount:"enkele blaadjes"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"}],
    steps:["Week de gelatine en los op in een derde van de warme passata.","Meng met de rest van de passata en breng stevig op smaak met zout en peper.","Koel tot lobbig en spatel de halfgeslagen room en de basilicum erdoor.","Laat minimaal 3 uur opstijven."],
    endorsements:["Michael"], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:true, diet:"Vegetarisch", ferment:false, gear:"Thermoblender", updatedBy:"Michael", updatedAt:"1 week geleden" },
  { id:"c-caprese-mozz", name:"Gerookte mozzarella", category:"Zuivel", yield:"4 porties",
    ingredients:[{item:"Buffelmozzarella",amount:"2 bollen"},{item:"Beukenrookmot",amount:"1 handvol"},{item:"Olijfolie",amount:"om in te wrijven"},{item:"Zeezout",amount:"om af te maken"}],
    steps:["Laat de mozzarella uitlekken en dep droog.","Rook koud 8–10 min zonder hitte.","Trek in stukken en maak af."],
    endorsements:["Michael","Simon"], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Black Bastard", updatedBy:"Simon", updatedAt:"1 week geleden" },
  { id:"c-olive-crumble", name:"Olijvencrumble", category:"Crumbles & garnituur", yield:"≈ 200 g",
    ingredients:[{item:"Zwarte olijven, ontpit",amount:"150 g"},{item:"Broodkruim",amount:"60 g"},{item:"Olijfolie",amount:"20 g"}],
    steps:["Droog de olijven en maal tot poeder.","Rooster de panko goudbruin.","Meng en bewaar krokant."],
    endorsements:["Kim","Michael"], chefsPick:true, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Droogoven", updatedBy:"Kim", updatedAt:"3 dagen geleden" },
  { id:"c-balsamic-pearls", name:"Balsamicoparels", category:"Garnituur", yield:"≈ 150 g",
    ingredients:[{item:"Balsamicoazijn",amount:"150 g"},{item:"Agar-agar",amount:"1,5 g"},{item:"IJskoude olie",amount:"500 ml"}],
    steps:["Kook de balsamico met agar.","Druppel in ijskoude olie tot parels.","Zeef en spoel."],
    endorsements:["Isa"], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Isa", updatedAt:"4 dagen geleden" },
];

const PATISSERIE = [
  { id:"pat-tarte-tartin-banaan", name:"Tarte tatin van banaan", category:"Zoet & patisserie", yield:"1 plaat",
    ingredients:[{item:"Bladerdeeg",amount:"rondjes"},{item:"Suikerwater 1:1",amount:"1 dl"},{item:"Bananen",amount:"3 st"},{item:"Citroensap",amount:"scheut"},{item:"Suiker",amount:"100 g"},{item:"Roomboter",amount:"50 g"},{item:"Nootmuskaat",amount:"naar smaak"}],
    steps:["Steek rondjes uit het bladerdeeg.","Prik in met een vork en smeer in met het suikerwater; laat 10 min intrekken en herhaal.","Bak tussen 2 matjes af op 185 °C.","Karamelliseer de suiker en voeg de boter toe.","Karamelliseer de banaan mee en maak af met nootmuskaat."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-vanillecreme", name:"Vanillecrème", category:"Zoet & patisserie", yield:"≈ 250 g",
    ingredients:[{item:"Slagroom, ongezoet",amount:"250 g"},{item:"Vanillesuiker",amount:"8 g"},{item:"Gelatine",amount:"2 g"}],
    steps:["Kook de slagroom met de vanille.","Haal van het vuur, dek af met zilverfolie en laat een half uur trekken.","Zeef de room en los de gelatine erin op.","Klop los wanneer opgesteven."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-kruidkoekkruimels", name:"Kruidkoekkruimels", category:"Fruit & garnituur", yield:"1 bak",
    ingredients:[{item:"Kruidkoek",amount:"naar behoefte"}],
    steps:["Maal de kruidkoek in de Magimix.","Strooi uit op een matje.","Droog 30 min op 90 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Droogoven", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-cacaosiroop", name:"Cacaosiroop", category:"Sauzen & emulsies", yield:"≈ 300 g",
    ingredients:[{item:"Suiker",amount:"100 g"},{item:"Glucose",amount:"60 g"},{item:"Water",amount:"85 g"},{item:"Cacaopoeder",amount:"10 g"},{item:"Pure chocolade",amount:"30 g"},{item:"Water (koud)",amount:"25 g"}],
    steps:["Verhit suiker, glucose en 85 g water tot 115 °C.","Voeg cacao en chocolade toe.","Koel terug met 25 g water."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-vruchtenbavarois", name:"Vruchtenbavarois", category:"Mousses", yield:"1 bak",
    ingredients:[{item:"Vruchtencoulis",amount:"338 g"},{item:"Monin",amount:"100 g"},{item:"Eiwit",amount:"225 g"},{item:"Slagroom",amount:"675 g"},{item:"Suiker",amount:"150 g"},{item:"Gelatine",amount:"22 g"}],
    steps:["Verwarm de coulis met de monin en los de gelatine erin op.","Sla de slagroom met 75 g suiker lobbig.","Sla het eiwit met 75 g suiker op.","Meng het eiwit met de coulis.","Meng de rest erdoor."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-wittechoco-yoghurtganache", name:"Witte choco-yoghurtganache", category:"Zoet & patisserie", yield:"≈ 485 g",
    ingredients:[{item:"Yoghurt",amount:"185 g"},{item:"Witte chocolade",amount:"300 g"}],
    steps:["Verwarm samen au bain-marie tot 35 °C.","Koel terug."],
    endorsements:[], chefsPick:false, baseId:"pat-ganache-choco-koffie", isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-amarene-kersengelei", name:"Amarene-kersengelei", category:"Gels", yield:"1 blik",
    ingredients:[{item:"Amarene kersen",amount:"1 blik"},{item:"Water",amount:"100 g"},{item:"Agar",amount:"3 g"},{item:"Gellan",amount:"2 g"}],
    steps:["Pureer het blik en zeef met het water.","Kook de agar en gellan mee."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-american-pancake", name:"American pancakes", category:"Zoet & patisserie", yield:"≈ 20 st",
    ingredients:[{item:"Patentbloem",amount:"500 g"},{item:"Suiker",amount:"2 el"},{item:"Bakpoeder",amount:"20 g"},{item:"Zout",amount:"2,5 g"},{item:"Eieren",amount:"2 st"},{item:"Melk",amount:"5 dl"},{item:"Geklaarde boter",amount:"30 g"},{item:"Vanillesuiker",amount:"2 el"}],
    steps:["Meng bloem, suiker, bakpoeder en zout.","Klop de eieren los en roer glad met de droge stoffen.","Voeg roerend de melk toe met de boter.","Bak in een kleine pan, 1 cm dik."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-compote-banaan", name:"Compote van banaan", category:"Chutney & jam", yield:"≈ 1,2 kg",
    ingredients:[{item:"Bananen",amount:"1 kg"},{item:"Water",amount:"1,5 dl"},{item:"Suiker",amount:"200 g"},{item:"Citroen",amount:"1 st"},{item:"Sinaasappel",amount:"1 st"},{item:"Vanillesuiker",amount:"16 g"}],
    steps:["Kook water, suiker, vanillesuiker en de rasp van de sinaasappel.","Koel af met citroensap, 2 el sinaasappelsap en brunoise van banaan.","Koel terug."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-basis-spongecake", name:"Basis-spongecake (sifon)", category:"Zoet & patisserie", yield:"1 sifon",
    ingredients:[{item:"Eiwit",amount:"150 g"},{item:"Amandelpoeder",amount:"80 g"},{item:"Suiker",amount:"80 g"},{item:"Bloem",amount:"30 g"},{item:"Eidooier",amount:"60 g"}],
    steps:["Draai alles glad in de blender.","Zeef en giet in een halveliter-sifon.","Belucht met 2 patronen.","Stort in een kartonnen bekertje (vooraf inprikken), maximaal half vullen.","40 sec in de magnetron."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Sifon", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-kokosmacaron", name:"Kokosmacaron", category:"Zoet & patisserie", yield:"1 plaat",
    ingredients:[{item:"Eiwit",amount:"60 g + 60 g"},{item:"Suiker",amount:"150 g"},{item:"Water",amount:"35 g"},{item:"Amandelpoeder",amount:"100 g"},{item:"Gedroogde kokos",amount:"200 g"},{item:"Poedersuiker",amount:"150 g"}],
    steps:["Maal amandelpoeder, kokos en poedersuiker fijn en zeef.","Meng met 60 g eiwit.","Kook de suiker met het water tot 118 °C.","Klop met de andere 60 g eiwit tot merengue en draai koud.","Meng alles en bak 20 min op 120 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-ganache-choco-koffie", name:"Ganache van pure chocolade en koffie", category:"Zoet & patisserie", yield:"≈ 390 g",
    ingredients:[{item:"Slagroom, ongezoet",amount:"170 g"},{item:"Water",amount:"20 g"},{item:"Espresso",amount:"20 g"},{item:"Pure chocolade",amount:"180 g"}],
    steps:["Verwarm slagroom, water en koffie (niet koken).","Roer de chocolade erdoor en laat afkoelen."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-romanoffsaus", name:"Romanoffsaus", category:"Sauzen & emulsies", yield:"≈ 2,5 l",
    ingredients:[{item:"Aardbeiencoulis",amount:"750 g"},{item:"Slagroom, ongezoet",amount:"1,5 l"},{item:"Poedersuiker",amount:"100 g"},{item:"Crème de cassis",amount:"2 dl"},{item:"Likeur",amount:"1 dl"}],
    steps:["Sla de slagroom lobbig met de poedersuiker.","Spatel de rest erdoor."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-boterkoek", name:"Boterkoek", category:"Zoet & patisserie", yield:"1/1 gastronoombak",
    ingredients:[{item:"Boter",amount:"1350 g"},{item:"Bloem",amount:"1650 g"},{item:"Witte basterdsuiker",amount:"1175 g"},{item:"Eieren",amount:"3 st"},{item:"Sinaasappelrasp",amount:"van 3 st"},{item:"Vanillesuiker",amount:"3 el"},{item:"Rozijnen",amount:"200 g"}],
    steps:["Klop de boter wit met de suiker.","Voeg de eieren en rasp toe.","Meng de bloem erdoor (met vanillesuiker en rozijnen).","Bestrijk met ei voordat hij de oven ingaat.","Bak af in een voorverwarmde oven: 20–25 min op 170 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-trekdropparels", name:"Trekdropparels", category:"Gels", yield:"1 pot",
    ingredients:[{item:"Water",amount:"500 g"},{item:"Trekdrop",amount:"300 g"},{item:"Agar",amount:"8 g"},{item:"Zonnebloemolie",amount:"5 dl"}],
    steps:["Zet de olie in de vriezer.","Gaar water en trekdrop sous-vide.","Voeg de agar toe en laat koken.","Koel terug tot 45 °C.","Doe in een spuitflesje en druppel in de olie.","Zeef de olie en spoel de parels af met water."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Sous-vide", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-kaneel-speculaasmousse", name:"Kaneel-speculaasmousse", category:"Mousses", yield:"1 bak",
    ingredients:[{item:"Slagroom",amount:"5 dl"},{item:"Monin",amount:"4 el"},{item:"Speculaaspoeder",amount:"0,5 el"},{item:"Gelatine",amount:"3 blaadjes"},{item:"Eiwit",amount:"90 g"},{item:"Suiker",amount:"100 g"}],
    steps:["Verwarm 1 dl slagroom en los de gelatine op.","Sla 4 dl slagroom lobbig; voeg poeder en monin toe, dan de lauwwarme room.","Sla het eiwit op met de suiker.","Meng alles."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-bokkenpootjes", name:"Bokkenpootjes", category:"Zoet & patisserie", yield:"1 plaat",
    ingredients:[{item:"Amandelpoeder",amount:"350 g"},{item:"Poedersuiker",amount:"350 g"},{item:"Eiwit",amount:"400 g"},{item:"Witte basterdsuiker",amount:"400 g"},{item:"— Crème pât: slagroom, ongezoet",amount:"1 l"},{item:"Suiker",amount:"400 g"},{item:"Vanillesuiker",amount:"8 g"},{item:"Custard",amount:"60 g"},{item:"Eidooier",amount:"120 g"},{item:"Cointreau",amount:"3 ml"}],
    steps:["Koekjes: sla het eiwit op.","Meng de rest (gezeefd) met het eiwit.","Bak 10 min af op 175 °C.","Crème: laat slagroom, suiker, vanille en Cointreau 30 min trekken.","Meng de eidooiers met de custard.","Giet het kokende roommengsel op de dooiers en meng goed.","Verhit tot de juiste dikte, zeef, en haal met de staafmixer uit de schift."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-botercreme", name:"Botercrème", category:"Zoet & patisserie", yield:"≈ 1,5 kg",
    ingredients:[{item:"Boter",amount:"800 g"},{item:"Crème pâtissière",amount:"500 g"},{item:"Poedersuiker",amount:"250 g"},{item:"Zout",amount:"snufje"}],
    steps:["Boter op kamertemperatuur.","Meng alles in de Magimix."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-brownie", name:"Brownie", category:"Zoet & patisserie", yield:"1 plaat",
    ingredients:[{item:"Pure chocolade",amount:"340 g"},{item:"Roomboter",amount:"500 g"},{item:"Eieren",amount:"425 g"},{item:"Suiker",amount:"750 g"},{item:"Vanillesuiker",amount:"2 el"},{item:"Bloem",amount:"340 g"},{item:"Bakpoeder",amount:"1 tl"}],
    steps:["Smelt de chocolade met de boter au bain-marie.","Sla de eieren met de suiker wit op.","Meng het eiermengsel met het chocomengsel.","Spatel bloem en bakpoeder (gezeefd) voorzichtig erdoor.","Optioneel: roer 300 g noten voorzichtig door het beslag.","Bak 20–25 min op 175 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-karamelmousse", name:"Karamelmousse", category:"Mousses", yield:"1 bak",
    ingredients:[{item:"Gecondenseerde melk",amount:"1 blik"},{item:"Room, ongezoet",amount:"400 ml"},{item:"Eiwit",amount:"50 g"},{item:"Gelatine",amount:"1 blaadje"}],
    steps:["Verwijder het etiket en kook het blik 3 uur in water.","Klop de room lobbig en sla het eiwit stijf.","Meng de karamel met het eiwit en voeg de room toe."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-kletskop", name:"Kletskoppen", category:"Zoet & patisserie", yield:"1 plaat",
    ingredients:[{item:"Boter",amount:"175 g"},{item:"Witte wijn",amount:"150 g"},{item:"Witte basterdsuiker",amount:"400 g"},{item:"Bloem",amount:"190 g"}],
    steps:["Meng de zachte boter met de wijn en de suiker in de Magimix; bloem erbij.","Bak 8 min op 180 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-vruchtenmousse", name:"Vruchtenmousse", category:"Mousses", yield:"grote batch",
    ingredients:[{item:"Vruchtencoulis",amount:"2 l"},{item:"Room, ongezoet",amount:"2 l"},{item:"Suiker",amount:"480 g"},{item:"Eidooier",amount:"640 g"},{item:"Gelatine",amount:"24 g"}],
    steps:["Kook de coulis in tot 1,2 l.","Los de gelatine op in de coulis.","Verwarm de eidooiers au bain-marie met de suiker tot deze is opgelost en klop stijf.","Sla de room lobbig.","Meng de eidooiers (mits koud) met de coulis en voeg de room toe."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-advocaat", name:"Advocaat", category:"Zoet & patisserie", yield:"≈ 1 l",
    ingredients:[{item:"Eigeel",amount:"8 st"},{item:"Vanillesuiker",amount:"8 g"},{item:"Suiker",amount:"400 g"},{item:"Korenwijn",amount:"5 dl"}],
    steps:["Roer het eigeel los met vanille en suiker.","Verwarm au bain-marie en voeg langzaam de wijn toe, tot ongeveer 85 °C (gewenste dikte)."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-advocaatmousse", name:"Advocaatmousse", category:"Mousses", yield:"1 bak",
    ingredients:[{item:"Room, gezoet",amount:"3,75 dl"},{item:"Eiwit",amount:"100 g"},{item:"Suiker",amount:"1 el"},{item:"Vanillesuiker",amount:"1 el"},{item:"Advocaat",amount:"4,5 dl"}],
    steps:["Sla de room lobbig en het eiwit met de suikers stijf.","Meng de advocaat met het eiwit en spatel de room erdoor."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-vruchten-pannacotta", name:"Vruchtenpannacotta", category:"Zoet & patisserie", yield:"1 bak",
    ingredients:[{item:"Room, ongezoet",amount:"500 g"},{item:"Suiker",amount:"100 g"},{item:"Vruchtencoulis",amount:"400 g"},{item:"Gelatine",amount:"8 blaadjes"}],
    steps:["Kook alles, los de gelatine erdoor, zeef en stort."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-granite-port-roodfruit", name:"Granité van rode port en roodfruit", category:"Sorbet & ijs", yield:"1 bak",
    ingredients:[{item:"Rode wijn",amount:"250 ml"},{item:"Suiker",amount:"150 g"},{item:"Frambozen",amount:"250 g"},{item:"Aardbeien",amount:"250 g"},{item:"Rode port",amount:"250 ml"}],
    steps:["Los de suiker op in de wijn en pureer alles in de blender.","Vries weg en roer elke 30 min met de garde erdoor."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-frambozentoffee", name:"Frambozentoffee", category:"Zoet & patisserie", yield:"≈ 900 g",
    ingredients:[{item:"Frambozencoulis",amount:"300 g"},{item:"Koksroom",amount:"300 g"},{item:"Suiker",amount:"250 g"},{item:"Honing",amount:"75 g"},{item:"Limoensap",amount:"25 g"}],
    steps:["Kook alles en laat opstijven."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-notenspijs", name:"Notenspijs", category:"Zoet & patisserie", yield:"≈ 300 g",
    ingredients:[{item:"Walnoot",amount:"100 g"},{item:"Amandelschaafsel",amount:"100 g"},{item:"Poedersuiker",amount:"100 g"},{item:"Walnootolie",amount:"voor de dikte"}],
    steps:["Draai walnoot, amandelschaafsel en poedersuiker in de Magimix.","Voeg walnootolie toe voor de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-drambuiecreme", name:"Drambuie-crème", category:"Zoet & patisserie", yield:"≈ 600 g",
    ingredients:[{item:"Drambuie",amount:"115 g"},{item:"Slagroom, ongezoet",amount:"2 dl"},{item:"Witte chocolade",amount:"300 g"}],
    steps:["Kook de Drambuie met de slagroom.","Roer de chocolade erdoor en roer glad; laat opstijven."],
    endorsements:[], chefsPick:false, baseId:"pat-ganache-choco-koffie", isBase:false, season:["Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-chocolademousse", name:"Chocolademousse (wit)", category:"Mousses", yield:"grote batch",
    ingredients:[{item:"Witte chocolade (of 500 g puur)",amount:"550 g"},{item:"Water",amount:"1 dl"},{item:"Glucose",amount:"230 g"},{item:"Room, ongezoet",amount:"0,9 l"},{item:"Eiwit",amount:"100 g"},{item:"Suiker",amount:"90 g"}],
    steps:["Breng glucose en water aan de kook en roer glad met de chocolade.","Sla de room lobbig en het eiwit met de suiker stijf.","Meng de chocolade met het eiwit (eerst familie maken!) en spatel ten slotte de room erdoor."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-chocolade-pannacotta", name:"Chocoladepannacotta", category:"Zoet & patisserie", yield:"1 bak",
    ingredients:[{item:"Gelatine",amount:"8 g"},{item:"Room",amount:"450 g"},{item:"Suiker",amount:"85 g"},{item:"Pure couverture",amount:"80 g"}],
    steps:["Kook de room met de suiker.","Los de gelatine op, daarna de chocolade."],
    endorsements:[], chefsPick:false, baseId:"pat-vruchten-pannacotta", isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-granite-port-tijm", name:"Granité van rode port met tijm", category:"Sorbet & ijs", yield:"1 bak",
    ingredients:[{item:"Rode wijn",amount:"250 ml"},{item:"Rode port",amount:"250 ml"},{item:"Tijm",amount:"2 takjes"},{item:"Framboos (diepvries)",amount:"250 g"},{item:"Aardbei (diepvries)",amount:"250 g"}],
    steps:["Kook wijn, port en tijm 10 min en zeef.","Voeg het fruit toe en pureer.","Vries weg als granité."],
    endorsements:[], chefsPick:false, baseId:"pat-granite-port-roodfruit", isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-koffie-choco-ganache", name:"Koffie-chocoganache", category:"Zoet & patisserie", yield:"≈ 370 g",
    ingredients:[{item:"Slagroom",amount:"170 ml"},{item:"Espresso",amount:"20 ml"},{item:"Pure couverture",amount:"180 g"}],
    steps:["Verwarm de room met de espresso.","Los de chocolade erin op."],
    endorsements:[], chefsPick:false, baseId:"pat-ganache-choco-koffie", isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-langevingers", name:"Lange vingers", category:"Zoet & patisserie", yield:"1 plaat",
    ingredients:[{item:"Eiwit",amount:"180 g"},{item:"Suiker",amount:"140 g"},{item:"Bloem",amount:"80 g"},{item:"Aardappelzetmeel",amount:"80 g"},{item:"Dooier",amount:"120 g"},{item:"Suiker om te bestrooien",amount:"naar behoefte"}],
    steps:["Klop het eiwit op met de suiker; voeg de dooiers toe en spatel erdoor.","Voeg bloem en zetmeel toe.","Spuit op, bestrooi met suiker en bak 5–6 min op 210 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-yoghurtcrumble", name:"Yoghurtcrumble", category:"Zoet & patisserie", yield:"1 plaat",
    ingredients:[{item:"Bloem",amount:"125 g"},{item:"Boter",amount:"125 g"},{item:"Poedersuiker",amount:"125 g"},{item:"Yopol",amount:"75 g"}],
    steps:["Meng alles en bak af op 160 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-witte-bros", name:"Witte bros", category:"Zoet & patisserie", yield:"≈ 575 g",
    ingredients:[{item:"Witte couverture",amount:"500 g"},{item:"Cacaoboter",amount:"75 g"}],
    steps:["Smelt samen en roer glad."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-griesmeelpudding", name:"Griesmeelpudding", category:"Zoet & patisserie", yield:"≈ 750 g",
    ingredients:[{item:"Melk",amount:"500 ml"},{item:"Suiker",amount:"60 g"},{item:"Griesmeel",amount:"35 g"},{item:"Slagroom",amount:"150 g"},{item:"Gelatine",amount:"2 blaadjes"},{item:"Zout",amount:"mespuntje"}],
    steps:["Kook melk, suiker en griesmeel met een mespuntje zout.","Voeg de gelatine toe en laat afkoelen.","Meng de lobbig geslagen slagroom erdoor."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-kersencompote", name:"Kersencompote", category:"Chutney & jam", yield:"1 bak",
    ingredients:[{item:"Kersen (diepvries)",amount:"1 zak"},{item:"Rode port",amount:"150 g"},{item:"Kaneelstok",amount:"1 st"},{item:"Steranijs",amount:"2 st"},{item:"Kersencoulis",amount:"400 g"},{item:"Geleisuiker",amount:"200 g"}],
    steps:["Kook alles tot de gewenste structuur van de kersen.","Haal de droogwaren eruit."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-kruimeldeeg", name:"Kruimeldeeg", category:"Zoet & patisserie", yield:"3 baktrays",
    ingredients:[{item:"Gezouten boter, zacht",amount:"1 kg"},{item:"Suiker",amount:"1 kg"},{item:"Bloem",amount:"1 kg"},{item:"Amandelpoeder",amount:"750 g"},{item:"Bakpoeder",amount:"80 g"},{item:"Dooier",amount:"16 g"}],
    steps:["Zeef de bloem en meng alles.","Bak af in 3 baktrays op 180 °C; roer elke 5 min met een garde erdoor tot de gewenste kleur en garing."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-creme-brulee", name:"Crème brûlée", category:"Zoet & patisserie", yield:"grote batch",
    ingredients:[{item:"Volle melk",amount:"1 l"},{item:"Room, ongezoet",amount:"1,15 l"},{item:"Vanillesuiker",amount:"8 g"},{item:"Steranijs",amount:"8 st"},{item:"Suiker",amount:"450 g"},{item:"Eidooier",amount:"650 g"}],
    steps:["Kook 5 dl melk met de steranijs, het vanillesuiker en de suiker.","Zeef de melk en voeg bij de room; voeg de eidooiers rustig toe en roer glad.","Stoom 45 min op 85 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Stoomoven", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-karamelsaus", name:"Karamelsaus", category:"Sauzen & emulsies", yield:"≈ 1,5 kg",
    ingredients:[{item:"Witte basterdsuiker",amount:"600 g"},{item:"Glucose",amount:"100 g"},{item:"Water",amount:"0,5 dl"},{item:"Room",amount:"800 g"}],
    steps:["Karamelliseer suiker, glucose en water.","Maak de room lauwwarm en voeg rustig toe aan de karamel."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-vanille-cremeux", name:"Vanille-cremeux (crème brûlée)", category:"Zoet & patisserie", yield:"≈ 1,3 kg",
    ingredients:[{item:"Slagroom",amount:"875 g"},{item:"Honing",amount:"35 g"},{item:"Suiker",amount:"160 g"},{item:"Vanillesuiker",amount:"50 g"},{item:"Dooier",amount:"210 g"},{item:"Gelatine",amount:"5 blaadjes"}],
    steps:["Verwarm alles en los de gelatine erin op."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-citroentaartjes", name:"Citroentaartjes", category:"Zoet & patisserie", yield:"± 12 st",
    ingredients:[{item:"Bodem hardewenerdeeg",amount:"15 min 160 °C"},{item:"Citroensap/coulis",amount:"300 g"},{item:"Suiker",amount:"350 g"},{item:"Eieren",amount:"6 st"},{item:"Dooier",amount:"9 st"},{item:"Boter",amount:"300 g"}],
    steps:["Bak de bodems van hardewenerdeeg 15 min op 160 °C.","Verwarm sap, suiker, ei en dooiers au bain-marie tot lichte binding.","Voeg 150 g boter toe en verwarm verder tot hangend; voeg de rest van de boter toe.","Vul en bak af: 15 min op 120 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-romanoff-aardbei-wodka", name:"Romanoffsaus van aardbei en wodka", category:"Sauzen & emulsies", yield:"≈ 1,2 kg",
    ingredients:[{item:"Aardbei (diepvries)",amount:"1 kg"},{item:"Wodka",amount:"100 ml"},{item:"Suiker",amount:"100 g"}],
    steps:["Kook en blender."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-bramenschuim", name:"Bramenschuim", category:"Schuim & espuma", yield:"1 kidde",
    ingredients:[{item:"Bramencoulis",amount:"200 g"},{item:"Suiker",amount:"75 g"},{item:"Water",amount:"225 g"},{item:"Espuma-poeder",amount:"30 g"}],
    steps:["Meng en staafmixer.","Doe in de kidde met 1 patroon."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer","Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Kidde / sifon", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-muntparels", name:"Muntparels", category:"Gels", yield:"1 pot",
    ingredients:[{item:"Munt",amount:"1 bos"},{item:"Water",amount:"0,8 l"},{item:"Monin mojito",amount:"2 dl"},{item:"Suiker",amount:"100 g"},{item:"Agar",amount:"12 g"}],
    steps:["Verwarm de vloeistof met de suiker en zeef.","Voeg de agar toe en druppel druppelsgewijs in zonnebloemolie."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-mascarpone-stracciatella", name:"Mascarpone-stracciatella", category:"Zoet & patisserie", yield:"≈ 700 g",
    ingredients:[{item:"Mascarpone",amount:"500 g"},{item:"Suikerwater",amount:"100 ml"},{item:"Gelatine",amount:"7 g"},{item:"Slagroom",amount:"100 ml"}],
    steps:["Klop de mascarpone los.","Los de gelatine op in het suikerwater en meng.","Sla de slagroom lobbig en meng erdoor."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
];

const KEUKENMAP = [
  { id:"map-kletskop-quinoa", name:"Kletskop van quinoa", category:"Krokant & garnituur", yield:"1 plaat",
    ingredients:[{item:"Poedersuiker",amount:"160 g"},{item:"Boter",amount:"100 g"},{item:"Bloem",amount:"55 g"},{item:"Jus d'orange",amount:"80 g"},{item:"Rauwe quinoa",amount:"100 g"}],
    steps:["Meng alles behalve de quinoa.","Voeg de quinoa toe.","Bak af op 140 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-limoenmayo", name:"Limoenmayo", category:"Sauzen & emulsies", yield:"≈ 1 l",
    ingredients:[{item:"Limoen",amount:"1 st"},{item:"Eidooier",amount:"100 g"},{item:"Azijn",amount:"25 g"},{item:"Limoensap",amount:"5 g"},{item:"Mosterd",amount:"10 g"},{item:"Olie",amount:"8 dl"}],
    steps:["Rasp de limoen fijn.","Draai alles behalve de olie glad in de Magimix.","Voeg de olie langzaam toe tot de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:"map-basismayonaise", isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-rouleau-makreel", name:"Rouleau van gerookte makreel", category:"Vis", yield:"1 rol",
    ingredients:[{item:"Gerookte makreelfilets",amount:"2 st"},{item:"Jus de veau",amount:"0,5 dl"}],
    steps:["Maak de filets schoon.","Draai los met de vlinder in de KitchenAid.","Voeg de jus de veau langzaam toe (vloeibaar maar niet heet).","Rol op en laat opstijven."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vis", ferment:false, gear:"KitchenAid", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-5spice-zilveruitjes", name:"5-spice zilveruitjes", category:"Pickles & zuur", yield:"≈ 500 g",
    ingredients:[{item:"Schone zilveruitjes",amount:"500 g"},{item:"Boter",amount:"150 g"},{item:"5-spice",amount:"2 el"}],
    steps:["Myoteer de 5-spice in een beetje boter.","Voeg de rest van de boter toe.","Vacumeer en gaar 45 min op 70 °C in de roner."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Roner / vacumeermachine", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pulled-pork-greenegg", name:"Pulled pork van de Green Egg", category:"Vlees", yield:"1 nek",
    ingredients:[{item:"Varkensnek",amount:"1 st"},{item:"African rub",amount:"royaal"}],
    steps:["Smeer de varkensnek een dag van tevoren in met de rub.","Verwarm de Green Egg op 120 °C en gaar tot een kerntemperatuur van 75 °C.","Stook de Green Egg naar 150 °C tot een kerntemperatuur van 85 °C.","Pak in in aluminiumfolie."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Varkensvlees", ferment:false, gear:"Green Egg", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-knolselderijsalade", name:"Knolselderijsalade", category:"Groente · rauw", yield:"1 bak",
    ingredients:[{item:"Knolselderij",amount:"1 st"},{item:"Aardappelen",amount:"4 st"},{item:"Ui",amount:"1 st"},{item:"Boter",amount:"klontje"},{item:"Witte wijn",amount:"scheut"},{item:"Mayonaise",amount:"naar smaak"},{item:"Groene kruiden",amount:"naar smaak"}],
    steps:["Snijd knolselderij en aardappel brunoise.","Stoof gaar met de gesnipperde ui in de boter en witte wijn.","Koel terug en maak aan met de mayonaise, peper, zout en groene kruiden."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-zilverui-compote", name:"Zilveruicompote", category:"Chutney & jam", yield:"1 pot",
    ingredients:[{item:"Zilverui",amount:"100 g"},{item:"Rozijnen",amount:"50 g"},{item:"Paprikapoeder",amount:"1 tl"},{item:"Kaneelstok",amount:"1 st"},{item:"Rode port",amount:"2 dl"},{item:"Bruine basterdsuiker",amount:"50 g"}],
    steps:["Fruit de zilverui aan, paprikapoeder erbij en myoteren.","Voeg de rest toe en kook in tot de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-citrusolie", name:"Citrusolie", category:"Oliën & vinaigrettes", yield:"≈ 5 dl",
    ingredients:[{item:"Knoflook",amount:"15 g"},{item:"Ui",amount:"40 g"},{item:"Rozemarijn",amount:"5 g"},{item:"Sinaasappelschil",amount:"20 g"},{item:"Olie",amount:"5 dl"}],
    steps:["Fruit knoflook, ui en rozemarijn aan.","Voeg de olie en sinaasappelschil toe.","20 min op 58 °C in de roner."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Roner", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-venkel-sinaasappelsalade", name:"Venkel-sinaasappelsalade", category:"Groente · rauw", yield:"1 bak",
    ingredients:[{item:"Venkels",amount:"3 st"},{item:"Sinaasappelsap",amount:"van 2 st"},{item:"Sinaasappelrasp",amount:"van 1 st"},{item:"Olijfolie",amount:"scheut"},{item:"Zout",amount:"naar smaak"}],
    steps:["Haal de venkel door de Magimix (fijne blad).","Bak de gesneden venkel licht aan in de olijfolie met de rasp en het sap."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-knolselderijmayo", name:"Knolselderijmayo", category:"Sauzen & emulsies", yield:"≈ 500 g",
    ingredients:[{item:"Knolselderij",amount:"200 g"},{item:"Koksroom",amount:"2 dl"},{item:"Mayonaise",amount:"100 g"}],
    steps:["Snijd de knolselderij in kleine stukjes en gaar in de room.","Draai alles in de Magimix en zeef.","Meng met de mayonaise."],
    endorsements:[], chefsPick:false, baseId:"map-basismayonaise", isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-rillette-heek", name:"Rillette van heek", category:"Vis", yield:"≈ 700 g",
    ingredients:[{item:"Heek",amount:"500 g"},{item:"Knoflook",amount:"1 teen"},{item:"Uien",amount:"2 st"},{item:"Witte wijn",amount:"1 dl"},{item:"Olijfolie",amount:"2 dl"}],
    steps:["Zout de heekfilet en laat 1 uur intrekken.","Bak ui, knoflook en heek licht aan.","Voeg de wijn toe en kook het geheel gaar.","Draai fijn in de Magimix en monteer met de olijfolie."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vis", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-cacik", name:"Cacik", category:"Sauzen & emulsies", yield:"≈ 700 g",
    ingredients:[{item:"Komkommer",amount:"1 st"},{item:"Griekse yoghurt",amount:"500 g"},{item:"Knoflook",amount:"1 teen"},{item:"Dille, fijngehakt",amount:"1 el"},{item:"Munt, fijngehakt",amount:"1 el"}],
    steps:["Verwijder het zaad uit de komkommer en maal fijn in de blender.","Voeg de rest toe en breng op smaak."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-creme-miso-sesam", name:"Crème van miso en sesam", category:"Sauzen & emulsies", yield:"≈ 250 g",
    ingredients:[{item:"Koksroom",amount:"100 g"},{item:"Sesampasta",amount:"100 g"},{item:"Miso",amount:"25 g"},{item:"Knoflook",amount:"1 teen"}],
    steps:["Draai alles glad in de blender en breng op smaak."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-wasabi-crumble", name:"Wasabicrumble", category:"Krokant & garnituur", yield:"≈ 900 g",
    ingredients:[{item:"Sesam",amount:"100 g"},{item:"Wasabinootjes",amount:"400 g"},{item:"Gebakken uitjes",amount:"400 g"}],
    steps:["Bruneer het sesamzaad en draai samen met de wasabinootjes fijn.","Hak de uitjes er grof doorheen."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-bitterbal-eidooier", name:"Bitterbal van eidooier", category:"Krokant & garnituur", yield:"per stuk",
    ingredients:[{item:"Eieren",amount:"naar behoefte"},{item:"Broodkruim",amount:"om te paneren"}],
    steps:["Verwarm de roner op 63 °C en leg de eieren er 2 uur in.","Spoel 5 min koud.","Kraak de eieren en verwijder het eiwit; paneer de dooiers wanneer ze vochtig zijn.","Frituur op 180 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Roner / friteuse", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-krokante-kippendijen", name:"Krokante kippendijen", category:"Vlees", yield:"1 kg",
    ingredients:[{item:"Kippendijen",amount:"1 kg"},{item:"Sojasaus",amount:"1 dl"},{item:"Sake",amount:"50 ml"},{item:"Knoflook",amount:"2 tenen"},{item:"Broodkruim",amount:"100 g"},{item:"Bloem",amount:"100 g"}],
    steps:["Maak de kippendijen schoon en snijd op de gewenste grootte.","Marineer in een vacumeerzak met de soja, sake en gehakte knoflook.","Gaar 30 min op 58 °C in de roner.","Draai de panko en bloem samen fijn en paneer het vlees.","Frituur goudbruin op 180 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Kip", ferment:false, gear:"Roner / friteuse", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-caesardressing", name:"Caesardressing", category:"Sauzen & emulsies", yield:"≈ 1 l",
    ingredients:[{item:"Knoflook",amount:"2 tenen"},{item:"Oude kaas",amount:"25 g"},{item:"Ei",amount:"150 g"},{item:"Fijne mosterd",amount:"1 el"},{item:"Citroensap",amount:"van 1 st"},{item:"Ansjovisfilets",amount:"6 st"},{item:"Olijfolie",amount:"5 dl"}],
    steps:["Draai alles (op de olijfolie na) fijn in de Magimix.","Voeg de olijfolie langzaam toe tot de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vis", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-broccolicompote", name:"Broccolicompote", category:"Purees", yield:"1 bak",
    ingredients:[{item:"Broccoli",amount:"naar behoefte"}],
    steps:["Blancheer de broccoliroosjes en draai fijn tot een puree.","Schil de steel, snijd in fijne brunoise en blancheer.","Meng de brunoise met de puree en breng op smaak."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-kerrieolie", name:"Kerrieolie", category:"Oliën & vinaigrettes", yield:"≈ 6 dl",
    ingredients:[{item:"Kerriepoeder",amount:"15 g"},{item:"Zonnebloemolie",amount:"6 dl"}],
    steps:["Doe samen in een vacumeerzak.","Leg 2 uur in de roner op 75 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Roner", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-kerriemayonaise", name:"Kerriemayonaise", category:"Sauzen & emulsies", yield:"≈ 700 g",
    ingredients:[{item:"Eidooier",amount:"60 g"},{item:"Fijne mosterd",amount:"1 el"},{item:"Wittewijnazijn",amount:"30 g"},{item:"Kerrieolie",amount:"6 dl"}],
    steps:["Draai de eidooier, mosterd en wittewijnazijn in de Magimix.","Voeg de kerrieolie langzaam toe tot de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:"map-basismayonaise", isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-aceto-vinaigrette", name:"Aceto-vinaigrette", category:"Oliën & vinaigrettes", yield:"≈ 1,4 l",
    ingredients:[{item:"Jus de veau",amount:"6 dl"},{item:"Olijfolie",amount:"4 dl"},{item:"Zonnebloemolie",amount:"2 dl"},{item:"Aceto balsamico",amount:"2 dl"}],
    steps:["Meng alles.","Schudden voor gebruik."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Rundvlees", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-rodebieten-zalm", name:"Rodebietenzalm (gemarineerd)", category:"Vis", yield:"1 zijde",
    ingredients:[{item:"Zalmzijde",amount:"1 st"},{item:"Dille, gehakt",amount:"1 bos"},{item:"Bruine basterdsuiker",amount:"150 g"},{item:"Rodebietensap",amount:"1,5 dl"},{item:"Zeezout",amount:"65 g"},{item:"Korenwijn",amount:"0,5 dl"}],
    steps:["Maak de zijde zalm schoon.","Bestrooi een grote gastronoombak met alle ingrediënten en leg de zalm erbovenop.","Zet 24 uur onder druk weg."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vis", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-compote-radijs", name:"Compote van radijs", category:"Chutney & jam", yield:"1 bak",
    ingredients:[{item:"Radijs",amount:"1 kg"},{item:"Rode ui, gesnipperd",amount:"250 g"},{item:"Ui, gesnipperd",amount:"250 g"},{item:"Rode pepers, fijngehakt",amount:"4 st"},{item:"Gembersiroop",amount:"1 dl"},{item:"Suiker",amount:"200 g"},{item:"Wittewijnazijn",amount:"2,5 dl"}],
    steps:["Kook alles behalve de radijs 10 min.","Voeg de radijs toe en gaar 10 min zachtjes."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Lente","Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-polentafriet", name:"Polentafriet", category:"Krokant & garnituur", yield:"1 gastronoombak",
    ingredients:[{item:"Polenta",amount:"500 g"},{item:"Water",amount:"2 l"},{item:"Roomboter",amount:"2 el"},{item:"Parmezaanse kaas",amount:"250 g"},{item:"Rozemarijn",amount:"2 takken"}],
    steps:["Breng het water met de rozemarijn aan de kook; verwijder de takken na 5 min koken.","Voeg de polenta toe en gaar tot een dikke pap.","Voeg als laatste de kaas en boter toe en laat goed smelten.","Stort in een gastronoombak en zet weg onder druk."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-tomatenvinaigrette", name:"Tomatenvinaigrette", category:"Oliën & vinaigrettes", yield:"≈ 5 dl",
    ingredients:[{item:"Vocht van gepofte tomaatjes",amount:"4 dl"},{item:"Gepofte tomaatjes",amount:"10 st"},{item:"Fruitazijn",amount:"50 g"}],
    steps:["Staafmix alles en zeef.","Schudden voor gebruik."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-dressing-bleu-de-gex", name:"Dressing bleu de Gex", category:"Oliën & vinaigrettes", yield:"≈ 5 dl",
    ingredients:[{item:"Bleu de Gex",amount:"100 g"},{item:"Wittewijnazijn",amount:"1 dl"},{item:"Gembersiroop",amount:"1 el"},{item:"Olijfolie",amount:"3 dl"}],
    steps:["Draai alles glad in de blender (kaas rustig toevoegen) en zeef.","Schudden voor gebruik."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-basilicumkorst", name:"Basilicumkorst", category:"Krokant & garnituur", yield:"2 banen",
    ingredients:[{item:"Boter",amount:"100 g"},{item:"Broodkruim",amount:"200 g"},{item:"Parmezaanse kaas",amount:"100 g"},{item:"Basilicum, gehakt",amount:"100 g"},{item:"Sinaasappelsap",amount:"2 el"}],
    steps:["Blender alles fijn en draai tot een stevige massa.","Rol het mengsel uit tussen folie, snijd banen en bewaar in de vriezer."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-truffelmayonaise", name:"Truffelmayonaise", category:"Sauzen & emulsies", yield:"≈ 700 g",
    ingredients:[{item:"Eidooiers",amount:"4 st"},{item:"Dijonmosterd",amount:"1 el"},{item:"Wittewijnazijn",amount:"30 g"},{item:"Zonnebloemolie",amount:"6 dl"},{item:"Truffelpasta",amount:"2 el"}],
    steps:["Draai alles behalve de olie glad in de Magimix.","Voeg de olie langzaam toe tot de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:"map-basismayonaise", isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-notendressing", name:"Notendressing", category:"Oliën & vinaigrettes", yield:"≈ 1,7 l",
    ingredients:[{item:"Fijne mosterd",amount:"8 g"},{item:"Water",amount:"1 dl"},{item:"Eidooier",amount:"75 g"},{item:"Zonnebloemolie",amount:"1,3 l"},{item:"Walnootolie",amount:"1,5 dl"},{item:"Wittewijnazijn",amount:"1,5 dl"},{item:"Poedersuiker",amount:"45 g"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"}],
    steps:["Draai alles op de olie na fijn in de Magimix.","Voeg de olie langzaam toe tot de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-creme-van-dadels", name:"Crème van dadels", category:"Sauzen & emulsies", yield:"≈ 900 g",
    ingredients:[{item:"Witte wijn",amount:"220 g"},{item:"Suiker",amount:"200 g"},{item:"Water",amount:"220 g"},{item:"Jus de veau",amount:"65 g"},{item:"Boter",amount:"15 g"},{item:"Ontpitte dadels",amount:"400 g"}],
    steps:["Verhit de witte wijn met de suiker en giet op de dadels; laat koelen.","Haal de vellen van de dadels.","Draai met de overige ingrediënten glad in de Magimix en zeef."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Rundvlees", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-ingelegde-wintergroenten", name:"Ingelegde wintergroenten", category:"Pickles & zuur", yield:"3 soorten",
    ingredients:[{item:"Knolselderij",amount:"350 g"},{item:"Pompoen",amount:"350 g"},{item:"Koolraap",amount:"350 g"},{item:"Fruitazijn",amount:"4,5 dl"},{item:"Water",amount:"3 dl"},{item:"Suiker",amount:"200 g"},{item:"Korianderzaad",amount:"2,5 g"},{item:"Vanillesuiker",amount:"8 g"},{item:"Kruidnagel",amount:"2 st"}],
    steps:["Snijd de groenten brunoise en blancheer per soort beetgaar (bewaar apart).","Meng de overige ingrediënten en laat 30 min trekken op laag vuur.","Zeef de marinade en giet over de groenten.","Vacumeer per soort met de marinade."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Vacumeermachine", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-kikkomanmayonaise", name:"Kikkoman-mayonaise", category:"Sauzen & emulsies", yield:"≈ 800 g",
    ingredients:[{item:"Kikkoman",amount:"2,5 dl"},{item:"Eidooier",amount:"250 g"},{item:"Sojaolie",amount:"375 g"},{item:"Mosterdpoeder",amount:"10 g"},{item:"Fruitazijn",amount:"40 g"},{item:"Olijfolie",amount:"75 g"},{item:"Sesamolie",amount:"25 g"}],
    steps:["Kook de kikkoman in tot 1,2 dl en koel terug.","Maak van de overige ingrediënten mayonaise.","Voeg op het laatst de ingekookte kikkoman toe."],
    endorsements:[], chefsPick:false, baseId:"map-basismayonaise", isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-tofuwrap", name:"Tofuwrap", category:"Groente · rauw", yield:"± 12 st",
    ingredients:[{item:"Tofu",amount:"675 g"},{item:"Tahin",amount:"3 el"},{item:"Sojamelk",amount:"80 g"},{item:"Bloem",amount:"65 g"},{item:"Rijstmeel",amount:"60 g"},{item:"Verse kruiden",amount:"15 g"},{item:"Sojaolie",amount:"3 el"}],
    steps:["Pureer de tofu, tahin en sojamelk.","Meng alles en bak in olie."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-jambon-persille", name:"Jambon persillé", category:"Vlees", yield:"1 vorm",
    ingredients:[{item:"Gekookte ham",amount:"1 kg"},{item:"Slagroom",amount:"3 dl"},{item:"Gelatine",amount:"3 blaadjes"},{item:"Peterselie",amount:"royaal"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"}],
    steps:["Pluk de ham en hak de peterselie.","Kook de slagroom en los de gelatine erin op.","Meng alles en breng op smaak.","Zet onder druk weg."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Varkensvlees", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-basisdressing", name:"Basisdressing", category:"Oliën & vinaigrettes", yield:"≈ 900 g",
    ingredients:[{item:"Mosterd",amount:"8 g"},{item:"Water",amount:"1 dl"},{item:"Dooier",amount:"40 g"},{item:"Zonnebloemolie",amount:"700 ml"},{item:"Wittewijnazijn",amount:"75 ml"},{item:"Poedersuiker",amount:"25 g"},{item:"Zout",amount:"1 el"},{item:"Peper",amount:"20 draaien"}],
    steps:["Meng alles behalve de olie en het water.","Voeg de olie langzaam toe.","Voeg het water druppelsgewijs toe."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-cremeux-eendenlever", name:"Cremeux van eendenlever", category:"Vlees", yield:"≈ 550 g",
    ingredients:[{item:"Eendenlever",amount:"200 g"},{item:"Dooier",amount:"100 g"},{item:"Boter",amount:"100 g"},{item:"Room",amount:"150 g"},{item:"Gelatine",amount:"2 blaadjes"},{item:"Cognac",amount:"10 g"}],
    steps:["Snijd boter en lever in kleine blokjes (koel bewaren) en week de gelatine.","Verwarm room en dooier au bain-marie tot 80 °C en los de gelatine erin op.","Monteer met de lever en de boter."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Gevogelte", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-piccalillymousse", name:"Piccalillymousse", category:"Mousses", yield:"≈ 550 g",
    ingredients:[{item:"Piccalilly",amount:"150 g"},{item:"Room",amount:"2,5 dl"},{item:"Bouillon",amount:"1,25 dl"},{item:"Gelatine",amount:"3 blaadjes"}],
    steps:["Los de gelatine op in de bouillon.","Roer de piccalilly erdoor.","Sla de room lobbig en meng."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-basilicumcreme", name:"Basilicumcrème", category:"Sauzen & emulsies", yield:"≈ 600 g",
    ingredients:[{item:"Basilicumolie",amount:"0,5 l"},{item:"Eiwitten",amount:"3 st"},{item:"Fruitazijn",amount:"2 el"},{item:"Yoghurt",amount:"50 g"}],
    steps:["Meng eiwitten, azijn en yoghurt.","Voeg de olie langzaam toe tot de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-venkelcremeux", name:"Venkelcremeux", category:"Zoet & patisserie", yield:"≈ 3 kg",
    ingredients:[{item:"Venkelsap",amount:"1500 ml"},{item:"Eidooier",amount:"531 g"},{item:"Suiker",amount:"531 g"},{item:"Gelatine",amount:"24 blaadjes"},{item:"Boter",amount:"405 g"}],
    steps:["Verwarm au bain-marie tot 85 °C en los de gelatine erin op.","Koel terug tot 45 °C.","Snijd de boter in blokjes en zet koel.","Monteer de boter met de staafmixer zodra het mengsel is teruggekoeld."],
    endorsements:[], chefsPick:false, baseId:"pat-vanille-cremeux", isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-zoeteaardappelsoep", name:"Zoete-aardappelsoep 'flan'", category:"Fonds & bouillon", yield:"grote pan",
    ingredients:[{item:"Gele ui, gesnipperd",amount:"800 g"},{item:"Chilivlokken",amount:"1 el"},{item:"Kurkuma",amount:"2 el"},{item:"Kerrie madras",amount:"3 el"},{item:"Gember, geraspt",amount:"6 cm"},{item:"Witte wijn",amount:"1 l"},{item:"Zoete aardappel, blokjes 2×2 cm",amount:"3 kg"},{item:"Water",amount:"2 l"},{item:"Zeezout",amount:"2 el"}],
    steps:["Fruit de ui met de specerijen en gember aan.","Blus af met de witte wijn.","Voeg de zoete aardappel en het water toe en kook gaar; pureer glad.","Voeg als laatste nog 3 liter water toe en breng op smaak met het zout."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-aardpeerblini", name:"Aardpeerblini", category:"Deeg & brood", yield:"± 15 st",
    ingredients:[{item:"Bloem",amount:"75 g"},{item:"Boekweitmeel",amount:"25 g"},{item:"Aardpeerpuree",amount:"50 g"},{item:"Ei (M)",amount:"1 st"},{item:"Melk",amount:"150 ml"},{item:"Ongezouten roomboter",amount:"25 g"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"}],
    steps:["Roer bloem en boekweitmeel door elkaar; splits het ei en vang het eiwit op.","Voeg de eidooier toe aan het bloemmengsel, dan de melk, boter en aardpeerpuree; mix tot een glad beslag en breng op smaak.","Klop het eiwit stijf en spatel het voorzichtig vouwend door het beslag om de luchtigheid te behouden."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-aardpeerlak", name:"Aardpeerlak", category:"Sauzen & emulsies", yield:"≈ 2 dl",
    ingredients:[{item:"Aardpeersap",amount:"1 l"},{item:"Suiker",amount:"5 g"},{item:"Zout",amount:"1 g"}],
    steps:["Doe alles in een pan en kook in tot de gewenste dikte.","Schuim in het begin regelmatig af en passeer eventueel door een frituurfilter."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-gepofte-aardpeerschil", name:"Gepofte aardpeerschil", category:"Krokant & garnituur", yield:"1 bak",
    ingredients:[{item:"Aardperen",amount:"naar behoefte"},{item:"Zout of poedersuiker",amount:"om te bestrooien"}],
    steps:["Was de aardperen en kook ze in de schil in water met zout.","Halveer en schraap de binnenkant leeg (gebruik dit voor puree of sorbet).","Droog de leeggeschepte schillen 10 uur op 65 °C.","Frituur goudbruin en krokant in olie van 160 °C.","Bestrooi naar toepassing met zout of poedersuiker."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Droogoven / friteuse", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-aardpeercompote", name:"Aardpeercompote", category:"Chutney & jam", yield:"± 5 kg",
    ingredients:[{item:"Aardpeer (topinamboer)",amount:"5 kg"},{item:"Wittewijnazijn",amount:"200 ml"},{item:"Mirin",amount:"450 ml"},{item:"Suiker",amount:"100 g"},{item:"Fruitazijn",amount:"25 ml"},{item:"Zonnebloemolie",amount:"naar behoefte"},{item:"Zout",amount:"naar behoefte"}],
    steps:["Schrob de aardperen goed schoon met een metalen pannenspons.","Snijd in de lengte doormidden en meng met zonnebloemolie en zout.","Rooster met het snijvlak naar beneden op 160 °C tot diep goudbruin.","Breng ondertussen de overige ingrediënten aan de kook voor het zoetzuur.","Blus de aardperen af met het zoetzuur en week ze los uit de braadslee.","Laat het zoetzuur 24 uur inwerken voor een grovere compote, of maal kort in de thermoblender voor een fijnere."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Thermoblender", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-vegan-brownie", name:"Vegan brownie", category:"Zoet & patisserie", yield:"1 bakplaat",
    ingredients:[{item:"Bloem",amount:"1 kg"},{item:"Cacaopoeder",amount:"330 g"},{item:"Donkere basterdsuiker",amount:"800 g"},{item:"Bietsuiker",amount:"800 g"},{item:"Bakpoeder",amount:"4 tl"},{item:"Zout",amount:"2 tl"},{item:"Instantkoffie",amount:"4 tl"},{item:"Haverdrink",amount:"960 ml"},{item:"Kokosolie",amount:"240 ml"},{item:"Vanillesuiker",amount:"4 el"},{item:"Pure chocolade",amount:"400 g"},{item:"Pure chocoladechips (mini)",amount:"200 g"}],
    steps:["Meng alle droge ingrediënten (zonder chocolade) goed door.","Verwarm de kokosolie met de haverdrink tot de olie is gesmolten en giet op de 400 g pure chocolade.","Meng dit goed door de droge ingrediënten.","Voeg als laatste de chocoladechips toe.","Bak de plaat 40 min op 170 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-notenmelange", name:"Notenmelange", category:"Krokant & garnituur", yield:"≈ 2,2 kg",
    ingredients:[{item:"Notenmix",amount:"1 kg"},{item:"Cashewnoten",amount:"1 kg"},{item:"Gedroogde cranberry's",amount:"200 g"},{item:"Kruidenolie (lavas)",amount:"om te besprenkelen"}],
    steps:["Besprenkel de noten met de kruidenolie.","Rooster op 180 °C, twee keer 6 minuten."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pickle-marinade", name:"Picklemarinade", category:"Pickles & zuur", yield:"≈ 3,5 l",
    ingredients:[{item:"Water",amount:"2 l"},{item:"Azijn",amount:"1 l"},{item:"Zout",amount:"87,5 g"},{item:"Suiker",amount:"500 g"},{item:"(Verse) smaakmakers",amount:"passend bij het product"}],
    steps:["Verwarm alles samen."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pruimenchutney-ferment", name:"Pruimenchutney met gefermenteerde pruimen", category:"Chutney & jam", yield:"± 2 kg",
    ingredients:[{item:"Appelciderazijn",amount:"475 ml"},{item:"Lichte basterdsuiker",amount:"275 g"},{item:"Rozijnen",amount:"225 g"},{item:"Garam masala",amount:"1 el"},{item:"Gefermenteerde pruimen",amount:"750 g"},{item:"Uien (brunoise)",amount:"3 st"},{item:"Rode pepers (fijne brunoise, zonder zaadlijst)",amount:"4 st"},{item:"Gember, geschild en fijngehakt",amount:"30 g"},{item:"Knoflook, fijngehakt",amount:"4 tenen"}],
    steps:["Doe de azijn, suiker, rozijnen en garam masala in een grote pan.","Verwarm al roerend op laag vuur tot de suiker is opgelost en breng aan de kook.","Voeg de pruimen, ui, pepers, gember, knoflook en zout toe.","Laat 40–50 min zachtjes sudderen tot de chutney dik is; roer regelmatig door."],
    endorsements:[], chefsPick:false, baseId:"chutney-pruim", isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pulled-oesterzwam", name:"Pulled oesterzwam of eryngii", category:"Groente · geroosterd", yield:"≈ 500 g",
    ingredients:[{item:"Oesterzwam of eryngii (kingboleet)",amount:"500 g"},{item:"Maïsmeel",amount:"4 tl"},{item:"5-spice",amount:"2 tl"},{item:"Knoflookpoeder",amount:"1 tl"},{item:"Hoisinsaus",amount:"150 g"},{item:"Sesamzaad",amount:"optioneel"}],
    steps:["Pluk de zwammen in mooie reepjes.","Voeg de droge kruiden en het maïsmeel toe en meng goed.","Bak in een pan met een goede laag olie tot bruin en krokant.","Laat uitlekken op een doek.","Meng na het bakken 2 theelepels hoisinsaus erdoor en werk eventueel af met sesamzaad."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pindakoek", name:"Pindakoek", category:"Zoet & patisserie", yield:"1 vorm",
    ingredients:[{item:"Kruimeldeeg",amount:"500 g"},{item:"Boter (voor de bodem)",amount:"150 g"},{item:"Pindakaas zonder stukjes",amount:"900 g"},{item:"Poedersuiker",amount:"500 g"},{item:"Boter (voor de vulling)",amount:"250 g"},{item:"Volle melk",amount:"30 ml"},{item:"Pure chocoladecouverture",amount:"700 g"},{item:"Slagroom",amount:"250 ml"}],
    steps:["Draai het kruimeldeeg fijn in de Magimix en voeg de gesmolten boter toe.","Bekleed een vierkante bakvorm met bakpapier, verdeel de kruimels over de bodem en laat opstijven in de koeling.","Verwarm de pindakaas met de boter au bain-marie tot de boter is opgenomen.","Roer de poedersuiker en melk door het pindakaasmengsel; stort op de bodem en laat opstijven.","Kook de slagroom, giet op de chocolade, laat 1 min staan en roer tot een homogene massa.","Stort de chocolade op de pindakaaslaag en laat uitharden in de koeling."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-spruitenstamppot", name:"Spruitenstamppot", category:"Groente · geroosterd", yield:"grote batch",
    ingredients:[{item:"— Mousseline: aardappels",amount:"4 kg"},{item:"Margarine",amount:"250 g"},{item:"Kokosmelk",amount:"800 ml"},{item:"Olijfolie",amount:"50 ml"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"},{item:"— Spruiten: spruiten",amount:"5 kg"},{item:"Zonnebloemolie",amount:"100 ml"},{item:"Sesamzaad",amount:"100 g"}],
    steps:["Schil de aardappels, kook gaar in gezouten water, giet af en laat uitdampen.","Verwarm de margarine met de kokosmelk; wrijf de aardappels door een bolzeef en meng; breng op smaak.","Maak de spruiten schoon, halveer de grote, besprenkel met olie, sesamzaad, peper en zout.","Rooster in de oven op 200 °C, 2× 6 min.","Draai 2 kg geroosterde spruiten kort door de Magimix (structuur behouden, geen puree) en meng door de mousseline; breng verder op smaak."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pruimenjam-rozemarijn", name:"Pruimenjam met rozemarijn", category:"Chutney & jam", yield:"± 6 potten",
    ingredients:[{item:"Pruimen (schoongemaakt en ontveld)",amount:"1 kg"},{item:"Suiker",amount:"800 g"},{item:"Citroensap",amount:"van 1 st"},{item:"Water",amount:"250 ml"},{item:"Rozemarijnnaaldjes",amount:"25 st"}],
    steps:["Snijd de pruimen in stukken en voeg het citroensap toe.","Maak de suikersiroop: verwarm tot 110 °C, ± 10 min.","Voeg voorzichtig de pruimen toe aan de siroop.","Kook 15 min tot 105 °C.","Doe de jamtest om te kijken of hij goed is."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer","Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-quichedeeg", name:"Quichedeeg", category:"Deeg & brood", yield:"± 10 quiches",
    ingredients:[{item:"Bloem",amount:"2000 g"},{item:"Boter",amount:"800 g"},{item:"Water",amount:"600 g"},{item:"Zout",amount:"40 g"},{item:"Bakpoeder",amount:"20 g"},{item:"Karwijzaad",amount:"50 g"}],
    steps:["Meng alles door elkaar met de deeghaak.","Maak bollen van 250 à 300 gram."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-spitskoolrendang", name:"Spitskoolrendang", category:"Groente · geroosterd", yield:"1 pan",
    ingredients:[{item:"Grote (savooie) spitskool",amount:"1 st"},{item:"Zout",amount:"om te kneden"},{item:"— Boemboe: uien",amount:"2 st"},{item:"Rode peper",amount:"1 st"},{item:"Citroengras",amount:"1 stengel"},{item:"Gember",amount:"± 1,5 cm"},{item:"Knoflook",amount:"3 teentjes"},{item:"Surinaamse masala",amount:"1 tl"},{item:"— Rendang: zonnebloemolie",amount:"scheutje"},{item:"Limoenblaadjes",amount:"3 st"},{item:"Kokosmelk",amount:"1 blik à 400 ml"},{item:"Ketjap manis",amount:"4 el"},{item:"Ketjap asin",amount:"2 el"},{item:"Sambal oelek",amount:"1 tl"}],
    steps:["Snijd de koolbladeren in reepjes, kneed met zout tot de kool vochtig wordt en laat uitlekken onder een verzwaard bord.","Boemboe: snijd ui, knoflook, peper en gember grof en het witte deel van de sereh in ringetjes; pureer met de masala en wat kokosmelk.","Verhit olie in een wok en bak de koolreepjes lichtbruin.","Bak de boemboe enkele minuten mee tot hij gaar is en geurt.","Voeg limoenblaadjes, de rest van de kokosmelk, ketjap manis, ketjap asin en sambal toe; roer door.","Laat inkoken tot een mooie dikke saus."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-vegan-haverkoek", name:"Vegan haverkoek", category:"Zoet & patisserie", yield:"1 bakplaat",
    ingredients:[{item:"Bloem",amount:"500 g"},{item:"Havermout (boekweitmeel voor glutenvrij)",amount:"375 g"},{item:"Bruine rietsuiker",amount:"400 g"},{item:"Bakpoeder",amount:"2 tl"},{item:"Zout",amount:"1,5 tl"},{item:"Vanillesuiker",amount:"3 tl"},{item:"Gemalen lijnzaad",amount:"1 tl"},{item:"Gemalen kokos",amount:"200 g"},{item:"Zonnebloempitten",amount:"200 g"},{item:"Sesamzaad",amount:"200 g"},{item:"Cranberry's",amount:"200 g"},{item:"Margarine",amount:"550 g"},{item:"Ahornsiroop",amount:"120 g"}],
    steps:["Meng alle droge ingrediënten.","Smelt de margarine met de ahornsiroop en meng goed door de droge ingrediënten.","Bekleed een 1/1 GN-bakplaat met bakpapier en giet het mengsel erin.","Verspreid goed en druk stevig aan met een rvs bakspatel.","Bak 20 min op 170 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pate-de-fruit-pruim", name:"Pâte de fruit van gefermenteerde pruim", category:"Zoet & patisserie", yield:"1 vorm",
    ingredients:[{item:"Suiker (voor de pectine)",amount:"75 g"},{item:"Pectine",amount:"28 g"},{item:"Gefermenteerde-pruimencoulis",amount:"700 g"},{item:"Suiker",amount:"750 g"},{item:"Glucose",amount:"150 g"},{item:"Citroenzuur",amount:"25 g"}],
    steps:["Meng de 75 g suiker met de pectine.","Kook de pruimencoulis met de overige 750 g suiker en de glucose op.","Voeg zodra het kookt het suiker-pectinemengsel toe.","Kook door tot 106 °C.","Haal van het vuur en voeg het citroenzuur toe.","Stort in de gewenste vormen en laat opstijven.","Coat eventueel met bietsuiker en een beetje citroenzuur."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-blondie", name:"Blondie", category:"Zoet & patisserie", yield:"1/1 gastronoombak",
    ingredients:[{item:"Witte chocoladedruppels",amount:"1200 g"},{item:"Boter",amount:"250 g"},{item:"Suiker",amount:"270 g"},{item:"Eieren",amount:"9 st"},{item:"Vanillesuiker",amount:"6 el"},{item:"Bakpoeder",amount:"1 el"},{item:"Poedersuiker",amount:"3 tl"},{item:"Bloem",amount:"600 g"}],
    steps:["Smelt de chocolade met de boter.","Klop de eieren met de suiker wit.","Meng de bloem en het bakpoeder met de opgeslagen eieren.","Meng als laatste de gesmolten chocolade erdoor.","Bak af in een voorverwarmde oven: 20 min op 180 °C en 10 min op 160 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-cheesecake", name:"Cheesecake", category:"Zoet & patisserie", yield:"1 vorm",
    ingredients:[{item:"Bastognekoeken",amount:"300 g"},{item:"Gesmolten boter",amount:"120 g"},{item:"Suiker",amount:"300 g"},{item:"Zure room",amount:"5 dl"},{item:"Roomkaas",amount:"1200 g"},{item:"Eieren",amount:"4 st"},{item:"Vanillesuiker",amount:"4 tl"}],
    steps:["Maal de bastogne fijn en vermeng met de boter; druk aan als bodem.","Meng de overige ingrediënten en giet op de bodem.","Bak 30 min op 140 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-chocolade-spongecake", name:"Chocolade-spongecake (sifon)", category:"Zoet & patisserie", yield:"1 sifon",
    ingredients:[{item:"Eiwit",amount:"600 g"},{item:"Amandelpoeder",amount:"120 g"},{item:"Cacaopoeder",amount:"120 g"},{item:"Suiker",amount:"140 g"},{item:"Bloem",amount:"40 g"}],
    steps:["Draai alles glad in de blender.","Zeef en giet in een halveliter-sifon; belucht met 3 patronen.","Stort in een kartonnen bekertje (vooraf inprikken), maximaal half vullen.","25 sec in de magnetron."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Sifon", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-chocoladetruffels", name:"Chocoladetruffels", category:"Zoet & patisserie", yield:"± 40 st",
    ingredients:[{item:"Vanillesuiker",amount:"8 g"},{item:"Slagroom",amount:"250 ml"},{item:"Boter",amount:"75 g"},{item:"Melkchocolade",amount:"500 g"},{item:"Cacaopoeder",amount:"200 g"}],
    steps:["Kook de room met het vanillesuiker en de boter.","Los de melkchocolade op in de hete room en laat opstijven.","Klop de massa luchtig in de mixer en draai balletjes.","Laat aanvriezen en dompel in het cacaopoeder."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-aardbeientruffels", name:"Aardbeientruffels", category:"Zoet & patisserie", yield:"± 40 st",
    ingredients:[{item:"Aardbeiencoulis",amount:"250 g"},{item:"Citroensap",amount:"25 g"},{item:"Suiker",amount:"250 g"},{item:"Boter",amount:"250 g"},{item:"Getempereerde witte chocolade",amount:"om te doppen"},{item:"Roodgekleurde suiker",amount:"om af te werken"}],
    steps:["Kook de coulis met het citroensap en de suiker; koel terug.","Draai op met de boter.","Spuit lange banen op een bakmatje en vries weg.","Snijd stukjes, haal door de chocolade en als laatste door de suiker."],
    endorsements:[], chefsPick:false, baseId:"map-chocoladetruffels", isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-mintgel", name:"Mintgel", category:"Gels", yield:"1 bak",
    ingredients:[{item:"Water",amount:"2 dl"},{item:"Monin mojito mint",amount:"6 dl"},{item:"Bols mint",amount:"2 dl"},{item:"Agar",amount:"6 g"},{item:"Gellan",amount:"4 g"}],
    steps:["Kook alle natte producten.","Voeg agar en gellan toe en kook kort mee.","Stort en laat opstijven.","Haal de massa door de blender en zeef."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-frambozentiramisu", name:"Frambozentiramisu", category:"Zoet & patisserie", yield:"1 bak",
    ingredients:[{item:"Frambozenazijn",amount:"100 g"},{item:"Frambozencoulis",amount:"300 g"},{item:"Mascarpone",amount:"1 kg"},{item:"Geslagen room",amount:"1 l"},{item:"Suiker",amount:"350 g"},{item:"Gelatine",amount:"6 blaadjes"},{item:"Lange vingers",amount:"voor de lagen"},{item:"Limoncello",amount:"om te trempen"}],
    steps:["Kook de azijn met de suiker en los de gelatine erin op.","Voeg de warme azijn bij de frambozencoulis.","Klop de mascarpone los en meng met de room; voeg het azijn-coulismengsel toe.","Bouw de tiramisu op met in limoncello getrempte lange vingers."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-frambozengranite", name:"Frambozengranité", category:"Sorbet & ijs", yield:"1 bak",
    ingredients:[{item:"Witte basterdsuiker",amount:"115 g"},{item:"Water",amount:"3 dl"},{item:"Frambozencoulis",amount:"500 g"},{item:"Citroensap",amount:"van 1 st"}],
    steps:["Kook water en suiker.","Meng alles en vries weg; roer elke 30 min met de garde erdoor."],
    endorsements:[], chefsPick:false, baseId:"pat-granite-port-roodfruit", isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-aardbeiencremeux", name:"Aardbeiencremeux", category:"Zoet & patisserie", yield:"≈ 2 kg",
    ingredients:[{item:"Aardbeiencoulis",amount:"1 kg"},{item:"Suiker",amount:"300 g"},{item:"Eidooier",amount:"300 g"},{item:"Ei",amount:"300 g"},{item:"Gelatine",amount:"18 g"},{item:"Boter",amount:"300 g"}],
    steps:["Gaar coulis, suiker, dooier en ei au bain-marie tot 80 °C.","Voeg de gelatine toe en koel terug tot 45 °C.","Voeg de boter toe, roer glad en stort."],
    endorsements:[], chefsPick:false, baseId:"pat-vanille-cremeux", isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-aardbeiencappuccino", name:"Aardbeiencappuccino", category:"Schuim & espuma", yield:"≈ 900 g",
    ingredients:[{item:"Aardbeiencoulis",amount:"200 g"},{item:"Karnemelk",amount:"400 g"},{item:"Kwark",amount:"250 g"},{item:"Poedersuiker",amount:"80 g"}],
    steps:["Blender alles en zeef.","Maak vlak voor het serveren luchtig met de staafmixer."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pastinaakcake", name:"Pastinaakcake met peer en chai", category:"Zoet & patisserie", yield:"1 bakplaat",
    ingredients:[{item:"Bloem",amount:"600 g"},{item:"Zout",amount:"2 tl"},{item:"Chaispecerijen",amount:"4 el"},{item:"Baking soda",amount:"4 tl"},{item:"Bakpoeder",amount:"1 tl"},{item:"Pastinaak, geraspt",amount:"280 g"},{item:"Peer, in julienne",amount:"280 g"},{item:"Eieren",amount:"8 st"},{item:"Suiker",amount:"200 g"},{item:"Bruine basterdsuiker",amount:"200 g"},{item:"Yoghurt",amount:"160 g"},{item:"Vanillesuiker",amount:"32 g"},{item:"Zonnebloemolie",amount:"480 g"}],
    steps:["Verwarm de oven voor op 165 °C en bekleed een gastronormbak met bakpapier.","Meng bloem, zout, chaikruiden, baking soda en bakpoeder goed door.","Voeg de pastinaak en peer toe en meng door het bloemmengsel.","Klop de eieren met beide suikers luchtig en bleek met een garde.","Voeg de yoghurt en het vanille-extract toe.","Schenk de zonnebloemolie in een dunne straal al kloppend bij de eierbasis.","Meng het bloemmengsel met de eierbasis tot een egale massa en stort het beslag.","Bak 25–30 min in de voorverwarmde oven en laat afkoelen in het blik."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pompoenflan", name:"Pompoenflan", category:"Groente · gestoomd", yield:"± 12 vormpjes",
    ingredients:[{item:"Pompoen",amount:"1 st"},{item:"Eieren",amount:"3 st"},{item:"Bloem",amount:"3 el, eventueel meer"},{item:"Olijfolie",amount:"100 ml"},{item:"Vadouvan",amount:"1 el"},{item:"Knoflook",amount:"1/2 teen"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"}],
    steps:["Schil de pompoen, verwijder de zaadlijsten en snijd in stukken.","Kook de pompoen gaar in gezouten water; laat uitlekken en dep droog.","Pureer met knoflook, vadouvan, eieren, olijfolie en bloem tot een romige massa; voeg extra bloem toe als het te dun is.","Stort in vormpjes en dek af met een siliconen matje.","Stoom de flan in ongeveer 50 min op 85 °C gaar."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Stoomoven", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pompoenhummus", name:"Pompoenhummus", category:"Purees", yield:"≈ 1,2 kg",
    ingredients:[{item:"Flespompoen",amount:"500 g"},{item:"Kikkererwten (uit blik)",amount:"500 g"},{item:"Knoflook",amount:"3 tenen"},{item:"Citroensap",amount:"van 1,5 st"},{item:"Chili",amount:"mespuntje"},{item:"Tahini",amount:"8 el"},{item:"Komijn",amount:"1,5 tl"},{item:"Peterselie",amount:"takje"},{item:"Olijfolie",amount:"scheut"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"}],
    steps:["Verwarm de oven voor op 200 °C (hetelucht).","Snijd de pompoen brunoise en besprenkel met olijfolie, peper en zout.","Rooster de pompoen 20–30 min in de oven en laat afkoelen.","Pureer de pompoen met de kikkererwten, knoflook, citroensap, chili, tahini en komijn glad.","Garneer met verse peterselie en chili."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-lemon-curd", name:"Lemon curd", category:"Zoet & patisserie", yield:"≈ 500 g",
    ingredients:[{item:"Citroenen (rasp en sap)",amount:"2 flinke, ± 130 ml sap"},{item:"Bietsuiker",amount:"200 g"},{item:"Ongezouten roomboter",amount:"125 g"},{item:"Eieren, geklutst",amount:"2 st"}],
    steps:["Rasp de citroenen en pers ze uit; zeef het sap.","Verhit rasp, suiker en boter au bain-marie op middelhoog vuur en roer tot een gladde massa.","Voeg het citroensap toe en roer door; voeg daarna de eieren toe terwijl je blijft roeren.","Blijf rustig roeren tot de curd de dikte van yoghurt heeft (± 20 min).","Giet in een schaal om af te koelen; hij dikt dan nog verder in."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-peer-relish", name:"Peer-relish", category:"Chutney & jam", yield:"1 grote pan",
    ingredients:[{item:"Peren",amount:"12 st"},{item:"Groene paprika",amount:"2 st"},{item:"Rode paprika",amount:"2 st"},{item:"Ui",amount:"2 st"},{item:"Wittewijnazijn",amount:"400 ml"},{item:"Suiker",amount:"400 g"},{item:"Kurkuma",amount:"20 g"},{item:"Kaneelpoeder",amount:"4 g"},{item:"Mosterdzaad",amount:"4 g"},{item:"Gemberpoeder",amount:"4 g"},{item:"Gedroogde rode chilipeper",amount:"4 g"}],
    steps:["Snijd de peer, ui en paprika in fijne brunoise.","Doe de suiker, wittewijnazijn en alle kruiden bij elkaar in een pan.","Laat 10 min trekken en voeg de groenten en het fruit toe.","Kook het geheel 5 min en laat afkoelen tot kamertemperatuur."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-icetea-japans-gember", name:"Japanse ijsthee met gember", category:"Dranken", yield:"± 10 l",
    ingredients:[{item:"Water",amount:"12,5 l"},{item:"Earl grey",amount:"30 g"},{item:"Verveine",amount:"15 g"},{item:"Japanse sencha uji",amount:"20 g"},{item:"Bietsuiker",amount:"500 g"},{item:"Gember",amount:"200 g"},{item:"Limoenblad",amount:"10 g"}],
    steps:["Steriliseer de flesjes vooraf: 130 °C stomen in de oven.","Breng het water met de earl grey, suiker, limoenblad en gember aan de kook en laat afkoelen tot 80 °C.","Voeg de verveine en de sencha uji toe en laat 30 min trekken op 80 °C.","Zeef alles eruit en giet in de flesjes."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-icetea-honing-steranijs", name:"IJsthee met honing, steranijs en kruidnagel", category:"Dranken", yield:"± 10 l",
    ingredients:[{item:"Water",amount:"12,5 l"},{item:"Earl grey",amount:"30 g"},{item:"Citroenmelisse",amount:"30 g"},{item:"Honing",amount:"430 g"},{item:"Steranijs",amount:"7 g"},{item:"Kruidnagel",amount:"2 g"}],
    steps:["Steriliseer de flesjes vooraf: 130 °C stomen in de oven.","Breng het water aan de kook met de earl grey, steranijs en kruidnagel en laat afkoelen tot 80 °C.","Voeg de honing en citroenmelisse toe en laat 30 min trekken op 80 °C.","Zeef alles eruit en giet in de flesjes."],
    endorsements:[], chefsPick:false, baseId:"map-icetea-japans-gember", isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-preimozaiek", name:"Preimozaïek", category:"Groente · geroosterd", yield:"1 rol",
    ingredients:[{item:"Prei",amount:"8 st"},{item:"Tijm",amount:"10 takjes"},{item:"Citroen",amount:"2 st"},{item:"Zonnebloemolie",amount:"scheut"},{item:"Norivellen",amount:"enkele"}],
    steps:["Snijd het groen van de prei af en was het witte gedeelte.","Snijd de prei in gelijke stukken, leg in een gastronoombak met de tijm, peper en zout.","Dek af met aluminiumfolie en gaar 70 min in de oven op 160 °C.","Verwijder de folie, laat 5 min afkoelen en haal het buitenste (taaie) blad eraf.","Rol de stukken prei in de norivellen en snijd het uitstekende nori af.","Leg afdekfolie op de werkbank, leg de ingerolde prei erop en bestrooi met de zeste van de citroen.","Rol strak op en koel terug in de blastchiller.","Portioneer de goed afgekoelde rol met de folie eromheen."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Blastchiller", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-hoisinsaus", name:"Hoisinsaus", category:"Sauzen & emulsies", yield:"≈ 3,5 l",
    ingredients:[{item:"Sesamolie",amount:"200 g"},{item:"Five spice",amount:"25 g"},{item:"Naturel azijn",amount:"300 ml"},{item:"Honing",amount:"2000 ml"},{item:"Knoflook",amount:"40 tenen (4 bollen)"},{item:"Misopasta",amount:"500 g"},{item:"Sojasaus",amount:"600 ml"},{item:"Rode pepers",amount:"10 st"},{item:"Water (als laatste)",amount:"250 g"}],
    steps:["Snijd de knoflook en rode peper fijn; weeg de rest af en zet klaar.","Fruit de knoflook op laag vuur; voeg de five spice toe en roer goed (laat de knoflook niet verbranden).","Voeg de rest van de ingrediënten toe en laat 5 min zachtjes pruttelen.","Voeg wat extra water toe als de saus te dik is."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-kletskoppen-glutenvrij", name:"Kletskoppen (glutenvrij)", category:"Zoet & patisserie", yield:"1 plaat",
    ingredients:[{item:"Amandelpoeder",amount:"125 g"},{item:"Roomboter",amount:"250 g"},{item:"Bietsuiker",amount:"250 g"},{item:"Boekweitmeel",amount:"187,5 g"},{item:"Zout",amount:"snuf"},{item:"Mirin",amount:"50 g"}],
    steps:["Draai alles fijn in de Magimix-blender.","Vorm naar wens.","Bak af op 170 °C, 6–8 min, ventilator laag."],
    endorsements:[], chefsPick:false, baseId:"pat-kletskop", isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-kokospannacotta", name:"Kokospannacotta", category:"Zoet & patisserie", yield:"± 12 glaasjes",
    ingredients:[{item:"Gelatine",amount:"6 grote bladen"},{item:"Kokosmelk",amount:"600 ml"},{item:"Room",amount:"600 ml"},{item:"Suiker",amount:"100 g"},{item:"Limoenen (rasp en sap)",amount:"3 st"},{item:"Zout",amount:"snuf"}],
    steps:["Week de gelatinebladen in koud water.","Verwarm kokosmelk, room en suiker samen tot het kookpunt.","Haal van het vuur en roer de gelatine erdoor.","Laat iets afkoelen en verdeel over glaasjes.","Laat opstijven."],
    endorsements:[], chefsPick:false, baseId:"pat-vruchten-pannacotta", isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-knolselderijsaus", name:"Knolselderijsaus met truffeljus", category:"Sauzen & emulsies", yield:"≈ 350 ml",
    ingredients:[{item:"Knolselderij, brunoise",amount:"600 g"},{item:"Koolzaadolie",amount:"2 el"},{item:"Ui, in ringen",amount:"65 g"},{item:"Wortel, brunoise 5 mm",amount:"65 g"},{item:"Bleekselderij, brunoise 5 mm",amount:"75 g"},{item:"Tomatenpuree",amount:"1 el"},{item:"Rode wijn",amount:"160 ml"},{item:"Truffeljus",amount:"240 ml"},{item:"Zout",amount:"1,5 tl"},{item:"Sherryazijn",amount:"1 tl"},{item:"Xanthaangom",amount:"0,3 g"},{item:"Extra vierge olijfolie",amount:"1 el"}],
    steps:["Verwarm de oven voor op 200 °C; meng 450 g knolselderij met 1 el koolzaadolie en rooster ± 30 min donkerbruin.","Doe de geroosterde knolselderij in een sauspan met 1,5 l water, breng aan de kook en haal direct van het vuur; laat 45 min afgedekt staan.","Laat uitlekken op een fijne zeef en bewaar de vloeistof.","Verhit de overige olie, voeg ui, wortel, bleekselderij en de resterende 150 g knolselderij toe en sauteer ± 10 min tot gekaramelliseerd.","Bak de tomatenpuree 5 min mee; blus af met de rode wijn en kook in tot bijna droog.","Voeg de knolselderijvloeistof en truffeljus toe en laat in ± 1 uur langzaam inkoken tot ± 350 ml.","Zeef de saus, breng op smaak met zout en sherryazijn en bind met de xanthaangom.","Monteer de saus met de olijfolie."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-hummus-geroosterde-biet", name:"Hummus van geroosterde biet", category:"Purees", yield:"≈ 1 kg",
    ingredients:[{item:"Rode bieten",amount:"3 st"},{item:"Ui",amount:"1 st"},{item:"Knoflook",amount:"2 tenen"},{item:"Kikkererwten uit blik, uitgelekt",amount:"415 g"},{item:"Peterselie",amount:"15 g"},{item:"Sesampasta",amount:"30 ml"},{item:"Olijfolie",amount:"60 ml"},{item:"Water",amount:"60 ml"},{item:"Citroensap",amount:"van 1 st"},{item:"Zout",amount:"naar behoefte"},{item:"Peper",amount:"naar behoefte"}],
    steps:["Verhit de barbecue tot 200 °C of pof in de oven.","Leg de bieten met de ui, knoflook, zout en peper in aluminium op de barbecue.","Rooster de bieten in 1 uur gaar; draai halverwege om.","Maal ondertussen de kikkererwten, peterselie, tahin, olijfolie, water en citroensap fijn.","Pel de geroosterde bieten, ui en knoflook, voeg toe en maal glad."],
    endorsements:[], chefsPick:false, baseId:"map-pompoenhummus", isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Black Bastard / oven", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-dukkah", name:"Dukkah", category:"Kruiden & zout", yield:"≈ 1,2 kg",
    ingredients:[{item:"Notenmix",amount:"1 kg"},{item:"Gebakken uitjes",amount:"100 g"},{item:"Komijn",amount:"10 g"},{item:"Gemberpoeder",amount:"5 g"},{item:"Anijszaad",amount:"5 g"},{item:"Nootmuskaatpoeder",amount:"5 g"},{item:"Gerookt paprikapoeder",amount:"5 g"},{item:"Chilipoeder",amount:"2 g"},{item:"Za'atar",amount:"5 g"},{item:"Sesamzaad",amount:"20 g"},{item:"Limoenrasp",amount:"naar behoefte"},{item:"Citroenrasp",amount:"naar behoefte"},{item:"Zout",amount:"naar behoefte"},{item:"Peper",amount:"naar behoefte"}],
    steps:["Draai de notenmix met de gebakken uitjes tot een grof kruim.","Rooster het kruim met alle specerijen en het sesamzaad 15 min in de oven op 180 °C.","Laat afkoelen en breng op smaak met de rasp, het zout en de peper."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-geroosterde-spruiten", name:"Geroosterde spruiten", category:"Groente · geroosterd", yield:"5 kg",
    ingredients:[{item:"Spruiten",amount:"5 kg"},{item:"Zonnebloemolie",amount:"100 ml"},{item:"Sesamzaad",amount:"100 g"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"}],
    steps:["Maak de spruiten schoon en halveer de grote.","Besprenkel met zonnebloemolie, sesamzaad, peper en zout.","Rooster in de oven op 200 °C, 2× 6 min."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-courgettejam", name:"Courgettejam", category:"Chutney & jam", yield:"± 5 potten",
    ingredients:[{item:"Courgette",amount:"1 kg"},{item:"Geleisuiker",amount:"1 kg"},{item:"Citroenen",amount:"2 st"},{item:"Sinaasappel",amount:"1 st"},{item:"Oregano",amount:"0,2 g"},{item:"Verse basilicum",amount:"1 el"},{item:"Tijm",amount:"1 el"},{item:"Laurierblad",amount:"1 st"},{item:"Kaneelpoeder",amount:"2 tl"}],
    steps:["Ontdoe de courgette van zaadlijsten maar schil hem niet; pers de citroenen en rasp ze, pers ook de sinaasappel uit.","Rasp de courgette in de keukenmachine en meng het sinaasappelsap, citroensap, de rasp en de kruiden erdoor (kruiden eerst laten bevriezen in de diepvries en daarna fijnknijpen); voeg dan de kaneel toe.","Zet op het vuur, meng de geleisuiker erdoor en laat 4 minuten borrelen.","Doe het mengsel in schoongemaakte potjes."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-aardbeisambal", name:"Aardbeisambal", category:"Sauzen & emulsies", yield:"≈ 1 l",
    ingredients:[{item:"Rode pepers met zaadjes, grof gehakt",amount:"20 st"},{item:"Rawit",amount:"5 st"},{item:"Aardbeien",amount:"750 g"},{item:"Uien, grof gesneden",amount:"5 st"},{item:"Knoflook",amount:"10 tenen"},{item:"Suiker",amount:"8–10 tl, naar smaak"},{item:"Zout",amount:"2,5 tl"},{item:"Olie",amount:"5 el"},{item:"Limoensap",amount:"van 1 st"}],
    steps:["Was de aardbeien en maak ze schoon (kroontjes eraf).","Hak de ui, knoflook en pepers fijn in de mixer.","Verhit de olie en fruit het mengsel aan.","Voeg de suiker en het zout toe.","Plet of prak de aardbeien, voeg de puree toe en verwarm kort.","Proef en breng op smaak met limoen."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-appelcrumble", name:"Appelcrumble", category:"Zoet & patisserie", yield:"1 schaal",
    ingredients:[{item:"Flinke appels",amount:"9 st"},{item:"Suiker (vulling)",amount:"150 g"},{item:"Kaneelpoeder",amount:"6 tl"},{item:"— Crumble: ongezouten roomboter",amount:"225 g"},{item:"Bloem",amount:"300 g"},{item:"Suiker",amount:"300 g"},{item:"Zout",amount:"snuf"}],
    steps:["Meng de appels met de suiker en kaneel voor de vulling.","Doe alle crumble-ingrediënten in een kom; wrijf de boter met je vingers fijn en kneed tot een stevig maar kruimelig deeg.","Strooi het kruimeldeeg over het appelmengsel.","Bak de crumble in 30 min op 190 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-bloemkool-oven", name:"Bloemkool uit de oven met bloemkoolcrème", category:"Groente · geroosterd", yield:"1 kool",
    ingredients:[{item:"Grote bloemkool",amount:"1 st"},{item:"Boter",amount:"100 g"},{item:"Paprikapoeder",amount:"1 tl"},{item:"Gedroogde oregano",amount:"1 tl"},{item:"Komijn",amount:"1 tl"},{item:"Knoflookpoeder",amount:"1 tl"},{item:"Kurkuma",amount:"1 tl"},{item:"— Crème: bloemkoolbladeren",amount:"van de kool"},{item:"Cashewnoten, gebrand",amount:"2 el"},{item:"Citroensap",amount:"van 1 st"},{item:"Olijfolie",amount:"2 el"},{item:"Tahin",amount:"2 el"},{item:"Griekse yoghurt",amount:"4 el"},{item:"Verse groene kruiden",amount:"royaal"}],
    steps:["Verwijder de bladeren van de bloemkool (bewaar voor de crème) en snijd de stronk eraf.","Smelt de boter tot hij schuimt en bruin wordt; voeg de specerijen toe en laat trekken.","Bestrijk de bloemkool rondom met de boter.","Gaar in de oven op 200 °C + 50% stoom, 20–30 min, tot goudbruin en mals.","Crème: blancheer de bloemkoolbladeren tot ze zacht en groen zijn.","Draai fijn in de blender met verse kruiden; voeg cashewnoten, citroensap en olijfolie toe.","Voeg als laatste tahin en yoghurt toe en breng op smaak met peper en zout."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Combisteamer", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-bottenbouillon", name:"Bottenbouillon", category:"Fonds & bouillon", yield:"± 25 l",
    ingredients:[{item:"Water",amount:"30 l"},{item:"Runderbotten",amount:"15 kg"},{item:"Uien",amount:"15 st"},{item:"Knoflook",amount:"4 bollen"},{item:"Tijm",amount:"10 bosjes"},{item:"Tomaten",amount:"10 st"},{item:"Snijresten groenten (knolselderij, wortel, prei, ui)",amount:"royaal"},{item:"Laurier",amount:"10 blaadjes"},{item:"Jeneverbessen",amount:"20 st"},{item:"Peperkorrels",amount:"20 st"},{item:"Zout",amount:"2 el"}],
    steps:["Bruneer de botten 45 min in de oven op 250 °C; rooster de uien en knoflook ± 20 min mee op 250 °C.","Vul de Vario met het water en zet op het programma bouillon.","Doe de botten en uien met de overige ingrediënten in de Vario.","Laat de hele dag op het programma bouillon staan; zet 's nachts op sous-vide 94 °C.","Breng de volgende dag 1 uur goed aan de kook en haal alle botten en groenten eruit.","Breng op smaak met zout en peper en haal de bouillon door een koffiefilter.","Pasteuriseren: breng de bouillon terug aan de kook en stoom de lege potten met deksel 20 min op 100 °C.","Vul de potten met de hete bouillon, draai de deksels erop en pasteuriseer 50 min op 135 °C (combi)stomen.","Laat 30–45 min afkoelen in de oven op een kier, daarna 1 à 2 uur op kamertemperatuur, en zet koud."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Rundvlees", ferment:false, gear:"Vario / combisteamer", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-baba-ganoush", name:"Baba ganoush", category:"Purees", yield:"grote batch",
    ingredients:[{item:"Aubergines",amount:"10 st"},{item:"Knoflook",amount:"10 teentjes"},{item:"Tahini",amount:"3 el"},{item:"Komijnpoeder",amount:"3 tl"},{item:"Citroenen",amount:"3 st"},{item:"Olijfolie",amount:"scheut"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"}],
    steps:["Verwarm de oven op 180 °C.","Halveer de aubergines in de lengte, kerf de snijkant ruitvormig in, besprenkel met olijfolie en bak ± 45 min met de snijkant naar boven tot het vruchtvlees zacht is.","Pof de knoflookteentjes in aluminiumfolie mee in de oven.","Schraap het vruchtvlees uit de schil en draai in de keukenmachine met de gepofte knoflook (zonder velletje), tahini, komijnpoeder en 2 el olijfolie tot een grove puree.","Breng op smaak met zest en sap van de citroen, peper en zout, en eventueel extra komijn of olijfolie."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer","Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-champignonsaus", name:"Champignonsaus voor pasta", category:"Sauzen & emulsies", yield:"grote pan",
    ingredients:[{item:"Gesnipperde uien",amount:"1500 g"},{item:"Kastanjechampignons in parten",amount:"4 kg"},{item:"Knoflook, fijn",amount:"32 tenen"},{item:"Slagroom",amount:"2000 ml"},{item:"Volle melk",amount:"2000 ml"},{item:"Tijm",amount:"16 takjes"},{item:"Oude kaas, geraspt",amount:"600 g"},{item:"Zout",amount:"naar smaak"},{item:"Peper",amount:"naar smaak"}],
    steps:["Snijd alle groenten en rasp de kaas alvast.","Fruit de ui aan, voeg de knoflook toe en fruit even mee.","Doe de champignons erbij en bak even mee.","Giet de melk en room erop, voeg de tijm toe en laat 5–10 min koken.","Voeg de kaas toe en breng op smaak met peper en zout."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-basismayonaise", name:"Basismayonaise (63-gradeneieren)", category:"Sauzen & emulsies", yield:"≈ 4 l",
    ingredients:[{item:"Eieren, 1,5 uur gestoomd op 63 °C",amount:"10 st"},{item:"Wittewijnazijn",amount:"100 g"},{item:"Zout",amount:"30 g"},{item:"Gemalen zwarte peper",amount:"10 g"},{item:"Fijne mosterd",amount:"150 g"},{item:"Zonnebloemolie",amount:"3 l"}],
    steps:["Stoom de eieren 1,5 uur op 63 °C en koel terug.","Doe alles behalve de olie samen in de Magimix.","Draai fijn en voeg de olie druppelsgewijs toe."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Stoomoven", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-broodpudding", name:"Broodpudding", category:"Zoet & patisserie", yield:"1 bakblik",
    ingredients:[{item:"Melk",amount:"2250 g"},{item:"Ei",amount:"720 g"},{item:"Suiker",amount:"900 g"},{item:"Rozijnen, geweld",amount:"225 g"},{item:"Brood",amount:"1350 g"},{item:"Kaneelpoeder",amount:"naar keuze"},{item:"Citroenrasp",amount:"van 1 st"}],
    steps:["Vermeng de melk met de eieren.","Voeg suiker, kaneelpoeder en de citrusrasp toe en roer goed door.","Snijd het brood in kleine stukken en laat weken in het melkmengsel.","Roer het brood door met een garde tot een soort beslag ontstaat.","Voeg tot slot de rozijnen toe.","Giet in een bakblik en gaar 60 min in een op 160 °C voorverwarmde oven."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
];

const LIBRARY = buildLibrary();
// Standaard-houdbaarheid per recepttype (alleen waar nog niets is ingevuld):
// vriezer 178d, droog 178d ongekoeld, jam 365d ongekoeld, chutney 178d gekoeld,
// fermentatie 365d gekoeld, al het andere (koeling) 4d gekoeld bewaren.
function withShelfDefaults(r) {
  if (r.shelfDays) return r;
  const t = ((r.name || "") + " " + (r.category || "")).toLowerCase();
  const n = (r.name || "").toLowerCase(); // chutney/jam op de náám toetsen (de categorie heet "Chutney & jam")
  let shelfDays, shelfStorage;
  if (/ijs\b|sorbet|granit|parfait|semifreddo/.test(t)) { shelfDays = 178; shelfStorage = "vriezer bewaren"; }
  else if (/chips|krokant|kletskop|meringue|merengue|cracker|granola|tuile|tuille|kroepoek/.test(t) && !/kip|vlees|vis\b|garnaal|bitterbal|ei\b|eidooier/.test(n)) { shelfDays = 178; shelfStorage = "ongekoeld bewaren"; } // maar niet voor verse eiwitten (kip, ei …)
  else if (/gedroogde?\b|poeder\b|zout van|suiker van|dukkah/.test(n)) { shelfDays = 178; shelfStorage = "ongekoeld bewaren"; }
  else if (/chutney/.test(n)) { shelfDays = 178; shelfStorage = "gekoeld bewaren"; }
  else if (/jam\b|confituur|marmelade|gelei\b/.test(n)) { shelfDays = 365; shelfStorage = "ongekoeld bewaren"; }
  else if (/likeur|limoncello/.test(n)) { shelfDays = 365; shelfStorage = "ongekoeld bewaren"; }
  // — Correcties op de vroegere "alles 4 dagen"-uitschieters, per productsoort: —
  else if (/mayonaise|aioli|a\u00efoli/.test(n)) { shelfDays = 3; shelfStorage = "gekoeld bewaren"; } // verse ei-emulsie
  else if (/pickle|piccalilly|zoetzuur|tafelzuur|ingelegd|augurk/.test(t) && !r.ferment && !/mousse|cr\u00e8me|creme|soep|salade|schuim/.test(n)) { shelfDays = 90; shelfStorage = "gekoeld bewaren"; } // azijn-inleg (niet de verse bereidingen ermee)
  else if (/siroop|stroop/.test(n)) { shelfDays = 90; shelfStorage = "gekoeld bewaren"; } // hoog suiker
  else if (/pesto/.test(n)) { shelfDays = 7; shelfStorage = "gekoeld bewaren"; }
  else if (/geconfijte|confit\b/.test(n)) { shelfDays = 14; shelfStorage = "gekoeld bewaren"; } // onder vet/siroop
  else if (/compote/.test(n)) { shelfDays = 14; shelfStorage = "gekoeld bewaren"; } // gekookt met suiker
  else if (/vinaigrette|dressing/.test(n)) { shelfDays = 14; shelfStorage = "gekoeld bewaren"; } // azijnbasis
  else if (/boter$|kruidenboter/.test(n)) { shelfDays = 14; shelfStorage = "gekoeld bewaren"; } // samengestelde boter
  else if (/olie$|^olie van|kruidenolie/.test(n.trim())) { shelfDays = 30; shelfStorage = "gekoeld bewaren"; } // ge\u00efnfuseerde olie
  else if (/karamel|caramel/.test(n) && !/mousse|bavarois|taart|cr\u00e8me|creme|schuim/.test(n)) { shelfDays = 30; shelfStorage = "gekoeld bewaren"; }
  else if (r.ferment) { shelfDays = 365; shelfStorage = "gekoeld bewaren"; }
  else { shelfDays = 4; shelfStorage = "gekoeld bewaren"; }
  return { ...r, shelfDays, shelfStorage: r.shelfStorage || shelfStorage };
}
// Variaties erven de hoeveelheden van hun basisrecept: voor elk ingrediënt dat
// (op naam) ook in de basis staat, geldt de hoeveelheid van de basis. Extra
// ingrediënten van de variatie houden hun eigen hoeveelheid.
function alignVariationAmounts(recs) {
  const byId = new Map(recs.map((r) => [r.id, r]));
  const key = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return recs.map((r) => {
    if (!r.baseId || !byId.has(r.baseId)) return r;
    const base = byId.get(r.baseId);
    const bmap = new Map((base.ingredients || []).map((i) => [key(i.item), i.amount]));
    let changed = false;
    const ings = (r.ingredients || []).map((i) => {
      const ba = bmap.get(key(i.item));
      if (ba != null && ba !== i.amount) { changed = true; return { ...i, amount: ba }; }
      return i;
    });
    return changed ? { ...r, ingredients: ings } : r;
  });
}
const initialRecipes = alignVariationAmounts([...CURATED, ...PATISSERIE, ...KEUKENMAP, ...LIBRARY].map(withShelfDefaults).map((r) => ({ ...r, category: normCategory(r.category) })));

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
    plating:"Veldsla, carpaccio en geconfijte rode biet, gefermenteerde ui, uienvinaigrette en crumble van hazelnoot.",
    recipeIds:["gcarp-rode-biet","gconfit-rode-biet","lacto-ui","vinaigrette-uienvinaigrette","crumble-hazelnoot"], updatedBy:"Isa", updatedAt:"zojuist" },
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
  { id:"seed-amus-1", name:'Amuse van rode biet & mosterd', course:'Amuse', season:['Herfst', 'Winter'], diet:'Vegetarisch',
    description:'Klein hapje van gefermenteerde biet met bietenmosterd.',
    plating:'Lepel gefermenteerde rode biet, dotje bietenmosterd, gel van biet en een krokant bietenchipje.',
    recipeIds:['fhot-rode-biet', 'fmustard-bietenmosterd', 'gcarp-rode-biet', 'gchip-boerenkool'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-amus-2", name:'Tomaat, tartaar & basilicum', course:'Amuse', season:['Zomer'], diet:'Vegetarisch',
    description:'Frisse zomerhap van rauwe tomaat en basilicumgel.',
    plating:'Tomatentartaar in een lepel, basilicumgel, olijvencrumble en een druppel balsamico.',
    recipeIds:['gtartaar-tomaat', 'herbgel2-basilicum', 'c-olive-crumble', 'c-balsamic-pearls'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-amus-3", name:'Erwt, munt & radijs', course:'Amuse', season:['Lente'], diet:'Vegetarisch',
    description:'Lentegroen hapje met erwtenspuma en knapperige radijs.',
    plating:'Spuma van erwt, gepekelde radijs, muntolie en erwtenscheuten.',
    recipeIds:['gespuma-erwten', 'gpickle-radijs', 'gherboil-munt', 'beanpuree-erwten'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-amus-4", name:'Courgettebloem & geitenkaas', course:'Amuse', season:['Zomer'], diet:'Vegetarisch',
    description:'Gevulde courgettebloem als luchtig zomerhapje.',
    plating:'Gepekelde courgettebloem, courgettepuree, bloemenazijn en een dun courgettelint.',
    recipeIds:['pflower-courgettebloem', 'gpuree-courgette', 'fvinegar-goudsbloem', 'gcarp-courgette'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-amus-5", name:'Knolselderij & appel', course:'Amuse', season:['Winter'], diet:'Vegetarisch',
    description:'Aards-frisse combinatie van knolselderij en appel.',
    plating:'Gerookte knolselderijpuree, appelcompote, knolselderijchip en dragonolie.',
    recipeIds:['gsmoke-knolselderij', 'gcompote-appel', 'roast-knolselderij', 'gherboil-dragon'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-amus-6", name:'Gelakte varkensbuik in één hap', course:'Amuse', season:['Herfst', 'Winter'], diet:'Varkensvlees',
    description:'Rijk hapje van eigen varken met zoetzuur.',
    plating:'Blokje gelakte buik, ui-compote, mosterdmayo en een krokant uitje.',
    recipeIds:['pork-gelakte-buik', 'gconfit-knoflook', 'mayo-mosterdmayonaise', 'fhot-ui'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-amus-7", name:'Rode biet & crème fraîche', course:'Amuse', season:['Herfst'], diet:'Vegetarisch',
    description:'Klassiek samenspel van biet en zuivel.',
    plating:'Bietencarpaccio, crème fraîche, kvass-gel en bieslook.',
    recipeIds:['gcarp-rode-biet', 'cultzuivel-cre-me-frai-che', 'kvass-rode-biet', 'gherbgel-bieslook'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-amus-8", name:'Wortel, komijn & kefir', course:'Amuse', season:['Lente', 'Zomer'], diet:'Vegetarisch',
    description:'Zoete wortel met frisse kefir.',
    plating:'Wortelpuree met komijn, wortelchip, kefir en wortelloofolie.',
    recipeIds:['gpuree-wortel', 'gchip-wortel', 'waterkefir-munt-waterkefir', 'gespuma-wortel'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-amus-9", name:'Venkel, peer & dille', course:'Amuse', season:['Herfst'], diet:'Vegetarisch',
    description:'Anijzig en fris najaarshapje.',
    plating:'Gepocheerde peer, venkelgel, dille-olie en venkelgroen.',
    recipeIds:['gpoach-peer', 'ggel-venkel', 'herboil2-dille', 'grill-venkel'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-amus-10", name:'Pruim, reine claude & amandel', course:'Amuse', season:['Zomer', 'Herfst'], diet:'Vegetarisch',
    description:'Zoetzuur steenfruit met amandel.',
    plating:'Zoutpruim, reine-claudecompote, amandelpasta en een pruimengel.',
    recipeIds:['zoutpruim-pruim', 'gcompote-reine-claude', 'nutpaste-amandel', 'gpoach-pruim'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-lunc-1", name:'Wrap met gelakte varkensbuik', course:'Lunch', season:['Hele jaar'], diet:'Varkensvlees',
    description:'Hartige wrap met eigen varken en kimchi.',
    plating:'Warme wrap, gelakte buik, kimchi van paksoi, mosterdmayo en frisse kruiden.',
    recipeIds:['pork-gelakte-buik', 'kimchi-paksoi', 'mayo-mosterdmayonaise', 'gherboil-koriander'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-lunc-2", name:'Sandwich pulled pork & appel', course:'Lunch', season:['Hele jaar'], diet:'Varkensvlees',
    description:'Zachte broodje met pulled pork en appelcompote.',
    plating:'Pulled schouder, appelcompote, honingmosterd en gepekelde ui op een zacht broodje.',
    recipeIds:['pork-pulled-schouder', 'gcompote-appel', 'fmustard-honingmosterd', 'gpickle-ui'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-lunc-3", name:'Soep van geroosterde pastinaak', course:'Lunch', season:['Herfst', 'Winter'], diet:'Vegetarisch',
    description:'Romige winterse soep met pastinaakchips.',
    plating:'Geroosterde pastinaaksoep, crème fraîche, pastinaakchip en tijmolie.',
    recipeIds:['roast-pastinaak', 'gpuree-pastinaak', 'cultzuivel-cre-me-frai-che', 'gchip-pastinaak'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-lunc-4", name:'Tomatensoep uit eigen tuin', course:'Lunch', season:['Zomer'], diet:'Vegetarisch',
    description:'Volle zomersoep van rijpe tomaten.',
    plating:'Tomatensoep, basilicumgel, olijvencrumble en een scheut olijfolie.',
    recipeIds:['gtartaar-tomaat', 'herbgel2-basilicum', 'c-olive-crumble', 'fhot-tomaat'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-lunc-5", name:'Zoete breaksnack: appel & kaneel', course:'Lunch', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Zoete onderbreking met appel en banketbakkersroom.',
    plating:'Appelcompote, kaneelbanketbakkersroom, appelchip en karamel.',
    recipeIds:['gcompote-appel', 'patissiere-kaneelbanketbakkersroom', 'fchip-appel', 'caramel-klassieke-karamel'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-lunc-6", name:'Mini quiche met boerenkool', course:'Lunch', season:['Herfst', 'Winter'], diet:'Vegetarisch',
    description:'Hartige mini quiche met boerenkool en kaas.',
    plating:'Bladerdeegbodem, boerenkoolpuree, geitenkaas en boerenkoolchip.',
    recipeIds:['gpuree-boerenkool', 'gchip-boerenkool', 'lacto-boerenkool', 'gconfit-knoflook'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-lunc-7", name:'Wrap met geroosterde groenten', course:'Lunch', season:['Zomer', 'Herfst'], diet:'Vegetarisch',
    description:'Vegetarische wrap met seizoensgroenten.',
    plating:'Gegrilde courgette en venkel, wortelpuree, aioli en verse kruiden in een wrap.',
    recipeIds:['grill-courgette', 'grill-venkel', 'gpuree-wortel', 'mayo-aioli'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-lunc-8", name:'Sandwich met gerookte biet', course:'Lunch', season:['Herfst', 'Winter'], diet:'Vegetarisch',
    description:'Volle sandwich met gerookte biet en mierikswortel.',
    plating:'Gerookte biet, crème fraîche, bietenmosterd en gepekelde ui op donker brood.',
    recipeIds:['gsmoke-rode-biet', 'cultzuivel-cre-me-frai-che', 'fmustard-bietenmosterd', 'gpickle-ui'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-lunc-9", name:'Soep van erwt & munt', course:'Lunch', season:['Lente'], diet:'Vegetarisch',
    description:'Lentegroene soep met frisse munt.',
    plating:'Erwtensoep, muntolie, erwtenspuma en radijs.',
    recipeIds:['beanpuree-erwten', 'gespuma-erwten', 'gherboil-munt', 'gpickle-radijs'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-lunc-10", name:'Zoete breaksnack: rabarber & vanille', course:'Lunch', season:['Lente'], diet:'Vegetarisch',
    description:'Frisse zoete snack met rabarber.',
    plating:'Gepocheerde rabarber, vanilleroomijs, rabarbercoulis en amandelcrumble.',
    recipeIds:['gpoach-rabarber', 'icecream-vanille-roomijs', 'gcoulis-rabarber', 'crumble-hazelnoot'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-borr-1", name:'Bieten-hummus met chips', course:'Borrel', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Kleurrijke dip met knapperige groentechips.',
    plating:'Rode-bietenpuree met knoflook, bietenchip en pastinaakchip om te dippen.',
    recipeIds:['gpuree-boerenkool', 'gconfit-knoflook', 'gchip-boerenkool', 'gchip-pastinaak'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-borr-2", name:'Gefrituurde courgettebloemen', course:'Borrel', season:['Zomer'], diet:'Vegetarisch',
    description:'Krokante bloemen met frisse dip.',
    plating:'Gefrituurde courgettebloem, aioli en bloemenazijn.',
    recipeIds:['pflower-courgettebloem', 'mayo-aioli', 'fvinegar-goudsbloem', 'gcarp-courgette'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-borr-3", name:'Krokante varkenskrossen', course:'Borrel', season:['Hele jaar'], diet:'Varkensvlees',
    description:'Knapperige borrelhap van eigen varken.',
    plating:'Krokante krosse, mosterdmayo en gepekelde ui.',
    recipeIds:['pork-krokante-krosse', 'mayo-mosterdmayonaise', 'gpickle-ui', 'fmustard-klassieke-gefermenteerde-mosterd'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-borr-4", name:'Gepekelde groenten uit het vat', course:'Borrel', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Frisse zuurtjes van het seizoen.',
    plating:'Gefermenteerde radijs, komkommer en meiknol met dille.',
    recipeIds:['fvat-radijs', 'fvat-komkommer', 'fvat-meiknol', 'herboil2-dille'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-borr-5", name:'Kaasplankje met huisgemaakte mosterd', course:'Borrel', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Klassiek plankje met eigen fermenten.',
    plating:'Geitenkaas, honingmosterd, appel-leer en walnootcrumble.',
    recipeIds:['fmustard-honingmosterd', 'fleather-appel', 'crumble-walnoot', 'gcompote-appel'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-borr-6", name:'Wortelchips met kefirdip', course:'Borrel', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Zoete chips met frisse dip.',
    plating:'Wortelchip, kefirdip met kruiden en wortelpuree.',
    recipeIds:['gchip-wortel', 'waterkefir-munt-waterkefir', 'gpuree-wortel', 'gherbgel-bieslook'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-borr-7", name:'Gerookte biet op toast', course:'Borrel', season:['Herfst', 'Winter'], diet:'Vegetarisch',
    description:'Hartige toast met gerookte biet.',
    plating:'Toast, gerookte biet, crème fraîche en bieslook.',
    recipeIds:['gsmoke-rode-biet', 'cultzuivel-cre-me-frai-che', 'gherbgel-bieslook', 'gcarp-rode-biet'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-borr-8", name:'Pittige kimchi-pannenkoekjes', course:'Borrel', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Koreaans geïnspireerde hartige hapjes.',
    plating:'Mini pannenkoek met kimchi, sojasaus-mayo en lente-ui.',
    recipeIds:['kimchi-paksoi', 'mayo-sojasaus-mayonaise', 'kimchi-chinese-kool', 'gherboil-koriander'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-borr-9", name:'Zoutpruim & amandel bites', course:'Borrel', season:['Zomer', 'Herfst'], diet:'Vegetarisch',
    description:'Zoetzuur-zilte hapjes.',
    plating:'Zoutpruim, amandelpasta en een krokant tuiltje.',
    recipeIds:['zoutpruim-pruim', 'nutpaste-amandel', 'tuile-sesamtuile', 'gpoach-pruim'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-borr-10", name:'Gefermenteerde hotsauce & brood', course:'Borrel', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Pittige dip met knapperig brood.',
    plating:'Gefermenteerde hotsauce van tomaat, knoflookolie en geroosterd brood.',
    recipeIds:['fhot-tomaat', 'fhot-knoflook', 'gconfit-knoflook', 'honingknoflook-klassieke-honing-knoflook'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-fria-1", name:'Aardbei-pâte de fruit', course:'Friandise', season:['Lente', 'Zomer'], diet:'Vegetarisch',
    description:'Zoete fruitgelei bij de koffie.',
    plating:'Aardbeiencoulis verwerkt tot pâte de fruit met suikerkorst.',
    recipeIds:['gcoulis-aardbei', 'gsorbet-aardbei', 'gjam-aalbes', 'kruidensuiker-munt'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-fria-2", name:'Muntganache-bonbon', course:'Friandise', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Frisse chocoladebonbon met munt.',
    plating:'Pure ganache met munt, afgewerkt met muntsuiker.',
    recipeIds:['ganache-muntganache', 'ganache-pure-ganache', 'kruidensuiker-munt', 'gherbgel-munt'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-fria-3", name:'Karamel-fudge met zeezout', course:'Friandise', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Zachte fudge met gezouten karamel.',
    plating:'Gezouten karamel tot fudge, afgewerkt met een vlokje zout.',
    recipeIds:['caramel-gezouten-karamel', 'caramel-klassieke-karamel', 'icecream-karamel-roomijs', 'crumble-pistache'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-fria-4", name:'Lavendel-chocolade', course:'Friandise', season:['Zomer'], diet:'Vegetarisch',
    description:'Bloemige chocoladehap.',
    plating:'Lavendelganache in chocolade met gekonfijte lavendel.',
    recipeIds:['ganache-lavendelganache', 'candyflower-lavendel', 'ganache-pure-ganache', 'wildesoda-lavendel'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-fria-5", name:'Aalbessen-gelei', course:'Friandise', season:['Zomer'], diet:'Vegetarisch',
    description:'Frisse rode gelei.',
    plating:'Aalbessenjam tot gelei met suikerkorst.',
    recipeIds:['gjam-aalbes', 'gsorbet-aalbes', 'gcoulis-framboos', 'kruidensuiker-kamille'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-fria-6", name:'Kamille-karamel', course:'Friandise', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Bloemige zachte karamel.',
    plating:'Klassieke karamel geïnfuseerd met kamille, gekonfijte kamillebloem.',
    recipeIds:['caramel-klassieke-karamel', 'candyflower-kamille', 'kruidensuiker-kamille', 'anglaise-kamille-anglaise'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-fria-7", name:'Appel-leer rolletjes', course:'Friandise', season:['Herfst'], diet:'Vegetarisch',
    description:'Taai-zoet fruitsnoepje.',
    plating:'Appel-leer opgerold met kaneelsuiker.',
    recipeIds:['fleather-appel', 'fchip-appel', 'gcompote-appel', 'kruidensuiker-tijm'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-fria-8", name:'Framboos-sorbetbonbon', course:'Friandise', season:['Zomer'], diet:'Vegetarisch',
    description:'Fruitige bevroren hap.',
    plating:'Frambozensorbet omhuld met chocolade en frambozencoulis.',
    recipeIds:['gsorbet-framboos', 'gcoulis-framboos', 'ganache-pure-ganache', 'granita-framboos-granite'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-fria-9", name:'Pistache-tuile', course:'Friandise', season:['Hele jaar'], diet:'Vegetarisch',
    description:'Krokant koekje bij de koffie.',
    plating:'Dunne sesamtuile met pistachecrumble.',
    recipeIds:['tuile-sesamtuile', 'crumble-pistache', 'tuile-boekweittuile', 'nutpaste-amandel'],
    updatedBy:"Michael", updatedAt:"nieuw" },
  { id:"seed-fria-10", name:'Reine claude & amandel friandise', course:'Friandise', season:['Zomer', 'Herfst'], diet:'Vegetarisch',
    description:'Zoet steenfruit-hapje.',
    plating:'Reine-claudecompote op amandelpasta met een suikerkorst.',
    recipeIds:['gcompote-reine-claude', 'nutpaste-amandel', 'zoutpruim-reine-claude', 'crumble-hazelnoot'],
    updatedBy:"Michael", updatedAt:"nieuw" },
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
  { name:"framboos", pairs:["chocolade","rozemarijn","room","amandel"], note:"Fris zuur; goed bij chocolade." },
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
  { name:"rode eikenbladsla", pairs:["walnoot","peer","blauwe kaas","ui"], note:"Zachte bittere sla; noot en fruit." },
  { name:"paksoi", pairs:["knoflook","gember","sojasaus","sesam","chili"], note:"Knapperige steel; kort roerbakken." },
  { name:"goudsbloem", pairs:["rijst","wortel","ei","boter"], note:"Arme-mans-saffraan; kleur en mild." },
  { name:"korenbloem", pairs:["komkommer","kaas","citroen"], note:"Vooral kleur; mild zoetig." },
  { name:"dahlia", pairs:["hazelnoot","boter","appel"], note:"Knol nootachtig als aardappel; bloem decoratief." },
  { name:"leeuwenbek", pairs:["salade","kruiden","citroen"], note:"Eetbare bloem; licht bitter, als garnituur." },
  { name:"kamille", pairs:["appel","honing","room","peer","vanille"], note:"Bloemig-appelig; in zoet en thee." },
  { name:"lavendel", pairs:["honing","citroen","bosvruchten","chocolade"], note:"Sterk parfum; heel spaarzaam." },
  { name:"afrikaantjes", pairs:["citrus","wortel","tomaat"], note:"Citrus-anijs blad; als kruid en kleur." },
  { name:"princessenbonen", pairs:["knoflook","boter","bonenkruid","amandel","ui"], note:"Fijne boon; kort garen." },
  { name:"snijbonen", pairs:["spek","ui","tomaat","bonenkruid"], note:"Stevig; goed in stoof." },
  { name:"pronkbonen", pairs:["tomaat","knoflook","spek","salie"], note:"Grote boon; hartige begeleiders." },
  { name:"peultjes", pairs:["munt","boter","citroen","sesam"], note:"Zoet en knapperig; kort." },
  { name:"kapucijners", pairs:["spek","ui","augurk","mosterd"], note:"Stevige peul; klassiek Hollands." },
  { name:"ijsbergsla", pairs:["tomaat","ui","yoghurt","citroen"], note:"Knapperig en neutraal; frisse dressing." },
  { name:"veldsla", pairs:["walnoot","spek","ei","ui","biet"], note:"Zacht en nootachtig; wintersalade." },
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

  // — Aangevuld: eerder alleen genoemd als combinatie, nu eigen entry met
  // terugverwijzingen, zodat elke smaakchip aanklikbaar doorlinkt. —
  { name:"aardappel", pairs:["andijvie","bieslook","boerenkool","lavas","rozemarijn","savooikool","tuinzuring","uiensoepboom","utrechtse ui"], note:"Neutraal en aards; draagt vet, kruid en zuur." },
  { name:"amandel", pairs:["framboos","princessenbonen","pruim","reine claude","sperziebonen"], note:"Zacht nootachtig; bindt fruit en gebak." },
  { name:"ansjovis", pairs:["kardoen","palmkool"], note:"Zout en umami; smelt weg in vet." },
  { name:"augurk", pairs:["dille","kapucijners"], note:"Knapperig zuur; snijdt door vet en peulvruchten." },
  { name:"azijn", pairs:["ui"], note:"Puur zuur; wekt zoet en aards op." },
  { name:"balsamico", pairs:["aardbei","rucola"], note:"Donker zoetzuur; rondt fruit en blad af." },
  { name:"basilicum", pairs:["aardbei","tomaat"], note:"Zoet-kruidig; hoort bij tomaat en fruit." },
  { name:"biet", pairs:["geitenkaas","veldsla"], note:"Aards zoet; vraagt zuur en romig tegenwicht." },
  { name:"blauwe kaas", pairs:["bleekselderij","druif","groenlof","peer","rode eikenbladsla"], note:"Zout en scherp; zoekt zoet fruit en noot." },
  { name:"bonenkruid", pairs:["princessenbonen","snijbonen","sperziebonen"], note:"Peperig kruid; klassiek bij bonen." },
  { name:"bosvruchten", pairs:["lavendel","vanille"], note:"Zoet-zuur rood fruit; houdt van bloemig.", season:["Zomer"] },
  { name:"boter", pairs:["dahlia","goudsbloem","kardoen","meiknol","peterselie","peultjes","princessenbonen","radijs","salie","spitskool","uiensoepboom","utrechtse ui"], note:"Rond en romig; drager van zachte groenten." },
  { name:"bouillon", pairs:["lavas"], note:"Hartige basis; diepte voor blad en knol." },
  { name:"chili", pairs:["boerenkool","chinese kool","koriander","paksoi","palmkool"], note:"Hitte; wakkert kool en koriander aan." },
  { name:"chocolade", pairs:["braam","framboos","lavendel","munt","peer"], note:"Bitterzoet; omarmt rood fruit en munt." },
  { name:"citroen", pairs:["aardpeer","amaranth","blauwe bes","boerenkool","courgette","courgettebloem","dille","dragon","erwten","ijsbergsla","japanse wijnbes","kardoen","knoflook","komkommer","korenbloem","lavendel","leeuwenbek","meiknol","peterselie","peultjes","radijs","rode melde","rozemarijn","rucola","snijbiet","spinazie","tijm","venkel"], note:"Helder zuur; frist vet en aards op." },
  { name:"citrus", pairs:["afrikaantjes"], note:"Fris zuur-bitter; licht bloemen en blad op." },
  { name:"ei", pairs:["andijvie","bieslook","bindsla","dragon","goudsbloem","lavas","meiknol","oost-indische kers","rode melde","spinazie","tuinzuring","uiensoepboom","utrechtse ui","veldsla"], note:"Rijk en bindend; drager van kruiden en blad." },
  { name:"feta", pairs:["courgette"], note:"Zilt en fris; breekt zoete groenten." },
  { name:"geitenkaas", pairs:["chioggia biet","gele biet","rode biet"], note:"Fris-zuur romig; klassiek bij biet." },
  { name:"gember", pairs:["amsoi","chinese kool","paksoi","rabarber","wortel"], note:"Warm en scherp; wakkert kool en fruit aan." },
  { name:"gevogelte", pairs:["tijm"], note:"Mild vlees; drager van tuinkruiden." },
  { name:"ham", pairs:["koolrabi"], note:"Zout en rokerig; zoet contrast met knol." },
  { name:"hazelnoot", pairs:["aardpeer","dahlia","knolselderij","pastinaak"], note:"Geroosterd zoet; verdiept knolgroenten." },
  { name:"honing", pairs:["aardpeer bloem","chioggia biet","citroenmelisse","groenlof","japanse wijnbes","kamille","lavendel","pastinaak","reine claude","rozemarijn","wortel"], note:"Bloemig zoet; verzacht bitter en zuur." },
  { name:"kaas", pairs:["bieslook","korenbloem","oregano","ui","uiensoepboom"], note:"Zout-umami; maat van ui en kruid." },
  { name:"kaneel", pairs:["appel","blauwe bes","mispel","pruim","rode kool"], note:"Warm zoet kruid; hoort bij herfstfruit." },
  { name:"karamel", pairs:["appel","zeezout"], note:"Gebrand zoet; houdt van zuur fruit." },
  { name:"karwij", pairs:["biet","spitskool"], note:"Anijsachtig kruid; klassiek bij kool." },
  { name:"kastanje", pairs:["savooikool","spruitjes"], note:"Melig zoet; wintermaat van kool.", season:["Herfst"] },
  { name:"kokos", pairs:["koriander"], note:"Romig zoet; drager van kruidige gerechten." },
  { name:"komijn", pairs:["koriander","wortel"], note:"Warm aards kruid; bij wortel en peul." },
  { name:"kruidnagel", pairs:["rode kool"], note:"Intens warm kruid; spaarzaam bij kool en fruit." },
  { name:"lam", pairs:["munt","rozemarijn"], note:"Uitgesproken vlees; houdt van munt en rozemarijn." },
  { name:"limoen", pairs:["koriander"], note:"Scherp fris zuur; bij koriander en chili." },
  { name:"melk", pairs:["laurier"], note:"Zacht en romig; trekt zachte kruiden." },
  { name:"mierikswortel", pairs:["koolrabi","rode biet","rundvlees"], note:"Scherp en heet; wakkert biet en rund aan." },
  { name:"mosterd", pairs:["andijvie","bindsla","dille","dragon","kapucijners","knolselderij","koolrabi","spitskool","varkensvlees"], note:"Scherp zuur; ruggengraat voor dressing." },
  { name:"mozzarella", pairs:["basilicum","tomaat"], note:"Melkzacht; canvas voor tomaat." },
  { name:"nootmuskaat", pairs:["pastinaak","savooikool","spinazie"], note:"Warm kruid; bij spinazie en knol." },
  { name:"olijf", pairs:["citroen","tomaat"], note:"Zilt en rijp; mediterrane diepte." },
  { name:"olijfolie", pairs:["knoflook","oregano"], note:"Fruitig vet; drager van knoflook en kruid." },
  { name:"paddenstoel", pairs:["tijm"], note:"Umami en bosachtig; bij tijm." },
  { name:"parmezaan", pairs:["courgettebloem","kardoen","rucola"], note:"Zout umami; verdiept blad en bloem." },
  { name:"pecorino", pairs:["palmkool"], note:"Zout schapig; pittige maat van kool." },
  { name:"perzik", pairs:["burrata","citroenmelisse","rozemarijn"], note:"Sappig zomerzoet; houdt van bloemig.", season:["Zomer"] },
  { name:"peulvrucht", pairs:["laurier"], note:"Melig hartig; drager van laurier." },
  { name:"pijnboompit", pairs:["rucola","snijbiet"], note:"Zacht harsig; geroosterd bij blad." },
  { name:"pompoen", pairs:["kaneel","salie"], note:"Zoet en vol; klassiek bij salie.", season:["Herfst"] },
  { name:"ricotta", pairs:["courgettebloem","erwten","snijbiet"], note:"Licht en melkzoet; vulling voor bloem en blad." },
  { name:"rijst", pairs:["goudsbloem"], note:"Neutraal; canvas voor bloem en kruid." },
  { name:"rode wijn", pairs:["peer","pruim","rundvlees"], note:"Donker en wrang; stooft fruit en vlees." },
  { name:"room", pairs:["aalbes","aardbei","blauwe bes","citroenmelisse","framboos","japanse wijnbes","kamille","laurier","mispel","rabarber","spinazie","tuinzuring"], note:"Vol en zacht; verzacht zuur fruit." },
  { name:"rozijn", pairs:["snijbiet"], note:"Geconcentreerd zoet; tegen bitter blad." },
  { name:"selderij", pairs:["lavas"], note:"Groen en zout-aards; bouillonmaat." },
  { name:"sesam", pairs:["amaranth","amsoi","paksoi","peultjes"], note:"Nootachtig geroosterd; bij Aziatisch blad." },
  { name:"sinaasappel", pairs:["chioggia biet","gele biet","groenlof","rabarber","rode biet","venkel","wortel"], note:"Zoet zuur; licht biet en venkel op.", season:["Winter"] },
  { name:"ui", pairs:["princessenbonen","rode eikenbladsla","veldsla"], note:"Fijn ui-zoet; basis van vinaigrette." },
  { name:"sojasaus", pairs:["amsoi","chinese kool","paksoi"], note:"Diep umami-zout; bij kool en paksoi." },
  { name:"spek", pairs:["aardpeer","andijvie","kapucijners","pronkbonen","savooikool","snijbonen","spitskool","veldsla"], note:"Rokerig vet; zoete maat van bonen en kool." },
  { name:"thee", pairs:["citroenmelisse","honing"], note:"Bitter-bloemig; trekt citroenmelisse aan." },
  { name:"truffel", pairs:["ei","knolselderij"], note:"Aards parfum; bij knolselderij." },
  { name:"vanille", pairs:["aalbes","blauwe bes","braam","japanse wijnbes","kamille","kweepeer","rabarber","reine claude"], note:"Zacht bloemig zoet; rondt fruit af." },
  { name:"vis", pairs:["bieslook","peterselie","tuinzuring"], note:"Zilt en teer; vraagt frisse kruiden." },
  { name:"walnoot", pairs:["appel","bleekselderij","chioggia biet","druif","gele biet","groenlof","mispel","peer","rode biet","rode eikenbladsla","veldsla"], note:"Bitterzoet; klassiek bij fruit en kaas." },
  { name:"wild", pairs:["aalbes","laurier"], note:"Diep en donker; houdt van zuur fruit." },
  { name:"witte bonen", pairs:["palmkool","salie"], note:"Romig melig; drager van salie." },
  { name:"witte chocolade", pairs:["aalbes"], note:"Melkzoet; maat van zure bes." },
  { name:"yoghurt", pairs:["ijsbergsla","komkommer"], note:"Fris zuur; koelt komkommer en sla." },
  { name:"zachte kaas", pairs:["oost-indische kers"], note:"Romig mild; laat bloemen spreken." },
  { name:"zout", pairs:["radijs"], note:"Versterker; maakt zoet en bitter helder." },
  { name:"zure room", pairs:["bieslook"], note:"Fris en vol; drager van bieslook." },
  { name:"zwarte peper", pairs:["aardbei"], note:"Warme scherpte; wekt aardbei op." },
  { name:"burrata", pairs:["perzik","tomaat","basilicum","olijfolie"], note:"Romig hart; canvas voor rijp zomerfruit." },
  { name:"rozenwater", pairs:["framboos","aardbei","honing"], note:"Bloemig parfum; spaarzaam bij rood fruit." },
  { name:"spruitjes", pairs:["kastanje","spek","hazelnoot","nootmuskaat"], note:"Bitterzoet wintergroen; houdt van rook en noot.", season:["Winter"] },
  { name:"zeezout", pairs:["karamel","chocolade","tomaat"], note:"Knapperige versterker; maakt zoet dieper." },
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
// Grootte van een verpakking in gram(equivalent): "1 kg" → 1000, "500 gram" → 500,
// "1,5 l" → 1500, kaal getal → gram. Gebruikt door het meeschalen van ingrediënten
// én de Excel-totalen, zodat kg en gram eerlijk met elkaar vergeleken worden.
function unitSizeG(u) {
  const t = String(u || "").toLowerCase().replace(",", ".");
  const m = t.match(/(\d+(?:\.\d+)?)\s*(kg|gram|gr|g|liter|l|dl|cl|ml)?\b/);
  if (!m || !m[1]) return null;
  const n = Number(m[1]);
  const eh = m[2] || "";
  if (eh === "kg" || eh === "l" || eh === "liter") return n * 1000;
  if (eh === "dl") return n * 100;
  if (eh === "cl") return n * 10;
  return n; // g, gr, gram, ml of kaal getal: gram
}
// Referentie voor het meeschalen van ingrediënten in het voorraadformulier.
// Gebruikt yieldAmount/yieldUnit als die er zijn; anders wordt de opbrengsttekst
// gelezen ("≈ 3 potten" → 3 stuks, "≈ 500 g" → 1 × 500). Zo klopt de schaling
// ook voor bibliotheekrecepten en oudere recepten zonder losse opbrengstvelden.
function parseYieldRef(amount, unitText, yieldText) {
  let a = amount != null && !isNaN(Number(amount)) && Number(amount) > 0 ? Number(amount) : null;
  let u = unitSizeG(unitText); // in gram, zodat "1 kg" en "500 gram" vergelijkbaar zijn
  if (a === null) {
    const m = String(yieldText || "").match(/(\d+(?:[.,]\d+)?)\s*(?:×|x)?\s*([a-zà-ÿ]*)/i);
    if (m) {
      const n = Number(m[1].replace(",", "."));
      const w = (m[2] || "").toLowerCase();
      if (/^(g|gr|gram|kg|ml|cl|dl|l|liter)$/.test(w)) { if (u === null) u = unitSizeG(m[1] + " " + w); a = 1; }
      else a = n;
    }
  }
  return { refYield: a, refUnitNum: u };
}
// Keuzelijst in app-stijl: native <select> toont op telefoons het donkere
// systeemmenu dat vloekt met de app. Deze knop opent een eigen lijstje in de
// app-kleuren; tikken kiest en sluit. Ondersteunt dezelfde plek/breedte als
// de oude selects via className/style.
// Typveld mét dropdown: rechtstreeks typen kan altijd, en de pijl opent een
// klein menu met de standaardopties (vervangt de aparte "Anders…"-keuze).
function ComboInput({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const boxRef = React.useRef(null);
  useEffect(() => {
    if (!open) return;
    const klik = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const toets = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", klik, true);
    document.addEventListener("keydown", toets, true);
    return () => { document.removeEventListener("mousedown", klik, true); document.removeEventListener("keydown", toets, true); };
  }, [open]);
  return (
    <div ref={boxRef} className="relative">
      <input className="input pl-2.5 pr-8 py-2 w-full text-sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <button type="button" onClick={() => setOpen((o) => !o)} className="ff absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md hover:opacity-70" title="Standaardopties">
        <ChevronDown size={15} className="acc" />
      </button>
      {open && (
        <>
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl p-1 shadow-xl" style={{ background: T.paper, border: "1px solid " + T.line, maxHeight: "12rem", overflowY: "auto" }}>
            {options.map((o) => (
              <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
                className={"ff w-full text-left rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-2 " + (o === value ? "pillon" : "ink hover:opacity-70")}>
                <span>{o}</span>
                {o === value && <Check size={15} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AppSelect({ value, onChange, options, className, style, title, placeholder, compact = true }) {
  const [open, setOpen] = useState(false);
  const boxRef = React.useRef(null);
  // Klik buiten het menu of Escape sluit het — document-breed, zodat het in
  // elke laag van de app werkt (formulieren, popups, filters).
  useEffect(() => {
    if (!open) return;
    const klik = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const toets = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", klik, true);
    document.addEventListener("keydown", toets, true);
    return () => { document.removeEventListener("mousedown", klik, true); document.removeEventListener("keydown", toets, true); };
  }, [open]);
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const cur = opts.find((o) => o.value === value);
  const label = cur ? (cur.label || "\u2014") : (placeholder || "\u2014");
  const knop = (
    <button type="button" onClick={() => setOpen((o) => !o)} className={(className || "input px-2.5 py-2 w-full text-sm") + " ff w-full text-left inline-flex items-center justify-between gap-2"} style={compact ? undefined : style} title={title}>
      <span className={"truncate " + (cur && cur.value !== "" ? "ink" : "mute")}>{label}</span>
      <ChevronDown size={15} className="acc shrink-0" />
    </button>
  );
  const lijst = opts.map((o) => (
    <button key={String(o.value)} type="button" disabled={o.disabled} onClick={() => { onChange(o.value); setOpen(false); }}
      className={"ff w-full text-left rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-2 disabled:opacity-40 " + (o.value === value ? "pillon" : "ink hover:opacity-70")}>
      <span>{o.label || "\u2014"}</span>
      {o.value === value && <Check size={15} />}
    </button>
  ));
  // Compact: klein menu direct onder het veld (voor korte lijstjes in popups);
  // anders het grote paneel (voor lange lijsten zoals categorieën).
  if (compact) {
    return (
      <div ref={boxRef} className="relative" style={style}>
        {knop}
        {open && (
          <>
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl p-1 shadow-xl" style={{ background: T.paper, border: "1px solid " + T.line, maxHeight: "16rem", overflowY: "auto" }}>
              {title && <div className="text-xs mute px-3 pt-1.5 pb-1">{title}</div>}
              {lijst}
            </div>
          </>
        )}
      </div>
    );
  }
  return (
    <>
      {knop}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }} onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-sm rounded-2xl p-2 shadow-xl" style={{ background: T.paper, maxHeight: "70vh", overflowY: "auto" }}>
            {title && <div className="text-xs mute px-3 pt-2 pb-1">{title}</div>}
            {lijst}
          </div>
        </div>
      )}
    </>
  );
}

// Stellage-icoon (eigen tekening in Lucide-lijnstijl): twee staanders, drie
// planken met potten en bakken — herkenbaarder als "voorraad" dan de doos.
function ShelfIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2.5v19M20 2.5v19" />
      <path d="M4 9h16M4 16h16M4 21.5h16" />
      <rect x="7" y="4.3" width="4.2" height="4.7" />
      <rect x="12.6" y="10.8" width="4.8" height="5.2" />
      <rect x="7.3" y="17.2" width="3.8" height="4.3" />
    </svg>
  );
}

// Boerderijhuis-icoon (eigen tekening): het logo-rondje wordt de home-knop.
function FarmhouseIcon({ size = 16, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      <path d="M1.5 10 9.5 3.5 17.5 10" />
      <path d="M3.5 9.5V20.5h12V9.5" />
      <path d="M7.5 20.5v-5h4v5" />
      <path d="M20.5 20.5v-5.5" />
      <path d="M20.5 15c0-2.4 1.4-4 3.2-4.4.2 2.4-1 4.2-3.2 4.4Z" />
      <path d="M20.5 13c0-2.2-1.3-3.7-3-4 0 2.2 1.1 3.8 3 4Z" />
    </svg>
  );
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
  Lente:{ background:"#e0f0d6", color:"#3c6b2c" },   // lichtgroen
  Zomer:{ background:"#f6d9d2", color:"#9c3a2a" },   // rood
  Herfst:{ background:"#e8d9c2", color:"#6f4a1f" },  // bruin
  Winter:{ background:"#daeaf5", color:"#2f5d7d" },  // lichtblauw
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
.pill{background:#e8ebe0;color:#565a4b;border:1px solid #3a4b30;transition:color .15s}.pill:hover{color:#2b3823}
.pillon{background:#3a4b30;color:#f4f2ea;border:1px solid #3a4b30}
.chip{background:#eceadf;color:#5b5e4f}
.tintbox{background:#eef1e7;border:1px solid #e0e5d6}
.input{width:100%;border:1px solid #d8d5c8;background:#fff;border-radius:10px;font-size:15px;color:#33352c}
.input:focus{outline:none;box-shadow:0 0 0 2px #3a4b30;border-color:#3a4b30}
.divi{border-top:1px solid #ece9dd}
::selection{background:#dfe4d3}
`}</style>
  );
}

// Vangnet: loopt de app vast op een onverwachte fout, dan blijft er geen dood,
// onklikbaar scherm achter maar een duidelijke melding met een herlaadknop.
// De foutmelding staat er klein bij, zodat de oorzaak terug te vinden is.
class AppErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { try { console.error("Ritme-fout:", err, info); } catch (e) {} }
  render() {
    if (this.state.err) return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f2f0e8", color: "#2b3823", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Er ging iets mis</div>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 16, lineHeight: 1.5 }}>De app liep vast op een onverwachte fout. Herladen lost dit vrijwel altijd op — alle opgeslagen gegevens staan veilig in de database.</div>
          <button onClick={() => { try { window.location.reload(); } catch (e) {} }} style={{ background: "#3a4b30", color: "#f2f0e8", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Herladen</button>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 14, wordBreak: "break-word" }}>{String((this.state.err && this.state.err.message) || this.state.err)}</div>
        </div>
      </div>
    );
    return this.props.children;
  }
}

export default function AppRoot() {
  return <AppErrorBoundary><App /></AppErrorBoundary>;
}

if (typeof console !== "undefined") console.log("Ritme " + RITME_VERSIE);
function App() {
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("recepten"); // de app opent op de receptenpagina
  const [recipes, setRecipes] = useState(initialRecipes);
  const [dishes, setDishes] = useState(seedDishes);
  // Live (met database): start leeg tot de echte batches geladen zijn — de
  // demobatches zijn alleen voor de demo-modus zonder databaseverbinding.
  // Zo knippert er bij een refresh nergens demodata doorheen.
  const [batches, setBatches] = useState(supabase ? [] : seedBatches);
  const [loaded, setLoaded] = useState(false);
  const [stack, setStack] = useState([{ screen: "list" }]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [pairings, setPairings] = useState(PAIRINGS);
  const [openCounts, setOpenCounts] = useState({});
  // Weggeklikte "vraagt aandacht"-banner: bewaard op het apparaat (alleen vandaag),
  // zodat een refresh de keuze niet vergeet.
  const [dismissedNotices, setDismissedNotices] = useState(() => { try { return JSON.parse(localStorage.getItem("ritme:notice-dismiss") || "{}") || {}; } catch (e) { return {}; } });
  useEffect(() => { try { const k = kitchenDate(); localStorage.setItem("ritme:notice-dismiss", JSON.stringify(dismissedNotices[k] ? { [k]: true } : {})); } catch (e) {} }, [dismissedNotices]);
  const [dishDraft, setDishDraft] = useState(null);
  const [cleaningTasks, setCleaningTasks] = useState(CLEANING_SEED);
  const [cleaningLogs, setCleaningLogs] = useState([]);
  const [techNotes, setTechNotes] = useState(TECH_NOTES_SEED);
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkBanner, setCheckBanner] = useState(false);
  const checkReloadRef = React.useRef(0); // rem op herladen vanuit de schoonmaakcontrole
  const [calcOpen, setCalcOpen] = useState(false);
  // Weggeklikte herinneringen overleven een refresh: bewaard op het apparaat.
  const [checkDone, setCheckDoneState] = useState(() => { try { return JSON.parse(localStorage.getItem("ritme:check-dismiss") || "null"); } catch (e) { return null; } });
  const setCheckDone = (v) => { setCheckDoneState(v); try { localStorage.setItem("ritme:check-dismiss", JSON.stringify(v)); } catch (e) {} };
  const [newPairing, setNewPairing] = useState(0);
  const [haccpLogs, setHaccpLogs] = useState([]);
  const [haccpRecords, setHaccpRecords] = useState([]);
  const [werkDocs, setWerkDocs] = useState([]); // aanpassingen/nieuwe werkwijze-documenten
  const [stock, setStock] = useState([]); // voorraad
  // Chef-modus: alleen deze sessie (React-state, dus weg na verversen).
  const [chefMode, setChefMode] = useState(false);
  const [assortiment, setAssortiment] = useState([]);
  const [calcItems, setCalcItems] = useState([]); // gedeelde items voor de calculaties
  const [negeerIng, setNegeerIng] = useState([]); // ingredienten die niet in de prijslijst horen
  const [spellingUit, setSpellingUit] = useState([]); // namen die bewust afwijken en niet gecorrigeerd worden
  const [naamAlias, setNaamAlias] = useState({}); // zelf samengevoegde namen: variant -> hoofdnaam
  const [bdArtikelen, setBdArtikelen] = useState([]);
  const [importVraag, setImportVraag] = useState(null); // {file, naam} — leverancier bevestigen voor het inlezen
  // De prijsmotor leest de artikelen uit een module-variabele; hier bijgewerkt.
  React.useMemo(() => zetPrijslijst(bdArtikelen), [bdArtikelen]);
  const [catSettings, setCatSettings] = useState(() => {
    // Start met de lokale cache; de gedeelde versie uit Supabase overschrijft dit bij het laden.
    try { return { eigen: JSON.parse(localStorage.getItem("ritme:cats-eigen") || "[]") || [], verborgen: JSON.parse(localStorage.getItem("ritme:cats-verborgen") || "[]") || [] }; } catch (e) { return { eigen: [], verborgen: [] }; }
  });
  // ---- Backup & herstel: voorraad, recepten (incl. fermentatie) en gerechten ----
  const maakBackup = () => {
    const b = { app: "ritme", versie: RITME_VERSIE, datum: new Date().toISOString(),
      recepten: recipes, gerechten: dishes, voorraad: stock };
    const blob = new Blob([JSON.stringify(b, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ritme-backup-" + localDate() + ".json";
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    flash("Backup gedownload (" + recipes.length + " recepten · " + dishes.length + " gerechten · " + stock.length + " voorraaditems)");
  };
  // ---- Assortiment (chef): producten met kost-/verkoopprijs ----
  const saveAssortimentItem = async (item) => {
    const it = { ...item, id: item.id || "as" + Date.now() };
    setAssortiment((xs) => { const i = xs.findIndex((x) => x.id === it.id); return i >= 0 ? xs.map((x) => (x.id === it.id ? it : x)) : [...xs, it]; });
    if (live) {
      const { error } = await supabase.from("assortiment").upsert({ id: it.id, data: it, updated_by: user?.naam || "team", updated_at: new Date().toISOString() });
      if (error) flash("Alleen lokaal bewaard — draai eerst de assortiment-SQL in Supabase");
    }
    return it.id;
  };
  // Namen gelijktrekken bij het opslaan van een recept. Schrijft iemand een naam
  // die de app net had gecorrigeerd toch weer anders, dan blijft die staan.
  const spellingUitzondering = async (namen) => {
    const volgende = [...new Set([...spellingUit, ...namen.map((x) => String(x).toLowerCase())])];
    setSpellingUit(volgende);
    if (live) await supabase.from("app_settings").upsert({ key: "calc_spelling", value: { namen: volgende }, updated_at: new Date().toISOString() });
  };
  const corrigeerNamen = (nieuw, oud) => {
    const oudeNamen = new Set(((oud && oud.ingredients) || []).map((x) => String((x && x.item) || "").trim().toLowerCase()));
    const eerdereCanon = new Set(((oud && oud.ingredients) || []).map((x) => naamSleutel((x && x.item) || "")).filter(Boolean));
    const gewijzigd = [];
    const bewust = [];
    const ingredients = ((nieuw && nieuw.ingredients) || []).map((ing) => {
      const naam = String((ing && ing.item) || "").trim();
      if (!naam) return ing;
      // Stond deze naam er al zo in, dan is het een bewuste keuze.
      if (oudeNamen.has(naam.toLowerCase())) return ing;
      const voorstel = naamVoorstel(naam);
      if (!voorstel) return ing;
      // Was dit ingredient in de vorige versie al gelijkgetrokken en typt iemand
      // 'm nu anders, dan is dat bewust: onthouden en met rust laten.
      if (eerdereCanon.has(naamSleutel(naam))) { bewust.push(naam); return ing; }
      gewijzigd.push(naam + " → " + voorstel);
      return { ...ing, item: voorstel };
    });
    if (bewust.length) spellingUitzondering(bewust);
    if (gewijzigd.length) flash("Schrijfwijze gelijkgetrokken: " + gewijzigd.slice(0, 3).join(", ") + (gewijzigd.length > 3 ? " +" + (gewijzigd.length - 3) : ""));
    return { ...nieuw, ingredients };
  };
  // Twee schrijfwijzen die hetzelfde ingredient zijn onder een naam brengen.
  const voegNamenSamen = async (van, naar) => {
    const volgende = { ...naamAlias, [String(van).toLowerCase()]: naar };
    setNaamAlias(volgende);
    if (live) {
      const { error } = await supabase.from("app_settings").upsert({ key: "calc_alias", value: { paren: volgende }, updated_at: new Date().toISOString() });
      if (error) flash("Alleen lokaal samengevoegd — draai eerst de app_settings-SQL in Supabase");
      else flash(van + " telt nu mee als " + naar);
    } else flash(van + " telt nu mee als " + naar);
  };
  // Een ingredient dat geen inkoopartikel is (kopregel, toelichting) uit de lijst halen.
  const negeerIngredient = async (naam) => {
    const volgende = [...new Set([...negeerIng, String(naam).toLowerCase()])];
    setNegeerIng(volgende);
    if (live) {
      const { error } = await supabase.from("app_settings").upsert({ key: "calc_negeer", value: { namen: volgende }, updated_at: new Date().toISOString() });
      if (error) flash("Alleen lokaal weggehaald — draai eerst de app_settings-SQL in Supabase");
    }
  };
  const saveCalcItem = async (item) => {
    const it = normGedeeldItem({ ...item, id: item.id || "it" + Date.now() });
    setCalcItems((xs) => { const i = xs.findIndex((x) => x.id === it.id); return i >= 0 ? xs.map((x) => (x.id === it.id ? it : x)) : [...xs, it]; });
    if (live) {
      const { error } = await supabase.from("calculatie_items").upsert({ id: it.id, data: it, updated_by: user?.naam || "team", updated_at: new Date().toISOString() });
      if (error) flash("Alleen lokaal bewaard — draai eerst de calculatie_items-SQL in Supabase");
    }
    return it.id;
  };
  const deleteCalcItem = async (id) => {
    setCalcItems((xs) => xs.filter((x) => x.id !== id));
    // Het item verdwijnt ook uit de producten waar het in zat.
    for (const p of assortiment) {
      if (!(p.items || []).some((x) => x && x.itemId === id)) continue;
      await saveAssortimentItem({ ...p, items: (p.items || []).filter((x) => !(x && x.itemId === id)) });
    }
    if (live) await supabase.from("calculatie_items").delete().eq("id", id);
  };
  // Recepten, gerechten en items uit een bundel inlezen. Bedoeld voor de
  // voorbeeldcalculatie; alles krijgt een vaste id, dus opnieuw inlezen werkt bij.
  const importBundel = async (bundel) => {
    // Eerst kijken of de database er klaar voor is; anders verdwijnt alles bij de
    // eerste refresh en snapt niemand waarom.
    if (live) {
      const problemen = [];
      const t1 = await supabase.from("calculatie_items").select("id").limit(1);
      if (t1.error) problemen.push("tabel calculatie_items ontbreekt — draai calculatie_items.sql");
      const t2 = await supabase.from("dishes").select("portions,voorbeeld").limit(1);
      if (t2.error) problemen.push("kolommen portions/voorbeeld ontbreken bij dishes — draai gerechten_porties.sql");
      const t3 = await supabase.from("recipes_custom").select("id").limit(1);
      if (t3.error) problemen.push("tabel recipes_custom is niet bereikbaar");
      if (problemen.length) { alert("Inlezen kan nog niet:\n\n· " + problemen.join("\n· ")); return; }
    } else if (!window.confirm("Je bent niet ingelogd op de database. Het voorbeeld komt dan alleen op dit apparaat en verdwijnt bij verversen. Toch doorgaan?")) return;
    try { await importBundelDoen(bundel); }
    catch (e) { alert("Inlezen gestopt: " + (e && e.message ? e.message : String(e))); }
  };
  const importBundelDoen = async (bundel) => {
    const recIds = {}, gerIds = {}, itemIds = {};
    const stempel = new Date().toISOString();
    const fouten = [];
    for (const r of bundel.recepten || []) {
      const id = "vb-r-" + zonderAccent(r.name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const rec = {
        id, name: r.name, category: r.category || "Overig", custom: true, voorbeeld: true,
        description: r.description || "", ingredients: (r.ingredients || []).map((x) => ({ item: x.item, amount: x.amount || "" })),
        steps: r.steps || [], yields: r.yields || [], portions: r.portions || null,
        yieldAmount: null, yieldUnit: "", yield: (r.yields || []).map((y) => (y.count ? y.count + "× " : "") + [y.size, y.pack].filter(Boolean).join(" ")).join(" + ") || "—",
        season: ["Hele jaar"], diet: r.diet || "Vegetarisch", garden: false, ferment: false,
        endorsements: [], chefsPick: false, baseId: null, isBase: false,
        updatedBy: "Voorbeeld", updatedAt: "zojuist",
      };
      recIds[r.name] = id;
      if (live) { const { error } = await supabase.from("recipes_custom").upsert({ id, data: rec, updated_by: "Voorbeeld", updated_at: stempel }); if (error) fouten.push("recept " + r.name + ": " + error.message); }
      setRecipes((rs) => (rs.some((x) => x.id === id) ? rs.map((x) => (x.id === id ? rec : x)) : [rec, ...rs]));
    }
    for (const d of bundel.gerechten || []) {
      const id = "vb-d-" + zonderAccent(d.name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const ger = {
        id, name: d.name, course: d.course || "Gerecht", description: d.description || "",
        plating: "", recipeIds: (d.recepten || []).map((n) => recIds[n]).filter(Boolean),
        season: ["Hele jaar"], diet: d.diet || "Vegetarisch", portions: d.portions || null, voorbeeld: true,
        updatedBy: "Voorbeeld", updatedAt: "zojuist",
      };
      gerIds[d.name] = id;
      if (live) {
        const { error } = await supabase.from("dishes").upsert({
          id, name: ger.name, course: ger.course, description: ger.description, plating: "",
          recipe_ids: ger.recipeIds, season: ger.season, diet: ger.diet, portions: ger.portions, voorbeeld: true,
          updated_by: "Voorbeeld", updated_at: stempel,
        });
        if (error) fouten.push("gerecht " + d.name + ": " + error.message);
      }
      setDishes((ds) => (ds.some((x) => x.id === id) ? ds.map((x) => (x.id === id ? ger : x)) : [ger, ...ds]));
    }
    for (const it of bundel.items || []) {
      const id = "vb-i-" + zonderAccent(it.name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const regels = (it.regels || []).map((g) => normRegel({
        soort: g.soort, naam: g.naam, aantal: g.aantal || "1",
        refId: g.soort === "gerecht" ? gerIds[g.naam] : g.soort === "recept" ? recIds[g.naam] : null,
        perPrijs: g.perPrijs || "", perEenheid: g.perEenheid || "kg", hoeveel: g.hoeveel || "",
      }));
      const item = normGedeeldItem({ id, name: it.name, regels, cost: "", notes: it.notes || "Voorbeeld t.b.v. calculaties" });
      itemIds[it.name] = id;
      setCalcItems((xs) => (xs.some((x) => x.id === id) ? xs.map((x) => (x.id === id ? item : x)) : [...xs, item]));
      if (live) { const { error } = await supabase.from("calculatie_items").upsert({ id, data: item, updated_by: "Voorbeeld", updated_at: stempel }); if (error) fouten.push("item " + it.name + ": " + error.message); }
    }
    // Producten koppelen aan de nieuwe items, op naam van de itemregel.
    let gekoppeld = 0;
    for (const p of assortiment) {
      const items = (p.items || []).map(normItem);
      let veranderd = false;
      const nieuwe = items.map((x) => {
        const doel = itemIds[x.text] || itemIds[String(x.text).trim()];
        if (!doel || x.itemId === doel) return x;
        veranderd = true; gekoppeld++;
        return { ...x, itemId: doel };
      });
      if (veranderd) await saveAssortimentItem({ ...p, items: nieuwe });
    }
    const melding = (bundel.recepten || []).length + " recepten, " + (bundel.gerechten || []).length + " gerechten, " + (bundel.items || []).length + " items · " + gekoppeld + " productregels gekoppeld";
    if (fouten.length) alert(melding + "\n\nNiet alles kwam in de database:\n" + fouten.slice(0, 5).join("\n") + (fouten.length > 5 ? "\n+" + (fouten.length - 5) + " meer" : ""));
    else alert("Klaar: " + melding + ".\n\nDe items staan onder Calculaties, de gerechten onder Gerechten.");
  };
  // Meerdere producten in een keer inlezen (.json) — bestaande namen worden bijgewerkt.
  const importAssortiment = async (file) => {
    let lijst;
    try { lijst = JSON.parse(await file.text()); } catch (e) { alert("Dit bestand is geen geldige JSON."); return; }
    if (lijst && !Array.isArray(lijst) && (lijst.recepten || lijst.gerechten || lijst.items)) { await importBundel(lijst); return; }
    if (!Array.isArray(lijst)) lijst = lijst && Array.isArray(lijst.producten) ? lijst.producten : null;
    if (!lijst || !lijst.length) { alert("Geen producten gevonden in dit bestand."); return; }
    let nieuw = 0, bij = 0;
    for (const p of lijst) {
      const naam = String((p && p.name) || "").trim();
      if (!naam) continue;
      // Naam plus doel is de sleutel: "Lichte lunch" bestaat zowel voor catering
      // als voor het landgoed en die mogen elkaar niet overschrijven.
      const doel = String((p && p.doel) || "").trim();
      const bestaand = assortiment.find((x) => String(x.name || "").toLowerCase() === naam.toLowerCase() && String(x.doel || "").toLowerCase() === doel.toLowerCase());
      await saveAssortimentItem({
        id: bestaand ? bestaand.id : undefined,
        name: naam, doel, cat: String((p && p.cat) || "").trim(), fromP: String(p.fromP || "").trim(), toP: String(p.toP || "").trim(),
        cost: String(p.cost || "").trim(), price: String(p.price || "").trim(), notes: String(p.notes || "").trim(),
        items: (Array.isArray(p.items) ? p.items : []).map(normItem).filter((x) => x.text.trim()),
      });
      if (bestaand) bij++; else nieuw++;
    }
    flash(nieuw + " producten toegevoegd" + (bij ? ", " + bij + " bijgewerkt" : ""));
  };
  const deleteAssortimentItem = async (id) => {
    setAssortiment((xs) => xs.filter((x) => x.id !== id));
    if (live) await supabase.from("assortiment").delete().eq("id", id);
  };
  // Wegschrijven van artikelen. Bestaan leverancier/categorie/opmerking nog niet
  // als kolom in Supabase, dan gaat het zonder die velden alsnog door.
  const upsertArtikelen = async (rows) => {
    const zet = async (rs) => { let f = null; for (let i = 0; i < rs.length && !f; i += 200) f = (await supabase.from("bd_artikelen").upsert(rs.slice(i, i + 200))).error; return f; };
    const fout = await zet(rows);
    if (!fout) return "ok";
    if (!/column|kolom|schema/i.test(String(fout.message || ""))) return "fout";
    const kaal = rows.map((r) => { const c = { ...r }; delete c.leverancier; delete c.categorie; delete c.opmerking; return c; });
    return (await zet(kaal)) ? "fout" : "kaal";
  };
  // ---- Artikelen (inkoop) importeren uit een leveranciersbestand ----
  const importBdArtikelen = async (file, leverancierNaam) => {
    const laadXLSX = () => new Promise((res, rej) => {
      if (window.XLSX) return res(window.XLSX);
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      sc.onload = () => res(window.XLSX); sc.onerror = () => rej(new Error("cdn"));
      document.head.appendChild(sc);
    });
    let XLSX;
    try { XLSX = await laadXLSX(); } catch (e) { alert("Kon de Excel-bibliotheek niet laden — controleer de internetverbinding."); return; }
    let rows;
    try {
      // XLSX.read leest ook .csv/.txt/.tsv (scheidingsteken wordt herkend)
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" });
    } catch (e) { alert("Dit bestand kon niet gelezen worden. Ondersteund: .xlsx, .xls, .csv, .txt (tab- of puntkomma-gescheiden)."); return; }
    // Kopregel zoeken met soepele kolomnamen, zodat exports van andere
    // leveranciers ook werken zolang er een omschrijving- en prijskolom is.
    const syn = {
      code: ["code", "artikel", "artikelnr", "artikelnummer", "art.nr", "artnr", "art nr"],
      oms: ["omschrijving", "artikelomschrijving", "naam", "product", "beschrijving", "titel"],
      inhoud: ["inhoud", "verpakking", "eenheid", "colli", "collo", "inh"],
      prijs: ["prijs", "price", "nettoprijs", "netto", "stukprijs", "prijs excl", "prijs excl."],
      ppe: ["ppe", "prijs per eenheid", "prijs/eenheid", "eenheidsprijs", "prijs p/e"],
      cat: ["categorie", "groep", "productgroep", "hoofdgroep", "artikelgroep", "assortimentsgroep", "rubriek", "soort"],
      lev: ["leverancier", "supplier", "leveranciernaam"],
    };
    const vind = (kop, namen) => { for (const n of namen) { const i = kop.indexOf(n); if (i >= 0) return i; } return -1; };
    let kopIdx = -1, kop = [];
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const k = rows[i].map((c) => String(c).trim().toLowerCase());
      if (vind(k, syn.oms) >= 0 && (vind(k, syn.prijs) >= 0 || vind(k, syn.ppe) >= 0)) { kopIdx = i; kop = k; break; }
    }
    if (kopIdx < 0) { alert("Geen kolomkoppen gevonden. Het bestand heeft minimaal een kolom Omschrijving/Naam en een kolom Prijs of PPE nodig."); return; }
    const iCode = vind(kop, syn.code), iOms = vind(kop, syn.oms), iInh = vind(kop, syn.inhoud), iPrijs = vind(kop, syn.prijs), iPpe = vind(kop, syn.ppe);
    const iCat = vind(kop, syn.cat), iLev = vind(kop, syn.lev);
    const levStandaard = String(leverancierNaam || "").trim() || "Onbekende leverancier";
    const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? null : n; };
    const perCode = {};
    for (const r of rows.slice(kopIdx + 1)) {
      const oms = String(r[iOms] || "").trim();
      if (!oms || /^-+$/.test(oms)) continue; // streepjesregel of leeg
      let code = iCode >= 0 ? String(r[iCode] || "").trim() : "";
      if (/^-+$/.test(code)) continue;
      if (!code) code = "n:" + oms.toLowerCase(); // leverancier zonder artikelcode
      // De code krijgt de leverancier ervoor, anders overschrijft artikel 10102
      // van de ene leverancier dat van de andere.
      code = zonderAccent(levStandaard).toLowerCase().trim() + "::" + code;
      perCode[code] = { code, omschrijving: oms, inhoud: iInh >= 0 ? String(r[iInh] || "").trim() : "", prijs: iPrijs >= 0 ? num(r[iPrijs]) : null, ppe: iPpe >= 0 ? num(r[iPpe]) : null,
        leverancier: (iLev >= 0 ? String(r[iLev] || "").trim() : "") || levStandaard,
        categorie: (iCat >= 0 ? String(r[iCat] || "").trim() : "") || "Overig" };
    }
    const arts = Object.values(perCode);
    if (!arts.length) { alert("Geen artikelen gevonden in dit bestand."); return; }
    // Samenvoegen met wat er al is (nieuwe import overschrijft per artikelcode)
    setBdArtikelen((xs) => {
      const map = {};
      for (const a of xs) map[a.code] = a;
      // Opmerkingen van het team blijven staan als dezelfde artikelcode opnieuw binnenkomt.
      for (const a of arts) {
        const oud = map[a.code];
        // Zelf gegeven namen en opmerkingen blijven staan bij opnieuw inlezen.
        map[a.code] = { ...a, opmerking: (oud && oud.opmerking) || "", categorie: (oud && oud.categorie) || a.categorie, leverancier: (oud && oud.leverancier) || a.leverancier };
      }
      const uit = Object.values(map);
      bewaarArtikelEigen(uit);
      return uit;
    });
    if (live) {
      const stempel = new Date().toISOString();
      const uit = await upsertArtikelen(arts.map((a) => ({ ...a, updated_at: stempel })));
      if (uit === "fout") { flash("Artikelen alleen lokaal — draai eerst de bd_artikelen-SQL in Supabase"); return; }
      if (uit === "kaal") { flash(arts.length + " artikelen gedeeld, maar zonder leverancier/categorie — voeg die kolommen toe in Supabase"); return; }
    }
    flash(arts.length + " artikelen ingelezen voor " + levStandaard + (live ? " — gedeeld met het team" : ""));
  };
  // Leverancier of categorie een nettere naam geven — geldt voor het hele team.
  const hernoemArtikelGroep = async (soort, oud, nieuw, leverancier) => {
    const naam = String(nieuw || "").trim();
    if (!naam) return;
    const raakt = (a) => (soort === "lev"
      ? (a.leverancier || "Onbekende leverancier") === oud
      : (a.categorie || "Overig") === oud && (a.leverancier || "Onbekende leverancier") === leverancier);
    const nieuwe = bdArtikelen.filter(raakt).map((a) => (soort === "lev" ? { ...a, leverancier: naam } : { ...a, categorie: naam }));
    if (!nieuwe.length) return;
    setBdArtikelen((xs) => xs.map((a) => (raakt(a) ? (soort === "lev" ? { ...a, leverancier: naam } : { ...a, categorie: naam }) : a)));
    bewaarArtikelEigen(nieuwe);
    if (live) {
      const uit = await upsertArtikelen(nieuwe.map((a) => ({ ...a, updated_at: new Date().toISOString() })));
      if (uit !== "ok") { flash("Naam staat op dit toestel; voor het hele team eerst de kolom-SQL in Supabase draaien"); return; }
    }
    flash(nieuwe.length + " artikelen staan nu onder " + naam);
  };
  const deleteBdArtikel = async (code) => {
    setBdArtikelen((xs) => xs.filter((a) => a.code !== code));
    if (live) await supabase.from("bd_artikelen").delete().eq("code", code);
  };
  const updateBdArtikel = async (art) => {
    setBdArtikelen((xs) => (xs.some((a) => a.code === art.code) ? xs.map((a) => (a.code === art.code ? art : a)) : [...xs, art]));
    bewaarArtikelEigen([art]);
    if (live) {
      const uit = await upsertArtikelen([{ ...art, updated_at: new Date().toISOString() }]);
      if (uit === "fout") flash("Alleen lokaal bewaard — draai eerst de bd_artikelen-SQL in Supabase");
      else if (uit === "kaal") flash("Prijs gedeeld; opmerking blijft lokaal tot de kolommen in Supabase staan");
    }
  };
  const maakWordBackup = async () => {
    const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // JSZip on-demand laden (alleen voor deze knop nodig)
    const laadJSZip = () => new Promise((res, rej) => {
      if (window.JSZip) return res(window.JSZip);
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      sc.onload = () => res(window.JSZip); sc.onerror = () => rej(new Error("cdn"));
      document.head.appendChild(sc);
    });
    let JSZip;
    try { JSZip = await laadJSZip(); } catch (e) { alert("Kon de zip-bibliotheek niet laden — controleer de internetverbinding en probeer opnieuw."); return; }
    const doc = (titel, body) => '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + esc(titel) + '</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}h1{font-size:18pt;margin-bottom:2pt}h2{font-size:12pt;margin:12pt 0 4pt}p{margin:3pt 0}li{margin:2pt 0}.mut{color:#666}</style></head><body>' + body + "</body></html>";
    const veiligeNaam = (n) => String(n || "naamloos").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);
    const zip = new JSZip();
    const namen = {};
    const uniek = (map, n) => { const k = map + "/" + n; namen[k] = (namen[k] || 0) + 1; return namen[k] > 1 ? n + " (" + namen[k] + ")" : n; };
    for (const r of recipes) {
      const regels = [];
      regels.push("<h1>" + esc(r.name) + "</h1>");
      regels.push('<p class="mut">' + esc([r.category, r.yield, (r.season || []).join(", "), r.diet].filter(Boolean).join(" · ")) + "</p>");
      if (r.shelfDays) regels.push("<p>Houdbaar: " + esc(r.shelfDays) + " dagen" + (r.shelfStorage ? " (" + esc(r.shelfStorage) + ")" : "") + "</p>");
      const alg = recipeAllergens(r);
      if (alg.length) regels.push("<p><b>Allergenen:</b> " + esc(alg.join(", ")) + "</p>");
      if (r.ferment) regels.push("<p><b>Fermentatie:</b> " + esc([r.fermentMethod, r.fermentDefaults && r.fermentDefaults.days ? r.fermentDefaults.days + " dagen" : null, r.fermentDefaults && r.fermentDefaults.ph ? "pH " + r.fermentDefaults.ph : null].filter(Boolean).join(" · ")) + "</p>");
      if ((r.ingredients || []).length) regels.push("<h2>Ingrediënten</h2><ul>" + r.ingredients.map((i) => "<li>" + esc([i.amount, i.item].filter(Boolean).join(" ")) + "</li>").join("") + "</ul>");
      if ((r.steps || []).length) regels.push("<h2>Bereiding</h2><ol>" + r.steps.map((st) => "<li>" + esc(st) + "</li>").join("") + "</ol>");
      if (r.note) regels.push("<h2>Opmerkingen</h2><p>" + esc(r.note) + "</p>");
      zip.file("recepten/" + uniek("r", veiligeNaam(r.name)) + ".doc", doc(r.name, regels.join("")));
    }
    for (const d of dishes) {
      const regels = [];
      regels.push("<h1>" + esc(d.name) + "</h1>");
      regels.push('<p class="mut">' + esc([d.course, (d.season || []).join(", "), d.diet].filter(Boolean).join(" · ")) + "</p>");
      if (d.description) regels.push("<p>" + esc(d.description) + "</p>");
      const rn = (d.recipeIds || []).map((id) => { const r = recipes.find((x) => x.id === id); return r ? r.name : null; }).filter(Boolean);
      if (rn.length) regels.push("<h2>Recepten</h2><ul>" + rn.map((n) => "<li>" + esc(n) + "</li>").join("") + "</ul>");
      if (d.plating) regels.push("<h2>Opmaak</h2><p>" + esc(d.plating) + "</p>");
      zip.file("gerechten/" + uniek("g", veiligeNaam(d.name)) + ".doc", doc(d.name, regels.join("")));
    }
    const vRegels = stock.map((v) => "<li><b>" + esc(v.product) + "</b> — " + esc([v.qty + " st.", v.unit, v.storage, v.productionDate ? "gemaakt " + fmtDMY(v.productionDate) : null, v.expiryDate ? "THT " + fmtDMY(v.expiryDate) : null, v.by].filter(Boolean).join(" · ")) + "</li>").join("");
    zip.file("voorraad.doc", doc("Voorraad", "<h1>Voorraad — " + fmtDMY(localDate()) + "</h1><ul>" + vRegels + "</ul>"));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ritme-backup-word-" + localDate() + ".zip";
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    flash("Word-backup gedownload (" + recipes.length + " recepten · " + dishes.length + " gerechten · voorraadlijst)");
  };
  const herstelBackup = async (file) => {
    let b;
    try { b = JSON.parse(await file.text()); } catch (e) { alert("Dit bestand is geen geldige Ritme-backup."); return; }
    if (!b || b.app !== "ritme" || !Array.isArray(b.recepten) || !Array.isArray(b.gerechten) || !Array.isArray(b.voorraad)) { alert("Dit bestand is geen geldige Ritme-backup."); return; }
    const wanneer = b.datum ? new Date(b.datum).toLocaleString("nl-NL") : "onbekende datum";
    if (!window.confirm("Backup van " + wanneer + " terugzetten?\n\n" + b.recepten.length + " recepten, " + b.gerechten.length + " gerechten en " + b.voorraad.length + " voorraaditems worden teruggezet. Gelijknamige items worden overschreven; items die ná de backup zijn gemaakt blijven staan.")) return;
    const stempel = { updated_by: "backup-herstel", updated_at: new Date().toISOString() };
    if (live) {
      // Recepten: eigen recepten naar recipes_custom, bewerkte standaardrecepten naar recipe_overrides.
      const eigen = b.recepten.filter((r) => r.custom).map((r) => ({ id: r.id, data: r, ...stempel }));
      const seedIds = new Set(initialRecipes.map((r) => r.id));
      const overrides = b.recepten.filter((r) => !r.custom && seedIds.has(r.id)).map((r) => ({ id: r.id, data: r, ...stempel }));
      let fout = null;
      for (let i = 0; i < eigen.length && !fout; i += 100) fout = (await supabase.from("recipes_custom").upsert(eigen.slice(i, i + 100))).error;
      for (let i = 0; i < overrides.length && !fout; i += 100) fout = (await supabase.from("recipe_overrides").upsert(overrides.slice(i, i + 100))).error;
      const dRows = b.gerechten.map((d) => ({ id: d.id, name: d.name, course: d.course, description: d.description, plating: d.plating, recipe_ids: d.recipeIds, season: d.season, diet: d.diet, ...stempel }));
      for (let i = 0; i < dRows.length && !fout; i += 100) fout = (await supabase.from("dishes").upsert(dRows.slice(i, i + 100))).error;
      const vRows = b.voorraad.map((v) => ({ id: v.id, product: v.product, qty: v.qty, initial_qty: v.initialQty, unit: v.unit, ingredients: v.ingredients, production_date: v.productionDate || null, expiry_date: v.expiryDate || null, made_by: v.by, recipe_id: v.recipeId || null, storage: v.storage || "" }));
      for (let i = 0; i < vRows.length && !fout; i += 100) fout = (await supabase.from("voorraad").upsert(vRows.slice(i, i + 100))).error;
      if (dbFail(fout)) return;
    }
    // Lokale staat: backup-items terugzetten, nieuwere items laten staan.
    setRecipes((rs) => { const ids = new Set(b.recepten.map((r) => r.id)); return [...b.recepten, ...rs.filter((r) => !ids.has(r.id))]; });
    setDishes((ds) => { const ids = new Set(b.gerechten.map((d) => d.id)); return [...b.gerechten, ...ds.filter((d) => !ids.has(d.id))]; });
    setStock((vs2) => { const ids = new Set(b.voorraad.map((v) => v.id)); return [...b.voorraad, ...vs2.filter((v) => !ids.has(v.id))]; });
    flash("Backup teruggezet" + (live ? " — zichtbaar voor het hele team" : " (demo: alleen dit apparaat)"));
  };
  const saveCatSettings = async (next) => {
    setCatSettings(next);
    try { localStorage.setItem("ritme:cats-eigen", JSON.stringify(next.eigen)); localStorage.setItem("ritme:cats-verborgen", JSON.stringify(next.verborgen)); } catch (e) {}
    if (live) {
      const { error } = await supabase.from("app_settings").upsert({ key: "recipe_categories", value: next, updated_at: new Date().toISOString() });
      if (error) flash("Categorieën alleen lokaal bewaard — draai eerst de app_settings-SQL in Supabase");
    }
  };
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
      // Geen accounts meer: het keukenwachtwoord logt het apparaat eenmalig in;
      // wie wat doet wordt per actie gevraagd via de naam-popup. Oude anonieme
      // (gast-)sessies tellen niet: die mogen niet schrijven van de database.
      if (!session || session.user.is_anonymous) { setUser(null); return; }
      setUser({ name: "", role: "", canEdit: true });
    };
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => applySession(session));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [live]);

  // ---------- Supabase: gedeelde laag laden + live meekijken ----------
  const loadShared = async () => {
    if (!live) { setLoaded(true); return; }
    const [ov, cu, en, pk, di, ba, hi, fp, dh, ct, cl, tn, hc, hr, wd, vs, cs, ass, bda, cit] = await Promise.all([
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
      supabase.from("cleaning_logs").select("*").order("done_date", { ascending: false }).range(0, 4999),
      supabase.from("technique_notes").select("*"),
      supabase.from("haccp_logs").select("*").order("check_date", { ascending: false }),
      supabase.from("haccp_records").select("*").order("record_date", { ascending: false }),
      supabase.from("werkwijze_docs").select("*"),
      supabase.from("voorraad").select("*"),
      supabase.from("app_settings").select("*").in("key", ["recipe_categories", "calc_negeer", "calc_spelling", "calc_alias"]),
      supabase.from("assortiment").select("*"),
      supabase.from("bd_artikelen").select("*"),
      supabase.from("calculatie_items").select("*"),
    ]);
    let recs = [...initialRecipes];
    const ovMap = new Map((ov.data || []).map((r) => [r.id, r.data]));
    recs = recs.map((r) => (ovMap.has(r.id) ? { ...r, ...ovMap.get(r.id) } : r));
    recs = [...(cu.data || []).map((r) => r.data), ...recs];
    const oc = {};
    (pk.data || []).forEach((p) => { oc[p.recipe_id] = p.count || 0; });
    setOpenCounts(oc);
    const hidden = new Set((hi.data || []).map((h) => h.recipe_id));
    recs = recs.filter((r) => !hidden.has(r.id));
    recs = recs.map((r) => ({ ...r, category: normCategory(r.category), name: String(r.name || "").replace(/\s*\(basis\)\s*$/i, "") }));
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
    setCleaningLogs((cl.data || []).map((r) => ({ id: r.id, taskId: r.task_id, doneDate: String(r.done_date || "").slice(0, 10), doneBy: r.done_by, note: r.note || "", edits: Array.isArray(r.edits) ? r.edits : [] })));
    setHaccpLogs((hc.data || []).map((r) => ({ id: r.id, checkDate: String(r.check_date || "").slice(0, 10), doneBy: r.done_by, values: r.values || {}, calibration: r.calibration || {}, note: r.note || "", edits: Array.isArray(r.edits) ? r.edits : [] })));
    setHaccpRecords((hr.data || []).map((r) => ({ id: r.id, kind: r.kind, date: String(r.record_date || "").slice(0, 10), by: r.done_by, note: r.note || "", ...(r.data || {}) })));
    setWerkDocs((wd.data || []).map((r) => ({ id: r.id, title: r.title, intro: r.intro || "", sections: Array.isArray(r.sections) ? r.sections : [], updatedBy: r.updated_by || "" })));
    setStock((vs.data || []).map((r) => ({ id: r.id, product: r.product, qty: r.qty === null ? 0 : Number(r.qty), initialQty: r.initial_qty === null ? 0 : Number(r.initial_qty), unit: r.unit || "", ingredients: Array.isArray(r.ingredients) ? r.ingredients : [], productionDate: String(r.production_date || "").slice(0, 10), expiryDate: String(r.expiry_date || "").slice(0, 10), by: r.made_by || "", recipeId: r.recipe_id || null, storage: r.storage || "" })));
    // Gedeelde categorielijst; ontbreekt de tabel of rij nog, dan blijft de lokale cache gelden.
    const csRow = (cs && cs.data && cs.data.find((r) => r.key === "recipe_categories")) || null;
    const negRow = (cs && cs.data && cs.data.find((r) => r.key === "calc_negeer")) || null;
    if (negRow && negRow.value && Array.isArray(negRow.value.namen)) setNegeerIng(negRow.value.namen);
    const spRow = (cs && cs.data && cs.data.find((r) => r.key === "calc_spelling")) || null;
    if (spRow && spRow.value && Array.isArray(spRow.value.namen)) setSpellingUit(spRow.value.namen);
    const alRow = (cs && cs.data && cs.data.find((r) => r.key === "calc_alias")) || null;
    if (alRow && alRow.value && alRow.value.paren) setNaamAlias(alRow.value.paren);
    if (csRow && csRow.value) setCatSettings({ eigen: Array.isArray(csRow.value.eigen) ? csRow.value.eigen : [], verborgen: Array.isArray(csRow.value.verborgen) ? csRow.value.verborgen : [] });
    if (ass && ass.data) setAssortiment(ass.data.map((r) => ({ ...(r.data || {}), id: r.id })));
    if (cit && cit.data) setCalcItems(cit.data.map((r) => ({ ...(r.data || {}), id: r.id })));
    if (bda && bda.data) setBdArtikelen(pasOverlayToe(bda.data.map((r) => ({
      code: r.code, omschrijving: r.omschrijving || "", inhoud: r.inhoud || "",
      prijs: r.prijs === null || r.prijs === undefined ? null : Number(r.prijs),
      ppe: r.ppe === null || r.ppe === undefined ? null : Number(r.ppe),
      leverancier: r.leverancier || "", categorie: r.categorie || "", opmerking: r.opmerking || "",
    }))));
    const tnMap = { ...TECH_NOTES_SEED };
    (tn.data || []).forEach((r) => { if (Array.isArray(r.lines) && r.lines.length) tnMap[r.key] = r.lines; });
    setTechNotes(tnMap);
    setLoaded(true);
    const dbDishes = (di.data || []).map((d) => ({
      id: d.id, name: d.name, course: d.course, description: d.description, plating: d.plating,
      recipeIds: d.recipe_ids || [], season: d.season || [], diet: d.diet || "Vegetarisch",
      portions: d.portions == null ? null : Number(d.portions), voorbeeld: !!d.voorbeeld,
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
      saltPct: b.salt_pct === null ? null : Number(b.salt_pct), tempC: b.temp_c === null ? null : Number(b.temp_c), amount: b.amount,
      pH: b.ph === null ? null : Number(b.ph), sugarPct: b.sugar_pct === null || b.sugar_pct === undefined ? null : Number(b.sugar_pct), notes: b.notes || "", done: !!b.done, by: b.by || "—",
      finishedDate: String(b.finished_date || "").slice(0, 10) || null, log: Array.isArray(b.log) ? b.log : [], actionsDone: Array.isArray(b.actions_done) ? b.actions_done : [],
      recipeId: b.recipe_id || null, method: b.method || b.type || null,
    })));
  };
  useEffect(() => {
    if (!live || !user) return;
    loadShared();
    // Realtime-events bundelen: tekent een collega bv. de hele schoonmaakdag af,
    // dan komen er tientallen events vlak achter elkaar binnen. Eén volledige
    // herlaad per event zette de app seconden op slot (nergens op kunnen klikken);
    // nu wachten we tot de burst stil is en herladen we één keer.
    let t = null;
    const kick = () => { if (t) clearTimeout(t); t = setTimeout(() => { t = null; loadShared(); }, 800); };
    const ch = supabase.channel("gedeeld")
      .on("postgres_changes", { event: "*", schema: "public" }, kick)
      .subscribe();
    return () => { if (t) clearTimeout(t); supabase.removeChannel(ch); };
  }, [live, !!user]);

  const current = stack[stack.length - 1];
  // Zelfherstel voor de "invoervelden reageren niet meer"-bug: Chrome kan na het
  // sluiten/herrenderen rond een geopende native dropdown blijven hangen in een
  // toestand waarin geen enkel veld nog focus krijgt (knoppen werken dan nog wel).
  // Detectie: na een klik op een veld hoort dat veld even later de focus te
  // hebben; zo niet, dan maken we de vastzittende focus los en focussen opnieuw.
  useEffect(() => {
    const fix = (e) => {
      const el = e.target && e.target.closest ? e.target.closest("input, select, textarea") : null;
      if (!el || el.disabled) return;
      const onderdrukt = e.defaultPrevented; // iemand blokkeerde de focus-actie van deze klik?
      setTimeout(() => {
        if (document.activeElement === el) return; // focus kwam gewoon aan
        try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (err) {}
        try { el.focus(); } catch (err) {}
        // Tweede controle: hielp het geforceerde focussen ook niet, dan hebben we
        // een echte blokkade te pakken — print alles wat nodig is om hem te vinden.
        setTimeout(() => {
          if (document.activeElement === el) return;
          try {
            console.warn("RITME veld-blokkade:", {
              veld: (el.tagName || "?") + " · " + (el.placeholder || el.type || ""),
              veldNogInPagina: el.isConnected,
              mousedownOnderdrukt: onderdrukt,
              focusStaatOp: document.activeElement ? document.activeElement.tagName + "." + (document.activeElement.className || "").split(" ").slice(0, 3).join(".") : "niets",
              popupOpen: !!document.querySelector(".fixed.inset-0"),
            });
          } catch (err) {}
        }, 80);
      }, 80);
    };
    document.addEventListener("mousedown", fix, true);
    return () => document.removeEventListener("mousedown", fix, true);
  }, []);
  // Diagnose voor de "niets aanklikbaar"-bug: typ in de browserconsole (F12)
  // __ritmeDebug() zodra het gebeurt. Toont alle popup-standen én welk element
  // er in het midden van het scherm bovenop ligt — dat wijst de dader aan.
  useEffect(() => {
    window.__ritmeDebug = () => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      const info = {
        versie: RITME_VERSIE,
        scherm: current ? current.screen : "lijst", sectie: section, geladen: loaded,
        popups: { schoonmaak: checkOpen, schoonmaakBanner: checkBanner, metingen: measureOpen, metingVoor: measureFor, rekenmachine: calcOpen },
        bovensteElement: el ? el.outerHTML.slice(0, 220) : "geen",
        paginavullendeLagen: [...document.querySelectorAll("div")].filter((d) => { const st = getComputedStyle(d); return st.position === "fixed" && d.offsetWidth >= window.innerWidth * 0.9 && d.offsetHeight >= window.innerHeight * 0.9; }).map((d) => (d.className || "?") + " · z" + getComputedStyle(d).zIndex).slice(0, 8),
        focusOp: document.activeElement ? document.activeElement.tagName + " · " + String(document.activeElement.outerHTML || "").slice(0, 160) : "geen",
        stackDiepte: stack.length,
      };
      console.log("RITME DEBUG:", JSON.stringify(info, null, 2));
      return info;
    };
    return () => { delete window.__ritmeDebug; };
  });
  const push = (s) => { setStack((st) => [...st, s]); try { window.history.pushState({ app: "ritme" }, ""); } catch (e) {} };
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const resetTo = (s) => setStack([s]);
  // Vervangt het bovenste scherm zonder history.back() (dat is asynchroon en
  // botst met een directe push — zie eindmeting-flow).
  const replaceTop = (sNew) => setStack((st) => [...st.slice(0, -1), sNew]);
  const goBack = () => { if (stack.length > 1) { try { window.history.back(); } catch (e) { back(); } } };
  const goHome = () => { resetTo({ screen: "list" }); setSection("home"); };
  // Elke schermwissel (formulier, detail, terug) begint bovenaan de pagina.
  useEffect(() => { try { window.scrollTo(0, 0); } catch (e) {} }, [current, section]);
  // Op formulieren geen navigatiebalk: één tik zou anders je invoer weggooien.
  const FORM_SCREENS = new Set(["recipeForm", "dishForm", "batchForm", "voorraadForm", "werkDocForm", "fermentGuideForm", "techTableForm", "haccpForm", "haccpRecordForm", "noteForm", "batchEindmeting"]);
  const calcOpenRef = React.useRef(false);
  useEffect(() => { calcOpenRef.current = calcOpen; }, [calcOpen]);
  const [fabLabelOpen, setFabLabelOpen] = useState(false); // vrij etiket via de zwevende etiket-knop
  // (declaratie stáát bewust vóór het effect hieronder: de dependency-array
  // wordt al tijdens het renderen gelezen — andersom crasht de app bij het opstarten)
  const fabLabelRef = React.useRef(false);
  useEffect(() => { fabLabelRef.current = fabLabelOpen; }, [fabLabelOpen]);
  useEffect(() => {
    const onPop = () => {
      if (calcOpenRef.current) { setCalcOpen(false); try { window.history.pushState({ app: "ritme" }, ""); } catch (e) {} return; }
      if (fabLabelRef.current) { setFabLabelOpen(false); try { window.history.pushState({ app: "ritme" }, ""); } catch (e) {} return; }
      setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // Escape sluit eerst de rekenmachine.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { if (calcOpenRef.current) { e.preventDefault(); setCalcOpen(false); } else if (fabLabelRef.current) { e.preventDefault(); setFabLabelOpen(false); } } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const openCalc = () => { setCalcOpen(true); try { window.history.pushState({ app: "ritme", calc: true }, ""); } catch (e) {} };
  const closeCalc = () => { setCalcOpen(false); };
  const recipeById = (id) => recipes.find((r) => r.id === id);
  // Recepten die naar elkaar verwijzen (kruidenrub in buikspek) rekenen door.
  React.useMemo(() => zetRecepten(recipes), [recipes]);
  React.useMemo(() => zetItems(calcItems), [calcItems]);
  React.useMemo(() => zetNamen(recipes, spellingUit, naamAlias), [recipes, spellingUit, naamAlias]);
  const dishById = (id) => dishes.find((d) => d.id === id);
  const usageCount = (id) => dishes.filter((d) => d.recipeIds.includes(id)).length;
  const variationsOf = (id) => recipes.filter((r) => r.baseId === id);
  const flash = (msg, undo) => {
    const t = { msg, undo, at: Date.now() };
    setToast(t);
    setTimeout(() => setToast((cur) => (cur && cur.at === t.at ? null : cur)), undo ? 7000 : 2200);
  };
  const canEdit = !!user && user.canEdit;
  // ---------- Naam-popup: wie doet dit? ----------
  // Vervangt de accounts: elke vastlegging vraagt één tik "wie doet dit".
  // Snelle acties (schoonmaak aftekenen, metingen, afvinken) onthouden de keuze
  // 10 minuten — maar alléén binnen dezelfde soort actie: zodra er iets anders
  // tussendoor wordt vastgelegd (ander soort actie = mogelijk andere persoon),
  // vraagt de eerstvolgende snelle actie gewoon opnieuw.
  const [namePrompt, setNamePrompt] = useState(null); // { resolve, cat, label }
  const quickNameRef = React.useRef({ name: null, cat: null, at: 0 });
  const NAME_QUICK_MS = 10 * 60000;
  const askName = (cat, label) => new Promise((resolve) => {
    const q = quickNameRef.current;
    if (cat !== "groot" && q.name && q.cat === cat && Date.now() - q.at < NAME_QUICK_MS) {
      q.at = Date.now(); // venster schuift mee zolang dezelfde soort actie doorloopt
      resolve(q.name);
      return;
    }
    setNamePrompt({ resolve, cat, label });
  });
  const answerName = (naam) => {
    const p = namePrompt;
    if (!p) return;
    setNamePrompt(null);
    if (!naam) { p.resolve(null); return; } // geannuleerd (misklik) — actie breekt af
    quickNameRef.current = { name: naam, cat: p.cat, at: Date.now() };
    try { localStorage.setItem("ritme:last-name", naam); } catch (e) {}
    p.resolve(naam);
  };

  const dbFail = (error) => { if (error) flash("Opslaan lukte niet — probeer opnieuw"); return !!error; };

  // Gemiste (vrije) dagen automatisch registreren zodra de data er is.
  useEffect(() => { if (loaded && user && user.canEdit) { backfillDaysOff(); pruneOldRecords(); } }, [loaded, user]);

  // Melding bij inloggen (alleen koks): batches die klaar zijn of een handeling vragen.
  const [noticeShown, setNoticeShown] = useState(false);
  useEffect(() => {
    if (!user || !user.canEdit || !loaded || noticeShown) return;
    const { ready, items } = collectNotices(batches);
    const n = ready.length + items.length;
    const exp = stock.filter((v) => v.qty > 0 && v.expiryDate && daysUntil(v.expiryDate) !== null && daysUntil(v.expiryDate) <= 7).length;
    setNoticeShown(true); // hoe dan ook maar één keer per sessie proberen
    const parts = [];
    if (n > 0) parts.push(n === 1 ? "1 batch vraagt aandacht" : n + " batches vragen aandacht");
    if (exp > 0) parts.push(exp === 1 ? "1 voorraadproduct nadert de houdbaarheidsdatum" : exp + " voorraadproducten naderen de houdbaarheidsdatum");
    if (parts.length) flash(parts.join(" · "));
  }, [user, loaded, batches, stock, noticeShown]);
  const [stockNoticeClosed, setStockNoticeClosed] = useState(null); // per dag te sluiten
  const [checkForDate, setCheckForDate] = useState(null); // heropende dag die opnieuw ingevuld wordt
  const [measureOpen, setMeasureOpen] = useState(false);
  const [measureFor, setMeasureFor] = useState(null); // meting-popup voor één batch (vanuit de aandacht-banner)
  const [batchLabelFor, setBatchLabelFor] = useState(null); // etiket-popup na het registreren van een batch
  // ---------- HACCP-kookbewaking ----------
  // Staat een recept dat gegaard wordt ≥ 2 minuten open, dan start een "kook-
  // sessie" op dit apparaat: eerst een banner voor de garingscontrole, en op
  // 3 en 5 uur na de garing (of het openen) een banner voor de terugkoelcheck —
  // alleen als dat moment binnen de werkdag (07:00–17:00) valt.
  const [cookSessions, setCookSessions] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("ritme:cook-sessions") || "[]");
      return raw.filter((x) => kitchenDate(new Date(x.at)) === kitchenDate());
    } catch (e) { return []; }
  });
  useEffect(() => { try { localStorage.setItem("ritme:cook-sessions", JSON.stringify(cookSessions)); } catch (e) {} }, [cookSessions]);
  const [cookDismiss, setCookDismiss] = useState(() => {
    try { const m = JSON.parse(localStorage.getItem("ritme:cook-dismiss") || "{}"); const k = kitchenDate(); return m[k] || {}; } catch (e) { return {}; }
  });
  useEffect(() => { try { localStorage.setItem("ritme:cook-dismiss", JSON.stringify({ [kitchenDate()]: cookDismiss })); } catch (e) {} }, [cookDismiss]);
  const dismissCook = (k) => setCookDismiss((d) => ({ ...d, [k]: true }));
  const [, setCookTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setCookTick((n) => n + 1), 60000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (current.screen !== "recipeDetail") return;
    const r = recipeById(current.id);
    if (!r || !isCookedRecipe(r)) return;
    const t = setTimeout(() => {
      setCookSessions((ss) => ss.some((x) => x.id === r.id && kitchenDate(new Date(x.at)) === kitchenDate())
        ? ss
        : [...ss.filter((x) => kitchenDate(new Date(x.at)) === kitchenDate()), { id: r.id, name: r.name, at: Date.now(), garingAt: null }]);
    }, COOK_OPEN_MS);
    return () => clearTimeout(t);
  }, [current]);
  const [techFocus, setTechFocus] = useState(null); // kaart op de Werkwijze-pagina die open moet
  const openTech = (key) => { setTechFocus(key); setSection("technieken"); resetTo({ screen: "list" }); };

  const saveRecipe = async (data, editingId) => {
    const naam = await askName("groot", "Recept opslaan");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const stamped = { ...data, updatedBy: naam, updatedAt: "zojuist" };
    if (editingId) {
      const existing = recipes.find((r) => r.id === editingId);
      const merged = { ...existing, ...stamped };
      if (live) {
        const table = existing && existing.custom ? "recipes_custom" : "recipe_overrides";
        const { error } = await supabase.from(table).upsert({ id: editingId, data: merged, updated_by: naam, updated_at: new Date().toISOString() });
        if (dbFail(error)) return;
      }
      setRecipes((rs) => rs.map((r) => (r.id === editingId ? merged : r)));
    } else {
      const rec = { ...stamped, id: "r" + Date.now(), endorsements: [], chefsPick: false, baseId: stamped.baseId || null, isBase: false,
        season: stamped.season && stamped.season.length ? stamped.season : ["Hele jaar"], garden: false,
        diet: stamped.diet || "Vegetarisch", ferment: !!stamped.ferment,
        fermentMethod: stamped.ferment ? (stamped.fermentMethod || "Melkzuur") : null,
        fermentDefaults: stamped.ferment ? (stamped.fermentDefaults || null) : null, custom: true };
      if (live) {
        const { error } = await supabase.from("recipes_custom").upsert({ id: rec.id, data: rec, updated_by: naam, updated_at: new Date().toISOString() });
        if (dbFail(error)) return;
      }
      setRecipes((rs) => [rec, ...rs]);
      flash(live ? "Opgeslagen — zichtbaar voor het hele team" : "Opgeslagen (demo: alleen op dit apparaat)");
      return rec.id;
    }
    flash(live ? "Opgeslagen — zichtbaar voor het hele team" : "Opgeslagen (demo: alleen op dit apparaat)");
  };
  const saveDish = async (data, editingId) => {
    const naam = await askName("groot", "Gerecht opslaan");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const stamped = { ...data, updatedBy: naam, updatedAt: "zojuist" };
    const id = editingId || "d" + Date.now();
    if (live) {
      const { error } = await supabase.from("dishes").upsert({
        id, name: stamped.name, course: stamped.course, description: stamped.description,
        plating: stamped.plating, recipe_ids: stamped.recipeIds, season: stamped.season,
        diet: stamped.diet, portions: stamped.portions == null ? null : stamped.portions, voorbeeld: !!stamped.voorbeeld,
        updated_by: naam, updated_at: new Date().toISOString(),
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
      salt_pct: b.saltPct, temp_c: b.tempC, amount: b.amount, ph: b.pH, sugar_pct: b.sugarPct ?? null, notes: b.notes,
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
    const naam = await askName("groot", "Batch registreren");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const b = { ...data, id: "b" + Date.now(), by: naam, finishedDate: null, log: data.log || [] };
    if (!(await persistBatch(b))) return;
    setBatches((bs) => [b, ...bs]);
    flash("Batch geregistreerd");
    setBatchLabelFor(b); // etiket-popup: direct een vat-/potetiket kunnen printen
  };
  const addBatchMeasurement = async (id, m) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const nm = (x) => { const v = String(x ?? "").replace(",", ".").trim(); return v === "" || isNaN(Number(v)) ? null : Number(v); };
    const naam = await askName("metingen", "Meting vastleggen");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const entry = { date: m.date, ph: nm(m.ph), brix: nm(m.brix), tempC: nm(m.tempC), note: m.note || "", by: naam };
    // Wie meet, is er ook bij: de nog openstaande handeling(en) van vandaag
    // voor deze batch worden automatisch mee afgevinkt onder dezelfde naam.
    const today = kitchenDate();
    const nogTeDoen = batchStatus(b).due;
    const extraAcks = nogTeDoen.map((label) => ({ date: today, label, by: naam }));
    const nb = { ...b, log: [...(b.log || []), entry], pH: entry.ph ?? b.pH,
      actionsDone: [...(b.actionsDone || []).filter((a) => a.date >= today), ...(b.actionsDone || []).filter((a) => a.date === today), ...extraAcks].filter((a, i, arr) => arr.findIndex((x) => x.date === a.date && x.label === a.label) === i) };
    if (!(await persistBatch(nb))) return;
    setBatches((bs) => bs.map((x) => (x.id === id ? nb : x)));
    flash(extraAcks.length ? "Meting toegevoegd — handeling ook afgevinkt (" + naam + ")" : "Meting toegevoegd aan het logboek");
  };
  // Vanuit de meting-popup: meting opslaan, batch in één keer afronden en door
  // naar de voorraad-popup (de gewone eindmeting is dan al gedaan).
  const saveMeasureAndFinish = async (id, m) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const nm = (x) => { const v = String(x ?? "").replace(",", ".").trim(); return v === "" || isNaN(Number(v)) ? null : Number(v); };
    const naam = await askName("groot", "Batch afronden");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const entry = { date: m.date, ph: nm(m.ph), brix: nm(m.brix), tempC: nm(m.tempC), note: m.note || "", by: naam };
    const nb = { ...b, log: [...(b.log || []), entry], pH: entry.ph ?? b.pH, done: true, finishedDate: localDate() };
    if (!(await persistBatch(nb))) return;
    setBatches((bs) => bs.map((x) => (x.id === id ? nb : x)));
    setMeasureFor(null); setMeasureOpen(false);
    flash("Meting opgeslagen · batch afgerond");
    push({ screen: "voorraadForm", editing: null, prefill: stockPrefillForBatch(nb) });
  };
  const deleteBatchMeasurement = async (id, idx) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const nb = { ...b, log: (b.log || []).filter((_, i) => i !== idx) };
    if (!(await persistBatch(nb))) return;
    setBatches((bs) => bs.map((x) => (x.id === id ? nb : x)));
  };
  const extendBatch = async (id) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const nb = { ...b, days: (Number(b.days) || 0) + 1 };
    if (!(await persistBatch(nb))) return;
    setBatches((bs) => bs.map((x) => (x.id === id ? nb : x)));
    flash("Verlengd naar " + nb.days + " dagen");
  };
  const toggleBatchDone = async (id) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const nb = { ...b, done: !b.done, finishedDate: !b.done ? localDate() : null };
    if (!(await persistBatch(nb))) return;
    setBatches((bs) => bs.map((x) => (x.id === id ? nb : x)));
    if (nb.done) push({ screen: "batchEindmeting", id: nb.id });
  };
  // Na de eindmeting (of het overslaan ervan): door naar toevoegen aan de voorraad.
  const stockPrefillForBatch = (b) => {
    const rec = b.recipeId ? recipeById(b.recipeId) : null;
    return {
      product: b.product,
      ingredients: rec && Array.isArray(rec.ingredients) ? rec.ingredients : [],
      recipeId: b.recipeId || null,
      unit: (rec && rec.yieldUnit) || (b.amount && b.amount !== "—" ? b.amount : ""),
      productionDate: localDate(),
      shelfDays: rec && rec.shelfDays ? rec.shelfDays : null,
      yieldAmount: rec && rec.yieldAmount ? rec.yieldAmount : null,
      yieldUnit: (rec && rec.yieldUnit) || "",
      yieldText: (rec && rec.yield) || "",
    };
  };
  const finishEindmeting = (batchId, m) => {
    if (m) addBatchMeasurement(batchId, { ...m, note: m.note ? "Eindmeting — " + m.note : "Eindmeting" });
    const b = batches.find((x) => x.id === batchId);
    replaceTop({ screen: "voorraadForm", editing: null, prefill: b ? stockPrefillForBatch(b) : null });
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
    const today = kitchenDate(); // geldt tot 02:00, daarna nieuwe keukendag
    if ((b.actionsDone || []).some((a) => a.date === today && a.label === label)) return;
    const naam = await askName("afvinken", "Handeling afvinken");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const nb = { ...b, actionsDone: [...(b.actionsDone || []).filter((a) => a.date >= today), { date: today, label, by: naam }] };
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
  const signCleaning = async (taskId, quiet, forDate) => {
    const today = forDate || localDate();
    const naam = await askName("schoonmaak", "Schoonmaak aftekenen");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const row = { id: "cl" + Date.now(), taskId, doneDate: today, doneBy: naam, note: "", edits: [] };
    if (live) {
      const { error } = await supabase.from("cleaning_logs").insert({ id: row.id, task_id: taskId, done_date: today, done_by: naam, note: "", edits: [] });
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => [row, ...ls]);
    if (!quiet) flash("Afgetekend door " + naam, () => removeCleaningLog(row.id, true));
    return row.id;
  };
  const markDayDone = async (forDate) => {
    const today = forDate || localDate();
    if (cleaningLogs.some((l) => l.taskId === DAY_DONE_ID && l.doneDate === today)) return;
    const naam = await askName("schoonmaak", "Dag afronden");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const row = { id: "dd" + Date.now(), taskId: DAY_DONE_ID, doneDate: today, doneBy: naam, note: "", edits: [] };
    if (live) {
      const { error } = await supabase.from("cleaning_logs").insert({ id: row.id, task_id: DAY_DONE_ID, done_date: today, done_by: naam, note: "", edits: [] });
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => [row, ...ls]);
    setCheckOpen(false);
    setCheckBanner(false);
    setCheckForDate(null);
    setCheckDone({ key: localDate(), stage: 2 }); // herinnering vandaag niet meer tonen
    flash("Dag afgerond", () => removeCleaningLog(row.id, true));
  };
  const undoDayDone = async () => {
    const today = localDate();
    const l = cleaningLogs.find((x) => x.taskId === DAY_DONE_ID && x.doneDate === today);
    if (!l) return;
    await removeCleaningLog(l.id, true);
    flash("Dag heropend");
  };
  // Een dag handmatig als vrije dag (bedrijf dicht) registreren of terugdraaien.
  const markDayOff = async (dateStr) => {
    const d = dateStr || localDate();
    if (cleaningLogs.some((l) => l.taskId === DAY_OFF_ID && l.doneDate === d)) return;
    // Een vrije dag heeft geen aftekeningen: bestaande registraties van deze dag
    // worden verwijderd (verkeerde invulling), inclusief een eerdere dag-afronding.
    const existing = cleaningLogs.filter((l) => l.doneDate === d);
    if (existing.length && !window.confirm("Vrije dag: " + existing.length + " registratie" + (existing.length === 1 ? "" : "s") + " van deze dag " + (existing.length === 1 ? "wordt" : "worden") + " verwijderd. Doorgaan?")) return;
    if (live && existing.length) {
      const { error } = await supabase.from("cleaning_logs").delete().eq("done_date", d);
      if (dbFail(error)) return;
    }
    const naam = await askName("schoonmaak", "Vrije dag registreren");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const row = { id: "off" + Date.now(), taskId: DAY_OFF_ID, doneDate: d, doneBy: naam, note: "Bedrijf dicht", edits: [] };
    if (live) {
      const { error } = await supabase.from("cleaning_logs").insert({ id: row.id, task_id: DAY_OFF_ID, done_date: d, done_by: naam, note: "Bedrijf dicht", edits: [] });
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => [row, ...ls.filter((l) => l.doneDate !== d)]);
    if (d === localDate()) { setCheckDone({ key: d, stage: 2 }); }
    setCheckOpen(false); setCheckBanner(false); setCheckForDate(null);
    flash("Geregistreerd als vrije dag");
  };
  // Bij het openen automatisch de gemiste dagen als "vrije dag" vastleggen:
  // elke dag tussen de laatste registratie en gisteren waarop niets is gelogd.
  // Verwijder afgeronde/verlopen registraties ouder dan één jaar (houdt de lijsten kort).
  const pruneOldRecords = async () => {
    if (!user || !user.canEdit) return;
    const cutoff = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return localDate(d); })();
    // 1) afgeronde fermentatiebatches met een afrondingsdatum ouder dan 1 jaar
    const oldBatches = batches.filter((b) => b.done && b.finishedDate && b.finishedDate < cutoff);
    // 2) schoonmaaklogregels (incl. dag-afgerond en vrije dagen) ouder dan 1 jaar
    const oldClean = cleaningLogs.filter((l) => l.doneDate < cutoff);
    // 3) HACCP temperatuur- en registratielogs ouder dan 1 jaar
    const oldTemp = haccpLogs.filter((l) => l.checkDate < cutoff);
    const oldRec = haccpRecords.filter((r) => r.date < cutoff);
    if (oldBatches.length + oldClean.length + oldTemp.length + oldRec.length === 0) return;
    if (live) {
      try {
        if (oldBatches.length) await supabase.from("batches").delete().in("id", oldBatches.map((b) => b.id));
        if (oldClean.length) await supabase.from("cleaning_logs").delete().in("id", oldClean.map((l) => l.id));
        if (oldTemp.length) await supabase.from("haccp_logs").delete().in("id", oldTemp.map((l) => l.id));
        if (oldRec.length) await supabase.from("haccp_records").delete().in("id", oldRec.map((r) => r.id));
      } catch (e) { return; } // stil falen; volgende keer opnieuw
    }
    if (oldBatches.length) setBatches((bs) => bs.filter((b) => !oldBatches.some((o) => o.id === b.id)));
    if (oldClean.length) setCleaningLogs((ls) => ls.filter((l) => !oldClean.some((o) => o.id === l.id)));
    if (oldTemp.length) setHaccpLogs((ls) => ls.filter((l) => !oldTemp.some((o) => o.id === l.id)));
    if (oldRec.length) setHaccpRecords((rs) => rs.filter((r) => !oldRec.some((o) => o.id === r.id)));
  };
  const backfillDaysOff = async () => {
    if (!user || !user.canEdit) return;
    const marked = new Set(cleaningLogs.filter((l) => l.taskId === DAY_DONE_ID || l.taskId === DAY_OFF_ID).map((l) => l.doneDate));
    const worked = new Set(cleaningLogs.filter((l) => l.taskId !== DAY_DONE_ID && l.taskId !== DAY_OFF_ID).map((l) => l.doneDate));
    // vroegste datum waar we vanaf kijken: eerste log, anders niets te doen
    const dates = cleaningLogs.map((l) => l.doneDate).sort();
    if (dates.length === 0) return;
    const start = new Date(dates[0] + "T12:00:00");
    const today = new Date(localDate() + "T12:00:00");
    // Vóór 02:00 's nachts telt "gisteren" nog niet mee: de dag krijgt tot dan
    // de kans om alsnog afgerond te worden.
    if (new Date().getHours() < AUTO_OFF_HOUR) today.setDate(today.getDate() - 1);
    const toAdd = [];
    for (let d = new Date(start); d < today; d.setDate(d.getDate() + 1)) {
      const key = localDate(d);
      if (marked.has(key) || worked.has(key)) continue; // al afgerond, al vrij, of er is gewerkt
      toAdd.push(key);
    }
    if (toAdd.length === 0) return;
    const rows = toAdd.map((d, i) => ({ id: "off" + Date.now() + i, taskId: DAY_OFF_ID, doneDate: d, doneBy: "automatisch", note: "Bedrijf dicht (automatisch)", edits: [] }));
    if (live) {
      const { error } = await supabase.from("cleaning_logs").insert(rows.map((r) => ({ id: r.id, task_id: DAY_OFF_ID, done_date: r.doneDate, done_by: r.doneBy, note: r.note, edits: [] })));
      if (error) return; // stil falen; volgende keer opnieuw
    }
    setCleaningLogs((ls) => [...rows, ...ls]);
  };
  const saveHaccp = async (data, editingId) => {
    const naam = await askName("groot", "HACCP-controle vastleggen");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    if (editingId) {
      const old = haccpLogs.find((x) => x.id === editingId);
      const nl = { ...old, ...data, edits: [...((old && old.edits) || []), { at: now, by: naam }] };
      if (live) {
        const { error } = await supabase.from("haccp_logs").update({ check_date: nl.checkDate, values: nl.values, calibration: nl.calibration, note: nl.note, edits: nl.edits }).eq("id", editingId);
        if (dbFail(error)) return;
      }
      setHaccpLogs((ls) => ls.map((x) => (x.id === editingId ? nl : x)));
      flash("Meting bijgewerkt");
      return;
    }
    const row = { id: "hp" + Date.now(), checkDate: data.checkDate, doneBy: naam, values: data.values, calibration: data.calibration, note: data.note, edits: [] };
    if (live) {
      const { error } = await supabase.from("haccp_logs").insert({ id: row.id, check_date: row.checkDate, done_by: naam, values: row.values, calibration: row.calibration, note: row.note, edits: [] });
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
  const saveHaccpRecord = async (data, editingId) => {
    const naam = await askName("groot", "Registratie vastleggen");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const { kind, date, note, ...fields } = data;
    if (editingId) {
      const old = haccpRecords.find((x) => x.id === editingId);
      const nr = { ...old, kind, date, note, ...fields };
      if (live) {
        const { error } = await supabase.from("haccp_records").update({ kind, record_date: date, done_by: nr.by, note, data: fields }).eq("id", editingId);
        if (dbFail(error)) return;
      }
      setHaccpRecords((rs) => rs.map((x) => (x.id === editingId ? nr : x)));
      flash("Registratie bijgewerkt");
      return;
    }
    const row = { id: "hr" + Date.now(), kind, date, by: naam, note, ...fields };
    // Kookbewaking bijwerken: een garingsregistratie start de 3/5-uurs terug-
    // koeltimers voor de bijbehorende sessie; een terugkoelregistratie sluit hem.
    if (kind === "bereiding") setCookSessions((ss) => ss.map((x) => !x.garingAt && naamMatch(row.gerecht, x.name) ? { ...x, garingAt: Date.now() } : x));
    if (kind === "terugkoelen") setCookSessions((ss) => ss.filter((x) => !naamMatch(row.product, x.name)));
    if (live) {
      const { error } = await supabase.from("haccp_records").insert({ id: row.id, kind, record_date: date, done_by: naam, note, data: fields });
      if (dbFail(error)) return;
    }
    setHaccpRecords((rs) => [row, ...rs]);
    const clId = await signCleaning(HACCP_KIND_TASK[kind], true); // taak deze week aftekenen
    flash("Geregistreerd", () => { removeHaccpRecord(row.id, true); if (clId) removeCleaningLog(clId, true); });
  };
  const removeHaccpRecord = async (id, quiet) => {
    if (live) {
      const { error } = await supabase.from("haccp_records").delete().eq("id", id);
      if (dbFail(error)) return;
    }
    setHaccpRecords((rs) => rs.filter((x) => x.id !== id));
    if (!quiet) flash("Registratie verwijderd");
  };
  const deleteHaccpRecord = async (id) => {
    if (!window.confirm("Deze registratie verwijderen?")) return;
    removeHaccpRecord(id);
  };
  // ---- Werkwijze-documenten: standaarden bewerken en nieuwe aanmaken ----
  const FERMENT_DOC_ID = "__ferment_guide";
  // App-brede allergenencorrecties: opgeslagen als speciaal werkwijze-document
  // (sleutel met __ blijft buiten de Werkwijze-pagina), dus gedeeld en realtime
  // gesynchroniseerd zonder extra databasetabel.
  const ALLERGEN_FIX_DOC_ID = "__allergen_fixes";
  const allergenFixDoc = werkDocs.find((d) => d.id === ALLERGEN_FIX_DOC_ID);
  setGlobalAllergenFixes((() => {
    const m = {};
    if (allergenFixDoc && Array.isArray(allergenFixDoc.sections)) allergenFixDoc.sections.forEach((r) => { if (r && r.name) m[algKey(r.name)] = Array.isArray(r.allergens) ? r.allergens : []; });
    return m;
  })());
  const saveAllergenFix = async (name, list) => {
    const nm = String(name || "").trim();
    if (!nm) return;
    const naam = await askName("groot", "Allergenencorrectie (hele app)");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const rows = (allergenFixDoc && Array.isArray(allergenFixDoc.sections) ? allergenFixDoc.sections : []).filter((r) => r && r.name && algKey(r.name) !== algKey(nm));
    if (Array.isArray(list)) rows.push({ name: nm, allergens: list });
    const row = { id: ALLERGEN_FIX_DOC_ID, title: "Allergenencorrecties", intro: "", sections: rows, updatedBy: naam };
    if (live) {
      const { error } = await supabase.from("werkwijze_docs").upsert({ id: row.id, title: row.title, intro: "", sections: rows, updated_by: naam, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setWerkDocs((ds) => [...ds.filter((d) => d.id !== ALLERGEN_FIX_DOC_ID), row]);
    flash(Array.isArray(list)
      ? "App-brede correctie opgeslagen — geldt overal waar \"" + nm + "\" als ingrediënt staat"
      : "App-brede correctie voor \"" + nm + "\" verwijderd");
  };
  const mergedWerkDocs = [
    ...CATERING_STANDARDS.map((seed) => {
      const o = werkDocs.find((d) => d.id === seed.key);
      return o ? { key: seed.key, title: o.title, intro: o.intro, secties: o.sections, custom: false } : { ...seed, custom: false };
    }),
    ...werkDocs
      .filter((d) => !d.id.startsWith("__") && !CATERING_STANDARDS.some((c) => c.key === d.id))
      .map((d) => ({ key: d.id, title: d.title, intro: d.intro, secties: d.sections, custom: true })),
  ];
  const fermentRows = (() => {
    const o = werkDocs.find((d) => d.id === FERMENT_DOC_ID);
    return o && Array.isArray(o.sections) && o.sections.length ? o.sections : FERMENT_GUIDE;
  })();
  const tableRowsFor = (docId, seed) => {
    const o = werkDocs.find((d) => d.id === docId);
    return o && Array.isArray(o.sections) && o.sections.length ? o.sections : seed;
  };
  const techTableRows = {
    jam: tableRowsFor("__jam_rows", JAM_ROWS),
    ijs: tableRowsFor("__ice_rows", ICE_ROWS),
    roosteren: tableRowsFor("__roast_rows", ROAST_ROWS),
    maten: tableRowsFor("__maat_rows", MAAT_ROWS),
  };
  // De prijsmotor rekent lepels en stuks om met deze tabel.
  React.useMemo(() => zetMaten(techTableRows.maten), [werkDocs]);
  const saveTechTable = async (tableKey, rows) => {
    const naam = await askName("groot", "Tabel opslaan");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const cfg = TECH_TABLE_CONFIGS[tableKey];
    const row = { id: cfg.docId, title: cfg.title, intro: "", sections: rows, updatedBy: naam };
    if (live) {
      const { error } = await supabase.from("werkwijze_docs").upsert({ id: cfg.docId, title: cfg.title, intro: "", sections: rows, updated_by: naam, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setWerkDocs((ds) => [...ds.filter((d) => d.id !== cfg.docId), row]);
    flash("Tabel bijgewerkt");
  };
  // ---- Voorraad ----
  const persistStock = async (v, isNew) => {
    if (!live) return true;
    const row = { id: v.id, product: v.product, qty: v.qty, initial_qty: v.initialQty, unit: v.unit, ingredients: v.ingredients, production_date: v.productionDate || null, expiry_date: v.expiryDate || null, made_by: v.by, recipe_id: v.recipeId || null, storage: v.storage || "" };
    const { error } = isNew ? await supabase.from("voorraad").insert(row) : await supabase.from("voorraad").update(row).eq("id", v.id);
    return !dbFail(error);
  };
  const saveStock = async (data, editingId) => {
    if (editingId) {
      const old = stock.find((x) => x.id === editingId);
      const nv = { ...old, ...data };
      if (!(await persistStock(nv, false))) return;
      setStock((ss) => ss.map((x) => (x.id === editingId ? nv : x)));
      flash("Voorraad bijgewerkt");
      return;
    }
    const naam = await askName("groot", "Voorraad opslaan");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const nv = { id: "st" + Date.now(), ...data, by: naam };
    if (!(await persistStock(nv, true))) return;
    setStock((ss) => [nv, ...ss]);
    flash("Toegevoegd aan de voorraad");
  };
  const decStock = async (id) => {
    const v = stock.find((x) => x.id === id);
    if (!v || v.qty <= 0) return;
    const prev = v.qty;
    const nv = { ...v, qty: Math.max(0, Math.round((v.qty - 1) * 1000) / 1000) };
    if (!(await persistStock(nv, false))) return;
    setStock((ss) => ss.map((x) => (x.id === id ? nv : x)));
    flash("1 van de voorraad gehaald", async () => {
      const back = { ...nv, qty: prev };
      if (await persistStock(back, false)) setStock((ss) => ss.map((x) => (x.id === id ? back : x)));
    });
  };
  const deleteStock = async (id) => {
    const v = stock.find((x) => x.id === id);
    if (!v) return;
    if (!window.confirm('"' + v.product + '" uit de voorraad verwijderen?')) return;
    if (live) {
      const { error } = await supabase.from("voorraad").delete().eq("id", id);
      if (dbFail(error)) return;
    }
    setStock((ss) => ss.filter((x) => x.id !== id));
    flash("Uit de voorraad verwijderd");
  };
  // Excel-export: toont de ooit gemaakte hoeveelheid (niet de huidige stand).
  const exportStockExcel = (year) => {
    const jaar = year || Number(localDate().slice(0, 4));
    const items = stock.filter((v) => stockYear(v) === jaar);
    if (!items.length) { flash("Geen voorraad gevonden voor " + jaar); return; }
    const esc = (x) => { const v = String(x ?? ""); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const dagen = (v) => {
      if (!v.productionDate || !v.expiryDate) return "";
      const d = Math.round((new Date(v.expiryDate + "T12:00:00") - new Date(v.productionDate + "T12:00:00")) / 86400000);
      return isNaN(d) ? "" : String(d);
    };
    const MAANDEN = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
    const rows = [["Product", "Gemaakt in " + jaar, "Verpakkingseenheid", "Productiedatum", "Houdbaar tot", "Dagen houdbaar", "Opslaglocatie", "Ingevoerd door", "Totaal stuks", "Totaal gewicht (g)"]];
    const unitSize = unitSizeG; // gedeelde gram-parser, zelfde als het meeschalen van ingrediënten
    const num = (x) => { const n = Number(String(x ?? "").replace(",", ".")); return isNaN(n) ? 0 : n; };
    const fmtN = (n) => String(Math.round(n * 100) / 100).replace(".", ",");
    // Gegroepeerd per productiemaand, chronologisch; zonder datum achteraan.
    const maandVan = (v) => { const m = Number(String(v.productionDate || "").slice(5, 7)); return m >= 1 && m <= 12 ? m : 13; };
    const maanden = [...new Set(items.map(maandVan))].sort((a, b) => a - b);
    maanden.forEach((m) => {
      rows.push([]);
      rows.push([m === 13 ? "ZONDER PRODUCTIEDATUM" : MAANDEN[m - 1].toUpperCase() + " " + jaar]);
      // Per product bij elkaar (dan op datum); het producttotaal (stuks en gewicht
      // in gram) staat in de achterste kolommen op de eerste regel van dat product.
      const lijst = items
        .filter((v) => maandVan(v) === m)
        .sort((a, b) => a.product.localeCompare(b.product, "nl") || ((a.productionDate || "") < (b.productionDate || "") ? -1 : (a.productionDate || "") > (b.productionDate || "") ? 1 : 0));
      let mStuks = 0, mG = 0;
      let i = 0;
      while (i < lijst.length) {
        const prod = lijst[i].product;
        const groep = [];
        while (i < lijst.length && lijst[i].product === prod) { groep.push(lijst[i]); i++; }
        let pStuks = 0, pG = 0;
        groep.forEach((v) => { const q = num(v.initialQty); const g = unitSize(v.unit); pStuks += q; if (g != null) pG += q * g; });
        groep.forEach((v, j) => {
          rows.push([v.product, String(v.initialQty).replace(".", ","), v.unit, v.productionDate ? fmtDMY(v.productionDate) : "", v.expiryDate ? fmtDMY(v.expiryDate) : "", dagen(v), v.storage || "", v.by || "", j === 0 ? fmtN(pStuks) : "", j === 0 ? fmtN(pG) : ""]);
        });
        mStuks += pStuks; mG += pG;
      }
      rows.push(["TOTAAL " + (m === 13 ? "ZONDER DATUM" : MAANDEN[m - 1].toUpperCase()), "", "", "", "", "", "", "", fmtN(mStuks), fmtN(mG)]);
    });
    const csv = "\uFEFF" + "sep=;\n" + rows.map((r) => r.map(esc).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "voorraad-" + jaar + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    flash("Voorraadlijst " + jaar + " gedownload (opent in Excel)");
  };
  const saveWerkDoc = async (data, editingId) => {
    const id = editingId || "wd" + Date.now();
    const naam = await askName("groot", "Werkwijze opslaan");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const row = { id, title: data.title, intro: data.intro, sections: data.secties, updatedBy: naam };
    if (live) {
      const { error } = await supabase.from("werkwijze_docs").upsert({ id, title: row.title, intro: row.intro, sections: row.sections, updated_by: naam, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setWerkDocs((ds) => [...ds.filter((d) => d.id !== id), row]);
    flash(editingId ? "Werkwijze bijgewerkt" : "Werkwijze-document toegevoegd");
  };
  const deleteWerkDoc = async (id) => {
    if (!window.confirm("Dit werkwijze-document verwijderen?")) return;
    if (live) {
      const { error } = await supabase.from("werkwijze_docs").delete().eq("id", id);
      if (dbFail(error)) return;
    }
    setWerkDocs((ds) => ds.filter((d) => d.id !== id));
    flash("Document verwijderd");
  };
  const saveFermentGuide = async (rows) => {
    const naam = await askName("groot", "Fermenteerlijst opslaan");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const row = { id: FERMENT_DOC_ID, title: "Fermenteren", intro: "", sections: rows, updatedBy: naam };
    if (live) {
      const { error } = await supabase.from("werkwijze_docs").upsert({ id: FERMENT_DOC_ID, title: "Fermenteren", intro: "", sections: rows, updated_by: naam, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setWerkDocs((ds) => [...ds.filter((d) => d.id !== FERMENT_DOC_ID), row]);
    flash("Fermenteerlijst bijgewerkt");
  };
  const editCleaningLog = async (logId, note) => {
    const l = cleaningLogs.find((x) => x.id === logId);
    if (!l || (l.note || "") === note) { return; }
    const naam = await askName("groot", "Notitie aanpassen");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const edit = { at: new Date().toISOString().slice(0, 16).replace("T", " "), by: naam, from: l.note || "", to: note };
    const nl = { ...l, note, edits: [...(l.edits || []), edit] };
    if (live) {
      const { error } = await supabase.from("cleaning_logs").update({ note: nl.note, edits: nl.edits }).eq("id", logId);
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => ls.map((x) => (x.id === logId ? nl : x)));
    flash("Opmerking bijgewerkt");
  };
  const saveCleaningTask = async (data, editingId) => {
    const naam = await askName("groot", "Schoonmaaktaak opslaan");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const id = editingId || "ct" + Date.now();
    const row = { id, name: data.name, area: data.area, intervalDays: data.intervalDays, minutes: data.minutes, active: true };
    if (live) {
      const { error } = await supabase.from("cleaning_tasks").upsert({ id, name: row.name, area: row.area, interval_days: row.intervalDays, minutes: row.minutes, active: true, updated_by: naam, updated_at: new Date().toISOString() });
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
      const { error } = await supabase.from("cleaning_tasks").upsert({ id, name: t.name, area: t.area, interval_days: t.intervalDays, minutes: t.minutes, active: false, updated_by: "—", updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setCleaningTasks((ts) => ts.filter((x) => x.id !== id));
    flash("Taak verwijderd", () => saveCleaningTask({ name: t.name, area: t.area, intervalDays: t.intervalDays, minutes: t.minutes }, id));
  };
  const saveTechNotes = async (key, lines) => {
    const naam = await askName("groot", "Notities opslaan");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    if (live) {
      const { error } = await supabase.from("technique_notes").upsert({ key, lines, updated_by: naam, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setTechNotes((n) => ({ ...n, [key]: lines }));
    flash(live ? "Werkwijze opgeslagen voor het hele team" : "Werkwijze opgeslagen (demo)");
  };

  const savePairing = async (name, pairs, note, season) => {
    const naam = await askName("groot", "Smaakcombinatie opslaan");
    if (!naam) return; // geannuleerd in de naam-popup — niets vastleggen
    const clean = { name: name.trim().toLowerCase(), pairs: pairs.map((x) => x.trim().toLowerCase()).filter(Boolean), note: (note || "").trim(), season: season || [], addedAt: Date.now() };
    if (!clean.name || clean.pairs.length === 0) { flash("Vul een naam en minstens één partner in"); return; }
    if (live) {
      const { error } = await supabase.from("flavor_pairings").upsert({ name: clean.name, pairs: clean.pairs, note: clean.note, season: clean.season, added_at: clean.addedAt, updated_by: naam, updated_at: new Date().toISOString() });
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
      if (isSeedDish) ({ error } = await supabase.from("dish_hidden").upsert({ dish_id: id, by: "—" }));
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
      else ({ error } = await supabase.from("recipe_hidden").upsert({ recipe_id: id, by: "—" }));
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
  const noticeKey = kitchenDate(); // aandacht-banner: weggeklikt tot 02:00, dan nieuwe dag
  const swipe = useSwipeSections(section, (s) => { setSection(s); setSearch(""); });

  // Dagelijkse schoonmaakcontrole om 16:45 (alleen voor koks): toont een banner
  // bovenaan de pagina in plaats van een popup. Weggeklikt → komt om 18:00 nog
  // één keer terug; daarna niet meer die dag. De keuze overleeft een refresh.
  // Wacht op de geladen teamdata: anders lijkt een al afgeronde dag nog open.
  useEffect(() => {
    if (!user || !user.canEdit || !loaded) { setCheckBanner(false); return; }
    let cancelled = false;
    const dayMarked = (l, key) => (l.taskId === DAY_DONE_ID || l.taskId === DAY_OFF_ID) && String(l.doneDate).slice(0, 10) === key;
    const tick = async () => {
      if (checkBanner || checkOpen || checkForDate) return; // banner of formulier staat al open
      const now = new Date();
      const key = localDate(now);
      const past1 = now.getHours() > CHECK_HOUR || (now.getHours() === CHECK_HOUR && now.getMinutes() >= CHECK_MIN);
      const past2 = now.getHours() >= REMIND_HOUR; // tweede herinnering
      if (!past1) return;
      const cd = checkDone && checkDone.key === key ? checkDone : null;
      // trap 1 nog niet weggeklikt → tonen; trap 1 weggeklikt en het is na REMIND_HOUR → nogmaals tonen
      const mustShow = !cd || (cd.stage === 1 && past2);
      if (!mustShow) return;
      if (cleaningLogs.some((l) => dayMarked(l, key))) return; // al afgerond volgens lokale stand
      // Dubbelcheck vers bij de database: een collega kan net hebben afgerond
      // op een ander apparaat, of de lokale stand kan achterlopen.
      if (live) {
        try {
          const { data } = await supabase.from("cleaning_logs").select("id, task_id, done_date")
            .in("task_id", [DAY_DONE_ID, DAY_OFF_ID]).gte("done_date", key);
          if (cancelled) return;
          if ((data || []).some((r) => String(r.done_date).slice(0, 10) === key)) {
            // Klaar volgens de database maar niet lokaal: hooguit één keer per
            // minuut herladen. Zonder deze rem kan dit pad in een strakke lus
            // raken (herladen → logs veranderen → effect opnieuw → herladen…)
            // waardoor de app onbedienbaar wordt.
            if (Date.now() - (checkReloadRef.current || 0) > 60000) { checkReloadRef.current = Date.now(); loadShared(); }
            return;
          }
        } catch (e) { /* bij twijfel gewoon tonen */ }
      }
      if (cancelled) return;
      setCheckBanner(true);
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user, loaded, checkDone, cleaningLogs, checkBanner, checkOpen, checkForDate]);
  const dismissCheckBanner = () => {
    const now = new Date();
    setCheckDone({ key: localDate(), stage: now.getHours() >= REMIND_HOUR ? 2 : 1 });
    setCheckBanner(false);
  };
  // Rondt een collega de dag intussen af (realtime), verdwijnen banner en popup vanzelf.
  useEffect(() => {
    if (!checkOpen && !checkBanner) return;
    const key = localDate();
    if (!checkForDate && cleaningLogs.some((l) => (l.taskId === DAY_DONE_ID || l.taskId === DAY_OFF_ID) && String(l.doneDate).slice(0, 10) === key)) { setCheckOpen(false); setCheckBanner(false); }
  }, [cleaningLogs, checkOpen, checkBanner]);

  if (!user) return <><BrandCSS /><Login onPick={setUser} live={live} /></>;
  const openRecipe = (id) => { bumpOpenCount(id); push({ screen: "recipeDetail", id }); };
  const fabAction = () => {
    if (section === "gerechten") push({ screen: "dishForm", editing: null });
    else if (section === "recepten") push({ screen: "recipeForm", editing: null });
    else if (section === "fermentatie") push({ screen: "batchForm", prefill: null });
    else if (section === "smaak") setNewPairing((n) => n + 1);
    else if (section === "voorraad") push({ screen: "voorraadForm", editing: null, prefill: null });
    else if (section === "technieken") push({ screen: "werkDocForm", editing: null });
    else if (section === "assortiment") push({ screen: "assortimentForm", editing: null });
    else if (section === "schoonmaak") push({ screen: "cleaningForm", editing: null });
  };
  const showFab = current.screen === "list" && canEdit && section !== "home";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.paper, color: "#33352c" }}>
      <BrandCSS />
      <Header user={user} onHome={goHome} onOpenSettings={() => push({ screen: "settings" })} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-28">
        {!FORM_SCREENS.has(current.screen) && (
          <SectionNav chef={chefMode} section={current.screen === "list" ? section : null}
            setSection={(s) => { setSection(s); setSearch(""); if (current.screen !== "list") resetTo({ screen: "list" }); }} />
        )}
        {current.screen === "list" && (
          <div {...swipe}>
            {/* Pas tonen als de teamdata geladen is: anders knippert de banner
                bij elke refresh kort op basis van de lokale startdata. */}
            {canEdit && loaded && (() => {
              // HACCP-kookbanners: garing invullen, en op 3/5 uur de terugkoelcheck.
              const nu = new Date();
              const uit = [];
              const garingDezeWeek = haccpRecords.some((r) => r.kind === "bereiding" && weekKey(r.date) === weekKey(localDate()));
              for (const ses of cookSessions) {
                if (kitchenDate(new Date(ses.at)) !== kitchenDate()) continue;
                const koelKlaar = haccpRecords.some((r) => r.kind === "terugkoelen" && r.date === localDate() && naamMatch(r.product, ses.name));
                if (koelKlaar) continue;
                const garingKlaar = ses.garingAt || garingDezeWeek;
                if (!garingKlaar && binnenWerkdag(nu) && !cookDismiss[ses.id + ":g"]) {
                  uit.push(<ReminderBanner key={ses.id + "g"} icon={<Thermometer size={15} />} title="HACCP · garing"
                    text={'Je werkt met "' + ses.name + '". Vul de garingscontrole (kerntemperatuur) in.'}
                    actionLabel="Invullen" onAction={() => push({ screen: "haccpRecordForm", recordKind: "bereiding", editing: null, prefill: { gerecht: ses.name } })}
                    onDismiss={() => dismissCook(ses.id + ":g")} />);
                }
                const basis = ses.garingAt || ses.at;
                for (const uur of [5, 3]) {
                  const t = new Date(basis + uur * 3600000);
                  if (nu >= t && binnenWerkdag(t) && !cookDismiss[ses.id + ":" + uur]) {
                    uit.push(<ReminderBanner key={ses.id + "k" + uur} icon={<Thermometer size={15} />} title={"HACCP · terugkoelen (" + uur + " uur)"}
                      text={'"' + ses.name + '" staat ' + uur + ' uur sinds de ' + (ses.garingAt ? "garing" : "start") + '. Is het gemaakt? Check de temperatuur' + (uur === 5 ? " — die moet nu ≤ 7 °C zijn" : "") + ' en leg de terugkoeling vast.'}
                      actionLabel="Invullen" onAction={() => push({ screen: "haccpRecordForm", recordKind: "terugkoelen", editing: null, prefill: { product: ses.name } })}
                      onDismiss={() => dismissCook(ses.id + ":" + uur)} />);
                    break; // toon alleen de verst gevorderde fase
                  }
                }
              }
              // Leveringsbanner: dinsdag en vrijdag, zolang er vandaag nog geen leveringscontrole is.
              const dow = nu.getDay();
              if ((dow === 2 || dow === 5) && binnenWerkdag(nu) && !cookDismiss["levering"] && !haccpRecords.some((r) => r.kind === "levering" && r.date === localDate())) {
                uit.push(<ReminderBanner key="lev" icon={<Thermometer size={15} />} title="HACCP · levering"
                  text="Leveringsdag — check de temperatuur van de gekoelde leveringen bij ontvangst."
                  actionLabel="Invullen" onAction={() => push({ screen: "haccpRecordForm", recordKind: "levering", editing: null, prefill: null })}
                  onDismiss={() => dismissCook("levering")} />);
              }
              return uit;
            })()}
            {canEdit && loaded && !dismissedNotices[noticeKey] && (
              <NoticeBanner batches={batches} canAck={canEdit} onAck={ackAction} onMeasure={(id) => setMeasureFor(id)} onOpen={() => setSection("fermentatie")} onDismiss={() => setDismissedNotices((d) => ({ ...d, [noticeKey]: true }))} />
            )}
            {canEdit && checkBanner && (
              <ReminderBanner groep="Schoonmaak" icon={<Sparkles size={15} />} title="Schoonmaakcontrole"
                text={"Het is " + String(CHECK_HOUR).padStart(2, "0") + ":" + String(CHECK_MIN).padStart(2, "0") + " geweest — tijd om de schoonmaak van vandaag af te tekenen."}
                actionLabel="Aftekenen" onAction={() => setCheckOpen(true)} onDismiss={dismissCheckBanner} />
            )}
            {section === "home" && <HomeScreen stock={stock} recipes={recipes} batches={batches} dishes={dishes} onOpenRecipe={openRecipe} onOpenDish={(id) => push({ screen: "dishDetail", id })} onGoSection={(sec) => setSection(sec)} />}
            {section === "gerechten" && <DishList dishes={dishes} recipeById={recipeById} search={search} setSearch={setSearch} onOpen={(id) => push({ screen: "dishDetail", id })} />}
            {section === "recepten" && <RecipeList recipes={recipes} openCounts={openCounts} stock={stock} search={search} setSearch={setSearch} onOpen={openRecipe} />}
            {section === "fermentatie" && <FermentList batches={batches} recipes={recipes} stock={stock} canEdit={canEdit} onExtend={extendBatch} onToggleDone={toggleBatchDone} onDeleteBatch={deleteBatch} onEditBatch={(id) => push({ screen: "batchForm", editing: id })} onOpenLog={(id) => push({ screen: "batchLog", id })} onOpenRecipe={openRecipe} onNewFermentRecipe={() => push({ screen: "recipeForm", editing: null, fermentDefault: true })} onStartBatch={() => push({ screen: "batchForm", prefill: null })} onOpenMeasure={() => setMeasureOpen(true)} onAck={ackAction} />}
            {section === "smaak" && <FlavorList pairings={pairings} canEdit={canEdit} onSave={savePairing} onReset={resetPairing} openNew={newPairing} onOpenedNew={() => setNewPairing(0)} onSearchRecipes={(n) => { setSection("recepten"); setSearch(n); }} />}
            {section === "voorraad" && <VoorraadList chefMode={chefMode} recipeById={recipeById} stock={stock} canEdit={canEdit} onDec={decStock} onEdit={(id) => push({ screen: "voorraadForm", editing: id, prefill: null })} onDelete={deleteStock} onExport={exportStockExcel} noticeClosed={stockNoticeClosed === todayKey} onCloseNotice={() => setStockNoticeClosed(todayKey)} />}
            {section === "assortiment" && chefMode && <AssortimentList producten={assortiment} bdArtikelen={bdArtikelen}
              onNew={() => push({ screen: "assortimentForm", editing: null })}
              onEdit={(id) => push({ screen: "assortimentForm", editing: id })}
              onDelete={(id) => { if (window.confirm("Dit product verwijderen?")) deleteAssortimentItem(id); }}
              recipeById={recipeById} recipes={recipes}
              onImport={(f) => setImportVraag({ file: f, naam: String(f.name || "").replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim() })}
              onUpdateArtikel={updateBdArtikel} onDeleteArtikel={deleteBdArtikel} onHernoem={hernoemArtikelGroep}
              onImportProducten={importAssortiment}
              calcItems={calcItems} dishes={dishes} dishById={dishById} negeer={negeerIng} onNegeer={negeerIngredient} onSamenvoegen={voegNamenSamen} aliassen={naamAlias}
              onNewItem={() => push({ screen: "calcItemForm", editing: null })}
              onEditItem={(id) => push({ screen: "calcItemForm", editing: id })}
              onDeleteItem={deleteCalcItem} />}
            {section === "technieken" && <TechniquesList notes={techNotes} canEdit={canEdit} onSaveNotes={saveTechNotes}
              focusKey={techFocus} onFocusDone={() => setTechFocus(null)}
              werkDocs={mergedWerkDocs} fermentRows={fermentRows} tableRows={techTableRows}
              onEditTable={(t) => push({ screen: "techTableForm", table: t })}
              onNewDoc={() => push({ screen: "werkDocForm", editing: null })}
              onEditDoc={(id) => push({ screen: "werkDocForm", editing: id })}
              onDeleteDoc={deleteWerkDoc}
              onEditFerment={() => push({ screen: "fermentGuideForm" })} />}
            {section === "schoonmaak" && <CleaningList tasks={cleaningTasks} logs={cleaningLogs} haccpLogs={haccpLogs} canEdit={canEdit} user={user}
              dayDone={cleaningLogs.find((l) => l.taskId === DAY_DONE_ID && l.doneDate === todayKey) || null}
              dayOff={cleaningLogs.find((l) => l.taskId === DAY_OFF_ID && l.doneDate === todayKey) || null}
              onDayDone={markDayDone} onUndoDayDone={undoDayDone} onDayOff={markDayOff}
              onSign={signCleaning} onEditLog={editCleaningLog} onDeleteLog={deleteCleaningLog}
              onOpenHaccp={() => push({ screen: "haccpForm", editing: null })}
              onEditHaccp={(id) => push({ screen: "haccpForm", editing: id })}
              onDeleteHaccp={deleteHaccpLog}
              haccpRecords={haccpRecords}
              onOpenRecord={(kind) => push({ screen: "haccpRecordForm", recordKind: kind, editing: null })}
              onEditRecord={(kind, id) => push({ screen: "haccpRecordForm", recordKind: kind, editing: id })}
              onDeleteRecord={deleteHaccpRecord}
              onNewTask={() => push({ screen: "cleaningForm", editing: null })}
              onEditTask={(id) => push({ screen: "cleaningForm", editing: id })}
              onDeleteTask={deleteCleaningTask}  onReopenOff={(logId, date) => { if (logId) removeCleaningLog(logId, true); setCheckForDate(date); setCheckOpen(true); }} />}
          </div>
        )}
        {current.screen === "dishDetail" && <DishDetail chefMode={chefMode} dish={dishById(current.id)} recipeById={recipeById} canEdit={canEdit} onBack={goBack} onEdit={() => push({ screen: "dishForm", editing: current.id })} onOpenRecipe={openRecipe} onDelete={deleteDish} />}
        {current.screen === "recipeDetail" && (() => { const r = recipeById(current.id); return (
          <RecipeDetail chefMode={chefMode} recipe={r} user={user} canEdit={canEdit} usageCount={usageCount(current.id)}
            baseRecipe={r?.baseId ? recipeById(r.baseId) : null} variations={variationsOf(current.id)}
            onBack={goBack} onEdit={() => push({ screen: "recipeForm", editing: current.id })}
            openCount={openCounts[current.id] || 0} onOpenRecipe={openRecipe} onDelete={deleteRecipe}
            onStartBatch={() => push({ screen: "batchForm", prefill: r })}
            onAddStock={() => push({ screen: "voorraadForm", editing: null, prefill: { product: r.name, ingredients: Array.isArray(r.ingredients) ? r.ingredients : [], recipeId: r.id, productionDate: localDate(), shelfDays: r.shelfDays || null, yieldAmount: r.yieldAmount || null, yieldUnit: r.yieldUnit || "", yieldText: r.yield || "" } })}
            onOpenTech={openTech} />
        ); })()}
        {current.screen === "dishForm" && <DishForm dish={current.editing ? dishById(current.editing) : null} draft={dishDraft} allRecipes={recipes} recipeById={recipeById}
          onNewRecipe={(st) => { setDishDraft(st); push({ screen: "recipeForm", editing: null, fromDish: true }); }}
          onCancel={() => { setDishDraft(null); goBack(); }}
          onSave={(d) => { setDishDraft(null); saveDish(d, current.editing); goBack(); }} />}
        {current.screen === "recipeForm" && <RecipeForm chefMode={chefMode} catSettings={catSettings} onSaveCats={saveCatSettings} recipe={current.editing ? recipeById(current.editing) : null} fermentDefault={!!current.fermentDefault} allRecipes={recipes} onSaveAllergenFix={saveAllergenFix} onSaveArtikel={updateBdArtikel} onCancel={goBack}
          onSave={async (d) => { const newId = await saveRecipe(corrigeerNamen(d, current.editing ? recipeById(current.editing) : null), current.editing);
            if (current.fromDish && newId) setDishDraft((dr) => (dr ? { ...dr, recipeIds: [...(dr.recipeIds || []), newId] } : dr));
            goBack(); }} />}
        {current.screen === "batchForm" && <BatchForm prefill={current.prefill} editing={current.editing ? batches.find((b) => b.id === current.editing) : null} fermentRecipes={recipes.filter((r) => r.ferment)} onCancel={goBack} onSave={(d) => { saveBatch(d, current.editing); setSection("fermentatie"); goBack(); }} />}
        {current.screen === "batchLog" && <BatchLogScreen batch={batches.find((b) => b.id === current.id)} canEdit={canEdit} onBack={goBack} onAdd={(m) => { addBatchMeasurement(current.id, m); goBack(); }} onDeleteRow={(i) => deleteBatchMeasurement(current.id, i)} />}
        {current.screen === "batchEindmeting" && <EindmetingForm batch={batches.find((b) => b.id === current.id)} onCancelBack={goBack} onSkip={() => finishEindmeting(current.id, null)} onSave={(m) => finishEindmeting(current.id, m)} />}
        {current.screen === "haccpForm" && <HaccpForm editing={current.editing ? haccpLogs.find((l) => l.id === current.editing) : null} onCancel={goBack} onSave={(d) => { saveHaccp(d, current.editing); goBack(); }} />}
        {current.screen === "haccpRecordForm" && <HaccpRecordForm kind={current.recordKind} editing={current.editing ? haccpRecords.find((r) => r.id === current.editing) : null} prefill={current.prefill || null} onCancel={goBack} onSave={(d) => { saveHaccpRecord(d, current.editing); goBack(); }} />}
        {current.screen === "werkDocForm" && <WerkwijzeDocForm editing={current.editing ? mergedWerkDocs.find((d) => d.key === current.editing) : null} onCancel={goBack} onSave={(d) => { saveWerkDoc(d, current.editing); goBack(); }} />}
        {current.screen === "fermentGuideForm" && <FermentGuideForm rows={fermentRows} onCancel={goBack} onSave={(rows) => { saveFermentGuide(rows); goBack(); }} />}
        {current.screen === "techTableForm" && <TechTableForm config={TECH_TABLE_CONFIGS[current.table]} rows={techTableRows[current.table]} onCancel={goBack} onSave={(rows) => { saveTechTable(current.table, rows); goBack(); }} />}
        {current.screen === "voorraadForm" && <VoorraadForm editing={current.editing ? stock.find((v) => v.id === current.editing) : null} prefill={current.prefill || null} allRecipes={recipes} onCancel={goBack} onSave={(d) => { saveStock(d, current.editing); goBack(); }} />}
        {current.screen === "cleaningForm" && <CleaningTaskForm task={current.editing ? cleaningTasks.find((t) => t.id === current.editing) : null} onCancel={goBack} onSave={(d) => { saveCleaningTask(d, current.editing); goBack(); }} />}
        {current.screen === "assortimentForm" && chefMode && <AssortimentForm
          editing={current.editing ? assortiment.find((x) => x.id === current.editing) : null}
          producten={assortiment} recipes={recipes} dishes={dishes} recipeById={recipeById} dishById={dishById}
          calcItems={calcItems} bdArtikelen={bdArtikelen} onCancel={goBack}
          onSave={(item) => { saveAssortimentItem(item); goBack(); }} />}
        {current.screen === "calcItemForm" && chefMode && <CalcItemForm
          editing={current.editing ? calcItems.find((x) => x.id === current.editing) : null}
          recipes={recipes} dishes={dishes} recipeById={recipeById} dishById={dishById} onCancel={goBack}
          onSave={(item) => { saveCalcItem(item); goBack(); }} />}
        {current.screen === "settings" && <SettingsScreen onBack={goBack} installed={installed} canInstall={!!deferredPrompt} onInstall={doInstall} onBackup={maakBackup} onWordBackup={maakWordBackup} onRestore={herstelBackup} chefMode={chefMode} onChef={(aan, code) => {
          if (!aan) { setChefMode(false); if (section === "assortiment") setSection("home"); flash("Chef-modus uit"); return true; }
          if (String(code || "").trim().toLowerCase() !== "chefmichael") return false;
          setChefMode(true); flash("Chef-modus aan"); return true;
        }} onSignOut={() => { if (live) supabase.auth.signOut(); setUser(null); resetTo({ screen: "list" }); }} />}
      </main>

      {showFab && (
        <button onClick={fabAction} className="btnp ff fixed bottom-6 right-4 sm:right-6 z-30 inline-flex items-center gap-2 rounded-full pl-4 pr-5 py-3 shadow-lg font-medium text-sm">
          <Plus size={19} /> {section === "gerechten" ? "Gerecht" : section === "recepten" ? "Recept" : section === "smaak" ? "Smaakcombinatie" : section === "voorraad" ? "Voorraad" : section === "technieken" ? "Werkwijze" : section === "assortiment" ? "Product" : section === "schoonmaak" ? "Taak" : "Batch"}
        </button>
      )}
      {user && <CalcWidget open={calcOpen} onOpen={openCalc} onClose={closeCalc} raised={showFab} />}
      {user && canEdit && (
        <button onClick={() => { setFabLabelOpen(true); try { window.history.pushState({ app: "ritme", etiket: true }, ""); } catch (e) {} }} title="Etiket maken"
          className={"ff fixed right-[4.5rem] sm:right-[5rem] z-30 w-12 h-12 rounded-full shadow-lg inline-flex items-center justify-center " + (showFab ? "bottom-[5.25rem]" : "bottom-6")}
          style={{ background: T.paper, color: T.green, border: "1px solid " + T.green }}>
          <Tag size={19} />
        </button>
      )}
      {namePrompt && <NamePromptModal label={namePrompt.label} onPick={answerName} />}
      {importVraag && (
        <PromptModal titel="Van welke leverancier?" label="Leveranciersnaam" waarde={importVraag.naam} placeholder="bv. BD Totaal"
          hint="De artikelen komen onder deze naam in de lijst te staan. Staat er een kolom Leverancier in het bestand, dan wint die."
          okLabel="Inlezen" onCancel={() => setImportVraag(null)}
          onOk={(naam) => { const f = importVraag.file; setImportVraag(null); importBdArtikelen(f, naam); }} />
      )}
      {fabLabelOpen && canEdit && (
        <UniversalLabelModal recipes={recipes}
          prefillRecipe={current && current.screen === "recipeDetail" ? recipeById(current.id) : null}
          onClose={() => setFabLabelOpen(false)}
          onAddStock={(pf) => { setFabLabelOpen(false); push({ screen: "voorraadForm", editing: null, prefill: pf }); }} />
      )}
      {measureOpen && canEdit && (
        <BatchMeasureModal batches={batches.filter((b) => !b.done)} onAdd={addBatchMeasurement} onFinish={saveMeasureAndFinish} onClose={() => setMeasureOpen(false)} />
      )}
      {measureFor && canEdit && (
        <BatchMeasureModal batches={batches.filter((b) => b.id === measureFor && !b.done)} onAdd={addBatchMeasurement} onFinish={saveMeasureAndFinish} onClose={() => setMeasureFor(null)} />
      )}
      {batchLabelFor && canEdit && (
        <BatchLabelModal batch={batchLabelFor} onClose={() => setBatchLabelFor(null)} />
      )}
      {checkOpen && canEdit && (
        <CleaningCheckModal tasks={cleaningTasks} logs={cleaningLogs} user={user} canEdit={canEdit} forDate={checkForDate}
          onSign={(tid) => signCleaning(tid, false, checkForDate || undefined)} onDayDone={() => markDayDone(checkForDate || undefined)} onDayOff={() => markDayOff(checkForDate || undefined)} onClose={() => { setCheckOpen(false); setCheckForDate(null); }}
          onUndo={(logId) => removeCleaningLog(logId)}
          onFillTemp={() => { setCheckOpen(false); setCheckForDate(null); push({ screen: "haccpForm", editing: null }); }}
          onFillRecord={(kind) => { setCheckOpen(false); setCheckForDate(null); push({ screen: "haccpRecordForm", recordKind: kind, editing: null }); }}
          onOpenSection={() => { setCheckOpen(false); resetTo({ screen: "list" }); setSection("schoonmaak"); }} />
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl text-sm px-4 py-2.5 shadow-lg max-w-[92vw] w-max" style={{ background: T.ink, color: T.paper }}>
          <Check size={16} className="shrink-0" />
          <span className="min-w-0">{toast.msg}</span>
          {toast.undo && <button onClick={() => { const u = toast.undo; setToast(null); u(); }} className="ff font-semibold underline shrink-0 whitespace-nowrap">Ongedaan maken</button>}
        </div>
      )}
    </div>
  );
}

// Zwevende rekenmachine, beschikbaar op elke pagina.
function CalcWidget({ open, onOpen, onClose, raised }) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");
  // Veilige evaluatie: alleen cijfers en rekenkundige tekens.
  const evalExpr = (e) => {
    const clean = e.replace(/,/g, ".").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    if (!/^[\d+\-*/(). %]*$/.test(clean) || clean.trim() === "") return "";
    try {
      const withPct = clean.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
      // eslint-disable-next-line no-new-func
      const v = Function('"use strict";return (' + withPct + ")")();
      if (v == null || isNaN(v) || !isFinite(v)) return "";
      return String(Math.round(v * 10000) / 10000).replace(".", ",");
    } catch (err) { return ""; }
  };
  const tap = (t) => {
    if (t === "Wis") { setExpr(""); setResult(""); return; }
    if (t === "⌫") { setExpr((e) => e.slice(0, -1)); return; }
    if (t === "=") { const r = evalExpr(expr); if (r !== "") { setExpr(r); setResult(""); } return; }
    setExpr((e) => e + t);
  };
  useEffect(() => { setResult(open ? evalExpr(expr) : ""); }, [expr, open]);
  const keys = [["Wis", "(", ")", "÷"], ["7", "8", "9", "×"], ["4", "5", "6", "−"], ["1", "2", "3", "+"], ["0", ",", "%", "="]];
  return (
    <>
      {open && (
        <div className={"fixed right-4 sm:right-6 z-40 w-[16.5rem] rounded-2xl shadow-xl p-3 " + (raised ? "bottom-[9.25rem]" : "bottom-24")} style={{ background: T.paper, border: "1px solid " + T.line }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-semibold uppercase tracking-widest acc">Rekenmachine</span>
            <button onClick={onClose} className="ff mute hover:opacity-70" title="Sluiten"><X size={16} /></button>
          </div>
          <div className="rounded-xl px-3 py-1.5 mb-1.5 text-right" style={{ background: "#eef1e6", minHeight: "2.6rem" }}>
            <div className="ink text-lg leading-tight break-all">{expr || "0"}</div>
            <div className="text-sm mute h-4">{result !== "" && expr !== result ? "= " + result : ""}</div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {keys.flat().map((k) => (
              <button key={k} onClick={() => tap(k)}
                className={"ff rounded-lg py-1.5 text-sm font-medium " + (k === "=" ? "btnp" : ["÷", "×", "−", "+"].includes(k) ? "pillon" : "pill")}>
                {k}
              </button>
            ))}
            <button onClick={() => tap("⌫")} className="ff pill rounded-lg py-1.5 text-sm font-medium col-span-4 mt-0.5 inline-flex items-center justify-center gap-1"><ArrowLeft size={14} /> Wis laatste</button>
          </div>
        </div>
      )}
      <button onClick={open ? onClose : onOpen} title="Rekenmachine"
        className={"ff fixed right-4 sm:right-6 z-40 w-12 h-12 rounded-full shadow-lg inline-flex items-center justify-center " + (raised ? "bottom-[5.25rem]" : "bottom-6")}
        style={{ background: open ? T.green : T.paper, color: open ? T.paper : T.green, border: "1px solid " + T.green }}>
        {open ? <X size={20} /> : <Percent size={19} />}
      </button>
    </>
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
      <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: T.green }}><FarmhouseIcon size={26} style={{ color: T.paper }} /></span>
      <span className="serif ink text-base leading-none truncate">In het ritme van het land</span>
    </Tag>
  );
}

// Wie doet dit? Eén tik op een naam bevestigt direct; eigen naam typen kan ook.
// Bewust niet te sluiten zonder keuze: de actie is al gestart en er is altijd
// iemand die hem doet. De laatst gekozen naam op dit apparaat staat bovenaan.
// Een ander recept als ingrediënt kiezen — bijvoorbeeld een kruidenrub in buikspek.
function ReceptKiezer({ zoek, recepten, verboden, onKies, onSluit }) {
  const [q, setQ] = useState(zoek || "");
  const hits = (recepten || [])
    .filter((r) => r.id !== verboden && (!q.trim() || softMatchAny([r.name, r.category], q)))
    .slice(0, 40);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }} onClick={onSluit}>
      <div className="w-full max-w-md rounded-2xl p-4 flex flex-col" style={{ background: T.paper, maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="serif ink text-xl leading-tight">Recept invoegen</div>
        <p className="text-[12px] mute mt-1 mb-2">De allergenen van dat recept tellen mee in dit recept, en de kostprijs rekent naar rato van de opbrengst mee.</p>
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek een recept" className="input px-3 py-2.5 w-full text-sm pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {hits.length === 0 && <p className="text-[12.5px] mute">Geen recept gevonden.</p>}
          {hits.map((r) => { const alg = recipeAllergens(r); return (
            <button key={r.id} type="button" onClick={() => onKies(r)} className="ff card cardh w-full text-left px-3 py-2">
              <div className="text-sm ink font-medium truncate">{r.name}</div>
              <div className="text-[12px] mute truncate">{[r.category, r.yield || (r.yieldAmount ? r.yieldAmount + " " + (r.yieldUnit || "") : ""), alg.length ? "allergenen: " + alg.join(", ") : null].filter(Boolean).join(" · ")}</div>
            </button>
          ); })}
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={onSluit} className="ff rounded-lg px-3 py-2 text-sm font-medium mute hover:opacity-70" style={{ border: "1px solid " + T.line }}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}

// Zoeken in alle ingelezen artikelen om er zelf een aan een ingrediënt te hangen.
function ArtikelKiezer({ zoek, huidig, onKies, onSluit }) {
  const [q, setQ] = useState(zoek || "");
  const arts = PRIJSLIJST.arts || [];
  const hits = q.trim().length >= 2 ? arts.filter((a) => strictMatchAny([a.omschrijving], q)).slice(0, 40) : [];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }} onClick={onSluit}>
      <div className="w-full max-w-md rounded-2xl p-4 flex flex-col" style={{ background: T.paper, maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="serif ink text-xl leading-tight mb-2">Artikel kiezen</div>
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek in de prijslijsten" className="input px-3 py-2.5 w-full text-sm pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {q.trim().length < 2 && <p className="text-[12.5px] mute">Typ minstens twee letters.</p>}
          {q.trim().length >= 2 && hits.length === 0 && <p className="text-[12.5px] mute">Geen artikel gevonden. Voeg 'm toe onder Calculaties, bij de ingrediënten zonder prijs.</p>}
          {hits.map((a) => { const pb = artikelPerBasis(a); return (
            <button key={a.code} type="button" onClick={() => onKies(a)} className="ff card cardh w-full text-left px-3 py-2">
              <div className="text-sm ink font-medium truncate">{a.omschrijving}{huidig === a.code ? <span className="mute font-normal"> · nu gekozen</span> : null}</div>
              <div className="text-[12px] mute truncate">{[a.leverancier, a.inhoud, pb ? eur(pb.prijs) + " p/" + pb.b : null].filter(Boolean).join(" · ")}</div>
            </button>
          ); })}
        </div>
        <div className="flex justify-between gap-2 mt-3">
          <button onClick={() => onKies(null)} className="ff rounded-lg px-3 py-2 text-sm font-medium acc hover:opacity-70" style={{ border: "1px solid " + T.line }}>Automatisch zoeken</button>
          <button onClick={onSluit} className="ff rounded-lg px-3 py-2 text-sm font-medium mute hover:opacity-70" style={{ border: "1px solid " + T.line }}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}

// Waar komt deze kostprijs vandaan? Toont de bron en de rekensom.
function PrijsUitleg({ ing, onSluit, onKiesArtikel, onNieuwArtikel, leveranciers }) {
  const [kiezer, setKiezer] = useState(false);
  const [maken, setMaken] = useState(false);
  const hand = eurNum(ing && ing.cost);
  const kk = ingKost(ing);
  const sub = subRecept(ing);
  const art = kk.artikel;
  const pb = artikelPerBasis(art);
  const maat = parseMaat(ing && ing.amount);
  const regels = [];
  let som = "";
  if (hand !== null) {
    regels.push(["Handmatig ingevuld", eur(hand)]);
    regels.push(["Leeg laten", "dan rekent de app zelf"]);
  } else if (sub) {
    const batch = receptKost(sub), porties = receptPorties(sub), opb = receptOpbrengst(sub);
    regels.push(["Uit recept", sub.name]);
    regels.push(["Batch", batch === null ? "geen prijs" : eur(batch)]);
    regels.push(["Opbrengst", opb ? opb.n + " " + opb.b : "onbekend"]);
    if (porties) regels.push(["Porties", porties + " · " + eur(batch === null ? null : batch / porties) + " per portie"]);
    regels.push(["Nodig", String(ing.amount || "hele batch")]);
    if (batch !== null && opb && String(ing.amount || "").trim()) som = eur(batch) + " ÷ " + opb.n + " " + opb.b + " × " + String(ing.amount).trim();
    else if (batch !== null) som = "hele batch";
  } else if (art) {
    regels.push(["Artikel", art.omschrijving]);
    if (art.leverancier) regels.push(["Leverancier", art.leverancier]);
    regels.push(["Inkoop", [art.inhoud, eur(art.prijs)].filter(Boolean).join(" · ")]);
    regels.push(["Per eenheid", pb ? eur(pb.prijs) + " per " + pb.b : "niet te bepalen"]);
    regels.push(["Nodig", String(ing.amount || "—") + (maat && pb && maat.b !== pb.b ? " · omgerekend via de gewichtentabel" : "")]);
    if (pb && kk.bedrag !== null) {
      const hoev = pb.prijs > 0 ? kk.bedrag / pb.prijs : null;
      const nette = hoev === null ? String(ing.amount || "") : (hoev < 1 ? String(Math.round(hoev * 1000)) + (pb.b === "kg" ? " g" : pb.b === "l" ? " ml" : " st") : String(Math.round(hoev * 100) / 100).replace(".", ",") + " " + pb.b);
      som = nette + " × " + eur(pb.prijs) + " per " + pb.b;
    }
  } else {
    regels.push(["Geen artikel gevonden", "koppel er zelf een, of vul de prijs handmatig in"]);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }} onClick={onSluit}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: T.paper }} onClick={(e) => e.stopPropagation()}>
        <div className="serif ink text-xl leading-tight">{ing && ing.item ? ing.item : "Kostprijs"}</div>
        <div className="mt-3 space-y-1.5">
          {regels.map(([k, v], i) => (
            <div key={i} className="flex items-start justify-between gap-3 text-[13px]">
              <span className="mute shrink-0">{k}</span>
              <span className="ink text-right">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 mt-3 pt-3" style={{ borderTop: "1px solid " + T.line }}>
          <span className="text-sm font-semibold ink">Kostprijs</span>
          {som && <span className="text-[12px] mute text-center flex-1">{som}</span>}
          <span className="text-sm font-bold" style={{ color: "#44502f" }}>{kk.bedrag !== null ? eur(kk.bedrag) : "—"}</span>
        </div>
        {onKiesArtikel && !sub && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => setKiezer(true)} className="btno ff rounded-lg px-3 py-2 text-xs font-semibold">Ander artikel kiezen</button>
            <button onClick={() => setMaken(true)} className="btno ff rounded-lg px-3 py-2 text-xs font-semibold">Zelf artikel maken</button>
            {ing && ing.artikelCode && <button onClick={() => { onKiesArtikel(null); onSluit(); }} className="ff rounded-lg px-3 py-2 text-xs font-medium mute hover:opacity-70" style={{ border: "1px solid " + T.line }}>Automatisch zoeken</button>}
          </div>
        )}
        {maken && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid " + T.line }}>
            <div className="text-sm font-bold ink mb-1">Nieuw artikel</div>
            <ArtikelForm nieuw a={{ code: "", omschrijving: (ing && ing.item) || "", inhoud: "1 kg", prijs: null, ppe: null, leverancier: (leveranciers && leveranciers[0]) || "Eigen bodem", categorie: "Overig", opmerking: "" }}
              leveranciers={leveranciers && leveranciers.length ? leveranciers : ["Eigen bodem", "Eigen prijzen"]} catsPerLev={{}}
              onSave={(art) => { onNieuwArtikel(art); onKiesArtikel(art.code); setMaken(false); onSluit(); }} onSluit={() => setMaken(false)} />
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={onSluit} className="ff rounded-lg px-3 py-2 text-sm font-medium mute hover:opacity-70" style={{ border: "1px solid " + T.line }}>Sluiten</button>
        </div>
        {kiezer && (
          <ArtikelKiezer zoek={(ing && ing.item) || ""} huidig={art ? art.code : null}
            onSluit={() => setKiezer(false)}
            onKies={(a) => { onKiesArtikel(a ? a.code : null); setKiezer(false); onSluit(); }} />
        )}
      </div>
    </div>
  );
}

// Melding met doorgaan of annuleren, in appstijl.
function BevestigModal({ titel, tekst, knop, onCancel, onOk }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }} onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: T.paper }} onClick={(e) => e.stopPropagation()}>
        <div className="serif ink text-xl leading-tight">{titel}</div>
        <p className="text-[13px] mute mt-1.5 leading-relaxed">{tekst}</p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="ff rounded-lg px-3 py-2 text-sm font-medium mute hover:opacity-70" style={{ border: "1px solid " + T.line }}>Annuleren</button>
          <button onClick={onOk} className="ff rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: "#8a4a3a", color: "#fbf9f2" }}>{knop || "Doorgaan"}</button>
        </div>
      </div>
    </div>
  );
}

// Klein appvenster voor een enkele invoer — vervangt window.prompt.
function PromptModal({ titel, label, hint, waarde, placeholder, wachtwoord, okLabel, fout, onCancel, onOk }) {
  const [v, setV] = useState(waarde || "");
  const ref = React.useRef(null);
  useEffect(() => { const t = setTimeout(() => { if (ref.current) ref.current.focus(); }, 80); return () => clearTimeout(t); }, []);
  const bevestig = () => { if (v.trim()) onOk(v.trim()); };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }} onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: T.paper }} onClick={(e) => e.stopPropagation()}>
        <div className="serif ink text-xl leading-tight">{titel}</div>
        {hint && <p className="text-xs mute mt-1 leading-relaxed">{hint}</p>}
        <div className="mt-3">
          {label && <div className="text-[11.5px] font-bold ink mb-1">{label}</div>}
          <input ref={ref} type={wachtwoord ? "password" : "text"} className="input px-3 py-2.5 w-full text-[15px]" value={v} placeholder={placeholder || ""}
            onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); bevestig(); } }} />
        </div>
        {fout && <p className="text-[12px] mt-1.5 font-medium" style={{ color: "#9a4a2f" }}>{fout}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="ff rounded-lg px-3 py-2 text-sm font-medium mute hover:opacity-70" style={{ border: "1px solid " + T.line }}>Annuleren</button>
          <button onClick={bevestig} disabled={!v.trim()} className="btnp ff inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"><Check size={15} /> {okLabel || "Oké"}</button>
        </div>
      </div>
    </div>
  );
}

function NamePromptModal({ label, onPick }) {
  const [eigen, setEigen] = useState("");
  const laatst = (() => { try { return localStorage.getItem("ritme:last-name") || ""; } catch (e) { return ""; } })();
  const namen = [...TEAM.map((m) => m.name)].sort((a, b) => (a === laatst ? -1 : b === laatst ? 1 : 0));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: T.paper }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="serif ink text-xl leading-tight">Wie doet dit?</div>
            {label && <div className="text-xs mute mt-0.5">{label}</div>}
          </div>
          <button onClick={() => onPick(null)} className="ff shrink-0 rounded-lg px-2 py-1 text-xs font-medium mute hover:opacity-70" style={{ border: "1px solid " + T.line }} title="Per ongeluk? Er wordt dan niets vastgelegd.">Annuleren</button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {namen.map((n) => (
            <button key={n} onClick={() => onPick(n)} className={"ff rounded-xl px-3 py-3 text-sm font-semibold " + (n === laatst ? "btnp" : "card cardh ink")}>{n}</button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input className="input px-2.5 py-2 flex-1 text-sm" value={eigen} onChange={(e) => setEigen(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && eigen.trim()) onPick(eigen.trim()); }} placeholder="Of typ een naam" />
          <button onClick={() => eigen.trim() && onPick(eigen.trim())} disabled={!eigen.trim()} className="btnp ff shrink-0 rounded-lg px-3 text-sm font-semibold disabled:opacity-40"><Check size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function Login({ onPick, live }) {
  // Eenmalig per apparaat: alleen het keukenwachtwoord. Wie wat doet wordt
  // daarna per actie gevraagd via de naam-popup — accounts bestaan niet meer.
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const submitPw = async () => {
    if (!pw || busy) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: DEVICE_EMAIL, password: pw });
    setBusy(false);
    if (error) setErr("Inloggen lukte niet. Controleer het keukenwachtwoord.");
    // bij succes zet de sessie-listener in App de toegang vanzelf
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: T.paper, color: "#33352c" }}>
      <div className="w-full max-w-sm">
        <Wordmark size="large" />
        <p className="mute text-center text-sm mt-5 mb-8">Het receptenboek van de moestuinkeuken.</p>
        {live ? (
          <div className="card p-4">
            <label className="block text-sm font-medium ink mb-1.5 inline-flex items-center gap-1.5"><Lock size={14} /> Keukenwachtwoord</label>
            <input type="password" autoFocus className="input px-3 py-2.5" value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitPw(); }}
              placeholder="Eenmalig per apparaat" />
            {err && <p className="text-xs mt-2" style={{ color: "#a23b2c" }}>{err}</p>}
            <button onClick={submitPw} disabled={busy || !pw} className="btnp ff w-full mt-3 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium py-2.5 disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} Open de keuken-app
            </button>
            <p className="text-xs mute mt-4 leading-relaxed">Dit apparaat blijft daarna ingelogd. Bij elke vastlegging vraagt de app wie het doet.</p>
          </div>
        ) : (
          <button onClick={() => onPick({ name: "", role: "", canEdit: true })} className="btnp ff w-full inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium py-3">Open de app (demo)</button>
        )}
      </div>
    </div>
  );
}
function Header({ user, onHome, onOpenSettings }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur" style={{ background: "rgba(242,240,232,0.9)", borderBottom: "1px solid " + T.line }}>
      <div className="w-full max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Wordmark onHome={onHome} />
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button onClick={onOpenSettings} className="mute hover:opacity-70 focus:outline-none shrink-0" title="Instellingen"><Settings size={19} /></button>
        </div>
      </div>
    </header>
  );
}


// ---------- Assortiment (alleen chef-modus) ----------
const eur = (v) => {
  const n = parseFloat(String(v == null ? "" : v).replace(",", "."));
  return isNaN(n) ? "—" : "€ " + n.toFixed(2).replace(".", ",");
};
const eurNum = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isNaN(n) ? null : n; };

// ---- Inkoopprijzen: ingrediënten koppelen aan de ingelezen leveranciersartikelen ----
// De prijslijst staat in een module-variabele, zodat elk scherm 'm kan lezen
// zonder dat de artikelen door de hele boom doorgegeven hoeven te worden.
// Zelf gegeven leveranciers-, categorienamen en opmerkingen blijven ook op het
// toestel staan. Zo overleven ze een refresh, ook als de kolommen in Supabase
// nog niet bestaan; wat wél uit de database komt heeft voorrang.
const ARTIKEL_EIGEN = "ritme:artikel-eigen";
const leesArtikelEigen = () => { try { return JSON.parse(localStorage.getItem(ARTIKEL_EIGEN) || "{}") || {}; } catch (e) { return {}; } };
const bewaarArtikelEigen = (arts) => {
  try {
    const o = leesArtikelEigen();
    for (const a of arts) o[a.code] = { leverancier: a.leverancier || "", categorie: a.categorie || "", opmerking: a.opmerking || "" };
    localStorage.setItem(ARTIKEL_EIGEN, JSON.stringify(o));
  } catch (e) {}
};
const pasOverlayToe = (rows) => {
  const o = leesArtikelEigen();
  return rows.map((a) => {
    const v = o[a.code];
    if (!v) return a;
    return { ...a, leverancier: a.leverancier || v.leverancier || "", categorie: a.categorie || v.categorie || "", opmerking: a.opmerking || v.opmerking || "" };
  });
};

let PRIJSLIJST = { arts: [], cache: new Map() };
const zetPrijslijst = (arts) => { PRIJSLIJST = { arts: Array.isArray(arts) ? arts : [], cache: new Map() }; };
const zonderAccent = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const PRIJS_STOP = ["de", "het", "een", "van", "per", "vers", "verse", "bio", "biologisch", "biologische", "ca", "stuks", "stuk", "gram", "gr", "kg", "ml", "liter", "doos", "bak", "zak", "pot", "krat"];
const prijsWoorden = (s) => zonderAccent(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ")
  .filter((w) => w.length > 1 && !/^\d+$/.test(w) && PRIJS_STOP.indexOf(w) < 0);
// Twee woorden horen bij elkaar als ze gelijk zijn (3), als het ene het andere is
// met een meervoudsstaart (citroen/citroenen, 2), of als deelwoord (1).
const MEERVOUD = ["en", "s", "es", "eren", "ren", "je", "jes", "tje", "tjes", "ties"];
// Nederlandse meervouden veranderen de klinkers: tomaat/tomaten, kaas/kazen.
// De kern van een woord vergelijkt daaroverheen.
const kernWoord = (w) => {
  let t = String(w || "").toLowerCase();
  // Eerst de meervoudsstaart eraf (alleen bij langere woorden: "kaas" is geen meervoud)
  if (t.length >= 5) { const kort = t.replace(/(eren|en|s|e)$/, ""); if (kort.length >= 3) t = kort; }
  return t.replace(/(aa|ee|oo|uu)/g, (m) => m[0]).replace(/z/g, "s").replace(/v/g, "f");
};
const woordScore = (w, x) => {
  if (x === w) return 3;
  const lang = x.length > w.length ? x : w, kort = x.length > w.length ? w : x;
  const waar = lang.indexOf(kort);
  if (waar < 0) { const k = kernWoord(w); return k.length >= 3 && k === kernWoord(x) ? 2 : 0; }
  if (waar === 0) {
    const staart = lang.slice(kort.length);
    // meervoud of verkleining: ui/uien, ei/eieren, stok/stokjes
    if (staart.length <= 2 || MEERVOUD.indexOf(staart) >= 0) return 2;
    return 1;
  }
  if (kort.length >= 5) return 2; // heel woord in een samenstelling: appelazijn, bietsuiker
  if (kort.length >= 4) return 1;
  return 0;
};
const EENHEID_CODE = { kg: "kg", kilo: "kg", kilogram: "kg", g: "g", gr: "g", gram: "g", grammen: "g", l: "l", lt: "l", ltr: "l", liter: "l", liters: "l", ml: "ml", cl: "cl", dl: "dl", st: "st", stk: "st", stks: "st", stuk: "st", stuks: "st", pc: "st", pcs: "st",
  el: "el", eetlepel: "el", eetlepels: "el", eetl: "el", tl: "tl", theelepel: "tl", theelepels: "tl", theel: "tl", kop: "kop", koppen: "kop", cm: "cm", centimeter: "cm" };
const NAAR_BASIS = { kg: { b: "kg", f: 1 }, g: { b: "kg", f: 0.001 }, l: { b: "l", f: 1 }, dl: { b: "l", f: 0.1 }, cl: { b: "l", f: 0.01 }, ml: { b: "l", f: 0.001 }, st: { b: "st", f: 1 },
  el: { b: "el", f: 1 }, tl: { b: "tl", f: 1 }, kop: { b: "l", f: 0.24 }, cm: { b: "cm", f: 1 } };
// Gewichtentabel uit Werkwijze: wat weegt een lepel, een stuk, een centimeter.
let MATEN = { rijen: [], cache: new Map() };
const zetMaten = (rijen) => { MATEN = { rijen: Array.isArray(rijen) ? rijen : [], cache: new Map() }; };
const ML_PER_LEPEL = { el: 15, tl: 5 };
// Een rij past bij een ingredient als elk woord uit de rijnaam erin voorkomt;
// meer woorden is een betere treffer ("rode ui" wint van "ui").
const maatVoor = (naam) => {
  const sleutel = zonderAccent(naam).toLowerCase().trim();
  if (!sleutel || !MATEN.rijen.length) return null;
  if (MATEN.cache.has(sleutel)) return MATEN.cache.get(sleutel);
  const iw = prijsWoorden(sleutel);
  let best = null, beste = 0;
  for (const r of MATEN.rijen) {
    const rw = prijsWoorden(r.naam);
    if (!rw.length) continue;
    let punten = 0;
    for (const w of rw) {
      let b = 0;
      for (const x of iw) { const p = woordScore(w, x); if (p > b) b = p; if (b === 3) break; }
      if (!b) { punten = 0; break; }
      punten += b;
    }
    // Bij gelijke stand wint de meest specifieke rij: kaneelstok boven kaneel.
    const totaal = punten * 100 + rw.join("").length;
    if (punten && totaal > beste) { beste = totaal; best = r; }
  }
  MATEN.cache.set(sleutel, best);
  return best;
};
const maatGram = (rij, veld) => { const n = eurNum(rij && rij[veld]); return n !== null && n > 0 ? n : null; };
const gramTekst = (g) => String(g >= 100 ? Math.round(g) : Math.round(g * 10) / 10).replace(".", ",") + " g";
// "20 el mosterd" -> "320 g", "3 st ui" -> "450 g", "30 cm gember" -> "240 g".
// Geeft null terug als het niet om te rekenen is; dan blijft de tekst zoals genoteerd.
const naarGram = (naam, hoeveelheid, factor) => {
  const maat = parseMaat(hoeveelheid);
  if (!maat || ["el", "tl", "st", "cm"].indexOf(maat.b) < 0) return null;
  if (maat.b === "st" && maat.vaag) return null; // kaal getal zonder eenheid blijft staan
  const rij = maatVoor(naam);
  let g = null;
  if (maat.b === "el") g = maat.n * (maatGram(rij, "el") || 15);
  else if (maat.b === "tl") g = (maat.n * (maatGram(rij, "el") || 15)) / 3;
  else if (maat.b === "st") { const w = maatGram(rij, "stuk"); g = w === null ? null : maat.n * w; }
  else if (maat.b === "cm") { const w = maatGram(rij, "cm"); g = w === null ? null : maat.n * w; }
  if (g === null || !isFinite(g) || g <= 0) return null;
  return gramTekst(g * (factor || 1));
};
// "500 g", "1,5 kg", "6 x 1 l", "2 stuks", "3" -> hoeveelheid in kilo, liter of stuks.
// Eetlepels, snufjes en "naar smaak" leveren niets op: die reken je niet mee.
const parseMaat = (txt) => {
  const t = zonderAccent(txt).toLowerCase().replace(/,/g, ".").trim();
  if (!t) return null;
  let n = null, eh = "";
  const m = t.match(/(\d+(?:\.\d+)?)\s*[x*]\s*(\d+(?:\.\d+)?)\s*([a-z]*)/);
  if (m) { n = parseFloat(m[1]) * parseFloat(m[2]); eh = m[3] || ""; }
  else { const m2 = t.match(/(\d+(?:\.\d+)?)\s*([a-z]*)/); if (!m2) return null; n = parseFloat(m2[1]); eh = m2[2] || ""; }
  if (!isFinite(n) || n <= 0) return null;
  const code = eh ? EENHEID_CODE[eh] : "st";
  const conv = code ? NAAR_BASIS[code] : null;
  if (!conv) return null;
  return { n: n * conv.f, b: conv.b, vaag: !eh };
};
// Prijs van een inkoopartikel per kilo, liter of stuk.
const artikelPerBasis = (a) => {
  if (!a) return null;
  const inh = parseMaat(a.inhoud);
  const prijs = eurNum(a.prijs), ppe = eurNum(a.ppe);
  if (prijs !== null && inh && inh.n > 0) return { prijs: prijs / inh.n, b: inh.b };
  if (ppe !== null && inh) return { prijs: ppe, b: inh.b };
  if (prijs !== null && !inh) return { prijs, b: "st" };
  return null;
};
const artikelScore = (iw, a) => {
  const aw = prijsWoorden(a.omschrijving);
  if (!iw.length || !aw.length) return 0;
  let punten = 0, sterk = 0, gemist = 0;
  for (const w of iw) {
    let beste = 0;
    for (const x of aw) { const p = woordScore(w, x); if (p > beste) beste = p; if (beste === 3) break; }
    if (beste >= 2) sterk++;
    if (!beste) gemist++;
    punten += beste;
  }
  if (!sterk) return 0; // minstens een woord moet echt kloppen ("grove mosterd" ~ "Mosterd grof")
  return punten * 100 - gemist * 40 - Math.abs(aw.length - iw.length); // meeste raak, kortste omschrijving
};
const zoekArtikel = (naam) => {
  const sleutel = zonderAccent(naam).toLowerCase().trim();
  if (!sleutel || !PRIJSLIJST.arts.length) return null;
  if (PRIJSLIJST.cache.has(sleutel)) return PRIJSLIJST.cache.get(sleutel);
  const iw = prijsWoorden(sleutel);
  let best = null, beste = 0;
  if (iw.length) for (const a of PRIJSLIJST.arts) { const sc = artikelScore(iw, a); if (sc > beste) { beste = sc; best = a; } }
  PRIJSLIJST.cache.set(sleutel, best);
  return best;
};
// Reken een hoeveelheid ("300 gr", "20 el", "2 st") om naar geld met een
// prijs per kilo, liter of stuk. Lepels, stuks en centimeters lopen via de
// gewichtentabel uit Werkwijze.
const kostUitBasis = (pb, naam, hoeveelheid) => {
  const maat = parseMaat(hoeveelheid);
  if (!pb || !maat || !(pb.prijs >= 0)) return null;
  let hoeveel = maat.n;
  if (maat.b !== pb.b) {
    const rij = maatVoor(naam);
    if (maat.b === "el" || maat.b === "tl") {
      // Bij een artikel per liter volstaat het volume; per kilo is het gewicht
      // uit de tabel nodig (onbekend ingredient: 15 gram per eetlepel).
      if (pb.b === "l") hoeveel = (maat.n * ML_PER_LEPEL[maat.b]) / 1000;
      else if (pb.b === "kg") {
        const gEl = maatGram(rij, "el") || 15;
        hoeveel = (maat.n * (maat.b === "el" ? gEl : gEl / 3)) / 1000;
      } else return null;
    } else if (maat.b === "cm") {
      const gCm = maatGram(rij, "cm");
      if (gCm === null || (pb.b !== "kg" && pb.b !== "l")) return null;
      hoeveel = (maat.n * gCm) / 1000;
    } else if (maat.b === "st") {
      const gSt = maatGram(rij, "stuk");
      if (gSt !== null && (pb.b === "kg" || pb.b === "l")) hoeveel = (maat.n * gSt) / 1000;
      // "1000" zonder eenheid bij een artikel per kilo of liter: dat zijn grammen of milliliters.
      else if (maat.vaag && (pb.b === "kg" || pb.b === "l") && maat.n >= 20) hoeveel = maat.n / 1000;
      else return null;
    } else return null;
  }
  return pb.prijs * hoeveel;
};
// Kostprijs van een ingredient: handmatig ingevuld wint, anders uit de prijslijst.
// Wat levert een batch op? Aantal maal hoeveelheid: 2 emmers van 4 kg is 8 kg.
const receptOpbrengst = (r) => {
  const rijen = (r && Array.isArray(r.yields) ? r.yields : []).filter((y) => y && (y.size || y.count));
  if (rijen.length) {
    let som = 0, basis = null;
    for (const y of rijen) {
      const maat = parseMaat(y.size);
      if (!maat) continue;
      const aantal = eurNum(y.count);
      const n = maat.n * (aantal && aantal > 0 ? aantal : 1);
      if (basis === null) basis = maat.b;
      if (maat.b !== basis) continue; // rijen in verschillende eenheden tellen niet op
      som += n;
    }
    if (basis && som > 0) return { n: som, b: basis };
  }
  return parseMaat(r && r.yieldAmount ? r.yieldAmount + " " + (r.yieldUnit || "") : (r && r.yield) || "");
};
const ingKost = (ing, diepte) => {
  const d = diepte || 0;
  const hand = eurNum(ing && ing.cost);
  if (hand !== null) return { bedrag: hand, auto: false, artikel: null, recept: subRecept(ing) };
  if (!ing) return { bedrag: null, auto: false, artikel: null };
  const sub = subRecept(ing);
  if (sub) {
    // Kostprijs van het ingevoegde recept, naar rato van de opbrengst.
    if (d > 3) return { bedrag: null, auto: false, artikel: null, recept: sub };
    const batch = receptKost(sub, d + 1);
    const leeg = { bedrag: null, auto: false, artikel: null, recept: sub };
    if (batch === null) return leeg;
    if (!String(ing.amount || "").trim()) return { bedrag: batch, auto: true, artikel: null, recept: sub };
    const opb = receptOpbrengst(sub);
    if (!opb || !opb.n) return leeg;
    const bedrag = kostUitBasis({ prijs: batch / opb.n, b: opb.b }, ing.item, ing.amount);
    return bedrag === null ? leeg : { bedrag, auto: true, artikel: null, recept: sub };
  }
  // Een vastgepind artikel wint; is dat verwijderd, dan zoekt de app weer zelf,
  // zodat een later ingelezen artikel het ingredient alsnog oppikt.
  const art = (ing.artikelCode ? PRIJSLIJST.arts.find((a) => a.code === ing.artikelCode) : null) || zoekArtikel(canoniekeNaam(ing.item)) || zoekArtikel(ing.item);
  const pb = artikelPerBasis(art);
  const maat = parseMaat(ing.amount);
  if (!art || !pb) return { bedrag: null, auto: false, artikel: art };
  const bedrag = kostUitBasis(pb, ing.item, ing.amount);
  return bedrag === null ? { bedrag: null, auto: false, artikel: art } : { bedrag, auto: true, artikel: art };
};
const ingKostBedrag = (ing, diepte) => ingKost(ing, diepte).bedrag;
const receptIngTotaal = (recipe, diepte) => {
  const lijst = (recipe && recipe.ingredients) || [];
  const bedragen = lijst.map((x) => ingKostBedrag(x, diepte)).filter((x) => x !== null);
  return { som: bedragen.reduce((a, b) => a + b, 0), geprijsd: bedragen.length, totaal: lijst.length };
};
// Kostprijs per batch: handmatig ingevuld wint, anders de ingredienten samen.
const receptKost = (recipe, diepte) => {
  const hand = eurNum(recipe && recipe.costPrice);
  if (hand !== null) return hand;
  if ((diepte || 0) > 3) return null;
  const t = receptIngTotaal(recipe, diepte || 0);
  return t.geprijsd ? t.som : null;
};
// ---- Namen van ingredienten gelijktrekken ----
// "eidooiers" en "eidooier" horen bij elkaar; de app rekent met het enkelvoud.
// Wat het team bewust anders schrijft komt in de uitzonderingenlijst en blijft staan.
const MEERVOUD_UIT = [
  { staart: "tjes", enkel: "tje" }, { staart: "jes", enkel: "je" },
  { staart: "eren", enkel: "" }, { staart: "en", enkel: "" }, { staart: "s", enkel: "" },
];
const enkelvoud = (naam) => {
  const t = String(naam || "").trim();
  if (t.length < 5) return t;
  const laag = t.toLowerCase();
  for (const r of MEERVOUD_UIT) {
    if (!laag.endsWith(r.staart)) continue;
    const stam = t.slice(0, t.length - r.staart.length) + r.enkel;
    if (stam.trim().length >= 3) return stam;
  }
  return t;
};
// Sleutel waaronder varianten samenvallen.
const naamSleutel = (naam) => zonderAccent(enkelvoud(naam)).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// Vaste koppelingen: schrijfwijzen die in de keuken hetzelfde product zijn.
// De tekst in de recepten blijft staan; de app rekent ze als één ingrediënt.
const VASTE_ALIASSEN = {
  "fijne suiker": "Suiker", "suiker (voor de pectine)": "Suiker", "suiker (vulling)": "Suiker",
  "suiker om te bestrooien": "Suiker", "suiker of rietsuiker": "Suiker",
  "zout (2,5%)": "Zout", "zout (2,5% van totaal)": "Zout", "zout (10%)": "Zout", "zout (3,5%)": "Zout",
  "zout (5%)": "Zout", "zout (3,5% van het water)": "Zout", "zeezout": "Zout", "grof zeezout": "Zout",
  "geklaarde boter": "Boter", "koude boter": "Boter", "zachte boter": "Boter", "gezouten boter, zacht": "Boter",
  "boter (voor de bodem)": "Boter", "boter (voor de vulling)": "Boter", "gesmolten boter": "Boter",
  "roomboter": "Boter", "ongezouten roomboter": "Boter", "margarine": "Boter",
  "extra vierge olijfolie": "Olijfolie",
  "knoflook, fijngehakt": "Knoflook", "knoflook, fijn": "Knoflook", "knoflooktenen, gepeld": "Knoflook",
  "room": "Slagroom", "room, ongezoet": "Slagroom", "room, gezoet": "Slagroom", "slagroom, ongezoet": "Slagroom",
  "koksroom": "Slagroom", "geslagen room": "Slagroom",
  "eidooiers": "Eidooier", "dooier": "Eidooier", "eigeel": "Eidooier",
  "olie": "Zonnebloemolie", "neutrale olie": "Zonnebloemolie", "ijskoude olie": "Zonnebloemolie",
  "ei": "Eieren", "ei (m)": "Eieren", "eieren, geklutst": "Eieren", "eieren, 1,5 uur gestoomd op 63 °c": "Eieren",
  "volle melk": "Melk",
  "gember, geraspt": "Gember", "verse gember, geraspt": "Gember", "gember, geschild en fijngehakt": "Gember",
  "rauwe honing": "Honing",
  "rozijnen, geweld": "Rozijnen",
  "rode peper": "Rode pepers", "rode pepers, fijngehakt": "Rode pepers", "chili": "Rode pepers",
  "rode pepers (fijne brunoise, zonder zaadlijst)": "Rode pepers", "rode pepers met zaadjes, grof gehakt": "Rode pepers",
  "uien": "Ui", "uien, grof gesneden": "Ui", "gesnipperde uien": "Ui", "gele ui, gesnipperd": "Ui",
  "dille, fijngehakt": "Dille", "dille, gehakt": "Dille",
  "basilicum, fijngesneden": "Basilicum", "basilicum, gehakt": "Basilicum", "verse basilicum": "Basilicum",
  "citroenen": "Citroen", "citroenen (rasp en sap)": "Citroen",
  "verse kruiden": "Kruiden", "verse groene kruiden": "Groene kruiden",
  "levende azijn of azijnmoeder": "Azijnmoeder", "azijnmoeder of levende azijn": "Azijnmoeder",
  "gedroogde kokos": "Kokos", "gemalen kokos": "Kokos",
  "munt, fijngehakt": "Munt",
  "oude kaas, geraspt": "Oude kaas",
  "suikerwater 1:1": "Suikerwater", "suikerwater": "Suikerwater",
};
let NAMEN = { canoniek: {}, uitzondering: new Set(), alias: {} };
const zetNamen = (recepten, uitzonderingen, aliassen) => {
  const tel = {};
  for (const r of recepten || []) for (const ing of (r && r.ingredients) || []) {
    const naam = String((ing && ing.item) || "").trim();
    if (!naam) continue;
    const sleutel = naamSleutel(naam);
    if (!sleutel) continue;
    if (!tel[sleutel]) tel[sleutel] = {};
    tel[sleutel][naam] = (tel[sleutel][naam] || 0) + 1;
  }
  const canoniek = {};
  for (const sleutel of Object.keys(tel)) {
    const vormen = Object.keys(tel[sleutel]);
    // Het enkelvoud wint; bij gelijke stand de vorm die het vaakst voorkomt.
    vormen.sort((a, b) => (a.length - b.length) || (tel[sleutel][b] - tel[sleutel][a]) || a.localeCompare(b, "nl"));
    canoniek[sleutel] = vormen[0];
  }
  const alias = {};
  for (const [van, naar] of Object.entries({ ...VASTE_ALIASSEN, ...(aliassen || {}) })) {
    const sleutel = naamSleutel(van);
    if (sleutel && naar) alias[sleutel] = naar;
  }
  NAMEN = { canoniek, uitzondering: new Set((uitzonderingen || []).map((x) => String(x).toLowerCase())), alias };
};
// De naam waaronder dit ingredient meetelt: eerst een samenvoeging van het team,
// dan de schrijfwijze die in de recepten het meest gangbaar is, anders enkelvoud.
const canoniekeNaam = (naam) => {
  const sleutel = naamSleutel(naam);
  if (!sleutel) return String(naam || "").trim();
  return NAMEN.alias[sleutel] || NAMEN.canoniek[sleutel] || enkelvoud(naam);
};
// Het schrijfwijze-voorstel voor een naam; null als er niets te corrigeren valt.
const naamVoorstel = (naam) => {
  const t = String(naam || "").trim();
  if (!t || NAMEN.uitzondering.has(t.toLowerCase())) return null;
  const doel = canoniekeNaam(t);
  return doel && doel.toLowerCase() !== t.toLowerCase() ? doel : null;
};

// ---- Porties ----
// Een recept levert een batch; porties zeggen voor hoeveel personen dat is.
// Staat het niet ingevuld, dan leidt de app het af uit de opbrengst en de soort.
const PORTIE_GRAM = [
  { woorden: ["soep", "bouillon", "consomme"], n: 0.25, b: "l" },
  { woorden: ["sap", "smoothie", "drank", "limonade", "shot"], n: 0.2, b: "l" },
  { woorden: ["saus", "dressing", "spread", "tapenade", "mayonaise", "pesto", "chutney", "jam", "confituur", "vinaigrette", "olie"], n: 0.04, b: "kg" },
  { woorden: ["creme", "ijs", "sorbet", "mousse", "dessert", "kwark", "yoghurt"], n: 0.05, b: "kg" },
  { woorden: ["ferment", "zuur", "pickle", "kimchi", "zuurkool", "garnituur", "kruidenrub", "rub", "poeder", "zout"], n: 0.05, b: "kg" },
  { woorden: ["vlees", "vis", "gehakt", "worst", "kip", "rund", "varken", "zalm", "eiwit"], n: 0.1, b: "kg" },
  { woorden: ["hoofdgerecht", "stoof", "curry", "pasta", "rijst", "risotto", "lasagne", "ovenschotel"], n: 0.2, b: "kg" },
];
const PORTIE_STANDAARD = { n: 0.15, b: "kg" }; // groente en bijgerechten
const portieMaat = (r) => {
  const tekst = zonderAccent([r && r.name, r && r.baseName, r && r.category].filter(Boolean).join(" ")).toLowerCase();
  for (const regel of PORTIE_GRAM) if (regel.woorden.some((w) => tekst.indexOf(w) >= 0)) return regel;
  return PORTIE_STANDAARD;
};
// Hoeveel gaat er standaard in een portie? Per recept aan te passen.
const portieStandaard = (r) => {
  const eigen = parseMaat(r && r.portionSize);
  if (eigen && eigen.n > 0) return { n: eigen.n, b: eigen.b, eigen: true };
  const maat = portieMaat(r);
  return { n: maat.n, b: maat.b, eigen: false };
};
const portieStandaardTekst = (r) => {
  const p = portieStandaard(r);
  return p.b === "l" ? (p.n >= 1 ? String(p.n).replace(".", ",") + " l" : Math.round(p.n * 1000) + " ml") : (p.n >= 1 ? String(p.n).replace(".", ",") + " kg" : Math.round(p.n * 1000) + " g");
};
const receptPorties = (r) => {
  if (!r) return null;
  const eigen = parseFloat(String(r.portions == null ? "" : r.portions).replace(",", "."));
  if (!isNaN(eigen) && eigen > 0) return eigen;
  // "4 porties" staat vaak letterlijk in de opbrengst
  const tekst = zonderAccent((r.yield || "") + " " + (r.yieldUnit || "")).toLowerCase();
  const mPort = tekst.match(/(\d+(?:[.,]\d+)?)\s*porti/);
  if (mPort) { const n = parseFloat(mPort[1].replace(",", ".")); if (n > 0) return n; }
  const opb = receptOpbrengst(r);
  if (!opb) return null;
  if (opb.b === "st") return opb.n > 0 ? opb.n : null; // stuks: een stuk is een portie
  const maat = portieStandaard(r);
  if (maat.b !== opb.b) return null;
  const n = opb.n / maat.n;
  return n > 0 ? Math.max(1, Math.round(n)) : null;
};
// Kostprijs van een portie: batchprijs gedeeld door het aantal porties.
const receptPortieKost = (r, diepte) => {
  const batch = receptKost(r, diepte);
  const porties = receptPorties(r);
  return batch === null || !porties ? null : batch / porties;
};
// Een gerecht is een setje recepten met een eigen portie-aantal.
const gerechtBatch = (d, recipeById) => {
  const bedragen = ((d && d.recipeIds) || []).map((id) => { const r = recipeById ? recipeById(id) : receptById(id); return r ? receptKost(r) : null; }).filter((x) => x !== null);
  return bedragen.length ? bedragen.reduce((a, b) => a + b, 0) : null;
};
const gerechtPorties = (d, recipeById) => {
  const eigen = parseFloat(String((d && d.portions) == null ? "" : d.portions).replace(",", "."));
  if (!isNaN(eigen) && eigen > 0) return eigen;
  // Zonder eigen aantal: het krappste recept bepaalt hoe ver het gerecht reikt.
  const ns = ((d && d.recipeIds) || []).map((id) => receptPorties(recipeById ? recipeById(id) : receptById(id))).filter((x) => x);
  return ns.length ? Math.min(...ns) : null;
};
const gerechtPortieKost = (d, recipeById) => {
  const batch = gerechtBatch(d, recipeById);
  const porties = gerechtPorties(d, recipeById);
  return batch === null || !porties ? null : batch / porties;
};

// ---- Items ----
// Een item (Sandwich, Soepje) is opgebouwd uit recepten, gerechten en losse
// ingredienten, en kost een bedrag per persoon. Items zijn herbruikbaar over
// producten heen; ze staan in een module-variabele zodat elk scherm ze kan lezen.
let ITEMS = { perId: {} };
const zetItems = (xs) => { const m = {}; for (const x of xs || []) if (x && x.id) m[x.id] = x; ITEMS = { perId: m }; };
const itemById = (id) => (id && ITEMS.perId[id]) || null;
const normRegel = (x) => ({
  soort: (x && x.soort) || "ingredient", refId: (x && x.refId) || null, naam: (x && x.naam) || "",
  aantal: x && x.aantal != null && String(x.aantal).trim() !== "" ? String(x.aantal) : "1",
  perPrijs: x && x.perPrijs != null ? String(x.perPrijs) : "", perEenheid: (x && x.perEenheid) || "kg",
  hoeveel: x && x.hoeveel != null ? String(x.hoeveel) : "", artikelCode: (x && x.artikelCode) || null,
});
const normGedeeldItem = (x) => ({
  id: (x && x.id) || null, name: (x && x.name) || "",
  regels: Array.isArray(x && x.regels) ? x.regels.map(normRegel) : [],
  cost: x && x.cost != null ? String(x.cost) : "", notes: (x && x.notes) || "",
});
// Wat een regel per persoon kost.
const regelKost = (g, recipeById, dishById) => {
  const aantal = eurNum(g && g.aantal);
  const maal = aantal === null || aantal <= 0 ? 1 : aantal;
  if (!g) return null;
  if (g.soort === "recept") {
    const r = recipeById ? recipeById(g.refId) : receptById(g.refId);
    const p = r ? receptPortieKost(r) : null;
    return p === null ? null : p * maal;
  }
  if (g.soort === "gerecht") {
    const d = dishById ? dishById(g.refId) : null;
    const p = d ? gerechtPortieKost(d, recipeById) : null;
    return p === null ? null : p * maal;
  }
  const bedrag = prodIngKost(g);
  return bedrag === null ? null : bedrag * maal;
};
// Kostprijs per persoon van een gedeeld item: handmatig wint, anders de regels.
const gedeeldItemKost = (it, recipeById, dishById) => {
  const hand = eurNum(it && it.cost);
  if (hand !== null) return hand;
  const b = ((it && it.regels) || []).map((g) => regelKost(g, recipeById, dishById)).filter((x) => x !== null);
  return b.length ? b.reduce((a, c) => a + c, 0) : null;
};

// Kostprijs van een assortimentsitem en van een heel product.
// Een los ingredient onder een item: prijs per kilo/liter/stuk maal de hoeveelheid.
const prodIngKost = (g) => {
  const p = eurNum(g && g.perPrijs);
  if (p === null) return null;
  return kostUitBasis({ prijs: p, b: (g && g.perEenheid) || "kg" }, g && g.naam, g && g.hoeveel);
};
const itemIngTotaal = (it) => {
  const b = ((it && it.ings) || []).map(prodIngKost).filter((x) => x !== null);
  return b.length ? b.reduce((a, c) => a + c, 0) : null;
};
// Handmatig ingevuld wint, dan een gedeeld item, dan de losse ingredienten.
const itemKostVan = (it, recipeById, dishById) => {
  const hand = eurNum(it && it.cost);
  if (hand !== null) return hand;
  const gedeeld = it && it.itemId ? itemById(it.itemId) : null;
  if (gedeeld) return gedeeldItemKost(gedeeld, recipeById, dishById);
  return itemIngTotaal(it);
};
const productKost = (p, recipeById, dishById) => {
  const hand = eurNum(p && p.cost);
  if (hand !== null) return hand;
  const bedragen = ((p && p.items) || []).map((x) => itemKostVan(normItem(x), recipeById, dishById)).filter((x) => x !== null);
  return bedragen.length ? bedragen.reduce((a, b) => a + b, 0) : null;
};

function printAssortimentProduct(p, recipeById) {
  const esc = (t) => String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const k = productKost(p, recipeById), v = eurNum(p.price);
  const items = (p.items || []).map(normItem).filter((x) => String(x.text).trim()).map((x) => ({ ...x, bedrag: itemKostVan(x, recipeById) }));
  printHtmlInPagina('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(p.name) + '</title><style>' +
    "@page{size:A4;margin:18mm}body{font-family:Georgia,serif;color:#2c2e24}" +
    "h1{font-size:26pt;margin:0 0 2mm}.sub{color:#6b6d5f;font-size:11pt;margin-bottom:8mm}" +
    "table{border-collapse:collapse;margin-bottom:8mm}td{padding:1.5mm 8mm 1.5mm 0;font-size:12pt}" +
    "ul{margin:2mm 0 0;padding-left:6mm}li{font-size:12pt;margin:1.2mm 0}h2{font-size:13pt;margin:6mm 0 1mm}" +
    "</style></head><body>" +
    "<h1>" + esc(p.name) + "</h1>" +
    '<div class="sub">' + [[p.doel, p.cat].filter(Boolean).map(esc).join(" · "), p.fromP || p.toP ? "Vanaf " + esc(p.fromP || "?") + " tot " + esc(p.toP || "?") + " personen" : ""].filter(Boolean).join(" · ") + "</div>" +
    "<table>" +
    (k !== null ? "<tr><td>Kostprijs p.p.</td><td><b>" + eur(k) + "</b></td></tr>" : "") +
    (v !== null ? "<tr><td>Verkoopprijs p.p.</td><td><b>" + eur(v) + "</b></td></tr>" : "") +
    (k !== null && v !== null && k > 0 ? "<tr><td>Marge</td><td>" + Math.round(((v - k) / k) * 100) + "% op kostprijs</td></tr>" : "") +
    "</table>" +
    (items.length ? "<h2>Items</h2><ul>" + items.map((i) => "<li>" + esc(i.text) + (i.bedrag !== null ? ' <span style="color:#666">— ' + eur(i.bedrag) + "</span>" : "") + "</li>").join("") + "</ul>" : "") +
    (items.some((i) => i.bedrag !== null) ? '<p style="font-size:12pt"><b>Items samen: ' + eur(items.map((i) => i.bedrag).filter((x) => x !== null).reduce((a, b) => a + b, 0)) + "</b></p>" : "") +
    (p.notes ? "<h2>Opmerkingen</h2><p style=\"font-size:12pt;white-space:pre-wrap\">" + esc(p.notes) + "</p>" : "") +
    "</body></html>");
}

// Een artikel bewerken — hetzelfde formulier voor een ingelezen leveranciersartikel
// en voor een ingrediënt uit de recepten waar nog geen prijs bij hoort.
function ArtikelForm({ a, nieuw, leveranciers, catsPerLev, onSave, onSluit }) {
  const [naam, setNaam] = useState(a.omschrijving || "");
  const [lev, setLev] = useState(a.leverancier || leveranciers[0] || "Eigen prijzen");
  const [levNieuw, setLevNieuw] = useState("");
  const [cat, setCat] = useState(a.categorie || "Overig");
  const [catNieuw, setCatNieuw] = useState("");
  const [inhoud, setInhoud] = useState(a.inhoud || "1 kg");
  const [prijs, setPrijs] = useState(a.prijs == null ? "" : String(a.prijs));
  const [per, setPer] = useState(() => { const pb = artikelPerBasis(a); return pb ? pb.prijs.toFixed(2) : ""; });
  const [opm, setOpm] = useState(a.opmerking || "");
  const maat = parseMaat(inhoud);
  const basis = maat ? maat.b : "kg";
  const twee = (n) => (n === null || !isFinite(n) ? "" : n.toFixed(2));
  // Prijs en prijs per kilo/liter/stuk houden elkaar bij.
  const zetPrijs = (v) => { setPrijs(v); const p = eurNum(v); setPer(maat && maat.n > 0 && p !== null ? twee(p / maat.n) : ""); };
  const zetPer = (v) => { setPer(v); const q = eurNum(v); setPrijs(maat && maat.n > 0 && q !== null ? twee(q * maat.n) : ""); };
  const zetInhoud = (v) => { setInhoud(v); const m = parseMaat(v), p = eurNum(prijs); setPer(m && m.n > 0 && p !== null ? twee(p / m.n) : ""); };
  const levKeuze = levNieuw.trim() || lev;
  const bewaar = () => {
    if (!naam.trim()) { alert("Vul een naam in."); return; }
    if (!maat) { alert("Vul een inkoopeenheid in die de app kan lezen, bijvoorbeeld 1 kg, 5 l of 10 st."); return; }
    if (eurNum(prijs) === null) { alert("Vul een prijs in."); return; }
    onSave({
      ...a,
      code: nieuw ? "eigen:" + zonderAccent(naam).toLowerCase().trim() : a.code,
      omschrijving: naam.trim(), leverancier: levKeuze || "Eigen prijzen", categorie: catNieuw.trim() || cat || "Overig",
      inhoud: inhoud.trim(), prijs: eurNum(prijs), ppe: eurNum(per), opmerking: opm.trim(),
    });
    onSluit();
  };
  const veld = "input px-2.5 py-2 w-full text-sm";
  const kop = "text-[11.5px] font-bold ink mb-1";
  return (
    <div className="mt-2.5 pt-2.5" style={{ borderTop: "1px solid " + T.line }}>
      <div className="mb-2">
        <div className={kop}>Naam</div>
        <input className={veld} value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="bv. Aardbeien" />
      </div>
      <div className="mb-2">
        <div>
          <div className={kop}>Leverancier</div>
          <AppSelect value={levNieuw ? "__nieuw" : lev} onChange={(v) => { if (v === "__nieuw") setLevNieuw(" "); else { setLevNieuw(""); setLev(v); } }}
            options={[...leveranciers.map((x) => ({ value: x, label: x })), { value: "__nieuw", label: "Nieuwe leverancier…" }]}
            className={veld} placeholder="Kies" />
          {levNieuw !== "" && <input className={veld + " mt-1"} value={levNieuw.trim()} onChange={(e) => setLevNieuw(e.target.value || " ")} placeholder="Naam leverancier" />}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <div className={kop}>Inkoopeenheid</div>
          <input className={veld} value={inhoud} onChange={(e) => zetInhoud(e.target.value)} placeholder="1 kg" />
        </div>
        <div>
          <div className={kop}>Prijs (€)</div>
          <input type="text" inputMode="decimal" className={veld} value={prijs} onChange={(e) => zetPrijs(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="12,50" />
        </div>
        <div>
          <div className={kop}>Per {basis} (€)</div>
          <input type="text" inputMode="decimal" className={veld} value={per} onChange={(e) => zetPer(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="—" />
        </div>
      </div>
      <div className="mb-2">
        <div className={kop}>Opmerking</div>
        <textarea rows={2} className={veld} value={opm} onChange={(e) => setOpm(e.target.value)} placeholder="bv. alleen op bestelling, of komt uit eigen tuin" />
      </div>
      <div className="flex justify-end">
        <button onClick={bewaar} className="btnp ff shrink-0 rounded-lg text-xs font-semibold px-3 py-2.5">Bewaren</button>
      </div>
    </div>
  );
}

// Eén regel in de lijst: een ingelezen artikel of een ingrediënt zonder prijs.
function ArtikelRegel({ a, nieuw, sub, gebruik, leveranciers, catsPerLev, onSave, onDelete, onNegeer, onSamenvoegen }) {
  const [open, setOpen] = useState(false);
  const [weg, setWeg] = useState(false);
  const pb = artikelPerBasis(a);
  return (
    <div className="card px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm ink font-medium truncate">{a.omschrijving}</div>
          <div className="text-[12px] mute truncate">{sub || (a.inhoud ? "Inkoopeenheid: " + a.inhoud : "")}</div>
          {a.opmerking && !open && <div className="text-[12px] mt-0.5" style={{ color: "#6a5326" }}>{a.opmerking}</div>}
        </div>
        {!nieuw && (
          <div className="text-right shrink-0">
            <div className="text-sm ink font-semibold">{eur(a.prijs)}</div>
            <div className="text-[12px] mute">{pb ? eur(pb.prijs) + " p/" + pb.b : ""}</div>
          </div>
        )}
        <button onClick={() => setOpen((o) => !o)} className="ff shrink-0 mute hover:opacity-60 p-1" title={nieuw ? "Prijs invullen" : "Bewerken"}><Pencil size={15} /></button>
        {!nieuw && <button onClick={() => setWeg(true)} className="ff shrink-0 mute hover:opacity-60 p-1" title="Verwijderen"><Trash2 size={15} /></button>}
        {nieuw && onSamenvoegen && <button onClick={() => onSamenvoegen()} className="ff shrink-0 mute hover:opacity-60 p-1" title="Samenvoegen met een andere naam"><Layers size={15} /></button>}
        {nieuw && onNegeer && <button onClick={() => setWeg(true)} className="ff shrink-0 mute hover:opacity-60 p-1" title="Uit deze lijst halen"><Trash2 size={15} /></button>}
      </div>
      {open && <ArtikelForm a={a} nieuw={nieuw} leveranciers={leveranciers} catsPerLev={catsPerLev} onSave={onSave} onSluit={() => setOpen(false)} />}
      {weg && (
        <BevestigModal titel={nieuw ? "Uit de lijst halen" : "Artikel verwijderen"} knop={nieuw ? "Weghalen" : "Verwijderen"}
          tekst={nieuw
            ? '"' + a.omschrijving + '" verdwijnt uit deze lijst. In de recepten verandert er niets; het krijgt alleen geen inkoopprijs.'
            : '"' + a.omschrijving + '" verdwijnt uit de lijst voor het hele team.' + (gebruik ? " Het staat nu in " + gebruik + " recept" + (gebruik === 1 ? "" : "en") + "; daar valt de kostprijs weg." : "")}
          onCancel={() => setWeg(false)} onOk={() => { setWeg(false); if (nieuw && onNegeer) onNegeer(); else onDelete(a.code); }} />
      )}
    </div>
  );
}

// Twee schrijfwijzen van hetzelfde ingredient onder een naam brengen.
function SamenvoegKiezer({ van, opties, onKies, onSluit }) {
  const [q, setQ] = useState("");
  const hits = (opties || []).filter((x) => x.naam.toLowerCase() !== String(van).toLowerCase() && (!q.trim() || softMatchAny([x.naam], q))).slice(0, 40);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }} onClick={onSluit}>
      <div className="w-full max-w-md rounded-2xl p-4 flex flex-col" style={{ background: T.paper, maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="serif ink text-xl leading-tight">"{van}" samenvoegen</div>
        <p className="text-[12px] mute mt-1 mb-2">Kies onder welke naam dit voortaan meetelt. In de recepten verandert de tekst niet; de app rekent er alleen mee als dezelfde naam, dus ook met dezelfde inkoopprijs.</p>
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek de naam waaronder het hoort" className="input px-3 py-2.5 w-full text-sm pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {hits.length === 0 && <p className="text-[12.5px] mute">Niets gevonden.</p>}
          {hits.map((x) => (
            <button key={x.naam} type="button" onClick={() => onKies(x.naam)} className="ff card cardh w-full text-left px-3 py-2">
              <div className="text-sm ink truncate">{x.naam}</div>
              <div className="text-[12px] mute truncate">{x.prijs ? "inkoopartikel · " + x.prijs : "ingrediënt zonder prijs — dan blijft het zonder prijs"}</div>
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={onSluit} className="ff rounded-lg px-3 py-2 text-sm font-medium mute hover:opacity-70" style={{ border: "1px solid " + T.line }}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}

// Uitleg voor wie hier voor het eerst komt.
function CalcUitleg({ onSluit }) {
  const kop = (t) => <div className="serif ink text-base mt-3 mb-1">{t}</div>;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }} onClick={onSluit}>
      <div className="w-full max-w-lg rounded-2xl p-5 overflow-y-auto" style={{ background: T.paper, maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="serif ink text-xl leading-tight">Zo werkt calculeren</div>
        <p className="text-[13px] mute mt-1.5 leading-relaxed">Alles rekent naar één getal: wat kost dit per persoon. Dat gebeurt in vier stappen, van onder naar boven.</p>

        {kop("1 · Inkoopartikelen")}
        <p className="text-[13px] ink leading-relaxed">Lees een prijslijst van een leverancier in, of maak zelf een artikel aan. De app rekent uit wat één kilo, liter of stuk kost: een doos van 8 × 500 gr voor € 26,53 is € 6,63 per kilo. Klopt een prijs niet meer, dan pas je 'm hier aan en rekent alles opnieuw door.</p>

        {kop("2 · Recepten")}
        <p className="text-[13px] ink leading-relaxed">Elk ingrediënt in een recept zoekt zelf zijn artikel op naam. Tik op het euroteken naast een ingrediënt om te zien waar de prijs vandaan komt, een ander artikel te kiezen of er zelf een te maken. Onderaan het recept staat wat de hele batch kost.</p>
        <p className="text-[13px] ink leading-relaxed mt-1">Vul bij <b>Porties</b> in voor hoeveel personen die batch is. Dat is het scharnierpunt: batch gedeeld door porties is de prijs per portie, en daarmee rekent al het volgende.</p>

        {kop("3 · Items")}
        <p className="text-[13px] ink leading-relaxed">Een item is een bouwsteen die je vaker gebruikt: een sandwich, een soepje. Je zet er recepten, gerechten of losse ingrediënten in, elk met hoeveel porties per persoon. Eén sandwich = 1 portie kruidenspread + 100 g desembrood = € 0,98 per persoon. Pas je het recept aan, dan verandert het item mee.</p>

        {kop("4 · Producten")}
        <p className="text-[13px] ink leading-relaxed">Een product is wat de gast koopt: Lichte lunch, Borrel compleet. Je hangt er items aan; de kostprijs per persoon is die items bij elkaar. Daarnaast vul je de verkoopprijs in, en de app laat de marge zien. Producten staan gesorteerd op bestemming en categorie.</p>

        {kop("Als er geen prijs verschijnt")}
        <p className="text-[13px] ink leading-relaxed">Onderaan deze pagina staat <b>Ingrediënten zonder prijs</b>: alles wat in de recepten voorkomt waar de app geen artikel bij vindt. Vul er een leverancier, eenheid en prijs bij in, of haal de regel weg als het geen inkoopartikel is. Staat er "eenheid niet om te rekenen", dan weet de app niet wat een stuk of een lepel weegt; dat vul je aan in de gewichtentabel onder Werkwijze.</p>

        <div className="flex justify-end mt-4">
          <button onClick={onSluit} className="btnp ff rounded-lg px-4 py-2 text-sm font-semibold">Duidelijk</button>
        </div>
      </div>
    </div>
  );
}

function AssortimentList({ producten, bdArtikelen, recipeById, recipes, dishes, dishById, calcItems, negeer, onNegeer, onSamenvoegen, aliassen, onNewItem, onEditItem, onDeleteItem, onImportProducten, onNew, onEdit, onDelete, onImport, onUpdateArtikel, onDeleteArtikel, onHernoem }) {
  const [q, setQ] = useState("");
  const importRef = React.useRef(null);
  const prodRef = React.useRef(null);
  const [openLev, setOpenLev] = useState({});
  const [hernoem, setHernoem] = useState(null); // {soort, oud, leverancier}
  const [openDoel, setOpenDoel] = useState({});
  const [itemWeg, setItemWeg] = useState(null);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [nieuwArtikel, setNieuwArtikel] = useState(false);
  const [help, setHelp] = useState(false);
  const [samenvoegen, setSamenvoegen] = useState(null);
  const [openCat2, setOpenCat2] = useState({});
  const [alleOntbrekend, setAlleOntbrekend] = useState(false);
  const [qOntbreek, setQOntbreek] = useState("");
  // Ingredienten uit de recepten waar geen prijs bij te vinden is.
  const negeerSet = new Set((negeer || []).map((x) => String(x).toLowerCase()));
  const ontbrekend = React.useMemo(() => {
    const map = {};
    for (const r of recipes || []) {
      for (const ing of r.ingredients || []) {
        const naam = String(ing.item || "").trim();
        if (!naam) continue;
        if (negeerSet.has(naam.toLowerCase())) continue;
        const kk = ingKost(ing);
        // Zodra er een artikel met een prijs aan hangt, hoort het ingredient bij
        // die leverancier en niet meer in deze lijst — ook als de eenheid nog
        // niet om te rekenen is; dat zie je dan in het recept zelf.
        if (kk.bedrag !== null || (kk.artikel && artikelPerBasis(kk.artikel))) continue;
        // Groeperen op de naam waaronder het meetelt, dus na samenvoegen:
        // alle zoutpercentages vallen samen onder "Zout".
        const toon = canoniekeNaam(naam);
        const sleutel = naamSleutel(toon) || String(toon).toLowerCase();
        if (!map[sleutel]) map[sleutel] = { naam: toon, aantal: 0, artikel: kk.artikel || null, voorbeeld: String(ing.amount || "").trim() };
        map[sleutel].aantal++;
        if (!map[sleutel].artikel && kk.artikel) map[sleutel].artikel = kk.artikel;
      }
    }
    return Object.values(map).sort((a, b) => b.aantal - a.aantal || a.naam.localeCompare(b.naam, "nl"));
  }, [recipes, bdArtikelen, negeer, aliassen]);
  // Hoe vaak hangt een artikel aan een recept — voor de waarschuwing bij verwijderen.
  const gebruikPerArtikel = React.useMemo(() => {
    const t = {};
    for (const r of recipes || []) {
      const gezien = {};
      for (const ing of r.ingredients || []) {
        const art = ingKost(ing).artikel || (String(ing.item || "").trim() ? zoekArtikel(ing.item) : null);
        if (art && !gezien[art.code]) { gezien[art.code] = 1; t[art.code] = (t[art.code] || 0) + 1; }
      }
    }
    return t;
  }, [recipes, bdArtikelen, aliassen]);
  const ontbreekHits = qOntbreek.trim().length >= 2 ? ontbrekend.filter((x) => softMatchAny([x.naam], qOntbreek)) : ontbrekend;
  const ontbreekToon = alleOntbrekend ? ontbreekHits : ontbreekHits.slice(0, 25);
  const hits = q.trim().length >= 2
    ? bdArtikelen.filter((a) => strictMatchAny([a.omschrijving], q)).slice(0, 30)
    : [];
  // Alles gegroepeerd per leverancier en daarbinnen per categorie.
  const perLev = {};
  for (const a of bdArtikelen) {
    const lev = a.leverancier || "Onbekende leverancier";
    const cat = a.categorie || "Overig";
    if (!perLev[lev]) perLev[lev] = {};
    if (!perLev[lev][cat]) perLev[lev][cat] = [];
    perLev[lev][cat].push(a);
  }
  const levs = Object.keys(perLev).sort((x, y) => x.localeCompare(y, "nl"));
  const levKeuzes = [...new Set([...levs, ...VASTE_LEVERANCIERS, "Eigen prijzen"])];
  const catsPerLev = {};
  for (const l of levs) catsPerLev[l] = Object.keys(perLev[l]).sort((x, y) => x.localeCompare(y, "nl"));
  return (
    <div>
      <div className="rounded-xl p-3 mb-4 text-[13px]" style={{ background: "#eef2e6", border: "1px solid #d5ddc6", color: "#44502f" }}>
        Chef-modus — dit tabblad en alle prijzen zijn alleen zichtbaar in deze sessie.
      </div>
      {producten.length === 0 && <div className="card p-4 text-sm mute mb-4">Nog geen producten. Maak er een met de knop rechtsonder, of lees een lijst in.</div>}
      <div className="flex justify-end mb-2">
        <button onClick={() => { if (prodRef.current) { prodRef.current.value = ""; prodRef.current.click(); } }} className="ff inline-flex items-center gap-1.5 text-[12.5px] font-medium acc hover:opacity-70"><Download size={13} /> Producten inlezen (.json)</button>
        <input ref={prodRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onImportProducten(f); }} />
      </div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-bold ink">Producten <span className="mute font-normal">· {producten.length}</span></span>
        <button onClick={() => setHelp(true)} className="ff inline-flex items-center gap-1.5 text-[12.5px] font-medium acc hover:opacity-70"><Info size={14} /> Hoe werkt deze pagina?</button>
      </div>
      {help && <CalcUitleg onSluit={() => setHelp(false)} />}
      {(() => {
        // Producten in twee lagen: waarvoor (catering, landgoed, MK) en daarbinnen
        // de productcategorie (lunch, borrel, diner, losse items).
        const perDoel = {};
        for (const p of producten) {
          const d = p.doel || "Zonder bestemming";
          const c = p.cat || "Overig";
          if (!perDoel[d]) perDoel[d] = {};
          if (!perDoel[d][c]) perDoel[d][c] = [];
          perDoel[d][c].push(p);
        }
        const rang = (lijst, x) => { const i = lijst.indexOf(x); return i < 0 ? lijst.length : i; };
        const doelen = Object.keys(perDoel).sort((x, y) => rang(DOELEN, x) - rang(DOELEN, y) || x.localeCompare(y, "nl"));
        return (
          <div className="space-y-2">
            {doelen.map((d) => {
              const cats = Object.keys(perDoel[d]).sort((x, y) => rang(PRODUCT_CATS, x) - rang(PRODUCT_CATS, y) || x.localeCompare(y, "nl"));
              const aantal = cats.reduce((n, c) => n + perDoel[d][c].length, 0);
              const uit = !!openDoel[d];
              return (
                <div key={d}>
                  <button onClick={() => setOpenDoel((o) => ({ ...o, [d]: !o[d] }))} className="ff card cardh w-full text-left px-3.5 py-3 flex items-center gap-2">
                    <span className="flex-1 min-w-0">
                      <span className="block serif ink font-bold text-lg leading-tight truncate">{d}</span>
                      <span className="block text-[12px] mute">{aantal} product{aantal === 1 ? "" : "en"} · {cats.length} categorie{cats.length === 1 ? "" : "ën"}</span>
                    </span>
                    {uit ? <ChevronUp size={16} className="mute shrink-0" /> : <ChevronDown size={16} className="mute shrink-0" />}
                  </button>
                  {uit && (
                    <div className="mt-1.5 ml-2 space-y-1.5">
                      {cats.map((c) => {
                        const sleutel = d + "|" + c;
                        const open = !!openCat2[sleutel];
                        return (
                          <div key={sleutel}>
                            <button onClick={() => setOpenCat2((o) => ({ ...o, [sleutel]: !o[sleutel] }))} className="ff w-full text-left px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: "#eef2e6", color: "#44502f" }}>
                              <span className="flex-1 min-w-0 text-[13px] font-semibold truncate">{c}</span>
                              <span className="text-[12px] shrink-0" style={{ opacity: 0.7 }}>{perDoel[d][c].length}</span>
                              {open ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
                            </button>
                            {open && (
                              <div className="space-y-2 mt-1.5 ml-2">
                                {perDoel[d][c].map((p) => {
                                  const k = productKost(p, recipeById), v = eurNum(p.price);
                                  const auto = eurNum(p.cost) === null && k !== null;
                                  const items = (p.items || []).map((x) => (typeof x === "string" ? x : x.text)).filter((x) => String(x).trim());
                                  return (
                                    <div key={p.id} className="card p-4">
                                      <div className="flex items-start justify-between gap-2">
                                        <button onClick={() => onEdit(p.id)} className="ff text-left min-w-0 flex-1">
                                          <div className="serif ink font-bold text-lg leading-tight">{p.name}</div>
                                          <div className="text-[13px] mute mt-0.5">{p.fromP || p.toP ? "Vanaf " + (p.fromP || "?") + " tot " + (p.toP || "?") + " personen" : "Aantal personen niet ingevuld"}</div>
                                        </button>
                                        <div className="flex shrink-0 gap-1">
                                          <button onClick={() => printAssortimentProduct(p, recipeById)} className="ff mute hover:opacity-60 p-1.5" title="Printen"><Printer size={16} /></button>
                                          <button onClick={() => onEdit(p.id)} className="ff mute hover:opacity-60 p-1.5" title="Bewerken"><Pencil size={16} /></button>
                                          <button onClick={() => onDelete(p.id)} className="ff mute hover:opacity-60 p-1.5" title="Verwijderen"><Trash2 size={16} /></button>
                                        </div>
                                      </div>
                                      <div className="text-sm ink mt-2">
                                        Kost <span className="font-semibold">{eur(k)}</span> p.p.{auto && <span className="mute"> (items samen)</span>} · Verkoop <span className="font-semibold">{eur(v)}</span> p.p.
                                        {k !== null && v !== null && k > 0 && <span className="mute"> · marge {Math.round(((v - k) / k) * 100)}%</span>}
                                      </div>
                                      {items.length > 0 && <div className="text-[13px] mute mt-1.5">{items.slice(0, 6).join(" · ")}{items.length > 6 ? " +" + (items.length - 6) : ""}</div>}
                                      {p.notes && <div className="text-[12.5px] mt-1.5" style={{ color: "#6a5326" }}>{p.notes}</div>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      <div className="flex items-center justify-between gap-2 mt-7 mb-1.5">
        <button onClick={() => setItemsOpen((o) => !o)} className="ff inline-flex items-center gap-1.5 text-sm font-bold ink hover:opacity-70">
          {itemsOpen ? <ChevronUp size={15} className="mute" /> : <ChevronDown size={15} className="mute" />}
          Items <span className="mute font-normal">· {(calcItems || []).length}</span>
        </button>
        <button onClick={onNewItem} className="btno ff inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-2.5 py-1.5"><Plus size={13} /> Nieuw item</button>
      </div>
      {itemsOpen && <p className="text-[12px] mute mb-2">Bouwstenen die je in meerdere producten gebruikt — een sandwich, een soepje. Ze rekenen per persoon met de porties van hun recepten en gerechten.</p>}
      {!itemsOpen ? null : (calcItems || []).length === 0 ? (
        <div className="card p-4 text-sm mute">Nog geen items.</div>
      ) : (
        <div className="space-y-1.5">
          {[...calcItems].sort((a, b) => String(a.name).localeCompare(String(b.name), "nl")).map((it) => {
            const k = gedeeldItemKost(it, recipeById, dishById);
            const inProducten = producten.filter((p) => (p.items || []).some((x) => x && x.itemId === it.id)).length;
            return (
              <div key={it.id} className="card px-3 py-2.5 flex items-center gap-2">
                <button onClick={() => onEditItem(it.id)} className="ff text-left min-w-0 flex-1">
                  <div className="text-sm ink font-medium truncate">{it.name}</div>
                  <div className="text-[12px] mute truncate">{(it.regels || []).length} onderdel{(it.regels || []).length === 1 ? "" : "en"}{inProducten ? " · in " + inProducten + " product" + (inProducten === 1 ? "" : "en") : ""}</div>
                </button>
                <span className="text-sm font-semibold shrink-0" style={{ color: "#44502f" }}>{eur(k)}</span>
                <button onClick={() => onEditItem(it.id)} className="ff shrink-0 mute hover:opacity-60 p-1"><Pencil size={15} /></button>
                <button onClick={() => setItemWeg({ id: it.id, naam: it.name, aantal: inProducten })} className="ff shrink-0 mute hover:opacity-60 p-1"><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
      )}
      {itemWeg && (
        <BevestigModal titel="Item verwijderen" knop="Verwijderen"
          tekst={'"' + itemWeg.naam + '" verdwijnt voor het hele team.' + (itemWeg.aantal ? " Het zit in " + itemWeg.aantal + " product" + (itemWeg.aantal === 1 ? "" : "en") + " en wordt daar ook weggehaald." : "")}
          onCancel={() => setItemWeg(null)} onOk={() => { onDeleteItem(itemWeg.id); setItemWeg(null); }} />
      )}

      <div className="flex items-center justify-between gap-2 mt-7 mb-2">
        <span className="text-sm font-bold ink">Inkoopartikelen <span className="mute font-normal">· {bdArtikelen.length}</span></span>
        <button onClick={() => setNieuwArtikel(true)} className="btno ff inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-2.5 py-1.5"><Plus size={13} /> Artikel</button>
        <button onClick={() => { if (importRef.current) { importRef.current.value = ""; importRef.current.click(); } }} className="btno ff inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-2.5 py-1.5"><Download size={13} /> Prijslijst inlezen</button>
        <input ref={importRef} type="file" accept=".xlsx,.xls,.csv,.txt,.tsv" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onImport(f); }} />
      </div>
      <p className="text-[12px] mute mb-2">Excel (.xlsx/.xls) of tekst (.csv/.txt) van welke leverancier dan ook, zolang er een omschrijving- en prijskolom in staat. Deze prijzen rekenen automatisch door naar de ingrediënten van elk recept. Opnieuw inlezen overschrijft per artikelcode; opmerkingen blijven staan.</p>
      <div className="relative mb-2">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek een inkoopartikel (bv. citroen)" className="input px-3 py-2.5 w-full text-sm pl-9" />
      </div>
      {q.trim().length >= 2 && hits.length === 0 && <div className="text-sm mute">Geen artikelen gevonden.</div>}
      {nieuwArtikel && (
        <div className="card p-3 mb-2">
          <div className="text-sm font-bold ink mb-1">Nieuw artikel</div>
          <ArtikelForm nieuw a={{ code: "", omschrijving: "", inhoud: "1 kg", prijs: null, ppe: null, leverancier: levKeuzes[0] || "Eigen prijzen", categorie: "Handmatig", opmerking: "" }}
            leveranciers={levKeuzes} catsPerLev={catsPerLev}
            onSave={(art) => { onUpdateArtikel(art); setNieuwArtikel(false); }} onSluit={() => setNieuwArtikel(false)} />
        </div>
      )}
      {samenvoegen && (
        <SamenvoegKiezer van={samenvoegen}
          opties={(() => {
            const uit = new Map();
            for (const x of ontbrekend) uit.set(x.naam, { naam: x.naam, prijs: "" });
            for (const r of recipes || []) for (const ing of r.ingredients || []) { const n = canoniekeNaam(ing.item); if (n && !uit.has(n)) uit.set(n, { naam: n, prijs: "" }); }
            for (const a of bdArtikelen || []) { const pb = artikelPerBasis(a); uit.set(a.omschrijving, { naam: a.omschrijving, prijs: pb ? eur(pb.prijs) + " p/" + pb.b : "geen prijs" }); }
            return [...uit.values()].sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
          })()}
          onSluit={() => setSamenvoegen(null)}
          onKies={(naar) => { onSamenvoegen(samenvoegen, naar); setSamenvoegen(null); }} />
      )}
      {hernoem && (
        <PromptModal titel={hernoem.soort === "lev" ? "Leverancier hernoemen" : "Categorie hernoemen"}
          label="Naam" waarde={hernoem.oud} placeholder="bv. De Waog" okLabel="Opslaan"
          hint={hernoem.soort === "lev" ? "Alle artikelen van deze leverancier komen onder de nieuwe naam." : "Geldt voor deze categorie bij " + hernoem.leverancier + "."}
          onCancel={() => setHernoem(null)}
          onOk={(naam) => { onHernoem(hernoem.soort, hernoem.oud, naam, hernoem.leverancier); setHernoem(null); }} />
      )}
      {q.trim().length >= 2 ? (
        <div className="space-y-1.5">{hits.map((a) => <ArtikelRegel key={a.code} a={a} gebruik={gebruikPerArtikel[a.code] || 0} leveranciers={levKeuzes} catsPerLev={catsPerLev} onSave={onUpdateArtikel} onDelete={onDeleteArtikel} />)}</div>
      ) : (
        <div className="space-y-2">
          {levs.map((lev) => {
            const cats = Object.keys(perLev[lev]).sort((x, y) => x.localeCompare(y, "nl"));
            const aantal = cats.reduce((n, c) => n + perLev[lev][c].length, 0);
            const uit = !!openLev[lev];
            return (
              <div key={lev}>
                <div className="card flex items-center gap-1 pr-2">
                  <button onClick={() => setOpenLev((o) => ({ ...o, [lev]: !o[lev] }))} className="ff flex-1 min-w-0 text-left px-3.5 py-3 flex items-center gap-2">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold ink truncate">{lev}</span>
                      <span className="block text-[12px] mute">{aantal} artikelen</span>
                    </span>
                    {uit ? <ChevronUp size={16} className="mute shrink-0" /> : <ChevronDown size={16} className="mute shrink-0" />}
                  </button>
                  <button onClick={() => setHernoem({ soort: "lev", oud: lev })} className="ff shrink-0 mute hover:opacity-60 p-1.5" title="Leverancier hernoemen"><Pencil size={15} /></button>
                </div>
                {uit && (
                  <div className="mt-1.5 ml-2 space-y-1.5">
                    {[...cats.flatMap((c) => perLev[lev][c])].sort((x, y) => String(x.omschrijving).localeCompare(String(y.omschrijving), "nl"))
                      .map((a) => <ArtikelRegel key={a.code} a={a} gebruik={gebruikPerArtikel[a.code] || 0} leveranciers={levKeuzes} catsPerLev={catsPerLev} onSave={onUpdateArtikel} onDelete={onDeleteArtikel} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-7 mb-1.5">
        <span className="text-sm font-bold ink">Ingrediënten zonder prijs <span className="mute font-normal">· {ontbrekend.length}</span></span>
      </div>
      <p className="text-[12px] mute mb-2">Deze staan wel in de recepten, maar er is geen inkoopprijs bij te vinden. Vul leverancier, eenheid en prijs in — dan telt het ingrediënt vanaf dat moment overal mee. Staat er "eenheid niet om te rekenen", dan is het artikel wél gevonden maar weet de app niet wat een stuk weegt; dat vul je aan in de tabel onder Werkwijze, of je zet hier een eigen prijs per stuk.</p>
      {ontbrekend.length === 0 ? (
        <div className="card p-4 text-sm mute">Elk ingrediënt uit de recepten heeft een prijs.</div>
      ) : (
        <>
          {ontbrekend.length > 8 && (
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
              <input value={qOntbreek} onChange={(e) => setQOntbreek(e.target.value)} placeholder="Zoek een ingrediënt" className="input px-3 py-2.5 w-full text-sm pl-9" />
            </div>
          )}
          <div className="space-y-1.5">
            {ontbreekToon.map((x) => (
              <ArtikelRegel key={x.naam.toLowerCase()} nieuw onNegeer={() => onNegeer(x.naam)} onSamenvoegen={() => setSamenvoegen(x.naam)}
                a={{ code: "eigen:" + zonderAccent(x.naam).toLowerCase().trim(), omschrijving: x.naam, inhoud: "1 kg", prijs: null, ppe: null, leverancier: "Eigen prijzen", categorie: "Handmatig", opmerking: "" }}
                sub={x.aantal + "× in de recepten" + (x.voorbeeld ? " · bv. " + x.voorbeeld : "") + (x.artikel ? " · eenheid niet om te rekenen" : " · geen artikel gevonden")}
                leveranciers={[...levKeuzes.filter((l) => l !== "Eigen prijzen"), "Eigen prijzen"]} catsPerLev={catsPerLev}
                onSave={onUpdateArtikel} onDelete={() => {}} />
            ))}
          </div>
          {ontbreekHits.length > ontbreekToon.length && (
            <button onClick={() => setAlleOntbrekend(true)} className="ff mt-2 text-[13px] font-medium acc underline hover:opacity-70">Toon alle {ontbreekHits.length}</button>
          )}
        </>
      )}
    </div>
  );
}

const normProdIng = (x) => ({
  naam: (x && x.naam) || "", artikelCode: (x && x.artikelCode) || null,
  perPrijs: x && x.perPrijs != null ? String(x.perPrijs) : "",
  perEenheid: (x && x.perEenheid) || "kg",
  hoeveel: (x && x.hoeveel) != null ? String(x.hoeveel) : "",
});
const normItem = (x) => (typeof x === "string"
  ? { text: x, itemId: null, cost: "", ings: [] }
  : { text: x.text || "", itemId: x.itemId || null, cost: x.cost != null ? String(x.cost) : "", ings: Array.isArray(x.ings) ? x.ings.map(normProdIng) : [] });
// Waar een assortimentsproduct voor is; zelf typen kan ook.
const DOELEN = ["Catering", "Landgoed", "Metaal Kathedraal"];
// Leveranciers die er altijd zijn, ook als er nog niets van ingelezen is.
const VASTE_LEVERANCIERS = ["Eigen bodem"];
// Productcategorieen binnen zo'n bestemming; zelf typen kan ook.
const PRODUCT_CATS = ["Lunch", "Borrel", "Diner", "Buffet", "Extra losse items"];

// Ingrediënten onder een item van een product: kies een artikel uit de prijslijst
// (of typ er zelf een), vul in hoeveel je nodig hebt en de app rekent het uit.
function ItemIngredienten({ ings, bdArtikelen, onChange }) {
  const [open, setOpen] = useState(false);
  const [sug, setSug] = useState(-1);
  const zet = (i, patch) => onChange(ings.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const bedragen = ings.map(prodIngKost);
  const som = bedragen.filter((x) => x !== null).reduce((a, b) => a + b, 0);
  const veld = "input px-2.5 py-2 text-sm";
  const kies = (i, a) => {
    const pb = artikelPerBasis(a);
    zet(i, { naam: a.omschrijving, artikelCode: a.code, perPrijs: pb ? pb.prijs.toFixed(2) : "", perEenheid: pb ? pb.b : "kg" });
    setSug(-1);
  };
  return (
    <div className="mt-1 mb-1 ml-1">
      <button type="button" onClick={() => setOpen((o) => !o)} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium mute hover:opacity-70">
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Ingrediënten{ings.length ? " · " + ings.length : ""}{bedragen.some((x) => x !== null) ? " · " + eur(som) : ""}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1.5">
          {ings.map((g, i) => {
            const hits = sug === i && String(g.naam || "").trim().length >= 2
              ? bdArtikelen.filter((a) => strictMatchAny([a.omschrijving], g.naam)).slice(0, 6) : [];
            const bedrag = bedragen[i];
            return (
              <div key={i} className="card p-2">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1 min-w-0">
                    <input className={veld + " w-full"} value={g.naam} placeholder="bv. aardbeien"
                      onChange={(e) => { zet(i, { naam: e.target.value, artikelCode: null }); setSug(i); }}
                      onFocus={() => setSug(i)} onBlur={() => setTimeout(() => setSug((r) => (r === i ? -1 : r)), 120)} />
                    {hits.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl p-1 shadow-xl" style={{ background: T.paper, border: "1px solid " + T.line, maxHeight: "13rem", overflowY: "auto" }}>
                        {hits.map((a) => { const pb = artikelPerBasis(a); return (
                          <button key={a.code} type="button" onMouseDown={(e) => { e.preventDefault(); kies(i, a); }} className="ff w-full text-left rounded-xl px-3 py-2 text-sm ink hover:opacity-70">
                            {a.omschrijving} <span className="mute">· {pb ? eur(pb.prijs) + " p/" + pb.b : "geen prijs"}</span>
                          </button>
                        ); })}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => onChange(ings.filter((_, j) => j !== i))} className="ff shrink-0 mute hover:opacity-60 px-1"><Trash2 size={15} /></button>
                </div>
                <div className="flex gap-2 items-center mt-1.5">
                  <div className="relative flex-1 min-w-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] mute">€</span>
                    <input type="text" inputMode="decimal" className={veld + " w-full pl-5"} value={g.perPrijs} placeholder="0,00"
                      onChange={(e) => zet(i, { perPrijs: e.target.value.replace(/[^0-9.,]/g, "") })} title="Prijs per kilo, liter of stuk" />
                  </div>
                  <AppSelect value={g.perEenheid || "kg"} onChange={(v) => zet(i, { perEenheid: v })}
                    options={[{ value: "kg", label: "per kg" }, { value: "l", label: "per l" }, { value: "st", label: "per st" }]}
                    className={veld} style={{ width: "5.75rem" }} />
                </div>
                <div className="flex gap-2 items-center mt-1.5">
                  <input className={veld + " flex-1 min-w-0"} value={g.hoeveel} placeholder="hoeveel nodig, bv. 300 gr"
                    onChange={(e) => zet(i, { hoeveel: e.target.value })} />
                  <span className="text-sm font-semibold shrink-0 text-right" style={{ width: "5rem", color: "#44502f" }}>{bedrag !== null ? eur(bedrag) : "—"}</span>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={() => onChange([...ings, normProdIng({})])} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium acc hover:opacity-70"><Plus size={13} /> Ingrediënt toevoegen</button>
          {bedragen.some((x) => x !== null) && <div className="text-[12.5px] ink">Samen: <span className="font-semibold">{eur(som)}</span>{bedragen.some((x) => x === null) ? <span className="mute"> · {bedragen.filter((x) => x === null).length} zonder prijs</span> : null}</div>}
        </div>
      )}
    </div>
  );
}

// Zoeken in recepten, gerechten en de inkooplijst tegelijk — voor de regels van een item.
function BronKiezer({ zoek, recipes, dishes, recipeById, onKies, onSluit }) {
  const [q, setQ] = useState(zoek || "");
  const t = q.trim();
  const recs = t.length >= 2 ? (recipes || []).filter((r) => softMatchAny([r.name, r.category], t)).slice(0, 12) : [];
  const ger = t.length >= 2 ? (dishes || []).filter((d) => softMatchAny([d.name], t)).slice(0, 8) : [];
  const arts = t.length >= 2 ? (PRIJSLIJST.arts || []).filter((a) => strictMatchAny([a.omschrijving], t)).slice(0, 12) : [];
  const regel = (sleutel, titel, onder, klik) => (
    <button key={sleutel} type="button" onClick={klik} className="ff card cardh w-full text-left px-3 py-2">
      <div className="text-sm ink font-medium truncate">{titel}</div>
      <div className="text-[12px] mute truncate">{onder}</div>
    </button>
  );
  const kop = (tekst) => <div className="text-[11px] font-semibold uppercase tracking-widest acc mt-2 mb-1">{tekst}</div>;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }} onClick={onSluit}>
      <div className="w-full max-w-md rounded-2xl p-4 flex flex-col" style={{ background: T.paper, maxHeight: "82vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="serif ink text-xl leading-tight mb-2">Toevoegen aan dit item</div>
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek een recept, gerecht of inkoopartikel" className="input px-3 py-2.5 w-full text-sm pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {t.length < 2 && <p className="text-[12.5px] mute">Typ minstens twee letters. Vind je niets, dan kun je onderaan een eigen regel toevoegen.</p>}
          {recs.length > 0 && kop("Recepten")}
          {recs.map((r) => { const p = receptPortieKost(r); const n = receptPorties(r);
            return regel("r" + r.id, r.name, [r.category, n ? n + " porties" : "porties niet ingevuld", p !== null ? eur(p) + " per portie" : "geen prijs"].filter(Boolean).join(" · "),
              () => onKies({ soort: "recept", refId: r.id, naam: r.name })); })}
          {ger.length > 0 && kop("Gerechten")}
          {ger.map((d) => { const p = gerechtPortieKost(d, recipeById); const n = gerechtPorties(d, recipeById);
            return regel("d" + d.id, d.name, [(d.recipeIds || []).length + " recepten", n ? n + " porties" : "porties niet ingevuld", p !== null ? eur(p) + " per portie" : "geen prijs"].filter(Boolean).join(" · "),
              () => onKies({ soort: "gerecht", refId: d.id, naam: d.name })); })}
          {arts.length > 0 && kop("Inkoop")}
          {arts.map((a) => { const pb = artikelPerBasis(a);
            return regel("a" + a.code, a.omschrijving, [a.leverancier, pb ? eur(pb.prijs) + " p/" + pb.b : "geen prijs"].filter(Boolean).join(" · "),
              () => onKies({ soort: "ingredient", naam: a.omschrijving, artikelCode: a.code, perPrijs: pb ? pb.prijs.toFixed(2) : "", perEenheid: pb ? pb.b : "kg" })); })}
        </div>
        <div className="flex justify-between gap-2 mt-3">
          <button onClick={() => onKies({ soort: "ingredient", naam: t })} className="ff rounded-lg px-3 py-2 text-sm font-medium acc hover:opacity-70" style={{ border: "1px solid " + T.line }}>Eigen regel</button>
          <button onClick={onSluit} className="ff rounded-lg px-3 py-2 text-sm font-medium mute hover:opacity-70" style={{ border: "1px solid " + T.line }}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}

// Een bestaand gedeeld item aan een productregel hangen.
function ItemKiezer({ zoek, items, recipeById, dishById, onKies, onSluit }) {
  const [q, setQ] = useState(zoek || "");
  const hits = (items || []).filter((x) => !q.trim() || softMatchAny([x.name], q)).slice(0, 40);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.5)" }} onClick={onSluit}>
      <div className="w-full max-w-md rounded-2xl p-4 flex flex-col" style={{ background: T.paper, maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="serif ink text-xl leading-tight">Gedeeld item kiezen</div>
        <p className="text-[12px] mute mt-1 mb-2">De prijs per persoon komt dan uit dat item, en verandert mee als je het item aanpast.</p>
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek een item" className="input px-3 py-2.5 w-full text-sm pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {hits.length === 0 && <p className="text-[12.5px] mute">Geen item gevonden. Maak er een aan op de calculatiepagina.</p>}
          {hits.map((x) => { const k = gedeeldItemKost(x, recipeById, dishById); return (
            <button key={x.id} type="button" onClick={() => onKies(x)} className="ff card cardh w-full text-left px-3 py-2">
              <div className="text-sm ink font-medium truncate">{x.name}</div>
              <div className="text-[12px] mute truncate">{(x.regels || []).length} onderdelen · {k !== null ? eur(k) + " p.p." : "geen prijs"}</div>
            </button>
          ); })}
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={onSluit} className="ff rounded-lg px-3 py-2 text-sm font-medium mute hover:opacity-70" style={{ border: "1px solid " + T.line }}>Sluiten</button>
        </div>
      </div>
    </div>
  );
}

function CalcItemForm({ editing, recipes, dishes, recipeById, dishById, onCancel, onSave }) {
  const [name, setName] = useState(editing?.name || "");
  const [regels, setRegels] = useState(() => (editing?.regels || []).map(normRegel));
  const [cost, setCost] = useState(editing?.cost || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [kiezer, setKiezer] = useState(false);
  const inputCls = "input px-3 py-2.5 w-full text-[15px]";
  const zet = (i, patch) => setRegels((xs) => xs.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const bedragen = regels.map((g) => regelKost(g, recipeById, dishById));
  const kAuto = bedragen.some((x) => x !== null) ? bedragen.filter((x) => x !== null).reduce((a, b) => a + b, 0) : null;
  const kHand = eurNum(cost);
  const bewaar = () => {
    if (!name.trim()) { alert("Geef het item een naam."); return; }
    onSave({ id: editing?.id, name: name.trim(), cost: String(cost).trim(), notes: notes.trim(),
      regels: regels.filter((g) => String(g.naam || "").trim()) });
  };
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4">
        <button onClick={onCancel} className="ff inline-flex items-center gap-1.5 text-sm mute hover:opacity-70"><X size={16} /> Annuleren</button>
        <span className="serif ink text-lg">{editing ? "item bewerken" : "nieuw item"}</span>
        <button onClick={bewaar} className="btnp ff inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold"><Check size={16} /> Opslaan</button>
      </div>
      <Field label="Naam"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Sandwich" /></Field>
      <div className="text-sm font-medium ink mt-4 mb-1">Onderdelen</div>
      <p className="text-[11.5px] mute mb-2">Per persoon. Een recept of gerecht rekent met zijn prijs per portie; een los ingrediënt met de hoeveelheid die je invult.</p>
      <div className="space-y-1.5">
        {regels.map((g, i) => {
          const bedrag = bedragen[i];
          const bron = g.soort === "recept" ? recipeById(g.refId) : g.soort === "gerecht" ? dishById(g.refId) : null;
          return (
            <div key={i} className="card p-2.5">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <input className="input px-2.5 py-2 w-full text-sm" value={g.naam} onChange={(e) => zet(i, { naam: e.target.value })} placeholder="naam" />
                  <div className="text-[11.5px] mute mt-0.5 truncate">
                    {g.soort === "recept" ? (bron ? "Recept · " + (receptPorties(bron) || "?") + " porties · " + eur(receptPortieKost(bron)) + " per portie" : "Recept is verwijderd")
                      : g.soort === "gerecht" ? (bron ? "Gerecht · " + (gerechtPorties(bron, recipeById) || "?") + " porties · " + eur(gerechtPortieKost(bron, recipeById)) + " per portie" : "Gerecht is verwijderd")
                      : "Los ingrediënt"}
                  </div>
                </div>
                <span className="text-sm font-semibold shrink-0 text-right" style={{ width: "4.5rem", color: "#44502f" }}>{bedrag !== null ? eur(bedrag) : "—"}</span>
                <button type="button" onClick={() => setRegels((xs) => xs.filter((_, j) => j !== i))} className="ff shrink-0 mute hover:opacity-60 px-1"><Trash2 size={15} /></button>
              </div>
              {g.soort === "ingredient" ? (
                <div className="flex gap-2 items-center mt-1.5">
                  <div className="relative" style={{ width: "5.5rem" }}>
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] mute">€</span>
                    <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full text-sm pl-5" value={g.perPrijs} placeholder="0,00"
                      onChange={(e) => zet(i, { perPrijs: e.target.value.replace(/[^0-9.,]/g, "") })} />
                  </div>
                  <AppSelect value={g.perEenheid || "kg"} onChange={(v) => zet(i, { perEenheid: v })}
                    options={[{ value: "kg", label: "per kg" }, { value: "l", label: "per l" }, { value: "st", label: "per st" }]}
                    className="input px-2.5 py-2 text-sm" style={{ width: "5.75rem" }} />
                  <input className="input px-2.5 py-2 text-sm flex-1 min-w-0" value={g.hoeveel} placeholder="hoeveel nodig, bv. 60 g"
                    onChange={(e) => zet(i, { hoeveel: e.target.value })} />
                </div>
              ) : (
                <div className="flex gap-2 items-center mt-1.5">
                  <span className="text-[12.5px] mute">Porties per persoon</span>
                  <input type="text" inputMode="decimal" className="input px-2.5 py-2 text-sm" style={{ width: "5rem" }} value={g.aantal}
                    onChange={(e) => zet(i, { aantal: e.target.value.replace(/[^0-9.,]/g, "") })} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => setKiezer(true)} className="ff inline-flex items-center gap-1 text-[13px] font-medium acc hover:opacity-70 mt-2"><Plus size={14} /> Onderdeel toevoegen</button>
      {kAuto !== null && <div className="text-sm ink mt-2">Samen: <span className="font-semibold">{eur(kAuto)}</span> per persoon{bedragen.some((x) => x === null) ? <span className="mute"> · {bedragen.filter((x) => x === null).length} zonder prijs</span> : null}</div>}
      <div className="mt-4">
        <Field label="Kostprijs per persoon (€)">
          <input type="text" inputMode="decimal" className={inputCls} value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder={kAuto !== null ? kAuto.toFixed(2).replace(".", ",") : "bv. 1,25"} />
          {kAuto !== null && (kHand === null
            ? <p className="text-[11.5px] mute mt-1">Uit de onderdelen samen.</p>
            : <p className="text-[11.5px] mute mt-1">Handmatig · <button type="button" onClick={() => setCost("")} className="ff underline font-medium acc hover:opacity-70">terug naar {eur(kAuto)}</button></p>)}
        </Field>
      </div>
      <Field label="Opmerkingen"><textarea rows={2} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="bv. altijd met desembrood van Menno" /></Field>
      {kiezer && (
        <BronKiezer recipes={recipes} dishes={dishes} recipeById={recipeById}
          onSluit={() => setKiezer(false)}
          onKies={(g) => { setRegels((xs) => [...xs, normRegel(g)]); setKiezer(false); }} />
      )}
    </div>
  );
}

function AssortimentForm({ editing, producten, recipes, dishes, recipeById, dishById, calcItems, bdArtikelen, onCancel, onSave }) {
  const [name, setName] = useState(editing?.name || "");
  const [fromP, setFromP] = useState(editing?.fromP || "");
  const [toP, setToP] = useState(editing?.toP || "");
  const [cost, setCost] = useState(editing?.cost || "");
  const [price, setPrice] = useState(editing?.price || "");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [doel, setDoel] = useState(editing?.doel || "Catering");
  const [doelVrij, setDoelVrij] = useState(DOELEN.indexOf(editing?.doel || "Catering") < 0 ? editing?.doel || "" : "");
  const [cat, setCat] = useState(editing?.cat || "Lunch");
  const [catVrij, setCatVrij] = useState(PRODUCT_CATS.indexOf(editing?.cat || "Lunch") < 0 ? editing?.cat || "" : "");
  const [items, setItems] = useState(editing?.items && editing.items.length ? editing.items.map(normItem) : [normItem("")]);
  const [laad, setLaad] = useState("");
  const [koppelRij, setKoppelRij] = useState(null); // itemregel waarvoor een gedeeld item gekozen wordt
  const setItem = (i, patch) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addItemAt = (i) => {
    setItems((xs) => [...xs.slice(0, i + 1), normItem(""), ...xs.slice(i + 1)]);
    setTimeout(() => { const el = document.querySelector('[data-as-item="' + (i + 1) + '"]'); if (el) el.focus(); }, 30);
  };
  const backItem = (i) => {
    setItems((xs) => xs.filter((_, j) => j !== i));
    setTimeout(() => { const el = document.querySelector('[data-as-item="' + (i - 1) + '"]'); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} } }, 0);
  };
  // Kostprijs is standaard de som van de items; handmatig invullen overrulet dat.
  const itemBedrag = (it) => itemKostVan(it, recipeById, dishById);
  const itemBedragen = items.map(itemBedrag).filter((x) => x !== null);
  const kAuto = itemBedragen.length ? itemBedragen.reduce((a, b) => a + b, 0) : null;
  const kHand = eurNum(cost);
  const k = kHand !== null ? kHand : kAuto, vP = eurNum(price);
  const effectief = k !== null && vP !== null && k > 0 ? Math.round(((vP - k) / k) * 100) : null;
  const laadProduct = (id) => {
    const p = producten.find((x) => x.id === id);
    if (!p) return;
    const extra = (p.items || []).map(normItem).filter((x) => x.text.trim());
    setItems((xs) => { const basis = xs.filter((x) => x.text.trim()); return [...basis, ...extra, normItem("")]; });
    setLaad("");
  };
  const doSave = () => {
    if (!name.trim()) { alert("Vul een naam in."); return; }
    onSave({ id: editing?.id, name: name.trim(), doel: (doelVrij.trim() || doel || "").trim(), cat: (catVrij.trim() || cat || "").trim(), fromP: fromP.trim(), toP: toP.trim(), cost: String(cost).trim(), price: String(price).trim(), notes: notes.trim(), items: items.map((x) => ({
      text: x.text.trim(), itemId: x.itemId || null, cost: String(x.cost || "").trim(),
      ings: (x.ings || []).filter((g) => String(g.naam || "").trim()).map((g) => ({ naam: g.naam.trim(), artikelCode: g.artikelCode || null, perPrijs: String(g.perPrijs || "").trim(), perEenheid: g.perEenheid || "kg", hoeveel: String(g.hoeveel || "").trim() })),
    })).filter((x) => x.text) });
  };
  const inputCls = "input px-3.5 py-2.5 w-full text-[15px]";
  return (
    <div className="pb-28">
      <div className="flex items-center justify-between gap-2 mb-5">
        <button onClick={onCancel} className="ff inline-flex items-center gap-1 text-sm mute hover:opacity-70"><X size={16} /> Annuleren</button>
        <span className="serif ink text-xl">{editing ? "Product bewerken" : "Nieuw product"}</span>
        <button onClick={doSave} className="btnp ff inline-flex items-center gap-1.5 rounded-xl text-sm font-semibold px-4 py-2.5"><Check size={15} /> Opslaan</button>
      </div>
      <Field label="Naam"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Uitgebreide lunch" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Waarvoor is dit?">
          <AppSelect value={doelVrij ? "__anders" : doel} onChange={(v) => { if (v === "__anders") setDoelVrij(" "); else { setDoelVrij(""); setDoel(v); } }}
            options={[...DOELEN.map((x) => ({ value: x, label: x })), { value: "__anders", label: "Anders…" }]}
            className={inputCls} placeholder="Kies" />
          {doelVrij !== "" && <input className={inputCls + " mt-1.5"} value={doelVrij.trim()} onChange={(e) => setDoelVrij(e.target.value || " ")} placeholder="Zelf invullen" />}
        </Field>
        <Field label="Categorie">
          <AppSelect value={catVrij ? "__anders" : cat} onChange={(v) => { if (v === "__anders") setCatVrij(" "); else { setCatVrij(""); setCat(v); } }}
            options={[...PRODUCT_CATS.map((x) => ({ value: x, label: x })), { value: "__anders", label: "Anders…" }]}
            className={inputCls} placeholder="Kies" />
          {catVrij !== "" && <input className={inputCls + " mt-1.5"} value={catVrij.trim()} onChange={(e) => setCatVrij(e.target.value || " ")} placeholder="Zelf invullen" />}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vanaf (personen)"><input type="text" inputMode="numeric" className={inputCls} value={fromP} onChange={(e) => setFromP(e.target.value.replace(/[^0-9]/g, ""))} placeholder="bv. 15" /></Field>
        <Field label="Tot (personen)"><input type="text" inputMode="numeric" className={inputCls} value={toP} onChange={(e) => setToP(e.target.value.replace(/[^0-9]/g, ""))} placeholder="bv. 300" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kostprijs p.p. (€)">
          <input type="text" inputMode="decimal" className={inputCls} value={cost} onChange={(e) => setCost(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder={kAuto !== null ? kAuto.toFixed(2).replace(".", ",") : "bv. 15"} />
          {kAuto !== null && (kHand === null
            ? <p className="text-[11.5px] mute mt-1">Uit de items samen.</p>
            : <p className="text-[11.5px] mute mt-1">Handmatig · <button type="button" onClick={() => setCost("")} className="ff underline font-medium acc hover:opacity-70">terug naar {eur(kAuto)}</button></p>)}
        </Field>
        <Field label="Verkoopprijs p.p. (€)">
          <input type="text" inputMode="decimal" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="bv. 35" />
          {effectief !== null && <p className="text-[11.5px] mute mt-1">{effectief}% op de kostprijs.</p>}
        </Field>
      </div>
      <div className="flex items-center justify-between gap-2 mt-2 mb-1.5">
        <span className="text-sm font-medium ink">Items</span>
        {producten.filter((p) => p.id !== editing?.id).length > 0 && (
          <AppSelect value={laad} onChange={laadProduct} placeholder="Product laden…" title="Items overnemen uit"
            options={producten.filter((p) => p.id !== editing?.id).map((p) => ({ value: p.id, label: p.name }))}
            className="input px-2.5 py-1.5 text-xs" style={{ width: "12rem" }} />
        )}
      </div>
      <p className="text-[11.5px] mute mb-2">Typ het item; de prijs komt uit de ingrediënten eronder, of vul 'm zelf in.</p>
      <div className="space-y-2">
        {items.map((it, i) => {
          return (
            <div key={i}>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 min-w-0">
                <input data-as-item={i} className={inputCls + " w-full"} value={it.text}
                  onChange={(e) => setItem(i, { text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addItemAt(i); }
                    else if (e.key === "Backspace" && i > 0 && !it.text.trim()) { e.preventDefault(); backItem(i); }
                  }} placeholder="bv. quiche mini" />
              </div>
              <div className="relative shrink-0" style={{ width: "6.25rem" }}>
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm mute">€</span>
                <input type="text" inputMode="decimal" className={inputCls + " pl-6"} value={it.cost}
                  onChange={(e) => setItem(i, { cost: e.target.value.replace(/[^0-9.,]/g, "") })}
                  placeholder={(() => { const b = itemBedrag({ ...it, cost: "" }); return b !== null ? b.toFixed(2).replace(".", ",") : "0,00"; })()}
                  title="Kostprijs van dit item — leeg laten rekent met de ingrediënten of het recept" />
              </div>
              {items.length > 1 && <button onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} className="mute hover:opacity-60 px-1"><Trash2 size={16} /></button>}
            </div>
            <div className="flex items-center gap-2 mt-0.5 ml-1">
              {(() => {
                const gedeeld = it.itemId ? (calcItems || []).find((x) => x.id === it.itemId) : null;
                if (gedeeld) {
                  const k = gedeeldItemKost(gedeeld, recipeById, dishById);
                  return (
                    <>
                      <button type="button" onClick={() => setKoppelRij(i)} className="ff text-[11px] font-medium hover:opacity-70" style={{ color: "#44502f" }}>Gedeeld item: {gedeeld.name}{k !== null ? " · " + eur(k) + " p.p." : ""}</button>
                      <button type="button" onClick={() => setItem(i, { itemId: null })} className="ff text-[11px] mute hover:opacity-70 underline">losmaken</button>
                    </>
                  );
                }
                return <button type="button" onClick={() => setKoppelRij(i)} className="ff text-[11px] mute hover:opacity-70">+ Gedeeld item koppelen</button>;
              })()}
            </div>
            {!it.itemId && <ItemIngredienten ings={it.ings || []} bdArtikelen={bdArtikelen} onChange={(ings) => setItem(i, { ings })} />}
            </div>
          );
        })}
      </div>
      <AddRow onClick={() => setItems((xs) => [...xs, normItem("")])} label="Item toevoegen" />
      {koppelRij !== null && (
        <ItemKiezer zoek={String((items[koppelRij] || {}).text || "")} items={calcItems || []} recipeById={recipeById} dishById={dishById}
          onSluit={() => setKoppelRij(null)}
          onKies={(gekozen) => {
            setItems((xs) => xs.map((x, j) => (j === koppelRij ? { ...x, itemId: gekozen.id, text: String(x.text || "").trim() ? x.text : gekozen.name } : x)));
            setKoppelRij(null);
          }} />
      )}
      <div className="mt-5">
        <Field label="Opmerkingen"><textarea rows={3} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="bv. inclusief koffie en thee, exclusief bediening" /></Field>
      </div>
      <div className="mt-1">
        <button onClick={() => printAssortimentProduct({ name, fromP, toP, cost, price, notes, items }, recipeById)} className="btno ff inline-flex items-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5"><Printer size={16} /> Printen</button>
      </div>
    </div>
  );
}

function SettingsScreen({ onBack, installed, canInstall, onInstall, onSignOut, onBackup, onWordBackup, onRestore, chefMode, onChef }) {
  const herstelRef = React.useRef(null);
  const [chefOpen, setChefOpen] = useState(false);
  const [chefFout, setChefFout] = useState("");
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

      <SectionTitle>Chef</SectionTitle>
      <div className="card p-4">
        <p className="text-sm mute mb-3">De chef-versie toont Calculaties (kost- en verkoopprijzen) en kostprijzen bij recepten, gerechten en voorraad. Geldt alleen voor deze sessie: bij het verversen van de app sluit hij vanzelf.</p>
        <button onClick={() => { if (chefMode) onChef(false); else { setChefFout(""); setChefOpen(true); } }} className={(chefMode ? "btno" : "btnp") + " ff inline-flex items-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5"}><ChefHat size={16} /> {chefMode ? "Chef-modus verlaten" : "Chef-modus openen…"}</button>
        {chefOpen && (
          <PromptModal titel="Chef-modus" label="Chef-code" placeholder="Code" wachtwoord okLabel="Openen" fout={chefFout}
            hint="Prijzen en het assortiment blijven zichtbaar tot de app ververst wordt."
            onCancel={() => setChefOpen(false)}
            onOk={(code) => { if (onChef(true, code)) setChefOpen(false); else setChefFout("Die code klopt niet."); }} />
        )}
      </div>

      <SectionTitle>Backup</SectionTitle>
      <div className="card p-4">
        <p className="text-sm mute mb-3">Download een reservekopie van de <span className="ink font-medium">voorraad, recepten (incl. fermentatie) en gerechten</span> als bestand, of zet een eerdere backup terug. Terugzetten overschrijft gelijknamige items; nieuwere items blijven staan.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={onBackup} className="btnp ff inline-flex items-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5"><Download size={16} /> Backup downloaden</button>
          <button onClick={onWordBackup} className="btno ff inline-flex items-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5"><BookOpen size={16} /> Word-backup (per recept)</button>
          <button onClick={() => { if (herstelRef.current) { herstelRef.current.value = ""; herstelRef.current.click(); } }} className="btno ff inline-flex items-center gap-2 rounded-lg text-sm font-medium px-4 py-2.5"><Share size={16} /> Backup terugzetten</button>
          <input ref={herstelRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onRestore(f); }} />
        </div>
      </div>

      <SectionTitle>Over</SectionTitle>
      <div className="card p-4 text-sm mute space-y-1">
        <div className="serif ink text-lg leading-tight">In het ritme van het land</div>
        <div>Wilde Wortels · Landgoed de Beug · Odijk</div>
        <div>Digitaal receptenboek van de moestuinkeuken · versie 1.0</div>
      </div>
      <div className="mt-8">
        <button onClick={onSignOut} className="ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }}><LogOut size={15} /> Dit apparaat uitloggen</button>
        <p className="text-[11px] mute mt-1.5">Daarna is opnieuw het keukenwachtwoord nodig.</p>
        <p className="text-[11px] mute mt-3">App-versie: {RITME_VERSIE}</p>
      </div>
    </div>
  );
}

const SECTIONS = [
  { id: "gerechten", label: "Gerechten", icon: <Utensils size={24} /> },
  { id: "recepten", label: "Recepten", icon: <Layers size={24} /> },
  { id: "fermentatie", label: "Fermenteren", icon: <FlaskConical size={24} /> },
  { id: "smaak", label: "Smaak", icon: <Blend size={24} /> },
  { id: "voorraad", label: "Voorraad", icon: <ShelfIcon size={24} /> },
  { id: "technieken", label: "Werkwijze", icon: <BookOpen size={24} /> },
  { id: "schoonmaak", label: "Schoonmaak", icon: <Sparkles size={24} /> },
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

function SectionNav({ section, setSection, chef }) {
  // section is null op detailpagina’s: geen knop actief, tik navigeert terug naar de lijst.
  const items = chef ? [...SECTIONS, { id: "assortiment", label: "Calculaties", icon: <Receipt size={24} /> }] : SECTIONS;
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
    <div ref={scroller} className="sticky top-0 z-30 flex gap-1 sm:gap-1.5 overflow-x-auto pt-2 pb-1.5 -mx-4 px-4 no-scrollbar sm:justify-center" style={{ background: T.paper }}>
      {items.map((it) => (
        <button key={it.id} ref={(el) => { btns.current[it.id] = el; }} onClick={() => setSection(it.id)} className={"ff shrink-0 inline-flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2.5 sm:px-3 py-1.5 min-w-[64px] text-[11.5px] sm:text-[12px] font-medium " + (section === it.id ? "pillon" : "pill")}>
          {it.icon}<span>{it.label}</span>
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
// Homepagina: snel overzicht van wat er recent gemaakt is — bedoeld voor
// kantoor (bv. Instagram-inspiratie), zonder social-knoppen.
function HomeScreen({ stock, recipes, batches, dishes, onOpenRecipe, onOpenDish, onGoSection }) {
  const recentStock = [...stock].sort((a, b) => (b.productionDate || "") < (a.productionDate || "") ? -1 : (b.productionDate || "") > (a.productionDate || "") ? 1 : 0).slice(0, 5);
  const newRecipes = recipes
    .filter((r) => /^r\d+$/.test(String(r.id)))
    .sort((a, b) => Number(String(b.id).slice(1)) - Number(String(a.id).slice(1)))
    .slice(0, 5);
  const doneBatches = batches.filter((b) => b.done && b.finishedDate).sort((a, b) => (b.finishedDate < a.finishedDate ? -1 : 1)).slice(0, 4);
  const blok = (titel, sectie, leeg, children) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="serif ink text-xl leading-tight">{titel}</h2>
        {sectie && <button onClick={() => onGoSection(sectie)} className="ff text-[13px] font-medium acc hover:opacity-70">alles →</button>}
      </div>
      {children && children.length ? <div className="space-y-2">{children}</div> : <div className="text-sm mute">{leeg}</div>}
    </div>
  );
  return (
    <div className="pt-1">
      <p className="text-sm mute mb-5">Het laatste uit de keuken van Wilde Wortels — vers gemaakt, nieuw bedacht en net afgerond.</p>
      {blok("Vers in de voorraad", "voorraad", "Nog niets toegevoegd.", recentStock.map((v) => (
        <button key={v.id} onClick={() => onGoSection("voorraad")} className="card cardh ff w-full text-left px-4 py-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#e8ebe0", color: T.green }}><ShelfIcon size={15} /></span>
          <div className="flex-1 min-w-0">
            <div className="font-medium ink truncate">{v.product}</div>
            <div className="text-xs mute truncate">{[v.unit, v.storage, v.by, v.productionDate ? "gemaakt " + fmtDMY(v.productionDate) : null].filter(Boolean).join(" · ")}</div>
          </div>
          <ChevronRight size={16} className="shrink-0" style={{ color: "#c4c2b2" }} />
        </button>
      )))}
      {blok("Nieuwste recepten", "recepten", "Nog geen eigen recepten toegevoegd.", newRecipes.map((r) => (
        <button key={r.id} onClick={() => onOpenRecipe(r.id)} className="card cardh ff w-full text-left px-4 py-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#e8ebe0", color: T.green }}>{r.ferment ? <FlaskConical size={15} /> : <ChefHat size={15} />}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium ink truncate">{r.name}</div>
            <div className="text-xs mute truncate">{[r.category, r.updatedBy ? "door " + r.updatedBy : null].filter(Boolean).join(" · ")}</div>
          </div>
          <ChevronRight size={16} className="shrink-0" style={{ color: "#c4c2b2" }} />
        </button>
      )))}
      {blok("Laatst afgeronde fermentaties", "fermentatie", "Nog geen afgeronde batches.", doneBatches.map((b) => (
        <button key={b.id} onClick={() => (b.recipeId ? onOpenRecipe(b.recipeId) : onGoSection("fermentatie"))} className="card cardh ff w-full text-left px-4 py-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#e8ebe0", color: T.green }}><FlaskConical size={15} /></span>
          <div className="flex-1 min-w-0">
            <div className="font-medium ink truncate">{b.product}</div>
            <div className="text-xs mute truncate">{[b.method, "afgerond " + fmtDMY(b.finishedDate)].filter(Boolean).join(" · ")}</div>
          </div>
          <ChevronRight size={16} className="shrink-0" style={{ color: "#c4c2b2" }} />
        </button>
      )))}
    </div>
  );
}

const COURSE_FILTERS = ["Alle", ...DISH_COURSES];

function DishList({ dishes, recipeById, search, setSearch, onOpen }) {
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
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0" style={{ flex: "1 1 55%" }}><SearchBar value={search} onChange={setSearch} placeholder="Zoek gerechten" /></div>
        <AppSelect value={courseF} onChange={setCourseF} options={COURSE_FILTERS} className="input px-2.5 py-2.5 text-sm mt-4 mb-3 self-stretch" style={{ flex: "0 0 45%", width: "45%", maxWidth: "16rem" }} title="Filter op gang" />
      </div>
      <div className="flex items-center gap-1.5 mb-2 text-xs overflow-x-auto no-scrollbar -mx-4 px-4">
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
              <div className="serif ink font-bold text-xl leading-tight">{d.name}</div>
              <div className="text-sm mute mt-1 line-clamp-2">{d.description}</div>
              <div className="mt-2.5 flex items-center gap-2 flex-wrap text-xs mute">
                <span className="inline-flex items-center gap-1"><Layers size={13} className="acc" /> {d.recipeIds.length} recepten</span>
                {d.season && d.season.map((s) => <SeasonPill key={s} s={s} />)}
                {d.diet && d.diet !== "Vegetarisch" && <MeatPill diet={d.diet} />}
                <AllergenPills list={dishAllergens(d, recipeById)} />
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

// Zoeken in recepten: uitsluitend op naam en op ingrediënten.
function matchRecipe(r, q) {
  if (!q) return true;
  return softMatchAny([r.name, (r.ingredients || []).map((i) => i.item).join(" ")], q);
}
function strictMatchRecipe(r, q) {
  if (!q) return true;
  return strictMatchAny([r.name, (r.ingredients || []).map((i) => i.item).join(" ")], q);
}

function RecipeList({ recipes, openCounts, stock, search, setSearch, onOpen }) {
  const [sortMode, setSortMode] = useState("nieuw");
  const [seasonF, setSeasonF] = useState("Alle");
  const [catF, setCatF] = useState("Alle");
  const [limit, setLimit] = useState(60);
  const q = search.trim().toLowerCase();
  const oc = openCounts || {};
  // hoeveel keer in de voorraad gemaakt (voor de volgorde van variaties in de banner)
  const madeCount = {};
  (stock || []).forEach((v) => { if (v.recipeId) madeCount[v.recipeId] = (madeCount[v.recipeId] || 0) + 1; });
  const varsOf = (id) => recipes.filter((r) => r.baseId === id).sort((a, b) => (madeCount[b.id] || 0) - (madeCount[a.id] || 0) || a.name.localeCompare(b.name, "nl"));
  // Variaties staan niet los in de lijst, maar zijn wél via de zoekbalk te vinden.
  let bedoeldeJe = false;
  let shown;
  if (q) {
    shown = recipes.filter((r) => strictMatchRecipe(r, q));
    if (shown.length === 0) {
      shown = recipes.filter((r) => matchRecipe(r, q)); // typo-tolerante terugval
      bedoeldeJe = shown.length > 0;
    }
  } else {
    shown = recipes.filter((r) => !r.baseId);
  }
  const cats = ["Alle", "Basisrecepten", ...[...new Set(recipes.map((r) => r.category))].sort((a, b) => a.localeCompare(b, "nl"))];
  if (catF === "Basisrecepten") shown = shown.filter((r) => r.isBase || varsOf(r.id).length > 0);
  else if (catF !== "Alle") shown = shown.filter((r) => r.category === catF);
  if (seasonF !== "Alle") shown = shown.filter((r) => r.season.includes(seasonF) || r.season.includes("Hele jaar"));
  const pop = (r) => oc[r.id] || 0;
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
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0" style={{ flex: "1 1 55%" }}><SearchBar value={search} onChange={(v) => { setSearch(v); setLimit(60); }} placeholder="Zoek op naam of ingrediënt (bv. citroen)" /></div>
        <AppSelect value={catF} onChange={(v) => { setCatF(v); setLimit(60); }} options={cats} className="input px-2.5 py-2.5 text-sm mt-4 mb-3 self-stretch" style={{ flex: "0 0 45%", width: "45%", maxWidth: "16rem" }} title="Filter op categorie" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2 -mx-4 px-4 text-xs">
        {["Alle", ...SEASONS].map((s) => (
          <button key={s} onClick={() => { setSeasonF(s); setLimit(60); }} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (seasonF === s ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-1 -mx-4 px-4 text-xs">
        <button onClick={() => setSortMode("seizoen")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "seizoen" ? "pillon" : "pill")}>Seizoen</button>
        <button onClick={() => setSortMode("nieuw")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "nieuw" ? "pillon" : "pill")}>Laatst toegevoegd</button>
        <button onClick={() => setSortMode("used")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "used" ? "pillon" : "pill")}>Veel gebruikt</button>
        <button onClick={() => setSortMode("az")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "az" ? "pillon" : "pill")}>A–Z</button>
      </div>
      {bedoeldeJe && <div className="rounded-xl p-3 mb-2 text-[13px]" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>Geen resultaten voor "{q}" — bedoelde je:</div>}
      <div className="text-right text-xs mute mb-2">{sorted.length} {sorted.length === 1 ? "recept" : "recepten"}</div>
      <div className="space-y-2.5">
        {visible.map((r) => (
          <button key={r.id} onClick={() => onOpen(r.id)} className="card cardh ff w-full text-left p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="serif ink font-bold text-lg leading-tight truncate">{r.name}</span>
                {(r.isBase || varsOf(r.id).length > 0) && <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e8ebe0", color: T.green }}><GitBranch size={10} /> basis</span>}
                {r.ferment && <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e6e9df", color: "#46603f" }}><FlaskConical size={10} /> ferment</span>}
              </div>
              <div className="text-sm mute mt-0.5 truncate">{r.category} · {r.yield}</div>
              {(() => { const vs = varsOf(r.id); if (!vs.length) return null; const top = vs.slice(0, 4); return (
                <div className="text-[12.5px] mt-1 leading-snug" style={{ color: "#5d6a52" }}>
                  <GitBranch size={11} className="inline mr-1 align-[-1px]" />
                  {top.map((v) => v.name).join(" · ")}{vs.length > top.length && <span className="mute"> +{vs.length - top.length}</span>}
                </div>
              ); })()}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[12.5px]">
                {r.garden && <span className="inline-flex items-center gap-1 acc"><Sprout size={12} /> tuin</span>}
                {r.season.filter((s) => s !== "Hele jaar").map((s) => <SeasonPill key={s} s={s} />)}
                {r.diet !== "Vegetarisch" && <MeatPill diet={r.diet} />}
                <AllergenPills list={recipeAllergens(r)} />
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
// Allergenenlabel: één compacte pill met alle gevonden allergenen.
function AllergenPills({ list }) {
  if (!list || !list.length) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full text-[11.5px] font-medium px-1.5 py-0.5" style={{ background: "#f3e6d2", color: "#8a5f2a" }} title="Automatisch herkend in de ingrediënten">
      <AlertTriangle size={11} /> {list.join(" · ")}
    </span>
  );
}

const FERMENT_METHODS = ["Melkzuur", "Suikerfermentatie", "Azijnfermentatie"];

function FermentList({ batches, recipes, stock, canEdit, onToggleDone, onDeleteBatch, onEditBatch, onOpenLog, onOpenRecipe, onNewFermentRecipe, onStartBatch, onOpenMeasure, onAck, onExtend }) {
  const [limit, setLimit] = useState(30);
  const [seasonF, setSeasonF] = useState("Alle");
  const [methodF, setMethodF] = useState("Alle");
  const [fSort, setFSort] = useState("nieuw");
  const [q, setQ] = useState("");
  const openAction = batches.some((b) => !b.done && (batchStatus(b).due.length > 0 || batchStatus(b).ready));
  const [openActive, setOpenActive] = useState(openAction);
  const [touchedActive, setTouchedActive] = useState(false);
  // Zolang niemand het handmatig heeft omgezet, volgt het paneel de openstaande handelingen.
  useEffect(() => { if (!touchedActive) setOpenActive(openAction); }, [openAction, touchedActive]);
  const [openDone, setOpenDone] = useState(false);
  const [openMonths, setOpenMonths] = useState({}); // per maand in-/uitklappen van afgeronde batches
  const searching = q.trim().length > 0;
  const showActive = openActive && !searching;
  // Actief: wat het eerst klaar is bovenaan; afgerond: meest recent eerst.
  const endTs = (b) => {
    const t = new Date(String(b.startDate || "").slice(0, 10) + "T12:00:00").getTime();
    return isNaN(t) ? Infinity : t + (Number(b.days) || 0) * 86400000;
  };
  const active = batches.filter((b) => !b.done).sort((a, b) => endTs(a) - endTs(b));
  const done = batches.filter((b) => b.done).sort((a, b) => {
    const fa = String(a.finishedDate || ""), fb = String(b.finishedDate || "");
    return fa < fb ? 1 : fa > fb ? -1 : 0;
  });
  // Afgeronde batches gebundeld per maand (nieuwste maand bovenaan), elk apart
  // in te klappen zodat de lijst overzichtelijk blijft naarmate hij groeit.
  const MAANDEN = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
  const doneGroups = (() => {
    const g = {};
    for (const b of done) { const k = String(b.finishedDate || b.startDate || "").slice(0, 7) || "?"; (g[k] = g[k] || []).push(b); }
    return Object.keys(g).sort((a, b) => (a < b ? 1 : -1)).map((k) => {
      const [y, m] = k.split("-");
      const label = m && MAANDEN[Number(m) - 1] ? MAANDEN[Number(m) - 1] + " " + y : "Datum onbekend";
      return { k, label, list: g[k] };
    });
  })();
  const madeCount = {};
  (stock || []).forEach((v) => { if (v.recipeId) madeCount[v.recipeId] = (madeCount[v.recipeId] || 0) + 1; });
  const varsOf = (id) => recipes.filter((r) => r.baseId === id && r.ferment).sort((a, b) => (madeCount[b.id] || 0) - (madeCount[a.id] || 0) || a.name.localeCompare(b.name, "nl"));
  const query = q.trim().toLowerCase();
  // Zonder zoekterm: variaties niet los tonen; met zoekterm: zoek op naam en ingrediënten.
  let bedoeldeJe = false;
  let fermentRecipes = recipes.filter((r) => r.ferment && (query ? strictMatchRecipe(r, query) : !r.baseId));
  if (query && fermentRecipes.length === 0) {
    fermentRecipes = recipes.filter((r) => r.ferment && matchRecipe(r, query));
    bedoeldeJe = fermentRecipes.length > 0;
  }
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
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0" style={{ flex: "1 1 55%" }}><SearchBar value={q} onChange={(v) => { setQ(v); setLimit(30); }} placeholder="Zoek op naam of ingrediënt" /></div>
        <AppSelect value={methodF} onChange={(v) => { setMethodF(v); setLimit(30); }} options={["Alle", ...FERMENT_METHODS].map((m) => ({ value: m, label: m === "Alle" ? "Alle methodes" : m }))} className="input px-2.5 py-2.5 text-sm mt-4 mb-3 self-stretch" style={{ flex: "0 0 45%", width: "45%", maxWidth: "16rem" }} title="Filter op fermentatiesoort" />
      </div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { setTouchedActive(true); setOpenActive((o) => !o); }} className="ff inline-flex items-center gap-1" disabled={searching}>
          {!searching && (openActive ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />)}
          <Eyebrow>Actieve batches ({active.length})</Eyebrow>
        </button>
        <div className="flex items-center gap-3">
          {canEdit && active.length > 0 && <button onClick={onOpenMeasure} className="ff inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70 mb-2" title="Metingen invullen voor alle actieve batches"><Thermometer size={14} /> Metingen</button>}
        </div>
      </div>
      {showActive && (active.length > 0
        ? <div className="grid grid-cols-2 gap-2.5">{active.map((b) => <BatchCard key={b.id} b={b} canEdit={canEdit} onToggleDone={onToggleDone} onDelete={onDeleteBatch} onEdit={onEditBatch} onOpenLog={onOpenLog} onAck={onAck} onExtend={onExtend} />)}</div>
        : <Empty label="Nog geen actieve batches." />)}
      {done.length > 0 && <>
        <button onClick={() => setOpenDone((o) => !o)} className="ff mt-5 mb-2 flex items-center gap-1">
          {openDone ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />}
          <Eyebrow>Afgerond ({done.length})</Eyebrow>
        </button>
        {openDone && <div className="space-y-3">
          {doneGroups.map((gr) => (
            <div key={gr.k}>
              <button onClick={() => setOpenMonths((o) => ({ ...o, [gr.k]: !o[gr.k] }))} className="ff w-full flex items-baseline justify-between mb-1.5">
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold ink">{openMonths[gr.k] ? <ChevronUp size={13} className="acc" /> : <ChevronDown size={13} className="acc" />} <span className="capitalize">{gr.label}</span></span>
                <span className="text-[11.5px] mute">{gr.list.length} {gr.list.length === 1 ? "batch" : "batches"}</span>
              </button>
              {openMonths[gr.k] && <div className="grid grid-cols-2 gap-2.5">{gr.list.map((b) => <BatchCard key={b.id} b={b} canEdit={canEdit} onToggleDone={onToggleDone} onDelete={onDeleteBatch} onEdit={onEditBatch} onOpenLog={onOpenLog} onAck={onAck} onExtend={onExtend} />)}</div>}
            </div>
          ))}
        </div>}
      </>}
      <div className="mt-7 flex items-center justify-between"><Eyebrow>Fermentatierecepten</Eyebrow>
        {canEdit && <button onClick={onNewFermentRecipe} className="ff inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70 mb-2"><Plus size={14} /> Nieuw fermentatierecept</button>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-2 -mx-4 px-4 text-xs">
        {["Alle", ...SEASONS].map((s) => (
          <button key={s} onClick={() => { setSeasonF(s); setLimit(30); }} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (seasonF === s ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mb-2 text-xs overflow-x-auto no-scrollbar -mx-4 px-4">
        <button onClick={() => setFSort("seizoen")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (fSort === "seizoen" ? "pillon" : "pill")}>Seizoen</button>
        <button onClick={() => setFSort("nieuw")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (fSort === "nieuw" ? "pillon" : "pill")}>Laatst toegevoegd</button>
        <button onClick={() => setFSort("az")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (fSort === "az" ? "pillon" : "pill")}>A–Z</button>
      </div>
      {bedoeldeJe && <div className="rounded-xl p-3 mb-2 text-[13px]" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>Geen resultaten voor "{query}" — bedoelde je:</div>}
      <div className="text-right text-xs mute mb-2">{fermentRecipes.length} recepten</div>
      <div className="space-y-2.5">
        {fermentRecipes.slice(0, limit).map((r) => (
          <button key={r.id} onClick={() => onOpenRecipe(r.id)} className="card cardh ff w-full text-left p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="serif ink font-bold text-lg leading-tight truncate">{r.name}</span>
                {(r.isBase || varsOf(r.id).length > 0) && <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e8ebe0", color: T.green }}><GitBranch size={10} /> basis</span>}
                {r.fermentMethod && <span className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold rounded px-1.5 py-0.5" style={{ background: "#e6e9df", color: "#46603f" }}><FlaskConical size={10} /> {r.fermentMethod}</span>}
              </div>
              <div className="text-sm mute mt-0.5 truncate">{r.category} · {r.yield}</div>
              {(() => { const vs = varsOf(r.id); if (!vs.length) return null; const top = vs.slice(0, 4); return (
                <div className="text-[12.5px] mt-1 leading-snug" style={{ color: "#5d6a52" }}>
                  <GitBranch size={11} className="inline mr-1 align-[-1px]" />
                  {top.map((v) => v.name).join(" · ")}{vs.length > top.length && <span className="mute"> +{vs.length - top.length}</span>}
                </div>
              ); })()}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[12.5px]">
                {r.season.filter((sx) => sx !== "Hele jaar").map((sx) => <SeasonPill key={sx} s={sx} />)}
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
  const ready = [], items = [];
  const kday = kitchenDate();
  for (const b of batches) {
    if (b.done) continue;
    const st = batchStatus(b);
    if (st.ready) ready.push({ b, day: st.day });
    // Eén regel per batch: de eigen handeling van de kok (als die er is) en de
    // dagelijkse meting samen. Een meting op of na de keukendag (>= vangt ook
    // 00:00–02:00) haalt de meting eruit; afvinken haalt de handeling eruit.
    const needMeasure = st.day >= 1 && !(b.log || []).some((e) => String(e.date).slice(0, 10) >= kday);
    const label = st.due.length ? st.due[0] : null;
    if (label || needMeasure) items.push({ b, day: st.day, label, needMeasure });
  }
  return { ready, items };
}

// Herinneringsbanner (fermentatiemetingen, schoonmaakcontrole): valt op zonder
// het werk te blokkeren. Zit net onder de navigatie, weg te klikken met het kruisje.
function ReminderBanner({ icon, title, text, actionLabel, onAction, onDismiss, groep = "HACCP" }) {
  // Inklapbaar: de ingeklapte stand wordt per keukendag onthouden, zodat de
  // banner klein blijft tot 02:00 maar de volgende werkdag weer open begint.
  const dichtKey = "ritme:banner-dicht:" + groep + ":" + title;
  const [dicht, setDicht] = useState(() => { try { return localStorage.getItem(dichtKey) === kitchenDate(); } catch (e) { return false; } });
  const zetDicht = (v) => { setDicht(v); try { if (v) localStorage.setItem(dichtKey, kitchenDate()); else localStorage.removeItem(dichtKey); } catch (e) {} };
  if (dicht) return (
    <div className="rounded-xl px-4 py-3 mt-4 flex items-center gap-2" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
      <div className="font-semibold flex items-center gap-1.5 text-sm flex-1 min-w-0 truncate">{icon} {groep} vraagt aandacht</div>
      <button onClick={() => zetDicht(false)} className="ff shrink-0 rounded-lg p-1 hover:opacity-70" title="Uitklappen"><ChevronDown size={16} /></button>
      <button onClick={onDismiss} className="ff shrink-0 rounded-lg p-1 hover:opacity-70" title="Sluiten"><X size={16} /></button>
    </div>
  );
  return (
    <div className="rounded-xl p-4 mt-4" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold flex items-center gap-1.5 text-sm">{icon} {title}</div>
          <p className="mt-1 text-sm">{text}</p>
          <button onClick={onAction} className="ff mt-2 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-semibold" style={{ background: "#e6dcc2" }}>{actionLabel}</button>
        </div>
        <button onClick={() => zetDicht(true)} className="ff shrink-0 rounded-lg p-1 hover:opacity-70" title="Inklappen"><ChevronUp size={16} /></button>
        <button onClick={onDismiss} className="ff shrink-0 rounded-lg p-1 hover:opacity-70" title="Sluiten"><X size={16} /></button>
      </div>
    </div>
  );
}

function NoticeBanner({ batches, canAck, onAck, onMeasure, onOpen, onDismiss }) {
  const { ready, items } = collectNotices(batches);
  if (ready.length === 0 && items.length === 0) return null;
  const short = (t) => (t.length > 48 ? t.slice(0, 48).trim() + "…" : t);
  const dichtKey = "ritme:banner-dicht:Fermentatie";
  const [dicht, setDicht] = useState(() => { try { return localStorage.getItem(dichtKey) === kitchenDate(); } catch (e) { return false; } });
  const zetDicht = (v) => { setDicht(v); try { if (v) localStorage.setItem(dichtKey, kitchenDate()); else localStorage.removeItem(dichtKey); } catch (e) {} };
  if (dicht) return (
    <div className="rounded-xl px-4 py-3 mt-4 flex items-center gap-2" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
      <div className="font-semibold flex items-center gap-1.5 text-sm flex-1 min-w-0 truncate"><Bell size={15} /> Fermentatie vraagt aandacht</div>
      <button onClick={() => zetDicht(false)} className="ff shrink-0 rounded-lg p-1 hover:opacity-70" title="Uitklappen"><ChevronDown size={16} /></button>
      <button onClick={onDismiss} className="ff shrink-0 rounded-lg p-1 hover:opacity-70" title="Verberg tot 02:00 vannacht"><X size={16} /></button>
    </div>
  );
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
            {items.map(({ b, day, label, needMeasure }) => (
              <li key={b.id + "__item"} className="flex items-start gap-1.5">
                <FlaskConical size={14} className="shrink-0 mt-0.5" />
                <span className="flex-1"><span className="font-medium">{b.product}</span> aandacht: {[label ? short(label) : null, needMeasure ? "meting" : null].filter(Boolean).join(" en ")} — dag {day}/{b.days}</span>
                <div className="flex flex-wrap justify-end gap-1 shrink-0">
                  {label && canAck && <button onClick={() => onAck(b.id, label)} className="ff rounded-md px-1.5 py-0.5 text-[12.5px] font-semibold" style={{ background: "#e6dcc2" }} title="Handeling gedaan — verberg tot morgen">Afvinken</button>}
                  {needMeasure && canAck && <button onClick={() => onMeasure(b.id)} className="ff rounded-md px-1.5 py-0.5 text-[12.5px] font-semibold" style={{ background: "#e6dcc2" }} title="Meting invullen voor deze batch">Meten</button>}
                </div>
              </li>
            ))}
          </ul>
          <button onClick={onOpen} className="ff mt-2.5 inline-flex items-center gap-1 text-xs font-semibold underline">Naar fermentatie</button>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button onClick={() => zetDicht(true)} className="ff rounded-lg p-1 hover:opacity-70" title="Inklappen"><ChevronUp size={16} /></button>
          <button onClick={onDismiss} className="ff rounded-lg p-1 hover:opacity-70" title="Verberg tot 02:00 vannacht"><X size={16} /></button>
        </div>
      </div>
    </div>
  );
}

// Wat moet er vandaag met deze batch gebeuren, en is hij klaar?
function batchStatus(b) {
  const day = daysBetween(b.startDate);
  const today = kitchenDate(); // afvinkingen gelden tot 02:00
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

function BatchCard({ b, canEdit, onToggleDone, onDelete, onEdit, onOpenLog, onAck, onExtend }) {
  const [open, setOpen] = useState(false);
  const { day, ready, readyRaw, due, acked } = batchStatus(b);
  const tgt = FERMENT_TARGETS[b.method] || FERMENT_TARGETS[b.type];
  const lastPh = (b.log && b.log.length) ? [...b.log].reverse().find((e) => e.ph != null) : null;
  const lastBrix = (b.log && b.log.length) ? [...b.log].reverse().find((e) => e.brix != null) : null;
  return (
    <div className="card p-3 flex flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <span className={"serif ink text-[17px] leading-tight break-words min-w-0" + (b.done ? "" : " font-bold")}>{b.product}</span>
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
          {b.done && b.finishedDate && <>{fmtDMY(b.finishedDate)}</>}
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
            <span>Start {fmtDMY(b.startDate)}</span>
            {b.finishedDate && <span>Klaar {fmtDMY(b.finishedDate)}</span>}
            {b.saltPct ? <span>Zout {String(b.saltPct).replace(".", ",")}%</span> : null}
            {b.sugarPct ? <span>Suiker {String(b.sugarPct).replace(".", ",")}%</span> : null}
            {b.tempC ? <span>{b.tempC}°C</span> : null}
            {b.pH != null ? <span>pH {String(b.pH).replace(".", ",")}</span> : null}
            <span>{(b.log || []).length} metingen</span>
            {b.amount && b.amount !== "—" && <span>{b.amount}</span>}
            <span>door {b.by}</span>
          </div>
          {b.notes && <p className="mt-1 italic">{b.notes}</p>}
          {(b.log || []).length > 0 && (() => {
            const last = [...b.log].sort((a, z) => (a.date < z.date ? 1 : -1))[0];
            const parts = [last.ph != null && last.ph !== "" && ("pH " + String(last.ph).replace(".", ",")), last.brix != null && last.brix !== "" && (String(last.brix).replace(".", ",") + " °Bx"), last.tempC != null && last.tempC !== "" && (String(last.tempC).replace(".", ",") + " °C")].filter(Boolean);
            return (
              <div className="mt-1.5 rounded-lg px-2.5 py-1.5" style={{ background: "#eef1e6" }}>
                <span className="font-medium" style={{ color: T.green }}>Laatste meting</span> <span className="ink">{fmtDMY(last.date)}</span>{parts.length > 0 && <span className="ink"> · {parts.join(" · ")}</span>}
                {last.note && <span className="italic"> · {last.note}</span>}
              </div>
            );
          })()}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <button onClick={() => onOpenLog(b.id)} className="inline-flex items-center gap-1 font-medium acc hover:opacity-70"><LineChart size={12} /> Logboek</button>
              <button onClick={() => onEdit(b.id)} className="inline-flex items-center gap-1 font-medium acc hover:opacity-70"><Pencil size={12} /> Bewerk</button>
              {!b.done && <button onClick={() => onExtend(b.id)} className="inline-flex items-center gap-1 font-medium acc hover:opacity-70" title="Verleng het proces met een dag (vaker klikken = meer dagen)"><Plus size={12} /> 1 dag</button>}
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
  // Doorklikken op een combinatie-chip: spring naar dat product (open + scroll),
  // zodat koks van smaak naar smaak kunnen blijven combineren.
  const cardRefs = React.useRef({});
  const jumpTo = (naam) => {
    const doel = pairings.find((pp) => norm(pp.name) === norm(naam));
    if (!doel) return;
    setQ(""); setSeasonF("Alle");
    setOpen(doel.name);
    setTimeout(() => { const el = cardRefs.current[doel.name]; if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60);
  };
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
        <button onClick={() => setSortMode("seizoen")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "seizoen" ? "pillon" : "pill")}>Seizoen</button>
        <button onClick={() => setSortMode("nieuw")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "nieuw" ? "pillon" : "pill")}>Laatst toegevoegd</button>
        <button onClick={() => setSortMode("az")} className={"ff shrink-0 rounded-full px-2.5 py-1 font-medium " + (sortMode === "az" ? "pillon" : "pill")}>A–Z</button>
      </div>
      <div className="text-right text-xs mute mb-2">{shown.length} producten</div>
      <div className="space-y-2">
        {shown.map((p) => (
          <div key={p.name} ref={(el) => { cardRefs.current[p.name] = el; }} className="card overflow-hidden">
            <button onClick={() => setOpen(open === p.name ? null : p.name)} className="ff w-full flex items-center justify-between px-4 py-3 text-left">
              <span className="serif ink font-bold text-lg flex items-center gap-2 flex-wrap">{cap(p.name)} {(((p.season && p.season.length) ? p.season : (SEASON[p.name] || [])).filter((s) => s !== "Hele jaar")).map((s) => <SeasonPill key={s} s={s} />)}</span>
              <ChevronRight size={16} className={"transition-transform " + (open === p.name ? "rotate-90" : "")} style={{ color: "#c4c2b2" }} />
            </button>
            {open === p.name && editing !== p.name && (
              <div className="px-4 pb-4 -mt-1">
                <p className="text-xs mute mb-2 italic">{p.note}</p>
                <div className="flex flex-wrap gap-1.5">{p.pairs.map((x) => {
                  const bestaat = pairings.some((pp) => norm(pp.name) === norm(x));
                  return bestaat
                    ? <button key={x} onClick={() => jumpTo(x)} className="chip ff rounded-full text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1 hover:opacity-70" title={"Spring naar " + x}>{x} <ChevronRight size={11} /></button>
                    : <span key={x} className="chip rounded-full text-xs font-medium px-2.5 py-1">{x}</span>;
                })}</div>
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
// Wat een lepel, een stuk of een centimeter van iets weegt. Hiermee rekent de
// app de kostprijs van "20 el mosterd" of "10 st kaneelstok" uit. Alles in
// grammen; een theelepel telt als een derde eetlepel. Leeg = geen automatische
// prijs, liever een gat dan een verzonnen bedrag.
const MAAT_ROWS = [
  { naam: "water", el: "15", stuk: "", cm: "" },
  { naam: "azijn", el: "15", stuk: "", cm: "" },
  { naam: "olie", el: "14", stuk: "", cm: "" },
  { naam: "wijn", el: "15", stuk: "", cm: "" },
  { naam: "melk", el: "15", stuk: "", cm: "" },
  { naam: "room", el: "15", stuk: "", cm: "" },
  { naam: "yoghurt", el: "15", stuk: "", cm: "" },
  { naam: "crème fraîche", el: "15", stuk: "", cm: "" },
  { naam: "mayonaise", el: "14", stuk: "", cm: "" },
  { naam: "boter", el: "14", stuk: "", cm: "" },
  { naam: "honing", el: "21", stuk: "", cm: "" },
  { naam: "stroop", el: "21", stuk: "", cm: "" },
  { naam: "mosterd", el: "16", stuk: "", cm: "" },
  { naam: "sojasaus", el: "17", stuk: "", cm: "" },
  { naam: "ketjap", el: "18", stuk: "", cm: "" },
  { naam: "tomatenpuree", el: "16", stuk: "", cm: "" },
  { naam: "suiker", el: "12,5", stuk: "", cm: "" },
  { naam: "basterdsuiker", el: "12", stuk: "", cm: "" },
  { naam: "poedersuiker", el: "8", stuk: "", cm: "" },
  { naam: "zout", el: "18", stuk: "", cm: "" },
  { naam: "zeezout grof", el: "15", stuk: "", cm: "" },
  { naam: "bloem", el: "8", stuk: "", cm: "" },
  { naam: "maizena", el: "8", stuk: "", cm: "" },
  { naam: "griesmeel", el: "10", stuk: "", cm: "" },
  { naam: "bakpoeder", el: "12", stuk: "", cm: "" },
  { naam: "baksoda", el: "14", stuk: "", cm: "" },
  { naam: "cacao", el: "6", stuk: "", cm: "" },
  { naam: "gedroogde kruiden", el: "2", stuk: "", cm: "" },
  { naam: "gemalen specerij", el: "7", stuk: "", cm: "" },
  { naam: "peper", el: "7", stuk: "", cm: "" },
  { naam: "paprikapoeder", el: "7", stuk: "", cm: "" },
  { naam: "komijn", el: "6", stuk: "", cm: "" },
  { naam: "koriander", el: "6", stuk: "", cm: "" },
  { naam: "kurkuma", el: "8", stuk: "", cm: "6" },
  { naam: "kaneel", el: "7", stuk: "", cm: "" },
  { naam: "gemberpoeder", el: "6", stuk: "", cm: "" },
  { naam: "mosterdzaad", el: "11", stuk: "", cm: "" },
  { naam: "sesamzaad", el: "9", stuk: "", cm: "" },
  { naam: "lijnzaad", el: "10", stuk: "", cm: "" },
  { naam: "chiazaad", el: "12", stuk: "", cm: "" },
  { naam: "rijst", el: "13", stuk: "", cm: "" },
  { naam: "havermout", el: "5", stuk: "", cm: "" },
  { naam: "paneermeel", el: "6", stuk: "", cm: "" },
  { naam: "geraspte kaas", el: "6", stuk: "", cm: "" },
  { naam: "noten gehakt", el: "8", stuk: "", cm: "" },
  { naam: "rozijnen", el: "10", stuk: "", cm: "" },
  { naam: "gelatinepoeder", el: "9", stuk: "", cm: "" },
  { naam: "agar", el: "5", stuk: "", cm: "" },
  { naam: "gelatineblaadje", el: "", stuk: "1,7", cm: "" },
  { naam: "ui", el: "", stuk: "150", cm: "" },
  { naam: "rode ui", el: "", stuk: "130", cm: "" },
  { naam: "ui", el: "", stuk: "40", cm: "" },
  { naam: "knoflook", el: "", stuk: "5", cm: "" },
  { naam: "ei", el: "", stuk: "55", cm: "" },
  { naam: "eidooier", el: "", stuk: "18", cm: "" },
  { naam: "eiwit", el: "", stuk: "33", cm: "" },
  { naam: "citroen", el: "", stuk: "100", cm: "" },
  { naam: "limoen", el: "", stuk: "65", cm: "" },
  { naam: "sinaasappel", el: "", stuk: "200", cm: "" },
  { naam: "appel", el: "", stuk: "170", cm: "" },
  { naam: "peer", el: "", stuk: "180", cm: "" },
  { naam: "wortel", el: "", stuk: "90", cm: "" },
  { naam: "aardappel", el: "", stuk: "150", cm: "" },
  { naam: "tomaat", el: "", stuk: "120", cm: "" },
  { naam: "paprika", el: "", stuk: "160", cm: "" },
  { naam: "courgette", el: "", stuk: "250", cm: "" },
  { naam: "komkommer", el: "", stuk: "400", cm: "" },
  { naam: "prei", el: "", stuk: "250", cm: "" },
  { naam: "venkel", el: "", stuk: "300", cm: "" },
  { naam: "bleekselderij stengel", el: "", stuk: "60", cm: "" },
  { naam: "laurierblad", el: "", stuk: "0,2", cm: "" },
  { naam: "kaneelstok", el: "", stuk: "2,5", cm: "" },
  { naam: "kruidnagel", el: "", stuk: "0,1", cm: "" },
  { naam: "steranijs", el: "", stuk: "1", cm: "" },
  { naam: "kardemompeul", el: "", stuk: "0,15", cm: "" },
  { naam: "jeneverbes", el: "", stuk: "0,1", cm: "" },
  { naam: "chilipeper", el: "", stuk: "8", cm: "" },
  { naam: "gember", el: "", stuk: "", cm: "8" },
  { naam: "mierikswortel", el: "", stuk: "", cm: "10" },
  { naam: "citroengras", el: "", stuk: "20", cm: "3" },
];

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
    "Het aandeel glucose is een deel van het suikergewicht: 28% suiker met 25% glucose = 210 g bietsuiker + 70 g glucose per kg.",
    "Glucosepoeder (DE 38–40) verlaagt de zoetkracht en houdt het ijs smeuïg. Ga niet boven ~25%, anders wordt het taai.",
    "Te weinig suiker geeft een harde, scherpe textuur; te veel suiker laat het ijs niet opstijven.",
    "Laat roomijsbasis 12 uur koud rijpen voor het draaien; draai af op −8 tot −10 °C.",
  ],
  maten: [
    "Een theelepel telt als een derde eetlepel; een kop als 240 ml.",
    "Staat een ingrediënt er niet bij, dan rekent de app een eetlepel als 15 gram — vul 'm hier aan als dat niet klopt.",
    "Bij stuks en centimeters zonder gewicht rekent de app niets uit; die prijs vul je in het recept zelf in.",
    "Weeg een keer na wat bij jullie in huis is: een ui van 150 gram is een aanname, geen wet.",
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
          <span className="serif ink font-bold text-lg block leading-tight">{title}</span>
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

// Assortiment- en cateringstandaarden van De Beug (gewichten en samenstelling).
const CATERING_STANDARDS = [
  { key: "std-lunch", title: "Lunch & lekkernij", intro: "Assortiment de Beug — standaarden per gast", secties: [
    { kop: "Lunch op de Beug", regels: ["Soep 200 ml + een garnituur erin","Broodje ± 90 gram (1/5e stokbrood, ½ sandwich 3-laags, of bolletje 90 gram)","Mini quiche","½ wrap, rijkelijk gevuld","Kleine salade per 5 personen in een schaaltje"] },
    { kop: "Huisgemaakte hartige lekkernij (klein hartig hapje) — voorbeelden", regels: ["Tarte tatin van tomaat met basilicummousse","Bladerdeegpastei gevuld met groenten en bijpassende saus","Mini quiche","Krokante rösti met luchtige mousse","Loempia met lekkere dip","Flensje met pulled oesterzwam","Bruschetta met tomatensalsa"] },
    { kop: "Zoet", regels: ["Huisgemaakte zoete lekkernij: door Riana gemaakt","Rosa en Vanilla: ons dieetgebak","Friandises: assortiment van 3 soorten zoete lekkernij op een bordje van Riana"] },
    { kop: "Extra snacks bij vergaderingen", regels: ["Flensje | pulled kingboleet | Utrechtse ui | hoisinsaus","Wrap | pulled pork | bbq-saus | koolsalade"] },
  ]},
  { key: "std-lunchcatering", title: "Lunch catering", intro: "Lunchboxen en bijverkopen", secties: [
    { kop: "Lunchbox per 6 personen — vegetarisch (van alles 6 stuks)", regels: ["Bolletje 90 g / halve sandwich 3-laags / stokbrood 1/5e, rijkelijk belegd met groenten/kaas","Halve wrap, rijkelijk gevuld","Mini quiche","Zoetigheid van Riana (ter grootte van de mini quiche)"] },
    { kop: "Lunchbox per 6 personen — vegan (van alles 6 stuks)", regels: ["Bolletje 90 g / halve sandwich 3-laags / stokbrood 1/5e, rijkelijk belegd met groenten","Halve wrap, rijkelijk gevuld","Tarte tatin met groenten","Zoetigheid van Riana (ter grootte van de mini quiche)"] },
    { kop: "Warme lunch (bv. lauwwarme pastasalade met brood van Menno)", regels: ["400 gram pastasalade, rijkelijk gevuld met groenten","1 snee landbrood met olijfolie"] },
    { kop: "Sandwich van brood van Menno", regels: ["3-laags sandwich, rijkelijk belegd met smeersels, groenten en sla"] },
    { kop: "Extra bijverkopen lunch catering", regels: ["Vegetarische soep, rijkelijk gevuld: per 6 personen 1,2 liter totaal","Volle boerenyoghurt met huisgemaakte granola per 6 personen (1 fles yoghurt en 300 gram granola)","Moestuinsalade met kruidendressing, rijkelijk gevuld met groenten uit de tuin","Extra: punt quiche"] },
  ]},
  { key: "std-borrel", title: "Borrel", intro: "Porties en planken", secties: [
    { kop: "Bitterballen (per portie)", regels: ["Rundvlees: 6 stuks + mosterdmayonaise","Oesterzwam: 6 stuks + sesammayonaise"] },
    { kop: "Charcuterie van de Buitengewone Varkens van de Beug (5 p per plank, 250 g ham totaal)", regels: ["Coppa 40 gram","Lomo 40 gram","Grillworst 100 gram","Droge worst 70 gram","Klein bakje olijfjes, ± 10 stuks"] },
    { kop: "Kaasplank met lokale kazen (5 p per plank, 300 g kaas totaal)", regels: ["Uut Hooi geit 75 gram","Uut Hooi koekaas 75 gram","Oudwijcker Fiore 75 gram","Oudwijcker 75 gram","Jam/confituur","Trosje druiven","Bolletje noot/rozijnen"] },
    { kop: "Seizoenstapas uit de tuin van de Beug (5 borrelhapjes) — voorbeelden", regels: ["Gepofte biet | geitenkaas | dukkah | snijbiet","Gekonfijte wortel | zuurdesemkrokant | uicrème","Tarte tatin van pompoen | honingkaramel","Gevulde champignon","Frittata of quiche"] },
    { kop: "Seizoenstapas vegan (5 borrelhapjes) — voorbeelden", regels: ["Gepofte biet | dukkah","Gekonfijte wortel | zuurdesemkrokant | uicrème","Tarte tatin van pompoen | honingkaramel","Gevulde champignon","Filodeegkrokant | baba ganoush | mosterdsla | zonnebloempit"] },
    { kop: "Supplementen vlees", regels: ["Gehaktballetjes in tomatensaus en lavaskruiden","Buikspek met sesamlak en zoete-aardappelcrème","Tessinger plaatham op crostini","Boerenpaté op briochebrood met relish van seizoensgroenten/fruit","1 spare rib"] },
  ]},
  { key: "std-diner", title: "Diner & walking diner", intro: "Gangen met gewichten per persoon", secties: [
    { kop: "Brood", regels: ["Zuurdesembrood of breekbrood met 3 verschillende spreads en dips (bv. groene-kruidenboter | hummus | tomatensalsa)"] },
    { kop: "4-gangen shared diner (vegetarisch) — smaken uit de tuin van de Beug", regels: ["Voorgerechten standaard met zuurdesembrood en 3 soorten dips","3 voorgerechten, totaal 120 g p.p. (40 g per item) — bv. tarte tatin van pompoen | ricotta · dun gesneden koolrabi | raapstelen | kappertjes · tartaar van biet | balsamicoglaze | geglaceerde champignons | geitenkaas | walnoten","Soep 200 ml — met een lekker garnituur en eventueel iets krokants","Hoofdgerechten op tafel, totaal 300 g p.p. — linzen met gekleurde wortels en raapstelen (80 g) · krielaardappels met knoflookscheuten en tijm (75 g) · hele bloemkool geroosterd, bloemkoolcrème, dukkah, chimichurri (80 g) · gebakken polenta | oude hooikaas | groene kruiden (50 g) · salade van veldsla, radijs, ingelegde groenten, pompoenpitten en worteldressing (25 g)","Dessertvariatie, totaal 150 g p.p. (50 g per item, 2 à 3 items p.p.) — chocolademousse · panna cotta · cheesecake"] },
    { kop: "6-gangen walking diner (totaal max 500 g p.p.)", regels: ["Voorgerecht (50 g): mozaïek van prei | nori | uicrème | cashewnoot","Voorgerecht 2 (50 g): tartaar van biet | geitenkaas | hazelnoten | groene olie","Soep (150 ml): knolselderijbouillon | knolselderijcompote | oesterzwam","Tussengerecht (90 g): bloemkoolsteak | bloemkoolcrème | peer-relish | dukkah","Hoofdgerecht (110 g): paddenstoelrisotto | oesterzwam | amandel | bieslookolie | oudekaaskrokant","Dessert (50 g): chocolademousse | peercompote | kruimeldeeg | kletskop | bol ijs"] },
    { kop: "Overig", regels: ["3/4/5-gangen diner","Los hoofdgerecht"] },
  ]},
  { key: "std-dinercatering", title: "Diner catering & buffetten", intro: "Vergadermaaltijden, buffetten en open vuur", secties: [
    { kop: "Hoofdgerecht vergadermaaltijd (vegetarisch of vegan), verpakt per persoon — totaal 500 g p.p.", regels: ["200 gram groenten","200 gram koolhydraten","100 gram proteïne","Bijvoorbeeld: linzen | zoete aardappel | winterpeen | raapstelen | cashewnoten"] },
    { kop: "Smaken uit de tuin van de Beug (buffet), met of zonder klein dessert — totaal 600 g p.p. (aangepast)", regels: ["Minimaal vier gerechten op basis van seizoensgroenten uit de moestuin van Landgoed De Beug","250 gram groenten","250 gram koolhydraten","100 gram proteïne"] },
    { kop: "Voorbeeldbuffet", regels: ["Linzen met gekleurde wortels en raapstelen","Krielaardappels met knoflookscheuten en tijm","Hele bloemkool geroosterd, bloemkoolcrème, dukkah, chimichurri","Salade van veldsla, radijs, ingelegde groenten, pompoenpitten en worteldressing","Dessert: chocolademousse | moerbeicompote | kruimeldeeg | bol ijs | fruitgarnering"] },
    { kop: "Supplement vlees à 100 gram", regels: ["100 gram vlees, met daarbij wél een goede saus of crème met lak"] },
    { kop: "Extra voor catering diner", regels: ["Een avondmaaltijd in buffetvorm vanaf 15 pax (bv. krielaardappels met knoflookscheuten en tijm · hele bloemkool geroosterd, bloemkoolcrème, dukkah, chimichurri)"] },
    { kop: "Open vuur-diner in de moestuin (met dessert)", regels: ["De chef bereidt in de moestuin een 4-gangen diner op basis van seizoensgroenten; uitgeserveerd in de boomgaard (500 g totaal)","Voorgerecht: bereiding vanaf het vuur, gerecht live opgemaakt","Soep: live bereid op het vuur en daar afgemaakt","Hoofdgerecht: bereiding vanaf het vuur, gerecht live opgemaakt","Dessert · taart en zoetigheid"] },
  ]},
];

// ---------- Voorraad ----------
// Etiket printen via de Zebra-printerdriver (geen ZebraDesigner nodig).
// Formaat van het etiket (breedte x hoogte in mm) — ZD421: 102 x 38 mm.
const LABEL_MM = { w: 102, h: 38 };
function printLabel(recipe, inhoud, dates) {
  const prod = (dates && dates.prod) || localDate();
  let tht = (dates && dates.tht) || "";
  if (!tht && recipe.shelfDays) {
    const dt = new Date(prod + "T12:00:00");
    dt.setDate(dt.getDate() + Number(recipe.shelfDays));
    tht = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }
  const fmt = (iso) => { const [y, m, d] = iso.split("-"); return d + "-" + m + "-" + y; };
  const esc = (x) => String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  printHtmlInPagina('<!doctype html><html><head><meta charset="utf-8"><title>Etiket</title><style>' +
    "@page{size:" + LABEL_MM.w + "mm " + LABEL_MM.h + "mm;margin:0}" +
    "html,body{margin:0;padding:0}" +
    "body{width:" + LABEL_MM.w + "mm;height:" + LABEL_MM.h + "mm;font-family:Arial,Helvetica,sans-serif;overflow:hidden;position:relative}" +
    // Compact blok, verankerd aan de bovenrand: valt altijd binnen het etiket,
    // ook als de printer onderaan iets afsnijdt.
    "*{color:#000 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    // Vaste afstand van boven (geen flex-centrering: de afdrukpagina valt in de
    // praktijk iets hoger uit dan het etiket, waardoor 'het midden' te laag zakt).
    ".wrap{position:absolute;top:3mm;left:3mm;right:3mm;text-align:center}" +
    // Alles vet en ruim bemeten: dunne letters verdwijnen in het raster van de
    // thermische driver (203 dpi), dikke streken blijven staan.
    ".naam{font-weight:bold;font-size:14pt;line-height:1.1;margin:0 0 1mm 0;word-wrap:break-word}" +
    // Inhoudsregel (bv. "500 gram vacumeer zak"): alleen geprint als hij is ingevuld.
    ".inh{font-weight:bold;font-size:10pt;line-height:1.15;margin:0 0 0.5mm 0;word-wrap:break-word}" +
    ".rij{font-weight:bold;font-size:12pt;line-height:1.3;margin:0}" +
    // Allergenen: iets kleiner zodat de regel op het etiket past, wel vetgedrukt.
    ".alg{font-weight:bold;font-size:9pt;line-height:1.15;margin:1mm 0 0 0;word-wrap:break-word}" +
    "</style></head><body>" +
    '<div class="wrap">' +
    '<div class="naam">' + esc(recipe.name) + "</div>" +
    (inhoud && String(inhoud).trim() ? '<div class="inh">' + esc(String(inhoud).trim()) + "</div>" : "") +
    '<div class="rij">Gemaakt: ' + fmt(prod) + "</div>" +
    (tht ? '<div class="rij">T.H.T.: ' + fmt(tht) + "</div>" : "") +
    (() => { const alg = recipeAllergens(recipe); return alg.length ? '<div class="alg">Allergenen: ' + esc(alg.join(", ")) + "</div>" : ""; })() +
    "</div></body></html>");
}

// Popup bij "Etiket": vraagt gewicht en verpakkingswijze (bv. 500 gram vacumeer
// zak) voor op het etiket. Leeg gelaten = niets extra's printen. Sluit vanzelf
// zodra de printactie is gestart.
// Hoeveelheidstekst van een ingrediënt of opbrengst naar gram(equivalent) of
// stuks, voor het op-maat rekenen: "33,6 kg" → 33600 g, "8 st" → 8 stuks,
// "12 l" → 12000, kaal getal → stuks.
function parseAmountFlex(text) {
  const t = String(text || "").toLowerCase().replace(",", ".").trim();
  const m = t.match(/(\d+(?:\.\d+)?)\s*(kg|gram|gr|g|liter|l|dl|cl|ml|st|stuks?|x|×)?/);
  if (!m || !m[1]) return null;
  const n = Number(m[1]);
  const eh = m[2] || "";
  if (eh === "kg" || eh === "l" || eh === "liter") return { g: n * 1000 };
  if (eh === "dl") return { g: n * 100 };
  if (eh === "cl") return { g: n * 10 };
  if (eh === "g" || eh === "gr" || eh === "gram" || eh === "ml") return { g: n };
  return { count: n }; // st, x of kaal getal
}

// Op-maat rekenen: naar een doelopbrengst (C) of naar wat er van een ingrediënt
// beschikbaar is (D). Geeft de factor t.o.v. het originele recept.
function MaatModal({ recipe, onApply, onClose }) {
  const [doel, setDoel] = useState("");
  const [ingIdx, setIngIdx] = useState(0);
  const [beschikbaar, setBeschikbaar] = useState("");
  const [fout, setFout] = useState(null);
  const ings = recipe.ingredients || [];
  const ref = parseYieldRef(recipe.yieldAmount, recipe.yieldUnit, recipe.yield);
  const rekenOpbrengst = () => {
    const d = parseAmountFlex(doel);
    if (!d) { setFout("Vul een doelopbrengst in, bv. 12 l of 40 potten."); return; }
    let f = null;
    if (d.g != null && ref.refYield && ref.refUnitNum) f = d.g / (ref.refYield * ref.refUnitNum);
    else if (d.g != null && !ref.refYield && ref.refUnitNum) f = d.g / ref.refUnitNum;
    else if (d.count != null && ref.refYield) f = d.count / ref.refYield;
    if (!f || !isFinite(f) || f <= 0) { setFout("Kan de opbrengst van dit recept niet vergelijken met \"" + doel + "\" — probeer dezelfde eenheid als de receptopbrengst (" + (recipe.yield || "onbekend") + ")."); return; }
    onApply(f); onClose();
  };
  const rekenIngredient = () => {
    const ing = ings[ingIdx];
    if (!ing) return;
    const heb = parseAmountFlex(beschikbaar);
    const nodig = parseAmountFlex(ing.amount);
    if (!heb) { setFout("Vul in hoeveel je hebt, bv. 33,6 kg of 8 st."); return; }
    if (!nodig) { setFout("De hoeveelheid van \"" + ing.item + "\" (" + (ing.amount || "leeg") + ") is niet als getal te lezen."); return; }
    let f = null;
    if (heb.g != null && nodig.g != null) f = heb.g / nodig.g;
    else if (heb.count != null && nodig.count != null) f = heb.count / nodig.count;
    else if (heb.g != null && nodig.count != null) f = null;
    else if (heb.count != null && nodig.g != null) f = null;
    if (!f || !isFinite(f) || f <= 0) { setFout("Eenheden passen niet op elkaar: het recept vraagt \"" + ing.amount + "\" en jij vulde \"" + beschikbaar + "\" in."); return; }
    onApply(f); onClose();
  };
  return (
    <div className="card p-4 mt-2 max-w-md">
        <div className="flex items-start justify-between gap-3">
          <div className="serif ink text-lg leading-tight">Op maat rekenen</div>
          <button onClick={onClose} className="ff shrink-0 rounded-lg p-1 hover:opacity-70" title="Sluiten"><X size={16} /></button>
        </div>
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-widest acc mb-1">Naar opbrengst</div>
          <p className="text-[11.5px] mute mb-1.5">Recept geeft {recipe.yield || "?"}. Hoeveel wil je maken?</p>
          <div className="flex gap-2">
            <input className="input px-2.5 py-2 flex-1 text-sm" value={doel} onChange={(e) => { setDoel(e.target.value); setFout(null); }} onKeyDown={(e) => { if (e.key === "Enter") rekenOpbrengst(); }} placeholder="bv. 12 l of 40" />
            <button onClick={rekenOpbrengst} className="btnp ff shrink-0 rounded-lg px-3 text-sm font-semibold">Reken</button>
          </div>
        </div>
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid " + T.line }}>
          <div className="text-xs font-semibold uppercase tracking-widest acc mb-1">Naar wat je hebt</div>
          <p className="text-[11.5px] mute mb-1.5">Kies een ingrediënt en vul in hoeveel er is — de rest schaalt mee.</p>
          <AppSelect value={String(ingIdx)} onChange={(v) => setIngIdx(Number(v))} options={ings.map((i, j) => ({ value: String(j), label: i.item + " (" + (i.amount || "—") + ")" }))} />
          <div className="flex gap-2 mt-2">
            <input className="input px-2.5 py-2 flex-1 text-sm" value={beschikbaar} onChange={(e) => { setBeschikbaar(e.target.value); setFout(null); }} onKeyDown={(e) => { if (e.key === "Enter") rekenIngredient(); }} placeholder="bv. 33,6 kg" />
            <button onClick={rekenIngredient} className="btnp ff shrink-0 rounded-lg px-3 text-sm font-semibold">Reken</button>
          </div>
        </div>
        {fout && <p className="text-xs mt-3" style={{ color: "#8a4a3a" }}>{fout}</p>}
    </div>
  );
}

function LabelPrintModal({ recipe, onClose }) {
  const [gram, setGram] = useState("");
  const [pak, setPak] = useState("");
  // THT uit de houdbaarheid van het recept, gerekend vanaf een productiedatum.
  const thtVan = (p) => {
    if (!recipe.shelfDays || !p) return "";
    const dt = new Date(p + "T12:00:00");
    if (isNaN(dt)) return "";
    dt.setDate(dt.getDate() + Number(recipe.shelfDays));
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  };
  const [prod, setProd] = useState(localDate());
  const [tht, setTht] = useState(() => thtVan(localDate()));
  const [thtTouched, setThtTouched] = useState(false);
  // Productiedatum aangepast? Reken de THT mee, tenzij die zelf al is aangepast.
  const changeProd = (p) => { setProd(p); if (!thtTouched) setTht(thtVan(p)); };
  const doPrint = () => {
    const inhoud = [gram.trim() ? gram.trim() + " gram" : "", pak.trim()].filter(Boolean).join(" ");
    printLabel(recipe, inhoud, { prod: prod || localDate(), tht });
    onClose();
  };
  const enter = (e) => { if (e.key === "Enter") { e.preventDefault(); doPrint(); } };
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.45)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: T.paper }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="serif ink text-xl leading-tight">Etiket printen</div>
            <div className="text-xs mute mt-0.5 truncate">{recipe.name}</div>
          </div>
          <button onClick={onClose} className="ff shrink-0 rounded-lg p-1 hover:opacity-70" title="Sluiten"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div>
            <div className="text-xs mute mb-1">Gram</div>
            <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full text-sm" value={gram} onChange={(e) => setGram(e.target.value.replace(/[^0-9.,]/g, ""))} onKeyDown={enter} placeholder="500" />
          </div>
          <div>
            <div className="text-xs mute mb-1">Verpakkingswijze</div>
            <input className="input px-2.5 py-2 w-full text-sm" value={pak} onChange={(e) => setPak(e.target.value)} onKeyDown={enter} placeholder="vacumeer zak" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <div className="text-xs mute mb-1">Productiedatum</div>
            <input type="date" className="input px-2.5 py-2 w-full text-sm" value={prod} onChange={(e) => changeProd(e.target.value)} />
          </div>
          <div>
            <div className="text-xs mute mb-1">T.H.T.</div>
            <input type="date" className="input px-2.5 py-2 w-full text-sm" value={tht} onChange={(e) => { setTht(e.target.value); setThtTouched(true); }} />
          </div>
        </div>
        <p className="text-[11px] mute mt-2">Gram en verpakking leeg gelaten? Dan wordt er niets extra's aan het etiket toegevoegd.</p>
        <button onClick={doPrint} className="btnp ff w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold px-3.5 py-2"><Printer size={15} /> Printen</button>
      </div>
    </div>
  );
}

// Vat-/potetiket voor een fermentatiebatch: naam, startdatum, verwachte klaar-datum,
// streefwaarden (pH / °Brix) en het fermentatietype. Zelfde thermische opmaak als
// het productetiket (102×38 mm, alles vet voor de 203 dpi-driver).
function printBatchLabel(d) {
  const esc = (t) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const doel = [d.ph ? "pH " + d.ph : "", d.brix ? d.brix + " °Brix" : ""].filter(Boolean).join(" · ");
  const nota = String(d.note || "").trim();
  printHtmlInPagina('<!doctype html><html><head><meta charset="utf-8"><title>Etiket</title><style>' +
    "@page{size:" + LABEL_MM.w + "mm " + LABEL_MM.h + "mm;margin:0}" +
    "html,body{margin:0;padding:0}" +
    "body{width:" + LABEL_MM.w + "mm;height:" + LABEL_MM.h + "mm;font-family:Arial,Helvetica,sans-serif;overflow:hidden;position:relative}" +
    "*{color:#000 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".wrap{position:absolute;top:2.5mm;left:3mm;right:3mm;text-align:center}" +
    ".naam{font-weight:bold;font-size:13pt;line-height:1.1;margin:0 0 1mm 0;word-wrap:break-word}" +
    ".rij{font-weight:bold;font-size:10.5pt;line-height:1.25;margin:0}" +
    // Handeling/opmerking van de kok: iets kleiner, zodat alles blijft passen.
    ".nota{font-weight:bold;font-size:9pt;line-height:1.15;margin:0.5mm 0 0 0;word-wrap:break-word}" +
    "</style></head><body>" +
    '<div class="wrap">' +
    '<div class="naam">' + esc(d.name) + "</div>" +
    (d.type ? '<div class="rij">' + esc(d.type) + "</div>" : "") +
    '<div class="rij">Start: ' + esc(fmtDMY(d.start)) + "</div>" +
    (d.ready ? '<div class="rij">Klaar rond: ' + esc(fmtDMY(d.ready)) + "</div>" : "") +
    (doel ? '<div class="rij">Doel: ' + esc(doel) + "</div>" : "") +
    (nota ? '<div class="nota">' + esc(nota) + "</div>" : "") +
    "</div></body></html>");
}

// Popup na het registreren van een batch: vraagt of er een etiket geprint moet
// worden. Alles vooringevuld en aanpasbaar, behalve de naam van het recept.
function BatchLabelModal({ batch, onClose }) {
  const dagen = Number(batch.days) || 0;
  const readyVan = (st) => {
    if (!st || !dagen) return "";
    const dt = new Date(st + "T12:00:00");
    if (isNaN(dt)) return "";
    dt.setDate(dt.getDate() + dagen);
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  };
  const tgt = FERMENT_TARGETS[batch.method] || FERMENT_TARGETS[batch.type] || {};
  const [start, setStart] = useState(batch.startDate || localDate());
  const [ready, setReady] = useState(() => readyVan(batch.startDate || localDate()));
  const [readyTouched, setReadyTouched] = useState(false);
  const changeStart = (v) => { setStart(v); if (!readyTouched) setReady(readyVan(v)); };
  // Doel-pH: eerst de "Gewenste pH" die de kok bij de batch invulde, dan pas de
  // algemene streefwaarde van de methode.
  const [ph, setPh] = useState(batch.pH != null ? String(batch.pH).replace(".", ",") : (tgt.phEnd != null ? String(tgt.phEnd).replace(".", ",") : ""));
  const [brix, setBrix] = useState(batch.sugarPct != null ? String(batch.sugarPct).replace(".", ",") : "");
  const [type, setType] = useState(batch.method || batch.type || "Melkzuur");
  const [note, setNote] = useState(batch.notes || "");
  // Alles leegmaken behalve de startdatum (de productiedatum van de batch).
  const maakLeeg = () => {
    setReady(""); setReadyTouched(true);
    setPh(""); setBrix(""); setNote("");
  };
  const doPrint = () => {
    printBatchLabel({ name: batch.product, start: start || localDate(), ready, ph: ph.trim(), brix: brix.trim(), type: type.trim(), note });
    onClose(); // sluit vanzelf zodra de printactie gestart is
  };
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.45)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: T.paper }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="serif ink text-xl leading-tight">Batch-etiket printen</div>
              <button type="button" onClick={maakLeeg} className="ff shrink-0 inline-flex items-center justify-center rounded-lg px-2 py-1" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }} title="Velden leegmaken (startdatum blijft)"><Trash2 size={14} /></button>
            </div>
            <div className="text-xs mute mt-0.5 truncate">{batch.product}</div>
          </div>
          <button onClick={onClose} className="ff shrink-0 rounded-lg p-1 hover:opacity-70" title="Sluiten"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div>
            <div className="text-xs mute mb-1">Startdatum</div>
            <input type="date" className="input px-2.5 py-2 w-full text-sm" value={start} onChange={(e) => changeStart(e.target.value)} />
          </div>
          <div>
            <div className="text-xs mute mb-1">Klaar rond</div>
            <input type="date" className="input px-2.5 py-2 w-full text-sm" value={ready} onChange={(e) => { setReady(e.target.value); setReadyTouched(true); }} />
          </div>
          <div>
            <div className="text-xs mute mb-1">Doel-pH</div>
            <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full text-sm" value={ph} onChange={(e) => setPh(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="3,5" />
          </div>
          <div>
            <div className="text-xs mute mb-1">°Brix (suiker)</div>
            <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full text-sm" value={brix} onChange={(e) => setBrix(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="12" />
          </div>
          <div className="col-span-2">
            <div className="text-xs mute mb-1">Fermentatietype</div>
            <AppSelect value={type} onChange={setType} options={[...new Set(["Melkzuur", "Suikerfermentatie", "Azijnfermentatie", type].filter(Boolean))]} />
          </div>
          <div className="col-span-2">
            <div className="text-xs mute mb-1">Handeling / opmerking</div>
            <input className="input px-2.5 py-2 w-full text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="bv. 1× per dag roeren" />
          </div>
        </div>
        <p className="text-[11px] mute mt-2">Lege velden worden niet op het etiket gezet.</p>
        <button onClick={doPrint} className="btnp ff w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold px-3.5 py-2"><Printer size={15} /> Printen</button>
      </div>
    </div>
  );
}

// Vrij etiket via de zwevende etiket-knop: alle velden handmatig, met slimme
// voorinvulling vanuit een gekozen of al geopend recept. Lege velden worden
// niet geprint; zelfde thermische opmaak (102×38 mm) als de andere etiketten.
function printCustomLabel(f) {
  const esc = (t) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inhoud = String(f.gram || "").trim();
  // Alleen naam (evt. + productiedatum) ingevuld → grote vul-layout:
  // de tekst wordt automatisch zo groot geschaald dat hij de sticker vult.
  const bijnaLeeg = !f.tht && !f.ready && !inhoud && !String(f.note || "").trim() && !(f.allergens && f.allergens.length);
  if (bijnaLeeg) {
    const fmtD = (d) => { if (!d) return ""; const [y, m, dd] = d.split("-"); return dd + "-" + m + "-" + y; };
    const voet = f.prod ? '<div class="voet">Gemaakt: ' + fmtD(f.prod) + "</div>" : "";
    printHtmlInPagina('<!doctype html><html><head><meta charset="utf-8"><title>Etiket</title><style>' +
      "@page{size:" + LABEL_MM.w + "mm " + LABEL_MM.h + "mm;margin:0}" +
      "html,body{margin:0;padding:0}" +
      "body{width:" + LABEL_MM.w + "mm;height:" + LABEL_MM.h + "mm;font-family:Arial,Helvetica,sans-serif;overflow:hidden;position:relative}" +
      "*{color:#000 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
      '.vul{position:absolute;top:1.5mm;left:2.5mm;right:2.5mm;bottom:' + (f.prod ? "6mm" : "1.5mm") + ';display:flex;align-items:center;justify-content:center;overflow:hidden}' +
      "#groot{font-weight:bold;line-height:1.05;text-align:center;word-wrap:break-word;max-width:100%}" +
      ".voet{position:absolute;left:2.5mm;right:2.5mm;bottom:1.2mm;font-weight:bold;font-size:9pt;text-align:center}" +
      "</style></head><body>" +
      '<div class="vul"><div id="groot">' + esc(f.name) + "</div></div>" + voet +
      "<scr" + 'ipt>(function(){var t=document.getElementById("groot"),b=t.parentElement,lo=8,hi=140;while(hi-lo>1){var m=(lo+hi)>>1;t.style.fontSize=m+"px";if(t.scrollWidth<=b.clientWidth&&t.scrollHeight<=b.clientHeight){lo=m;}else{hi=m;}}t.style.fontSize=lo+"px";})();</scr' + "ipt>" +
      "</body></html>");
    return;
  }
  printHtmlInPagina('<!doctype html><html><head><meta charset="utf-8"><title>Etiket</title><style>' +
    "@page{size:" + LABEL_MM.w + "mm " + LABEL_MM.h + "mm;margin:0}" +
    "html,body{margin:0;padding:0}" +
    "body{width:" + LABEL_MM.w + "mm;height:" + LABEL_MM.h + "mm;font-family:Arial,Helvetica,sans-serif;overflow:hidden;position:relative}" +
    "*{color:#000 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".wrap{position:absolute;top:2mm;left:3mm;right:3mm;text-align:center}" +
    ".naam{font-weight:bold;font-size:13pt;line-height:1.1;margin:0 0 0.8mm 0;word-wrap:break-word}" +
    ".rij{font-weight:bold;font-size:10pt;line-height:1.22;margin:0}" +
    ".klein{font-weight:bold;font-size:8.5pt;line-height:1.15;margin:0.4mm 0 0 0;word-wrap:break-word}" +
    "</style></head><body>" +
    '<div class="wrap">' +
    '<div class="naam">' + esc(f.name) + "</div>" +
    (inhoud ? '<div class="rij">' + esc(inhoud) + "</div>" : "") +
    (f.prod ? '<div class="rij">Gemaakt: ' + esc(fmtDMY(f.prod)) + "</div>" : "") +
    (f.tht ? '<div class="rij">T.H.T.: ' + esc(fmtDMY(f.tht)) + "</div>" : "") +
    (f.ready ? '<div class="rij">Klaar rond: ' + esc(fmtDMY(f.ready)) + "</div>" : "") +
    (f.allergens && f.allergens.length ? '<div class="klein">Allergenen: ' + esc(f.allergens.join(", ")) + "</div>" : "") +
    (String(f.note || "").trim() ? '<div class="klein">' + esc(String(f.note).trim()) + "</div>" : "") +
    "</div></body></html>");
}

function UniversalLabelModal({ recipes, prefillRecipe, onClose, onAddStock }) {
  const mapStore = (t) => { const x = String(t || "").toLowerCase(); if (/ongekoeld/.test(x)) return "ongekoeld"; if (/vrie|bevroren/.test(x)) return "bevroren"; if (/droog/.test(x)) return "droog"; if (/koel/.test(x)) return "gekoeld"; return ""; };
  const thtVan = (p, dgn) => { if (!p || !dgn) return ""; const dt = new Date(p + "T12:00:00"); if (isNaN(dt)) return ""; dt.setDate(dt.getDate() + Number(dgn)); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); };
  const today = localDate();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState(false); // onderdrukt de suggestielijst na een keuze
  const [gekozenRecept, setGekozenRecept] = useState(null); // voor ingrediënten bij Print + voorraad
  const [prod, setProd] = useState(today);
  const [tht, setTht] = useState("");
  const [ready, setReady] = useState("");
  const [gram, setGram] = useState("");
  // Eén dag erbij, gerekend vanaf de productiedatum: leeg veld → prod + 1,
  // daarna telkens één dag verder vanaf de ingevulde datum.
  const schuifDag = (cur, set, richting) => {
    if (!cur && richting < 0) return; // leeg veld: er valt niets af te halen
    const basis = cur && !isNaN(new Date(cur + "T12:00:00")) ? cur : (prod || today);
    const dt = new Date(basis + "T12:00:00");
    dt.setDate(dt.getDate() + richting);
    const nieuw = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
    if (nieuw === (prod || today)) { set(""); return; } // 0 dagen → leeg, print niet mee
    set(nieuw);
  };
  const plusDag = (cur, set) => schuifDag(cur, set, 1);
  // Aantal dagen t.o.v. de productiedatum, voor de teller boven de +/− knoppen.
  const dagenVanaf = (cur) => {
    if (!cur || !prod) return null;
    const a = new Date(prod + "T12:00:00"), b = new Date(cur + "T12:00:00");
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  };
  const [note, setNote] = useState("");
  const [allergens, setAllergens] = useState([]);
  const [algOpen, setAlgOpen] = useState(false);
  // Recept overnemen: naam, THT, allergenen, opslag en (bij fermentatie) klaar-rond.
  const applyRecipe = (r, p) => {
    const basis = p || prod || today;
    setName(r.name); setPicked(true); setGekozenRecept(r);
    if (r.shelfDays) setTht(thtVan(basis, r.shelfDays));
    setAllergens(recipeAllergens(r));
    const fd = r.fermentDefaults;
    if (r.ferment && fd && fd.days) setReady(thtVan(basis, fd.days));
    // Handelingen: bij fermentatierecepten de standaardhandeling van de methode.
    const acties = r.ferment && r.fermentMethod && FERMENT_ACTIONS[r.fermentMethod];
    if (acties && acties.length) setNote(acties.map((a) => a.label + (a.everyDays > 1 ? " (elke " + a.everyDays + " dagen)" : " (dagelijks)")).join(" · "));
  };
  useEffect(() => { if (prefillRecipe) applyRecipe(prefillRecipe, today); }, []);
  const naamRef = React.useRef(null);
  useEffect(() => { if (!prefillRecipe) setTimeout(() => { try { if (naamRef.current) naamRef.current.focus(); } catch (e) {} }, 60); }, []);
  const sugg = !picked && name.trim().length >= 2 ? (recipes || []).filter((r) => softMatchAny([r.name], name)).slice(0, 6) : [];
  const [suggIdx, setSuggIdx] = useState(-1); // pijltjesmarkering in de suggestielijst
  const verplichtOk = () => {
    if (!name.trim()) { alert("Vul een productnaam in."); return false; }
    return true; // datums zijn vrij: soms is een etiket alleen tekst
  };
  const doPrint = () => {
    if (!verplichtOk()) return;
    // Invulling bewaren voor de "Vorige"-knop: extra stickers van dezelfde
    // soort zijn dan zo teruggehaald, ook na het sluiten van de popup.
    try { localStorage.setItem("ritme:last-label", JSON.stringify({ name, prod, tht, ready, gram, note, allergens })); } catch (e) {}
    printCustomLabel({ name: name.trim(), prod, tht, ready, gram: gram.trim(), note, allergens });
    onClose(); // sluit vanzelf zodra de printactie gestart is
  };
  // Printen én direct in de voorraad: zelfde print, daarna opent het voorraad-
  // formulier voorgevuld (naam, productiedatum, houdbaarheid, eenheid, opslag).
  // Het opslaan zelf vraagt zoals altijd wie het doet via de naam-popup.
  const doPrintEnVoorraad = () => {
    if (!verplichtOk()) return;
    try { localStorage.setItem("ritme:last-label", JSON.stringify({ name, prod, tht, ready, gram, note, allergens })); } catch (e) {}
    printCustomLabel({ name: name.trim(), prod, tht, ready, gram: gram.trim(), note, allergens });
    const dgn = (() => { if (!tht || !prod) return null; const a = new Date(prod + "T12:00:00"), b = new Date(tht + "T12:00:00"); return isNaN(a) || isNaN(b) ? null : Math.round((b - a) / 86400000); })();
    const rec = gekozenRecept && String(gekozenRecept.name || "").trim().toLowerCase() === name.trim().toLowerCase() ? gekozenRecept : null;
    onAddStock({ product: name.trim(), productionDate: prod, shelfDays: dgn && dgn > 0 ? dgn : null, unit: gram.trim(),
      ingredients: rec && Array.isArray(rec.ingredients) ? rec.ingredients.map((x) => ({ ...x })) : undefined,
      recipeId: rec ? rec.id : undefined });
  };
  const vorige = (() => { try { return JSON.parse(localStorage.getItem("ritme:last-label") || "null"); } catch (e) { return null; } })();
  // Alles leegmaken voor een vers etiket; alleen de productiedatum blijft vandaag.
  const maakLeeg = () => {
    setName(""); setPicked(false); setGekozenRecept(null); setSuggIdx(-1);
    setProd(today); setTht(""); setReady("");
    setGram(""); setNote(""); setAllergens([]); setAlgOpen(false);
    setTimeout(() => { try { if (naamRef.current) naamRef.current.focus(); } catch (e) {} }, 30);
  };
  const herstelVorige = () => {
    if (!vorige) return;
    setName(vorige.name || ""); setPicked(true);
    // Productiedatum blijft vandaag: extra stickers worden vandaag gemaakt.
    // De THT/klaar-op schuiven mee met hetzelfde aantal dagen als het origineel.
    const dagen = (van, tot) => {
      if (!van || !tot) return null;
      const a = new Date(van + "T12:00:00"), b = new Date(tot + "T12:00:00");
      return isNaN(a) || isNaN(b) ? null : Math.round((b - a) / 86400000);
    };
    const plus = (n) => { const dt = new Date(today + "T12:00:00"); dt.setDate(dt.getDate() + n); return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); };
    const dT = dagen(vorige.prod, vorige.tht), dR = dagen(vorige.prod, vorige.ready);
    setProd(today);
    setTht(dT != null ? plus(dT) : "");
    setReady(dR != null ? plus(dR) : "");
    setGram(vorige.gram || ""); setNote(vorige.note || "");
    setAllergens(Array.isArray(vorige.allergens) ? vorige.allergens : []);
  };
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,46,36,.45)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-4" style={{ background: T.paper, maxHeight: "94vh", overflowY: "auto" }}>
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="text-xs font-bold ink">Productnaam</div>
            <button onClick={onClose} className="ff shrink-0 rounded-lg p-0.5 hover:opacity-70" title="Sluiten"><X size={16} /></button>
          </div>
          <div className="flex gap-1.5">
            <input ref={naamRef} className="input px-2.5 py-2 w-full text-sm flex-1 min-w-0" value={name}
              onChange={(e) => { setName(e.target.value); setPicked(false); setSuggIdx(-1); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && sugg.length) { e.preventDefault(); setSuggIdx((x) => (x + 1) % sugg.length); }
                else if (e.key === "ArrowUp" && sugg.length) { e.preventDefault(); setSuggIdx((x) => (x <= 0 ? sugg.length - 1 : x - 1)); }
                else if (e.key === "Enter") { e.preventDefault(); if (suggIdx >= 0 && sugg[suggIdx]) applyRecipe(sugg[suggIdx]); else setPicked(true); setSuggIdx(-1); }
                else if (e.key === "Escape" && sugg.length) { e.preventDefault(); e.stopPropagation(); setPicked(true); setSuggIdx(-1); }
              }}
              onBlur={() => setTimeout(() => setPicked(true), 120)}
              placeholder="Zoek een recept of typ een eigen naam" />
            <button type="button" onClick={maakLeeg} className="ff shrink-0 inline-flex items-center justify-center rounded-lg px-2" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }} title="Alles leegmaken (productiedatum blijft vandaag)"><Trash2 size={14} /></button>
            {vorige && <button type="button" onClick={herstelVorige} className="ff shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 text-[12px] font-semibold" style={{ border: "1px solid " + T.line, background: "#fff", color: T.green }} title={"Vorige etiket terughalen: " + (vorige.name || "")}>↺ Vorige</button>}
          </div>
          {sugg.length > 0 && (
            <div className="card mt-1 overflow-hidden">
              {sugg.map((r) => (
                <button key={r.id} onMouseDown={(e) => { e.preventDefault(); applyRecipe(r); }} className={"ff w-full text-left px-3 py-2 text-sm hover:opacity-70 divi first:border-0" + (sugg[suggIdx] && sugg[suggIdx].id === r.id ? " pillon" : "")}>
                  <span className="ink">{r.name}</span> <span className="text-xs mute">· {r.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-1.5">
          <div>
            <div className="text-xs font-bold ink mb-1">Productiedatum</div>
            <input type="date" className="input px-2.5 py-2 w-full text-sm" value={prod} onChange={(e) => setProd(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold ink">T.H.T.</div>
              {dagenVanaf(tht) != null && <div className="text-[11px] font-semibold acc">{dagenVanaf(tht)} {dagenVanaf(tht) === 1 ? "dag" : "dagen"}</div>}
            </div>
            <div className="flex gap-1">
              <input type="date" className="input px-2.5 py-2 w-full text-sm min-w-0" value={tht} onChange={(e) => setTht(e.target.value)} />
              <button type="button" onClick={() => schuifDag(tht, setTht, -1)} className="ff shrink-0 rounded-lg px-1 text-sm font-semibold" style={{ border: "1px solid " + T.line, background: "#fff", color: T.green }} title="Eén dag eraf"><Minus size={13} /></button>
              <button type="button" onClick={() => schuifDag(tht, setTht, 1)} className="ff shrink-0 rounded-lg px-1 text-sm font-semibold" style={{ border: "1px solid " + T.line, background: "#fff", color: T.green }} title="Eén dag erbij (vanaf de productiedatum)"><Plus size={13} /></button>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold ink mb-1">Hoeveelheid</div>
            <input type="text" className="input px-2.5 py-2 w-full text-sm" value={gram} onChange={(e) => setGram(e.target.value)} placeholder="500 gr / 1 kg / 250 ml" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold ink">Klaar op</div>
              {dagenVanaf(ready) != null && <div className="text-[11px] font-semibold acc">{dagenVanaf(ready)} {dagenVanaf(ready) === 1 ? "dag" : "dagen"}</div>}
            </div>
            <div className="flex gap-1">
              <input type="date" className="input px-2.5 py-2 w-full text-sm min-w-0" value={ready} onChange={(e) => setReady(e.target.value)} />
              <button type="button" onClick={() => schuifDag(ready, setReady, -1)} className="ff shrink-0 rounded-lg px-1 text-sm font-semibold" style={{ border: "1px solid " + T.line, background: "#fff", color: T.green }} title="Eén dag eraf"><Minus size={13} /></button>
              <button type="button" onClick={() => schuifDag(ready, setReady, 1)} className="ff shrink-0 rounded-lg px-1 text-sm font-semibold" style={{ border: "1px solid " + T.line, background: "#fff", color: T.green }} title="Eén dag erbij (vanaf de productiedatum)"><Plus size={13} /></button>
            </div>
          </div>
        </div>
        <div className="mt-1.5">
          <button onClick={() => setAlgOpen((o) => !o)} className="ff w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ border: "1px solid " + T.line, background: "#fff" }}>
            <span className="ink">Allergenen{allergens.length ? " · " + allergens.join(" · ") : ""}</span>
            {algOpen ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />}
          </button>
          {algOpen && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ALLERGEN_LABELS.map((l) => (
                <button key={l} type="button" onClick={() => setAllergens((a) => a.includes(l) ? a.filter((x) => x !== l) : ALLERGEN_LABELS.filter((x) => a.includes(x) || x === l))} className={"ff rounded-full px-2.5 py-1 text-xs font-medium " + (allergens.includes(l) ? "pillon" : "pill")}>{l}</button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-1.5">
          <div className="text-xs font-bold ink mb-1">Opmerkingen / handelingen</div>
          <input className="input px-2.5 py-2 w-full text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder="bv. 1× per dag roeren" />
        </div>
        <p className="text-[11px] mute mt-1.5">Lege velden worden niet op het etiket gezet.</p>
        <div className="flex gap-2 mt-2">
          <button onClick={doPrintEnVoorraad} className="btno ff flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold px-3 py-2" title="Print het etiket en zet het product daarna in de voorraad"><ShelfIcon size={15} /> Print + voorraad</button>
          <button onClick={doPrint} className="btnp ff flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold px-3 py-2"><Printer size={15} /> Printen</button>
        </div>
      </div>
    </div>
  );
}

// In welk jaar is deze voorraad gemaakt? (productiedatum; anders het huidige jaar)
function stockYear(v) {
  const y = Number(String(v.productionDate || "").slice(0, 4));
  return y >= 2000 ? y : Number(localDate().slice(0, 4));
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date(localDate() + "T12:00:00");
  return Math.round((d - now) / 86400000);
}

// Voorraadregels van hetzelfde product als één item: elke registratie blijft
// een eigen batch met eigen details (uitklapbaar), en de −1 pakt altijd de
// oudste (kortst houdbare) batch met voorraad eerst. Bestaande dubbele
// invoeren vallen hierdoor vanzelf samen — er hoeft niets gemigreerd.
function groupStock(items) {
  const g = {};
  const key = (v) => norm(String(v.product || "")).trim();
  for (const v of items) (g[key(v)] = g[key(v)] || []).push(v);
  return Object.values(g).map((entries) => {
    const sorted = [...entries].sort((a, b) => {
      const ea = a.expiryDate || "9999", eb = b.expiryDate || "9999";
      if (ea !== eb) return ea < eb ? -1 : 1;
      const pa = a.productionDate || "9999", pb = b.productionDate || "9999";
      return pa < pb ? -1 : pa > pb ? 1 : 0;
    });
    const qty = sorted.reduce((n, v) => n + (Number(v.qty) || 0), 0);
    return { key: key(sorted[0]) || sorted[0].id, product: sorted[0].product, entries: sorted, qty };
  });
}
const oldestOpenStock = (entries) => entries.find((v) => (Number(v.qty) || 0) > 0) || null;
// Binnen een productgroep: per verpakkingseenheid (200 gr pot, 500 gr pot …) een
// eigen regel met totaal en een eigen −1-knop; die pakt de oudste batch van die
// eenheid. Gesorteerd van kleine naar grote verpakking.
function unitGroupsOf(entries) {
  const m = new Map();
  for (const v of entries) {
    const u = String(v.unit || "").trim() || "—";
    if (!m.has(u)) m.set(u, { unit: u, entries: [], qty: 0 });
    const g = m.get(u);
    g.entries.push(v); // entries komen al oudste-eerst binnen
    g.qty += Number(v.qty) || 0;
  }
  return [...m.values()].map((g) => ({ ...g, oldest: oldestOpenStock(g.entries) }))
    .sort((a, b) => { const sa = unitSizeG(a.unit) ?? 1e12, sb = unitSizeG(b.unit) ?? 1e12; return sa - sb || a.unit.localeCompare(b.unit, "nl"); });
}

function VoorraadList({ stock, canEdit, onDec, onEdit, onDelete, onExport, noticeClosed, onCloseNotice, chefMode, recipeById }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [openYear, setOpenYear] = useState(null);
  const currentYear = Number(localDate().slice(0, 4));
  const expiring = stock.filter((v) => v.qty > 0 && v.expiryDate && daysUntil(v.expiryDate) !== null && daysUntil(v.expiryDate) <= 7);
  const match = (v) => softMatchAny([v.product, v.unit, v.storage, (v.ingredients || []).map((i) => i.item).join(" ")], q.trim().toLowerCase());
  const sortFn = (a, b) => {
    const da = a.expiryDate || "9999", db2 = b.expiryDate || "9999";
    return da < db2 ? -1 : da > db2 ? 1 : a.product.localeCompare(b.product, "nl");
  };
  const [openEmpty, setOpenEmpty] = useState(false);
  const yearItems = stock.filter((v) => stockYear(v) === currentYear && match(v));
  const groupSort = (a, b) => {
    const oa = oldestOpenStock(a.entries), ob = oldestOpenStock(b.entries);
    const da = (oa && oa.expiryDate) || "9999", db2 = (ob && ob.expiryDate) || "9999";
    return da < db2 ? -1 : da > db2 ? 1 : a.product.localeCompare(b.product, "nl");
  };
  const allGroups = groupStock(yearItems);
  const shown = allGroups.filter((g) => g.qty > 0).sort(groupSort);
  const emptyItems = allGroups.filter((g) => g.qty <= 0).sort(groupSort);
  const pastYears = [...new Set(stock.filter((v) => stockYear(v) < currentYear).map((v) => stockYear(v)))].sort((a, b) => b - a);
  const fmtQty = (n, unit) => String(n).replace(".", ",") + "×" + (unit ? " " + unit : "");
  const kaart = (g) => {
    const oud = oldestOpenStock(g.entries);
    const ref = oud || g.entries[0];
    const dgn = daysUntil(ref.expiryDate);
    const verlopen = dgn !== null && dgn < 0;
    const bijna = dgn !== null && dgn >= 0 && dgn <= 3;
    const op = g.qty <= 0;
    const isOpen = open === g.key;
    const jaar = stockYear(g.entries[0]);
    const multi = g.entries.length > 1;
    const ugs = unitGroupsOf(g.entries);
    const batchDetail = (v, idx) => {
      const ug = ugs.find((x) => x.entries.some((e) => e.id === v.id));
      const isOud = ug && ug.oldest && v.id === ug.oldest.id;
      const leeg = (Number(v.qty) || 0) <= 0;
      return (
        <div key={v.id} className={multi ? "rounded-xl p-3 mt-2" : "mt-2.5"} style={multi ? { border: "1px solid " + T.line, background: "#fff", opacity: leeg ? 0.55 : 1 } : undefined}>
          {multi && (
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[13px] font-semibold ink">{String(v.qty).replace(".", ",")} st. × {v.unit || "—"}{leeg ? " · op" : ""}</span>
              {isOud && !leeg && <span className="text-[10.5px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5" style={{ background: "#e8ebe0", color: T.green }}>oudste — eerst gebruiken</span>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12.5px]">
            <div className="flex justify-between gap-2"><span className="mute">Op voorraad</span><span className="ink font-medium">{fmtQty(v.qty, v.unit)}</span></div>
            <div className="flex justify-between gap-2"><span className="mute">Gemaakt in {stockYear(v)}</span><span className="ink font-medium">{fmtQty(v.initialQty, v.unit)}</span></div>
            {v.storage && <div className="flex justify-between gap-2"><span className="mute">Opslaglocatie</span><span className="ink font-medium">{v.storage}</span></div>}
            {v.productionDate && <div className="flex justify-between gap-2"><span className="mute">Gemaakt op</span><span className="ink font-medium">{fmtDMY(v.productionDate)}</span></div>}
            {v.expiryDate && <div className="flex justify-between gap-2"><span className="mute">Houdbaar tot</span><span className="ink font-medium">{fmtDMY(v.expiryDate)}</span></div>}
            {v.by && <div className="flex justify-between gap-2"><span className="mute">Door</span><span className="ink font-medium">{v.by}</span></div>}
          </div>
          {(v.ingredients || []).length > 0 && (
            <div className="mt-2.5">
              <div className="text-[12.5px] font-semibold uppercase tracking-widest acc mb-1">Ingrediënten</div>
              <ul className="space-y-0.5 text-[13px]">
                {v.ingredients.map((i, j) => (
                  <li key={j} className="flex justify-between gap-3"><span className="ink">{i.item}</span><span className="mute shrink-0">{i.amount}</span></li>
                ))}
              </ul>
            </div>
          )}
          {canEdit && (
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => onDec(v.id)} disabled={leeg} className="btnp ff inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold px-3 py-2 disabled:opacity-40"><Minus size={15} /> 1 gebruikt</button>
              <button onClick={() => onEdit(v.id)} className="btno ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2"><Pencil size={14} /> Bewerken</button>
              <button onClick={() => onDelete(v.id)} className="ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a" }}><Trash2 size={14} /></button>
            </div>
          )}
        </div>
      );
    };
    return (
      <div key={g.key} className={"card overflow-hidden" + (isOpen ? " relative z-20" : "")} style={verlopen ? { borderColor: "#c08a7a" } : undefined}>
        <div className="px-4 py-3">
          <button onClick={() => setOpen(isOpen ? null : g.key)} className="ff w-full text-left">
            <div className="serif ink font-bold text-lg leading-tight" style={op ? { opacity: 0.5 } : undefined}>{g.product}</div>
            {chefMode && (() => { const r = g.recipeId && recipeById ? recipeById(g.recipeId) : null; const kp = r ? receptKost(r) : null; if (kp === null) return null; return <div className="text-[12.5px]" style={{ color: "#44502f" }}>Kostprijs batch {eur(kp)} <span className="mute">(chef)</span></div>; })()}
          </button>
          <div className="flex items-end gap-2 mt-0.5">
            <button onClick={() => setOpen(isOpen ? null : g.key)} className="ff flex-1 min-w-0 text-left">
              <div className="text-[12.5px] mute">
                {multi
                  ? <>{g.entries.length} batches{ref.storage && <> · {ref.storage}</>}{ref.expiryDate && <> · eerste THT {fmtDMY(ref.expiryDate)}</>}</>
                  : <>{ref.storage && <>{ref.storage} · </>}gemaakt in {jaar}: {fmtQty(ref.initialQty, ref.unit)}{ref.by && <> · {ref.by}</>}{ref.expiryDate && <> · THT {fmtDMY(ref.expiryDate)}</>}</>}
                {verlopen && <span className="ml-1 font-semibold" style={{ color: "#8a4a3a" }}>verlopen</span>}
                {bijna && <span className="ml-1 font-semibold" style={{ color: "#8a6a2a" }}>nog {dgn === 0 ? "vandaag" : dgn + (dgn === 1 ? " dag" : " dagen")}</span>}
              </div>
            </button>
            <div className="shrink-0 flex flex-col gap-1.5 items-end">
              {unitGroupsOf(g.entries).map((ug) => (
                <div key={ug.unit} className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="serif ink text-xl leading-none" style={ug.qty <= 0 ? { color: "#8a4a3a" } : undefined}>{String(ug.qty).replace(".", ",")}</span>
                    <span className="text-[12px] mute"> st.</span>
                    <div className="text-[12px] ink font-medium max-w-[7.5rem] truncate">{ug.qty <= 0 ? "op · " + ug.unit : ug.unit}</div>
                  </div>
                  {canEdit && <button onClick={() => ug.oldest && onDec(ug.oldest.id)} disabled={!ug.oldest} className="btnp ff shrink-0 inline-flex items-center justify-center rounded-lg w-9 h-9 disabled:opacity-40" title={"1 gebruikt van " + ug.unit + " — oudste eerst"}><Minus size={16} /></button>}
                </div>
              ))}
            </div>
          </div>
        </div>
        {isOpen && (
          <div className="px-4 pb-3 text-sm" style={{ borderTop: "1px solid " + T.line }}>
            {g.entries.map(batchDetail)}
          </div>
        )}
      </div>
    );
  };
  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Zoek in de voorraad" />
      {expiring.length > 0 && !noticeClosed && (
        <div className="rounded-xl px-4 py-3 mb-3 flex items-start gap-2.5" style={{ background: "#f3ecd9", border: "1px solid #dccda8" }}>
          <Bell size={16} className="shrink-0 mt-0.5" style={{ color: "#8a6a2a" }} />
          <div className="flex-1 text-[13px]" style={{ color: "#6b5620" }}>
            <span className="font-semibold">Houdbaarheid nadert.</span>{" "}
            {expiring.map((v) => {
              const d = daysUntil(v.expiryDate);
              return v.product + " (" + (d < 0 ? "verlopen" : d === 0 ? "vandaag" : "nog " + d + (d === 1 ? " dag" : " dagen")) + ")";
            }).join(" · ")}
          </div>
          <button onClick={onCloseNotice} className="ff shrink-0 hover:opacity-70" style={{ color: "#8a6a2a" }} title="Vandaag niet meer tonen"><X size={15} /></button>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs mute">{shown.length} {shown.length === 1 ? "product" : "producten"} · {currentYear}</span>
        <button onClick={() => onExport(currentYear)} className="ff inline-flex items-center gap-1.5 text-sm font-medium acc hover:opacity-70"><Download size={15} /> Excel {currentYear}</button>
      </div>
      {shown.length === 0 && <Empty label="Nog niets op voorraad dit jaar. Voeg voorraad toe met de knop rechtsonder, of via een recept of afgeronde batch." />}
      {open !== null && <div className="fixed inset-0 z-10" onClick={() => setOpen(null)} />}
      <div className="space-y-2.5">{shown.map(kaart)}</div>
      {emptyItems.length > 0 && (
        <div className="mt-5">
          <button onClick={() => setOpenEmpty((o) => !o)} className="ff inline-flex items-center gap-1.5 mb-1.5">
            {openEmpty ? <ChevronUp size={15} className="acc" /> : <ChevronDown size={15} className="acc" />}
            <span className="text-sm font-semibold ink">Op ({emptyItems.length})</span>
          </button>
          {openEmpty && <div className="space-y-2.5">{emptyItems.map(kaart)}</div>}
        </div>
      )}
      {pastYears.length > 0 && (
        <div className="mt-8 pt-5" style={{ borderTop: "2px solid " + T.line }}>
          <h2 className="serif ink text-xl leading-tight mb-2">Eerdere jaren</h2>
          <div className="space-y-2.5">
            {pastYears.map((jaar) => {
              const items = groupStock(stock.filter((v) => stockYear(v) === jaar && match(v))).sort(groupSort);
              const uit = openYear === jaar;
              return (
                <div key={jaar}>
                  <div className="flex items-center justify-between mb-1.5">
                    <button onClick={() => setOpenYear(uit ? null : jaar)} className="ff inline-flex items-center gap-1.5">
                      {uit ? <ChevronUp size={15} className="acc" /> : <ChevronDown size={15} className="acc" />}
                      <span className="text-sm font-semibold ink">Gemaakt in {jaar}</span>
                      <span className="text-xs mute">({items.length})</span>
                    </button>
                    <button onClick={() => onExport(jaar)} className="ff inline-flex items-center gap-1.5 text-[13px] font-medium acc hover:opacity-70"><Download size={14} /> Excel {jaar}</button>
                  </div>
                  {uit && <div className="space-y-2.5 mb-3">{items.map(kaart)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function VoorraadForm({ editing, prefill, allRecipes, onCancel, onSave }) {
  const src = editing || prefill || {};
  const [product, setProduct] = useState(src.product || "");
  // Opbrengstreferentie: nodig om ingrediënten mee te schalen als de kok
  // méér of minder maakt dan het recept aangeeft.
  const initRef = prefill ? parseYieldRef(prefill.yieldAmount, prefill.unit || prefill.yieldUnit, prefill.yieldText) : { refYield: null, refUnitNum: null };
  const [qty, setQty] = useState(editing ? String(editing.qty) : (initRef.refYield ? String(initRef.refYield) : ""));
  const [initialQty, setInitialQty] = useState(editing ? String(editing.initialQty) : "");
  const [unit, setUnit] = useState(src.unit || (prefill && prefill.yieldUnit) || "");
  const [productionDate, setProductionDate] = useState(src.productionDate || localDate());
  const [days, setDays] = useState(prefill && prefill.shelfDays ? String(prefill.shelfDays) : "");
  const [expiryDate, setExpiryDate] = useState(editing ? (editing.expiryDate || "") : "");
  const mapStorage = (t) => { const x = (t || "").toLowerCase(); if (/ongekoeld|droog/.test(x)) return "ongekoeld"; if (/vrie|bevroren|frozen/.test(x)) return "ingevroren"; if (/koel|kast/.test(x)) return "gekoeld"; return x.trim() ? "ongekoeld" : "gekoeld"; };
  const [storage, setStorage] = useState(editing ? (editing.storage || "gekoeld") : mapStorage(prefill && prefill.shelfStorage));
  const [recipeId, setRecipeId] = useState(src.recipeId || null);
  const [ings, setIngs] = useState((src.ingredients && src.ingredients.length ? src.ingredients : [{ item: "", amount: "" }]).map((i) => ({ ...i })));
  // Referentie voor het meeschalen: opbrengst + originele hoeveelheden van het recept.
  const [refYield, setRefYield] = useState(initRef.refYield);
  const [refIngs, setRefIngs] = useState(prefill && prefill.ingredients && prefill.ingredients.length ? prefill.ingredients.map((i) => ({ ...i })) : null);
  const parseNum = (t) => { const m = String(t ?? "").match(/\d+(?:[.,]\d+)?/); return m ? Number(m[0].replace(",", ".")) : null; };
  const [refUnitNum, setRefUnitNum] = useState(initRef.refUnitNum);
  const setIng = (i, veld, w) => setIngs((xs) => xs.map((x, j) => (j === i ? { ...x, [veld]: w } : x)));
  const addIng = () => setIngs((xs) => [...xs, { item: "", amount: "" }]);
  // Enter in het hoeveelheid-vakje: nieuwe rij direct eronder, cursor in het naamveld.
  const addIngAt = (i) => {
    setIngs((xs) => [...xs.slice(0, i + 1), { item: "", amount: "" }, ...xs.slice(i + 1)]);
    setTimeout(() => { const el = document.querySelector('[data-vf-item="' + (i + 1) + '"]'); if (el) el.focus(); }, 0);
  };
  const delIng = (i) => setIngs((xs) => xs.filter((_, j) => j !== i));
  // Backspace in een lege rij (behalve de eerste) verwijdert de rij en zet de
  // cursor in het vorige hoeveelheid-vak.
  const backIng = (i) => {
    setIngs((xs) => xs.filter((_, j) => j !== i));
    setTimeout(() => { const el = document.querySelector('[data-vf-amt="' + (i - 1) + '"]'); if (el) el.focus(); }, 0);
  };
  // Houdbaar tot = productiedatum + dagen (bij toevoegen); daarna altijd handmatig aanpasbaar.
  const computedExpiry = (() => {
    const d = Number(days);
    if (!productionDate || !days || isNaN(d) || d <= 0) return "";
    const dt = new Date(productionDate + "T12:00:00");
    dt.setDate(dt.getDate() + d);
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  })();
  const applyRecipe = (r) => {
    setProduct(r.name); setPicked(true);
    setRecipeId(r.id);
    setIngs((r.ingredients && r.ingredients.length ? r.ingredients : [{ item: "", amount: "" }]).map((i) => ({ ...i })));
    if (r.shelfDays) setDays(String(r.shelfDays));
    if (r.shelfStorage) setStorage(mapStorage(r.shelfStorage));
    // Opbrengst van het recept → aantal + eenheid (handmatig aan te passen).
    const ref = parseYieldRef(r.yieldAmount, r.yieldUnit, r.yield);
    if (ref.refYield) setQty(String(ref.refYield));
    setRefYield(ref.refYield);
    if (r.yieldUnit) setUnit(r.yieldUnit);
    setRefUnitNum(ref.refUnitNum);
    setRefIngs(r.ingredients && r.ingredients.length ? r.ingredients.map((i) => ({ ...i })) : null);
  };
  // Wijkt het ingevulde aantal af van de receptopbrengst, dan schalen de
  // ingrediëntenhoeveelheden automatisch mee.
  // De totale hoeveelheid bepaalt de factor: aantal x (getal in de eenheid).
  // 1x "8 L" -> 1x "16 L" verdubbelt dus, net als 20 potten -> 30 potten.
  useEffect(() => {
    if (!refIngs) return;
    const q1 = Number(String(qty ?? "").replace(",", "."));
    const qtyRatio = refYield && q1 > 0 && !isNaN(q1) ? q1 / refYield : 1;
    // In gram vergeleken: "500 gram" t.o.v. "1 kg" geeft 0,5 in plaats van 500.
    const un = unitSizeG(unit);
    const unitRatio = un && refUnitNum ? un / refUnitNum : 1;
    const f = qtyRatio * unitRatio;
    if (!isFinite(f) || f <= 0) return;
    setIngs(refIngs.map((i) => ({ item: i.item, amount: Math.abs(f - 1) < 1e-9 ? i.amount : scaleAmount(i.amount, f) })));
  }, [qty, unit, refYield, refUnitNum, refIngs]);
  const [picked, setPicked] = useState(!!editing);
  const pickMatches = !picked && product.trim().length >= 2 ? (allRecipes || []).filter((r) => softMatchAny([r.name, r.category, r.fermentMethod], product)).slice(0, 6) : [];
  const nm = (x) => { const v = Number(String(x ?? "").replace(",", ".")); return String(x ?? "").trim() !== "" && !isNaN(v) ? v : null; };
  const submit = () => {
    if (!product.trim()) { alert("Vul de productnaam in."); return; }
    const q1 = nm(qty);
    if (q1 === null) { alert("Vul het aantal in."); return; }
    if (!productionDate) { alert("Vul de productiedatum in."); return; }
    if (editing ? !expiryDate : !(Number(days) > 0)) { alert("Vul de houdbaarheid in (dagen of T.H.T.)."); return; }
    const q0 = editing ? (nm(initialQty) ?? q1) : q1;
    onSave({
      product: product.trim(), qty: q1, initialQty: q0, unit: unit.trim(),
      productionDate,
      expiryDate: editing ? expiryDate : computedExpiry,
      ingredients: ings.map((i) => ({ item: (i.item || "").trim(), amount: (i.amount || "").trim() })).filter((i) => i.item),
      recipeId: recipeId || (editing ? editing.recipeId : null) || null,
      storage,
    });
  };
  return (
    <div>
      <FormBar title={editing ? "Voorraad bewerken" : "Toevoegen aan de voorraad"} onCancel={onCancel} onSave={submit} saveLabel="Opslaan" />
      <Field label={editing ? "Product" : "Product / recept"}>
        <div className="relative">
          <input className={inputCls} value={product}
            onChange={(e) => { setProduct(e.target.value); setPicked(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setPicked(true); } }}
            onBlur={() => setTimeout(() => setPicked(true), 120)}
            placeholder="Zoek een recept of typ een eigen naam" />
          {pickMatches.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl p-1 shadow-xl" style={{ background: T.paper, border: "1px solid " + T.line, maxHeight: "16rem", overflowY: "auto" }}>
              {pickMatches.map((r) => (
                <button key={r.id} type="button" onMouseDown={(e) => { e.preventDefault(); applyRecipe(r); }} className="ff w-full text-left rounded-xl px-3 py-2 text-sm ink hover:opacity-70">
                  {r.name} <span className="mute">· {r.fermentMethod || r.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {!editing && <p className="text-[11.5px] mute mt-1">Een recept kiezen vult naam, ingrediënten en houdbaarheid in.</p>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={editing ? "Huidige voorraad" : "Aantal"}><input type="text" inputMode="decimal" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="bv. 20" /></Field>
        {editing
          ? <Field label="Ooit gemaakt (totaal)"><input type="text" inputMode="decimal" className={inputCls} value={initialQty} onChange={(e) => setInitialQty(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
          : <Field label="Hoeveelheid / verpakkingswijze"><input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bv. 200 g pot" /></Field>}
      </div>
      {editing && <Field label="Hoeveelheid / verpakkingswijze"><input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bv. 1 l vacumeerzak" /></Field>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Productiedatum"><input type="date" className={inputCls} value={productionDate} onChange={(e) => setProductionDate(e.target.value)} /></Field>
        {editing
          ? <Field label="Houdbaar tot"><input type="date" className={inputCls} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></Field>
          : <Field label="Dagen houdbaar"><input type="text" inputMode="numeric" className={inputCls} value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))} placeholder="bv. 6" /></Field>}
      </div>
      {!editing && computedExpiry && <p className="text-[13px] -mt-2 mb-4" style={{ color: T.green }}>Houdbaar tot <span className="font-semibold">{fmtDMY(computedExpiry)}</span> — later nog aan te passen via Bewerken.</p>}
      <Field label="Opslaglocatie"><AppSelect className={inputCls} value={storage} onChange={(v) => { setStorage(v); if (v === "ingevroren") setDays("365"); else if (days === "365") setDays(""); }} options={["ongekoeld", "gekoeld", "ingevroren"]} /></Field>
      <div className="mb-1 text-[12.5px] font-semibold uppercase tracking-widest acc">Ingrediënten</div>
      <div className="space-y-2 mb-2">
        {ings.map((i, idx) => (
          <div key={idx} className="flex gap-2">
            <input data-vf-item={idx} className={inputCls + " flex-1 min-w-0"} style={{ width: "auto" }} value={i.item} onChange={(e) => setIng(idx, "item", e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && idx > 0 && !String(i.item || "").trim() && !String(i.amount || "").trim()) { e.preventDefault(); backIng(idx); } }} placeholder="Ingrediënt" />
            <input data-vf-amt={idx} className={inputCls} style={{ width: "7rem", flex: "0 0 7rem" }} value={i.amount} onChange={(e) => setIng(idx, "amount", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIngAt(idx); } else if (e.key === "Backspace" && idx > 0 && !String(i.item || "").trim() && !String(i.amount || "").trim()) { e.preventDefault(); backIng(idx); } }} placeholder="Hoeveelheid" />
            {ings.length > 1 && <button onClick={() => delIng(idx)} className="mute hover:opacity-60 px-1"><Trash2 size={16} /></button>}
          </div>
        ))}
      </div>
      <button onClick={addIng} className="btno ff w-full mb-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium px-3 py-2"><Plus size={15} /> Ingrediënt toevoegen</button>
      <p className="text-xs mute">Het aantal dat je nu invult, wordt vastgelegd als "ooit gemaakt". Met de knop "1 gebruikt" tel je later af; de Excel-download toont altijd de ooit gemaakte hoeveelheid.</p>
    </div>
  );
}

// Bewerkbare Werkwijze-tabellen: veldindeling per tabel.
const TECH_TABLE_CONFIGS = {
  jam: { docId: "__jam_rows", title: "Jam & confituur bewerken", naamVeld: "fruit",
    fields: [{ key: "fruit", label: "Fruit" }, { key: "pectine", label: "Pectine" }, { key: "suiker", label: "Geleisuiker 2:1" }, { key: "pectineX", label: "Extra pectine" }, { key: "zuur", label: "Citroenzuur" }] },
  ijs: { docId: "__ice_rows", title: "Roomijs & sorbet bewerken", naamVeld: "soort",
    fields: [{ key: "soort", label: "Soort" }, { key: "suiker", label: "Totaal suiker" }, { key: "glucose", label: "Aandeel glucose" }, { key: "extra", label: "Aandachtspunt", lang: true }] },
  maten: { docId: "__maat_rows", title: "Gewichten per lepel en stuk bewerken", naamVeld: "naam",
    fields: [{ key: "naam", label: "Ingrediënt" }, { key: "el", label: "1 el (g)" }, { key: "stuk", label: "1 stuk (g)" }, { key: "cm", label: "1 cm (g)" }] },
  roosteren: { docId: "__roast_rows", title: "Roostertabel bewerken", naamVeld: "groente",
    fields: [{ key: "groente", label: "Groente" }, { key: "type", label: "Type" }, { key: "snij", label: "Snijverlies" }, { key: "verlies", label: "Vochtverlies" }, { key: "schoon", label: "Schoon voor 1 kg" }, { key: "onbewerkt", label: "Onbewerkt voor 1 kg" }] },
};

// Generiek formulier om de rijen van een Werkwijze-tabel aan te passen.
function TechTableForm({ config, rows, onCancel, onSave }) {
  const [list, setList] = useState(rows.map((r) => ({ ...r })));
  const set = (i, key, waarde) => setList((ls) => ls.map((x, j) => (j === i ? { ...x, [key]: waarde } : x)));
  const add = () => setList((ls) => [...ls, Object.fromEntries(config.fields.map((f) => [f.key, ""]))]);
  const del = (i) => setList((ls) => ls.filter((_, j) => j !== i));
  const submit = () => {
    const clean = list.filter((r) => (r[config.naamVeld] || "").trim());
    if (!clean.length) { alert("Houd minstens één rij over."); return; }
    onSave(clean);
  };
  return (
    <div>
      <FormBar title={config.title} onCancel={onCancel} onSave={submit} saveLabel="Opslaan" />
      <p className="text-[13px] mute -mt-2 mb-3">Pas de waarden aan, voeg rijen toe of verwijder ze. De tabel staat op de Werkwijze-pagina.</p>
      <div className="space-y-3 mb-4">
        {list.map((r, i) => (
          <div key={i} className="card p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12.5px] font-semibold uppercase tracking-widest acc">{r[config.naamVeld] || "Rij " + (i + 1)}</span>
              {list.length > 1 && <button onClick={() => del(i)} className="ff hover:opacity-70" style={{ color: "#8a4a3a" }} title="Rij verwijderen"><Trash2 size={14} /></button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {config.fields.filter((f) => !f.lang).map((f) => (
                <label key={f.key} className="block">
                  <span className="text-[11.5px] mute">{f.label}</span>
                  <input className="input w-full px-2.5 py-1.5 text-sm" value={r[f.key] || ""} onChange={(e) => set(i, f.key, e.target.value)} />
                </label>
              ))}
            </div>
            {config.fields.filter((f) => f.lang).map((f) => (
              <label key={f.key} className="block mt-2">
                <span className="text-[11.5px] mute">{f.label}</span>
                <textarea rows={2} className={inputCls + " resize-none text-sm"} value={r[f.key] || ""} onChange={(e) => set(i, f.key, e.target.value)} />
              </label>
            ))}
          </div>
        ))}
      </div>
      <button onClick={add} className="btno ff w-full mb-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium px-3 py-2.5"><Plus size={15} /> Rij toevoegen</button>
    </div>
  );
}

// Formulier voor een werkwijze-document (titel, ondertitel, kopjes met regels).
function WerkwijzeDocForm({ editing, onCancel, onSave }) {
  const [title, setTitle] = useState(editing ? editing.title : "");
  const [intro, setIntro] = useState(editing ? editing.intro || "" : "");
  const [secties, setSecties] = useState(editing && editing.secties && editing.secties.length
    ? editing.secties.map((se) => ({ kop: se.kop, tekst: (se.regels || []).join("\n") }))
    : [{ kop: "", tekst: "" }]);
  const setSec = (i, veld, waarde) => setSecties((ss) => ss.map((x, j) => (j === i ? { ...x, [veld]: waarde } : x)));
  const addSec = () => setSecties((ss) => [...ss, { kop: "", tekst: "" }]);
  const delSec = (i) => setSecties((ss) => ss.filter((_, j) => j !== i));
  const submit = () => {
    if (!title.trim()) { alert("Geef het document een titel."); return; }
    const clean = secties
      .map((se) => ({ kop: se.kop.trim(), regels: se.tekst.split("\n").map((r) => r.trim()).filter(Boolean) }))
      .filter((se) => se.kop || se.regels.length);
    if (!clean.length) { alert("Voeg minstens één kopje met regels toe."); return; }
    onSave({ title: title.trim(), intro: intro.trim(), secties: clean });
  };
  return (
    <div>
      <FormBar title={editing ? "Werkwijze bewerken" : "Nieuw werkwijze-document"} onCancel={onCancel} onSave={submit} saveLabel="Opslaan" />
      <Field label="Titel"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="bv. Borrel" /></Field>
      <Field label="Ondertitel (optioneel)"><input className={inputCls} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="bv. Porties en planken" /></Field>
      <div className="space-y-3 mb-4">
        {secties.map((se, i) => (
          <div key={i} className="card p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12.5px] font-semibold uppercase tracking-widest acc">Kopje {i + 1}</span>
              {secties.length > 1 && <button onClick={() => delSec(i)} className="ff hover:opacity-70" style={{ color: "#8a4a3a" }} title="Kopje verwijderen"><Trash2 size={14} /></button>}
            </div>
            <input className={inputCls + " mb-2"} value={se.kop} onChange={(e) => setSec(i, "kop", e.target.value)} placeholder="Kopje, bv. Kaasplank (5 p per plank, 300 g totaal)" />
            <textarea rows={5} className={inputCls + " resize-none text-sm"} value={se.tekst} onChange={(e) => setSec(i, "tekst", e.target.value)} placeholder={"Eén regel per punt, bv.:\nCoppa 40 gram\nLomo 40 gram"} />
          </div>
        ))}
      </div>
      <button onClick={addSec} className="btno ff w-full mb-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium px-3 py-2.5"><Plus size={15} /> Kopje toevoegen</button>
    </div>
  );
}

// Formulier om de fermenteertabel aan te passen.
function FermentGuideForm({ rows, onCancel, onSave }) {
  const [list, setList] = useState(rows.map((r) => ({ ...r })));
  const set = (i, veld, waarde) => setList((ls) => ls.map((x, j) => (j === i ? { ...x, [veld]: waarde } : x)));
  const add = () => setList((ls) => [...ls, { methode: "", zout: "", pH: "", tijd: "", temp: "", let: "" }]);
  const del = (i) => setList((ls) => ls.filter((_, j) => j !== i));
  const submit = () => {
    const clean = list.filter((r) => (r.methode || "").trim());
    if (!clean.length) { alert("Houd minstens één methode over."); return; }
    onSave(clean);
  };
  const veld = (i, key, label, ph) => (
    <label className="block">
      <span className="text-[11.5px] mute">{label}</span>
      <input className="input w-full px-2.5 py-1.5 text-sm" value={list[i][key] || ""} onChange={(e) => set(i, key, e.target.value)} placeholder={ph || ""} />
    </label>
  );
  return (
    <div>
      <FormBar title="Fermenteerlijst bewerken" onCancel={onCancel} onSave={submit} saveLabel="Opslaan" />
      <p className="text-[13px] mute -mt-2 mb-3">Pas de methodes, streefwaarden en aandachtspunten aan. Deze lijst staat op de Werkwijze-pagina.</p>
      <div className="space-y-3 mb-4">
        {list.map((r, i) => (
          <div key={i} className="card p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12.5px] font-semibold uppercase tracking-widest acc">{r.methode || "Methode " + (i + 1)}</span>
              {list.length > 1 && <button onClick={() => del(i)} className="ff hover:opacity-70" style={{ color: "#8a4a3a" }} title="Methode verwijderen"><Trash2 size={14} /></button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {veld(i, "methode", "Methode", "bv. Melkzuur (groente)")}
              {veld(i, "zout", "Zout", "bv. 2,5% pekel")}
              {veld(i, "pH", "Streef-pH", "bv. onder 4,2")}
              {veld(i, "tijd", "Duur", "bv. 1–4 weken")}
              {veld(i, "temp", "Temperatuur", "bv. 18–22 °C")}
            </div>
            <label className="block mt-2">
              <span className="text-[11.5px] mute">Let op</span>
              <textarea rows={2} className={inputCls + " resize-none text-sm"} value={r.let || ""} onChange={(e) => set(i, "let", e.target.value)} />
            </label>
          </div>
        ))}
      </div>
      <button onClick={add} className="btno ff w-full mb-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium px-3 py-2.5"><Plus size={15} /> Methode toevoegen</button>
    </div>
  );
}

function TechniquesList({ notes, canEdit, onSaveNotes, werkDocs, fermentRows, tableRows, onEditTable, onNewDoc, onEditDoc, onDeleteDoc, onEditFerment, focusKey, onFocusDone }) {
  const [q, setQ] = useState("");
  const [openCards, setOpenCards] = useState({});
  const searching = q.trim().length > 0;
  const hit = (t) => softMatch(t, q);
  const jam = searching ? tableRows.jam.filter((r) => hit(r.fruit)) : tableRows.jam;
  const ice = searching ? tableRows.ijs.filter((r) => hit(r.soort)) : tableRows.ijs;
  const roast = searching ? tableRows.roosteren.filter((r) => hit(r.groente) || hit(r.type)) : tableRows.roosteren;
  const maten = searching ? (tableRows.maten || []).filter((r) => hit(r.naam)) : (tableRows.maten || []);
  // Bij zoeken klapt alleen de tabel open die een treffer heeft.
  const isOpen = (key, count) => (searching ? count > 0 : !!openCards[key]);
  const toggle = (key) => setOpenCards((o) => ({ ...o, [key]: !o[key] }));
  // Vanuit een recept (kritische waarden) gelinkt: open die kaart direct.
  useEffect(() => {
    if (!focusKey) return;
    setOpenCards((o) => ({ ...o, [focusKey]: true }));
    if (onFocusDone) onFocusDone();
  }, [focusKey]);
  const n = (k) => (notes && notes[k]) || TECH_NOTES_SEED[k];
  const nothing = searching && jam.length === 0 && ice.length === 0 && roast.length === 0 && maten.length === 0;
  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Zoek een fruitsoort, groente of bereiding" />
      {nothing && <Empty label="Niets gevonden in de technieken." />}
      <div className="space-y-2.5">
        <TechCard title="Jam & confituur" intro="Met 2:1 geleisuiker — per kg schoongemaakt fruit" open={isOpen("jam", jam.length)} onToggle={() => toggle("jam")}>
          {canEdit && <div className="flex justify-end mb-1"><button onClick={() => onEditTable("jam")} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium acc hover:opacity-70"><Pencil size={12} /> Waarden bewerken</button></div>}
          <TechTable head={["Fruit", "Pectine", "Geleisuiker 2:1", "Extra pectine", "Citroenzuur"]}
            rows={jam.map((r) => [r.fruit, r.pectine, r.suiker, r.pectineX, r.zuur])} />
          <TechNotes label="Werkwijze" notes={n("jam")} canEdit={canEdit} onSave={(lines) => onSaveNotes("jam", lines)} />
        </TechCard>

        <TechCard title="Roomijs & sorbet" intro="Suikergehaltes en glucoseverhouding" open={isOpen("ijs", ice.length)} onToggle={() => toggle("ijs")}>
          {canEdit && <div className="flex justify-end mb-1"><button onClick={() => onEditTable("ijs")} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium acc hover:opacity-70"><Pencil size={12} /> Waarden bewerken</button></div>}
          <TechTable head={["Soort", "Totaal suiker", "Aandeel glucose", "Aandachtspunt"]}
            rows={ice.map((r) => [r.soort, r.suiker, r.glucose, r.extra])} />
          <TechNotes label="Lezen als volgt" notes={n("ijs")} canEdit={canEdit} onSave={(lines) => onSaveNotes("ijs", lines)} />
        </TechCard>

        <TechCard title="Snij- en vochtverlies bij roosteren" intro="Van onbewerkt naar schoongemaakt naar geroosterd" open={isOpen("roosteren", roast.length)} onToggle={() => toggle("roosteren")}>
          {canEdit && <div className="flex justify-end mb-1"><button onClick={() => onEditTable("roosteren")} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium acc hover:opacity-70"><Pencil size={12} /> Waarden bewerken</button></div>}
          <TechTable head={["Groente", "Type", "Snijverlies", "Vochtverlies", "Schoon voor 1 kg", "Onbewerkt voor 1 kg"]}
            rows={roast.map((r) => [r.groente, r.type, r.snij, r.verlies, r.schoon, r.onbewerkt])} />
          <TechNotes label="Zo gebruik je de tabel" notes={n("roosteren")} canEdit={canEdit} onSave={(lines) => onSaveNotes("roosteren", lines)} />
        </TechCard>

        <TechCard title="Gewichten per lepel en stuk" intro="Waarmee de app lepels, stuks en centimeters omrekent" open={isOpen("maten", maten.length)} onToggle={() => toggle("maten")}>
          {canEdit && <div className="flex justify-end mb-1"><button onClick={() => onEditTable("maten")} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium acc hover:opacity-70"><Pencil size={12} /> Waarden bewerken</button></div>}
          <TechTable head={["Ingrediënt", "1 el (g)", "1 stuk (g)", "1 cm (g)"]}
            rows={maten.map((r) => [r.naam, r.el || "—", r.stuk || "—", r.cm || "—"])} />
          <TechNotes label="Zo gebruik je de tabel" notes={n("maten")} canEdit={canEdit} onSave={(lines) => onSaveNotes("maten", lines)} />
        </TechCard>

        <TechCard title="Fermenteren" intro="Methodes, streefwaarden en aandachtspunten" open={isOpen("fermenteren", (softMatch("fermenteren", q) || softMatch("fermentatie", q)) ? 1 : fermentRows.filter((r) => hit(r.methode) || hit(r.let)).length)} onToggle={() => toggle("fermenteren")}>
          {canEdit && <div className="flex justify-end mb-1"><button onClick={onEditFerment} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium acc hover:opacity-70"><Pencil size={12} /> Bewerken</button></div>}
          <TechTable head={["Methode", "Zout", "Streef-pH", "Duur", "Temp.", "Let op"]}
            rows={(searching ? fermentRows.filter((r) => hit(r.methode) || hit(r.let)) : fermentRows).map((r) => [r.methode, r.zout, r.pH, r.tijd, r.temp, r.let])} />
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

        {werkDocs.map((c) => {
          const secs = searching ? c.secties.map((se) => ({ ...se, regels: (se.regels || []).filter((r) => hit(r) || hit(se.kop)) })).filter((se) => se.regels.length > 0) : c.secties;
          return (
            <TechCard key={c.key} title={c.title} intro={c.intro} open={isOpen(c.key, secs.length)} onToggle={() => toggle(c.key)}>
              {canEdit && (
                <div className="flex justify-end gap-3 mb-1">
                  <button onClick={() => onEditDoc(c.key)} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium acc hover:opacity-70"><Pencil size={12} /> Bewerken</button>
                  {c.custom && <button onClick={() => onDeleteDoc(c.key)} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium hover:opacity-70" style={{ color: "#8a4a3a" }}><Trash2 size={12} /> Verwijderen</button>}
                </div>
              )}
              {secs.map((se, i) => (
                <div key={i} className={i > 0 ? "mt-4" : ""}>
                  <div className="text-sm font-semibold ink mb-1">{se.kop}</div>
                  <ul className="list-disc list-inside space-y-0.5 text-sm" style={{ color: "#3f5238" }}>
                    {(se.regels || []).map((r, j) => <li key={j}>{r}</li>)}
                  </ul>
                </div>
              ))}
            </TechCard>
          );
        })}
      </div>
    </div>
  );
}

function CleaningList({ tasks, logs, haccpLogs, haccpRecords, canEdit, user, dayDone, dayOff, onDayDone, onUndoDayDone, onDayOff, onSign, onEditLog, onDeleteLog, onNewTask, onEditTask, onDeleteTask, onOpenHaccp, onEditHaccp, onDeleteHaccp, onOpenRecord, onEditRecord, onDeleteRecord , onReopenOff }) {
  const [q, setQ] = useState("");
  const [areaF, setAreaF] = useState("Alle");
  const [openAll, setOpenAll] = useState(false);
  const [haccpOpen, setHaccpOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false); // weeklogboek standaard ingeklapt
  const [openDay, setOpenDay] = useState(null); // dagen in het weeklogboek: standaard dicht
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
  const weekLogs = logs.filter((l) => weekKey(l.doneDate) === wk).sort((a, b) => (a.doneDate < b.doneDate ? 1 : -1));
  const weekSignCount = weekLogs.filter((l) => l.taskId !== DAY_DONE_ID && l.taskId !== DAY_OFF_ID).length;
  const dayOffDates = new Set(logs.filter((l) => l.taskId === DAY_OFF_ID).map((l) => l.doneDate));
  // Groepeer het weeklogboek per dag: nieuwste dag eerst, met wie er tekende.
  const dayNames = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const weekDays = (() => {
    const byDate = {};
    for (const l of weekLogs) (byDate[l.doneDate] = byDate[l.doneDate] || []).push(l);
    return Object.keys(byDate).sort((a, b) => (a < b ? 1 : -1)).map((date) => {
      const all = byDate[date];
      const off = all.find((l) => l.taskId === DAY_OFF_ID) || null;
      const done = all.find((l) => l.taskId === DAY_DONE_ID) || null;
      const items = all.filter((l) => l.taskId !== DAY_OFF_ID && l.taskId !== DAY_DONE_ID);
      const people = [...new Set(items.map((l) => l.doneBy))];
      const who = people.length === 0 ? "" : people.length <= 2 ? people.join(" & ") : people.length + " personen";
      const d = new Date(date + "T12:00:00");
      return { date, off, done, items, who, label: dayNames[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1) };
    });
  })();
  const taskName = (id) => { if (id === DAY_OFF_ID) return "Vrije dag — bedrijf dicht"; const t = tasks.find((x) => x.id === id); return t ? t.area + " · " + t.name : "Onbekende taak"; };

  const startNote = (l) => { setNoteFor(l.id); setNoteText(l.note || ""); };
  const saveNote = () => { onEditLog(noteFor, noteText); setNoteFor(null); };

  return (
    <div>
      <SearchBar value={q} onChange={setQ} placeholder="Zoek een schoonmaaktaak" />

      {dayDone
        ? <div className="rounded-xl p-3.5 mb-3 flex items-start gap-2 text-sm" style={{ background: "#e8ebe0", color: T.green }}>
            <Check size={16} className="shrink-0 mt-0.5" />
            <span className="flex-1">Dag afgerond door <span className="font-medium">{dayDone.doneBy}</span>.</span>
            <button onClick={onUndoDayDone} className="ff shrink-0 text-xs font-semibold underline">Heropen</button>
          </div>
        : dayOff
          ? <div className="rounded-xl p-3.5 mb-3 flex items-start gap-2 text-sm" style={{ background: "#efece2", color: "#6a6550" }}>
              <Info size={16} className="shrink-0 mt-0.5" />
              <span className="flex-1">Vandaag geregistreerd als <span className="font-medium">vrije dag</span>. Wel gewerkt? Verwijder dit in het logboek hieronder.</span>
            </div>
          : <div className="flex gap-2 mb-3">
              <button onClick={onDayDone} className="btnp ff flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold px-3 py-3"><Check size={16} /> Dag afgerond</button>
              <button onClick={() => onDayOff()} className="btno ff shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium px-3 py-3" title="Bedrijf dicht vandaag"><Calendar size={15} /> Vrije dag</button>
            </div>}

      {!dayDone && !dayOff && <div className="flex items-center justify-between mb-2">
        <button onClick={() => setOpenDue((o) => !o)} className="ff inline-flex items-center gap-1">
          {openDue ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />}
          <Eyebrow>Vandaag te doen ({dueToday.length})</Eyebrow>
        </button>
        <span className="text-xs mute text-right">{dueToday.length} {dueToday.length === 1 ? "taak" : "taken"}</span>
      </div>}
      {(!showDue || dayOff)
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
                      : HACCP_TASK_KIND[x.t.id]
                        ? <button onClick={() => onOpenRecord(HACCP_TASK_KIND[x.t.id], null)} className="btnp ff shrink-0 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-2.5 py-2" title="Registreren"><Plus size={14} /> Invullen</button>
                        : <button onClick={() => onSign(x.t.id)} className="btnp ff shrink-0 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold px-2.5 py-2" title="Aftekenen — de app vraagt wie"><Check size={14} /> Aftekenen</button>)
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
                          : HACCP_TASK_KIND[x.t.id]
                            ? <button onClick={() => onOpenRecord(HACCP_TASK_KIND[x.t.id], null)} className="ff shrink-0 rounded-lg px-1.5 py-1.5 acc hover:opacity-70" title="Registreren"><Plus size={15} /></button>
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

      <div className="mt-10 pt-6" style={{ borderTop: "2px solid " + T.line }}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => setHaccpOpen((o) => !o)} className="ff inline-flex items-center gap-2">
            {haccpOpen ? <ChevronUp size={18} className="acc" /> : <ChevronDown size={18} className="acc" />}
            <h2 className="serif ink text-2xl leading-tight">HACCP</h2>
          </button>
          <button onClick={() => printHaccp(haccpLogs, haccpRecords)} className="ff inline-flex items-center gap-1.5 text-sm font-medium acc hover:opacity-70" title="Heel het HACCP-logboek printen"><Printer size={15} /> Print</button>
        </div>
        <p className="text-[13px] mute mb-3">Temperaturen, bereiding, terugkoelen en leveringen — het voedselveiligheidsdossier voor de Keuringsdienst van Waren.</p>
        {haccpOpen && <>
          <HaccpBlock logs={haccpLogs} canEdit={canEdit} onOpen={onOpenHaccp} onEdit={onEditHaccp} onDelete={onDeleteHaccp} onPrint={null} />
          <HaccpRecordBlock kind="bereiding" records={haccpRecords} canEdit={canEdit} onOpen={onOpenRecord} onEdit={onEditRecord} onDelete={onDeleteRecord} />
          <HaccpRecordBlock kind="terugkoelen" records={haccpRecords} canEdit={canEdit} onOpen={onOpenRecord} onEdit={onEditRecord} onDelete={onDeleteRecord} />
          <HaccpRecordBlock kind="levering" records={haccpRecords} canEdit={canEdit} onOpen={onOpenRecord} onEdit={onEditRecord} onDelete={onDeleteRecord} />
        </>}
      </div>

      <div className="mt-7 flex items-center justify-between">
        <button onClick={() => setLogOpen((o) => !o)} className="ff inline-flex items-center gap-1">
          {logOpen ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />}
          <Eyebrow>Logboek per week</Eyebrow>
        </button>
        {logOpen && <div className="flex items-center gap-1.5 mb-2">
          <button onClick={() => printCleaning(wk.replace("-W", " · week "), fmtDMY(isoDate(monday)) + " t/m " + fmtDMY(isoDate(sunday)), weekDays, taskName)} className="ff pill rounded-md w-7 h-7 flex items-center justify-center" title="Logboek van deze week printen"><Printer size={13} /></button>
          <button onClick={() => setWeekOffset((w) => w - 1)} className="ff pill rounded-md w-7 h-7 flex items-center justify-center" title="Vorige week"><ArrowLeft size={13} /></button>
          <span className="pillon rounded-md px-2 h-7 flex items-center text-[12.5px] font-semibold">{wk.replace("-W", " · week ")}</span>
          <button onClick={() => setWeekOffset((w) => Math.min(0, w + 1))} disabled={weekOffset >= 0} className="ff pill rounded-md w-7 h-7 flex items-center justify-center disabled:opacity-40" title="Volgende week"><ChevronRight size={13} /></button>
        </div>}
      </div>
      {logOpen && <>
      <div className="text-xs mute mb-2">{fmtDMY(isoDate(monday))} t/m {fmtDMY(isoDate(sunday))} · {weekSignCount} aftekeningen</div>
      {weekLogs.length === 0
        ? <Empty label="Deze week is er nog niets afgetekend." />
        : <div className="space-y-3">
            {weekDays.map((day) => (
              <div key={day.date}>
                <button onClick={() => setOpenDay(openDay === day.date ? null : day.date)} className="ff w-full flex items-baseline justify-between mb-1">
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold ink">{openDay === day.date ? <ChevronUp size={13} className="acc" /> : <ChevronDown size={13} className="acc" />} {day.label}</span>
                  <span className="text-[11.5px] mute">{day.off ? "vrije dag" : (day.done ? "afgerond · " : "") + day.items.length + (day.items.length === 1 ? " taak" : " taken") + (day.who ? " · " + day.who : "")}</span>
                </button>
                {openDay === day.date && (day.off
                  ? <div className="card px-3 py-2 flex items-center gap-2 text-[13px]" style={{ color: "#6a6550" }}>
                      <Calendar size={14} className="shrink-0" /> <span className="flex-1">Bedrijf dicht</span>
                      {canEdit && <button onClick={() => onReopenOff(day.off.id, day.date)} className="ff shrink-0 text-[12.5px] font-medium underline acc" title="Vrije dag heropenen en direct invullen">Heropenen</button>}
                    </div>
                  : <div className="card overflow-hidden divide-y" style={{ borderColor: T.line }}>
                      {day.done
                        ? (
                          <div className="flex items-center gap-2 px-3 py-2 text-[13px]" style={{ background: "#f2f4ec", color: "#46603f" }}>
                            <Check size={14} className="shrink-0" /> <span className="flex-1">Dag afgerond door {day.done.doneBy}</span>
                            {canEdit && <button onClick={() => onReopenOff(day.done.id, day.date)} className="ff shrink-0 inline-flex items-center gap-1 text-[12.5px] font-medium underline acc" title="Afgeronde dag heropenen en opnieuw invullen — eerdere aftekeningen blijven staan"><Pencil size={12} /> Heropenen</button>}
                          </div>
                        )
                        : (
                          <div className="flex items-center gap-2 px-3 py-2 text-[13px]" style={{ background: "#f6f5ee", color: "#6a6550" }}>
                            <Calendar size={14} className="shrink-0" /> <span className="flex-1">Dag niet afgerond</span>
                            {canEdit && <button onClick={() => onReopenOff(null, day.date)} className="ff shrink-0 inline-flex items-center gap-1 text-[12.5px] font-medium underline acc" title="Heropen deze dag als invulpopup — eerdere aftekeningen blijven staan"><Pencil size={12} /> Heropenen</button>}
                          </div>
                        )}
                      {day.items.map((l) => (
                        <div key={l.id}>
                          <div className="flex items-center gap-2 px-3 py-2">
                            <Check size={14} className="shrink-0 acc" />
                            <span className="flex-1 min-w-0 text-[13px] ink truncate">{taskName(l.taskId)}</span>
                            <span className="shrink-0 text-[11.5px] mute">{l.doneBy}</span>
                            {canEdit && <button onClick={() => startNote(l)} className="ff shrink-0 hover:opacity-70 acc" title={l.note ? "Opmerking aanpassen" : "Opmerking toevoegen"}><Pencil size={13} /></button>}
                            {canEdit && <button onClick={() => onDeleteLog(l.id)} className="ff shrink-0 hover:opacity-70" style={{ color: "#8a4a3a" }} title="Verwijderen"><Trash2 size={13} /></button>}
                          </div>
                          {l.note && noteFor !== l.id && <div className="px-3 pb-2 -mt-1 text-[12px] italic mute flex gap-1"><span className="acc">›</span> {l.note}</div>}
                          {(l.edits || []).length > 0 && noteFor !== l.id && (
                            <div className="px-3 pb-2 -mt-1 text-[11px] mute">{l.edits.length === 1 ? "1 correctie" : l.edits.length + " correcties"} · laatst door {l.edits[l.edits.length - 1].by}</div>
                          )}
                          {canEdit && noteFor === l.id && (
                            <div className="px-3 pb-3">
                              <textarea rows={2} className={inputCls + " resize-none text-sm"} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Wat is er gedaan of opgevallen?" />
                              <div className="flex items-center gap-2 mt-1.5">
                                <button onClick={saveNote} className="btnp ff inline-flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1.5"><Check size={13} /> Opslaan</button>
                                <button onClick={() => setNoteFor(null)} className="btno ff inline-flex items-center gap-1 rounded-lg text-xs font-medium px-2.5 py-1.5"><X size={13} /> Annuleren</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>)}
              </div>
            ))}
          </div>}
      </>}
    </div>
  );
}

// ---------- HACCP: wekelijkse temperatuurregistratie ----------
const doneThisWeekInit = (rows) => rows.some((l) => weekKey(String(l.checkDate || l.date)) === weekKey(localDate()));
function HaccpBlock({ logs, canEdit, onOpen, onEdit, onDelete, onPrint }) {
  const [openAll, setOpenAll] = useState(false);
  // Om de dag: de laatste controle telt als "gedaan" zolang hij van vandaag of
  // gisteren is; ouder = opnieuw invullen.
  const sorted = [...logs].sort((a, b) => (a.checkDate < b.checkDate ? 1 : -1));
  const doneThisWeek = sorted.length && daysBetween(sorted[0].checkDate) <= 1 ? sorted[0] : null;
  const shown = openAll ? sorted : sorted.slice(0, 3);
  const warn = (l) => HACCP_UNITS.some((u) => inRange(u, l.values[u.id]) === false) || (l.calibration && l.calibration.ok === false);
  // Inklapbaar: al gedaan deze week → start dicht; nog niet gedaan → start open.
  const [openSec, setOpenSec] = useState(() => !doneThisWeekInit(logs));
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setOpenSec((o) => !o)} className="ff inline-flex items-center gap-1">
          {openSec ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />}
          <Eyebrow>HACCP · temperaturen</Eyebrow>
          {!openSec && (doneThisWeek ? <Check size={14} className="acc ml-1" /> : <Bell size={14} className="ml-1" style={{ color: "#8a5f2a" }} />)}
        </button>
        <div className="flex items-center gap-3 mb-2">
          {onPrint && <button onClick={onPrint} className="ff inline-flex items-center gap-1 text-sm font-medium acc hover:opacity-70" title="Heel het HACCP-logboek printen"><Printer size={15} /> Print</button>}
          {canEdit && <button onClick={() => onOpen(null)} className="ff inline-flex items-center gap-1 text-sm font-medium acc hover:opacity-70"><Plus size={15} /> Meting invullen</button>}
        </div>
      </div>
      {openSec && <>
      {doneThisWeek
        ? <div className="rounded-xl p-3.5 text-sm flex items-start gap-2" style={{ background: "#e8ebe0", color: T.green }}>
            <Check size={16} className="shrink-0 mt-0.5" />
            <span>Gecontroleerd op {fmtDMY(doneThisWeek.checkDate)} door <span className="font-medium">{doneThisWeek.doneBy}</span> (om de dag){warn(doneThisWeek) && <span style={{ color: "#8a4a3a" }}> — let op: een waarde valt buiten de grenzen</span>}</span>
          </div>
        : <div className="rounded-xl p-3.5 text-sm flex items-start gap-2" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
            <Bell size={16} className="shrink-0 mt-0.5" />
            <span>Om-de-dagcontrole: nog niet gedaan. Meet koelcel, koelwerkbank, vrieskast en vriescel, en ijk de thermometer.</span>
          </div>}

      <div className="mt-3 space-y-2">
        {shown.map((l) => (
          <div key={l.id} className="card p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium ink">{fmtDMY(l.checkDate)} · week {weekKey(l.checkDate).split("-W")[1]}</div>
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
                const sv = l.screen ? l.screen[u.id] : undefined;
                const okS = sv === undefined ? null : inRange(u, sv);
                return (
                  <div key={u.id} className="flex items-center justify-between gap-2">
                    <span className="mute truncate">{u.name}</span>
                    <span className="font-medium shrink-0" style={{ color: ok === false || okS === false ? "#8a4a3a" : "#2b3823" }}>
                      {sv !== undefined && sv !== null ? String(sv).replace(".", ",") + " / " : ""}{fmtTemp(l.values[u.id])}{(ok === false || okS === false) && " ⚠"}
                    </span>
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
      </>}
    </div>
  );
}

// ---------- HACCP-registraties: bereiding, terugkoelen, levering ----------
// Elk type heeft eigen kolommen; ze delen één opslag (haccp_records) en één
// compacte tabelweergave, in stijl van de koeltemperatuur-tabel.
const HACCP_KINDS = {
  bereiding: {
    label: "Bereiding", icon: "pan",
    intro: "Garing van een product: bereikte kerntemperatuur en verstreken tijd, plus de temperatuur en tijd na afkoelen.",
    // Richtlijn Keuringsdienst van Waren (NVWA / warenwet).
    guide: [
      "Kerntemperatuur bij garen: minimaal 75 °C (of 70 °C gedurende 2 minuten).",
      "Gevogelte altijd volledig door en door verhitten.",
      "Warm serveren: houd boven de 60 °C.",
      "Na garen snel afkoelen: binnen 2 uur van 60 naar 10 °C, daarna binnen 4 uur naar ≤ 7 °C.",
    ],
    cols: [
      { id: "gerecht", label: "Product / gerecht", type: "text", ph: "bv. gelakte buik" },
      { id: "richt", label: "Richtwaarde garing", type: "num", unit: "°C", ph: "bv. 75" },
      { id: "gemeten", label: "Behaalde kerntemp.", type: "num", unit: "°C", ph: "kern" },
      { id: "tijd", label: "Tijd garing (duur)", type: "dur", ph: "bv. 10 minuten, 3 uur, 24 uur" },
      { id: "koeltemp", label: "Temp. na afkoelen", type: "num", unit: "°C", ph: "bv. 6" },
      { id: "koeltijd", label: "Tijd tot 7 graden", type: "dur", ph: "bv. 90 minuten" },
    ],
    ok: (r) => {
      const garingOk = r.gemeten == null || r.richt == null ? null : Number(r.gemeten) >= Number(r.richt);
      const koelOk = r.koeltemp == null || r.koeltemp === "" ? null : Number(r.koeltemp) <= 7;
      if (garingOk === false || koelOk === false) return false;
      if (garingOk === null && koelOk === null) return null;
      return true;
    },
    summary: (r) => (r.gerecht || "—") + " · gaar " + fmtTemp(r.gemeten) + (r.koeltemp != null && r.koeltemp !== "" ? " → koel " + fmtTemp(r.koeltemp) : ""),
  },
  terugkoelen: {
    label: "Terugkoelen", icon: "snow",
    intro: "Van warm naar koud terugkoelen van een product.",
    guide: [
      "Binnen 2 uur van 60 °C naar 10 °C.",
      "Daarna binnen 4 uur verder naar ≤ 7 °C (bij voorkeur ≤ 4 °C).",
      "Sneller koelt beter: verdeel over platte bakken of gebruik de blastchiller.",
    ],
    cols: [
      { id: "product", label: "Product", type: "text", ph: "bv. bouillon" },
      { id: "start", label: "Starttijd", type: "time" },
      { id: "tstart", label: "Begintemp.", type: "num", unit: "°C", ph: "bv. 70" },
      { id: "eind", label: "Eindtijd", type: "time" },
      { id: "teind", label: "Eindtemp.", type: "num", unit: "°C", ph: "bv. 4" },
    ],
    ok: (r) => r.teind == null ? null : Number(r.teind) <= 7,
    summary: (r) => (r.product || "—") + " · " + fmtTemp(r.tstart) + " → " + fmtTemp(r.teind),
  },
  levering: {
    label: "Levering", icon: "truck",
    intro: "Temperatuur bij aflevering controleren; keur goed of af bij een te hoge temperatuur.",
    guide: [
      "Gekoelde producten: ≤ 7 °C (zuivel/vlees bij voorkeur ≤ 4 °C).",
      "Vis op smeltend ijs: ≤ 2 °C.",
      "Diepvries: ≤ −18 °C.",
      "Te warm ontvangen? Afkeuren en noteren.",
    ],
    cols: [
      { id: "leverancier", label: "Naam product / leverancier", type: "text", ph: "bv. verse zalm" },
      { id: "gewenst", label: "Gewenst", type: "num", unit: "°C", ph: "bv. 2" },
      { id: "gemeten", label: "Gemeten", type: "num", unit: "°C", ph: "bij ontvangst" },
      { id: "tijd", label: "Tijd", type: "time" },
      { id: "oordeel", label: "Beoordeling", type: "verdict" },
    ],
    ok: (r) => r.oordeel === "afgekeurd" ? false : r.oordeel === "goedgekeurd" ? true : (r.gemeten == null || r.gewenst == null ? null : Number(r.gemeten) <= Number(r.gewenst) + 2),
    summary: (r) => (r.leverancier || "—") + " · " + fmtTemp(r.gemeten) + (r.oordeel === "afgekeurd" ? " · afgekeurd" : r.oordeel === "goedgekeurd" ? " · goedgekeurd" : ""),
  },
};

function HaccpRecordBlock({ kind, records, canEdit, onOpen, onEdit, onDelete }) {
  const cfg = HACCP_KINDS[kind];
  const [openAll, setOpenAll] = useState(false);
  const thisWeek = weekKey(localDate());
  const sorted = [...records].filter((r) => r.kind === kind).sort((a, b) => (a.date < b.date ? 1 : -1));
  const doneThisWeek = sorted.find((r) => weekKey(r.date) === thisWeek) || null;
  const shown = openAll ? sorted : sorted.slice(0, 3);
  // Inklapbaar: al gedaan deze week → start dicht; nog niet gedaan → start open.
  const [openSec, setOpenSec] = useState(() => !records.some((r) => r.kind === kind && weekKey(r.date) === weekKey(localDate())));
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setOpenSec((o) => !o)} className="ff inline-flex items-center gap-1">
          {openSec ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />}
          <Eyebrow>HACCP · {cfg.label.toLowerCase()}</Eyebrow>
          {!openSec && (doneThisWeek ? <Check size={14} className="acc ml-1" /> : <Bell size={14} className="ml-1" style={{ color: "#8a5f2a" }} />)}
        </button>
        {canEdit && <button onClick={() => onOpen(kind, null)} className="ff inline-flex items-center gap-1 text-sm font-medium acc hover:opacity-70 mb-2"><Plus size={15} /> Invullen</button>}
      </div>
      {openSec && <>
      <p className="text-[12.5px] mute -mt-1 mb-2">{cfg.intro}</p>
      {!doneThisWeek && (
        <div className="rounded-xl p-3 mb-2 text-[13px] flex items-start gap-2" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
          <Bell size={15} className="shrink-0 mt-0.5" /><span>Deze week nog niet ingevuld.</span>
        </div>
      )}
      {sorted.length === 0
        ? <Empty label="Nog niets geregistreerd." />
        : <div className="space-y-2">
            {shown.map((r) => {
              const ok = cfg.ok(r);
              return (
                <div key={r.id} className="card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium ink truncate flex items-center gap-1.5">{cfg.summary(r)}{ok === false && <AlertTriangle size={22} className="shrink-0" strokeWidth={2.5} style={{ color: "#8a4a3a" }} />}</div>
                      <div className="text-[11.5px] mute mt-0.5">{fmtDMY(r.date)} · {r.by}</div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => onEdit(kind, r.id)} className="ff rounded-lg px-1.5 py-1 acc hover:opacity-70" title="Corrigeren"><Pencil size={13} /></button>
                        <button onClick={() => onDelete(r.id)} className="ff rounded-lg px-1.5 py-1 hover:opacity-70" style={{ color: "#8a4a3a" }} title="Verwijderen"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5 text-[12px]">
                    {cfg.cols.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2">
                        <span className="mute truncate">{c.label}</span>
                        <span className="ink font-medium shrink-0">{c.type === "num" ? fmtTemp(r[c.id]) : (r[c.id] || "—")}</span>
                      </div>
                    ))}
                  </div>
                  {r.note && <p className="text-[12px] mute mt-1.5 italic">{r.note}</p>}
                </div>
              );
            })}
            {sorted.length > 3 && (
              <button onClick={() => setOpenAll((o) => !o)} className="ff w-full rounded-xl text-sm mute py-2" style={{ border: "1px dashed #cfccbe" }}>
                {openAll ? "Toon minder" : "Toon alle " + sorted.length}
              </button>
            )}
          </div>}
      </>}
    </div>
  );
}

function HaccpRecordForm({ kind, editing, prefill, onCancel, onSave }) {
  const cfg = HACCP_KINDS[kind];
  const [date, setDate] = useState(editing ? editing.date : localDate());
  const [vals, setVals] = useState(() => {
    const v = {};
    cfg.cols.forEach((c) => { v[c.id] = editing && editing[c.id] != null ? String(editing[c.id]) : (prefill && prefill[c.id] != null ? String(prefill[c.id]) : ""); });
    return v;
  });
  const [note, setNote] = useState(editing ? editing.note || "" : "");
  const num = (x) => (x === "" || x === "-" ? null : Number(String(x).replace(",", ".")));
  const set = (id, v) => setVals((o) => ({ ...o, [id]: v }));
  const submit = () => {
    const missing = cfg.cols.filter((c) => (c.type === "num" && num(vals[c.id]) === null) || ((c.type === "time" || c.type === "dur") && !(vals[c.id] || "").trim())).map((c) => c.label);
    if (missing.length) { alert("Vul eerst alle temperaturen en tijden in:\n– " + missing.join("\n– ")); return; }
    const out = { kind, date, note: note.trim() };
    cfg.cols.forEach((c) => { out[c.id] = c.type === "num" ? num(vals[c.id]) : (vals[c.id] || "").trim(); });
    onSave(out);
  };
  return (
    <div>
      <FormBar title={(editing ? "Corrigeren · " : "HACCP · ") + cfg.label.toLowerCase()} onCancel={onCancel} onSave={submit} saveLabel={editing ? "Opslaan" : "Registreren"} />
      <p className="text-[13px] mute -mt-2 mb-3">{cfg.intro}</p>
      {cfg.guide && (
        <div className="rounded-xl p-3.5 mb-3 text-[13px]" style={{ background: "#eef1e6", color: "#3f5238" }}>
          <div className="font-semibold mb-1 flex items-center gap-1.5"><Info size={14} /> Richtlijn Keuringsdienst van Waren</div>
          <ul className="list-disc list-inside space-y-0.5">{cfg.guide.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </div>
      )}
      <Field label="Datum"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <div className="card overflow-hidden mb-4">
        {cfg.cols.map((c, i) => (
          <div key={c.id} className={"px-3.5 py-3 " + (i > 0 ? "divi" : "")}>
            <div className="text-sm font-medium ink mb-1.5">{c.label}</div>
            {c.type === "text" && <input className={inputCls} value={vals[c.id]} onChange={(e) => set(c.id, e.target.value)} placeholder={c.ph || ""} />}
            {c.type === "time" && <input type="time" className={inputCls} value={vals[c.id]} onChange={(e) => set(c.id, e.target.value)} />}
            {c.type === "dur" && <input type="text" className={inputCls} value={vals[c.id]} onChange={(e) => set(c.id, e.target.value)} placeholder={c.ph || "bv. 3 uur"} />}
            {c.type === "num" && (
              <div className="flex items-center gap-2">
                <input type="text" inputMode="decimal" className="input px-2.5 py-2 flex-1" value={vals[c.id]} onChange={(e) => set(c.id, e.target.value.replace(/[^0-9.,-]/g, ""))} placeholder={c.ph || ""} />
                <span className="text-sm mute shrink-0">{c.unit}</span>
              </div>
            )}
            {c.type === "verdict" && (
              <div className="flex gap-2">
                <button type="button" onClick={() => set(c.id, vals[c.id] === "goedgekeurd" ? "" : "goedgekeurd")} className={"ff flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium py-2.5 " + (vals[c.id] === "goedgekeurd" ? "btnp" : "btno")}><Check size={15} /> Goedgekeurd</button>
                <button type="button" onClick={() => set(c.id, vals[c.id] === "afgekeurd" ? "" : "afgekeurd")} className="ff flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium py-2.5" style={vals[c.id] === "afgekeurd" ? { background: "#8a4a3a", color: "#fff" } : { border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }}><X size={15} /> Afgekeurd</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <Field label="Opmerking"><textarea rows={2} className={inputCls + " resize-none"} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijzonderheden of genomen maatregel" /></Field>
      <p className="text-xs mute -mt-2">Na opslaan wordt de bijbehorende schoonmaaktaak deze week afgetekend op jouw naam.</p>
    </div>
  );
}

function HaccpForm({ editing, onCancel, onSave }) {
  const [checkDate, setCheckDate] = useState(editing ? editing.checkDate : new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState(() => {
    const v = {};
    // Vriezers krijgen alvast een minteken klaargezet.
    HACCP_UNITS.forEach((u) => { v[u.id] = editing && editing.values[u.id] !== undefined && editing.values[u.id] !== null ? String(editing.values[u.id]) : (u.max < 0 ? "-" : ""); });
    return v;
  });
  // Tweede meting: de waarde die het scherm van het apparaat zelf aangeeft.
  const [screen, setScreen] = useState(() => {
    const v = {};
    HACCP_UNITS.forEach((u) => { v[u.id] = editing && editing.screen && editing.screen[u.id] !== undefined && editing.screen[u.id] !== null ? String(editing.screen[u.id]) : (editing ? "" : (u.max < 0 ? "-" : "")); });
    return v;
  });
  const [calib, setCalib] = useState(editing && editing.calibration && editing.calibration.measured !== null && editing.calibration.measured !== undefined ? String(editing.calibration.measured) : "");
  const [note, setNote] = useState(editing ? editing.note || "" : "");
  const num = (x) => (x === "" || x === "-" ? null : Number(String(x).replace(",", ".")));
  const calibNum = num(calib);
  const calibOk = calibNum === null ? null : Math.abs(calibNum) <= CALIB_TOLERANCE;
  const submit = () => {
    const missing = [];
    HACCP_UNITS.forEach((u) => {
      if (num(screen[u.id]) === null) missing.push(u.name + " (scherm)");
      if (num(values[u.id]) === null) missing.push(u.name + " (thermometer)");
    });
    if (calibNum === null) missing.push("IJking (ijswater)");
    if (missing.length) { alert("Vul eerst alle temperaturen in:\n– " + missing.join("\n– ")); return; }
    const out = {}, outS = {};
    HACCP_UNITS.forEach((u) => { out[u.id] = num(values[u.id]); outS[u.id] = num(screen[u.id]); });
    onSave({ checkDate, values: out, screen: outS, calibration: { measured: calibNum, ok: calibOk === null ? null : calibOk }, note: note.trim() });
  };
  return (
    <div>
      <FormBar title={editing ? "Meting corrigeren" : "Temperatuurcontrole"} onCancel={onCancel} onSave={submit} saveLabel={editing ? "Opslaan" : "Aftekenen"} />
      <Field label="Datum"><input type="date" className={inputCls} value={checkDate} onChange={(e) => setCheckDate(e.target.value)} /></Field>
      <div className="text-sm font-medium ink mb-1.5">Gemeten temperaturen</div>
      <div className="card overflow-hidden mb-4">
        {HACCP_UNITS.map((u, i) => {
          const ok = inRange(u, num(values[u.id]));
          const okS = inRange(u, num(screen[u.id]));
          return (
            <div key={u.id} className={"px-3.5 py-3 " + (i > 0 ? "divi" : "")}>
              <div className="text-sm font-medium ink">{u.name}</div>
              <div className="text-[12.5px] mute mb-1.5">streef: {u.target}</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11.5px] mute">Scherm apparaat (°C)</span>
                  <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full" value={screen[u.id]}
                    onChange={(e) => setScreen((v) => ({ ...v, [u.id]: e.target.value.replace(/[^0-9.,-]/g, "") }))} placeholder="aflezing"
                    style={okS === false ? { borderColor: "#c08a7a", background: "#fdf6f4" } : undefined} />
                </label>
                <label className="block">
                  <span className="text-[11.5px] mute">Thermometer (°C)</span>
                  <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full" value={values[u.id]}
                    onChange={(e) => setValues((v) => ({ ...v, [u.id]: e.target.value.replace(/[^0-9.,-]/g, "") }))} placeholder="gemeten"
                    style={ok === false ? { borderColor: "#c08a7a", background: "#fdf6f4" } : undefined} />
                </label>
              </div>
            </div>
          );
        })}
      </div>
      {HACCP_UNITS.some((u) => inRange(u, num(values[u.id])) === false || inRange(u, num(screen[u.id])) === false) && (
        <div className="rounded-xl p-3.5 mb-4 text-sm" style={{ background: "#f6ecea", border: "1px solid #e0c8c0", color: "#8a4a3a" }}>
          Eén of meer waarden vallen buiten de grenzen. Noteer hieronder welke maatregel je hebt genomen (product verplaatst, monteur gebeld, opnieuw gemeten).
        </div>
      )}
      <div className="text-sm font-medium ink mb-1.5">Thermometer ijken</div>
      <div className="card p-3.5 mb-4">
        <div className="text-[12.5px] mute mb-2">Steek de thermometer in een glas met smeltend ijswater. Hij hoort 0 °C aan te geven; meer dan {CALIB_TOLERANCE} °C afwijking betekent afstellen of vervangen.</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="text" inputMode="decimal" className="input px-2.5 py-2 flex-1 min-w-[8rem]" value={calib} onChange={(e) => setCalib(e.target.value.replace(/[^0-9.,-]/g, ""))} placeholder="gemeten in ijswater (°C)"
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
      <Field label="Ruimte"><AppSelect className={inputCls} value={area} onChange={setArea} options={CLEANING_AREAS} /></Field>
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

// Metingen voor alle actieve fermentatiebatches, direct in te vullen per batch.
// Opent via de 13:00-banner of via de knop "Metingen" op de fermentatiepagina.
function BatchMeasureModal({ batches, onAdd, onFinish, onClose }) {
  const [vals, setVals] = useState({}); // per batch: {ph, brix, tempC, note}
  const [saved, setSaved] = useState({});
  const set = (id, veld, w) => setVals((v) => ({ ...v, [id]: { ...(v[id] || {}), [veld]: w } }));
  const today = localDate();
  const measuredToday = (b) => (b.log || []).some((e) => String(e.date).slice(0, 10) === today) || saved[b.id];
  const check = (b) => {
    const v = vals[b.id] || {};
    if (!v.ph && !v.brix && !v.tempC && !(v.note || "").trim()) { alert("Vul minstens één waarde in."); return null; }
    return { date: today, ph: v.ph || "", brix: v.brix || "", tempC: v.tempC || "", note: (v.note || "").trim() };
  };
  const save = (b) => {
    const m = check(b);
    if (!m) return;
    onAdd(b.id, m);
    setSaved((sv) => ({ ...sv, [b.id]: true }));
    // Was dit de laatste openstaande meting, dan direct terug naar het scherm erachter.
    if (batches.every((x) => x.id === b.id || measuredToday(x))) onClose();
  };
  const finish = (b) => {
    const m = check(b);
    if (!m) return;
    onFinish(b.id, m); // slaat de meting op, rondt de batch af en opent de voorraad-popup
  };
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,56,35,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-5 shadow-xl" style={{ background: T.paper, maxHeight: "80vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="serif ink text-xl leading-tight">Batchmetingen</div>
            <div className="text-xs mute mt-0.5">Meet de actieve batches en leg de waarden vast.</div>
          </div>
          <button onClick={onClose} className="ff mute hover:opacity-70"><X size={18} /></button>
        </div>
        <div className="space-y-3 mt-3">
          {batches.map((b) => {
            const klaar = measuredToday(b);
            const tgt = FERMENT_TARGETS[b.method] || FERMENT_TARGETS[b.type];
            return (
              <div key={b.id} className="card p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium ink truncate">{b.product}</div>
                    <div className="text-[12px] mute">{[b.method, tgt && tgt.pH ? "streef-pH " + tgt.pH : null].filter(Boolean).join(" · ")}</div>
                  </div>
                  {klaar && <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium" style={{ color: T.green }}><Check size={13} /> vandaag gemeten</span>}
                </div>
                {!klaar && (
                  <>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <label className="block"><span className="text-[11.5px] mute">pH</span>
                        <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full text-sm" value={(vals[b.id] || {}).ph || ""} onChange={(e) => set(b.id, "ph", e.target.value.replace(/[^0-9.,]/g, ""))} /></label>
                      <label className="block"><span className="text-[11.5px] mute">Brix</span>
                        <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full text-sm" value={(vals[b.id] || {}).brix || ""} onChange={(e) => set(b.id, "brix", e.target.value.replace(/[^0-9.,]/g, ""))} /></label>
                      <label className="block"><span className="text-[11.5px] mute">Temp (°C)</span>
                        <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full text-sm" value={(vals[b.id] || {}).tempC || ""} onChange={(e) => set(b.id, "tempC", e.target.value.replace(/[^0-9.,-]/g, ""))} /></label>
                    </div>
                    <input className="input px-2.5 py-2 w-full text-sm mt-2" value={(vals[b.id] || {}).note || ""} onChange={(e) => set(b.id, "note", e.target.value)} placeholder="Opmerking (optioneel)" />
                    <div className="flex flex-wrap justify-end gap-2 mt-2">
                      <button onClick={() => finish(b)} className="btno ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2" title="Meting opslaan, batch afronden en toevoegen aan de voorraad"><Check size={14} /> Opslaan + afronden</button>
                      <button onClick={() => save(b)} className="btnp ff inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold px-3 py-2"><Check size={14} /> Opslaan</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="ff w-full text-sm mute underline py-2 mt-3">Sluiten</button>
      </div>
    </div>
  );
}

// Dagelijkse controle om 16:45
function CleaningCheckModal({ tasks, logs, user, canEdit, forDate, onSign, onDayDone, onDayOff, onClose, onOpenSection, onUndo, onFillTemp, onFillRecord }) {
  const withStatus = tasks.map((t) => ({ t, st: taskStatus(t, logs) }));
  const open = forDate ? [] : withStatus.filter((x) => x.st.due);
  const doneToday = logs.filter((l) => l.taskId !== DAY_DONE_ID && l.doneDate === (forDate || localDate()));
  // Uitklapbaar: alle taken per ruimte, om ook buiten het interval af te tekenen.
  // Bij het invullen van een heropende dag staat de volledige lijst direct open.
  const [showAll, setShowAll] = useState(!!forDate);
  const areas = [...new Set(withStatus.map((x) => x.t.area))].sort((a, b) => a.localeCompare(b, "nl"));
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,56,35,0.45)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl p-5 shadow-xl" style={{ background: T.paper, maxHeight: "80vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="serif ink text-xl leading-tight">{forDate ? "Invullen voor " + forDate : "Schoonmaakcontrole"}</div>
            <div className="text-xs mute mt-0.5">{forDate ? "Heropende dag — eerdere aftekeningen blijven staan." : "Het is " + String(CHECK_HOUR).padStart(2, "0") + ":" + String(CHECK_MIN).padStart(2, "0") + " — tijd om af te tekenen."}</div>
          </div>
          <button onClick={onClose} className="ff mute hover:opacity-70"><X size={18} /></button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onDayDone} className="btnp ff flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold px-3 py-3"><Check size={16} /> {forDate ? "Dag opnieuw afronden" : "Dag afgerond"}</button>
          <button onClick={onDayOff} className="btno ff shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium px-3 py-3"><Calendar size={15} /> Vrije dag</button>
        </div>
        <div className="mt-3 text-sm" style={{ color: "#3b3d33" }}>
          {forDate ? <>Teken hieronder de gedane taken af en rond de dag daarna opnieuw af. Kies je "Vrije dag", dan worden alle aftekeningen van deze dag verwijderd.</> : <>Vandaag afgetekend: <span className="font-medium ink">{doneToday.length}</span> · nog open: <span className="font-medium ink">{open.length}</span></>}
        </div>
        {(() => {
          // Terugdraaiknop tegen per-ongeluk-klikken: pakt de meest recente
          // aftekening van deze dag (logs staan nieuwste-eerst in de lijst).
          const laatste = logs.find((l) => l.taskId !== DAY_DONE_ID && l.taskId !== DAY_OFF_ID && l.doneDate === (forDate || localDate()));
          if (!laatste || !canEdit || !onUndo) return null;
          const taak = tasks.find((t) => t.id === laatste.taskId);
          return (
            <div className="flex items-center gap-2 mt-2 text-[12.5px] mute">
              <span className="min-w-0 truncate">Laatst afgetekend: <span className="ink">{taak ? taak.name : laatste.taskId}</span> door {laatste.doneBy}</span>
              <button onClick={() => onUndo(laatste.id)} className="ff shrink-0 inline-flex items-center gap-1 font-semibold acc hover:opacity-70"><RotateCcw size={12} /> Ongedaan</button>
            </div>
          );
        })()}
        {open.length === 0
          ? <div className="mt-3 rounded-xl p-3.5 text-sm flex items-center gap-2" style={{ background: "#e8ebe0", color: T.green }}><Check size={16} /> Alles is afgetekend. Mooi werk.</div>
          : <div className="card overflow-hidden mt-3">
              {open.map((x, i) => (
                <div key={x.t.id} className={"flex items-center gap-2 px-3 py-2.5 " + (i > 0 ? "divi" : "")}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm ink truncate">{x.t.name}</div>
                    <div className="text-[12.5px] mute">{x.t.area}{x.st.overdue && <span className="ml-1 font-semibold" style={{ color: "#8a4a3a" }}>over tijd</span>}</div>
                  </div>
                  {canEdit && (x.t.id === TEMP_TASK_ID
                    ? <button onClick={onFillTemp} className="btnp ff shrink-0 inline-flex items-center gap-1 rounded-lg text-xs font-semibold px-2 py-1.5"><Thermometer size={13} /> Invullen</button>
                    : HACCP_TASK_KIND[x.t.id]
                      ? <button onClick={() => onFillRecord(HACCP_TASK_KIND[x.t.id])} className="btnp ff shrink-0 inline-flex items-center gap-1 rounded-lg text-xs font-semibold px-2 py-1.5"><Plus size={13} /> Invullen</button>
                      : <button onClick={() => onSign(x.t.id)} className="btnp ff shrink-0 inline-flex items-center gap-1 rounded-lg text-xs font-semibold px-2 py-1.5"><Check size={13} /> Aftekenen</button>)}
                </div>
              ))}
            </div>}
        <button onClick={() => setShowAll((v) => !v)} className="ff mt-3 inline-flex items-center gap-1.5 text-sm font-medium acc">
          {showAll ? <ChevronUp size={15} /> : <ChevronDown size={15} />} Alle schoonmaaktaken
          <span className="text-xs mute font-normal">— ook buiten het interval aftekenen</span>
        </button>
        {showAll && (
          <div className="mt-2 space-y-3">
            {areas.map((area) => (
              <div key={area}>
                <div className="text-[12px] font-semibold uppercase tracking-widest acc mb-1">{area}</div>
                <div className="card overflow-hidden">
                  {withStatus.filter((x) => x.t.area === area).map((x, i) => {
                    // Al afgetekend op deze dag? (bij een heropende dag: op die datum)
                    const dagKey = forDate || localDate();
                    const dagLog = logs.find((l) => l.taskId === x.t.id && String(l.doneDate).slice(0, 10) === dagKey);
                    const vandaag = !!dagLog;
                    return (
                      <div key={x.t.id} className={"flex items-center gap-2 px-3 py-2 " + (i > 0 ? "divi" : "")}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm ink truncate">{x.t.name}</div>
                          <div className="text-[12px] mute truncate">
                            {intervalLabel(x.t.intervalDays)}
                            {x.st.last ? <> · laatst {x.st.since === 0 ? "vandaag" : x.st.since === 1 ? "gisteren" : x.st.since + " dgn geleden"}</> : <> · nog nooit</>}
                          </div>
                        </div>
                        {canEdit && (vandaag
                          ? <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium" style={{ color: T.green }}><Check size={13} /> {dagLog.doneBy}</span>
                          : (x.t.id === TEMP_TASK_ID || HACCP_TASK_KIND[x.t.id])
                            ? <button onClick={() => (x.t.id === TEMP_TASK_ID ? onFillTemp() : onFillRecord(HACCP_TASK_KIND[x.t.id]))} className="ff shrink-0 rounded-lg px-1.5 py-1.5 acc hover:opacity-70" title="Invullen"><Thermometer size={14} /></button>
                            : <button onClick={() => onSign(x.t.id)} className="ff shrink-0 rounded-lg px-1.5 py-1.5 acc hover:opacity-70" title="Aftekenen — de app vraagt wie"><Check size={15} /></button>)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-4">
          <button onClick={onOpenSection} className="btno ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2">Naar schoonmaaklijst</button>
          <button onClick={onClose} className="ff text-sm mute underline">Sluiten</button>
        </div>
      </div>
    </div>
  );
}

function BackBar({ onBack, onEdit, onPrint, printText = "Print", extra = null, onDelete = null }) {
  return (
    <div className="flex items-start justify-between gap-2 pt-3 pb-2">
      <button onClick={onBack} className="ff shrink-0 inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2.5 hover:opacity-80" style={{ background: "#e8ebe0", color: T.green }}><ArrowLeft size={18} /> Terug</button>
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        {extra}
        {onPrint && <button onClick={onPrint} className="ff inline-flex items-center justify-center w-11 h-11 acc rounded-lg hover:opacity-70" style={{ border: "1px solid #cfe0c4" }} title={printText}><Printer size={24} /></button>}
        {onEdit && <button onClick={onEdit} className="ff inline-flex items-center justify-center w-11 h-11 acc rounded-lg hover:opacity-70" style={{ border: "1px solid #cfe0c4" }} title="Bewerken"><Pencil size={24} /></button>}
        {onDelete && <button onClick={onDelete} className="ff inline-flex items-center justify-center w-11 h-11 rounded-lg hover:opacity-70" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }} title="Verwijderen"><Trash2 size={24} /></button>}
      </div>
    </div>
  );
}
function Eyebrow({ children }) { return <h3 className="text-[12.5px] font-semibold uppercase tracking-widest acc mb-2">{children}</h3>; }

function DishDetail({ dish, recipeById, canEdit, onBack, onEdit, onOpenRecipe, onDelete, chefMode }) {
  if (!dish) return null;
  return (
    <div>
      <BackBar onBack={onBack} onEdit={canEdit ? onEdit : null} onPrint={() => printDish(dish, recipeById)} onDelete={canEdit ? () => onDelete(dish.id) : null} />
      <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
        <h1 className="serif ink text-3xl leading-tight">{dish.name}</h1>
        {chefMode && (() => {
          const kps = (dish.recipeIds || []).map((id) => { const r = recipeById(id); return r ? receptKost(r) : null; });
          const bekend = kps.filter((x) => x !== null);
          if (!bekend.length) return null;
          const som = bekend.reduce((a, b) => a + b, 0);
          return <div className="text-sm mt-1" style={{ color: "#44502f" }}>Kostprijs recepten samen: <span className="font-semibold">{eur(som)}</span>{bekend.length < kps.length && <span className="mute"> · {kps.length - bekend.length} recept(en) zonder prijs</span>} <span className="mute">(chef)</span></div>;
        })()}
        <span className="text-[12.5px] font-semibold uppercase tracking-widest acc">{dish.course}</span>
      </div>
      <div className="flex flex-wrap gap-2 mt-2.5">{dish.season && dish.season.map((s) => <SeasonPill key={s} s={s} />)}{dish.diet && dish.diet !== "Vegetarisch" && <MeatPill diet={dish.diet} />}<AllergenPills list={dishAllergens(dish, recipeById)} /></div>
      {dish.voorbeeld && (
        <div className="rounded-xl p-3 mt-2.5 text-[13px]" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
          <b>Voorbeeld t.b.v. calculaties.</b> Dit gerecht is automatisch aangemaakt zodat de items en producten een kostprijs hebben. Vervang het door het echte gerecht zodra de calculatie klopt.
        </div>
      )}
      {chefMode && (() => {
        const pp = gerechtPortieKost(dish, recipeById);
        const n = gerechtPorties(dish, recipeById);
        if (pp === null) return null;
        return <div className="text-sm mt-2" style={{ color: "#44502f" }}>Kostprijs per portie: <span className="font-semibold">{eur(pp)}</span> <span className="mute">({n} porties)</span></div>;
      })()}
      <p className="mute mt-2 leading-relaxed">{dish.description}</p>
      <SectionTitle>Onderdelen</SectionTitle>
      <div className="space-y-2">
        {dish.recipeIds.map((id) => { const r = recipeById(id); if (!r) return null; const alg = recipeAllergens(r); return (
          <button key={id} onClick={() => onOpenRecipe(id)} className="card cardh ff w-full text-left p-3.5 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#e8ebe0", color: T.green }}><Layers size={15} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-medium ink truncate">{r.name}</div>
              <div className="text-xs mute">{r.category}</div>
              {alg.length > 0 && <div className="mt-1"><AllergenPills list={alg} /></div>}
            </div>
            <ChevronRight size={16} style={{ color: "#c4c2b2" }} />
          </button>
        ); })}
      </div>
      {dish.plating && <><SectionTitle>Dressering</SectionTitle><p className="card p-4 mute leading-relaxed">{dish.plating}</p></>}
    </div>
  );
}

function RecipeDetail({ recipe, user, canEdit, usageCount, openCount, baseRecipe, variations, onBack, onEdit, onOpenRecipe, onStartBatch, onAddStock, onOpenTech, onDelete, chefMode }) {
  // Hoeveelheid als breuk (teller/noemer): ÷2, ÷10 en ×2 stapelen exact.
  const [frac, setFrac] = useState({ n: 1, d: 1 });
  const [inGram, setInGram] = useState(false); // lepels en stuks omgerekend tonen
  const [uitleg, setUitleg] = useState(null); // ingredient waarvan de prijs uitgelegd wordt
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const factor = frac.n / frac.d;
  const setReset = () => setFrac({ n: 1, d: 1 });
  // Vaste standen (één tik = één stand) + "op maat" rekenen naar opbrengst of
  // naar een beschikbare hoeveelheid van een ingrediënt.
  const setStand = (n, d) => setFrac({ n, d });
  const setFactorDecimal = (f) => {
    if (!isFinite(f) || f <= 0) return;
    const n0 = Math.round(f * 1000), d0 = 1000, g = gcd(n0, d0);
    setFrac({ n: n0 / g, d: d0 / g });
  };
  const [maatOpen, setMaatOpen] = useState(false);
  const fracLabel = frac.d === 1 ? "×" + frac.n : (Math.round(factor * 100) / 100).toString().replace(".", ",") + "×";
  const isStand = (n, d) => frac.n === n && frac.d === d;
  if (!recipe) return null;
  const critical = criticalValues(recipe);
  return (
    <div>
      <BackBar onBack={onBack} onEdit={canEdit ? onEdit : null} onPrint={() => printRecipe(recipe)}
        onDelete={canEdit ? () => onDelete(recipe.id) : null}
        extra={canEdit ? (
          <button onClick={onAddStock} className="ff inline-flex items-center justify-center w-11 h-11 acc rounded-lg hover:opacity-70" style={{ border: "1px solid #cfe0c4" }} title="In voorraad zetten"><ShelfIcon size={24} /></button>
        ) : null} />
      <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
        <h1 className="serif ink text-3xl leading-tight">{recipe.name}</h1>
        {recipe.voorbeeld && (
          <div className="rounded-xl p-3 mt-2 text-[13px]" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
            <b>Voorbeeld t.b.v. calculaties.</b> Dit recept is automatisch aangemaakt om de kostprijzen te laten rekenen. Hoeveelheden en werkwijze zijn een aanname — pas ze aan zodra de chef de echte calculatie maakt.
          </div>
        )}
        {chefMode && (() => {
          const kp = receptKost(recipe);
          if (kp === null) return null;
          const auto = eurNum(recipe.costPrice) === null;
          const porties = receptPorties(recipe);
          return <div className="text-sm mt-1" style={{ color: "#44502f" }}>
            {porties ? <>Kostprijs per portie: <span className="font-semibold">{eur(kp / porties)}</span> <span className="mute">({porties} porties · batch {eur(kp)})</span></>
              : <>Kostprijs batch: <span className="font-semibold">{eur(kp)}</span> <span className="mute">(porties niet ingevuld)</span></>}
            {" "}<span className="mute">({auto ? "uit de prijslijst" : "chef"})</span>
          </div>;
        })()}
        <Chip>{recipe.category}</Chip>
      </div>
      {(recipe.shelfDays || recipe.shelfStorage) && (
        <div className="text-[13px] mute mt-1">Houdbaarheid: {[recipe.shelfDays ? recipe.shelfDays + " dagen" : null, recipe.shelfStorage || null].filter(Boolean).join(" · ")}</div>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {recipe.fermentMethod && <Chip>{recipe.fermentMethod}</Chip>}
        {recipe.gear && <Chip>{recipe.gear}</Chip>}
        {recipe.garden && <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1" style={{ background: "#e4ecdc", color: "#3f5a34" }}><Sprout size={12} /> eigen tuin</span>}
        {recipe.season.filter((s) => s !== "Hele jaar").map((s) => <SeasonPill key={s} s={s} />)}
        {recipe.diet !== "Vegetarisch" && <MeatPill diet={recipe.diet} />}
        {(recipe.isBase || variations.length > 0) && <span className="inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-1" style={{ background: "#e8ebe0", color: T.green }}><GitBranch size={12} /> basisrecept</span>}
        <AllergenPills list={recipeAllergens(recipe)} />
      </div>

      {baseRecipe && <button onClick={() => onOpenRecipe(baseRecipe.id)} className="ff mt-3 inline-flex items-center gap-1.5 text-sm acc hover:opacity-70"><GitBranch size={14} /> Variatie op {recipe.baseName || baseRecipe.name} — bekijk de basis</button>}

      {variations.length > 0 && (
        <div className="mt-3">
          <div className="text-[12px] font-semibold uppercase tracking-widest acc mb-1.5 inline-flex items-center gap-1"><GitBranch size={12} /> Variaties ({variations.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {variations.map((v) => (
              <button key={v.id} onClick={() => onOpenRecipe(v.id)} className="ff pill rounded-full px-3 py-1.5 text-[13px] font-medium hover:opacity-80">{v.name}</button>
            ))}
          </div>
        </div>
      )}

      {critical.length > 0 && (
        <div className="mt-4 rounded-xl p-3.5 text-sm" style={{ background: "#f3ecdc", border: "1px solid #e4d6b8", color: "#6a5326" }}>
          <div className="font-semibold flex items-center gap-1.5 mb-1"><Info size={14} /> Let op de kritische waarden</div>
          <ul className="list-disc list-inside space-y-0.5">{critical.map((c, i) => (
            <li key={i}>{c.text}{c.tech && <> <button onClick={() => onOpenTech(c.tech)} className="ff underline font-medium hover:opacity-70" style={{ color: "#6a5326" }}>{c.techLabel}</button></>}</li>
          ))}</ul>
        </div>
      )}

      {canEdit && recipe.ferment && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button onClick={onStartBatch} className="ff btno inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2"><FlaskConical size={15} /> Registreer batch</button>
        </div>
      )}

      <div className="flex items-center gap-2 mt-6 mb-1 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-widest acc">Hoeveelheid</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[[1, 2, "×½"], [1, 1, "×1"], [2, 1, "×2"], [4, 1, "×4"]].map(([n, d, lbl]) => (
            <button key={lbl} onClick={() => setStand(n, d)} className={"ff rounded-md w-9 h-8 flex items-center justify-center text-xs font-bold " + (isStand(n, d) ? "pillon" : "pill")} title={"Hele recept " + lbl}>{lbl}</button>
          ))}
          <button onClick={() => setMaatOpen(true)} className={"ff rounded-md px-2.5 h-8 flex items-center text-xs font-bold " + ([[1,2],[1,1],[2,1],[4,1]].some(([n,d]) => isStand(n,d)) ? "pill" : "pillon")} title="Reken naar een opbrengst of een beschikbare hoeveelheid ingrediënt">Op maat{![[1,2],[1,1],[2,1],[4,1]].some(([n,d]) => isStand(n,d)) ? " · " + fracLabel : ""}</button>
          {factor !== 1 && <button onClick={setReset} className="ff mute text-xs underline">reset</button>}
        </div>
        {recipe.ingredients.some((x) => naarGram(x.item, x.amount, 1)) && (
          <button onClick={() => setInGram((g) => !g)} className={"ff rounded-md px-2.5 h-8 flex items-center text-xs font-bold " + (inGram ? "pillon" : "pill")} title="Lepels, stuks en centimeters omrekenen met de gewichtentabel uit Werkwijze">In gram</button>
        )}
        {maatOpen && <MaatModal recipe={recipe} onApply={setFactorDecimal} onClose={() => setMaatOpen(false)} />}
        {factor !== 1 && <span className="text-xs mute">Opbrengst: {scaleAmount(recipe.yield, factor)}</span>}
      </div>
      <div className="card overflow-hidden">
        {recipe.ingredients.map((ing, i) => { const alg = ingRegelAllergenen(ing); const sub = subRecept(ing); const kk = chefMode ? ingKost(ing) : { bedrag: null, auto: false, artikel: null }; const kp = kk.bedrag; return (
          <div key={i} className={"flex items-center justify-between gap-3 px-4 py-2.5 text-sm " + (i > 0 ? "divi" : "")}>
            <span className="min-w-0" style={{ color: "#3b3d33" }}>
              {sub ? (
                <button onClick={() => onOpenRecipe(sub.id)} className="ff text-left hover:opacity-70" style={{ color: "#3b3d33" }}>
                  {ing.item}
                  <span className="ml-1.5 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md align-[1px]" style={{ background: "#eef2e6", color: "#44502f" }}>recept</span>
                </button>
              ) : ing.item}
              {alg.length > 0 && <span className="block text-[11px] font-medium mt-0.5" style={{ color: "#8a5f2a" }}><AlertTriangle size={10} className="inline mr-1 align-[-1px]" />{alg.join(" · ")}</span>}
            </span>
            <span className="shrink-0 flex items-baseline gap-3">
              {(() => { const g = inGram ? naarGram(ing.item, ing.amount, factor) : null; return (
                <span className={"font-medium " + (g ? "acc" : factor !== 1 ? "acc" : "mute")} title={g ? "Genoteerd als " + ing.amount : ""}>{g || scaleAmount(ing.amount, factor)}</span>
              ); })()}
              {chefMode && (
                <button onClick={() => setUitleg(ing)} className="ff w-16 text-right text-[12.5px] font-medium hover:opacity-70" style={{ color: kp !== null ? "#44502f" : "#a5a394", opacity: kk.auto ? 0.85 : 1 }} title="Waar komt deze prijs vandaan?">{kp !== null ? eur(kp * factor) : "?"}</button>
              )}
            </span>
          </div>
        ); })}
        {uitleg && <PrijsUitleg ing={uitleg} onSluit={() => setUitleg(null)} />}
        {chefMode && (() => {
          const t = receptIngTotaal(recipe);
          if (!t.geprijsd) return null;
          return (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm divi" style={{ background: "#f4f2ea" }}>
              <span className="font-semibold ink">Totaal ingrediënten{t.geprijsd < t.totaal ? " (" + t.geprijsd + " van " + t.totaal + " geprijsd)" : ""}</span>
              <span className="shrink-0 font-bold" style={{ color: "#44502f" }}>{eur(t.som * factor)}</span>
            </div>
          );
        })()}
      </div>

      {recipe.fermentDefaults && (
        <div className="mt-4 tintbox rounded-xl p-4 text-sm" style={{ color: "#3f5238" }}>
          <div className="font-semibold flex items-center gap-1.5 mb-1"><FlaskConical size={14} /> Fermentatie-richtlijn</div>
          {[recipe.fermentDefaults.saltPct ? "Zout " + String(recipe.fermentDefaults.saltPct).replace(".", ",") + "%" : null,
             recipe.fermentDefaults.sugarPct ? "Suiker " + String(recipe.fermentDefaults.sugarPct).replace(".", ",") + "%" : null,
             recipe.fermentDefaults.tempC ? "±" + recipe.fermentDefaults.tempC + "°C" : null,
             recipe.fermentDefaults.days ? "±" + recipe.fermentDefaults.days + " dagen" : null,
             recipe.fermentDefaults.phTarget != null ? "streef-pH " + String(recipe.fermentDefaults.phTarget).replace(".", ",") : null].filter(Boolean).join(" · ")}.
          {recipe.fermentMethod && FERMENT_TARGETS[recipe.fermentMethod] && <> {FERMENT_TARGETS[recipe.fermentMethod].note}</>}
        </div>
      )}

      <SectionTitle>Bereiding</SectionTitle>
      <ol className="space-y-2.5">
        {recipe.steps.map((s, i) => (<li key={i} className="flex gap-3"><span className="w-6 h-6 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center mt-0.5" style={{ background: T.green, color: T.paper }}>{i + 1}</span><span className="leading-relaxed" style={{ color: "#3b3d33" }}>{s}</span></li>))}
      </ol>
    </div>
  );
}

// Bepaalt welke waarden bij dit recept expliciet bewaakt moeten worden.
function criticalValues(r) {
  const out = [];
  const cat = (r.category || "").toLowerCase();
  const name = (r.name || "").toLowerCase();
  if (r.ferment && r.fermentMethod === "Melkzuur") out.push({ text: "Zuurgraad: pH moet onder 3,5 zakken (voedselveilig). Meet met een pH-meter, niet op het oog.", tech: "fermenteren", techLabel: "Werkwijze › Fermenteren" });
  if (r.ferment && r.fermentMethod === "Azijnfermentatie") out.push({ text: "Zuurgraad: verzuurt tot pH ~2,5–3,0. Heeft zuurstof nodig — afdekken met doek, geen luchtdicht deksel.", tech: "fermenteren", techLabel: "Werkwijze › Fermenteren" });
  if (r.ferment && r.fermentMethod === "Suikerfermentatie") out.push({ text: "Suiker & druk: houd het suikergehalte en de bruis in de gaten; ontlucht flessen dagelijks.", tech: "fermenteren", techLabel: "Werkwijze › Fermenteren" });
  if (r.fermentDefaults && typeof r.fermentDefaults.saltPct === "number" && r.fermentDefaults.saltPct > 0) out.push({ text: "Zoutgehalte: weeg exact " + String(r.fermentDefaults.saltPct).replace(".", ",") + "% van het productgewicht af — bepaalt de veiligheid.", tech: "fermenteren", techLabel: "Werkwijze › Fermenteren" });
  if (!r.ferment && (cat.includes("pickle") || cat.includes("zuur")) ) out.push({ text: "Zuurgraad: gebruik voldoende azijn in de pekel voor houdbaarheid.", tech: null, techLabel: null });
  if (!r.ferment && (cat.includes("jam") || cat.includes("compote") || name.includes("jam") || name.includes("confituur"))) out.push({ text: "Suiker & zuur: suiker- en citroenzuurverhouding bepalen de gelering en houdbaarheid.", tech: "jam", techLabel: "Werkwijze › Jam" });
  if (cat.includes("sorbet") || cat.includes("ijs")) out.push({ text: "Suikergehalte: bepaalt de zachtheid/schepbaarheid.", tech: "ijs", techLabel: "Werkwijze › Roomijs & sorbet" });
  return out;
}

function SectionTitle({ children }) { return <h2 className="text-[12.5px] font-semibold uppercase tracking-widest acc mt-7 mb-2.5">{children}</h2>; }
function Chip({ children }) { return <span className="chip inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1">{children}</span>; }
function Empty({ label }) { return <div className="text-center text-sm mute card py-10 px-4" style={{ borderStyle: "dashed" }}>{label}</div>; }
function Field({ label, children }) { return <label className="block mb-4"><span className="block text-sm font-medium ink mb-1.5">{label}</span>{children}</label>; }

function FormBar({ title, onCancel, onSave, saveLabel = "Opslaan" }) {
  // Blijft bij het scrollen in beeld (net onder de header, h-14 = 56px), zodat
  // annuleren en opslaan op lange formulieren altijd binnen handbereik zijn.
  return (
    <div className="sticky z-10 -mx-4 px-4 flex items-center justify-between pt-4 pb-3" style={{ top: "56px", background: T.paper, borderBottom: "1px solid " + T.line, marginBottom: "0.75rem" }}>
      <button onClick={onCancel} className="ff inline-flex items-center gap-1 text-sm mute hover:opacity-70"><X size={16} /> Annuleren</button>
      <span className="serif ink text-lg">{title}</span>
      <button onClick={onSave} className="btnp ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2"><Check size={16} /> {saveLabel}</button>
    </div>
  );
}

function RecipeForm({ catSettings, onSaveCats, recipe, fermentDefault, allRecipes, onSaveAllergenFix, onSaveArtikel, onCancel, onSave, chefMode }) {
  const leveranciersLijst = [...new Set([...(PRIJSLIJST.arts || []).map((a) => a.leverancier).filter(Boolean), ...VASTE_LEVERANCIERS, "Eigen prijzen"])];
  const [name, setName] = useState(recipe?.name || "");
  const [category, setCategory] = useState(recipe?.category || (fermentDefault ? "Fermentatie" : ""));
  const [costPrice, setCostPrice] = useState(recipe?.costPrice != null ? String(recipe.costPrice) : "");
  // Categorieën zijn beheerbaar en gedeeld met het hele team (app_settings in
  // Supabase); recepten zelf bewaren gewoon hun categorietekst.
  const eigenCats = (catSettings && catSettings.eigen) || [];
  const wegCats = (catSettings && catSettings.verborgen) || [];
  const alleCats = [...RECIPE_CATEGORIES.filter((c) => !wegCats.includes(c)), ...eigenCats.filter((c) => !RECIPE_CATEGORIES.includes(c))];
  const [catBeheer, setCatBeheer] = useState(false);
  const [nieuweCat, setNieuweCat] = useState("");
  const voegCatToe = () => {
    const n = nieuweCat.trim();
    if (!n) return;
    if (!alleCats.includes(n)) {
      onSaveCats({ eigen: [...eigenCats.filter((x) => x !== n), n], verborgen: wegCats.filter((x) => x !== n) });
    }
    setCategory(n); setNieuweCat("");
  };
  const verwijderCat = (c) => {
    if (RECIPE_CATEGORIES.includes(c)) onSaveCats({ eigen: eigenCats, verborgen: [...wegCats, c] });
    else onSaveCats({ eigen: eigenCats.filter((x) => x !== c), verborgen: wegCats });
    if (category === c) setCategory("");
  };
  // Opbrengst in rijen: aantal / eenheid / verpakking (bv. 20 St. / 200 gr / kleine pot)
  const [yields, setYields] = useState(() => {
    if (recipe && Array.isArray(recipe.yields) && recipe.yields.length) return recipe.yields.map((y) => ({ ...y }));
    if (recipe && (recipe.yieldAmount || recipe.yieldUnit)) return [{ count: recipe.yieldAmount ? String(recipe.yieldAmount) : "", size: recipe.yieldUnit || "", pack: "" }];
    return [{ count: "", size: "", pack: "" }];
  });
  const setYieldRow = (i, veld, w) => setYields((ys) => ys.map((y, j) => (j === i ? { ...y, [veld]: w } : y)));
  const [portions, setPortions] = useState(recipe && recipe.portions != null ? String(recipe.portions) : "");
  const [portionSize, setPortionSize] = useState((recipe && recipe.portionSize) || "");
  const [portieVraag, setPortieVraag] = useState(false);
  const [recipeType, setRecipeType] = useState(recipe && recipe.baseId ? "variatie" : "basis");
  const [basePick, setBasePick] = useState(recipe && recipe.baseId ? { id: recipe.baseId, name: recipe.baseName || "" } : null);
  const [baseQ, setBaseQ] = useState("");
  // Variatie starten = het basisrecept overnemen: ingrediënten mét hoeveelheden,
  // stappen, opbrengst, categorie enz. — daarna handmatig aanpassen/aanvullen.
  // Alleen bij een níeuw recept met nog leeg formulier, zodat we nooit werk wissen.
  const adoptBase = (b) => {
    if (recipe) return; // bestaand recept bewerken: niets overschrijven
    const leegI = ingredients.every((x) => !String(x.item || "").trim() && !String(x.amount || "").trim());
    const leegS = steps.every((x) => !String(x || "").trim());
    if (!leegI && !leegS) return;
    if (leegI && (b.ingredients || []).length) setIngredients(b.ingredients.map((x) => ({ ...x })));
    if (leegS && (b.steps || []).length) setSteps([...b.steps]);
    if (!category && b.category) setCategory(b.category);
    if (b.yieldAmount || b.yieldUnit) setYields([{ count: b.yieldAmount ? String(b.yieldAmount) : "", size: b.yieldUnit || "", pack: "" }]);
    else if (Array.isArray(b.yields) && b.yields.length) setYields(b.yields.map((y) => ({ ...y })));
    if (b.season && b.season.length) setSeasons(b.season.filter((x) => x !== "Hele jaar"));
    if (b.diet) setDiet(b.diet);
    if (b.shelfDays) { setShelfDays(String(b.shelfDays)); }
    if (b.shelfStorage) { setShelfStorage(b.shelfStorage); setStorageOpt(detectOpt(b.shelfStorage)); }
    if (b.ferment) {
      setFerment(true);
      if (b.fermentMethod) setFermentMethod(b.fermentMethod);
      const fdb = b.fermentDefaults || {};
      if (fdb.saltPct) setFSalt(String(fdb.saltPct));
      if (fdb.tempC) setFTemp(String(fdb.tempC));
      if (fdb.days) setFDays(String(fdb.days));
      if (fdb.phTarget != null) setFPh(String(fdb.phTarget));
      if (fdb.sugarPct) setFSugar(String(fdb.sugarPct));
    }
  };
  // Alleen basisrecepten (geen variaties) kunnen nieuwe variaties krijgen.
  const baseMatches = baseQ.trim() ? (allRecipes || []).filter((r) => (!recipe || r.id !== recipe.id) && !r.baseId && softMatchAny([r.name, r.category], baseQ)).slice(0, 8) : [];
  const [ingredients, setIngredients] = useState(recipe?.ingredients?.length ? recipe.ingredients : [{ item: "", amount: "" }]);
  const [steps, setSteps] = useState(recipe?.steps?.length ? recipe.steps : [""]);
  const [seasons, setSeasons] = useState((recipe?.season || []).filter((s) => s !== "Hele jaar"));
  const [diet, setDiet] = useState(recipe?.diet || "Vegetarisch");
  const [ferment, setFerment] = useState(!!recipe?.ferment || !!fermentDefault);
  const [fermentMethod, setFermentMethod] = useState(recipe?.fermentMethod || "Melkzuur");
  const fd = recipe?.fermentDefaults;
  const [fSalt, setFSalt] = useState(fd && fd.saltPct != null && fd.saltPct !== 0 ? String(fd.saltPct) : "");
  const [fTemp, setFTemp] = useState(fd && fd.tempC != null && fd.tempC !== 0 ? String(fd.tempC) : "");
  const [fDays, setFDays] = useState(fd && fd.days != null && fd.days !== 0 ? String(fd.days) : "");
  const [fPh, setFPh] = useState(fd && fd.phTarget != null ? String(fd.phTarget) : "");
  const [fSugar, setFSugar] = useState(fd && fd.sugarPct != null && fd.sugarPct !== 0 ? String(fd.sugarPct) : "");
  const [shelfDays, setShelfDays] = useState(recipe && recipe.shelfDays ? String(recipe.shelfDays) : "");
  const [shelfStorage, setShelfStorage] = useState(recipe && recipe.shelfStorage ? recipe.shelfStorage : "gekoeld");
  const detectOpt = (t) => { const x = (t || "").toLowerCase(); if (!x) return "gekoeld"; if (/ongekoeld/.test(x)) return "ongekoeld"; if (/droog/.test(x)) return "droog"; if (/vrie|bevroren/.test(x)) return "bevroren"; if (/koel/.test(x)) return "gekoeld"; return "anders"; };
  const [storageOpt, setStorageOpt] = useState(detectOpt(recipe && recipe.shelfStorage));
  const [translating, setTranslating] = useState(false);
  const [err, setErr] = useState(null);
  const setIng = (i, k, v) => setIngredients((a) => a.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  // Enter in het hoeveelheid-vakje: nieuwe ingrediëntrij direct eronder, met de
  // cursor alvast in het naamveld. Voor stappen idem (Shift+Enter = nieuwe regel).
  // Backspace in een lege rij (behalve de eerste) verwijdert de rij en zet de
  // cursor in het vorige hoeveelheid-vak; bij stappen in de vorige stap.
  const backIng = (i) => {
    setIngredients((a) => a.filter((_, x) => x !== i));
    setTimeout(() => { const el = document.querySelector('[data-rf-amt="' + (i - 1) + '"]'); if (el) el.focus(); }, 0);
  };
  const backStep = (i) => {
    setSteps((a) => a.filter((_, x) => x !== i));
    setTimeout(() => { const el = document.querySelector('[data-rf-step="' + (i - 1) + '"]'); if (el) { el.focus(); const L = el.value.length; try { el.setSelectionRange(L, L); } catch (e) {} } }, 0);
  };
  const addIngAt = (i) => {
    setAlgOpen(null);
    setIngredients((a) => [...a.slice(0, i + 1), { item: "", amount: "" }, ...a.slice(i + 1)]);
    setTimeout(() => { const el = document.querySelector('[data-rf-item="' + (i + 1) + '"]'); if (el) el.focus(); }, 0);
  };
  const addStepAt = (i) => {
    setSteps((a) => [...a.slice(0, i + 1), "", ...a.slice(i + 1)]);
    setTimeout(() => { const el = document.querySelector('[data-rf-step="' + (i + 1) + '"]'); if (el) el.focus(); }, 0);
  };
  // Handmatige allergenen per ingrediënt: open paneel + aan/uit per allergeen.
  const [algOpen, setAlgOpen] = useState(null);
  const [kiesRij, setKiesRij] = useState(null); // ingredientrij waarvoor een artikel gekozen wordt
  const [receptRij, setReceptRij] = useState(null); // ingredientrij waarvoor een recept gekozen wordt
  const [ingSug, setIngSug] = useState(null); // rij met open zoeksuggesties
  const [uitleg, setUitleg] = useState(null); // ingredient waarvan de prijs uitgelegd wordt
  const [gramVraag, setGramVraag] = useState(false); // omrekenen naar gram bevestigen
  const toggleAlg = (i, label) => setIngredients((a) => a.map((x, idx) => {
    if (idx !== i) return x;
    const eff = ingredientAllergens(x);
    const next = eff.includes(label) ? eff.filter((l) => l !== label) : ALLERGEN_LABELS.filter((l) => eff.includes(l) || l === label);
    return { ...x, allergens: next };
  }));
  const resetAlg = (i) => setIngredients((a) => a.map((x, idx) => { if (idx !== i) return x; const { allergens, ...rest } = x; return rest; }));
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
      const prompt = "Je bent een professionele Nederlandse keukenvertaler. Vertaal de tekstvelden naar het Nederlands, laat al-Nederlandse velden ongewijzigd, en houd hoeveelheden/eenheden exact gelijk. Geef UITSLUITEND geldige JSON terug, zonder markdown, in deze vorm:\n{\"name\":\"...\",\"category\":\"...\",\"yield\":\"...\",\"ingredients\":[{\"item\":\"...\",\"amount\":\"...\"}],\"steps\":[\"...\"]}\n\nRecept:\n" + JSON.stringify({ name, category, yield: yields.map((y) => [y.count, y.size, y.pack].filter(Boolean).join(" ")).join(" + "), ingredients, steps });
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }) });
      const data = await res.json();
      const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      const p = JSON.parse(text.replace(/```json/gi, "").replace(/```/g, "").trim());
      if (p.name) setName(p.name); if (p.category) setCategory(p.category);
      if (p.yield) setYields((ys) => [{ ...(ys[0] || { count: "", size: "", pack: "" }), size: p.yield }, ...ys.slice(1)]);
      if (Array.isArray(p.ingredients) && p.ingredients.length) setIngredients(p.ingredients);
      if (Array.isArray(p.steps) && p.steps.length) setSteps(p.steps);
    } catch (e) { setErr("Vertalen lukte niet. Probeer opnieuw."); } finally { setTranslating(false); }
  }
  const submit = () => { if (!name.trim()) { alert("Geef het recept een naam."); return; } if (!(Number(shelfDays) > 0)) { alert("Vul de houdbaarheid in (dagen)."); return; } if (recipeType === "variatie" && !basePick) { alert("Kies eerst het basisrecept waar dit een variatie op is."); return; } onSave({
    name: name.trim(), category: normCategory(category.trim()) || "Zonder categorie",
    ingredients: ingredients.filter((x) => x.item.trim()), steps: steps.filter((x) => x.trim()),
    season: seasons.length ? SEASONS.filter((s) => seasons.includes(s)) : ["Hele jaar"],
    diet,
    ferment,
    fermentMethod: ferment ? fermentMethod : null,
    fermentDefaults: ferment ? (() => { const nz = (x) => { const v = Number(String(x).replace(",", ".")); return x !== "" && !isNaN(v) && v !== 0 ? v : null; }; return { saltPct: nz(fSalt), tempC: nz(fTemp), days: nz(fDays), phTarget: nz(fPh), sugarPct: nz(fSugar) }; })() : null,
    shelfDays: shelfDays !== "" && !isNaN(Number(shelfDays)) && Number(shelfDays) > 0 ? Number(shelfDays) : null,
    shelfStorage: (storageOpt !== "anders" ? storageOpt : shelfStorage.trim()),
    costPrice: costPrice.trim() ? costPrice.trim().replace(",", ".") : null,
    ...(() => {
      const rows = yields.map((y) => ({ count: (y.count || "").trim(), size: (y.size || "").trim(), pack: (y.pack || "").trim() })).filter((y) => y.count || y.size || y.pack);
      const first = rows[0];
      const num = first ? Number(String(first.count).replace(",", ".")) : NaN;
      const composed = rows.map((y) => (y.count ? y.count + "× " : "") + [y.size, y.pack].filter(Boolean).join(" ")).join(" + ");
      return {
        yields: rows,
        portions: eurNum(portions),
        portionSize: portionSize.trim() || null,
        yieldAmount: first && !isNaN(num) && num > 0 ? num : null,
        yieldUnit: first ? [first.size, first.pack].filter(Boolean).join(" ") : "",
        yield: composed || (recipe ? recipe.yield : "") || "—",
      };
    })(),
    baseId: recipeType === "variatie" && basePick ? basePick.id : null,
    baseName: recipeType === "variatie" && basePick ? basePick.name : null,
  }); };
  return (
    <div>
      <FormBar title={recipe ? "Recept bewerken" : "Nieuw recept"} onCancel={onCancel} onSave={submit} />
      {err && <p className="text-xs mb-3" style={{ color: "#a23b2c" }}>{err}</p>}
      <Field label="Naam"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Gefermenteerde rode biet" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categorie"><AppSelect className={inputCls} value={alleCats.includes(category) ? category : (category ? "__custom" : "")} onChange={(v) => { if (v === "__beheer") setCatBeheer(true); else if (v === "__custom") setCategory(category && !alleCats.includes(category) ? category : "Zonder categorie"); else setCategory(v); }} placeholder="Kies een categorie…" options={[...alleCats, { value: "__custom", label: "Anders…" }, { value: "__beheer", label: "✎ Categorieën beheren…" }]} /></Field>
        <Field label="Soort recept"><AppSelect className={inputCls} value={recipeType} onChange={(v) => { setRecipeType(v); if (v === "basis") setBasePick(null); }} options={[{ value: "basis", label: "Basisrecept" }, { value: "variatie", label: "Variatie op een ander recept" }]} /></Field>
        {recipeType === "variatie" && (
          <div className="col-span-2 mb-3 -mt-1">
            {basePick
              ? <div className="card px-3.5 py-2.5 flex items-center gap-2 text-sm"><GitBranch size={14} className="acc shrink-0" /><span className="flex-1 min-w-0 truncate ink">Variatie op <span className="font-medium">{basePick.name}</span></span><button onClick={() => setBasePick(null)} className="ff shrink-0 text-xs underline mute">wijzigen</button></div>
              : <>
                  <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" /><input value={baseQ} onChange={(e) => setBaseQ(e.target.value)} placeholder="Waar is dit een variatie op? Zoek het basisrecept" className={inputCls + " pl-9"} /></div>
                  {baseMatches.length > 0 && (
                    <div className="card overflow-hidden -mt-1">
                      {baseMatches.map((r, i) => (
                        <button key={r.id} onClick={() => { setBasePick({ id: r.id, name: r.name }); setBaseQ(""); adoptBase(r); }} className={"ff w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left " + (i > 0 ? "divi" : "")}>
                          <ChefHat size={14} className="acc shrink-0" /><span className="flex-1 min-w-0 text-sm ink truncate">{r.name}</span><span className="text-xs mute shrink-0">{r.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>}
          </div>
        )}
      </div>
      <div className="mb-1 text-sm font-medium ink">Opbrengst</div>
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-[11.5px] mute mb-0.5">
        <span>Aantal</span><span>Hoeveelheid</span><span>Verpakkingswijze</span>
        <span>Porties <button type="button" onClick={() => setPortieVraag(true)} className="ff underline acc hover:opacity-70">· {portieStandaardTekst({ name, category, portionSize })} p.p.</button></span>
        <span />
      </div>
      <div className="space-y-2 mb-2">
        {yields.map((y, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
            <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full text-sm" value={y.count} onChange={(e) => setYieldRow(i, "count", e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="20 St." />
            <input className="input px-2.5 py-2 w-full text-sm" value={y.size} onChange={(e) => setYieldRow(i, "size", e.target.value)} placeholder="500 gr / 1 kg / 250 ml" />
            <input className="input px-2.5 py-2 w-full text-sm" value={y.pack} onChange={(e) => setYieldRow(i, "pack", e.target.value)} placeholder="kleine pot" />
            {i === 0
              ? <input type="text" inputMode="decimal" className="input px-2.5 py-2 w-full text-sm" value={portions} onChange={(e) => setPortions(e.target.value.replace(/[^0-9.,]/g, ""))}
                  placeholder={(() => { const n = receptPorties({ name, category, portionSize, yields }); return n ? String(n) : "porties"; })()} />
              : <span />}
            {yields.length > 1 ? <button onClick={() => setYields((ys) => ys.filter((_, j) => j !== i))} className="mute hover:opacity-60 px-1"><Trash2 size={15} /></button> : <span className="w-6" />}
          </div>
        ))}
      </div>
      <button onClick={() => setYields((ys) => [...ys, { count: "", size: "", pack: "" }])} className="btno ff w-full mb-3 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium px-3 py-2 self-start"><Plus size={15} /> Opbrengst-rij toevoegen</button>
      <p className="text-[11.5px] mute mb-3">Porties: voor hoeveel personen is deze batch? Leeg laten deelt de opbrengst door de portiegrootte hierboven.</p>
      {portieVraag && (
        <PromptModal titel="Portiegrootte" label="Hoeveel per persoon" waarde={portionSize || portieStandaardTekst({ name, category })} placeholder="bv. 150 g"
          hint="Alleen voor dit recept. Hiermee schat de app het aantal porties uit de opbrengst."
          okLabel="Opslaan" onCancel={() => setPortieVraag(false)}
          onOk={(v) => { setPortionSize(v); setPortieVraag(false); }} />
      )}
      {category && !alleCats.includes(category) && <Field label="Eigen categorie"><input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Typ een categorie" /></Field>}
      {catBeheer && (
        <div className="card p-3.5 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-bold ink">Categorieën beheren</span>
            <button onClick={() => setCatBeheer(false)} className="ff mute hover:opacity-60 p-1"><X size={16} /></button>
          </div>
          <div className="flex gap-2 mb-2.5">
            <input className={inputCls + " flex-1"} value={nieuweCat} onChange={(e) => setNieuweCat(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); voegCatToe(); } }} placeholder="Nieuwe categorie" />
            <button onClick={voegCatToe} className="btnp ff shrink-0 rounded-lg text-sm font-semibold px-3">Toevoegen</button>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1">
            {alleCats.map((c) => (
              <div key={c} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5" style={{ background: T.bg }}>
                <span className="text-sm ink min-w-0 truncate">{c}</span>
                <button onClick={() => verwijderCat(c)} className="ff shrink-0 mute hover:opacity-60" title="Uit de keuzelijst halen"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] mute mt-2">Verwijderen haalt de categorie alleen uit deze keuzelijst — bestaande recepten houden hun categorie.</p>
        </div>
      )}
      <div className="text-sm font-medium ink mb-1.5">Seizoen <span className="mute font-normal">(niets gekozen = hele jaar)</span></div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SEASONS.map((s) => (
          <button key={s} type="button" onClick={() => toggleSeason(s)} className={"ff rounded-full px-3 py-1.5 text-xs font-medium " + (seasons.includes(s) ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Houdbaar (dagen)"><input type="text" inputMode="numeric" className={inputCls} value={shelfDays} onChange={(e) => setShelfDays(e.target.value.replace(/[^0-9]/g, ""))} placeholder="bv. 6" /></Field>
        <Field label="Type opslag">
          <AppSelect className={inputCls} value={storageOpt} onChange={(v) => { setStorageOpt(v); if (v !== "anders") setShelfStorage(v); else setShelfStorage(""); if (v === "bevroren") setShelfDays("365"); else if (shelfDays === "365") setShelfDays(""); }} options={["ongekoeld", "gekoeld", "bevroren", "droog", "anders"]} />
          {storageOpt === "anders" && <input className={inputCls + " mt-2"} value={shelfStorage} onChange={(e) => setShelfStorage(e.target.value)} placeholder="Omschrijf de opslag" />}
        </Field>
      </div>
      <div className="tintbox rounded-xl p-4 mb-4">
        <button type="button" onClick={() => setFerment((f) => !f)} className="ff w-full flex items-center gap-3 text-left">
          <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={ferment ? { background: T.green, color: T.paper } : { border: "1px solid #cfccbe", background: "#fff" }}>{ferment && <Check size={13} />}</span>
          <span className="text-sm font-medium ink inline-flex items-center gap-1.5"><FlaskConical size={15} className="acc" /> Dit is een fermentatierecept</span>
        </button>
        {ferment && (
          <div className="mt-3">
            <Field label="Fermentatiemethode"><AppSelect className={inputCls} value={fermentMethod} onChange={setFermentMethod} options={FERMENT_METHODS} /></Field>
            <div className="text-sm font-medium ink mb-1.5">Batchrichtlijn <span className="mute font-normal">(voorgevuld bij een nieuwe batch)</span></div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Zout (%)"><input type="text" inputMode="decimal" className={inputCls} value={fSalt} onChange={(e) => setFSalt(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
              <Field label="Temp (°C)"><input type="text" inputMode="decimal" className={inputCls} value={fTemp} onChange={(e) => setFTemp(e.target.value.replace(/[^0-9.,-]/g, ""))} /></Field>
              <Field label="Dagen"><input type="text" inputMode="numeric" className={inputCls} value={fDays} onChange={(e) => setFDays(e.target.value.replace(/[^0-9]/g, ""))} /></Field>
              <Field label="Gewenste pH"><input type="text" inputMode="decimal" className={inputCls} value={fPh} onChange={(e) => setFPh(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="bv. 3,5" /></Field>
              <Field label="Suikergehalte (%)"><input type="text" inputMode="decimal" className={inputCls} value={fSugar} onChange={(e) => setFSugar(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="optioneel" /></Field>
            </div>
            <p className="text-xs mute -mt-2">Verschijnt met de methode als filter op de fermentatiepagina, en is daar direct als batch te starten.</p>
          </div>
        )}
      </div>
      {chefMode && (() => {
        const t = receptIngTotaal({ ingredients });
        return (
          <Field label="Kostprijs per batch (€) · chef">
            <input type="text" inputMode="decimal" className={inputCls} value={costPrice} onChange={(e) => setCostPrice(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder={t.geprijsd ? t.som.toFixed(2).replace(".", ",") : "bv. 12,50"} />
            {t.geprijsd > 0 && <p className="text-[11.5px] mute mt-1">Leeg laten rekent met de ingrediënten samen: {eur(t.som)}.</p>}
          </Field>
        );
      })()}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium ink">Ingrediënten</span>
        {(() => {
          const omzetbaar = ingredients.filter((x) => naarGram(x.item, x.amount, 1));
          if (!omzetbaar.length) return null;
          return <button type="button" onClick={() => setGramVraag(true)} className="ff inline-flex items-center gap-1 text-[12.5px] font-medium acc hover:opacity-70">Naar gram · {omzetbaar.length}</button>;
        })()}
      </div>
      {gramVraag && (() => {
        const omzetbaar = ingredients.filter((x) => naarGram(x.item, x.amount, 1));
        const voorbeeld = omzetbaar.slice(0, 3).map((x) => x.amount + " → " + naarGram(x.item, x.amount, 1)).join(", ");
        return (
          <BevestigModal titel="Hoeveelheden naar gram" knop="Omzetten"
            tekst={omzetbaar.length + " regel" + (omzetbaar.length === 1 ? "" : "s") + " wordt omgerekend met de gewichtentabel uit Werkwijze — " + voorbeeld + (omzetbaar.length > 3 ? ", …" : "") + ". De oorspronkelijke notatie verdwijnt zodra je dit recept opslaat."}
            onCancel={() => setGramVraag(false)}
            onOk={() => { setIngredients((a) => a.map((x) => { const g = naarGram(x.item, x.amount, 1); return g ? { ...x, amount: g } : x; })); setGramVraag(false); }} />
        );
      })()}
      <div className="space-y-2 mb-2">{ingredients.map((ing, i) => { const alg = ingRegelAllergenen(ing); const manual = hasAllergenOverride(ing); const sub = subRecept(ing); return (
        <div key={i}>
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <input data-rf-item={i} className={inputCls + " w-full"} value={ing.item}
                onChange={(e) => { setIng(i, "item", e.target.value); setIngSug(i); }}
                onFocus={() => setIngSug(i)}
                onBlur={() => setTimeout(() => setIngSug((r) => (r === i ? null : r)), 140)}
                onKeyDown={(e) => {
                  if (e.key === "Tab" || e.key === "Escape") setIngSug(null);
                  else if (e.key === "Backspace" && i > 0 && !String(ing.item || "").trim() && !String(ing.amount || "").trim()) { e.preventDefault(); backIng(i); }
                }} placeholder="Ingrediënt of recept" />
              {ingSug === i && String(ing.item || "").trim().length >= 2 && (() => {
                const t = String(ing.item).trim();
                const arts = (PRIJSLIJST.arts || []).filter((a) => strictMatchAny([a.omschrijving], t)).slice(0, 6);
                const recs = (allRecipes || []).filter((r) => r.id !== (recipe && recipe.id) && softMatchAny([r.name], t)).slice(0, 4);
                if (!arts.length && !recs.length) return null;
                return (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl p-1 shadow-xl" style={{ background: T.paper, border: "1px solid " + T.line, maxHeight: "15rem", overflowY: "auto" }}>
                    {arts.length > 0 && <div className="text-[10.5px] font-semibold uppercase tracking-widest acc px-2 pt-1">Inkoop</div>}
                    {arts.map((a) => { const pb = artikelPerBasis(a); return (
                      <button key={a.code} type="button" onMouseDown={(ev) => { ev.preventDefault(); setIngredients((xs) => xs.map((x, j) => (j === i ? { ...x, item: a.omschrijving, artikelCode: a.code, recipeRef: null } : x))); setIngSug(null); }}
                        className="ff w-full text-left rounded-xl px-3 py-2 text-sm ink hover:opacity-70">
                        {a.omschrijving} <span className="mute">· {[a.leverancier, pb ? eur(pb.prijs) + " p/" + pb.b : null].filter(Boolean).join(" · ")}</span>
                      </button>
                    ); })}
                    {recs.length > 0 && <div className="text-[10.5px] font-semibold uppercase tracking-widest acc px-2 pt-1">Recepten</div>}
                    {recs.map((r) => { const pp = receptPortieKost(r); return (
                      <button key={r.id} type="button" onMouseDown={(ev) => { ev.preventDefault(); setIngredients((xs) => xs.map((x, j) => (j === i ? { ...x, item: r.name, recipeRef: r.id, artikelCode: null } : x))); setIngSug(null); }}
                        className="ff w-full text-left rounded-xl px-3 py-2 text-sm ink hover:opacity-70">
                        {r.name} <span className="mute">· recept{pp !== null ? " · " + eur(pp) + " per portie" : ""}</span>
                      </button>
                    ); })}
                  </div>
                );
              })()}
            </div>
            <input data-rf-amt={i} className={inputCls} style={{ width: chefMode ? "5.5rem" : "7rem", flex: chefMode ? "0 0 5.5rem" : "0 0 7rem" }} value={ing.amount} onChange={(e) => setIng(i, "amount", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIngAt(i); } else if (e.key === "Backspace" && i > 0 && !String(ing.item || "").trim() && !String(ing.amount || "").trim()) { e.preventDefault(); backIng(i); } }} placeholder="Hoeveelheid" />
            {chefMode && (() => {
              const kk = ingKost({ ...ing, cost: "" });
              const art = kk.artikel;
              const pb = artikelPerBasis(art);
              const titel = sub ? "Uit recept: " + sub.name
                : art ? (ing.artikelCode ? "Vast gekoppeld: " : "Gekozen: ") + art.omschrijving + (pb ? " · " + eur(pb.prijs) + " p/" + pb.b : "") + (kk.bedrag === null ? " · eenheid niet om te rekenen" : "")
                : "Geen artikel gevonden — tik op het euroteken";
              return (
                <div className="relative shrink-0" style={{ width: "6rem" }}>
                  <button type="button" onClick={() => setUitleg(i)} title={titel}
                    className="ff absolute left-1 top-1/2 -translate-y-1/2 text-xl font-bold px-1.5 py-0.5 hover:opacity-60"
                    style={{ color: art || sub ? "#44502f" : "#a5a394" }}>€</button>
                  <input type="text" inputMode="decimal" className={inputCls + " w-full pl-8"} value={ing.cost != null ? ing.cost : ""}
                    onChange={(e) => setIng(i, "cost", e.target.value.replace(/[^0-9.,]/g, ""))}
                    placeholder={kk.bedrag !== null ? kk.bedrag.toFixed(2).replace(".", ",") : ""} title={titel} />
                </div>
              );
            })()}

            <button type="button" onClick={() => setAlgOpen((o) => (o === i ? null : i))} className="hover:opacity-60 px-1"
              title={alg.length ? "Allergeen: " + alg.join(", ") + " — tik om aan te passen" : "Geen allergeen — tik om aan te passen"}
              style={{ color: alg.length ? "#d32f2f" : "#a5a394" }}><AlertTriangle size={alg.length ? 32 : 16} /></button>
            <button onClick={() => { setAlgOpen(null); setIngredients((a) => a.filter((_, idx) => idx !== i)); }} className="mute hover:opacity-60 px-1"><Trash2 size={16} /></button>
          </div>
          {sub && (
            <div className="flex items-center gap-2 mt-0.5 ml-1">
              <button type="button" onClick={() => setReceptRij(i)} className="ff text-[11px] font-medium hover:opacity-70" style={{ color: "#44502f" }}>
                Recept: {sub.name}{receptPorties(sub) ? " · " + receptPorties(sub) + " porties" : " · porties niet ingevuld"}
              </button>
              <button type="button" onClick={() => setIng(i, "recipeRef", null)} className="ff text-[11px] mute hover:opacity-70 underline">losmaken</button>
            </div>
          )}
          {algOpen === i && (() => { const gfix = globalAllergenFixFor(ing.item); return (
            <div className="mt-1.5 rounded-xl p-3" style={{ background: "#f7f2e6", border: "1px solid #e4d6b8" }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11.5px] font-semibold uppercase tracking-widest" style={{ color: "#8a5f2a" }}>Allergenen — {ing.item || "dit ingrediënt"}</span>
                <span className="text-[11px] mute">{manual ? "handmatig · dit recept" : gfix ? "handmatig · hele app" : "automatisch herkend"}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGEN_LABELS.map((l) => (
                  <button key={l} type="button" onClick={() => toggleAlg(i, l)} className={"ff rounded-full px-2.5 py-1 text-xs font-medium " + (alg.includes(l) ? "pillon" : "pill")}>{l}</button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5">
                <button type="button" disabled={!ing.item.trim()} onClick={() => { onSaveAllergenFix(ing.item, ingredientAllergens(ing)); resetAlg(i); }} className="ff text-xs font-semibold underline disabled:opacity-40" style={{ color: "#8a5f2a" }} title="Deze allergenen laten gelden voor elk recept en gerecht met dit ingrediënt">Toepassen op de hele app</button>
                {manual && <button type="button" onClick={() => resetAlg(i)} className="ff text-xs font-medium underline" style={{ color: "#8a5f2a" }}>{gfix ? "Terug naar app-brede instelling" : "Terug naar automatisch"}</button>}
                {gfix && !manual && <button type="button" onClick={() => onSaveAllergenFix(ing.item, null)} className="ff text-xs font-medium underline" style={{ color: "#8a5f2a" }}>App-brede correctie verwijderen</button>}
                <button type="button" onClick={() => setAlgOpen(null)} className="ff text-xs mute underline">Sluiten</button>
              </div>
              <p className="text-[11px] mute mt-2">Aan- en uitzetten geldt voor dit recept (na opslaan) en de gerechten die het gebruiken. "Toepassen op de hele app" laat deze allergenen gelden voor elk recept met een ingrediënt dat precies zo heet — voor het hele team.</p>
            </div>
          ); })()}
        </div>); })}
      </div>
      {chefMode && (() => {
        const t = receptIngTotaal({ ingredients });
        if (!t.geprijsd) return null;
        return (
          <div className="flex items-center gap-2 mt-1.5 text-sm ink flex-wrap">
            <span>Ingrediënten samen: <span className="font-semibold">{eur(t.som)}</span>{t.geprijsd < t.totaal && <span className="mute"> · {t.totaal - t.geprijsd} zonder prijs</span>}</span>
            <button type="button" onClick={() => setCostPrice(t.som.toFixed(2).replace(".", ","))} className="ff text-xs font-semibold acc underline hover:opacity-70">zet vast als batchkostprijs</button>
          </div>
        );
      })()}
      <AddRow onClick={() => setIngredients((a) => [...a, { item: "", amount: "" }])} label="Ingrediënt toevoegen" />
      {uitleg !== null && ingredients[uitleg] && (
        <PrijsUitleg ing={ingredients[uitleg]} leveranciers={leveranciersLijst}
          onKiesArtikel={(code) => setIng(uitleg, "artikelCode", code)}
          onNieuwArtikel={(art) => { if (onSaveArtikel) onSaveArtikel(art); }}
          onSluit={() => setUitleg(null)} />
      )}
      {receptRij !== null && (
        <ReceptKiezer zoek={String((ingredients[receptRij] || {}).item || "")} recepten={allRecipes || []} verboden={recipe ? recipe.id : null}
          onSluit={() => setReceptRij(null)}
          onKies={(r) => {
            setIngredients((a) => a.map((x, idx) => (idx === receptRij ? { ...x, recipeRef: r.id, item: String(x.item || "").trim() ? x.item : r.name } : x)));
            setReceptRij(null);
          }} />
      )}
      {kiesRij !== null && (
        <ArtikelKiezer zoek={String((ingredients[kiesRij] || {}).item || "")} huidig={(ingredients[kiesRij] || {}).artikelCode || (ingKost({ ...(ingredients[kiesRij] || {}), cost: "" }).artikel || {}).code}
          onSluit={() => setKiesRij(null)}
          onKies={(a) => { setIng(kiesRij, "artikelCode", a ? a.code : null); setKiesRij(null); }} />
      )}
      <div className="flex items-center justify-between gap-2 mt-5 mb-1.5">
        <span className="text-sm font-medium ink">Bereiding</span>
      </div>
      <div className="flex items-center gap-2 mb-2 -mt-1">
        <p className="text-xs mute flex-1 min-w-0">Typ of plak gerust de hele bereiding in één vak, en gebruik daarna de knop "Opdelen in stappen".</p>
        <button onClick={splitAll} className="btno ff shrink-0 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-medium px-2.5 py-2" title="Deelt geplakte tekst op in losse stappen"><Layers size={14} /> Opdelen in stappen</button>
      </div>
      <div className="space-y-2 mb-2">{steps.map((s, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="w-6 h-6 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center mt-2" style={{ background: "#e8ebe0", color: T.green }}>{i + 1}</span>
          <textarea data-rf-step={i} rows={2} className={inputCls + " flex-1 resize-none"} value={s} onChange={(e) => setStep(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addStepAt(i); } else if (e.key === "Backspace" && i > 0 && !String(s || "").trim()) { e.preventDefault(); backStep(i); } }} placeholder="Beschrijf de stap — of plak de hele bereiding" />
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
  const [portions, setPortions] = useState(init && init.portions != null ? String(init.portions) : "");
  const [pick, setPick] = useState("");
  const [limit, setLimit] = useState(40);
  const toggle = (id) => setRecipeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const toggleSeason = (s) => setSeasons((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s]));
  const suggestCourse = (g) => setCourse(seasons.length === 1 ? seasons[0] + g.toLowerCase() : g);
  const q = pick.trim().toLowerCase();
  const found = q ? allRecipes.filter((r) => softMatchAny([r.name, r.category], q)) : allRecipes;
  const matches = found.slice(0, limit);
  const currentState = () => ({ name, course, description, plating, recipeIds, portions: eurNum(portions), season: SEASONS.filter((s) => seasons.includes(s)), diet });
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
      <Field label="Dieet"><AppSelect className={inputCls} value={diet} onChange={setDiet} options={["Vegetarisch","Varkensvlees","Rundvlees"]} /></Field>
      <Field label="Porties">
        <input type="text" inputMode="decimal" className={inputCls} value={portions} onChange={(e) => setPortions(e.target.value.replace(/[^0-9.,]/g, ""))}
          placeholder={(() => { const n = gerechtPorties({ recipeIds }, recipeById); return n ? String(n) : "bv. 20"; })()} />
        <p className="text-[11.5px] mute mt-1">Voor hoeveel personen is dit gerecht in één keer? Leeg laten rekent met het krapste recept.</p>
      </Field>
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
  const [days, setDays] = useState(editing ? String(editing.days) : (fd && fd.days ? String(fd.days) : ""));
  const [saltPct, setSaltPct] = useState(editing && editing.saltPct ? String(editing.saltPct) : (fd && fd.saltPct ? String(fd.saltPct) : ""));
  const [tempC, setTempC] = useState(editing && editing.tempC ? String(editing.tempC) : (fd && fd.tempC ? String(fd.tempC) : ""));
  const [amount, setAmount] = useState(editing ? (editing.amount === "—" ? "" : editing.amount) : "");
  const [pH, setPH] = useState(editing && editing.pH != null ? String(editing.pH) : (fd && fd.phTarget != null ? String(fd.phTarget) : ""));
  const [sugarPct, setSugarPct] = useState(editing && editing.sugarPct != null ? String(editing.sugarPct) : (fd && fd.sugarPct ? String(fd.sugarPct) : ""));
  const [notes, setNotes] = useState(editing ? editing.notes : "");
  const applyRecipe = (r) => {
    setProduct(r.name); setRecipeId(r.id); setPicked(true);
    if (r.fermentMethod) setType(r.fermentMethod);
    const d = r.fermentDefaults;
    if (d) {
      setSaltPct(d.saltPct ? String(d.saltPct) : "");
      setTempC(d.tempC ? String(d.tempC) : "");
      setDays(d.days ? String(d.days) : "");
      setPH(d.phTarget != null ? String(d.phTarget) : "");
      setSugarPct(d.sugarPct ? String(d.sugarPct) : "");
    }
  };
  const [picked, setPicked] = useState(!!editing || !!prefill);
  const pickMatches = !picked && product.trim().length >= 2 ? (fermentRecipes || []).filter((r) => softMatchAny([r.name, r.fermentMethod, r.category], product)).slice(0, 6) : [];
  const isMethod = FERMENT_METHODS.includes(type);
  const tgt = FERMENT_TARGETS[type];
  const nz = (x) => { const v = Number(String(x ?? "").replace(",", ".")); return String(x ?? "").trim() !== "" && !isNaN(v) ? v : null; };
  // Dubbelklik-beveiliging: tijdens het opslaan maakt een tweede klik anders
  // een tweede (identieke) batch aan.
  const [busy, setBusy] = useState(false);
  const submit = () => { if (busy || !product.trim()) return; setBusy(true); onSave({ product: product.trim(), type, method: isMethod ? type : type, recipeId, startDate, days: nz(days) || 0, saltPct: nz(saltPct), tempC: nz(tempC), amount: amount.trim() || "—", pH: nz(pH), sugarPct: nz(sugarPct), notes: notes.trim(), done: editing ? editing.done : false }); };
  return (
    <div>
      <FormBar title={editing ? "Batch bewerken" : "Nieuwe batch"} onCancel={onCancel} onSave={submit} saveLabel={editing ? "Opslaan" : "Registreer"} />
      <Field label="Product / recept">
        <div className="relative">
          <input className={inputCls} value={product}
            onChange={(e) => { setProduct(e.target.value); setPicked(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setPicked(true); } }}
            onBlur={() => setTimeout(() => setPicked(true), 120)}
            placeholder="Zoek een fermentatierecept of typ een eigen naam" />
          {pickMatches.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl p-1 shadow-xl" style={{ background: T.paper, border: "1px solid " + T.line, maxHeight: "16rem", overflowY: "auto" }}>
              {pickMatches.map((r) => (
                <button key={r.id} type="button" onMouseDown={(e) => { e.preventDefault(); applyRecipe(r); }} className="ff w-full text-left rounded-xl px-3 py-2 text-sm ink hover:opacity-70">
                  {r.name} <span className="mute">· {r.fermentMethod || r.category}{r.fermentDefaults && r.fermentDefaults.days ? " · " + r.fermentDefaults.days + " dgn" : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-[11.5px] mute mt-1">Een recept kiezen vult naam, methode en richtlijn in.</p>
      </Field>
      <Field label="Type / methode"><AppSelect className={inputCls} value={type} onChange={setType} options={["Melkzuur","Suikerfermentatie","Azijnfermentatie","Zuurkool","Kimchi","Hotsauce","Kappertjes","Kombucha","Waterkefir","Gemberbier","Wilde drank","Landwijn / cider","Zuivel","Zoutpruimen","Anders"]} /></Field>
      {tgt && <p className="text-xs mute -mt-2 mb-4">{tgt.note}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Startdatum"><input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="Duur (dagen)"><input type="text" inputMode="numeric" className={inputCls} value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))} placeholder="volgt het recept" /></Field>
        <Field label="Zoutgehalte (%) (optioneel)"><input type="text" inputMode="decimal" className={inputCls} value={saltPct} onChange={(e) => setSaltPct(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
        <Field label="Temperatuur (°C) (optioneel)"><input type="text" inputMode="decimal" className={inputCls} value={tempC} onChange={(e) => setTempC(e.target.value.replace(/[^0-9.,-]/g, ""))} /></Field>
        <Field label="Suikergehalte (%) (optioneel)"><input type="text" inputMode="decimal" className={inputCls} value={sugarPct} onChange={(e) => setSugarPct(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
        <Field label="Gewenste pH (optioneel)"><input type="text" inputMode="decimal" className={inputCls} value={pH} onChange={(e) => setPH(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="bv. 3,5" /></Field>
        <Field label="Hoeveelheid"><input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="bv. 3 kg" /></Field>
      </div>
      <Field label="Handelingen / opmerkingen"><textarea rows={2} className={inputCls + " resize-none"} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Waarnemingen, handelingen, proefnotities…" /></Field>
      <p className="text-xs mute -mt-2">Metingen (pH, suiker) over de dagen leg je vast in het logboek, na het opslaan van de batch.</p>
    </div>
  );
}

// Eindmeting bij het afronden van een fermentatiebatch, daarna door naar de voorraad.
function EindmetingForm({ batch, onCancelBack, onSkip, onSave }) {
  const [ph, setPh] = useState("");
  const [brix, setBrix] = useState("");
  const [tempC, setTempC] = useState("");
  const [note, setNote] = useState("");
  if (!batch) return null;
  const tgt = FERMENT_TARGETS[batch.method] || FERMENT_TARGETS[batch.type];
  return (
    <div>
      <FormBar title="Eindmeting" onCancel={onCancelBack} onSave={() => onSave({ date: localDate(), ph, brix, tempC, note })} saveLabel="Opslaan" />
      <p className="text-[13px] mute -mt-2 mb-1"><span className="font-medium ink">{batch.product}</span> is afgerond — leg de eindwaarden vast. Daarna kun je hem direct aan de voorraad toevoegen.</p>
      {tgt && tgt.pH && <p className="text-xs mb-3" style={{ color: "#6a5326" }}>Streefwaarde: pH {tgt.pH}</p>}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Eind-pH"><input type="text" inputMode="decimal" className={inputCls} value={ph} onChange={(e) => setPh(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="bv. 3,4" /></Field>
        <Field label="Brix (optioneel)"><input type="text" inputMode="decimal" className={inputCls} value={brix} onChange={(e) => setBrix(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
        <Field label="Temp (°C)"><input type="text" inputMode="decimal" className={inputCls} value={tempC} onChange={(e) => setTempC(e.target.value.replace(/[^0-9.,-]/g, ""))} /></Field>
      </div>
      <Field label="Opmerking (optioneel)"><textarea rows={2} className={inputCls + " resize-none"} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Smaak, geur, structuur…" /></Field>
      <button onClick={onSkip} className="ff w-full text-sm mute underline py-2">Overslaan en direct naar de voorraad</button>
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
  const submit = () => { if (!date) return; onAdd({ date, ph, brix, tempC, note }); setPh(""); setBrix(""); setTempC(""); setNote(""); };
  return (
    <div>
      <BackBar onBack={onBack} />
      <div className="text-[12.5px] font-semibold uppercase tracking-widest acc mb-1">Fermentatie-logboek</div>
      <h1 className="serif ink text-2xl leading-tight">{batch.product}</h1>
      <div className="flex flex-wrap gap-2 mt-2 text-xs mute">
        <span className="inline-flex items-center gap-1"><Calendar size={12} /> Start {fmtDMY(batch.startDate)}</span>
        {batch.finishedDate && <span className="inline-flex items-center gap-1"><Check size={12} /> Afgerond {fmtDMY(batch.finishedDate)}</span>}
        <span className="inline-flex items-center gap-1"><FlaskConical size={12} /> {batch.method || batch.type}</span>
        {tgt && tgt.phEnd != null && <span className="inline-flex items-center gap-1">Doel pH ≤ {String(tgt.phEnd).replace(".", ",")}</span>}
      </div>
      <p className="text-xs mute mt-2">Leg pH en suikergehalte over de dagen vast. Dit logboek toont het verloop en dient als bewijs voor de Keuringsdienst van Waren.</p>

      {canEdit && (
        <div className="card p-4 mt-4">
          <div className="text-sm font-medium ink mb-3">Nieuwe meting</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="pH"><input type="text" inputMode="decimal" className={inputCls} value={ph} onChange={(e) => setPh(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="bv. 3,8" /></Field>
            <Field label="Suiker (°Brix)"><input type="text" inputMode="decimal" className={inputCls} value={brix} onChange={(e) => setBrix(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
            <Field label="Temp (°C)"><input type="text" inputMode="decimal" className={inputCls} value={tempC} onChange={(e) => setTempC(e.target.value.replace(/[^0-9.,-]/g, ""))} /></Field>
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
              <span className="mute text-xs">{fmtDMY(r.date)}</span>
              <span className="ink font-medium">{r.ph != null ? String(r.ph).replace(".", ",") : "—"}</span>
              <span className="mute">{r.brix != null ? String(r.brix).replace(".", ",") : "—"}</span>
              <span className="mute">{r.tempC != null ? r.tempC : "—"}</span>
              {canEdit ? <button onClick={() => onDeleteRow(batch.log.indexOf(r))} className="justify-self-end hover:opacity-70" style={{ color: "#8a4a3a" }}><Trash2 size={13} /></button> : <span />}
              {r.note && <span className="col-span-5 text-xs mute italic mt-0.5">{r.note}{r.by ? " · " + r.by : ""}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddRow({ onClick, label }) { return <button onClick={onClick} className="ff inline-flex items-center gap-1.5 text-sm font-medium acc hover:opacity-70"><Plus size={15} /> {label}</button>; }
