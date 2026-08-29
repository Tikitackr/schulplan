// Die Adresse der Datenquelle steht hinter dem Rautezeichen im Link.
// Browser senden diesen Teil nicht an den Server, und in dieser Ablage steht
// er nirgends. Wer die Seite ohne ihn oeffnet, sieht keine Daten.
//
// Geprueft wird streng: Eine Gist-Kennung besteht aus 32 Zeichen, nur Ziffern
// und a-f. Ohne diese Pruefung waere die Seite ein Abrufdienst fuer beliebige
// fremde Adressen - jeder koennte ihr eine eigene anhaengen.
const KENNUNG = /^[0-9a-f]{32}$/;

export function quelleAusFragment(fragment) {
  const roh = String(fragment || '').replace(/^#/, '').trim();
  if (!KENNUNG.test(roh)) return null;
  return `https://gist.githubusercontent.com/Tikitackr/${roh}/raw/plan.json`;
}

// Ab dieser Stunde zeigt die Seite den naechsten Tag statt des heutigen.
// Muss mit SWITCH_TO_TOMORROW_HOUR im Widget uebereinstimmen: Zwei Anzeigen,
// die zur selben Zeit verschiedene Tage behaupten, sind schlimmer als eine
// unbequeme Regel.
//
// Warum die Regel hier ein zweites Mal steht und nicht vorberechnet wird:
// Welcher Tag gilt, haengt an der Uhr des Betrachters. Der Lauf, der die
// Daten baut, weiss nicht, wann jemand die Seite oeffnet.
export const WECHSEL_AB_STUNDE = 15;

export function waehleTag(days, jetzt) {
  const mitStunden = (days || []).filter(d => d.lessons && d.lessons.length > 0);
  if (mitStunden.length === 0) return null;
  const sortiert = [...mitStunden].sort((a, b) => a.date.localeCompare(b.date));
  const heute = [
    jetzt.getFullYear(),
    String(jetzt.getMonth() + 1).padStart(2, '0'),
    String(jetzt.getDate()).padStart(2, '0'),
  ].join('-');
  const spaet = jetzt.getHours() >= WECHSEL_AB_STUNDE;
  const treffer = sortiert.find(d => (spaet ? d.date > heute : d.date >= heute));
  // Liegt alles in der Vergangenheit, ist der letzte Tag ehrlicher als eine
  // leere Seite: So sieht man, dass die Daten alt sind.
  return (treffer || sortiert[sortiert.length - 1]).date;
}

// Der Zeitstempel der Daten kommt in ISO-Form. Ungefiltert gezeigt liest er
// sich als "2026.08.28 17:26" - ISO-Reihenfolge mit deutschen Trennern, also
// weder das eine noch das andere.
export function standText(generated) {
  const m = String(generated || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, jahr, monat, tag, stunde, minute] = m;
  return `${tag}.${monat}.${jahr}, ${stunde}:${minute} Uhr`;
}

// Ein Punkt in der Farbe der Mappe steht vor dem Text: Die Farbe ist die
// eigentliche Information, und ein Fuenftklaessler am Morgen sieht schneller
// als er liest. Sie kommt fertig aus den Daten, weil in dieser oeffentlichen
// Ablage kein Mappenname stehen darf - die Seite koennte sie also nicht aus
// dem Text ableiten.
//
// Geprueft wird streng, aus demselben Grund wie bei der Kennung oben: Der
// Wert landet in einer Stilangabe. Ungeprueft waere die Darstellung ein Ziel
// fuer alles, was in den Daten steht. Was die Pruefung nicht besteht, bekommt
// keinen Punkt statt einen falschen.
const FARBWERT = /^#[0-9a-f]{6}$/;

export function packEintrag(roh) {
  // Die aeltere Fassung der Daten fuehrte die Packliste als blosse Texte.
  const eintrag = typeof roh === 'string' ? { text: roh } : roh;
  const text = eintrag?.text;
  if (typeof text !== 'string' || text === '') return null;
  const farbe = typeof eintrag.farbe === 'string' && FARBWERT.test(eintrag.farbe)
    ? eintrag.farbe
    : null;
  // Das Fach steht vor dem Stueck: "Englisch: rote Mappe". Wer das liest,
  // merkt sich die Farbe zum Fach. Aeltere Daten kennen kein Fach.
  const fach = typeof eintrag.fach === 'string' && eintrag.fach !== ''
    ? eintrag.fach
    : null;
  return { fach, text, farbe };
}

// Die zugeklappte Zeile soll sagen, wie lang der Tag wird. Die Anzahl der
// Stunden taugt dafuer nicht: Doppelstunden stehen als ein Eintrag da, vier
// Eintraege koennen ein kurzer oder ein langer Tag sein. Das Ende der letzten
// stattfindenden Stunde sagt es - ausgerechnet wird es dort, wo die Daten
// entstehen, nicht hier.
const UHRZEIT = /^([01]\d|2[0-3]):[0-5]\d$/;

export function stundenTitel(tag) {
  const ende = tag?.ende;
  if (typeof ende !== 'string' || !UHRZEIT.test(ende)) return 'Stundenplan';
  return 'Stundenplan bis ' + ende;
}

// Was in der Zeile der Packliste steht.
//
// Traegt der Eintrag eine Farbe, ist es eine Mappe. Dann sagt der Punkt die
// Farbe, und "Englisch: rote Mappe" saehe dieselbe Angabe zweimal. Es bleibt
// beim Fach. Ohne Farbe (Hefte, Zirkel, Sportzeug) ist das Stueck die
// eigentliche Angabe und steht hinter dem Fach.
//
// Der Preis ist bewusst in Kauf genommen: Kommt die Farbe nicht durch, traegt
// die Zeile die Mappe nicht mehr in Worten nach.
export function packText(eintrag) {
  if (!eintrag?.fach) return eintrag?.text ?? '';
  return eintrag.farbe ? eintrag.fach : eintrag.fach + ': ' + eintrag.text;
}

// Der Ferienhinweis, etwa "Herbstferien in 24 Tagen". Er kommt fertig aus den
// Daten: Gerechnet wird im privaten Projekt, hier steht nur die Anzeige.
//
// Er haengt am Tag und nicht an der Datei, weil die Seite blaettert - ein
// Countdown von heute stuende auf jedem anderen Tag falsch da. Fehlt er,
// verschwindet die Zeile. Das ist der Normalfall, wenn der Ferienabruf
// ausgefallen ist, und besser als eine erfundene Zahl.
export function ferienText(tag) {
  const text = tag?.ferien;
  return typeof text === 'string' && text !== '' ? text : null;
}
