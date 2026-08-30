// Die Adresse der Datenquelle steht hinter dem Rautezeichen im Link.
// Browser senden diesen Teil nicht an den Server, und in dieser Ablage steht
// er nirgends. Wer die Seite ohne ihn oeffnet, sieht keine Daten.
//
// Geprueft wird streng: Eine Gist-Kennung besteht aus 32 Zeichen, nur Ziffern
// und a-f. Ohne diese Pruefung waere die Seite ein Abrufdienst fuer beliebige
// fremde Adressen - jeder koennte ihr eine eigene anhaengen.
const KENNUNG = /^[0-9a-f]{32}$/;

//
// Die Adresse traegt eine wechselnde Kennung ('?t='). Gemessen am 30.08.2026:
// Der Ausliefer-Zwischenspeicher haelt je Kompressionsvariante eine eigene
// Kopie. Unkomprimiert abgerufen kam die frische Datei, komprimiert - also so,
// wie jeder Browser fragt - eine 45 Minuten alte. Die Seite sah damit richtig
// aus und zeigte trotzdem den vorletzten Stand. 'cache: no-store' im fetch
// half nicht: Es steuert den Browser, nicht das Netz davor. Die Kennung macht
// aus jedem Aufruf eine eigene Anfrage.
export function quelleAusFragment(fragment, jetzt = Date.now()) {
  const roh = String(fragment || '').replace(/^#/, '').trim();
  if (!KENNUNG.test(roh)) return null;
  return `https://gist.githubusercontent.com/Tikitackr/${roh}/raw/plan.json?t=${jetzt}`;
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
  // Drei Fassungen der Daten treffen hier aufeinander, und alle drei muessen
  // lesbar bleiben: Der Gist liefert nach einer Aenderung noch bis zum
  // naechsten stuendlichen Lauf die vorige Datei.
  //   heute    { titel, text?, farbe? }
  //   vorher   { fach, text, farbe? }   - Sport trug ein leeres Fach
  //   ganz alt 'ein blosser Text'
  const eintrag = typeof roh === 'string' ? { titel: roh } : roh;
  const wort = w => (typeof w === 'string' && w !== '' ? w : null);

  // Der Titel steht in der Liste. Wo die vorige Fassung kein Fach kannte,
  // war der Text selbst die Zeile - dann ist er der Titel.
  const neueFassung = eintrag?.titel !== undefined;
  const titel = neueFassung
    ? wort(eintrag.titel)
    : wort(eintrag?.fach) || wort(eintrag?.text);
  if (!titel) return null;

  const farbe = typeof eintrag.farbe === 'string' && FARBWERT.test(eintrag.farbe)
    ? eintrag.farbe
    : null;

  // Eine Mappe bekommt kein Menue: Der Punkt sagt die Farbe, mehr steckt
  // nicht dahinter. Ein Pfeil, hinter dem nichts steht, ist ein leeres
  // Versprechen.
  // Wo der Text schon der Titel ist (Sport in der vorigen Fassung, ein
  // blosser Text), gibt es nichts zu verbergen. Eine zusaetzliche Abfrage auf
  // die Fassung waere toter Code - die Mutationsprobe hat das am 30.08.2026
  // gezeigt: Sie blieb gruen, weil dieser Vergleich denselben Fall schon
  // abfaengt.
  const roher = wort(eintrag?.text);
  const details = farbe || roher === titel ? null : roher;
  return { titel, details, farbe };
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

// Die Terminhinweise, etwa "In 2 Tagen (31.8.): Fach A, Probe…". Sie
// entstehen im privaten Projekt aus dem Freitext der Hausaufgaben - die
// einzige Stelle, die raet. Deshalb nennt jeder Satz das erkannte Datum: So
// sieht man in einer Sekunde, ob die Erkennung recht hat.
//
// Es koennen mehrere sein, der naechste zuerst. Die Reihenfolge kommt fertig
// aus den Daten; hier wird nicht sortiert, wie hier ueberhaupt nichts
// gerechnet wird.
//
// Das Feld 'termin' mit einem einzelnen Satz ist die vorige Fassung. Es wird
// weiter gelesen, weil der Gist nach einer Aenderung noch bis zu einer Stunde
// die alte Datei ausliefert - in diesem Fenster wuerde die Zeile sonst
// verschwinden.
//
// Fehlt beides, gibt es die Zeile nicht. Das ist der Normalfall - die meisten
// Aufgaben nennen kein Datum.
export function terminTexte(tag) {
  const satz = t => typeof t === 'string' && t !== '';
  const liste = tag?.termine;
  if (Array.isArray(liste)) return liste.filter(satz);
  return satz(tag?.termin) ? [tag.termin] : [];
}

// Welche Aufgaben an einem Tag noch offen sind: erledigte raus, abgelaufene
// raus, nach Frist sortiert. Bis zum 30.08.2026 stand diese Auswahl inline in
// index.html und war von keinem Test erreichbar.
//
// Eintraege mit 'keineAufgabe' bleiben ebenfalls draussen. Es sind
// Ankuendigungen, die als Hausaufgabe eingetragen wurden - ein Elternabend
// etwa. Welche das sind, entscheidet das private Projekt und markiert sie;
// hier wird nur nicht gezeigt, was markiert ist. Sie stehen oben in den
// Terminzeilen, dort ungekuerzt.
export function offeneAufgaben(homework, datum) {
  return (homework || [])
    .filter(a => !a.completed && !a.keineAufgabe && a.due >= datum)
    .sort((a, b) => a.due.localeCompare(b.due));
}
