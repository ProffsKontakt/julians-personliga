# CLAUDE.md

Projektregler för Jarvis — personlig hubb (företag, kapital, kvitton, kraft).

## Stack (verifierad, inte gissad)

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind CSS **v4** ·
Konsta UI **v5** · liquidglass-tailwind · `@anthropic-ai/sdk`.

## Tailwind v4 + Konsta v5 — läs detta innan du rör CSS

Konsta v5 konfigureras **CSS-först**. Det finns ingen `tailwind.config.js` och
ingen `konsta/config`-export; båda hörde till Konsta v3/v4 på Tailwind v3. Äldre
guider på nätet (och capgo-skillens ursprungliga setup-avsnitt) är skrivna för den
gamla världen.

All temakonfiguration ligger i `app/globals.css`:

```css
@import 'tailwindcss';
@import 'konsta/react/theme.css';
@plugin 'liquidglass-tailwind';
@source '../node_modules/konsta/react';   /* annars skakas Konstas klasser bort */

@theme { --color-brand-primary: #6ee2ff; }
```

**Konsta omdefinierar `dark`-varianten** till `&:where(.dark, .dark *)`. Därför
har `<html>` klassen `dark` i `app/layout.tsx`. Tas den bort hamnar hela appen i
ljust läge oavsett systemtema — och `<App dark>` räcker inte, den styr bara
huruvida Konsta *genererar* `dark:`-klasserna.

`.ambient` ligger på `z-index: -10` och `body` måste därför vara
`background: transparent`. Sätter man en bakgrund på `body` målas den över
ambient-gradienten och allt glas blir grått. Ambienten renderas av `<Shell>`
(och av inloggningssidan), inte av layouten — den måste ligga inuti det
`data-tron`-satta trädet för att ärva skärmens accent.

### Tre fällor som kostat tid, i tur och ordning

1. **`@theme`-tokens bakas in som literaler.** Tailwind v4 kan expandera
   `--color-primary` till ett hexvärde i utvecklingsbygget men lämna det som
   `var(--k-color-primary)` i produktionsbygget. Skriver man bara om det ena
   ledet blir appen rätt lokalt och fel i skarpt läge. Därför sätter
   `[data-tron='rod']` **både** `--k-color-*` och `--color-*`. En accent som
   ska gå att byta får aldrig ligga i `@theme` — den ligger som vanlig custom
   property på en wrapper.
2. **Skriv aldrig `-webkit-backdrop-filter` efter `backdrop-filter`.**
   Lightning CSS deduperar paret och behåller den sista deklarationen. Blir
   det den prefixade försvinner effekten helt i Chromium, som inte längre
   stöder aliaset — verifierat: `-webkit-backdrop-filter` ensamt ger
   `backdropFilter: none`. Skriv bara standardegenskapen; Lightning CSS
   prefixar själv.
3. **Konstas `colors`-props sätts med `!`.** `colors={{ bgIos: '…' }}` slår ut
   en egen klass på samma element. Tabbaren blev genomskinlig av precis det.
   Låt `bgClassName` bära bakgrunden och skicka ingen `colors`-override.

## Designspråk — Tron

Två accentfamiljer, aldrig blandade i samma vy. Det är inte en stilgrej: i
filmerna äger varje rutnät exakt en färg, och det är det som gör bilderna
läsbara trots att nästan allt är svart.

| | Hex | Skärmar | Betyder |
|---|---|---|---|
| Cyan (Tron Legacy) | `#6ee2ff` | Hem, Företag, Kapital | det som byggs upp |
| Röd-orange (Ares) | `#ff5a2d` | Kvitton, Kraft | det som förbrukas |

Cyanfamiljen är hämtad ur publicerade Tron Legacy-paletter — `#6ee2ff`
återfinns i fem oberoende källor. Den röda är förankrad i `#FF410D`, den enda
belagda röd-orangea färgen från Legacy, och byggd därifrån. **Ares röda är i
filmen närmare klarröd (nyans 10–14°) än orange.** Paletten här ligger på
gränsen, mörkt brinnande, så att den aldrig förväxlas med Clus bärnsten
(nyans 35–45°). Höjer man nyansen över ~20° tappar skärmen sin Ares-känsla.

Accenten sätts av `<Shell>` via `data-tron` på en wrapper och byts per rutt.
**Hem är det namngivna undantaget från en-nyans-per-skärm**: sektionerna för
Kraft och Mat ligger i ett eget `data-tron="rod"`, så varje block bär sin egen
rutts färg. Två nyanser på den skärmen, aldrig tre.

Sidans svarta är blåsvart (`#07090c`), aldrig `#000` — glöden behöver något att
falla av i.

