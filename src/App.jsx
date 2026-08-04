import React, { useState, useEffect } from "react";
import {
  ChefHat, Utensils, Layers, Plus, Search, ChevronRight, ArrowLeft, Pencil, X, Check,
  Settings, Download, Share, Smartphone, Info,
  Clock, LogOut, Trash2, Lock, Languages, Loader2, ThumbsUp, Star, GitBranch, Sprout,
  FlaskConical, Blend, Eye, Calendar, Thermometer, Percent,
  Heart, BookOpen, Bell, LineChart, ChevronDown, ChevronUp, Home, Sparkles, Printer, AlertTriangle, Package, Minus, Tag
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
  "Vlees","Vis","Zuivel","Fonds & bouillon","Deeg & brood","Dranken","Zonder categorie",
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


// ---------- printen ----------
// Opent een schone printweergave in een nieuw venster (A4), los van de app-UI.
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
  const w = window.open("", "_blank");
  if (!w) { alert("Sta pop-ups toe om te kunnen printen."); return; }
  w.document.open(); w.document.write(html); w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch (e) {} }, 350);
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
  body += "<h2>Wekelijkse temperatuurcontrole</h2>";
  if (!tempLogs.length) body += "<p>Nog geen metingen.</p>";
  else {
    body += "<table><thead><tr><th>Datum</th>" + HACCP_UNITS.map((u) => "<th>" + pEsc(u.name) + "</th>").join("") + "<th>IJking</th><th>Door</th></tr></thead><tbody>";
    for (const l of [...tempLogs].sort((a, b) => (a.checkDate < b.checkDate ? 1 : -1))) {
      body += "<tr><td>" + pEsc(l.checkDate) + "</td>" +
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
      body += "<tr><td>" + pEsc(r.date) + "</td>" +
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
const AUTO_OFF_HOUR = 2; // vanaf dit uur wordt een lege gisteren automatisch "bedrijf dicht"
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

const PATISSERIE = [
  { id:"pat-tarte-tartin-banaan", name:"Tarte tatin van banaan", category:"Zoet & patisserie", yield:"1 plaat",
    ingredients:[{item:"Bladerdeeg",amount:"rondjes"},{item:"Suikerwater 1:1",amount:"1 dl"},{item:"Bananen",amount:"3 st"},{item:"Citroensap",amount:"scheut"},{item:"Suiker",amount:"100 g"},{item:"Roomboter",amount:"50 g"},{item:"Nootmuskaat",amount:"naar smaak"}],
    steps:["Steek rondjes uit het bladerdeeg.","Prik in met een vork en smeer in met het suikerwater; laat 10 min intrekken en herhaal.","Bak tussen 2 matjes af op 185 °C.","Karamelliseer de suiker en voeg de boter toe.","Karamelliseer de banaan mee en maak af met nootmuskaat."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-vanillecreme", name:"Vanillecrème", category:"Zoet & patisserie", yield:"≈ 250 g",
    ingredients:[{item:"Slagroom, ongezoet",amount:"250 g"},{item:"Vanillestokje",amount:"1 st"},{item:"Gelatine",amount:"2 g"}],
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
    ingredients:[{item:"Bananen",amount:"1 kg"},{item:"Water",amount:"1,5 dl"},{item:"Suiker",amount:"200 g"},{item:"Citroen",amount:"1 st"},{item:"Sinaasappel",amount:"1 st"},{item:"Vanillestokjes",amount:"2 st"}],
    steps:["Kook water, suiker, vanillestokje en de rasp van de sinaasappel.","Koel af met citroensap, 2 el sinaasappelsap en brunoise van banaan.","Koel terug."],
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
  { id:"pat-mango-bavarois", name:"Mango-bavarois", category:"Mousses", yield:"1 bak",
    ingredients:[{item:"Mangocoulis",amount:"500 g"},{item:"Gelatine",amount:"14 g"},{item:"Kookschuim (70 eiwit / 130 suiker / 30 water)",amount:"200 g"},{item:"Slagroom, ongezoet",amount:"4 dl"}],
    steps:["Verwarm 100 g coulis en los de gelatine erin op; voeg de rest van de coulis toe.","Klop de slagroom lobbig.","Meng de coulis met het kookschuim.","Spatel de slagroom erdoor en stort."],
    endorsements:[], chefsPick:false, baseId:"pat-vruchtenbavarois", isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-trekdropparels", name:"Trekdropparels", category:"Gels", yield:"1 pot",
    ingredients:[{item:"Water",amount:"500 g"},{item:"Trekdrop",amount:"300 g"},{item:"Agar",amount:"8 g"},{item:"Zonnebloemolie",amount:"5 dl"}],
    steps:["Zet de olie in de vriezer.","Gaar water en trekdrop sous-vide.","Voeg de agar toe en laat koken.","Koel terug tot 45 °C.","Doe in een spuitflesje en druppel in de olie.","Zeef de olie en spoel de parels af met water."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Sous-vide", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-kaneel-speculaasmousse", name:"Kaneel-speculaasmousse", category:"Mousses", yield:"1 bak",
    ingredients:[{item:"Slagroom",amount:"5 dl"},{item:"Monin",amount:"4 el"},{item:"Speculaaspoeder",amount:"0,5 el"},{item:"Gelatine",amount:"3 blaadjes"},{item:"Eiwit",amount:"90 g"},{item:"Suiker",amount:"100 g"}],
    steps:["Verwarm 1 dl slagroom en los de gelatine op.","Sla 4 dl slagroom lobbig; voeg poeder en monin toe, dan de lauwwarme room.","Sla het eiwit op met de suiker.","Meng alles."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-bokkenpootjes", name:"Bokkenpootjes", category:"Zoet & patisserie", yield:"1 plaat",
    ingredients:[{item:"Amandelpoeder",amount:"350 g"},{item:"Poedersuiker",amount:"350 g"},{item:"Eiwit",amount:"400 g"},{item:"Witte basterdsuiker",amount:"400 g"},{item:"— Crème pât: slagroom, ongezoet",amount:"1 l"},{item:"Suiker",amount:"400 g"},{item:"Vanillestokje",amount:"1 st"},{item:"Custard",amount:"60 g"},{item:"Eidooier",amount:"120 g"},{item:"Cointreau",amount:"3 ml"}],
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
    ingredients:[{item:"Eigeel",amount:"8 st"},{item:"Vanillestokje",amount:"1 st"},{item:"Suiker",amount:"400 g"},{item:"Korenwijn",amount:"5 dl"}],
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
  { id:"pat-ananassnoepjes", name:"Ananassnoepjes (pâte de fruit)", category:"Zoet & patisserie", yield:"1 slede",
    ingredients:[{item:"Ananassap",amount:"1000 g"},{item:"Suiker",amount:"1000 g"},{item:"Glucose",amount:"150 g"},{item:"Suiker (voor de pectine)",amount:"100 g"},{item:"Pectine",amount:"30 g"},{item:"Citroenzuur",amount:"20 g"}],
    steps:["Kook sap, suiker en glucose.","Voeg de pectine met 100 g suiker roerend toe en kook tot 107 °C.","Voeg het zuur toe en stort in een slede (afdekken met plastic)."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
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
    ingredients:[{item:"Kersen (diepvries)",amount:"1 zak"},{item:"Rode port",amount:"150 g"},{item:"Kaneelstokje",amount:"1 st"},{item:"Steranijs",amount:"2 st"},{item:"Kersencoulis",amount:"400 g"},{item:"Geleisuiker",amount:"200 g"}],
    steps:["Kook alles tot de gewenste structuur van de kersen.","Haal de droogwaren eruit."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-kruimeldeeg", name:"Kruimeldeeg", category:"Zoet & patisserie", yield:"3 baktrays",
    ingredients:[{item:"Gezouten boter, zacht",amount:"1 kg"},{item:"Suiker",amount:"1 kg"},{item:"Bloem",amount:"1 kg"},{item:"Amandelpoeder",amount:"750 g"},{item:"Bakpoeder",amount:"80 g"},{item:"Dooier",amount:"16 g"}],
    steps:["Zeef de bloem en meng alles.","Bak af in 3 baktrays op 180 °C; roer elke 5 min met een garde erdoor tot de gewenste kleur en garing."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-creme-brulee", name:"Crème brûlée", category:"Zoet & patisserie", yield:"grote batch",
    ingredients:[{item:"Volle melk",amount:"1 l"},{item:"Room, ongezoet",amount:"1,15 l"},{item:"Vanillestokje",amount:"1 st"},{item:"Steranijs",amount:"8 st"},{item:"Suiker",amount:"450 g"},{item:"Eidooier",amount:"650 g"}],
    steps:["Kook 5 dl melk met de steranijs, het vanillestokje en de suiker.","Zeef de melk en voeg bij de room; voeg de eidooiers rustig toe en roer glad.","Stoom 45 min op 85 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Stoomoven", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-karamelsaus", name:"Karamelsaus", category:"Sauzen & emulsies", yield:"≈ 1,5 kg",
    ingredients:[{item:"Witte basterdsuiker",amount:"600 g"},{item:"Glucose",amount:"100 g"},{item:"Water",amount:"0,5 dl"},{item:"Room",amount:"800 g"}],
    steps:["Karamelliseer suiker, glucose en water.","Maak de room lauwwarm en voeg rustig toe aan de karamel."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-meloenganache", name:"Meloenganache", category:"Zoet & patisserie", yield:"≈ 500 g",
    ingredients:[{item:"Witte chocolade",amount:"300 g"},{item:"Room, ongezoet",amount:"1 dl"},{item:"Suiker",amount:"50 g"},{item:"Meloensap",amount:"50 g"}],
    steps:["Verwarm room, suiker en sap.","Voeg de chocolade toe en roer glad; laat opstijven."],
    endorsements:[], chefsPick:false, baseId:"pat-ganache-choco-koffie", isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-watermeloen-wodkaparels", name:"Parels van watermeloen en wodka", category:"Fruit & garnituur", yield:"1 bak",
    ingredients:[{item:"Rijpe meloen",amount:"1 st"},{item:"Suikerwater 1:1",amount:"500 g"},{item:"Wodka",amount:"2 dl"}],
    steps:["Boor balletjes uit de meloen.","Trek vacuüm met de wodka en het suikerwater.","Vries in."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Vacumeermachine", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"pat-lychee-cremeux", name:"Lychee-cremeux", category:"Zoet & patisserie", yield:"≈ 1,2 kg",
    ingredients:[{item:"Lycheecoulis",amount:"600 g"},{item:"Citroensap",amount:"30 g"},{item:"Water",amount:"30 g"},{item:"Suiker",amount:"220 g"},{item:"Dooier",amount:"220 g"},{item:"Gelatine",amount:"10 blaadjes"},{item:"Boter",amount:"170 g"}],
    steps:["Verwarm coulis, sap, water, suiker en dooier.","Week de gelatine en los erin op.","Monteer met de boter."],
    endorsements:[], chefsPick:false, baseId:"pat-vanille-cremeux", isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
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
  { id:"map-knolselderijsalade", name:"Knolselderijsalade", category:"Tuin · rauw", yield:"1 bak",
    ingredients:[{item:"Knolselderij",amount:"1 st"},{item:"Aardappelen",amount:"4 st"},{item:"Ui",amount:"1 st"},{item:"Boter",amount:"klontje"},{item:"Witte wijn",amount:"scheut"},{item:"Mayonaise",amount:"naar smaak"},{item:"Groene kruiden",amount:"naar smaak"}],
    steps:["Snijd knolselderij en aardappel brunoise.","Stoof gaar met de gesnipperde ui in de boter en witte wijn.","Koel terug en maak aan met de mayonaise, peper, zout en groene kruiden."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-zilverui-compote", name:"Zilveruicompote", category:"Chutney & jam", yield:"1 pot",
    ingredients:[{item:"Zilverui",amount:"100 g"},{item:"Rozijnen",amount:"50 g"},{item:"Paprikapoeder",amount:"1 tl"},{item:"Kaneelstokje",amount:"1 st"},{item:"Rode port",amount:"2 dl"},{item:"Bruine basterdsuiker",amount:"50 g"}],
    steps:["Fruit de zilverui aan, paprikapoeder erbij en myoteren.","Voeg de rest toe en kook in tot de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-citrusolie", name:"Citrusolie", category:"Oliën & vinaigrettes", yield:"≈ 5 dl",
    ingredients:[{item:"Knoflook",amount:"15 g"},{item:"Sjalot",amount:"40 g"},{item:"Rozemarijn",amount:"5 g"},{item:"Sinaasappelschil",amount:"20 g"},{item:"Olie",amount:"5 dl"}],
    steps:["Fruit knoflook, sjalot en rozemarijn aan.","Voeg de olie en sinaasappelschil toe.","20 min op 58 °C in de roner."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Roner", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-venkel-sinaasappelsalade", name:"Venkel-sinaasappelsalade", category:"Tuin · rauw", yield:"1 bak",
    ingredients:[{item:"Venkels",amount:"3 st"},{item:"Sinaasappelsap",amount:"van 2 st"},{item:"Sinaasappelrasp",amount:"van 1 st"},{item:"Olijfolie",amount:"scheut"},{item:"Zout",amount:"naar smaak"}],
    steps:["Haal de venkel door de Magimix (fijne blad).","Bak de gesneden venkel licht aan in de olijfolie met de rasp en het sap."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-knolselderijmayo", name:"Knolselderijmayo", category:"Sauzen & emulsies", yield:"≈ 500 g",
    ingredients:[{item:"Knolselderij",amount:"200 g"},{item:"Koksroom",amount:"2 dl"},{item:"Mayonaise",amount:"100 g"}],
    steps:["Snijd de knolselderij in kleine stukjes en gaar in de room.","Draai alles in de Magimix en zeef.","Meng met de mayonaise."],
    endorsements:[], chefsPick:false, baseId:"map-basismayonaise", isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-rillette-heek", name:"Rillette van heek", category:"Vis", yield:"≈ 700 g",
    ingredients:[{item:"Heek",amount:"500 g"},{item:"Knoflook",amount:"1 teen"},{item:"Sjalotten",amount:"2 st"},{item:"Witte wijn",amount:"1 dl"},{item:"Olijfolie",amount:"2 dl"}],
    steps:["Zout de heekfilet en laat 1 uur intrekken.","Bak sjalot, knoflook en heek licht aan.","Voeg de wijn toe en kook het geheel gaar.","Draai fijn in de Magimix en monteer met de olijfolie."],
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
    ingredients:[{item:"Eieren",amount:"naar behoefte"},{item:"Panko",amount:"om te paneren"}],
    steps:["Verwarm de roner op 63 °C en leg de eieren er 2 uur in.","Spoel 5 min koud.","Kraak de eieren en verwijder het eiwit; paneer de dooiers wanneer ze vochtig zijn.","Frituur op 180 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Roner / friteuse", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-krokante-kippendijen", name:"Krokante kippendijen", category:"Vlees", yield:"1 kg",
    ingredients:[{item:"Kippendijen",amount:"1 kg"},{item:"Sojasaus",amount:"1 dl"},{item:"Sake",amount:"50 ml"},{item:"Knoflook",amount:"2 tenen"},{item:"Panko",amount:"100 g"},{item:"Bloem",amount:"100 g"}],
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
    ingredients:[{item:"Radijs",amount:"1 kg"},{item:"Rode ui, gesnipperd",amount:"250 g"},{item:"Sjalot, gesnipperd",amount:"250 g"},{item:"Rode pepers, fijngehakt",amount:"4 st"},{item:"Gembersiroop",amount:"1 dl"},{item:"Suiker",amount:"200 g"},{item:"Wittewijnazijn",amount:"2,5 dl"}],
    steps:["Kook alles behalve de radijs 10 min.","Voeg de radijs toe en gaar 10 min zachtjes."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Lente","Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-polentafriet", name:"Polentafriet", category:"Krokant & garnituur", yield:"1 gastronoombak",
    ingredients:[{item:"Polenta",amount:"500 g"},{item:"Water",amount:"2 l"},{item:"Roomboter",amount:"2 el"},{item:"Parmezaanse kaas",amount:"250 g"},{item:"Rozemarijn",amount:"2 takken"}],
    steps:["Breng het water met de rozemarijn aan de kook; verwijder de takken na 5 min koken.","Voeg de polenta toe en gaar tot een dikke pap.","Voeg als laatste de kaas en boter toe en laat goed smelten.","Stort in een gastronoombak en zet weg onder druk."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-tomatenvinaigrette", name:"Tomatenvinaigrette", category:"Oliën & vinaigrettes", yield:"≈ 5 dl",
    ingredients:[{item:"Vocht van gepofte tomaatjes",amount:"4 dl"},{item:"Gepofte tomaatjes",amount:"10 st"},{item:"Sushi-azijn",amount:"50 g"}],
    steps:["Staafmix alles en zeef.","Schudden voor gebruik."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-dressing-bleu-de-gex", name:"Dressing bleu de Gex", category:"Oliën & vinaigrettes", yield:"≈ 5 dl",
    ingredients:[{item:"Bleu de Gex",amount:"100 g"},{item:"Wittewijnazijn",amount:"1 dl"},{item:"Gembersiroop",amount:"1 el"},{item:"Olijfolie",amount:"3 dl"}],
    steps:["Draai alles glad in de blender (kaas rustig toevoegen) en zeef.","Schudden voor gebruik."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-basilicumkorst", name:"Basilicumkorst", category:"Krokant & garnituur", yield:"2 banen",
    ingredients:[{item:"Boter",amount:"100 g"},{item:"Panko",amount:"200 g"},{item:"Parmezaanse kaas",amount:"100 g"},{item:"Basilicum, gehakt",amount:"100 g"},{item:"Sinaasappelsap",amount:"2 el"}],
    steps:["Blender alles fijn en draai tot een stevige massa.","Rol het mengsel uit tussen folie, snijd banen en bewaar in de vriezer."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-truffelmayonaise", name:"Truffelmayonaise", category:"Sauzen & emulsies", yield:"≈ 700 g",
    ingredients:[{item:"Eidooiers",amount:"4 st"},{item:"Dijonmosterd",amount:"1 el"},{item:"Wittewijnazijn",amount:"30 g"},{item:"Zonnebloemolie",amount:"6 dl"},{item:"Truffelpasta",amount:"2 el"}],
    steps:["Draai alles behalve de olie glad in de Magimix.","Voeg de olie langzaam toe tot de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:"map-basismayonaise", isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-notendressing", name:"Notendressing", category:"Oliën & vinaigrettes", yield:"≈ 1,7 l",
    ingredients:[{item:"Fijne mosterd",amount:"8 g"},{item:"Water",amount:"1 dl"},{item:"Eidooier",amount:"75 g"},{item:"Zonnebloemolie",amount:"1,3 l"},{item:"Walnootolie",amount:"1,5 dl"},{item:"Wittewijnazijn",amount:"1,5 dl"},{item:"Poedersuiker",amount:"45 g"},{item:"Zout en peper",amount:"naar smaak"}],
    steps:["Draai alles op de olie na fijn in de Magimix.","Voeg de olie langzaam toe tot de gewenste dikte."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-creme-van-dadels", name:"Crème van dadels", category:"Sauzen & emulsies", yield:"≈ 900 g",
    ingredients:[{item:"Witte wijn",amount:"220 g"},{item:"Suiker",amount:"200 g"},{item:"Water",amount:"220 g"},{item:"Jus de veau",amount:"65 g"},{item:"Boter",amount:"15 g"},{item:"Ontpitte dadels",amount:"400 g"}],
    steps:["Verhit de witte wijn met de suiker en giet op de dadels; laat koelen.","Haal de vellen van de dadels.","Draai met de overige ingrediënten glad in de Magimix en zeef."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Rundvlees", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-ingelegde-wintergroenten", name:"Ingelegde wintergroenten", category:"Pickles & zuur", yield:"3 soorten",
    ingredients:[{item:"Knolselderij",amount:"350 g"},{item:"Pompoen",amount:"350 g"},{item:"Koolraap",amount:"350 g"},{item:"Sushi-azijn",amount:"4,5 dl"},{item:"Water",amount:"3 dl"},{item:"Suiker",amount:"200 g"},{item:"Korianderzaad",amount:"2,5 g"},{item:"Vanillestokje",amount:"1 st"},{item:"Kruidnagel",amount:"2 st"}],
    steps:["Snijd de groenten brunoise en blancheer per soort beetgaar (bewaar apart).","Meng de overige ingrediënten en laat 30 min trekken op laag vuur.","Zeef de marinade en giet over de groenten.","Vacumeer per soort met de marinade."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Vacumeermachine", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-kikkomanmayonaise", name:"Kikkoman-mayonaise", category:"Sauzen & emulsies", yield:"≈ 800 g",
    ingredients:[{item:"Kikkoman",amount:"2,5 dl"},{item:"Eidooier",amount:"250 g"},{item:"Sojaolie",amount:"375 g"},{item:"Mosterdpoeder",amount:"10 g"},{item:"Sushi-azijn",amount:"40 g"},{item:"Olijfolie",amount:"75 g"},{item:"Sesamolie",amount:"25 g"}],
    steps:["Kook de kikkoman in tot 1,2 dl en koel terug.","Maak van de overige ingrediënten mayonaise.","Voeg op het laatst de ingekookte kikkoman toe."],
    endorsements:[], chefsPick:false, baseId:"map-basismayonaise", isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-tofuwrap", name:"Tofuwrap", category:"Tuin · rauw", yield:"± 12 st",
    ingredients:[{item:"Tofu",amount:"675 g"},{item:"Tahin",amount:"3 el"},{item:"Sojamelk",amount:"80 g"},{item:"Bloem",amount:"65 g"},{item:"Rijstmeel",amount:"60 g"},{item:"Verse kruiden",amount:"15 g"},{item:"Sojaolie",amount:"3 el"}],
    steps:["Pureer de tofu, tahin en sojamelk.","Meng alles en bak in olie."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-jambon-persille", name:"Jambon persillé", category:"Vlees", yield:"1 vorm",
    ingredients:[{item:"Gekookte ham",amount:"1 kg"},{item:"Slagroom",amount:"3 dl"},{item:"Gelatine",amount:"3 blaadjes"},{item:"Peterselie",amount:"royaal"},{item:"Peper en zout",amount:"naar smaak"}],
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
    ingredients:[{item:"Basilicumolie",amount:"0,5 l"},{item:"Eiwitten",amount:"3 st"},{item:"Sushi-azijn",amount:"2 el"},{item:"Yoghurt",amount:"50 g"}],
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
    ingredients:[{item:"Bloem",amount:"75 g"},{item:"Boekweitmeel",amount:"25 g"},{item:"Aardpeerpuree",amount:"50 g"},{item:"Ei (M)",amount:"1 st"},{item:"Melk",amount:"150 ml"},{item:"Ongezouten roomboter",amount:"25 g"},{item:"Zout en peper",amount:"naar smaak"}],
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
    ingredients:[{item:"Aardpeer (topinamboer)",amount:"5 kg"},{item:"Wittewijnazijn",amount:"200 ml"},{item:"Mirin",amount:"450 ml"},{item:"Suiker",amount:"100 g"},{item:"Sushi-azijn",amount:"25 ml"},{item:"Zonnebloemolie",amount:"naar behoefte"},{item:"Zout",amount:"naar behoefte"}],
    steps:["Schrob de aardperen goed schoon met een metalen pannenspons.","Snijd in de lengte doormidden en meng met zonnebloemolie en zout.","Rooster met het snijvlak naar beneden op 160 °C tot diep goudbruin.","Breng ondertussen de overige ingrediënten aan de kook voor het zoetzuur.","Blus de aardperen af met het zoetzuur en week ze los uit de braadslee.","Laat het zoetzuur 24 uur inwerken voor een grovere compote, of maal kort in de thermoblender voor een fijnere."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Thermoblender", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-vegan-brownie", name:"Vegan brownie", category:"Zoet & patisserie", yield:"1 bakplaat",
    ingredients:[{item:"Bloem",amount:"1 kg"},{item:"Cacaopoeder",amount:"330 g"},{item:"Donkere basterdsuiker",amount:"800 g"},{item:"Kristalsuiker",amount:"800 g"},{item:"Bakpoeder",amount:"4 tl"},{item:"Zout",amount:"2 tl"},{item:"Instantkoffie",amount:"4 tl"},{item:"Haverdrink",amount:"960 ml"},{item:"Kokosolie",amount:"240 ml"},{item:"Vanillesuiker",amount:"4 el"},{item:"Pure chocolade",amount:"400 g"},{item:"Pure chocoladechips (mini)",amount:"200 g"}],
    steps:["Meng alle droge ingrediënten (zonder chocolade) goed door.","Verwarm de kokosolie met de haverdrink tot de olie is gesmolten en giet op de 400 g pure chocolade.","Meng dit goed door de droge ingrediënten.","Voeg als laatste de chocoladechips toe.","Bak de plaat 40 min op 170 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-notenmelange", name:"Notenmelange", category:"Krokant & garnituur", yield:"≈ 2,2 kg",
    ingredients:[{item:"Notenmix",amount:"1 kg"},{item:"Cashewnoten",amount:"1 kg"},{item:"Gedroogde cranberry's",amount:"200 g"},{item:"Kruidenolie (lavas)",amount:"om te besprenkelen"}],
    steps:["Besprenkel de noten met de kruidenolie.","Rooster op 180 °C, twee keer 6 minuten."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pickle-marinade", name:"Picklemarinade (basis)", category:"Pickles & zuur", yield:"≈ 3,5 l",
    ingredients:[{item:"Water",amount:"2 l"},{item:"Azijn",amount:"1 l"},{item:"Zout",amount:"87,5 g"},{item:"Suiker",amount:"500 g"},{item:"(Verse) smaakmakers",amount:"passend bij het product"}],
    steps:["Verwarm alles samen."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pruimenchutney-ferment", name:"Pruimenchutney met gefermenteerde pruimen", category:"Chutney & jam", yield:"± 2 kg",
    ingredients:[{item:"Appelciderazijn",amount:"475 ml"},{item:"Lichte basterdsuiker",amount:"275 g"},{item:"Rozijnen",amount:"225 g"},{item:"Garam masala",amount:"1 el"},{item:"Gefermenteerde pruimen",amount:"750 g"},{item:"Uien (brunoise)",amount:"3 st"},{item:"Rode pepers (fijne brunoise, zonder zaadlijst)",amount:"4 st"},{item:"Gember, geschild en fijngehakt",amount:"30 g"},{item:"Knoflook, fijngehakt",amount:"4 tenen"}],
    steps:["Doe de azijn, suiker, rozijnen en garam masala in een grote pan.","Verwarm al roerend op laag vuur tot de suiker is opgelost en breng aan de kook.","Voeg de pruimen, ui, pepers, gember, knoflook en zout toe.","Laat 40–50 min zachtjes sudderen tot de chutney dik is; roer regelmatig door."],
    endorsements:[], chefsPick:false, baseId:"chutney-pruim", isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pulled-oesterzwam", name:"Pulled oesterzwam of eryngii", category:"Tuin · geroosterd", yield:"≈ 500 g",
    ingredients:[{item:"Oesterzwam of eryngii (kingboleet)",amount:"500 g"},{item:"Maïsmeel",amount:"4 tl"},{item:"5-spice",amount:"2 tl"},{item:"Knoflookpoeder",amount:"1 tl"},{item:"Hoisinsaus",amount:"150 g"},{item:"Sesamzaad",amount:"optioneel"}],
    steps:["Pluk de zwammen in mooie reepjes.","Voeg de droge kruiden en het maïsmeel toe en meng goed.","Bak in een pan met een goede laag olie tot bruin en krokant.","Laat uitlekken op een doek.","Meng na het bakken 2 theelepels hoisinsaus erdoor en werk eventueel af met sesamzaad."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pindakoek", name:"Pindakoek", category:"Zoet & patisserie", yield:"1 vorm",
    ingredients:[{item:"Kruimeldeeg",amount:"500 g"},{item:"Boter (voor de bodem)",amount:"150 g"},{item:"Pindakaas zonder stukjes",amount:"900 g"},{item:"Poedersuiker",amount:"500 g"},{item:"Boter (voor de vulling)",amount:"250 g"},{item:"Volle melk",amount:"30 ml"},{item:"Pure chocoladecouverture",amount:"700 g"},{item:"Slagroom",amount:"250 ml"}],
    steps:["Draai het kruimeldeeg fijn in de Magimix en voeg de gesmolten boter toe.","Bekleed een vierkante bakvorm met bakpapier, verdeel de kruimels over de bodem en laat opstijven in de koeling.","Verwarm de pindakaas met de boter au bain-marie tot de boter is opgenomen.","Roer de poedersuiker en melk door het pindakaasmengsel; stort op de bodem en laat opstijven.","Kook de slagroom, giet op de chocolade, laat 1 min staan en roer tot een homogene massa.","Stort de chocolade op de pindakaaslaag en laat uitharden in de koeling."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-spruitenstamppot", name:"Spruitenstamppot", category:"Tuin · geroosterd", yield:"grote batch",
    ingredients:[{item:"— Mousseline: aardappels",amount:"4 kg"},{item:"Margarine",amount:"250 g"},{item:"Kokosmelk",amount:"800 ml"},{item:"Olijfolie",amount:"50 ml"},{item:"Peper en zout",amount:"naar smaak"},{item:"— Spruiten: spruiten",amount:"5 kg"},{item:"Zonnebloemolie",amount:"100 ml"},{item:"Sesamzaad",amount:"100 g"}],
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
  { id:"map-spitskoolrendang", name:"Spitskoolrendang", category:"Tuin · geroosterd", yield:"1 pan",
    ingredients:[{item:"Grote (savooie) spitskool",amount:"1 st"},{item:"Zout",amount:"om te kneden"},{item:"— Boemboe: sjalotten",amount:"2 st"},{item:"Rode peper",amount:"1 st"},{item:"Citroengras",amount:"1 stengel"},{item:"Gember",amount:"± 1,5 cm"},{item:"Knoflook",amount:"3 teentjes"},{item:"Surinaamse masala",amount:"1 tl"},{item:"— Rendang: zonnebloemolie",amount:"scheutje"},{item:"Limoenblaadjes",amount:"3 st"},{item:"Kokosmelk",amount:"1 blik à 400 ml"},{item:"Ketjap manis",amount:"4 el"},{item:"Ketjap asin",amount:"2 el"},{item:"Sambal oelek",amount:"1 tl"}],
    steps:["Snijd de koolbladeren in reepjes, kneed met zout tot de kool vochtig wordt en laat uitlekken onder een verzwaard bord.","Boemboe: snijd sjalot, knoflook, peper en gember grof en het witte deel van de sereh in ringetjes; pureer met de masala en wat kokosmelk.","Verhit olie in een wok en bak de koolreepjes lichtbruin.","Bak de boemboe enkele minuten mee tot hij gaar is en geurt.","Voeg limoenblaadjes, de rest van de kokosmelk, ketjap manis, ketjap asin en sambal toe; roer door.","Laat inkoken tot een mooie dikke saus."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-vegan-haverkoek", name:"Vegan haverkoek", category:"Zoet & patisserie", yield:"1 bakplaat",
    ingredients:[{item:"Bloem",amount:"500 g"},{item:"Havermout (boekweitmeel voor glutenvrij)",amount:"375 g"},{item:"Bruine rietsuiker",amount:"400 g"},{item:"Bakpoeder",amount:"2 tl"},{item:"Zout",amount:"1,5 tl"},{item:"Vanillesuiker",amount:"3 tl"},{item:"Gemalen lijnzaad",amount:"1 tl"},{item:"Gemalen kokos",amount:"200 g"},{item:"Zonnebloempitten",amount:"200 g"},{item:"Sesamzaad",amount:"200 g"},{item:"Cranberry's",amount:"200 g"},{item:"Margarine",amount:"550 g"},{item:"Ahornsiroop",amount:"120 g"}],
    steps:["Meng alle droge ingrediënten.","Smelt de margarine met de ahornsiroop en meng goed door de droge ingrediënten.","Bekleed een 1/1 GN-bakplaat met bakpapier en giet het mengsel erin.","Verspreid goed en druk stevig aan met een rvs bakspatel.","Bak 20 min op 170 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pate-de-fruit-pruim", name:"Pâte de fruit van gefermenteerde pruim", category:"Zoet & patisserie", yield:"1 vorm",
    ingredients:[{item:"Suiker (voor de pectine)",amount:"75 g"},{item:"Pectine",amount:"28 g"},{item:"Gefermenteerde-pruimencoulis",amount:"700 g"},{item:"Suiker",amount:"750 g"},{item:"Glucose",amount:"150 g"},{item:"Citroenzuur",amount:"25 g"}],
    steps:["Meng de 75 g suiker met de pectine.","Kook de pruimencoulis met de overige 750 g suiker en de glucose op.","Voeg zodra het kookt het suiker-pectinemengsel toe.","Kook door tot 106 °C.","Haal van het vuur en voeg het citroenzuur toe.","Stort in de gewenste vormen en laat opstijven.","Coat eventueel met kristalsuiker en een beetje citroenzuur."],
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
    ingredients:[{item:"Vanillestokje",amount:"1 st"},{item:"Slagroom",amount:"250 ml"},{item:"Boter",amount:"75 g"},{item:"Melkchocolade",amount:"500 g"},{item:"Cacaopoeder",amount:"200 g"}],
    steps:["Kook de room met het vanillestokje en de boter.","Los de melkchocolade op in de hete room en laat opstijven.","Klop de massa luchtig in de mixer en draai balletjes.","Laat aanvriezen en dompel in het cacaopoeder."],
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
    ingredients:[{item:"Bloem",amount:"600 g"},{item:"Zout",amount:"2 tl"},{item:"Chaispecerijen",amount:"4 el"},{item:"Baking soda",amount:"4 tl"},{item:"Bakpoeder",amount:"1 tl"},{item:"Pastinaak, geraspt",amount:"280 g"},{item:"Peer, in julienne",amount:"280 g"},{item:"Eieren",amount:"8 st"},{item:"Suiker",amount:"200 g"},{item:"Bruine basterdsuiker",amount:"200 g"},{item:"Yoghurt",amount:"160 g"},{item:"Vanille-extract",amount:"4 tl"},{item:"Zonnebloemolie",amount:"480 g"}],
    steps:["Verwarm de oven voor op 165 °C en bekleed een gastronormbak met bakpapier.","Meng bloem, zout, chaikruiden, baking soda en bakpoeder goed door.","Voeg de pastinaak en peer toe en meng door het bloemmengsel.","Klop de eieren met beide suikers luchtig en bleek met een garde.","Voeg de yoghurt en het vanille-extract toe.","Schenk de zonnebloemolie in een dunne straal al kloppend bij de eierbasis.","Meng het bloemmengsel met de eierbasis tot een egale massa en stort het beslag.","Bak 25–30 min in de voorverwarmde oven en laat afkoelen in het blik."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pompoenflan", name:"Pompoenflan", category:"Tuin · gestoomd", yield:"± 12 vormpjes",
    ingredients:[{item:"Pompoen",amount:"1 st"},{item:"Eieren",amount:"3 st"},{item:"Bloem",amount:"3 el, eventueel meer"},{item:"Olijfolie",amount:"100 ml"},{item:"Vadouvan",amount:"1 el"},{item:"Knoflook",amount:"1/2 teen"},{item:"Peper en zout",amount:"naar smaak"}],
    steps:["Schil de pompoen, verwijder de zaadlijsten en snijd in stukken.","Kook de pompoen gaar in gezouten water; laat uitlekken en dep droog.","Pureer met knoflook, vadouvan, eieren, olijfolie en bloem tot een romige massa; voeg extra bloem toe als het te dun is.","Stort in vormpjes en dek af met een siliconen matje.","Stoom de flan in ongeveer 50 min op 85 °C gaar."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Stoomoven", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-pompoenhummus", name:"Pompoenhummus", category:"Purees", yield:"≈ 1,2 kg",
    ingredients:[{item:"Flespompoen",amount:"500 g"},{item:"Kikkererwten (uit blik)",amount:"500 g"},{item:"Knoflook",amount:"3 tenen"},{item:"Citroensap",amount:"van 1,5 st"},{item:"Chili",amount:"mespuntje"},{item:"Tahini",amount:"8 el"},{item:"Komijn",amount:"1,5 tl"},{item:"Peterselie",amount:"takje"},{item:"Olijfolie",amount:"scheut"},{item:"Peper en zout",amount:"naar smaak"}],
    steps:["Verwarm de oven voor op 200 °C (hetelucht).","Snijd de pompoen brunoise en besprenkel met olijfolie, peper en zout.","Rooster de pompoen 20–30 min in de oven en laat afkoelen.","Pureer de pompoen met de kikkererwten, knoflook, citroensap, chili, tahini en komijn glad.","Garneer met verse peterselie en chili."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-lemon-curd", name:"Lemon curd", category:"Zoet & patisserie", yield:"≈ 500 g",
    ingredients:[{item:"Citroenen (rasp en sap)",amount:"2 flinke, ± 130 ml sap"},{item:"Fijne kristalsuiker",amount:"200 g"},{item:"Ongezouten roomboter",amount:"125 g"},{item:"Eieren, geklutst",amount:"2 st"}],
    steps:["Rasp de citroenen en pers ze uit; zeef het sap.","Verhit rasp, suiker en boter au bain-marie op middelhoog vuur en roer tot een gladde massa.","Voeg het citroensap toe en roer door; voeg daarna de eieren toe terwijl je blijft roeren.","Blijf rustig roeren tot de curd de dikte van yoghurt heeft (± 20 min).","Giet in een schaal om af te koelen; hij dikt dan nog verder in."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-peer-relish", name:"Peer-relish", category:"Chutney & jam", yield:"1 grote pan",
    ingredients:[{item:"Peren",amount:"12 st"},{item:"Groene paprika",amount:"2 st"},{item:"Rode paprika",amount:"2 st"},{item:"Ui",amount:"2 st"},{item:"Wittewijnazijn",amount:"400 ml"},{item:"Suiker",amount:"400 g"},{item:"Kurkuma",amount:"20 g"},{item:"Kaneel",amount:"4 g"},{item:"Mosterdzaad",amount:"4 g"},{item:"Gedroogde gember",amount:"4 g"},{item:"Gedroogde rode chilipeper",amount:"4 g"}],
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
  { id:"map-preimozaiek", name:"Preimozaïek", category:"Tuin · geroosterd", yield:"1 rol",
    ingredients:[{item:"Prei",amount:"8 st"},{item:"Tijm",amount:"10 takjes"},{item:"Citroen",amount:"2 st"},{item:"Zonnebloemolie",amount:"scheut"},{item:"Norivellen",amount:"enkele"}],
    steps:["Snijd het groen van de prei af en was het witte gedeelte.","Snijd de prei in gelijke stukken, leg in een gastronoombak met de tijm, peper en zout.","Dek af met aluminiumfolie en gaar 70 min in de oven op 160 °C.","Verwijder de folie, laat 5 min afkoelen en haal het buitenste (taaie) blad eraf.","Rol de stukken prei in de norivellen en snijd het uitstekende nori af.","Leg afdekfolie op de werkbank, leg de ingerolde prei erop en bestrooi met de zeste van de citroen.","Rol strak op en koel terug in de blastchiller.","Portioneer de goed afgekoelde rol met de folie eromheen."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Blastchiller", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-hoisinsaus", name:"Hoisinsaus", category:"Sauzen & emulsies", yield:"≈ 3,5 l",
    ingredients:[{item:"Sesamolie",amount:"200 g"},{item:"Five spice",amount:"25 g"},{item:"Rijstazijn (of wittewijnazijn)",amount:"300 ml"},{item:"Honing",amount:"2000 ml"},{item:"Knoflook",amount:"40 tenen (4 bollen)"},{item:"Misopasta",amount:"500 g"},{item:"Sojasaus",amount:"600 ml"},{item:"Rode pepers",amount:"10 st"},{item:"Water (als laatste)",amount:"250 g"}],
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
    ingredients:[{item:"Knolselderij, brunoise",amount:"600 g"},{item:"Koolzaadolie",amount:"2 el"},{item:"Sjalot, in ringen",amount:"65 g"},{item:"Wortel, brunoise 5 mm",amount:"65 g"},{item:"Bleekselderij, brunoise 5 mm",amount:"75 g"},{item:"Tomatenpuree",amount:"1 el"},{item:"Rode wijn",amount:"160 ml"},{item:"Truffeljus",amount:"240 ml"},{item:"Zout",amount:"1,5 tl"},{item:"Sherryazijn",amount:"1 tl"},{item:"Xanthaangom",amount:"0,3 g"},{item:"Extra vierge olijfolie",amount:"1 el"}],
    steps:["Verwarm de oven voor op 200 °C; meng 450 g knolselderij met 1 el koolzaadolie en rooster ± 30 min donkerbruin.","Doe de geroosterde knolselderij in een sauspan met 1,5 l water, breng aan de kook en haal direct van het vuur; laat 45 min afgedekt staan.","Laat uitlekken op een fijne zeef en bewaar de vloeistof.","Verhit de overige olie, voeg sjalot, wortel, bleekselderij en de resterende 150 g knolselderij toe en sauteer ± 10 min tot gekaramelliseerd.","Bak de tomatenpuree 5 min mee; blus af met de rode wijn en kook in tot bijna droog.","Voeg de knolselderijvloeistof en truffeljus toe en laat in ± 1 uur langzaam inkoken tot ± 350 ml.","Zeef de saus, breng op smaak met zout en sherryazijn en bind met de xanthaangom.","Monteer de saus met de olijfolie."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-hummus-geroosterde-biet", name:"Hummus van geroosterde biet", category:"Purees", yield:"≈ 1 kg",
    ingredients:[{item:"Rode bieten",amount:"3 st"},{item:"Ui",amount:"1 st"},{item:"Knoflook",amount:"2 tenen"},{item:"Kikkererwten uit blik, uitgelekt",amount:"415 g"},{item:"Peterselie",amount:"15 g"},{item:"Sesampasta",amount:"30 ml"},{item:"Olijfolie",amount:"60 ml"},{item:"Water",amount:"60 ml"},{item:"Citroensap",amount:"van 1 st"},{item:"Zout en peper",amount:"naar behoefte"}],
    steps:["Verhit de barbecue tot 200 °C of pof in de oven.","Leg de bieten met de ui, knoflook, zout en peper in aluminium op de barbecue.","Rooster de bieten in 1 uur gaar; draai halverwege om.","Maal ondertussen de kikkererwten, peterselie, tahin, olijfolie, water en citroensap fijn.","Pel de geroosterde bieten, ui en knoflook, voeg toe en maal glad."],
    endorsements:[], chefsPick:false, baseId:"map-pompoenhummus", isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Black Bastard / oven", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-dukkah", name:"Dukkah", category:"Kruiden & zout", yield:"≈ 1,2 kg",
    ingredients:[{item:"Notenmix",amount:"1 kg"},{item:"Gebakken uitjes",amount:"100 g"},{item:"Komijn",amount:"10 g"},{item:"Gemberpoeder",amount:"5 g"},{item:"Anijszaad",amount:"5 g"},{item:"Nootmuskaatpoeder",amount:"5 g"},{item:"Gerookt paprikapoeder",amount:"5 g"},{item:"Chilipoeder",amount:"2 g"},{item:"Za'atar",amount:"5 g"},{item:"Sesamzaad",amount:"20 g"},{item:"Limoenrasp",amount:"naar behoefte"},{item:"Citroenrasp",amount:"naar behoefte"},{item:"Maldonzout en peper",amount:"naar behoefte"}],
    steps:["Draai de notenmix met de gebakken uitjes tot een grof kruim.","Rooster het kruim met alle specerijen en het sesamzaad 15 min in de oven op 180 °C.","Laat afkoelen en breng op smaak met de rasp, het zout en de peper."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-geroosterde-spruiten", name:"Geroosterde spruiten", category:"Tuin · geroosterd", yield:"5 kg",
    ingredients:[{item:"Spruiten",amount:"5 kg"},{item:"Zonnebloemolie",amount:"100 ml"},{item:"Sesamzaad",amount:"100 g"},{item:"Peper en zout",amount:"naar smaak"}],
    steps:["Maak de spruiten schoon en halveer de grote.","Besprenkel met zonnebloemolie, sesamzaad, peper en zout.","Rooster in de oven op 200 °C, 2× 6 min."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-courgettejam", name:"Courgettejam", category:"Chutney & jam", yield:"± 5 potten",
    ingredients:[{item:"Courgette",amount:"1 kg"},{item:"Geleisuiker",amount:"1 kg"},{item:"Citroenen",amount:"2 st"},{item:"Sinaasappel",amount:"1 st"},{item:"Oregano",amount:"0,2 g"},{item:"Verse basilicum",amount:"1 el"},{item:"Tijm",amount:"1 el"},{item:"Laurierblad",amount:"1 st"},{item:"Gemalen kaneel",amount:"2 tl"}],
    steps:["Ontdoe de courgette van zaadlijsten maar schil hem niet; pers de citroenen en rasp ze, pers ook de sinaasappel uit.","Rasp de courgette in de keukenmachine en meng het sinaasappelsap, citroensap, de rasp en de kruiden erdoor (kruiden eerst laten bevriezen in de diepvries en daarna fijnknijpen); voeg dan de kaneel toe.","Zet op het vuur, meng de geleisuiker erdoor en laat 4 minuten borrelen.","Doe het mengsel in schoongemaakte potjes."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-aardbeisambal", name:"Aardbeisambal", category:"Sauzen & emulsies", yield:"≈ 1 l",
    ingredients:[{item:"Rode pepers met zaadjes, grof gehakt",amount:"20 st"},{item:"Rawit",amount:"5 st"},{item:"Aardbeien",amount:"750 g"},{item:"Uien, grof gesneden",amount:"5 st"},{item:"Knoflook",amount:"10 tenen"},{item:"Suiker",amount:"8–10 tl, naar smaak"},{item:"Zout",amount:"2,5 tl"},{item:"Olie",amount:"5 el"},{item:"Limoensap",amount:"van 1 st"}],
    steps:["Was de aardbeien en maak ze schoon (kroontjes eraf).","Hak de ui, knoflook en pepers fijn in de mixer.","Verhit de olie en fruit het mengsel aan.","Voeg de suiker en het zout toe.","Plet of prak de aardbeien, voeg de puree toe en verwarm kort.","Proef en breng op smaak met limoen."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-appelcrumble", name:"Appelcrumble", category:"Zoet & patisserie", yield:"1 schaal",
    ingredients:[{item:"Flinke appels",amount:"9 st"},{item:"Suiker (vulling)",amount:"150 g"},{item:"Kaneel",amount:"6 tl"},{item:"— Crumble: ongezouten roomboter",amount:"225 g"},{item:"Bloem",amount:"300 g"},{item:"Suiker",amount:"300 g"},{item:"Zout",amount:"snuf"}],
    steps:["Meng de appels met de suiker en kaneel voor de vulling.","Doe alle crumble-ingrediënten in een kom; wrijf de boter met je vingers fijn en kneed tot een stevig maar kruimelig deeg.","Strooi het kruimeldeeg over het appelmengsel.","Bak de crumble in 30 min op 190 °C."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-bloemkool-oven", name:"Bloemkool uit de oven met bloemkoolcrème", category:"Tuin · geroosterd", yield:"1 kool",
    ingredients:[{item:"Grote bloemkool",amount:"1 st"},{item:"Boter",amount:"100 g"},{item:"Paprikapoeder",amount:"1 tl"},{item:"Gedroogde oregano",amount:"1 tl"},{item:"Komijn",amount:"1 tl"},{item:"Knoflookpoeder",amount:"1 tl"},{item:"Kurkuma",amount:"1 tl"},{item:"— Crème: bloemkoolbladeren",amount:"van de kool"},{item:"Cashewnoten, gebrand",amount:"2 el"},{item:"Citroensap",amount:"van 1 st"},{item:"Olijfolie",amount:"2 el"},{item:"Tahin",amount:"2 el"},{item:"Griekse yoghurt",amount:"4 el"},{item:"Verse groene kruiden",amount:"royaal"}],
    steps:["Verwijder de bladeren van de bloemkool (bewaar voor de crème) en snijd de stronk eraf.","Smelt de boter tot hij schuimt en bruin wordt; voeg de specerijen toe en laat trekken.","Bestrijk de bloemkool rondom met de boter.","Gaar in de oven op 200 °C + 50% stoom, 20–30 min, tot goudbruin en mals.","Crème: blancheer de bloemkoolbladeren tot ze zacht en groen zijn.","Draai fijn in de blender met verse kruiden; voeg cashewnoten, citroensap en olijfolie toe.","Voeg als laatste tahin en yoghurt toe en breng op smaak met peper en zout."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Combisteamer", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-bottenbouillon", name:"Bottenbouillon", category:"Fonds & bouillon", yield:"± 25 l",
    ingredients:[{item:"Water",amount:"30 l"},{item:"Runderbotten",amount:"15 kg"},{item:"Uien",amount:"15 st"},{item:"Knoflook",amount:"4 bollen"},{item:"Tijm",amount:"10 bosjes"},{item:"Tomaten",amount:"10 st"},{item:"Snijresten groenten (knolselderij, wortel, prei, ui)",amount:"royaal"},{item:"Laurier",amount:"10 blaadjes"},{item:"Jeneverbessen",amount:"20 st"},{item:"Peperkorrels",amount:"20 st"},{item:"Zout",amount:"2 el"}],
    steps:["Bruneer de botten 45 min in de oven op 250 °C; rooster de uien en knoflook ± 20 min mee op 250 °C.","Vul de Vario met het water en zet op het programma bouillon.","Doe de botten en uien met de overige ingrediënten in de Vario.","Laat de hele dag op het programma bouillon staan; zet 's nachts op sous-vide 94 °C.","Breng de volgende dag 1 uur goed aan de kook en haal alle botten en groenten eruit.","Breng op smaak met zout en peper en haal de bouillon door een koffiefilter.","Pasteuriseren: breng de bouillon terug aan de kook en stoom de lege potten met deksel 20 min op 100 °C.","Vul de potten met de hete bouillon, draai de deksels erop en pasteuriseer 50 min op 135 °C (combi)stomen.","Laat 30–45 min afkoelen in de oven op een kier, daarna 1 à 2 uur op kamertemperatuur, en zet koud."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Rundvlees", ferment:false, gear:"Vario / combisteamer", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-baba-ganoush", name:"Baba ganoush", category:"Purees", yield:"grote batch",
    ingredients:[{item:"Aubergines",amount:"10 st"},{item:"Knoflook",amount:"10 teentjes"},{item:"Tahini",amount:"3 el"},{item:"Komijnpoeder",amount:"3 tl"},{item:"Citroenen",amount:"3 st"},{item:"Olijfolie",amount:"scheut"},{item:"Peper en zout",amount:"naar smaak"}],
    steps:["Verwarm de oven op 180 °C.","Halveer de aubergines in de lengte, kerf de snijkant ruitvormig in, besprenkel met olijfolie en bak ± 45 min met de snijkant naar boven tot het vruchtvlees zacht is.","Pof de knoflookteentjes in aluminiumfolie mee in de oven.","Schraap het vruchtvlees uit de schil en draai in de keukenmachine met de gepofte knoflook (zonder velletje), tahini, komijnpoeder en 2 el olijfolie tot een grove puree.","Breng op smaak met zest en sap van de citroen, peper en zout, en eventueel extra komijn of olijfolie."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Zomer","Herfst"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-champignonsaus", name:"Champignonsaus voor pasta", category:"Sauzen & emulsies", yield:"grote pan",
    ingredients:[{item:"Gesnipperde uien",amount:"1500 g"},{item:"Kastanjechampignons in parten",amount:"4 kg"},{item:"Knoflook, fijn",amount:"32 tenen"},{item:"Slagroom",amount:"2000 ml"},{item:"Volle melk",amount:"2000 ml"},{item:"Tijm",amount:"16 takjes"},{item:"Oude kaas, geraspt",amount:"600 g"},{item:"Peper en zout",amount:"naar smaak"}],
    steps:["Snijd alle groenten en rasp de kaas alvast.","Fruit de ui aan, voeg de knoflook toe en fruit even mee.","Doe de champignons erbij en bak even mee.","Giet de melk en room erop, voeg de tijm toe en laat 5–10 min koken.","Voeg de kaas toe en breng op smaak met peper en zout."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Herfst","Winter"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-basismayonaise", name:"Basismayonaise (63-gradeneieren)", category:"Sauzen & emulsies", yield:"≈ 4 l",
    ingredients:[{item:"Eieren, 1,5 uur gestoomd op 63 °C",amount:"10 st"},{item:"Wittewijnazijn",amount:"100 g"},{item:"Zout",amount:"30 g"},{item:"Gemalen zwarte peper",amount:"10 g"},{item:"Fijne mosterd",amount:"150 g"},{item:"Zonnebloemolie",amount:"3 l"}],
    steps:["Stoom de eieren 1,5 uur op 63 °C en koel terug.","Doe alles behalve de olie samen in de Magimix.","Draai fijn en voeg de olie druppelsgewijs toe."],
    endorsements:[], chefsPick:false, baseId:null, isBase:true, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:"Stoomoven", updatedBy:"Stef", updatedAt:"nieuw" },
  { id:"map-broodpudding", name:"Broodpudding", category:"Zoet & patisserie", yield:"1 bakblik",
    ingredients:[{item:"Melk",amount:"2250 g"},{item:"Ei",amount:"720 g"},{item:"Suiker",amount:"900 g"},{item:"Rozijnen, geweld",amount:"225 g"},{item:"Brood",amount:"1350 g"},{item:"Kaneel / garam masala / five spice",amount:"naar keuze"},{item:"Citroenrasp",amount:"van 1 st"}],
    steps:["Vermeng de melk met de eieren.","Voeg suiker, kaneelpoeder en de citrusrasp toe en roer goed door.","Snijd het brood in kleine stukken en laat weken in het melkmengsel.","Roer het brood door met een garde tot een soort beslag ontstaat.","Voeg tot slot de rozijnen toe.","Giet in een bakblik en gaar 60 min in een op 160 °C voorverwarmde oven."],
    endorsements:[], chefsPick:false, baseId:null, isBase:false, season:["Hele jaar"], garden:false, diet:"Vegetarisch", ferment:false, gear:null, updatedBy:"Stef", updatedAt:"nieuw" },
];

const LIBRARY = buildLibrary();
const initialRecipes = [...CURATED, ...PATISSERIE, ...KEUKENMAP, ...LIBRARY];

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
  const [section, setSection] = useState("home");
  const [recipes, setRecipes] = useState(initialRecipes);
  const [dishes, setDishes] = useState(seedDishes);
  const [batches, setBatches] = useState(seedBatches);
  const [loaded, setLoaded] = useState(false);
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
  const [calcOpen, setCalcOpen] = useState(false);
  const [checkDone, setCheckDone] = useState(null);
  const [newPairing, setNewPairing] = useState(0);
  const [haccpLogs, setHaccpLogs] = useState([]);
  const [haccpRecords, setHaccpRecords] = useState([]);
  const [werkDocs, setWerkDocs] = useState([]); // aanpassingen/nieuwe werkwijze-documenten
  const [stock, setStock] = useState([]); // voorraad
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
    if (!live) { setLoaded(true); return; }
    const [ov, cu, en, pk, di, ba, hi, fp, dh, ct, cl, tn, hc, hr, wd, vs] = await Promise.all([
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
    setCleaningLogs((cl.data || []).map((r) => ({ id: r.id, taskId: r.task_id, doneDate: String(r.done_date || "").slice(0, 10), doneBy: r.done_by, note: r.note || "", edits: Array.isArray(r.edits) ? r.edits : [] })));
    setHaccpLogs((hc.data || []).map((r) => ({ id: r.id, checkDate: String(r.check_date || "").slice(0, 10), doneBy: r.done_by, values: r.values || {}, calibration: r.calibration || {}, note: r.note || "", edits: Array.isArray(r.edits) ? r.edits : [] })));
    setHaccpRecords((hr.data || []).map((r) => ({ id: r.id, kind: r.kind, date: String(r.record_date || "").slice(0, 10), by: r.done_by, note: r.note || "", ...(r.data || {}) })));
    setWerkDocs((wd.data || []).map((r) => ({ id: r.id, title: r.title, intro: r.intro || "", sections: Array.isArray(r.sections) ? r.sections : [], updatedBy: r.updated_by || "" })));
    setStock((vs.data || []).map((r) => ({ id: r.id, product: r.product, qty: r.qty === null ? 0 : Number(r.qty), initialQty: r.initial_qty === null ? 0 : Number(r.initial_qty), unit: r.unit || "", ingredients: Array.isArray(r.ingredients) ? r.ingredients : [], productionDate: String(r.production_date || "").slice(0, 10), expiryDate: String(r.expiry_date || "").slice(0, 10), by: r.made_by || "", recipeId: r.recipe_id || null, storage: r.storage || "" })));
    const tnMap = { ...TECH_NOTES_SEED };
    (tn.data || []).forEach((r) => { if (Array.isArray(r.lines) && r.lines.length) tnMap[r.key] = r.lines; });
    setTechNotes(tnMap);
    setLoaded(true);
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
      saltPct: b.salt_pct === null ? null : Number(b.salt_pct), tempC: b.temp_c === null ? null : Number(b.temp_c), amount: b.amount,
      pH: b.ph === null ? null : Number(b.ph), sugarPct: b.sugar_pct === null || b.sugar_pct === undefined ? null : Number(b.sugar_pct), notes: b.notes || "", done: !!b.done, by: b.by || "—",
      finishedDate: String(b.finished_date || "").slice(0, 10) || null, log: Array.isArray(b.log) ? b.log : [], actionsDone: Array.isArray(b.actions_done) ? b.actions_done : [],
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
  // Vervangt het bovenste scherm zonder history.back() (dat is asynchroon en
  // botst met een directe push — zie eindmeting-flow).
  const replaceTop = (sNew) => setStack((st) => [...st.slice(0, -1), sNew]);
  const goBack = () => { if (stack.length > 1) { try { window.history.back(); } catch (e) { back(); } } };
  const goHome = () => { resetTo({ screen: "list" }); setSection("home"); };
  // Op formulieren geen navigatiebalk: één tik zou anders je invoer weggooien.
  const FORM_SCREENS = new Set(["recipeForm", "dishForm", "batchForm", "voorraadForm", "werkDocForm", "fermentGuideForm", "techTableForm", "haccpForm", "haccpRecordForm", "noteForm", "batchEindmeting"]);
  const calcOpenRef = React.useRef(false);
  useEffect(() => { calcOpenRef.current = calcOpen; }, [calcOpen]);
  useEffect(() => {
    const onPop = () => {
      if (calcOpenRef.current) { setCalcOpen(false); try { window.history.pushState({ app: "ritme" }, ""); } catch (e) {} return; }
      setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // Escape sluit eerst de rekenmachine.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && calcOpenRef.current) { e.preventDefault(); setCalcOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const openCalc = () => { setCalcOpen(true); try { window.history.pushState({ app: "ritme", calc: true }, ""); } catch (e) {} };
  const closeCalc = () => { setCalcOpen(false); };
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

  // Gemiste (vrije) dagen automatisch registreren zodra de data er is.
  useEffect(() => { if (loaded && user && user.canEdit) { backfillDaysOff(); pruneOldRecords(); } }, [loaded, user]);

  // Melding bij inloggen (alleen koks): batches die klaar zijn of een handeling vragen.
  const [noticeShown, setNoticeShown] = useState(false);
  useEffect(() => {
    if (!user || !user.canEdit || !loaded || noticeShown) return;
    const { ready, due } = collectNotices(batches);
    const n = ready.length + due.length;
    const exp = stock.filter((v) => v.qty > 0 && v.expiryDate && daysUntil(v.expiryDate) !== null && daysUntil(v.expiryDate) <= 7).length;
    setNoticeShown(true); // hoe dan ook maar één keer per sessie proberen
    const parts = [];
    if (n > 0) parts.push(n === 1 ? "1 batch vraagt aandacht" : n + " batches vragen aandacht");
    if (exp > 0) parts.push(exp === 1 ? "1 voorraadproduct nadert de houdbaarheidsdatum" : exp + " voorraadproducten naderen de houdbaarheidsdatum");
    if (parts.length) flash(parts.join(" · "));
  }, [user, loaded, batches, stock, noticeShown]);
  const [stockNoticeClosed, setStockNoticeClosed] = useState(null); // per dag te sluiten
  const [checkForDate, setCheckForDate] = useState(null); // heropende dag die opnieuw ingevuld wordt
  const [techFocus, setTechFocus] = useState(null); // kaart op de Werkwijze-pagina die open moet
  const openTech = (key) => { setTechFocus(key); setSection("technieken"); resetTo({ screen: "list" }); };

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
      const rec = { ...stamped, id: "r" + Date.now(), endorsements: [], chefsPick: false, baseId: stamped.baseId || null, isBase: false,
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
    const b = { ...data, id: "b" + Date.now(), by: user.name, finishedDate: null, log: data.log || [] };
    if (!(await persistBatch(b))) return;
    setBatches((bs) => [b, ...bs]);
    flash("Batch geregistreerd");
  };
  const addBatchMeasurement = async (id, m) => {
    const b = batches.find((x) => x.id === id);
    if (!b) return;
    const nm = (x) => { const v = String(x ?? "").replace(",", ".").trim(); return v === "" || isNaN(Number(v)) ? null : Number(v); };
    const entry = { date: m.date, ph: nm(m.ph), brix: nm(m.brix), tempC: nm(m.tempC), note: m.note || "", by: user.name };
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
  const signCleaning = async (taskId, quiet, forDate) => {
    const today = forDate || localDate();
    const row = { id: "cl" + Date.now(), taskId, doneDate: today, doneBy: user.name, note: "", edits: [] };
    if (live) {
      const { error } = await supabase.from("cleaning_logs").insert({ id: row.id, task_id: taskId, done_date: today, done_by: user.name, note: "", edits: [] });
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => [row, ...ls]);
    if (!quiet) flash("Afgetekend door " + user.name, () => removeCleaningLog(row.id, true));
    return row.id;
  };
  const markDayDone = async (forDate) => {
    const today = forDate || localDate();
    if (cleaningLogs.some((l) => l.taskId === DAY_DONE_ID && l.doneDate === today)) return;
    const row = { id: "dd" + Date.now(), taskId: DAY_DONE_ID, doneDate: today, doneBy: user.name, note: "", edits: [] };
    if (live) {
      const { error } = await supabase.from("cleaning_logs").insert({ id: row.id, task_id: DAY_DONE_ID, done_date: today, done_by: user.name, note: "", edits: [] });
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => [row, ...ls]);
    setCheckOpen(false);
    setCheckForDate(null);
    setCheckDone({ key: localDate(), stage: 2 }); // popup vandaag niet meer openen
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
    if (cleaningLogs.some((l) => (l.taskId === DAY_OFF_ID || l.taskId === DAY_DONE_ID) && l.doneDate === d)) return;
    const row = { id: "off" + Date.now(), taskId: DAY_OFF_ID, doneDate: d, doneBy: user.name, note: "Bedrijf dicht", edits: [] };
    if (live) {
      const { error } = await supabase.from("cleaning_logs").insert({ id: row.id, task_id: DAY_OFF_ID, done_date: d, done_by: user.name, note: "Bedrijf dicht", edits: [] });
      if (dbFail(error)) return;
    }
    setCleaningLogs((ls) => [row, ...ls]);
    if (d === localDate()) { setCheckOpen(false); setCheckDone({ key: d, stage: 2 }); }
    setCheckOpen(false); setCheckForDate(null);
    flash("Geregistreerd als vrije dag", () => removeCleaningLog(row.id, true));
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
  const saveHaccpRecord = async (data, editingId) => {
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
    const row = { id: "hr" + Date.now(), kind, date, by: user.name, note, ...fields };
    if (live) {
      const { error } = await supabase.from("haccp_records").insert({ id: row.id, kind, record_date: date, done_by: user.name, note, data: fields });
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
  };
  const saveTechTable = async (tableKey, rows) => {
    const cfg = TECH_TABLE_CONFIGS[tableKey];
    const row = { id: cfg.docId, title: cfg.title, intro: "", sections: rows, updatedBy: user.name };
    if (live) {
      const { error } = await supabase.from("werkwijze_docs").upsert({ id: cfg.docId, title: cfg.title, intro: "", sections: rows, updated_by: user.name, updated_at: new Date().toISOString() });
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
    const nv = { id: "st" + Date.now(), ...data, by: user.name };
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
    const rows = [["Product", "Gemaakt in " + jaar, "Verpakkingseenheid", "Productiedatum", "Houdbaar tot", "Dagen houdbaar", "Opslaglocatie", "Ingevoerd door"]];
    // Gegroepeerd per productiemaand, chronologisch; zonder datum achteraan.
    const maandVan = (v) => { const m = Number(String(v.productionDate || "").slice(5, 7)); return m >= 1 && m <= 12 ? m : 13; };
    const maanden = [...new Set(items.map(maandVan))].sort((a, b) => a - b);
    maanden.forEach((m) => {
      rows.push([]);
      rows.push([m === 13 ? "ZONDER PRODUCTIEDATUM" : MAANDEN[m - 1].toUpperCase() + " " + jaar]);
      items
        .filter((v) => maandVan(v) === m)
        .sort((a, b) => (a.productionDate || "") < (b.productionDate || "") ? -1 : (a.productionDate || "") > (b.productionDate || "") ? 1 : a.product.localeCompare(b.product, "nl"))
        .forEach((v) => {
          rows.push([v.product, String(v.initialQty).replace(".", ","), v.unit, v.productionDate || "", v.expiryDate || "", dagen(v), v.storage || "", v.by || ""]);
        });
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
    const row = { id, title: data.title, intro: data.intro, sections: data.secties, updatedBy: user.name };
    if (live) {
      const { error } = await supabase.from("werkwijze_docs").upsert({ id, title: row.title, intro: row.intro, sections: row.sections, updated_by: user.name, updated_at: new Date().toISOString() });
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
    const row = { id: FERMENT_DOC_ID, title: "Fermenteren", intro: "", sections: rows, updatedBy: user.name };
    if (live) {
      const { error } = await supabase.from("werkwijze_docs").upsert({ id: FERMENT_DOC_ID, title: "Fermenteren", intro: "", sections: rows, updated_by: user.name, updated_at: new Date().toISOString() });
      if (dbFail(error)) return;
    }
    setWerkDocs((ds) => [...ds.filter((d) => d.id !== FERMENT_DOC_ID), row]);
    flash("Fermenteerlijst bijgewerkt");
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
  // Wacht op de geladen teamdata: anders lijkt een al afgeronde dag nog open.
  useEffect(() => {
    if (!user || !user.canEdit || !loaded) return;
    let cancelled = false;
    const dayMarked = (l, key) => (l.taskId === DAY_DONE_ID || l.taskId === DAY_OFF_ID) && String(l.doneDate).slice(0, 10) === key;
    const tick = async () => {
      if (checkOpen || checkForDate) return; // popup staat al open (of heropende dag wordt ingevuld)
      const now = new Date();
      const key = localDate(now);
      const past1 = now.getHours() > CHECK_HOUR || (now.getHours() === CHECK_HOUR && now.getMinutes() >= CHECK_MIN);
      const past2 = now.getHours() >= REMIND_HOUR; // tweede herinnering
      if (!past1) return;
      const cd = checkDone && checkDone.key === key ? checkDone : null;
      // trap 1 nog niet gezien → tonen; trap 1 weggeklikt en het is na REMIND_HOUR → nogmaals tonen
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
          if ((data || []).some((r) => String(r.done_date).slice(0, 10) === key)) { loadShared(); return; }
        } catch (e) { /* bij twijfel gewoon tonen */ }
      }
      if (cancelled) return;
      setCheckOpen(true);
      setCheckDone({ key, stage: now.getHours() >= REMIND_HOUR ? 2 : 1 });
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user, loaded, checkDone, cleaningLogs]);
  // Rondt een collega de dag intussen af (realtime), sluit de popup dan vanzelf.
  useEffect(() => {
    if (!checkOpen) return;
    const key = localDate();
    if (!checkForDate && cleaningLogs.some((l) => (l.taskId === DAY_DONE_ID || l.taskId === DAY_OFF_ID) && String(l.doneDate).slice(0, 10) === key)) setCheckOpen(false);
  }, [cleaningLogs, checkOpen]);

  if (!user) return <><BrandCSS /><Login onPick={setUser} live={live} /></>;
  const openRecipe = (id) => { bumpOpenCount(id); push({ screen: "recipeDetail", id }); };
  const fabAction = () => {
    if (section === "gerechten") push({ screen: "dishForm", editing: null });
    else if (section === "recepten") push({ screen: "recipeForm", editing: null });
    else if (section === "fermentatie") push({ screen: "batchForm", prefill: null });
    else if (section === "smaak") setNewPairing((n) => n + 1);
    else if (section === "voorraad") push({ screen: "voorraadForm", editing: null, prefill: null });
  };
  const showFab = current.screen === "list" && canEdit && section !== "technieken" && section !== "schoonmaak" && section !== "home";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: T.paper, color: "#33352c" }}>
      <BrandCSS />
      <Header user={user} onHome={goHome} onOpenSettings={() => push({ screen: "settings" })} onSignOut={() => { if (live) supabase.auth.signOut(); setUser(null); resetTo({ screen: "list" }); }} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pb-28">
        {!FORM_SCREENS.has(current.screen) && (
          <SectionNav section={current.screen === "list" ? section : null}
            setSection={(s) => { setSection(s); setSearch(""); if (current.screen !== "list") resetTo({ screen: "list" }); }} />
        )}
        {current.screen === "list" && (
          <div {...swipe}>
            {canEdit && !dismissedNotices[todayKey] && (
              <NoticeBanner batches={batches} canAck={canEdit} onAck={ackAction} onOpen={() => setSection("fermentatie")} onDismiss={() => setDismissedNotices((d) => ({ ...d, [todayKey]: true }))} />
            )}
            {section === "home" && <HomeScreen stock={stock} recipes={recipes} batches={batches} dishes={dishes} onOpenRecipe={openRecipe} onOpenDish={(id) => push({ screen: "dishDetail", id })} onGoSection={(sec) => setSection(sec)} />}
            {section === "gerechten" && <DishList dishes={dishes} search={search} setSearch={setSearch} onOpen={(id) => push({ screen: "dishDetail", id })} />}
            {section === "recepten" && <RecipeList recipes={recipes} openCounts={openCounts} stock={stock} search={search} setSearch={setSearch} onOpen={openRecipe} />}
            {section === "fermentatie" && <FermentList batches={batches} recipes={recipes} stock={stock} canEdit={canEdit} onExtend={extendBatch} onToggleDone={toggleBatchDone} onDeleteBatch={deleteBatch} onEditBatch={(id) => push({ screen: "batchForm", editing: id })} onOpenLog={(id) => push({ screen: "batchLog", id })} onOpenRecipe={openRecipe} onNewFermentRecipe={() => push({ screen: "recipeForm", editing: null, fermentDefault: true })} onStartBatch={() => push({ screen: "batchForm", prefill: null })} onAck={ackAction} />}
            {section === "smaak" && <FlavorList pairings={pairings} canEdit={canEdit} onSave={savePairing} onReset={resetPairing} openNew={newPairing} onOpenedNew={() => setNewPairing(0)} onSearchRecipes={(n) => { setSection("recepten"); setSearch(n); }} />}
            {section === "voorraad" && <VoorraadList stock={stock} canEdit={canEdit} onDec={decStock} onEdit={(id) => push({ screen: "voorraadForm", editing: id, prefill: null })} onDelete={deleteStock} onExport={exportStockExcel} noticeClosed={stockNoticeClosed === todayKey} onCloseNotice={() => setStockNoticeClosed(todayKey)} />}
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
              onDeleteTask={deleteCleaningTask}  onReopenOff={(logId, date) => { removeCleaningLog(logId, true); setCheckForDate(date); setCheckOpen(true); }} />}
          </div>
        )}
        {current.screen === "dishDetail" && <DishDetail dish={dishById(current.id)} recipeById={recipeById} canEdit={canEdit} onBack={goBack} onEdit={() => push({ screen: "dishForm", editing: current.id })} onOpenRecipe={openRecipe} onDelete={deleteDish} />}
        {current.screen === "recipeDetail" && (() => { const r = recipeById(current.id); return (
          <RecipeDetail recipe={r} user={user} canEdit={canEdit} usageCount={usageCount(current.id)}
            baseRecipe={r?.baseId ? recipeById(r.baseId) : null} variations={variationsOf(current.id)}
            onBack={goBack} onEdit={() => push({ screen: "recipeForm", editing: current.id })} onEndorse={toggleEndorse}
            openCount={openCounts[current.id] || 0} onOpenRecipe={openRecipe} onDelete={deleteRecipe}
            onStartBatch={() => push({ screen: "batchForm", prefill: r })}
            onAddStock={() => push({ screen: "voorraadForm", editing: null, prefill: { product: r.name, ingredients: Array.isArray(r.ingredients) ? r.ingredients : [], recipeId: r.id, productionDate: localDate(), shelfDays: r.shelfDays || null, yieldAmount: r.yieldAmount || null, yieldUnit: r.yieldUnit || "" } })}
            onOpenTech={openTech} />
        ); })()}
        {current.screen === "dishForm" && <DishForm dish={current.editing ? dishById(current.editing) : null} draft={dishDraft} allRecipes={recipes} recipeById={recipeById}
          onNewRecipe={(st) => { setDishDraft(st); push({ screen: "recipeForm", editing: null, fromDish: true }); }}
          onCancel={() => { setDishDraft(null); goBack(); }}
          onSave={(d) => { setDishDraft(null); saveDish(d, current.editing); goBack(); }} />}
        {current.screen === "recipeForm" && <RecipeForm recipe={current.editing ? recipeById(current.editing) : null} fermentDefault={!!current.fermentDefault} allRecipes={recipes} onCancel={goBack}
          onSave={async (d) => { const newId = await saveRecipe(d, current.editing);
            if (current.fromDish && newId) setDishDraft((dr) => (dr ? { ...dr, recipeIds: [...(dr.recipeIds || []), newId] } : dr));
            goBack(); }} />}
        {current.screen === "batchForm" && <BatchForm prefill={current.prefill} editing={current.editing ? batches.find((b) => b.id === current.editing) : null} fermentRecipes={recipes.filter((r) => r.ferment)} onCancel={goBack} onSave={(d) => { saveBatch(d, current.editing); setSection("fermentatie"); goBack(); }} />}
        {current.screen === "batchLog" && <BatchLogScreen batch={batches.find((b) => b.id === current.id)} canEdit={canEdit} onBack={goBack} onAdd={(m) => { addBatchMeasurement(current.id, m); goBack(); }} onDeleteRow={(i) => deleteBatchMeasurement(current.id, i)} />}
        {current.screen === "batchEindmeting" && <EindmetingForm batch={batches.find((b) => b.id === current.id)} onCancelBack={goBack} onSkip={() => finishEindmeting(current.id, null)} onSave={(m) => finishEindmeting(current.id, m)} />}
        {current.screen === "haccpForm" && <HaccpForm editing={current.editing ? haccpLogs.find((l) => l.id === current.editing) : null} onCancel={goBack} onSave={(d) => { saveHaccp(d, current.editing); goBack(); }} />}
        {current.screen === "haccpRecordForm" && <HaccpRecordForm kind={current.recordKind} editing={current.editing ? haccpRecords.find((r) => r.id === current.editing) : null} onCancel={goBack} onSave={(d) => { saveHaccpRecord(d, current.editing); goBack(); }} />}
        {current.screen === "werkDocForm" && <WerkwijzeDocForm editing={current.editing ? mergedWerkDocs.find((d) => d.key === current.editing) : null} onCancel={goBack} onSave={(d) => { saveWerkDoc(d, current.editing); goBack(); }} />}
        {current.screen === "fermentGuideForm" && <FermentGuideForm rows={fermentRows} onCancel={goBack} onSave={(rows) => { saveFermentGuide(rows); goBack(); }} />}
        {current.screen === "techTableForm" && <TechTableForm config={TECH_TABLE_CONFIGS[current.table]} rows={techTableRows[current.table]} onCancel={goBack} onSave={(rows) => { saveTechTable(current.table, rows); goBack(); }} />}
        {current.screen === "voorraadForm" && <VoorraadForm editing={current.editing ? stock.find((v) => v.id === current.editing) : null} prefill={current.prefill || null} allRecipes={recipes} onCancel={goBack} onSave={(d) => { saveStock(d, current.editing); goBack(); }} />}
        {current.screen === "cleaningForm" && <CleaningTaskForm task={current.editing ? cleaningTasks.find((t) => t.id === current.editing) : null} onCancel={goBack} onSave={(d) => { saveCleaningTask(d, current.editing); goBack(); }} />}
        {current.screen === "settings" && <SettingsScreen onBack={goBack} installed={installed} canInstall={!!deferredPrompt} onInstall={doInstall} />}
      </main>

      {showFab && (
        <button onClick={fabAction} className="btnp ff fixed bottom-6 right-20 sm:right-24 z-20 inline-flex items-center gap-2 rounded-full pl-4 pr-5 py-3 shadow-lg font-medium text-sm">
          <Plus size={19} /> {section === "gerechten" ? "Nieuw gerecht" : section === "recepten" ? "Nieuw recept" : section === "smaak" ? "Nieuwe smaakcombinatie" : section === "voorraad" ? "Nieuwe voorraad" : "Nieuwe batch"}
        </button>
      )}
      {user && <CalcWidget open={calcOpen} onOpen={openCalc} onClose={closeCalc} />}
      {checkOpen && canEdit && (
        <CleaningCheckModal tasks={cleaningTasks} logs={cleaningLogs} user={user} canEdit={canEdit} forDate={checkForDate}
          onSign={(tid) => signCleaning(tid, false, checkForDate || undefined)} onDayDone={() => markDayDone(checkForDate || undefined)} onDayOff={() => markDayOff(checkForDate || undefined)} onClose={() => { setCheckOpen(false); setCheckForDate(null); }}
          onOpenSection={() => { setCheckOpen(false); resetTo({ screen: "list" }); setSection("schoonmaak"); }} />
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-2xl text-sm px-4 py-2.5 shadow-lg max-w-[92vw] w-max" style={{ background: T.ink, color: T.paper }}>
          <Check size={16} className="shrink-0" />
          <span className="min-w-0">{toast.msg}</span>
          {toast.undo && <button onClick={() => { const u = toast.undo; setToast(null); u(); }} className="ff font-semibold underline shrink-0 whitespace-nowrap">Ongedaan maken</button>}
        </div>
      )}
    </div>
  );
}

// Zwevende rekenmachine, beschikbaar op elke pagina.
function CalcWidget({ open, onOpen, onClose }) {
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
        <div className="fixed bottom-24 right-4 sm:right-6 z-40 w-[16.5rem] rounded-2xl shadow-xl p-3" style={{ background: T.paper, border: "1px solid " + T.line }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-semibold uppercase tracking-widest acc">Rekenmachine</span>
            <button onClick={onClose} className="ff mute hover:opacity-70" title="Sluiten"><X size={16} /></button>
          </div>
          <div className="rounded-xl px-3 py-2 mb-2 text-right" style={{ background: "#eef1e6", minHeight: "3.2rem" }}>
            <div className="ink text-lg leading-tight break-all">{expr || "0"}</div>
            <div className="text-sm mute h-5">{result !== "" && expr !== result ? "= " + result : ""}</div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {keys.flat().map((k) => (
              <button key={k} onClick={() => tap(k)}
                className={"ff rounded-lg py-2.5 text-sm font-medium " + (k === "=" ? "btnp" : ["÷", "×", "−", "+"].includes(k) ? "pillon" : "pill")}>
                {k}
              </button>
            ))}
            <button onClick={() => tap("⌫")} className="ff pill rounded-lg py-2 text-sm font-medium col-span-4 mt-0.5 inline-flex items-center justify-center gap-1"><ArrowLeft size={14} /> Wis laatste</button>
          </div>
        </div>
      )}
      <button onClick={open ? onClose : onOpen} title="Rekenmachine"
        className="ff fixed bottom-6 right-4 sm:right-6 z-40 w-12 h-12 rounded-full shadow-lg inline-flex items-center justify-center"
        style={{ background: open ? T.green : T.paper, color: open ? T.paper : T.green, border: "1px solid " + (open ? T.green : "#cfe0c4") }}>
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
  { id: "home", label: "Home", icon: <Home size={14} /> },
  { id: "gerechten", label: "Gerechten", icon: <Utensils size={14} /> },
  { id: "recepten", label: "Recepten", icon: <Layers size={14} /> },
  { id: "fermentatie", label: "Fermenteren", icon: <FlaskConical size={14} /> },
  { id: "smaak", label: "Smaak", icon: <Blend size={14} /> },
  { id: "voorraad", label: "Voorraad", icon: <Package size={14} /> },
  { id: "technieken", label: "Werkwijze", icon: <BookOpen size={14} /> },
  { id: "schoonmaak", label: "Schoonmaak", icon: <Sparkles size={14} /> },
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
  // section is null op detailpagina’s: geen knop actief, tik navigeert terug naar de lijst.
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
    <div ref={scroller} className="sticky top-0 z-30 flex gap-1 sm:gap-1.5 overflow-x-auto pt-2 pb-1.5 -mx-4 px-4 no-scrollbar sm:justify-center" style={{ background: T.paper }}>
      {items.map((it) => (
        <button key={it.id} ref={(el) => { btns.current[it.id] = el; }} onClick={() => setSection(it.id)} className={"ff shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-1.5 text-[12px] sm:text-[12.5px] font-medium " + (section === it.id ? "pillon" : "pill")}>
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
  const fmtD = (iso) => { if (!iso) return ""; const [y, m, d] = String(iso).slice(0, 10).split("-"); return d + "-" + m + "-" + y; };
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
          <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#e8ebe0", color: T.green }}><Package size={15} /></span>
          <div className="flex-1 min-w-0">
            <div className="font-medium ink truncate">{v.product}</div>
            <div className="text-xs mute truncate">{[v.unit, v.storage, v.by, v.productionDate ? "gemaakt " + fmtD(v.productionDate) : null].filter(Boolean).join(" · ")}</div>
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
            <div className="text-xs mute truncate">{[b.method, "afgerond " + fmtD(b.finishedDate)].filter(Boolean).join(" · ")}</div>
          </div>
          <ChevronRight size={16} className="shrink-0" style={{ color: "#c4c2b2" }} />
        </button>
      )))}
    </div>
  );
}

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
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0" style={{ flex: "1 1 55%" }}><SearchBar value={search} onChange={setSearch} placeholder="Zoek gerechten" /></div>
        <select value={courseF} onChange={(e) => setCourseF(e.target.value)} className="input px-2.5 py-2.5 text-sm mt-4 mb-3 self-stretch" style={{ flex: "0 0 45%", width: "45%", maxWidth: "16rem" }} title="Filter op gang">
          {COURSE_FILTERS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
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

// Zoeken in recepten: uitsluitend op naam en op ingrediënten.
function matchRecipe(r, q) {
  if (!q) return true;
  return softMatchAny([r.name, (r.ingredients || []).map((i) => i.item).join(" ")], q);
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
  let shown = q
    ? recipes.filter((r) => matchRecipe(r, q))
    : recipes.filter((r) => !r.baseId);
  const cats = ["Alle", "Basisrecepten", ...[...new Set(recipes.map((r) => r.category))].sort((a, b) => a.localeCompare(b, "nl"))];
  if (catF === "Basisrecepten") shown = shown.filter((r) => r.isBase || varsOf(r.id).length > 0);
  else if (catF !== "Alle") shown = shown.filter((r) => r.category === catF);
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
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0" style={{ flex: "1 1 55%" }}><SearchBar value={search} onChange={(v) => { setSearch(v); setLimit(60); }} placeholder="Zoek op naam of ingrediënt (bv. citroen)" /></div>
        <select value={catF} onChange={(e) => { setCatF(e.target.value); setLimit(60); }} className="input px-2.5 py-2.5 text-sm mt-4 mb-3 self-stretch" style={{ flex: "0 0 45%", width: "45%", maxWidth: "16rem" }} title="Filter op categorie">
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
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
              {(() => { const vs = varsOf(r.id); if (!vs.length) return null; const top = vs.slice(0, 4); return (
                <div className="text-[12.5px] mt-1 leading-snug" style={{ color: "#5d6a52" }}>
                  <GitBranch size={11} className="inline mr-1 align-[-1px]" />
                  {top.map((v) => v.name).join(" · ")}{vs.length > top.length && <span className="mute"> +{vs.length - top.length}</span>}
                </div>
              ); })()}
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

function FermentList({ batches, recipes, stock, canEdit, onToggleDone, onDeleteBatch, onEditBatch, onOpenLog, onOpenRecipe, onNewFermentRecipe, onStartBatch, onAck, onExtend }) {
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
  const madeCount = {};
  (stock || []).forEach((v) => { if (v.recipeId) madeCount[v.recipeId] = (madeCount[v.recipeId] || 0) + 1; });
  const varsOf = (id) => recipes.filter((r) => r.baseId === id && r.ferment).sort((a, b) => (madeCount[b.id] || 0) - (madeCount[a.id] || 0) || a.name.localeCompare(b.name, "nl"));
  const query = q.trim().toLowerCase();
  // Zonder zoekterm: variaties niet los tonen; met zoekterm: zoek op naam en ingrediënten.
  let fermentRecipes = recipes.filter((r) => r.ferment && (query ? matchRecipe(r, query) : !r.baseId));
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
        <select value={methodF} onChange={(e) => { setMethodF(e.target.value); setLimit(30); }} className="input px-2.5 py-2.5 text-sm mt-4 mb-3 self-stretch" style={{ flex: "0 0 45%", width: "45%", maxWidth: "16rem" }} title="Filter op fermentatiesoort">
          {["Alle", ...FERMENT_METHODS].map((m) => <option key={m} value={m}>{m === "Alle" ? "Alle methodes" : m}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => { setTouchedActive(true); setOpenActive((o) => !o); }} className="ff inline-flex items-center gap-1" disabled={searching}>
          {!searching && (openActive ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />)}
          <Eyebrow>Actieve batches ({active.length})</Eyebrow>
        </button>
        {canEdit && <button onClick={onStartBatch} className="ff inline-flex items-center gap-1 text-xs font-medium acc hover:opacity-70 mb-2"><Plus size={14} /> Nieuwe batch</button>}
      </div>
      {showActive && (active.length > 0
        ? <div className="grid grid-cols-2 gap-2.5">{active.map((b) => <BatchCard key={b.id} b={b} canEdit={canEdit} onToggleDone={onToggleDone} onDelete={onDeleteBatch} onEdit={onEditBatch} onOpenLog={onOpenLog} onAck={onAck} onExtend={onExtend} />)}</div>
        : <Empty label="Nog geen actieve batches." />)}
      {done.length > 0 && <>
        <button onClick={() => setOpenDone((o) => !o)} className="ff mt-5 mb-2 flex items-center gap-1">
          {openDone ? <ChevronUp size={14} className="acc" /> : <ChevronDown size={14} className="acc" />}
          <Eyebrow>Afgerond ({done.length})</Eyebrow>
        </button>
        {openDone && <div className="grid grid-cols-2 gap-2.5">{done.map((b) => <BatchCard key={b.id} b={b} canEdit={canEdit} onToggleDone={onToggleDone} onDelete={onDeleteBatch} onEdit={onEditBatch} onOpenLog={onOpenLog} onAck={onAck} onExtend={onExtend} />)}</div>}
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
              {(() => { const vs = varsOf(r.id); if (!vs.length) return null; const top = vs.slice(0, 4); return (
                <div className="text-[12.5px] mt-1 leading-snug" style={{ color: "#5d6a52" }}>
                  <GitBranch size={11} className="inline mr-1 align-[-1px]" />
                  {top.map((v) => v.name).join(" · ")}{vs.length > top.length && <span className="mute"> +{vs.length - top.length}</span>}
                </div>
              ); })()}
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

function BatchCard({ b, canEdit, onToggleDone, onDelete, onEdit, onOpenLog, onAck, onExtend }) {
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
                <span className="font-medium" style={{ color: T.green }}>Laatste meting</span> <span className="ink">{last.date}</span>{parts.length > 0 && <span className="ink"> · {parts.join(" · ")}</span>}
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
    { kop: "Seizoenstapas uit de tuin van de Beug (5 borrelhapjes) — voorbeelden", regels: ["Gepofte biet | geitenkaas | dukkah | snijbiet","Gekonfijte wortel | zuurdesemkrokant | sjalotcrème","Tarte tatin van pompoen | honingkaramel","Gevulde champignon","Frittata of quiche"] },
    { kop: "Seizoenstapas vegan (5 borrelhapjes) — voorbeelden", regels: ["Gepofte biet | dukkah","Gekonfijte wortel | zuurdesemkrokant | sjalotcrème","Tarte tatin van pompoen | honingkaramel","Gevulde champignon","Filodeegkrokant | baba ganoush | mosterdsla | zonnebloempit"] },
    { kop: "Supplementen vlees", regels: ["Gehaktballetjes in tomatensaus en lavaskruiden","Buikspek met sesamlak en zoete-aardappelcrème","Tessinger plaatham op crostini","Boerenpaté op briochebrood met relish van seizoensgroenten/fruit","1 spare rib"] },
  ]},
  { key: "std-diner", title: "Diner & walking diner", intro: "Gangen met gewichten per persoon", secties: [
    { kop: "Brood", regels: ["Zuurdesembrood of breekbrood met 3 verschillende spreads en dips (bv. groene-kruidenboter | hummus | tomatensalsa)"] },
    { kop: "4-gangen shared diner (vegetarisch) — smaken uit de tuin van de Beug", regels: ["Voorgerechten standaard met zuurdesembrood en 3 soorten dips","3 voorgerechten, totaal 120 g p.p. (40 g per item) — bv. tarte tatin van pompoen | ricotta · dun gesneden koolrabi | raapstelen | kappertjes · tartaar van biet | balsamicoglaze | geglaceerde champignons | geitenkaas | walnoten","Soep 200 ml — met een lekker garnituur en eventueel iets krokants","Hoofdgerechten op tafel, totaal 300 g p.p. — linzen met gekleurde wortels en raapstelen (80 g) · krielaardappels met knoflookscheuten en tijm (75 g) · hele bloemkool geroosterd, bloemkoolcrème, dukkah, chimichurri (80 g) · gebakken polenta | oude hooikaas | groene kruiden (50 g) · salade van veldsla, radijs, ingelegde groenten, pompoenpitten en worteldressing (25 g)","Dessertvariatie, totaal 150 g p.p. (50 g per item, 2 à 3 items p.p.) — chocolademousse · panna cotta · cheesecake"] },
    { kop: "6-gangen walking diner (totaal max 500 g p.p.)", regels: ["Voorgerecht (50 g): mozaïek van prei | nori | sjalotcrème | cashewnoot","Voorgerecht 2 (50 g): tartaar van biet | geitenkaas | hazelnoten | groene olie","Soep (150 ml): knolselderijbouillon | knolselderijcompote | oesterzwam","Tussengerecht (90 g): bloemkoolsteak | bloemkoolcrème | peer-relish | dukkah","Hoofdgerecht (110 g): paddenstoelrisotto | oesterzwam | amandel | bieslookolie | oudekaaskrokant","Dessert (50 g): chocolademousse | peercompote | kruimeldeeg | kletskop | bol ijs"] },
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
function printLabel(recipe) {
  const prod = localDate();
  let tht = "";
  if (recipe.shelfDays) {
    const dt = new Date(prod + "T12:00:00");
    dt.setDate(dt.getDate() + Number(recipe.shelfDays));
    tht = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }
  const fmt = (iso) => { const [y, m, d] = iso.split("-"); return d + "-" + m + "-" + y; };
  const esc = (x) => String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const w = window.open("", "_blank");
  if (!w) { alert("Sta pop-ups toe om etiketten te printen."); return; }
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Etiket</title><style>' +
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
    ".rij{font-weight:bold;font-size:12pt;line-height:1.3;margin:0}" +
    "</style></head><body>" +
    '<div class="wrap">' +
    '<div class="naam">' + esc(recipe.name) + "</div>" +
    '<div class="rij">Gemaakt: ' + fmt(prod) + "</div>" +
    (tht ? '<div class="rij">T.H.T.: ' + fmt(tht) + "</div>" : "") +
    "</div></body></html>");
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 250);
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

function VoorraadList({ stock, canEdit, onDec, onEdit, onDelete, onExport, noticeClosed, onCloseNotice }) {
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
  const shown = yearItems.filter((v) => v.qty > 0).sort(sortFn);
  const emptyItems = yearItems.filter((v) => v.qty <= 0).sort(sortFn);
  const pastYears = [...new Set(stock.filter((v) => stockYear(v) < currentYear).map((v) => stockYear(v)))].sort((a, b) => b - a);
  const fmtQty = (n, unit) => String(n).replace(".", ",") + "×" + (unit ? " " + unit : "");
  const kaart = (v) => {
    const dgn = daysUntil(v.expiryDate);
    const verlopen = dgn !== null && dgn < 0;
    const bijna = dgn !== null && dgn >= 0 && dgn <= 3;
    const op = v.qty <= 0;
    const isOpen = open === v.id;
    const jaar = stockYear(v);
    return (
      <div key={v.id} className={"card overflow-hidden" + (isOpen ? " relative z-20" : "")} style={verlopen ? { borderColor: "#c08a7a" } : undefined}>
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => setOpen(isOpen ? null : v.id)} className="ff flex-1 min-w-0 text-left">
            <div className="serif ink text-lg leading-tight truncate" style={op ? { opacity: 0.5 } : undefined}>{v.product}</div>
            <div className="text-[12.5px] mute mt-0.5">
              {v.storage && <>{v.storage} · </>}gemaakt in {jaar}: {fmtQty(v.initialQty, v.unit)}
              {v.by && <> · {v.by}</>}
              {v.expiryDate && <> · THT {v.expiryDate}</>}
              {verlopen && <span className="ml-1 font-semibold" style={{ color: "#8a4a3a" }}>verlopen</span>}
              {bijna && <span className="ml-1 font-semibold" style={{ color: "#8a6a2a" }}>nog {dgn === 0 ? "vandaag" : dgn + (dgn === 1 ? " dag" : " dagen")}</span>}
            </div>
          </button>
          <div className="shrink-0 text-right max-w-[8.5rem]">
            <div className="serif ink text-xl leading-none" style={op ? { color: "#8a4a3a" } : undefined}>{String(v.qty).replace(".", ",")}×</div>
            <div className="text-[11px] mute truncate">{op ? "op" : (v.unit || "op voorraad")}</div>
          </div>
          {canEdit && <button onClick={() => onDec(v.id)} disabled={op} className="btnp ff shrink-0 inline-flex items-center justify-center rounded-lg w-9 h-9 disabled:opacity-40" title="1 gebruikt"><Minus size={16} /></button>}
        </div>
        {isOpen && (
          <div className="px-4 pb-3 text-sm" style={{ borderTop: "1px solid " + T.line }}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2.5 text-[12.5px]">
              <div className="flex justify-between gap-2"><span className="mute">Op voorraad</span><span className="ink font-medium">{fmtQty(v.qty, v.unit)}</span></div>
              <div className="flex justify-between gap-2"><span className="mute">Gemaakt in {jaar}</span><span className="ink font-medium">{fmtQty(v.initialQty, v.unit)}</span></div>
              {v.storage && <div className="flex justify-between gap-2"><span className="mute">Opslaglocatie</span><span className="ink font-medium">{v.storage}</span></div>}
              {v.productionDate && <div className="flex justify-between gap-2"><span className="mute">Gemaakt op</span><span className="ink font-medium">{v.productionDate}</span></div>}
              {v.expiryDate && <div className="flex justify-between gap-2"><span className="mute">Houdbaar tot</span><span className="ink font-medium">{v.expiryDate}</span></div>}
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
                <button onClick={() => onDec(v.id)} disabled={op} className="btnp ff inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold px-3 py-2 disabled:opacity-40"><Minus size={15} /> 1 gebruikt</button>
                <button onClick={() => onEdit(v.id)} className="btno ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2"><Pencil size={14} /> Bewerken</button>
                <button onClick={() => onDelete(v.id)} className="ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3 py-2" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a" }}><Trash2 size={14} /></button>
              </div>
            )}
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
              const items = stock.filter((v) => stockYear(v) === jaar && match(v)).sort(sortFn);
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
  const [qty, setQty] = useState(editing ? String(editing.qty) : (prefill && prefill.yieldAmount ? String(prefill.yieldAmount) : ""));
  const [initialQty, setInitialQty] = useState(editing ? String(editing.initialQty) : "");
  const [unit, setUnit] = useState(src.unit || (prefill && prefill.yieldUnit) || "");
  const [productionDate, setProductionDate] = useState(src.productionDate || localDate());
  const [days, setDays] = useState(prefill && prefill.shelfDays ? String(prefill.shelfDays) : "");
  const [expiryDate, setExpiryDate] = useState(editing ? (editing.expiryDate || "") : "");
  const mapStorage = (t) => { const x = (t || "").toLowerCase(); if (/vrie|vrij s|frozen/.test(x)) return "ingevroren"; if (/koel|kast/.test(x)) return "gekoeld"; return x.trim() ? "ongekoeld" : "gekoeld"; };
  const [storage, setStorage] = useState(editing ? (editing.storage || "gekoeld") : mapStorage(prefill && prefill.shelfStorage));
  const [recipeId, setRecipeId] = useState(src.recipeId || null);
  const [ings, setIngs] = useState((src.ingredients && src.ingredients.length ? src.ingredients : [{ item: "", amount: "" }]).map((i) => ({ ...i })));
  const [pick, setPick] = useState("");
  // Referentie voor het meeschalen: opbrengst + originele hoeveelheden van het recept.
  const [refYield, setRefYield] = useState(prefill && prefill.yieldAmount ? Number(prefill.yieldAmount) : null);
  const [refIngs, setRefIngs] = useState(prefill && prefill.ingredients && prefill.ingredients.length ? prefill.ingredients.map((i) => ({ ...i })) : null);
  const parseNum = (t) => { const m = String(t ?? "").match(/\d+(?:[.,]\d+)?/); return m ? Number(m[0].replace(",", ".")) : null; };
  const [refUnitNum, setRefUnitNum] = useState(parseNum((prefill && (prefill.unit || prefill.yieldUnit)) || null));
  const setIng = (i, veld, w) => setIngs((xs) => xs.map((x, j) => (j === i ? { ...x, [veld]: w } : x)));
  const addIng = () => setIngs((xs) => [...xs, { item: "", amount: "" }]);
  const delIng = (i) => setIngs((xs) => xs.filter((_, j) => j !== i));
  // Houdbaar tot = productiedatum + dagen (bij toevoegen); daarna altijd handmatig aanpasbaar.
  const computedExpiry = (() => {
    const d = Number(days);
    if (!productionDate || !days || isNaN(d) || d <= 0) return "";
    const dt = new Date(productionDate + "T12:00:00");
    dt.setDate(dt.getDate() + d);
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  })();
  const applyRecipe = (r) => {
    setProduct(r.name);
    setRecipeId(r.id);
    setIngs((r.ingredients && r.ingredients.length ? r.ingredients : [{ item: "", amount: "" }]).map((i) => ({ ...i })));
    if (r.shelfDays) setDays(String(r.shelfDays));
    if (r.shelfStorage) setStorage(mapStorage(r.shelfStorage));
    // Opbrengst van het recept → aantal + eenheid (handmatig aan te passen).
    if (r.yieldAmount) { setQty(String(r.yieldAmount)); setRefYield(Number(r.yieldAmount)); } else { setRefYield(null); }
    if (r.yieldUnit) setUnit(r.yieldUnit);
    setRefUnitNum(parseNum(r.yieldUnit));
    setRefIngs(r.ingredients && r.ingredients.length ? r.ingredients.map((i) => ({ ...i })) : null);
    setPick("");
  };
  // Wijkt het ingevulde aantal af van de receptopbrengst, dan schalen de
  // ingrediëntenhoeveelheden automatisch mee.
  // De totale hoeveelheid bepaalt de factor: aantal x (getal in de eenheid).
  // 1x "8 L" -> 1x "16 L" verdubbelt dus, net als 20 potten -> 30 potten.
  useEffect(() => {
    if (!refIngs) return;
    const q1 = Number(String(qty ?? "").replace(",", "."));
    const qtyRatio = refYield && q1 > 0 && !isNaN(q1) ? q1 / refYield : 1;
    const un = parseNum(unit);
    const unitRatio = un && refUnitNum ? un / refUnitNum : 1;
    const f = qtyRatio * unitRatio;
    if (!isFinite(f) || f <= 0) return;
    setIngs(refIngs.map((i) => ({ item: i.item, amount: Math.abs(f - 1) < 1e-9 ? i.amount : scaleAmount(i.amount, f) })));
  }, [qty, unit, refYield, refUnitNum, refIngs]);
  const pickMatches = pick.trim() ? (allRecipes || []).filter((r) => softMatchAny([r.name, r.category, r.fermentMethod], pick)).slice(0, 8) : [];
  const nm = (x) => { const v = Number(String(x ?? "").replace(",", ".")); return String(x ?? "").trim() !== "" && !isNaN(v) ? v : null; };
  const submit = () => {
    if (!product.trim()) { alert("Vul de productnaam in."); return; }
    const q1 = nm(qty);
    if (q1 === null) { alert("Vul het aantal in."); return; }
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
      {!editing && <>
        <div className="text-sm font-medium ink mb-1.5">Kies een recept <span className="mute font-normal">(vult naam, ingrediënten en houdbaarheid in)</span></div>
        <div className="relative mb-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" /><input value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Zoek een recept (ook fermentatie)" className={inputCls + " pl-9"} /></div>
        {pickMatches.length > 0 && (
          <div className="card overflow-hidden mb-4">
            {pickMatches.map((r, i) => (
              <button key={r.id} onClick={() => applyRecipe(r)} className={"ff w-full flex items-center gap-3 px-4 py-3 text-left " + (i > 0 ? "divi" : "")}>
                {r.ferment ? <FlaskConical size={15} className="acc shrink-0" /> : <ChefHat size={15} className="acc shrink-0" />}
                <div className="flex-1 min-w-0"><div className="text-sm font-medium ink truncate">{r.name}</div><div className="text-xs mute">{r.category}{r.shelfDays ? " · " + r.shelfDays + " dagen houdbaar" : ""}</div></div>
              </button>
            ))}
          </div>
        )}
      </>}
      <Field label="Product"><input className={inputCls} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="bv. Pruimenjam met rozemarijn" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={editing ? "Huidige voorraad" : "Aantal"}><input type="text" inputMode="decimal" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="bv. 20" /></Field>
        {editing
          ? <Field label="Ooit gemaakt (totaal)"><input type="text" inputMode="decimal" className={inputCls} value={initialQty} onChange={(e) => setInitialQty(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
          : <Field label="Verpakkingseenheid"><input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bv. 200 g pot" /></Field>}
      </div>
      {editing && <Field label="Verpakkingseenheid"><input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bv. 1 l vacumeerzak" /></Field>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Productiedatum"><input type="date" className={inputCls} value={productionDate} onChange={(e) => setProductionDate(e.target.value)} /></Field>
        {editing
          ? <Field label="Houdbaar tot"><input type="date" className={inputCls} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></Field>
          : <Field label="Dagen houdbaar"><input type="text" inputMode="numeric" className={inputCls} value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))} placeholder="bv. 6" /></Field>}
      </div>
      {!editing && computedExpiry && <p className="text-[13px] -mt-2 mb-4" style={{ color: T.green }}>Houdbaar tot <span className="font-semibold">{computedExpiry}</span> — later nog aan te passen via Bewerken.</p>}
      <Field label="Opslaglocatie"><select className={inputCls} value={storage} onChange={(e) => setStorage(e.target.value)}>{["ongekoeld", "gekoeld", "ingevroren"].map((o) => <option key={o} value={o}>{o}</option>)}</select></Field>
      <div className="mb-1 text-[12.5px] font-semibold uppercase tracking-widest acc">Ingrediënten</div>
      <div className="space-y-2 mb-2">
        {ings.map((i, idx) => (
          <div key={idx} className="flex gap-2">
            <input className={inputCls + " flex-1 min-w-0"} style={{ width: "auto" }} value={i.item} onChange={(e) => setIng(idx, "item", e.target.value)} placeholder="Ingrediënt" />
            <input className={inputCls} style={{ width: "7rem", flex: "0 0 7rem" }} value={i.amount} onChange={(e) => setIng(idx, "amount", e.target.value)} placeholder="Hoeveelheid" />
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
  const nothing = searching && jam.length === 0 && ice.length === 0 && roast.length === 0;
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
        {canEdit && (
          <button onClick={onNewDoc} className="btno ff w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium px-3 py-3"><Plus size={16} /> Nieuw werkwijze-document</button>
        )}
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
  const weekLogs = logs.filter((l) => l.taskId !== DAY_DONE_ID && weekKey(l.doneDate) === wk).sort((a, b) => (a.doneDate < b.doneDate ? 1 : -1));
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
          <button onClick={() => printCleaning(wk.replace("-W", " · week "), isoDate(monday) + " t/m " + isoDate(sunday), weekDays, taskName)} className="ff pill rounded-md w-7 h-7 flex items-center justify-center" title="Logboek van deze week printen"><Printer size={13} /></button>
          <button onClick={() => setWeekOffset((w) => w - 1)} className="ff pill rounded-md w-7 h-7 flex items-center justify-center" title="Vorige week"><ArrowLeft size={13} /></button>
          <span className="pillon rounded-md px-2 h-7 flex items-center text-[12.5px] font-semibold">{wk.replace("-W", " · week ")}</span>
          <button onClick={() => setWeekOffset((w) => Math.min(0, w + 1))} disabled={weekOffset >= 0} className="ff pill rounded-md w-7 h-7 flex items-center justify-center disabled:opacity-40" title="Volgende week"><ChevronRight size={13} /></button>
        </div>}
      </div>
      {logOpen && <>
      <div className="text-xs mute mb-2">{isoDate(monday)} t/m {isoDate(sunday)} · {weekLogs.length} aftekeningen</div>
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
                      {day.done && (
                        <div className="flex items-center gap-2 px-3 py-2 text-[13px]" style={{ background: "#f2f4ec", color: "#46603f" }}>
                          <Check size={14} className="shrink-0" /> <span className="flex-1">Dag afgerond door {day.done.doneBy}</span>
                          {canEdit && <button onClick={() => onReopenOff(day.done.id, day.date)} className="ff shrink-0 inline-flex items-center gap-1 text-[12.5px] font-medium underline acc" title="Afgeronde dag heropenen en opnieuw invullen"><Pencil size={12} /> Heropenen</button>}
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
function HaccpBlock({ logs, canEdit, onOpen, onEdit, onDelete, onPrint }) {
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
        <div className="flex items-center gap-3 mb-2">
          {onPrint && <button onClick={onPrint} className="ff inline-flex items-center gap-1 text-sm font-medium acc hover:opacity-70" title="Heel het HACCP-logboek printen"><Printer size={15} /> Print</button>}
          {canEdit && <button onClick={() => onOpen(null)} className="ff inline-flex items-center gap-1 text-sm font-medium acc hover:opacity-70"><Plus size={15} /> Meting invullen</button>}
        </div>
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
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <Eyebrow>HACCP · {cfg.label.toLowerCase()}</Eyebrow>
        {canEdit && <button onClick={() => onOpen(kind, null)} className="ff inline-flex items-center gap-1 text-sm font-medium acc hover:opacity-70 mb-2"><Plus size={15} /> Invullen</button>}
      </div>
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
                      <div className="text-[11.5px] mute mt-0.5">{r.date} · {r.by}</div>
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
    </div>
  );
}

function HaccpRecordForm({ kind, editing, onCancel, onSave }) {
  const cfg = HACCP_KINDS[kind];
  const [date, setDate] = useState(editing ? editing.date : localDate());
  const [vals, setVals] = useState(() => {
    const v = {};
    cfg.cols.forEach((c) => { v[c.id] = editing && editing[c.id] != null ? String(editing[c.id]) : ""; });
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
function CleaningCheckModal({ tasks, logs, user, canEdit, forDate, onSign, onDayDone, onDayOff, onClose, onOpenSection }) {
  const withStatus = tasks.map((t) => ({ t, st: taskStatus(t, logs) }));
  const open = forDate ? [] : withStatus.filter((x) => x.st.due);
  const doneToday = logs.filter((l) => l.taskId !== DAY_DONE_ID && l.doneDate === (forDate || localDate()));
  // Uitklapbaar: alle taken per ruimte, om ook buiten het interval af te tekenen.
  // Bij het invullen van een heropende dag staat de volledige lijst direct open.
  const [showAll, setShowAll] = useState(!!forDate);
  const areas = [...new Set(withStatus.map((x) => x.t.area))].sort((a, b) => a.localeCompare(b, "nl"));
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(43,56,35,0.45)" }}>
      <div className="w-full max-w-md rounded-2xl p-5 shadow-xl" style={{ background: T.paper, maxHeight: "80vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="serif ink text-xl leading-tight">{forDate ? "Invullen voor " + forDate : "Schoonmaakcontrole"}</div>
            <div className="text-xs mute mt-0.5">Het is {String(CHECK_HOUR).padStart(2, "0")}:{String(CHECK_MIN).padStart(2, "0")} — tijd om af te tekenen.</div>
          </div>
          <button onClick={onClose} className="ff mute hover:opacity-70"><X size={18} /></button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onDayDone} className="btnp ff flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold px-3 py-3"><Check size={16} /> Dag afgerond</button>
          <button onClick={onDayOff} className="btno ff shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium px-3 py-3"><Calendar size={15} /> Vrije dag</button>
        </div>
        <div className="mt-3 text-sm" style={{ color: "#3b3d33" }}>
          {forDate ? <>Deze dag was gemarkeerd als vrije dag. Teken hieronder de gedane taken af, of rond de dag af.</> : <>Vandaag afgetekend: <span className="font-medium ink">{doneToday.length}</span> · nog open: <span className="font-medium ink">{open.length}</span></>}
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
                    const vandaag = x.st.last && x.st.since === 0;
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
                          ? <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium" style={{ color: T.green }}><Check size={13} /> {x.st.last.doneBy}</span>
                          : (x.t.id === TEMP_TASK_ID || HACCP_TASK_KIND[x.t.id])
                            ? <button onClick={onOpenSection} className="ff shrink-0 rounded-lg px-1.5 py-1.5 acc hover:opacity-70" title="Registreren via de schoonmaaklijst"><Thermometer size={14} /></button>
                            : <button onClick={() => onSign(x.t.id)} className="ff shrink-0 rounded-lg px-1.5 py-1.5 acc hover:opacity-70" title={"Aftekenen als " + user.name}><Check size={15} /></button>)}
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
        {onPrint && <button onClick={onPrint} className="ff inline-flex items-center gap-1 text-[13px] font-medium acc rounded-lg px-2.5 py-2 hover:opacity-70" style={{ border: "1px solid #cfe0c4" }} title="Printen"><Printer size={14} /> {printText}</button>}
        {onEdit && <button onClick={onEdit} className="ff inline-flex items-center gap-1 text-[13px] font-medium acc rounded-lg px-2.5 py-2 hover:opacity-70" style={{ border: "1px solid #cfe0c4" }}><Pencil size={14} /> Bewerken</button>}
        {onDelete && <button onClick={onDelete} className="ff inline-flex items-center gap-1 text-[13px] font-medium rounded-lg px-2.5 py-2 hover:opacity-70" style={{ border: "1px solid #d9c4bd", color: "#8a4a3a", background: "#fff" }} title="Verwijderen"><Trash2 size={14} /></button>}
      </div>
    </div>
  );
}
function EditMeta({ by, at }) { return <div className="flex items-center gap-1.5 text-xs mute mt-2"><Clock size={12} /> Laatst bewerkt door <span className="ink font-medium">{by}</span> · {at}</div>; }
function Eyebrow({ children }) { return <h3 className="text-[12.5px] font-semibold uppercase tracking-widest acc mb-2">{children}</h3>; }

function DishDetail({ dish, recipeById, canEdit, onBack, onEdit, onOpenRecipe, onDelete }) {
  if (!dish) return null;
  return (
    <div>
      <BackBar onBack={onBack} onEdit={canEdit ? onEdit : null} onPrint={() => printDish(dish, recipeById)} />
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

function RecipeDetail({ recipe, user, canEdit, usageCount, openCount, baseRecipe, variations, onBack, onEdit, onEndorse, onOpenRecipe, onStartBatch, onAddStock, onOpenTech, onDelete }) {
  // Hoeveelheid als breuk (teller/noemer): ÷2, ÷10 en ×2 stapelen exact.
  const [frac, setFrac] = useState({ n: 1, d: 1 });
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const apply = (mn, md) => setFrac((f) => { const n = f.n * mn, d = f.d * md, g = gcd(n, d); return { n: n / g, d: d / g }; });
  const factor = frac.n / frac.d;
  const setReset = () => setFrac({ n: 1, d: 1 });
  const fracLabel = frac.d === 1 ? "×" + frac.n : frac.n + "/" + frac.d;
  if (!recipe) return null;
  const critical = criticalValues(recipe);
  return (
    <div>
      <BackBar onBack={onBack} onEdit={canEdit ? onEdit : null} onPrint={() => printRecipe(recipe)} printText="Print recept"
        onDelete={canEdit ? () => onDelete(recipe.id) : null}
        extra={canEdit ? <>
          <button onClick={() => printLabel(recipe)} className="ff inline-flex items-center gap-1 text-[13px] font-medium acc rounded-lg px-2.5 py-2 hover:opacity-70" style={{ border: "1px solid #cfe0c4" }} title="Etiket printen (naam, productiedatum, THT)"><Tag size={14} /> Etiket</button>
          <button onClick={onAddStock} className="ff inline-flex items-center gap-1 text-[13px] font-medium acc rounded-lg px-2.5 py-2 hover:opacity-70" style={{ border: "1px solid #cfe0c4" }}><Package size={14} /> In voorraad</button>
        </> : null} />
      <h1 className="serif ink text-3xl leading-tight">{recipe.name}</h1>
      {(recipe.shelfDays || recipe.shelfStorage) && (
        <div className="text-[13px] mute mt-1">Houdbaarheid: {[recipe.shelfDays ? recipe.shelfDays + " dagen" : null, recipe.shelfStorage || null].filter(Boolean).join(" · ")}</div>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        <Chip>{recipe.category}</Chip>
        {recipe.fermentMethod && <Chip>{recipe.fermentMethod}</Chip>}
        {recipe.gear && <Chip>{recipe.gear}</Chip>}
        {recipe.garden && <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1" style={{ background: "#e4ecdc", color: "#3f5a34" }}><Sprout size={12} /> eigen tuin</span>}
        {recipe.season.filter((s) => s !== "Hele jaar").map((s) => <SeasonPill key={s} s={s} />)}
        {recipe.diet !== "Vegetarisch" && <MeatPill diet={recipe.diet} />}
        {recipe.isBase && <span className="inline-flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-1" style={{ background: "#e8ebe0", color: T.green }}><GitBranch size={12} /> basisrecept</span>}
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
      {recipe.updatedAt !== "startbibliotheek" && <EditMeta by={recipe.updatedBy} at={recipe.updatedAt} />}

      <div className="flex items-center gap-2 mt-6 mb-1 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-widest acc">Hoeveelheid</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => apply(1, 2)} className="ff pill rounded-md w-9 h-8 flex items-center justify-center text-xs font-bold" title="Helft van de huidige hoeveelheid">÷2</button>
          <button onClick={() => apply(1, 10)} className="ff pill rounded-md w-9 h-8 flex items-center justify-center text-xs font-bold" title="Een tiende van de huidige hoeveelheid">÷10</button>
          <button onClick={() => apply(2, 1)} className="ff pill rounded-md w-9 h-8 flex items-center justify-center text-xs font-bold" title="Huidige hoeveelheid keer 2">×2</button>
          <span className="pillon rounded-md px-2.5 h-8 flex items-center text-xs font-semibold" title="Ten opzichte van het originele recept">{fracLabel === "×1" ? "×1" : fracLabel + (frac.d === 1 ? "" : " recept")}</span>
          {factor !== 1 && <button onClick={setReset} className="ff mute text-xs underline">reset</button>}
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
  return (
    <div className="flex items-center justify-between pt-4 pb-4">
      <button onClick={onCancel} className="ff inline-flex items-center gap-1 text-sm mute hover:opacity-70"><X size={16} /> Annuleren</button>
      <span className="serif ink text-lg">{title}</span>
      <button onClick={onSave} className="btnp ff inline-flex items-center gap-1.5 rounded-lg text-sm font-medium px-3.5 py-2"><Check size={16} /> {saveLabel}</button>
    </div>
  );
}

function RecipeForm({ recipe, fermentDefault, allRecipes, onCancel, onSave }) {
  const [name, setName] = useState(recipe?.name || "");
  const [category, setCategory] = useState(recipe?.category || (fermentDefault ? "Fermentatie" : ""));
  const [yieldVal, setYieldVal] = useState(recipe?.yield || "");
  const [yieldAmount, setYieldAmount] = useState(recipe && recipe.yieldAmount ? String(recipe.yieldAmount) : "");
  const [yieldUnit, setYieldUnit] = useState(recipe?.yieldUnit || "");
  const [recipeType, setRecipeType] = useState(recipe && recipe.baseId ? "variatie" : "basis");
  const [basePick, setBasePick] = useState(recipe && recipe.baseId ? { id: recipe.baseId, name: recipe.baseName || "" } : null);
  const [baseQ, setBaseQ] = useState("");
  const baseMatches = baseQ.trim() ? (allRecipes || []).filter((r) => (!recipe || r.id !== recipe.id) && softMatchAny([r.name, r.category], baseQ)).slice(0, 8) : [];
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
  const [shelfStorage, setShelfStorage] = useState(recipe && recipe.shelfStorage ? recipe.shelfStorage : "");
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
  const submit = () => { if (!name.trim()) return; if (recipeType === "variatie" && !basePick) { alert("Kies eerst het basisrecept waar dit een variatie op is."); return; } onSave({
    name: name.trim(), category: category.trim() || "Zonder categorie", yield: yieldVal.trim() || "—",
    ingredients: ingredients.filter((x) => x.item.trim()), steps: steps.filter((x) => x.trim()),
    season: seasons.length ? SEASONS.filter((s) => seasons.includes(s)) : ["Hele jaar"],
    diet,
    ferment,
    fermentMethod: ferment ? fermentMethod : null,
    fermentDefaults: ferment ? (() => { const nz = (x) => { const v = Number(String(x).replace(",", ".")); return x !== "" && !isNaN(v) && v !== 0 ? v : null; }; return { saltPct: nz(fSalt), tempC: nz(fTemp), days: nz(fDays), phTarget: nz(fPh), sugarPct: nz(fSugar) }; })() : null,
    shelfDays: shelfDays !== "" && !isNaN(Number(shelfDays)) && Number(shelfDays) > 0 ? Number(shelfDays) : null,
    shelfStorage: shelfStorage.trim(),
    yieldAmount: (() => { const v = Number(String(yieldAmount).replace(",", ".")); return yieldAmount !== "" && !isNaN(v) && v > 0 ? v : null; })(),
    yieldUnit: yieldUnit.trim(),
    baseId: recipeType === "variatie" && basePick ? basePick.id : null,
    baseName: recipeType === "variatie" && basePick ? basePick.name : null,
  }); };
  return (
    <div>
      <FormBar title={recipe ? "Recept bewerken" : "Nieuw recept"} onCancel={onCancel} onSave={submit} />
      {err && <p className="text-xs mb-3" style={{ color: "#a23b2c" }}>{err}</p>}
      <Field label="Naam"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="bv. Gefermenteerde rode biet" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Categorie"><select className={inputCls} value={RECIPE_CATEGORIES.includes(category) ? category : (category ? "__custom" : "")} onChange={(e) => { if (e.target.value === "__custom") setCategory(category && !RECIPE_CATEGORIES.includes(category) ? category : "Zonder categorie"); else setCategory(e.target.value); }}>
          <option value="" disabled>Kies een categorie…</option>
          {RECIPE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__custom">Anders…</option>
        </select></Field>
        <Field label="Soort recept"><select className={inputCls} value={recipeType} onChange={(e) => { setRecipeType(e.target.value); if (e.target.value === "basis") setBasePick(null); }}>
          <option value="basis">Basisrecept</option>
          <option value="variatie">Variatie op een ander recept</option>
        </select></Field>
        {recipeType === "variatie" && (
          <div className="mb-3 -mt-1">
            {basePick
              ? <div className="card px-3.5 py-2.5 flex items-center gap-2 text-sm"><GitBranch size={14} className="acc shrink-0" /><span className="flex-1 min-w-0 truncate ink">Variatie op <span className="font-medium">{basePick.name}</span></span><button onClick={() => setBasePick(null)} className="ff shrink-0 text-xs underline mute">wijzigen</button></div>
              : <>
                  <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 mute" /><input value={baseQ} onChange={(e) => setBaseQ(e.target.value)} placeholder="Waar is dit een variatie op? Zoek het basisrecept" className={inputCls + " pl-9"} /></div>
                  {baseMatches.length > 0 && (
                    <div className="card overflow-hidden -mt-1">
                      {baseMatches.map((r, i) => (
                        <button key={r.id} onClick={() => { setBasePick({ id: r.id, name: r.name }); setBaseQ(""); }} className={"ff w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left " + (i > 0 ? "divi" : "")}>
                          <ChefHat size={14} className="acc shrink-0" /><span className="flex-1 min-w-0 text-sm ink truncate">{r.name}</span><span className="text-xs mute shrink-0">{r.category}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>}
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Opbrengst"><input className={inputCls} value={yieldVal} onChange={(e) => setYieldVal(e.target.value)} placeholder="bv. 5 potten" /></Field>
          <Field label="Hoeveelheid"><input type="text" inputMode="decimal" className={inputCls} value={yieldAmount} onChange={(e) => setYieldAmount(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="bv. 20" /></Field>
          <Field label="Eenheid"><input className={inputCls} value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)} placeholder="bv. 200 g pot" /></Field>
        </div>
      </div>
      {category && !RECIPE_CATEGORIES.includes(category) && <Field label="Eigen categorie"><input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Typ een categorie" /></Field>}
      <div className="text-sm font-medium ink mb-1.5">Seizoen <span className="mute font-normal">(niets gekozen = hele jaar)</span></div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SEASONS.map((s) => (
          <button key={s} type="button" onClick={() => toggleSeason(s)} className={"ff rounded-full px-3 py-1.5 text-xs font-medium " + (seasons.includes(s) ? "pillon" : "pill")}>{s}</button>
        ))}
      </div>
      <Field label="Dieet"><select className={inputCls} value={diet} onChange={(e) => setDiet(e.target.value)}>{["Vegetarisch","Varkensvlees","Rundvlees"].map((d) => <option key={d}>{d}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Houdbaar (dagen)"><input type="text" inputMode="numeric" className={inputCls} value={shelfDays} onChange={(e) => setShelfDays(e.target.value.replace(/[^0-9]/g, ""))} placeholder="bv. 6" /></Field>
        <Field label="Type opslag"><input className={inputCls} value={shelfStorage} onChange={(e) => setShelfStorage(e.target.value)} placeholder="bv. koelkast / vriezer / droog" /></Field>
      </div>
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
      <p className="text-xs mute mb-2 -mt-1">Typ of plak gerust de hele bereiding in één vak, en gebruik daarna de knop "Opdelen in stappen".</p>
      <div className="space-y-2 mb-2">{steps.map((s, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="w-6 h-6 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center mt-2" style={{ background: "#e8ebe0", color: T.green }}>{i + 1}</span>
          <textarea rows={2} className={inputCls + " flex-1 resize-none"} value={s} onChange={(e) => setStep(i, e.target.value)} placeholder="Beschrijf de stap — of plak de hele bereiding" />
          <button onClick={() => setSteps((a) => a.filter((_, idx) => idx !== i))} className="mute hover:opacity-60 px-1 mt-2"><Trash2 size={16} /></button>
        </div>))}
      </div>
      <div className="flex gap-2">
        <div className="flex-1"><AddRow onClick={() => setSteps((a) => [...a, ""])} label="Stap toevoegen" /></div>
        <button onClick={splitAll} className="btno ff flex-1 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium px-3 py-2.5 mb-4" title="Deelt geplakte tekst op in losse stappen"><Layers size={15} /> Opdelen in stappen</button>
      </div>
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
  const [days, setDays] = useState(editing ? String(editing.days) : (fd && fd.days ? String(fd.days) : ""));
  const [saltPct, setSaltPct] = useState(editing && editing.saltPct ? String(editing.saltPct) : (fd && fd.saltPct ? String(fd.saltPct) : ""));
  const [tempC, setTempC] = useState(editing && editing.tempC ? String(editing.tempC) : (fd && fd.tempC ? String(fd.tempC) : ""));
  const [amount, setAmount] = useState(editing ? (editing.amount === "—" ? "" : editing.amount) : "");
  const [pH, setPH] = useState(editing && editing.pH != null ? String(editing.pH) : (fd && fd.phTarget != null ? String(fd.phTarget) : ""));
  const [sugarPct, setSugarPct] = useState(editing && editing.sugarPct != null ? String(editing.sugarPct) : (fd && fd.sugarPct ? String(fd.sugarPct) : ""));
  const [notes, setNotes] = useState(editing ? editing.notes : "");
  const [pick, setPick] = useState("");
  const applyRecipe = (r) => {
    setProduct(r.name); setRecipeId(r.id);
    if (r.fermentMethod) setType(r.fermentMethod);
    const d = r.fermentDefaults;
    if (d) {
      setSaltPct(d.saltPct ? String(d.saltPct) : "");
      setTempC(d.tempC ? String(d.tempC) : "");
      setDays(d.days ? String(d.days) : "");
      setPH(d.phTarget != null ? String(d.phTarget) : "");
      setSugarPct(d.sugarPct ? String(d.sugarPct) : "");
    }
    setPick("");
  };
  const pickMatches = pick.trim() ? (fermentRecipes || []).filter((r) => softMatchAny([r.name, r.fermentMethod, r.category], pick)).slice(0, 8) : [];
  const isMethod = FERMENT_METHODS.includes(type);
  const tgt = FERMENT_TARGETS[type];
  const nz = (x) => { const v = Number(String(x ?? "").replace(",", ".")); return String(x ?? "").trim() !== "" && !isNaN(v) ? v : null; };
  const submit = () => { if (!product.trim()) return; onSave({ product: product.trim(), type, method: isMethod ? type : type, recipeId, startDate, days: nz(days) || 0, saltPct: nz(saltPct), tempC: nz(tempC), amount: amount.trim() || "—", pH: nz(pH), sugarPct: nz(sugarPct), notes: notes.trim(), done: editing ? editing.done : false }); };
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
                <div className="flex-1 min-w-0"><div className="text-sm font-medium ink truncate">{r.name}</div><div className="text-xs mute">{r.fermentMethod || r.category}{r.fermentDefaults ? [r.fermentDefaults.saltPct ? r.fermentDefaults.saltPct + "%" : null, r.fermentDefaults.days ? r.fermentDefaults.days + " dgn" : null].filter(Boolean).map((x) => " · " + x).join("") : ""}</div></div>
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
        <Field label="Duur (dagen)"><input type="text" inputMode="numeric" className={inputCls} value={days} onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))} placeholder="volgt het recept" /></Field>
        <Field label="Zoutgehalte (%) (optioneel)"><input type="text" inputMode="decimal" className={inputCls} value={saltPct} onChange={(e) => setSaltPct(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
        <Field label="Temperatuur (°C)"><input type="text" inputMode="decimal" className={inputCls} value={tempC} onChange={(e) => setTempC(e.target.value.replace(/[^0-9.,-]/g, ""))} /></Field>
        <Field label="Hoeveelheid"><input className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="bv. 3 kg" /></Field>
        <Field label="Gewenste pH (optioneel)"><input type="text" inputMode="decimal" className={inputCls} value={pH} onChange={(e) => setPH(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="bv. 3,5" /></Field>
        <Field label="Suikergehalte (%) (optioneel)"><input type="text" inputMode="decimal" className={inputCls} value={sugarPct} onChange={(e) => setSugarPct(e.target.value.replace(/[^0-9.,]/g, ""))} /></Field>
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
              <span className="mute text-xs">{r.date}</span>
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
