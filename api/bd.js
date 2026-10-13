// Winkelwagen van BD-Totaal vullen vanuit Ritme.
//
// Deze proxy doet precies twee dingen: inloggen met het klantnummer en het
// wachtwoord die als omgevingsvariabele op Vercel staan, en daarna per artikel
// een aantal in de winkelwagen zetten. Hij VERZENDT NOOIT een bestelling —
// er staat in dit bestand geen enkele verwijzing naar /user/order/confirm, en
// die hoort hier ook niet te komen. Verzenden doe je zelf op bd-totaal.nl, met
// de wagen voor je. Zo kan een rekenfout in de app je nooit een bestelling
// kosten; je ziet hem eerst staan.
//
// Omgevingsvariabelen op Vercel (Settings → Environment Variables):
//   BD_KLANTNUMMER   het nummer waarmee je inlogt (4184)
//   BD_WACHTWOORD    het wachtwoord daarbij
//   SUPABASE_URL     https://<project>.supabase.co   (voor de toegangscontrole)
//   SUPABASE_ANON    de anon-sleutel van hetzelfde project
// Die laatste twee staan er meestal al, met een VITE_-voorvoegsel omdat de app
// ze zelf ook gebruikt. Die namen pakt hij ook, dus dan hoef je ze niet nog
// eens in te voeren. Een GET op deze route laat zien wat hij gevonden heeft —
// zonder de waarden zelf, alleen of ze er zijn.
//
// Wie mag dit aanroepen: alleen een ingelogde Ritme-gebruiker. De app stuurt
// haar Supabase-token mee; dat controleren we hier bij Supabase zelf. Een
// gast (anonieme login) wordt geweigerd — die kan dus niet per ongeluk of
// expres andermans wagen vullen.

const BASIS = "https://bd-totaal.nl";
const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
// Grenzen tegen een rekenfout aan de app-kant: geen duizend kratten, geen
// bestelling van driehonderd regels in één klap.
const MAX_REGELS = 100;
const MAX_AANTAL = 99;
const BLOK = 25; // hoeveel artikelen in één verzoek; hun endpoint neemt er meer tegelijk

// ── Koekjes bijhouden ────────────────────────────────────────────────────
// fetch in Node onthoudt zelf geen cookies, en de sessie van Laravel loopt er
// volledig op. Dus houden we ze hier bij.
const maakPot = () => {
  const pot = new Map();
  return {
    slik(res) {
      const lijst = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie()
        : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);
      for (const rauw of lijst) {
        const stuk = String(rauw).split(";")[0];
        const i = stuk.indexOf("=");
        if (i > 0) pot.set(stuk.slice(0, i).trim(), stuk.slice(i + 1));
      }
    },
    kop() { return [...pot.entries()].map(([k, v]) => k + "=" + v).join("; "); },
    aantal() { return pot.size; },
  };
};

const tokenUit = (html) => {
  const m = String(html || "").match(/name="_token"[^>]*value="([^"]+)"/) || String(html || "").match(/value="([^"]+)"[^>]*name="_token"/);
  return m ? m[1] : "";
};

// ── Inloggen ─────────────────────────────────────────────────────────────
const inloggen = async (pot, basis, klant, wachtwoord) => {
  // Eerst de inlogpagina: die geeft de sessiecookie en het formuliertoken.
  const een = await fetch(basis + "/login", { headers: { "user-agent": BROWSER, accept: "text/html" }, redirect: "manual" });
  pot.slik(een);
  const token = tokenUit(await een.text());
  if (!token) return { ok: false, waarom: "geen formuliertoken op de inlogpagina gevonden" };

  const twee = await fetch(basis + "/login", {
    method: "POST",
    redirect: "manual",
    headers: {
      "user-agent": BROWSER,
      "content-type": "application/x-www-form-urlencoded",
      accept: "text/html",
      cookie: pot.kop(),
      referer: basis + "/login",
      origin: basis,
    },
    body: new URLSearchParams({ _token: token, code: String(klant), password: String(wachtwoord) }).toString(),
  });
  pot.slik(twee);

  // Of het gelukt is vragen we niet aan de omleiding maar aan de app zelf:
  // een pagina achter de inlog opvragen en kijken of we er nog zijn. Een
  // mislukte inlog stuurt je terug naar /login, en dat zien we dan meteen.
  const drie = await fetch(basis + "/user/home", {
    headers: { "user-agent": BROWSER, accept: "text/html", cookie: pot.kop() },
    redirect: "manual",
  });
  pot.slik(drie);
  const plek = String(drie.headers.get("location") || "");
  if (drie.status >= 300 && drie.status < 400 && /\/login/.test(plek)) return { ok: false, waarom: "klantnummer of wachtwoord klopt niet" };
  const html = drie.status === 200 ? await drie.text() : "";
  if (drie.status !== 200) return { ok: false, waarom: "onverwacht antwoord van de inlog (" + drie.status + ")" };
  if (/name="password"/.test(html) && /\/login/.test(html)) return { ok: false, waarom: "klantnummer of wachtwoord klopt niet" };
  return { ok: true, html };
};

