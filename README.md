# Jarvis — personlig hubb

En iOS-formad webbapp för tre saker som annars ligger utspridda i appar som inte
pratar med varandra: **matkvitton**, **värdepapper** och **träning**. Byggd för att
växa — nya moduler hakar på samma datalager och samma designsystem.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Konsta UI v5 (`theme="ios"`) · liquidglass-tailwind · Anthropic Claude.

---

## Kom igång

```bash
npm install
npm run dev          # http://localhost:3000
```

Appen startar och fungerar **utan** API-nycklar. Då är det bara AI-funktionerna
som är avstängda; de svarar 503 med en läsbar förklaring i gränssnittet.

### Miljövariabler

Kopiera `.env.example` till `.env.local`:

| Variabel | Krävs för | Utan den |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Allt — databas och inloggning | Appen startar inte |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Allt — databas och inloggning | Appen startar inte |
| `ANTHROPIC_API_KEY` | Kvittotolkning, marknadsbriefing | Manuell inmatning |
| `ANTHROPIC_WORKSPACE_ID` | Bara om nyckeln saknar workspace | Se nedan |
| `FINNHUB_API_KEY` | Automatisk kurshämtning | Kurser matas in för hand |

**Fallgrop med Anthropic-nyckeln.** En nyckel skapad på *organisationsnivå*
tillhör ingen workspace, och då avvisar Anthropic varje anrop med 400 och ber om
huvudet `anthropic-workspace-id`. Två vägar ut: skapa en nyckel som är kopplad
till en workspace, eller sätt `ANTHROPIC_WORKSPACE_ID` (Anthropic Console →
Settings → Workspaces) så skickar appen huvudet åt dig. Appen känner igen det
felet och säger vad som är fel i stället för att bara returnera 400.

På Vercel läggs de under **Project → Settings → Environment Variables**.

---

## Vad som finns

### Kvitton
Fota ett matkvitto. Claude läser det och delar upp det i varor, kvantitet, vikt,
pris och **kilopris** — det sista är hela poängen, eftersom det är där
prisjämförelser faktiskt blir meningsfulla.

Ovanpå det ligger analysen: utgift per kategori, per månad, andel som går till
näringstät mat kontra det som går att stryka, vilka produkter som svänger mest i
kilopris och vilken proteinkälla som faktiskt är billigast av det du köper.

Promptens domänkunskap sitter i `lib/receipt-schema.ts` — svenska butikskedjor,
radformat (`0,684 kg x 129,00 kr/kg`), rabattrader, pant, och de förkortningar
kassasystemen kapar varunamn till. Den filen är rätt ställe att förbättra när
något läses fel.

### Kapital
Innehav med antal och GAV. Kurs är valfri: saknas den värderas innehavet till
anskaffningsvärde och appen **säger** det, i stället för att visa en påhittad
siffra. Exponeringsvyn delar upp portföljen på teman, tillgångsslag, konto eller
valuta, och koncentrationsvarningarna pekar ut när ett innehav eller en valuta
blivit för dominerande.

*Omvärlden* gör riktiga webbsökningar via Claude och ställer nyhetsläget mot dina
faktiska innehav — vad som talar emot, vad som talar för, vad som är värt att hålla
ögonen på, och vad modellen inte kunde verifiera. Det är en lägesbild med källor,
inte rådgivning.

### Kraft
Logga pass med vikt och reps. Vikt och reps förifylls med ditt bästa set senast,
så utgångspunkten är alltid "vad gjorde jag förra gången". Progressionen visar
skattat 1RM (Epley) över tid, volym per pass och per vecka. Kroppsviktsövningar
mäts i reps i stället för 1RM, eftersom 1RM på noll kilo inte betyder någonting.

---

## Var datan bor

**Supabase (Postgres), region eu-north-1.** Inloggning sker med en engångslänk
per mejl — inget lösenord att komma ihåg eller läcka.

Varje tabell har radnivåsäkerhet påslagen med `force row level security`, och en
policy som låser raden till `auth.uid()`. Det innebär att den publika nyckeln i
webbläsarbundlen inte kan läsa eller skriva någonting utan en giltig session.
Verifierat mot det skarpa projektet: anonym läsning ger tomma listor, anonym
skrivning avvisas med `42501 new row violates row-level security policy`.

