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
const TEGELIJK = 4; // hoeveel artikelen tegelijk; beleefd tegen hun server

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

// ── Eén artikel in de wagen ──────────────────────────────────────────────
const zetAantal = async (pot, basis, lijst, code, aantal) => {
  const url = basis + "/api/v1/user/favourite/update/" + encodeURIComponent(code) + "/" + encodeURIComponent(lijst);
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "user-agent": BROWSER,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      accept: "*/*",
      cookie: pot.kop(),
      referer: basis + "/self/favourites/" + lijst,
      origin: basis,
    },
    body: "quantity=" + encodeURIComponent(String(aantal)),
  });
  pot.slik(r);
  let tekst = "";
  try { tekst = (await r.text()).slice(0, 300); } catch (e) {}
  return { code: String(code), aantal: Number(aantal), gelukt: r.status >= 200 && r.status < 300, status: r.status, antwoord: tekst };
};

// Een paar tegelijk, de rest wacht netjes.
const inGroepjes = async (lijst, perKeer, doe) => {
  const uit = [];
  for (let i = 0; i < lijst.length; i += perKeer) {
    uit.push(...await Promise.all(lijst.slice(i, i + perKeer).map(doe)));
  }
  return uit;
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
  const lijst = String(body.lijst == null ? 0 : body.lijst);
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
    const zet = await zetAantal(pot, basis, lijst, code, aantal);
    const na = await haalHome(pot, basis);
    return klaar(200, {
      ok: true,
      ingelogdAls: voor.wie,
      wagenVoor: voor.wagen,
      wagenNa: na.wagen,
      veranderd: voor.wagen !== na.wagen,
      zetStatus: zet.status,
      zetAntwoord: zet.antwoord,
      koekjes: pot.aantal(),
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

  let uit;
  try {
    uit = await inGroepjes(regels, TEGELIJK, (r) => zetAantal(pot, basis, lijst, r.code, r.aantal));
  } catch (e) {
    return klaar(502, { ok: false, ingelogd: true, fout: "het zetten liep vast: " + String((e && e.message) || e) });
  }
  const mis = uit.filter((x) => !x.gelukt);
  return klaar(200, {
    ok: mis.length === 0,
    ingelogd: true,
    gezet: uit.length - mis.length,
    mislukt: mis.length,
    regels: uit.map((x) => ({ code: x.code, aantal: x.aantal, gelukt: x.gelukt, status: x.status })),
    // Niet verzonden, en dat doet deze proxy ook nooit.
    verzonden: false,
  });
}