// ── Wat de pagina over je zegt ───────────────────────────────────────────
// Twee dingen die we uit elke ingelogde pagina kunnen plukken: onder welke
// naam je binnen bent, en wat er op dat moment in de winkelwagen zit. Dat
// tweede is de enige echte maatstaf — een 200 van hun server zegt nog niet
// dat er iets veranderd is.
const wieBenIk = (html) => {
  const m = String(html || "").match(/fa-user[^>]*><\/span>\s*([^<]{2,80})</);
  return m ? m[1].trim() : "";
};
const wagenBedrag = (html) => {
  const m = String(html || "").match(/class="badge cart-amount"[^>]*data-value="([0-9.]+)"/)
    || String(html || "").match(/data-value="([0-9.]+)"[^>]*class="badge cart-amount"/);
  return m ? Number(m[1]) : null;
};
const haalHome = async (pot, basis) => {
  const r = await fetch(basis + "/user/home", { headers: { "user-agent": BROWSER, accept: "text/html", cookie: pot.kop() }, redirect: "manual" });
  pot.slik(r);
  const html = r.status === 200 ? await r.text() : "";
  return { status: r.status, wie: wieBenIk(html), wagen: wagenBedrag(html) };
};

// ── De artikelregels van een pagina lezen ────────────────────────────────
// Hun eigen javascript werkt zo: elke regel in de tabel draagt alles wat de
// server over dat artikel weet in data-attributen, en bij een wijziging gaat
// die hele set terug met een nieuw aantal. Wij doen precies hetzelfde — dan
// hoeven we niets te raden over prijzen, voorraad of leverdagen.
const CAMEL = (naam) => String(naam).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
// Alle plaatjes van de pagina, op artikelcode. Hun bestandsnamen dragen het
// artikelnummer ("20540_thumbnail.png", "27001_40x40.jpg"), dus ook als een
// plaatje buiten de regel staat — in een apart blok, of pas door hun eigen
// javascript ingeladen — is het aan het juiste artikel te hangen.
const PLAATJE_EIND = /\.(?:png|jpe?g|webp|gif|avif)(?:\?[^"'()\s>]*)?$/i;
const plaatjesPerCode = (html) => {
  const uit = new Map();
  const tekst = String(html || "");
  const zet = (code, pad) => { if (code && pad && !uit.has(code)) uit.set(code, pad); };
  // Eerst de vorm die we van hun pagina kennen: "20540_thumbnail.png".
  const re = /["'(]([^"'()\s>]*?(\d{3,12})_(?:thumbnail|\d+x\d+)\.(?:png|jpe?g|webp|gif|avif)(?:\?[^"'()\s>]*)?)["')]/gi;
  let m;
  while ((m = re.exec(tekst))) zet(m[2], m[1]);
  // En breder: elk plaatjespad waar het artikelnummer als heel stuk in zit,
  // dus "/storage/products/20540/klein.jpg" of ".../20540.jpg". Zo blijft het
  // werken als ze hun bestandsnamen anders gaan opbouwen. Alleen voor codes
  // die we nog niet hebben, dus de bekende vorm wint.
  const breed = /["'(]([^"'()\s>]{4,300}\.(?:png|jpe?g|webp|gif|avif)(?:\?[^"'()\s>]*)?)["')]/gi;
  while ((m = breed.exec(tekst))) {
    const pad = m[1];
    if (PLAATJE_NIET.test(pad)) continue;
    const delen = pad.split("?")[0].split(/[\/\\]/);
    for (const deel of delen) {
      const code = (deel.match(/^(\d{3,12})(?:[_.-]|$)/) || [])[1];
      if (code) zet(code, pad);
    }
  }
  return uit;
};
// De regel draagt alles wat hun server over het artikel weet in data-attributen.
// Zit daar een plaatjespad tussen — hoe het veld ook heet — dan pakken we dat.
const plaatjeUitVelden = (velden) => {
  for (const sleutel of Object.keys(velden || {})) {
    const w = String(velden[sleutel] == null ? "" : velden[sleutel]).trim();
    if (!w || w.length > 300 || !PLAATJE_EIND.test(w)) continue;
    if (PLAATJE_NIET.test(w)) continue;
    return w;
  }
  return "";
};
const rijenUit = (html) => {
  const uit = new Map();
  const tekst = String(html || "");
  const plaatjes = plaatjesPerCode(tekst);
  // De openingstag zoeken en daarna zelf tot het eind van de regel lopen: een
  // ontbrekende sluittag (daar is hun html niet vies van) zou anders de hele
  // rij overslaan.
  const re = /<tr\s([^>]*data-context="row"[^>]*)>/g;
  let m;
  while ((m = re.exec(tekst))) {
    const velden = {};
    const ar = /data-([a-z-]+)="([^"]*)"/g;
    let a;
    while ((a = ar.exec(m[1]))) velden[CAMEL(a[1])] = a[2];
    if (!velden.code) continue;
    const vanaf = m.index + m[0].length;
    const sluit = tekst.indexOf("</tr", vanaf);
    const volgende = tekst.indexOf("<tr", vanaf);
    const tot = sluit < 0 ? (volgende < 0 ? tekst.length : volgende)
      : volgende < 0 ? sluit : Math.min(sluit, volgende);
    const binnen = tekst.slice(vanaf, tot);
    // De naam staat niet in de attributen maar in de regel zelf. Hij gaat
    // apart mee, zodat het zetten van aantallen er niets van merkt.
    velden.naamUitRij = nettNaam(naamUitRij(binnen), velden.productContent);
    // Eerst in de regel zelf kijken; staat het plaatje daar niet, dan zoeken
    // we het in de rest van de pagina op zijn bestandsnaam.
    velden.plaatjeUitRij = plaatjeUitRij(binnen) || plaatjeUitVelden(velden) || plaatjes.get(String(velden.code)) || "";
    uit.set(String(velden.code), velden);
  }
  return uit;
};
// De naam van een artikel staat niet in de data-attributen maar als tekst in
// de regel zelf. We pakken de cellen van de rij en kiezen de eerste die op een
// naam lijkt: tekst van enige lengte die geen bedrag, aantal of losse code is.
// Zo blijft het werken als ze er een kolom bij zetten.
// De tekens die in een productnaam voorkomen. Cr\u00e8me fra\u00eeche, pur\u00e9e,
// p\u00e2t\u00e9 \u2014 zonder deze tabel zou daar "Cr&egrave;me" van overblijven.
// De hoofdletters volgen hetzelfde patroon, één plek hoger in de tabel.
const ACCENTEN = "agrave:224,aacute:225,acirc:226,atilde:227,auml:228,aring:229,aelig:230,ccedil:231,"
  + "egrave:232,eacute:233,ecirc:234,euml:235,igrave:236,iacute:237,icirc:238,iuml:239,"
  + "ntilde:241,ograve:242,oacute:243,ocirc:244,otilde:245,ouml:246,oslash:248,"
  + "ugrave:249,uacute:250,ucirc:251,uuml:252,yacute:253,yuml:255";
