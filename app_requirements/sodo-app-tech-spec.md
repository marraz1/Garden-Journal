# Techninių reikalavimų dokumentas: Daržo/Sodo planavimo aplikacija

## 1. Apžvalga

**Tikslas:** Web/mobile aplikacija, leidžianti naudotojams:
- Kurti vizualius daržo/sodo planus (lysvės, augalai, zonos)
- Registruoti ir planuoti darbus (sėja, laistymas, tręšimas, derliaus nuėmimas ir t.t.)
- Sekti progresą (fotofiksacija, augalų būklė, derliaus rezultatai)

**Platformos:** Web (desktop + mobile browser), su PWA galimybe "install to home screen" mobiliuosiuose. Native app (React Native/Expo) — vėlesnė fazė, jei paaiškės poreikis.

---

## 2. Technologijų stack

| Sluoksnis | Sprendimas | Pastabos |
|---|---|---|
| Framework | Next.js 14+ (App Router) + TypeScript | SSR/SSG, API routes, gera Vercel integracija |
| DB | Neon (Serverless Postgres) | branch-based dev/preview aplinkoms |
| ORM | Prisma arba Drizzle | Drizzle — lengvesnis, geriau veikia su serverless/edge |
| Auth | Auth.js (NextAuth) arba Clerk | Clerk greičiau paleidžiamas, bet mokamas nuo tam tikro naudotojų kiekio |
| Stilius/UI | Tailwind CSS + shadcn/ui | greitas prototipavimas, gerai veikia su Claude Code |
| Failų saugojimas | Vercel Blob arba Cloudflare R2 | nuotraukoms (progreso fiksacija) |
| Hosting | Vercel | preview deployments per PR |
| VCS | GitHub | + GitHub Actions CI (lint/test prieš merge) |
| Mobile strategija | PWA (next-pwa arba manuali service worker) | offline-first vėliau, jei reikės lauko sąlygomis be interneto |
| State/forms | React Hook Form + Zod | validacija bendra ir client, ir server pusėje |
| Vizualus planas | Canvas/SVG (pvz. Konva.js arba react-dnd + grid) | lysvių/zonų vaizdavimui drag-and-drop principu |

**Atviras klausimas:** ar reikia offline veikimo lauke (be signalo)? Jei taip — reikės daugiau dėmesio local-first architektūrai (pvz. IndexedDB + sync).

---

## 3. Pagrindiniai duomenų modeliai (draft)

```
User
  - id, email, name, createdAt

Garden (Sodas/Sklypas)
  - id, userId, name, location, sizeM2, createdAt

Bed / Zone (Lysvė/Zona)
  - id, gardenId, name, shape (JSON: coords/grid position), sunExposure, soilType

Plant (Augalas egzempliorius lysvėje)
  - id, bedId, species, variety, plantedDate, expectedHarvestDate, status (planuota/pasodinta/derlius/pašalinta)

PlantCatalog (žinynas, opcionaliai seed'inamas)
  - id, commonName, latinName, defaultSpacing, daysToMaturity, careNotes

Task (Darbas)
  - id, gardenId, bedId?, plantId?, title, type (laistymas/tręšimas/sėja/derlius/kita), dueDate, recurrenceRule?, status, completedAt

ProgressLog (Progreso įrašas)
  - id, gardenId, bedId?, plantId?, date, note, photoUrl?, metrics (JSON: pvz. aukštis, derliaus kiekis)
```

---

## 4. MVP funkcionalumo apimtis

**Turi būti (v1):**
1. Registracija/prisijungimas
2. Sodo/sklypo sukūrimas su bazine informacija
3. Lysvių/zonų kūrimas su paprastu vizualiu redaktoriumi (stačiakampiai + pavadinimas + spalva pagal augalų grupę)
4. Augalų priskyrimas lysvėms iš katalogo arba laisva forma
5. Darbų sąrašas su datomis, pasikartojimu (pvz. laistymas kas 2 dienas), atlikimo žymėjimu
6. Progreso žurnalas su nuotraukomis ir tekstiniais įrašais
7. Paprastas dashboard: šiandienos/savaitės darbai, artimiausi derliai

**Gali palaukti (v2+):**
- Pasikartojančių darbų automatinis generavimas pagal augalų tipą (sėjos kalendorius)
- Bendrinimas su kitais naudotojais (šeima, bendruomeninis sodas)
- Orų integracija (laistymo priminimai pagal lietaus prognozę)
- Derliaus statistika/ataskaitos per metus
- PWA offline režimas
- Push/email priminimai apie darbus

---

## 5. Architektūros pastabos Claude Code kontekstui

- Monorepo nebūtina — pradžiai vienas Next.js projektas su `app/`, `lib/`, `db/` struktūra
- DB schema versijuojama per Drizzle/Prisma migrations, laikoma repo
- Aplinkos: `local` (Neon branch arba local Postgres per Docker), `preview` (Neon branch per Vercel PR), `production`
- API: Next.js Route Handlers (`app/api/...`) arba Server Actions — server actions paprasčiau CRUD operacijoms
- Autentifikacija apsaugo visus route'us per middleware
- Nuotraukų upload — presigned URL į Blob/R2, ne per patį serverį

---

## 6. Ne-funkciniai reikalavimai

- Responsive dizainas: mobile-first (nes darbai dažnai registruojami lauke telefonu)
- Greitas krovimasis lauko sąlygomis (galimai silpnas signalas) — minimalizuoti bundle
- Duomenų privatumas: kiekvienas naudotojas mato tik savo sodus (RLS arba app-level filtravimas)
- Prieinamumas (a11y) — bent bazinis lygis (kontrastas, klaviatūros navigacija)

---

## 7. Kiti atviri klausimai prieš pradedant

1. Ar reikia daugiau nei vieno naudotojo per sodą (šeimos/bendruomenės bendrinimas) jau v1?
2. Ar planas turi būti tikslus (metrais/koordinatėmis), ar užtenka apytikslio grid vaizdavimo?
3. Ar reikalingas lietuviškas augalų katalogas su vietinėmis sėjos/derliaus datomis?
4. Kokia tikslinė naudotojų grupė — asmeninis naudojimas ar planuojama viešai skelbti kitiems?

---

## 8. Pasiūlomi pirmi žingsniai su Claude Code

1. `npx create-next-app` su TypeScript, Tailwind, App Router
2. Neon projekto sukūrimas + connection string į `.env`
3. Drizzle schema pagal 3 skyrių + pirma migracija
4. Auth.js integracija (email/password arba Google OAuth)
5. Bazinis CRUD: Garden → Bed → Task (vertikalus "walking skeleton" per visą stack'ą)
6. Vercel deploy + GitHub Actions CI
