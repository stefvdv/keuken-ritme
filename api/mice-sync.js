// Haalt elke ochtend de boekingen op en zet ze in Supabase.
// Draait als geplande taak via vercel.json, en is ook met de hand te openen:
//   /api/mice-sync
// Plaats dit bestand naast mice.js in de map /api.

const DAGEN_VOORUIT = 42; // zes weken; genoeg voor de weekplanning en de inkoop

export default async function handler(req, res) {
  const sleutel = process.env.MICE_API_KEY;
  const sbUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!sleutel) return res.status(500).json({ fout: "MICE_API_KEY ontbreekt" });
  if (!sbUrl || !sbKey) return res.status(500).json({ fout: "Supabase-omgevingsvariabelen ontbreken" });

  const vandaag = new Date();
  const tot = new Date(vandaag.getTime() + DAGEN_VOORUIT * 86400000);
  const dag = (d) => d.toISOString().slice(0, 10);
  const vanaf = dag(vandaag), eind = dag(tot);

  const rijen = [];
  try {
    for (let pagina = 1; pagina <= 12; pagina++) {
      const uit = await fetch("https://app.miceoperations.com/api/v1/events?page=" + pagina + "&per_page=100", {
        headers: { "X-Authorization": "Basic " + sleutel, Accept: "application/json" },
      });
      if (!uit.ok) return res.status(502).json({ fout: "MICE gaf status " + uit.status });
      const j = await uit.json();
      const lijst = (j && j.data) || [];
      if (!lijst.length) break;
      for (const e of lijst) {
        const datum = String(e.datetime_start || "").slice(0, 10);
        if (!datum || datum < vanaf || datum > eind) continue;
        rijen.push({
          id: e.id,
          naam: e.name || "",
          datum,
          start_tijd: e.datetime_start || null,
          eind_tijd: e.datetime_end || null,
          gasten: Number(e.guests) || 0,
          status: e.status || "",
          soort: (e.event_type && e.event_type.name) || "",
          bericht: [e.message, e.booking_message].filter(Boolean).join(" "),
          opgehaald_op: new Date().toISOString(),
        });
      }
      if (!(j.page && j.page.next_url)) break;
    }
  } catch (e) {
    return res.status(502).json({ fout: String((e && e.message) || e) });
  }

  if (!rijen.length) return res.status(200).json({ opgehaald: 0, van: vanaf, tot: eind });

  // In blokken wegschrijven; bestaande boekingen worden bijgewerkt.
  let bewaard = 0;
  for (let i = 0; i < rijen.length; i += 200) {
    const blok = rijen.slice(i, i + 200);
    const uit = await fetch(sbUrl + "/rest/v1/mice_events?on_conflict=id", {
      method: "POST",
      headers: {
        apikey: sbKey,
        Authorization: "Bearer " + sbKey,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(blok),
    });
    if (!uit.ok) return res.status(502).json({ fout: "Supabase gaf status " + uit.status, tekst: (await uit.text()).slice(0, 300), bewaard });
    bewaard += blok.length;
  }
  return res.status(200).json({ opgehaald: rijen.length, bewaard, van: vanaf, tot: eind });
}