## Designregler

1. **`<App theme="ios">` genomgående.** Aldrig `material`, aldrig `parent`.
2. **Glas läggs aldrig direkt på glas.** Nästlat innehåll inuti ett
   `GlassCard` använder `<Inset>` (`.well`), som saknar kortets ljuslogik —
   det är just frånvaron som gör att hierarkin läses. På mörkt går nästlade
   ytor **ljusare**, inte mörkare; man kan inte gå under svart.
3. **Ljus sitter på kanter, aldrig i kroppen.** Ett kort är en mörk yta med en
   ljusare överkant, inte en ljus platta. Pluginets `.glass-card` (15 % vitt +
   jämn ram + `.glass-shine`) gör tvärtom och läser som grå plast — den och
   dess syskonklasser används inte längre. Ytorna definieras i `app/globals.css`
   som `.pane`, `.well` och `.chrome`.
4. **Högst två backdrop-filter per skärm.** Appen låg på 15–22 och hackade.
   Korten i rullflödet har medvetet inget filter — de ligger på ambientlagret,
   inte på rullande innehåll, så det finns ingenting att sudda. Filtren är
   reserverade för navigationslagret. Verifiera med:
   `[...document.querySelectorAll('*')].filter(el => getComputedStyle(el).backdropFilter !== 'none').length`
5. **Svensk text överallt** i gränssnittet. Kod, typer och kommentarer på svenska
   där de beskriver domänen; engelska där de beskriver tekniken.
6. **Siffror är `tnum`** (tabulära) så de inte hoppar när värdet ändras.
7. **Ingen påhittad data.** Saknas en kurs ska gränssnittet säga att den saknas,
   inte fylla i något rimligt. Samma sak när kvittots rader inte summerar till
   totalen: visa avvikelsen.

## Diagram

Reglerna står i `components/charts.tsx` och gäller varje nytt diagram:

- **Kategoristaplar bär EN färg — skärmens accent.** Matkategorier, innehav och
  exponeringar är *nominella*: att färga dem olika spenderar identitetskanalen
  på att upprepa det stapellängden redan visar. Femton färger var fel svar på
  rätt fråga. Etiketten (ikon + text) bär identiteten, längden bär storleken.
- **`TIER_COLORS` är den enda äkta flerseriepaletten.** En divergerande skala
  med appens två poler och en neutral mitt:
  `#0aa6c4` (satsa) · `#666b73` (neutralt) · `#ff410d` (skär ner). Validerad
  mot glasytan `#151A21` i mörkt läge — alla tre i ljushetsbandet, kontrast
  ≥ 3:1, sämsta par ΔE 12,5 (protanopi) och 17,9 (normalseende), alltså över
  golvet på 15. **Ändras den ska den valideras om** med
  `scripts/validate_palette.js` ur dataviz-skillen.
- Varje stapel och segment är alltid direktmärkt med text.
- Ingen paj/donut. Vågräta staplar, sorterade fallande.
- En skala per diagram. Aldrig två y-axlar.
- Text bär textfärg, aldrig seriefärgen.
- **Negativa värden ritas nedåt från en nollinje, i `#ff6b4a`.** Ett diagram som
  klampar alla staplar uppåt får en förlustmånad att se ut som en liten vinst.
- 2 px mellanrum mellan intilliggande fyllningar, 4 px rundade dataändar,
  2 px linjer, markörer minst 8 px.
- `Reactor` är nollpunktsmätaren på Hem: månadens täckningsbidrag mot de fasta
  kostnaderna, där hela varvet är nollpunkten och ett andra varv är vinsten.
  Saknas fasta kostnader ritas ingen mätare — en tom ring hade påstått att
  nollpunkten var noll.

## Anthropic-anrop

- Modell: `claude-opus-5` (konstanten `MODEL` i `lib/anthropic.ts`).
- Strukturerad utdata via `messages.parse()` + `zodOutputFormat`, i
  `output_config.format`. Inte det utfasade `output_format`.
- Zod-scheman använder `.nullable()`, aldrig `.optional()` — strikta JSON-scheman
  kräver att varje fält finns i `required`, så "saknas" måste vara `null`.
- Webbsökning: `web_search_20260209`. Turer kan sluta med `pause_turn` — återuppta
  loopen (se `app/api/kapital/brief/route.ts`), annars trunkeras svaret tyst.
- Varje rutt returnerar läsbara svenska felmeddelanden via `errorResponse()`.
  Saknad nyckel ger 503 med instruktion, inte en krasch.

## Datalagret

**Supabase (Postgres), eu-north-1.** Inloggning med mejl och lösenord, ett enda
konto. En trigger på `auth.users` avvisar registrering med annan adress.

