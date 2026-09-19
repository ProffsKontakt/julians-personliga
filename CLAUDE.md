# CLAUDE.md

Projektregler för Jarvis — personlig hubb (kvitton, kapital, kraft).

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

@theme { --color-brand-primary: #0a84ff; }
```

**Konsta omdefinierar `dark`-varianten** till `&:where(.dark, .dark *)`. Därför
har `<html>` klassen `dark` i `app/layout.tsx`. Tas den bort hamnar hela appen i
ljust läge oavsett systemtema — och `<App dark>` räcker inte, den styr bara
huruvida Konsta *genererar* `dark:`-klasserna.

`.ambient` ligger på `z-index: -10` och `body` måste därför vara
`background: transparent`. Sätter man en bakgrund på `body` målas den över
ambient-gradienten och allt glas blir grått.

## Designregler

1. **`<App theme="ios">` genomgående.** Aldrig `material`, aldrig `parent`.
2. **Glas läggs aldrig direkt på glas.** Konsta äger navigationslagret (navbar,
   tabbar, ark). liquidglass-tailwind äger innehållsytorna (`glass-card`).
   Nästlat innehåll inuti ett `GlassCard` använder `<Inset>`, som är opakt.
3. **Svensk text överallt** i gränssnittet. Kod, typer och kommentarer på svenska
   där de beskriver domänen; engelska där de beskriver tekniken.
4. **Siffror är `tnum`** (tabulära) så de inte hoppar när värdet ändras.
5. **Ingen påhittad data.** Saknas en kurs ska gränssnittet säga att den saknas,
   inte fylla i något rimligt. Samma sak när kvittots rader inte summerar till
   totalen: visa avvikelsen.

## Diagram

Reglerna står i `components/charts.tsx` och gäller varje nytt diagram:

- Varje stapel och segment är **alltid direktmärkt med text**. Färg bär aldrig
  identiteten ensam — det är därför femton matkategorier kan samexistera.
- Ingen paj/donut för många kategorier. Vågräta staplar, sorterade fallande.
- En skala per diagram. Aldrig två y-axlar.
- Text bär textfärg, aldrig seriefärgen.
- 2 px mellanrum mellan intilliggande fyllningar, 4 px rundade dataändar,
  2 px linjer, markörer minst 8 px.
- Tier-paletten (`TIER_COLORS`) är validerad mot mörk glasyta. Ändras den ska den
  valideras om — deuteranopi ΔE ≥ 8, normalseende ΔE ≥ 15, kontrast ≥ 3:1.

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

`lib/db.ts` är en fasad med fyra funktioner: `loadState`, `saveState`, `putImage`,
`getImage`. Vyer pratar aldrig med IndexedDB direkt — de går via `useStore()`.
Byts lagringen mot Supabase eller Postgres ska bara `lib/db.ts` behöva ändras.

Ändras `HubState` ska `SCHEMA_VERSION` bumpas och `migrate()` i `lib/db.ts`
hantera övergången. Befintlig data får inte tappas.

## Innan du säger att något är klart

```bash
npm run typecheck
npm run build
```

Bygget måste gå igenom **utan miljövariabler** — Vercels första deploy har inga.

## Skills i repot

`.claude/skills/` innehåller fyra installerade skills: `konsta-ui` (patchad till
v5/Tailwind v4), `liquid-glass`, `apple-design` (med `references/`) och
`liquidglass-design`. De är referensmaterial, inte kod — rör dem bara när
uppströms uppdaterar dem.
