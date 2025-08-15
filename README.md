# Withings Body Scan – Alešův osobní dashboard (Next.js + Tailwind)

Tento projekt je připravený pro nasazení na **Vercel** bez instalace u tebe.

## Co to umí
- Přihlášení přes Withings OAuth (`user.metrics`)
- Načtení měření z váhy (Váha první, Tuk %, Svaly, Voda, PWV, Cévní věk)
- Dashboard + tabulka (řádky = metriky, sloupce = poslední → starší)
- **Export CSV** (tlačítko vpravo nahoře)

---

## Nasazení krok za krokem (Vercel)
1. **Založ GitHub repo**
   - V GitHubu klikni **New** → pojmenuj třeba `withings-dashboard`.
   - Nahraj sem obsah složky projektu (vše, co je v tomto ZIPu).

2. **Vercel – import projektu**
   - Jdi na https://vercel.com → **New Project** → **Import Git Repository** → vyber repo.

3. **Nastav Environment Variables**
   - V projektu na Vercelu otevři **Settings → Environment Variables** a přidej:
     - `WITHINGS_CLIENT_ID` – z Withings Developer portálu
     - `WITHINGS_CLIENT_SECRET` – z Withings Developer portálu
     - `WITHINGS_REDIRECT_URI` – adresa: `https://TVOJE-APP.vercel.app/api/withings/callback`
       (nahraď `TVOJE-APP` skutečným názvem projektu z Vercelu)

4. **Withings Developer – Redirect URI**
   - V **developer.withings.com** otevři svou aplikaci → přidej **stejné** `Redirect URI`:
     `https://TVOJE-APP.vercel.app/api/withings/callback`
   - Scope použij `user.metrics`.

5. **Deploy**
   - Vrať se do Vercelu a spusť **Deploy**.
   - Po dokončení otevři doménu projektu (např. `https://TVOJE-APP.vercel.app/`).

6. **Přihlášení a data**
   - Klikni na **Přihlásit Withings** (vpravo nahoře).
   - Po povolení přístupu budeš přesměrován zpět na `/` a uvidíš své hodnoty.
   - **Export CSV** tlačítko stáhne `withings-data.csv`.

---

## Časté chyby
- **400 / 401**: obvykle nesedí `WITHINGS_REDIRECT_URI` mezi Vercel a Withings portálem (musí být 100% stejné).
- **Invalid code**: kód z autorizace vypršel – stačí klepnout znovu na přihlášení.
- **Žádná data**: ujisti se, že máš měření v účtu a appka má `user.metrics`.

---

## Úpravy
- Metriky a jejich pořadí najdeš v `app/api/data/route.js` (`TYPE_MAP`, `ORDER`).
- Limit počtu sloupců (dní) je `10` – můžeš změnit v `route.js` (proměnná `limited`).

Hodně štěstí! 👟
