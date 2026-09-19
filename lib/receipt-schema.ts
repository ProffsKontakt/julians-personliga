import { z } from 'zod';
import { FOOD_CATEGORIES, UNITS } from './types';

/**
 * Schemat som modellen tvingas fylla i.
 *
 * `.nullable()` i stället för `.optional()` genomgående: strikta JSON-scheman
 * kräver att varje fält finns i `required`, så "saknas" måste uttryckas som
 * null, inte som frånvaro.
 */
export const ParsedItemSchema = z.object({
  raw: z.string().describe('Raden exakt som den står på kvittot, oförändrad.'),
  name: z
    .string()
    .describe(
      'Normaliserat varunamn på svenska, utan butikens förkortningar. "NTFRS 12%" → "Nötfärs 12%".',
    ),
  brand: z.string().nullable().describe('Varumärke om det framgår, annars null.'),
  category: z.enum(FOOD_CATEGORIES),
  quantity: z.number().describe('Antal enheter. Vid viktvara: 1.'),
  unit: z.enum(UNITS),
  weightGrams: z
    .number()
    .nullable()
    .describe(
      'TOTAL vikt i gram för hela raden. 2 × 500 g → 1000. Viktvara 0,684 kg → 684. Null om varan inte väger något relevant.',
    ),
  volumeMl: z
    .number()
    .nullable()
    .describe('TOTAL volym i ml för hela raden. Null för icke-flytande varor.'),
  totalPrice: z.number().describe('Betalt belopp för raden i kronor, EFTER rabatt.'),
  discount: z
    .number()
    .nullable()
    .describe('Rabatt som dragits på raden, positivt tal. Null om ingen rabatt.'),
  confidence: z
    .number()
    .describe('0–1. Hur säker tolkningen av raden är. Under 0.6 flaggas för manuell koll.'),
});

export const ParsedReceiptSchema = z.object({
  store: z.string().describe('Butikskedja och ort om det framgår, t.ex. "ICA Maxi Högsbo".'),
  purchasedAt: z
    .string()
    .describe('Inköpsdatum som YYYY-MM-DD. Gissa inte — sätt tom sträng om det inte syns.'),
  total: z.number().describe('Totalsumman enligt kvittot, i kronor.'),
  items: z.array(ParsedItemSchema),
  warnings: z
    .array(z.string())
    .describe(
      'Saker du inte kunde läsa: suddiga rader, avklippt kvitto, summa som inte går ihop.',
    ),
});

export type ParsedReceipt = z.infer<typeof ParsedReceiptSchema>;
export type ParsedItem = z.infer<typeof ParsedItemSchema>;

export const RECEIPT_SYSTEM_PROMPT = `Du läser svenska matkvitton och returnerar strukturerad data.

DOMÄNKUNSKAP OM SVENSKA KVITTON

Butiker: ICA (Nära/Supermarket/Kvantum/Maxi), Coop, Willys, Hemköp, Lidl, City Gross,
Mathem, Stora Coop, Tempo. Butiksnamnet står oftast överst, ibland bara som logotyp
plus ort.

Radformat som återkommer:
- "NÖTFÄRS 12% 500G          64,95"  → vanlig styckvara
- "2 st x 24,95              49,90"  → multiplikatorrad; kvantiteten hör till raden ovanför
- "0,684 kg x 129,00 kr/kg   88,24"  → viktvara; weightGrams = 684
- "RABATT                    -12,00" → hör till raden ovanför, dras från dess pris
- "PRISNEDSÄTTNING           -5,50"  → samma sak
- "STAMKUND/MEDLEMSRABATT"            → samma sak
- "PANT 4,00"                         → ingår i priset, egen rad; kategori "ovrigt"

Förkortningar är brutala och ofta avklippta. "NTFRS" = nötfärs. "KYCKLFL" =
kycklingfilé. "MJLK" = mjölk. "GRDDE" = grädde. "PRLNK" = prinskorv.
"ÄGG FRIGÅENDE 15P" = 15 ägg. Använd sammanhanget: butik, pris, kilopris.

REGLER

1. Hoppa över allt som inte är en vara: MOMS, SUMMA, TOTALT, KONTOKORT, KVITTONR,
   ORG.NR, KASSÖR, ÖPPETTIDER, "TACK FÖR DITT BESÖK", bonuspoäng, växel.
2. totalPrice är ALLTID vad raden faktiskt kostade efter rabatt. Ligger rabatten
   på egen rad: dra den och fyll i discount.
3. weightGrams och volumeMl ska vara TOTALEN för raden, inte per styck. Detta är
   hela poängen — kilopriset beräknas ur dessa fält.
4. Står vikten i förpackningsnamnet ("FÄRS 500G", "MJÖLK 1,5L") så räkna ut totalen
   från kvantiteten. 3 × "FÄRS 500G" → weightGrams 1500.
5. Kan du inte läsa en rad: ta med den ändå med raw ifylld, gissa så gott du kan,
   och sätt confidence lågt. Lägg en rad i warnings. Hitta ALDRIG på varor som inte
   står där.
6. Går summan av raderna inte ihop med kvittots total: skriv det i warnings i stället
   för att justera siffrorna. Användaren ska se avvikelsen, inte en tillrättalagd summa.
7. Priser i kronor med decimalpunkt i JSON (64.95), inte svenskt decimalkomma.
8. Datum ska vara YYYY-MM-DD. Syns inget datum: tom sträng. Gissa aldrig ett datum.

KATEGORISERING

kott, fisk, agg, mejeri, frukt, gronsaker, notter-fron, spannmal, fett-olja,
dryck, godis-snacks, fardigmat, krydda-sas, hushall, ovrigt.

Gränsdragningar: charkuterier → kott. Ost och smör → mejeri (smör är mejeri, inte
fett-olja). Olivolja och rapsolja → fett-olja. Juice och läsk → dryck. Mjölk → mejeri,
inte dryck. Pizza, sallad och annan färdig mat → fardigmat. Müsli och bröd → spannmal.
Frysta grönsaker → gronsaker. Tvättmedel, papper, batterier → hushall.`;
