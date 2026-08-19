# Dizaino reikalavimų dokumentas: Daržo/Sodo planavimo aplikacija

## 0. Konteksto trumpai apie 2026 m. tendencijas

2026 m. dizaino tendencijos, aktualios šiam projektui:
- Minimalizmas šiais metais orientuotas ne vien į baltas erdves, o strategiškai — į kognityvinės apkrovos mažinimą
- Populiarėja glassmorphism (permatomi, susilieję sluoksniai), bento grid išdėstymai, gestais valdoma navigacija ir "low-stimulus" (mažai dirginanti) UI
- Prieinamumas (accessibility) tampa standartu, ne priedu — pakankamas kontrastas, didesni palietimo taškai, aiškūs fokuso žymėjimai
- Apatinė navigacija (bottom navigation) ir tamsus režimas (dark mode) išlieka standartu mobiliuose UI

Rekomendacija šiam projektui: **naudoti 2-3 tikslingai parinktus elementus** (bottom nav, švelnus glassmorphism kortelėms, bento grid dashboard'ui), o ne visas madas iš karto — sodo app'ui svarbiausia greitis ir aiškumas lauko sąlygomis, ne vizualinis efektingumas.

---

## 1. Bendrieji principai

- **Mobile-first**: dizainuojama pirmiausia telefono ekranui (360–430px plotis), tada plečiama į tablet/desktop
- **Thumb zone**: pagrindiniai veiksmai (pridėti darbą, pažymėti atlikta, įkelti nuotrauką) pasiekiami vienu nykščio judesiu apatinėje ekrano dalyje
- **Low-stimulus UI**: ramus, nedirginantis dizainas — naudotojas dažnai naudos app'ą lauke, saulėje, su purvinomis rankomis, tad svarbiau aiškumas nei efektai
- **Greitis**: minimalu animacijų, kurios lėtina suvokimą; skeleton loaders vietoj spinnerių

---

## 2. Spalvos ir stilius (2026 trendai)

**Paletė:** natūrali, sodo tematiką atitinkanti, bet ne pernelyg "žalia ant žalio":
- Pagrindinė (primary): pritildyta žalia/salotų atspalvis (pvz. sage/moss green) — CTA mygtukams
- Antrinė (accent): šilta žemiška spalva (terracotta/rusva) — akcentams, derliaus/progreso ženklams
- Neutrali bazė: šilta balta / labai šviesiai smėlio tonas fone (ne gryna balta — švelnesnė akims)
- **Dark mode**: privalomas nuo v1 — automatinis pagal sistemos nustatymą + rankinis perjungimas

**Vizualinis stilius:**
- Švelnus glassmorphism kortelėms (permatomas fonas, blur), naudojamas tik viršutiniuose sluoksniuose (modalai, floating action button), ne visur — kad neapsunkintų skaitomumo saulėje
- Bento grid dashboard'e — vizualiai patrauklus, bet aiškiai atskirtas informacijos blokavimas (šiandienos darbai / progresas / oras / artimiausias derlius)
- Apvalintas kampai (rounded corners), minkšti šešėliai vietoj griežtų linijų
- Ikonos: linijinės (outline), nuoseklios per visą app'ą (rekomenduoju Lucide icon set — gerai veikia su Tailwind/shadcn)

**Tipografija:**
- Viena aiški sans-serif šeima (pvz. Inter arba Geist), geras skaitomumas mažais dydžiais
- Didesni šrifto dydžiai nei įprasta (min. 16px body tekstui) — patogu skaityti saulėje/su akiniais

---

## 3. Navigacija

**Struktūra:** Bottom tab navigation (4-5 tabai), standartas 2026 m. mobiliems UI:

1. **Pradžia (Dashboard)** — šiandienos darbai, greita apžvalga
2. **Planas** — vizualus sodo/lysvių planas
3. **+ (centrinis FAB)** — greitas veiksmas: pridėti darbą / progreso įrašą / nuotrauką
4. **Darbai** — pilnas darbų sąrašas/kalendorius
5. **Progresas** — žurnalas, nuotraukos, rezultatai

**Papildoma navigacija:**
- Viršuje: sodo pasirinkimas (jei keli sodai/sklypai) + profilio/nustatymų ikona
- Gestų palaikymas: swipe tarp tabų, pull-to-refresh sąrašuose
- Breadcrumb/back mygtukas visada matomas giliau įėjus (pvz. konkreti lysvė → konkretus augalas)

---

## 4. Planų, darbų, progreso ir rezultatų registravimas

**Bendras principas:** kuo mažiau paspaudimų iki įrašo — naudotojas dažnai registruos duomenis stovėdamas darže, vienoje rankoje telefonas.

### Sodo/lysvių planas
- Drag-and-drop redaktorius grid pagrindu (ne laisva forma su tiksliais matmenimis)
- Spalvinis kodavimas pagal augalų grupę/šeimą
- Bakstelėjus ant lysvės — greita info kortelė (ne pilnas puslapis), su galimybe išsiplėsti

### Darbų registravimas
- Greitas "pažymėti atlikta" — vienas bakstelėjimas ant checkbox, be papildomo patvirtinimo
- Naujo darbo pridėjimas: minimali privaloma forma (pavadinimas + data), likę laukai — pasirinktinai išskleidžiami
- Pasikartojantys darbai (recurring) — aiškus vizualinis žymėjimas (pvz. ikona), kad naudotojas matytų, jog tai ne vienkartinis įrašas
- Kalendoriaus + sąrašo vaizdo perjungimas (list/calendar toggle)

### Progreso/rezultatų žurnalas
- Timeline formatas (chronologinis sąrašas su nuotraukomis, panašiai kaip socialinio tinklo feed)
- Greitas įrašas: nuotrauka + trumpas tekstas + automatinė data/vieta (jei leidžiama)
- Galimybė sieti įrašą su konkrečia lysve/augalu (bet neprivaloma — kad neapsunkintų greito naudojimo)
- Metrikos (derliaus kiekis, aukštis ir t.t.) — pasirinktiniai laukai, ne privalomi v1

---

## 5. Nuotraukų įkėlimas

- **Tiesioginis kameros iškvietimas** vienu mygtuku (ne per failų naršyklę) — svarbu lauke
- Kelių nuotraukų įkėlimas vienu metu (multi-select)
- Automatinis suspaudimas/optimizavimas prieš upload (svarbu esant silpnam mobiliam ryšiui)
- Peržiūra prieš patvirtinimą su galimybe ištrinti/pridėti dar
- Progreso indikatorius įkėlimo metu (nes lauko sąlygomis ryšys gali būti lėtas)
- Nuotraukos automatiškai susiejamos su data ir (jei pasirinkta) konkrečia lysve/augalu
- Miniatiūrų galerija progreso žurnale, pilnas peržiūros režimas (lightbox) paspaudus

---

## 6. Prieinamumas (accessibility) — minimalūs reikalavimai

- Kontrastas atitinka WCAG AA lygį (svarbu naudojant lauke, saulėje)
- Palietimo taškai min. 44×44px
- Tekstas skalojamas be layout lūžimo
- Visi interaktyvūs elementai pasiekiami klaviatūra (web versijai)

---

## 7. Kas NĖRA v1 dizaino apimtyje

- AI/agentic funkcijos (personalizuoti pasiūlymai, chat asistentas) — įdomu 2026 m. trendams, bet ne būtina MVP
- Balso valdymas (VUI)
- AR vizualizacija
- 3D elementai

Šie punktai gali būti svarstomi v2, kai bus aiškesnis realaus naudojimo paveikslas.