const HTML_UIT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'",
  euro: "\u20ac", hellip: "\u2026", ndash: "\u2013", mdash: "\u2014", deg: "\u00b0",
  middot: "\u00b7", times: "\u00d7", frac12: "\u00bd", frac14: "\u00bc", szlig: "\u00df",
  rsquo: "\u2019", lsquo: "\u2018", ldquo: "\u201c", rdquo: "\u201d", sbquo: "\u201a", bdquo: "\u201e" };
for (const stuk of ACCENTEN.split(",")) {
  const [naam, nr] = stuk.split(":");
  const code = Number(nr);
  HTML_UIT[naam] = String.fromCodePoint(code);
  HTML_UIT[naam[0].toUpperCase() + naam.slice(1)] = String.fromCodePoint(code - 32);
}
const kaleTekst = (h) => String(h == null ? "" : h)
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]*>/g, " ")
  .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z#0-9]+);/g, (hele, n) => {
    if (n[0] === "#") {
      const c = n[1] === "x" || n[1] === "X" ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10);
      return Number.isFinite(c) ? String.fromCodePoint(c) : hele;
    }
    return HTML_UIT[n] !== undefined ? HTML_UIT[n] : hele;
  })
  .replace(/\s+/g, " ").trim();
// Lijkt dit stuk tekst op de naam van een artikel? Een bedrag, een aantal, een
// datum of een kaal nummer niet; een los woord van twee letters ook niet.
const lijktOpNaam = (t) => {
  const x = String(t || "").trim();
  if (x.length < 3 || x.length > 160) return false;
  if (!/[a-zA-Z\u00c0-\u024f]{3}/.test(x)) return false;          // zonder letters is het geen naam
  if (/^[\s\d.,€%+-]+$/.test(x)) return false;                     // alleen cijfers en tekens
  if (/^\d{4}-\d{2}-\d{2}/.test(x)) return false;                  // een datum
  // Een maat is geen naam: "kg", "5 ltr", "1x10 kg", "25 kg".
  if (/^[\d.,]*\s*(?:[x\u00d7]\s*[\d.,]+\s*)?(stuks?|st|kg|gr?|gram|ml|cl|dl|l|ltr|liter|doos|dozen|krat|colli|bak|zak|pak|rol|bos)\.?$/i.test(x)) return false;
  return true;
};
// Staat er een plaatje bij het artikel? Hun pagina zet er soms een miniatuur
// naast. Als het er is nemen we het mee; is het er niet, dan merkt de app er
// niets van. Alleen een echt pad telt \u2014 geen 1x1-pixeltje of een inline svg.
const PLAATJE_NIET = /(^data:|spacer|blank|pixel|placeholder|geen[-_]?foto|no[-_]?image)/i;
// De plekken waar een plaatjespad kan staan, op volgorde van betrouwbaarheid.
// Lui ingeladen plaatjes zetten het echte pad in een data-attribuut en laten
// src naar een leeg plaatje wijzen, dus die gaan voor.
const BRON_KOPPEN = [/\bdata-src\s*=\s*["']([^"']+)["']/i, /\bdata-original\s*=\s*["']([^"']+)["']/i,
  /\bdata-lazy(?:-src)?\s*=\s*["']([^"']+)["']/i, /\bdata-image\s*=\s*["']([^"']+)["']/i,
  /\bsrc\s*=\s*["']([^"']+)["']/i, /\bsrcset\s*=\s*["']\s*([^"'\s,]+)/i];
const bruikbaarPad = (u) => {
  const t = String(u || "").trim();
  if (!t || PLAATJE_NIET.test(t)) return "";
  if (!/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(t) && t.indexOf("/") < 0) return "";
  return t;
};
const plaatjeUitRij = (rijHtml) => {
  const tekst = String(rijHtml || "");
  for (const tag of tekst.match(/<(?:img|source)\b[^>]*>/gi) || []) {
    for (const re of BRON_KOPPEN) {
      const u = bruikbaarPad((tag.match(re) || [])[1]);
      if (u) return u;
    }
  }
  // Soms staat het plaatje niet in een img maar als achtergrond op een blokje.
  const bg = tekst.match(/background(?:-image)?\s*:\s*url\(\s*["']?([^"')]+)/i);
  return bruikbaarPad(bg && bg[1]);
};
// Hun regel zet de naam er twee keer in — één keer voor een breed scherm en
// één keer voor een smal — en plakt daar de inhoud en het categoriepad achter.
// Zo werd de naam in de app "Creme fraiche 30% Creme fraiche 30% 1x200 ml
// zuivel / boter, eieren & room / slagroom". Hieronder halen we de naam er
// weer uit: begint de tekst met hetzelfde stuk twee keer, dan is dat de naam,
// en anders knippen we af bij de inhoud, die we uit de regel zelf kennen.
const zonderHerhaling = (tekst) => {
  const t = String(tekst || "").trim();
  // De langste kop die er twee keer achter elkaar staat is de naam. Van lang
  // naar kort gezocht: bij een naam waarvan ook een kortere kop zich herhaalt
  // is de langste de juiste, want dat is wat hun regel twee keer neerzet.
  for (let n = Math.floor(t.length / 2); n >= 3; n--) {
    const kop = t.slice(0, n).trim();
    if (!kop) continue;
    if (t.slice(n).trim().indexOf(kop) === 0) return kop;
  }
  return t;
};
const totInhoud = (tekst, inhoud) => {
  const t = String(tekst || "").trim();
  const i = String(inhoud || "").trim();
  if (!i || i.length < 2) return t;
  const pos = t.indexOf(i);
  return pos > 2 ? t.slice(0, pos).trim() : t;
};
// De naam zoals hij in de app hoort te staan.
const nettNaam = (tekst, inhoud) => {
  const zonder = zonderHerhaling(totInhoud(tekst, inhoud));
  // Blijft er na het afknippen nog een herhaling staan, dan die er ook af.
  return zonderHerhaling(zonder).replace(/[\s\/|,;\u00b7-]+$/, "").trim();
};
const naamUitRij = (rijHtml) => {
  const cellen = String(rijHtml || "").match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
  for (const c of cellen) {
    const t = kaleTekst(c);
    if (lijktOpNaam(t)) return t;
  }
  // Staan er wél cellen maar lijkt geen ervan op een naam, dan is er gewoon
  // geen naam. Liever niets dan de hele regel aan elkaar geplakt: daar zit
  // zo een knop of een voettekst bij.
  if (cellen.length) return "";
  const heel = kaleTekst(rijHtml);
  return lijktOpNaam(heel) ? heel : "";
};
// Precies de velden die hun pagina meestuurt, in dezelfde volgorde. Niet alles
// wat op de regel staat gaat mee (favouritelists bijvoorbeeld niet), dus we
// houden ons aan deze lijst in plaats van alles blind door te geven.
const ITEM_VELDEN = ["score", "deliveredAt", "inStock", "stockAmount", "stock", "hasContent", "productContent",
  "sti", "factor", "priceVat", "price", "code", "content", "discount", "sales", "quantityBackup", "quantity",
  "orderId", "reference", "id", "model", "context", "amount", "amountVat", "valid"];

const itemBody = (regels, pad) => {
  const p = new URLSearchParams();
  regels.forEach((r, i) => {
    const rij = r.rij, nu = String(r.aantal);
    const waarden = { ...rij, quantity: nu, quantityBackup: rij.quantity == null ? "0" : String(rij.quantity),
      amount: "0", amountVat: "0", valid: "true", context: pad + "#" + (rij.context || "row") };
    for (const v of ITEM_VELDEN) p.append("items[" + i + "][" + v + "]", waarden[v] == null ? "" : String(waarden[v]));
  });
  return p.toString();
};

// ── De aantallen doorgeven ───────────────────────────────────────────────
// Alles in één verzoek: hun endpoint neemt items[0], items[1], … tegelijk aan.
const zetAantallen = async (pot, basis, pad, regels) => {
  const r = await fetch(basis + "/api/v1/order/items/update", {
    method: "POST",
    headers: {
      "user-agent": BROWSER,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      accept: "*/*",
      cookie: pot.kop(),
      referer: basis + pad,
      origin: basis,
    },
    body: itemBody(regels, pad.replace(/^\//, "")),
  });
  pot.slik(r);
  let tekst = "";
  try { tekst = (await r.text()).slice(0, 400); } catch (e) {}
  return { gelukt: r.status >= 200 && r.status < 300, status: r.status, antwoord: tekst };
};

// De lijst waar de artikelen op staan, met hun gegevens en het nummer van de
// lopende bestelling. Zonder die bestelling heeft een aantal nergens houvast.
const haalLijst = async (pot, basis, pad) => {
  const r = await fetch(basis + pad, { headers: { "user-agent": BROWSER, accept: "text/html", cookie: pot.kop() }, redirect: "manual" });
  pot.slik(r);
  if (r.status !== 200) return { ok: false, status: r.status, rijen: new Map() };
  const html = await r.text();
  const rijen = rijenUit(html);
  // Kwam er van geen enkele regel een plaatje, dan is er iets aan hun opbouw
  // dat we niet kennen. Dan gaat er een stukje van de eerste regel mee terug,
  // zodat er niet opnieuw gegokt hoeft te worden.
  let metPlaatje = 0;
  for (const [, v] of rijen) if (v.plaatjeUitRij) metPlaatje++;
  return { ok: true, status: 200, rijen, metPlaatje, ruw: (rijen.size && !metPlaatje) ? eersteRijStuk(html) : "" };
};
// Het eerste artikelblok zoals het er werkelijk staat.
const eersteRijStuk = (html) => {
  const t = String(html || "");
  const m = t.match(/<tr\s[^>]*data-context="row"[^>]*>/);
  if (!m) return t.slice(0, 1500);
  const eind = t.indexOf("</tr", m.index);
  return t.slice(m.index, eind < 0 ? m.index + 2500 : Math.min(eind + 5, m.index + 2500));
};

// Zoeken in het hele assortiment. Hun zoekpagina is een gewone pagina
// (/search?q=...), geen aparte koppeling, en de artikelen staan er net zo in
// als op de favorietenlijst. Dus dezelfde lezer, ander pad.
const ZOEK_PAD = "/search?q=";
const zoekPagina = async (pot, basis, term) => {
  const pad = ZOEK_PAD + encodeURIComponent(String(term || "").trim());
  const r = await fetch(basis + pad, { headers: { "user-agent": BROWSER, accept: "text/html", cookie: pot.kop() }, redirect: "manual" });
  pot.slik(r);
  if (r.status !== 200) return { ok: false, status: r.status, rijen: new Map(), pad, ruw: "" };
  const html = await r.text();
  const rijen = rijenUit(html);
  // Vindt de lezer niets, dan is hun zoekpagina anders opgebouwd dan de
  // favorietenlijst. Dan gaat er een stukje van de pagina mee terug, zodat
  // dat te zien is zonder dat er iemand mee hoeft te kijken.
  return { ok: true, status: 200, rijen, pad, ruw: rijen.size ? "" : eersteArtikelStuk(html) };
};
// Een stukje pagina rond het eerste wat op een artikel lijkt, als hulp bij het
// uitzoeken. Hun plaatjes heten naar de artikelcode ("20540_thumbnail.png"),
// dus daar is de plek goed aan te wijzen.
const eersteArtikelStuk = (html) => {
  const t = String(html || "");
  const m = t.match(/(\d{3,12})_(?:thumbnail|\d+x\d+)\.(?:png|jpe?g|webp)/i);
  const i = m ? Math.max(0, m.index - 900) : t.indexOf("<body");
  return t.slice(i < 0 ? 0 : i, (i < 0 ? 0 : i) + 2200);
};

// ── Mag deze aanroeper dit? ──────────────────────────────────────────────
// De app zet zijn Supabase-gegevens onder een VITE_-naam neer; dezelfde
// waarden, ander voorvoegsel. Dus kijken we onder allebei, zodat je ze niet
// twee keer hoeft in te voeren (en niet per ongeluk twee keer verschillend).
const eersteVan = (...namen) => { for (const n of namen) { const v = process.env[n]; if (v) return { naam: n, waarde: v }; } return null; };
const supaUrl = () => eersteVan("SUPABASE_URL", "VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const supaAnon = () => eersteVan("SUPABASE_ANON", "SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON", "NEXT_PUBLIC_SUPABASE_ANON_KEY");

const magDit = async (req) => {
  const u = supaUrl(), a = supaAnon();
  const url = u && u.waarde, anon = a && a.waarde;
  // Zonder ingestelde controle doen we niets: liever een duidelijke fout dan
  // een open deur naar iemands winkelwagen.
  if (!url || !anon) return { ok: false, code: 500, waarom: "de Supabase-gegevens ontbreken op de server — open deze route in je browser om te zien wat er mist" };
  const kop = String(req.headers.authorization || "");
  const token = kop.slice(0, 7).toLowerCase() === "bearer " ? kop.slice(7).trim() : "";
  if (!token) return { ok: false, code: 401, waarom: "niet ingelogd" };
  let r;
  try {
    r = await fetch(url.replace(/\/+$/, "") + "/auth/v1/user", { headers: { apikey: anon, authorization: "Bearer " + token } });
  } catch (e) { return { ok: false, code: 502, waarom: "kan de inlogcontrole niet bereiken" }; }
  if (!r.ok) return { ok: false, code: 401, waarom: "niet ingelogd" };
  let wie = null;
  try { wie = await r.json(); } catch (e) {}
  if (!wie || !wie.id) return { ok: false, code: 401, waarom: "niet ingelogd" };
  // Een gast mag meekijken in de app, maar niet bestellen.
  if (wie.is_anonymous === true || (wie.app_metadata && wie.app_metadata.provider === "anonymous")) {
    return { ok: false, code: 403, waarom: "gasten kunnen niet bestellen" };
  }
  return { ok: true, wie: wie.id };
};

// ── De route ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  const klaar = (code, obj) => { res.status(code).json(obj); };

  // Een blik op de instellingen, om te zien of alles er staat. Geen waarden,
  // alleen of ze gevonden zijn en onder welke naam — zo kun je de Vercel-kant
  // nakijken zonder iets te bestellen.
  if (req.method === "GET") {
    const u = supaUrl(), a = supaAnon();
    const gevonden = {
      BD_KLANTNUMMER: process.env.BD_KLANTNUMMER ? "gevonden" : "ONTBREEKT",
      BD_WACHTWOORD: process.env.BD_WACHTWOORD ? "gevonden" : "ONTBREEKT",
      supabase_url: u ? "gevonden als " + u.naam : "ONTBREEKT",
      supabase_sleutel: a ? "gevonden als " + a.naam : "ONTBREEKT",
    };
    const klaarVoorGebruik = Object.values(gevonden).every((v) => v !== "ONTBREEKT");
    return klaar(200, { proxy: "bd", klaarVoorGebruik, gevonden, verzendtNooit: true });
  }
  if (req.method !== "POST") return klaar(405, { ok: false, fout: "alleen GET of POST" });

  const mag = await magDit(req);
  if (!mag.ok) return klaar(mag.code, { ok: false, fout: mag.waarom });

  const klant = process.env.BD_KLANTNUMMER, wachtwoord = process.env.BD_WACHTWOORD;
  if (!klant || !wachtwoord) return klaar(500, { ok: false, fout: "BD_KLANTNUMMER of BD_WACHTWOORD ontbreekt op de server" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== "object") return klaar(400, { ok: false, fout: "geen geldige inhoud" });

  const basis = String(process.env.BD_BASIS || BASIS).replace(/\/+$/, "");
  // De pagina waar de artikelen op staan. Standaard je favorietenlijst: daar
  // staat alles wat je regelmatig bestelt, mét het nummer van de lopende
  // bestelling waar de aantallen bij horen.
  const lijst = String(body.lijst == null ? 0 : body.lijst).replace(/[^0-9]/g, "") || "0";
  const pad = "/self/favourites/" + lijst;
  const pot = maakPot();

  // Alleen kijken of we binnenkomen, zonder iets aan de wagen te doen.
  if (body.alleenTest === true) {
    const in1 = await inloggen(pot, basis, klant, wachtwoord);
    if (!in1.ok) return klaar(502, { ok: false, ingelogd: false, fout: in1.waarom });
    const home = await haalHome(pot, basis);
    return klaar(200, { ok: true, ingelogd: true, ingelogdAls: home.wie, wagen: home.wagen });
  }

  // Ophaalstand: de artikelen van de favorietenlijst teruggeven, zodat de app
  // zijn bestellijst kan bijwerken zonder dat er een export ingelezen hoeft te
  // worden. Hier wordt niets geschreven — alleen gelezen.
  if (body.lees === true) {
    const in0 = await inloggen(pot, basis, klant, wachtwoord);
    if (!in0.ok) return klaar(502, { ok: false, ingelogd: false, fout: in0.waarom });
    const lst = await haalLijst(pot, basis, pad);
    if (!lst.ok) return klaar(502, { ok: false, ingelogd: true, fout: "de lijst op " + pad + " is niet op te halen (" + lst.status + ")" });
    const getal = (x) => { const n = Number(String(x == null ? "" : x).replace(",", ".")); return Number.isFinite(n) ? n : null; };
    const artikelen = [];
    for (const [code, r] of lst.rijen) {
      artikelen.push({
        code,
        naam: String(r.naamUitRij || ""),
        // Een pad zonder host maken we compleet, anders is het in de app niet
        // te laden.
        plaatje: r.plaatjeUitRij ? (/^https?:/i.test(r.plaatjeUitRij) ? r.plaatjeUitRij : basis + (r.plaatjeUitRij[0] === "/" ? "" : "/") + r.plaatjeUitRij) : "",
        inhoud: String(r.productContent || ""),
        prijs: getal(r.price),
        prijsBtw: getal(r.priceVat),
        voorraad: getal(r.stockAmount),
        opVoorraad: String(r.inStock || "") === "1",
      });
    }
    const home = await haalHome(pot, basis);
    return klaar(200, {
      ok: true, ingelogd: true, ingelogdAls: home.wie, wagen: home.wagen,
      pad, aantal: artikelen.length,
      metPlaatje: artikelen.filter((a) => a.plaatje).length,
      // Alleen als er van geen enkele regel een plaatje kwam: een stukje van
      // hun pagina, om te zien hoe die er werkelijk uitziet.
      ...(lst.ruw ? { ruw: lst.ruw } : {}),
      // Zonder naam valt er in de app niets mee te beginnen; dat melden we
      // apart in plaats van er een nummer van te maken.
      zonderNaam: artikelen.filter((a) => !a.naam).length,
      artikelen,
    });
  }

  // Zoekstand: in het hele assortiment van BD zoeken. Lezen alleen.
  if (typeof body.zoek === "string") {
    const term = body.zoek.trim();
    if (term.length < 2) return klaar(400, { ok: false, fout: "zoekterm te kort" });
    const in3 = await inloggen(pot, basis, klant, wachtwoord);
    if (!in3.ok) return klaar(502, { ok: false, ingelogd: false, fout: in3.waarom });
    const z = await zoekPagina(pot, basis, term);
    if (!z.ok) return klaar(502, { ok: false, ingelogd: true, fout: "zoeken gaf " + z.status + " terug", pad: z.pad });
    const getal = (x) => { const n = Number(String(x == null ? "" : x).replace(",", ".")); return Number.isFinite(n) ? n : null; };
    const artikelen = [];
    for (const [code, r] of z.rijen) {
      artikelen.push({
        code,
        naam: String(r.naamUitRij || ""),
        inhoud: String(r.productContent || ""),
        prijs: getal(r.price),
        prijsBtw: getal(r.priceVat),
        voorraad: getal(r.stockAmount),
        opVoorraad: String(r.inStock || "") === "1",
        plaatje: r.plaatjeUitRij ? (/^https?:/i.test(r.plaatjeUitRij) ? r.plaatjeUitRij : basis + (r.plaatjeUitRij[0] === "/" ? "" : "/") + r.plaatjeUitRij) : "",
      });
    }
    return klaar(200, { ok: true, ingelogd: true, term, pad: z.pad, aantal: artikelen.length,
      zonderNaam: artikelen.filter((a) => !a.naam).length, artikelen,
      // Alleen als er niets uitkwam: een stukje van hun pagina, om te zien hoe
      // die er werkelijk uitziet.
      ...(artikelen.length ? {} : { ruw: z.ruw }) });
  }

  // Uitzoekstand: één artikel zetten en precies verslag doen van wat er
  // gebeurt. Het bedrag in de wagen vóór en ná is de enige maatstaf die telt;
  // een 200 van hun server betekent niet dat er iets veranderd is.
  if (body.kijk === true) {
    const code = String(body.code || "").trim();
    const aantal = Number(body.aantal);
    if (!/^[0-9]{1,12}$/.test(code) || !Number.isFinite(aantal)) return klaar(400, { ok: false, fout: "geef een code en een aantal" });
    const in3 = await inloggen(pot, basis, klant, wachtwoord);
    if (!in3.ok) return klaar(502, { ok: false, ingelogd: false, fout: in3.waarom });
    const voor = await haalHome(pot, basis);
    const lst = await haalLijst(pot, basis, pad);
    const rij = lst.rijen.get(code);
    if (!rij) {
      return klaar(200, { ok: true, ingelogdAls: voor.wie, wagenVoor: voor.wagen, wagenNa: voor.wagen, veranderd: false,
        zetStatus: 0, zetAntwoord: "Dit artikel staat niet op " + pad + " (" + lst.rijen.size + " artikelen gelezen, status " + lst.status + ")" });
    }
    const zet = await zetAantallen(pot, basis, pad, [{ rij, aantal }]);
    const na = await haalHome(pot, basis);
    return klaar(200, {
      ok: true,
      ingelogdAls: voor.wie,
      bestelling: rij.orderId || "",
      wagenVoor: voor.wagen,
      wagenNa: na.wagen,
      veranderd: voor.wagen !== na.wagen,
      zetStatus: zet.status,
      zetAntwoord: zet.antwoord,
      opDeLijst: lst.rijen.size,
    });
  }

  // De regels nalopen vóór we ook maar inloggen: een onzinnige lijst hoort
  // hier te stranden en niet halverwege in hun winkelwagen.
  const ruw = Array.isArray(body.regels) ? body.regels : null;
  if (!ruw) return klaar(400, { ok: false, fout: "geen regels meegegeven" });
  if (ruw.length > MAX_REGELS) return klaar(400, { ok: false, fout: "te veel regels in één keer (maximaal " + MAX_REGELS + ")" });
  const regels = [];
  for (const r of ruw) {
    const code = String((r && r.code) || "").trim();
    const aantal = Number(r && r.aantal);
    if (!/^[0-9]{1,12}$/.test(code)) return klaar(400, { ok: false, fout: "ongeldige artikelcode: " + code });
    if (!Number.isFinite(aantal) || aantal < 0 || aantal > MAX_AANTAL || Math.floor(aantal) !== aantal) {
      return klaar(400, { ok: false, fout: "ongeldig aantal bij artikel " + code + " (0 t/m " + MAX_AANTAL + ")" });
    }
    regels.push({ code, aantal });
  }
  if (!regels.length) return klaar(400, { ok: false, fout: "geen regels meegegeven" });

  const in2 = await inloggen(pot, basis, klant, wachtwoord);
  if (!in2.ok) return klaar(502, { ok: false, ingelogd: false, fout: in2.waarom });

  const voor = await haalHome(pot, basis);
  const lst = await haalLijst(pot, basis, pad);
  if (!lst.ok) return klaar(502, { ok: false, ingelogd: true, fout: "de lijst op " + pad + " is niet op te halen (" + lst.status + ")" });
  if (!lst.rijen.size) return klaar(502, { ok: false, ingelogd: true, fout: "op " + pad + " staan geen artikelen" });

  // Alleen artikelen die op die lijst staan kunnen mee: van de rest kennen we
  // de gegevens niet die hun bestelling nodig heeft.
  const klaarVoor = [], onbekend = [];
  const nietOpLijst = [];
  for (const r of regels) {
    const rij = lst.rijen.get(r.code);
    if (rij) klaarVoor.push({ rij, aantal: r.aantal }); else nietOpLijst.push(r);
  }
  // Wat niet op de favorietenlijst staat zoeken we op in hun assortiment: daar
  // staat dezelfde regel, met dezelfde gegevens en hetzelfde bestelnummer. Zo
  // kan er ook iets besteld worden dat niet op de favorietenlijst staat.
  for (const r of nietOpLijst) {
    let gevonden = null;
    try {
      const z = await zoekPagina(pot, basis, r.code);
      if (z.ok) gevonden = z.rijen.get(r.code) || null;
    } catch (e) {}
    if (gevonden) klaarVoor.push({ rij: gevonden, aantal: r.aantal }); else onbekend.push(r.code);
  }
  if (!klaarVoor.length) {
    return klaar(200, { ok: false, ingelogd: true, gezet: 0, mislukt: regels.length, onbekend,
      fout: "geen van deze artikelen staat op " + pad, verzonden: false });
  }

  // In blokken, zodat één verzoek niet eindeloos lang wordt.
  let fout = null, gezet = 0;
  const verslag = [];
  for (let i = 0; i < klaarVoor.length; i += BLOK) {
    const deel = klaarVoor.slice(i, i + BLOK);
    let zet;
    try { zet = await zetAantallen(pot, basis, pad, deel); }
    catch (e) { fout = "het zetten liep vast: " + String((e && e.message) || e); break; }
    verslag.push({ status: zet.status, antwoord: zet.antwoord });
    if (!zet.gelukt) { fout = "BD gaf " + zet.status + " terug"; break; }
    gezet += deel.length;
  }
  const na = await haalHome(pot, basis);
  return klaar(200, {
    ok: !fout && !onbekend.length,
    ingelogd: true,
    bestelling: (klaarVoor[0] && klaarVoor[0].rij.orderId) || "",
    gezet,
    mislukt: regels.length - gezet,
    onbekend,
    wagenVoor: voor.wagen,
    wagenNa: na.wagen,
    veranderd: voor.wagen !== na.wagen,
    fout: fout || undefined,
    verslag,
    // Niet verzonden, en dat doet deze proxy ook nooit.
    verzonden: false,
  });
}

// Alleen om na te rekenen: Vercel kijkt naar de default hierboven en raakt
// deze niet aan. Zo ligt het lezen van hun pagina vast in een test, en dat is
// precies het stuk waar we het meest over moeten gokken.
export { naamUitRij, lijktOpNaam, kaleTekst, rijenUit, plaatjeUitRij, plaatjeUitVelden, nettNaam, zonderHerhaling, totInhoud, plaatjesPerCode };
