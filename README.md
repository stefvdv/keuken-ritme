# In het ritme van het land

Digitaal receptenboek van de moestuinkeuken — Wilde Wortels, Landgoed de Beug (Odijk).

Dit is een kant-en-klaar project. Het **draait meteen** met voorbeelddata in het geheugen; Supabase (live team-database) koppel je er later bij.

---

## Wie doet wat

- **Dit project (de code)** → draait in de browser. Bevat de vaste receptenbibliotheek (1032 recepten) en alle schermen.
- **GitHub** → bewaart de code en start automatisch een nieuwe publicatie bij elke wijziging. (Aanrader, niet verplicht.)
- **Supabase** → de gedeelde database + logins, zodat het hele team live samenwerkt. (Later toe te voegen.)
- **Vercel** → gratis hosting met https, nodig om de app te installeren op het startscherm.

---

## 1. Op je computer draaien

Je hebt **Node.js 18+** nodig (nodejs.org).

```bash
npm install
npm run dev
```

Open het adres dat in de terminal verschijnt (meestal http://localhost:5173). Je kunt inloggen als een van de koks of als gast.

Een productieversie bouwen en lokaal testen:
```bash
npm run build
npm run preview
```

---

## 2. Publiceren (gratis, met eigen webadres)

1. Maak op **github.com** een nieuwe (lege) repository.
2. In deze projectmap:
   ```bash
   git init
   git add .
   git commit -m "In het ritme van het land"
   git branch -M main
   git remote add origin https://github.com/JOUW-NAAM/ritme.git
   git push -u origin main
   ```
3. Ga naar **vercel.com**, log in met GitHub, klik **Add New → Project**, kies je repository en klik **Deploy**. Vercel herkent Vite automatisch.
4. Na ~1 minuut heb je een https-adres (bijv. `ritme.vercel.app`). Eigen domein zoals `ritme.debeug.nl` kun je koppelen onder **Settings → Domains**.

> Updaten doe je voortaan met `git add . && git commit -m "..." && git push`. Vercel publiceert dan vanzelf de nieuwe versie.

---

## 3. Installeren op het startscherm

Werkt op het gepubliceerde adres uit stap 2 (niet op localhost).

- **Android (Chrome):** open de app → **⋮** → **App installeren**, of gebruik de groene knop in **Instellingen → App installeren**.
- **iPhone/iPad (Safari):** **Deel** → **Zet op beginscherm** → **Voeg toe**.

De PWA-bestanden (`public/manifest.webmanifest`, `public/sw.js`, `public/icons/`) staan al goed.

---

## 4. Supabase koppelen (live samenwerken)

Nu bewaart de app niets blijvend; wijzigingen zijn per apparaat. Voor één gedeelde database met logins en live meekijken volg je de aparte handleiding **handleiding-supabase-en-installeren.md**.

Kort stappenplan:
1. Maak een Supabase-project en draai de meegeleverde SQL (tabellen, beveiliging, realtime).
2. Zet je sleutels in een bestand **.env.local** (kopie van `.env.local.example`):
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=je-anon-public-key
   ```
   In Vercel zet je dezelfde twee onder **Settings → Environment Variables**.
3. De verbinding staat al klaar in `src/supabase.js` (blijft uit zolang de sleutels leeg zijn).
4. Koppel in `src/App.jsx` het inloggen, laden, opslaan en realtime volgens de handleiding.

---

## Mappen in het kort

```
index.html              PWA-koppen + laadt de app
src/main.jsx            start de app + registreert de service worker
src/App.jsx             de volledige app (schermen, recepten, gerechten, smaak, fermentatie)
src/index.css           Tailwind
src/supabase.js         verbinding met Supabase (later)
public/manifest.webmanifest, public/sw.js, public/icons/   PWA + app-icoon
```
