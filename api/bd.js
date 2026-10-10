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
const rijenUit = (html) => {
  const uit = new Map();
  const re = /<tr\s([^>]*data-context="row"[^>]*)>/g;
  let m;
  while ((m = re.exec(String(html || "")))) {
    const velden = {};
    const ar = /data-([a-z-]+)="([^"]*)"/g;
    let a;
    while ((a = ar.exec(m[1]))) velden[CAMEL(a[1])] = a[2];
    if (velden.code) uit.set(String(velden.code), velden);
  }
  return uit;
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
  return { ok: true, status: 200, rijen: rijenUit(await r.text()) };
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
  for (const r of regels) {
    const rij = lst.rijen.get(r.code);
    if (rij) klaarVoor.push({ rij, aantal: r.aantal }); else onbekend.push(r.code);
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