Därför behöver appen **ingen** secret- eller service-nyckel. Har man en sådan
liggande i miljövariablerna är det en risk utan motsvarande nytta — den går
förbi all radnivåsäkerhet.

Kvittobilder ligger i en privat storage-bucket där sökvägen börjar med
användarens id, och samma ägarregel gäller där. Bilderna nås bara via
tidsbegränsade signerade länkar.

Schemat ligger i `supabase/migrations/`. Lagret mot databasen är samlat i
`lib/repo.ts`; vyerna pratar aldrig med Supabase direkt utan går via
`useStore()`.

## Kodkarta

```
app/
  page.tsx              Hem — sammanfattning från alla tre modulerna
  kvitton/              Skanning, varuanalys, kvittolista
  kapital/              Portfölj, exponering, marknadsbriefing
  kraft/                Passlogg, progression, historik
  api/
    receipt/parse/      Claude vision + strukturerad utdata
    kapital/brief/      Claude + webbsökning
    quotes/             Kurshämtning (Finnhub)
components/
  Shell.tsx             Konsta <App theme="ios"> + navbar + tabbar
  ui.tsx                Glasytor, statistikrutor, flikar
  charts.tsx            Diagram som inline-SVG, inget chartbibliotek
  icons.tsx             Streckikoner i SF Symbols-anda
lib/
  types.ts              Domänmodellen
  repo.ts               Alla Supabase-anrop och kartläggning mot domänmodellen
  supabase/             Klienter för webbläsare, server och middleware
  store.tsx             React-context ovanpå repo.ts
  analytics.ts          All härledd data — mat, kapital, träning
  receipt-schema.ts     Zod-schema + prompten för kvittotolkning
  food.ts               Kategorier, färger, satsa/skär ner-indelning
```

---

## Designsystemet

Två glaslager som medvetet hålls isär:

- **Konsta UI v5** äger navigationslagret — `<App theme="ios">`, navbar, tabbar,
  ark. Konsta v5 har Apples iOS 26 Liquid Glass inbyggd (`<Glass>`,
  `--color-ios-light-glass`, specular highlight som följer pekaren).
- **liquidglass-tailwind** äger innehållslagrets ytor — `glass-card`,
  `glass-shine`, `glass-surface` — där Konsta inte har någon komponent.

**Regeln som gäller överallt: glas läggs aldrig direkt på glas.** Blur staplas
multiplikativt och läsbarheten dör. Nästlat innehåll använder `<Inset>`, som är
opakt.

Diagrammen följer en egen uppsättning regler som står dokumenterade i
`components/charts.tsx`: direktmärkning alltid, ingen paj för många kategorier,
en skala per diagram, text i textfärg aldrig i seriefärg. Tier-paletten
(satsa/neutralt/skär ner) är validerad för mörkt läge — deuteranopi ΔE 8,6,
normalseende ΔE 17,2, kontrast över 3:1.

---

## Deploy

Vercel läser Next.js-projektet utan konfiguration. Bygget klarar sig utan
miljövariabler, så första deployen går igenom direkt — lägg till nycklarna
efteråt och deploya om för att slå på AI-funktionerna.

```bash
npm run build      # produktion
npm run typecheck  # tsc --noEmit
```

---

## Kända begränsningar

- **Supabase Auth måste känna till adressen.** Site URL och tillåtna
  redirect-URL:er sätts i Supabase under Authentication → URL Configuration.
  Stämmer de inte fungerar inte inloggningslänken.
- **Finnhubs gratisnivå täcker i praktiken bara amerikanska aktier.** Nordiska
  tickers och svenska fonder faller igenom och hamnar i `failed`-listan;
  appen visar då anskaffningsvärde och säger att kursen saknas.
- **Valutakurserna är statiska** (`FX_FALLBACK` i `lib/analytics.ts`). Rätt bra
  för att se proportioner, fel för att räkna exakt avkastning i utländska innehav.
- **Kvittotolkningen är inte felfri.** Rader med låg säkerhet flaggas, och när
  radernas summa inte går ihop med kvittots total står avvikelsen kvar i
  gränssnittet i stället för att döljas.
