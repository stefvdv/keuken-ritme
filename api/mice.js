// Vercel-functie: praat namens de app met MICE Operations.
// De sleutel staat in de omgevingsvariabele MICE_API_KEY en komt dus nooit in
// de browser terecht. Plaats dit bestand in de map /api van de repo.
//
// Gebruik: /api/mice?path=events&per_page=50
// Alles behalve "path" wordt als querystring doorgegeven aan MICE.

export default async function handler(req, res) {
  const sleutel = process.env.MICE_API_KEY;
  if (!sleutel) return res.status(500).json({ fout: "MICE_API_KEY ontbreekt in de Vercel-instellingen" });

  const { path = "events", ...rest } = req.query;
  // Alleen lezen, en alleen binnen de MICE-API.
  if (req.method !== "GET") return res.status(405).json({ fout: "Alleen GET" });
  const schoon = String(path).replace(/^\/+/, "").replace(/[^a-zA-Z0-9/_-]/g, "");
  const qs = new URLSearchParams(rest).toString();
  const url = "https://app.miceoperations.com/api/v1/" + schoon + (qs ? "?" + qs : "");

  try {
    const uit = await fetch(url, {
      headers: { "X-Authorization": "Basic " + sleutel, Accept: "application/json" },
    });
    const tekst = await uit.text();
    let data;
    try { data = JSON.parse(tekst); } catch (e) { data = { rauw: tekst.slice(0, 2000) }; }
    // Een uur cachen aan de rand: de keuken hoeft niet elke seconde te verversen.
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(uit.status).json({ url, status: uit.status, data });
  } catch (e) {
    return res.status(502).json({ fout: String((e && e.message) || e), url });
  }
}