- `lib/repo.ts` äger varje anrop mot databasen och all kartläggning mellan
  databasens snake_case och domänmodellens camelCase. Vyer pratar aldrig med
  Supabase direkt — de går via `useStore()`.
- `lib/supabase/` har tre klienter: webbläsare, server och middleware. De delar
  samma publika nyckel; sessionen kommer från kakan.
- Schemat ligger i `supabase/migrations/`. Ändras `lib/types.ts` ska en ny
  migration följa med — enum-värdena finns på båda ställena.

### Företagsmodulen

`deals` och `fixed_costs` (migration `0002_foretag.sql`). Distinktionen är hela
poängen: en affärs **rörliga** kostnad försvinner om affären inte blir av, de
**fasta** löper ändå.

```
TB (täckningsbidrag) = varde − rorlig_kostnad     ← genererad kolumn i databasen
TG (täckningsgrad)   = TB / varde                 ← odefinierad vid varde = 0
Resultat             = Σ TB (vunna) − Σ fasta kostnader för månaden
```

- `resultatmarginal` heter medvetet **inte** vinstmarginal: modellen känner
  varken avskrivningar, ränta eller skatt.
- `vunnen` och `fakturerad` är båda vunna — skillnaden är om pengarna kommit in.
  Utan den uppdelningen går det inte att skilja en bra månad från en månad där
  allt ligger i kundfordringar.
- **Viktad pipeline hoppar över affärer utan satt sannolikhet** och redovisar
  både belopp och antal som hamnat utanför. En gissad procentsats ser mer
  komplett ut och är mindre sann.
- Säljcykeln är en **median**, aldrig ett medelvärde, och antalet den vilar på
  redovisas.
- Vinstfrekvensen räknas bara på affärer som avgjorts i perioden; öppna affärer
  får aldrig räknas som förluster.
- Ett databasvillkor kopplar `stangd` till `status` — en stängd affär måste ha
  ett datum, en öppen får inte ha ett.

### Säkerhetsregler som inte får brytas

1. **Ingen secret- eller service-nyckel i appen.** Allt går som den inloggade
   användaren, och radnivåsäkerheten avgör vad som får läsas och skrivas. En
   secret-nyckel går förbi hela RLS och har ingen plats här.
2. **Varje ny tabell ska ha `user_id`, RLS påslagen med `force`, och en policy
   mot `auth.uid()`** — i samma migration som tabellen skapas. Verifiera efteråt
   med ett anonymt anrop: läsning ska ge tom lista, skrivning ska ge `42501`.
3. **Nya rutter under `/api/` som kostar pengar anropar `requireUser()` först.**
   Middleware skyddar redan `/api/` med 401, men ett enda lager mellan ett
   anonymt anrop och en faktura är för tunt.
4. **`getUser()`, aldrig `getSession()`** på serversidan. Den senare läser bara
   kakan, som klienten kan ha hittat på.
5. **Omdirigeringsmål valideras.** `/auth/callback` släpper bara igenom interna
   sökvägar; en öppen omdirigering där skickar användaren vidare med sessionen
   nyss satt.

## Externa datakällor

- **BörsAPI (`borsapi.se`)** — `lib/borsapi.ts`. Bearer-auth, inte query-param.
  Ger fundamenta och händelser: rapportkalender, insynshandel, blankning.
  **Ger inga kurser** — specen saknar prisfält helt. Föreslå den aldrig som
  kurskälla.
  Kvot: kalender, insyn och blankning är gratis; bolagssökning kostar. Därför
  är sökningen debouncad 500 ms och cachad ett dygn.
- **Finnhub** — kurser. Gratisnivån täcker i praktiken bara amerikanska aktier.
- Nycklar till externa källor stannar på servern. Bara `NEXT_PUBLIC_*` når
  webbläsaren, och där ligger bara Supabase-URL och den publika nyckeln.

## Innan du säger att något är klart

```bash
npm run typecheck
npm run build
```

Bygget måste gå igenom **utan miljövariabler** — verifierat 2026-09-20 genom att
bygga med `.env.local` bortflyttad. Supabase-klienterna kastar först när de
anropas, inte vid import, vilket är det som håller regeln sann. Bryts det går
inte en ny deploy upp innan variablerna är på plats.

## Skills i repot

`.claude/skills/` innehåller fyra installerade skills: `konsta-ui` (patchad till
v5/Tailwind v4), `liquid-glass`, `apple-design` (med `references/`) och
`liquidglass-design`. De är referensmaterial, inte kod — rör dem bara när
uppströms uppdaterar dem.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
