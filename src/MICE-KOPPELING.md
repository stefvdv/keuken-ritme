# MICE-koppeling — opzetstappen

## 1. Bestand plaatsen
Zet `mice.js` in de repo in de map `api/` (dus `api/mice.js`, naast de bestaande
`src/`-map). Vercel maakt daar automatisch een serverfunctie van.

## 2. Sleutel opslaan in Vercel
Vercel → project keuken-ritme → **Settings → Environment Variables**:

- Name: `MICE_API_KEY`
- Value: de sleutel uit MICE (die van "integratie keuken app")
- Environments: Production, Preview, Development

Daarna **Redeploy**, anders kent de functie de variabele nog niet.

De sleutel staat zo alleen op de server. Hij komt nooit in de browser of in de
repo, en is dus niet zichtbaar voor het team of voor bezoekers.

## 3. Testen
Open in de browser:

    https://ritme-eta.vercel.app/api/mice?path=events

Je krijgt JSON terug met `status` en `data`. Wat je kunt verwachten:

- **status 200** — het werkt; in `data` staan de evenementen.
- **status 401** — sleutel klopt niet of is ingetrokken.
- **status 404** — dit endpoint bestaat niet; probeer een andere `path`.

Andere paden om te proberen:

    /api/mice?path=events&date_from=2026-09-01&date_to=2026-09-30
    /api/mice?path=events/12345
    /api/mice?path=products
    /api/mice?path=packages

## 4. Wat ik nodig heb
De JSON van één evenement mét producten erin. Haal de gastgegevens eruit
(naam, e-mail, telefoon) — die hebben we niet nodig.

Daarna bouw ik:
- een tabel `mice_events` in Supabase met datum, aantal personen en producten;
- een dagelijkse ophaalronde;
- het mise-en-place-scherm dat producten koppelt aan onze items en recepten,
  en de hoeveelheden optelt per bereiding.
