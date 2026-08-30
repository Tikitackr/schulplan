import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quelleAusFragment, ferienText, terminTexte, offeneAufgaben } from '../seite.js';

// Die Seite darf nur Adressen abrufen, die wie eine Gist-Kennung aussehen.
// Sonst waere sie ein offener Abrufdienst fuer beliebige Adressen.

test('eine gueltige Kennung ergibt eine Adresse', () => {
  const url = quelleAusFragment('#0123456789abcdef0123456789abcdef', 1234);
  assert.ok(url.startsWith('https://gist.githubusercontent.com/'));
  assert.ok(url.includes('/raw/plan.json'));
});

// Gemessen am 30.08.2026: Der Ausliefer-Zwischenspeicher haelt je Variante
// eine eigene Kopie. Unkomprimiert kam die frische Datei, komprimiert - also
// so, wie jeder Browser fragt - eine 45 Minuten alte. 'cache: no-store' im
// fetch hilft nicht, es steuert nur den Browser, nicht das Netz davor.
// Eine wechselnde Kennung an der Adresse macht daraus jedes Mal eine eigene
// Anfrage. Sie ist Teil der Adresse und deshalb hier, nicht im Aufrufer.
test('die Adresse traegt eine wechselnde Kennung gegen den Zwischenspeicher', () => {
  assert.ok(quelleAusFragment('#0123456789abcdef0123456789abcdef', 1234).endsWith('?t=1234'));
  // Ohne Argument muss die Kennung die aktuelle Zeit sein. Ein Vergleich
  // zweier Aufrufe wuerde das nicht zeigen: Ein fester Wert waere ebenfalls
  // verschieden von einem uebergebenen, und zwei Aufrufe in derselben
  // Millisekunde sind gleich. Also gegen die Uhr geprueft.
  const vorher = Date.now();
  const kennung = Number(quelleAusFragment('#0123456789abcdef0123456789abcdef').split('?t=')[1]);
  assert.ok(kennung >= vorher && kennung <= Date.now(), String(kennung));
});

test('ohne Fragment gibt es keine Adresse', () => {
  assert.equal(quelleAusFragment(''), null);
  assert.equal(quelleAusFragment('#'), null);
  assert.equal(quelleAusFragment(undefined), null);
});

test('was keine Kennung ist, wird abgewiesen', () => {
  assert.equal(quelleAusFragment('#https://example.com/beliebig'), null);
  assert.equal(quelleAusFragment('#../../etwas'), null);
  assert.equal(quelleAusFragment('#GROSSBUCHSTABEN'), null);
  assert.equal(quelleAusFragment('#zu-kurz'), null);
  assert.equal(quelleAusFragment('#0123456789abcdef0123456789abcdefX'), null);
  assert.equal(quelleAusFragment('#0123456789abcdef0123456789abcde'), null);
});

import { waehleTag } from '../seite.js';

// Dieselbe Regel wie im Widget: ab 15 Uhr wird heute uebersprungen. Sie muss
// hier ein zweites Mal stehen, weil sie von der Uhrzeit des Betrachters
// abhaengt und der Lauf sie deshalb nicht vorberechnen kann.

const tage = [
  { date: '2026-08-28', lessons: [{}] },
  { date: '2026-08-31', lessons: [{}] },
];

test('vor 15 Uhr gilt heute', () => {
  assert.equal(waehleTag(tage, new Date('2026-08-28T12:00:00')), '2026-08-28');
});

test('ab 15 Uhr gilt der naechste Tag mit Stunden', () => {
  assert.equal(waehleTag(tage, new Date('2026-08-28T15:00:00')), '2026-08-31');
});

test('ein Tag ohne Stunden wird uebersprungen', () => {
  const mitLuecke = [{ date: '2026-08-29', lessons: [] }, ...tage];
  assert.equal(waehleTag(mitLuecke, new Date('2026-08-29T09:00:00')), '2026-08-31');
});

test('ist alles vorbei, bleibt der letzte Tag', () => {
  assert.equal(waehleTag(tage, new Date('2026-12-01T09:00:00')), '2026-08-31');
});

test('ohne Tage gibt es keine Auswahl', () => {
  assert.equal(waehleTag([], new Date()), null);
  assert.equal(waehleTag(undefined, new Date()), null);
});

import { standText } from '../seite.js';

// Der Zeitstempel kommt in ISO-Form. Ungefiltert angezeigt liest er sich als
// "2026.08.28 17:26" - ISO-Reihenfolge mit deutschen Trennern, also weder
// das eine noch das andere.

test('der Stand wird deutsch geschrieben', () => {
  assert.equal(standText('2026-08-28T17:26:48+02:00'), '28.08.2026, 17:26 Uhr');
});

test('ohne Zeitstempel gibt es keine Zeile', () => {
  assert.equal(standText(undefined), null);
  assert.equal(standText(''), null);
  assert.equal(standText('kaputt'), null);
});

import { packEintrag } from '../seite.js';

// Eine Zeile der Packliste seit dem 30.08.2026: { titel } und, wo etwas zu
// verbergen ist, { text } als Details fuer ein Ausklappmenue. Anlass war die
// Mathe-Zeile - vier Gegenstaende mit Lineaturangaben, die die Liste unlesbar
// machten. In der Liste stehen jetzt nur die Faecher.
//
// Eine Mappe bekommt kein Menue: Der Punkt sagt die Farbe, mehr steckt nicht
// dahinter. Ein Pfeil, hinter dem nichts steht, ist ein leeres Versprechen.

test('eine Mappe zeigt nur ihr Fach, die Farbe sagt der Punkt', () => {
  assert.deepEqual(packEintrag({ titel: 'Fach A', text: 'rote Mappe', farbe: '#e03131' }),
                   { titel: 'Fach A', details: null, farbe: '#e03131' });
});

test('mehrere Gegenstaende stehen als Details hinter dem Fach', () => {
  assert.deepEqual(packEintrag({ titel: 'Fach B', text: 'Heft A4, Heft A5, Zirkel' }),
                   { titel: 'Fach B', details: 'Heft A4, Heft A5, Zirkel', farbe: null });
});

test('ein Titel ohne Details bekommt kein Menue', () => {
  assert.deepEqual(packEintrag({ titel: 'Sportsachen' }),
                   { titel: 'Sportsachen', details: null, farbe: null });
});

// Solange der Gist die vorige Fassung ausliefert, heisst das Feld 'fach', und
// wo keines gesetzt war, stand der Titel im Text. Ohne Rueckfall waere die
// Packliste im Fenster zwischen zwei Auslieferungen leer.
test('die vorigen Fassungen werden weiter gelesen', () => {
  assert.deepEqual(packEintrag({ fach: 'Fach B', text: 'Heft A4, Zirkel' }),
                   { titel: 'Fach B', details: 'Heft A4, Zirkel', farbe: null });
  assert.deepEqual(packEintrag({ fach: 'Fach A', text: 'rote Mappe', farbe: '#e03131' }),
                   { titel: 'Fach A', details: null, farbe: '#e03131' });
  assert.deepEqual(packEintrag({ fach: '', text: 'Sportsachen' }),
                   { titel: 'Sportsachen', details: null, farbe: null });
  assert.deepEqual(packEintrag('Sportsachen'),
                   { titel: 'Sportsachen', details: null, farbe: null });
});

test('was keinen Titel hat, wird nicht gezeigt', () => {
  assert.equal(packEintrag({}), null);
  assert.equal(packEintrag({ titel: '' }), null);
  assert.equal(packEintrag(''), null);
  assert.equal(packEintrag(undefined), null);
});

test('was kein Farbwert ist, wird nicht gezeichnet', () => {
  // Die Farbe kommt aus den Daten und wird gezeichnet - also streng geprueft,
  // sonst waere die Darstellung ein Ziel fuer alles, was dort steht.
  for (const unfug of ['rot', '#abc', '#ABCDEF', 'red; background: url(x)', 42, null]) {
    assert.equal(packEintrag({ titel: 'Fach A', text: 'x', farbe: unfug }).farbe, null,
                 String(unfug));
  }
});


import { stundenTitel } from '../seite.js';

// Die zugeklappte Zeile soll sagen, wie lang der Tag wird. Die Anzahl der
// Stunden taugt dafuer nicht: Doppelstunden sind ein Eintrag. Das Ende der
// letzten stattfindenden Stunde steht fertig in den Daten.

test('der Titel nennt das Ende des Tages', () => {
  assert.equal(stundenTitel({ ende: '13:20' }), 'Stundenplan bis 13:20');
});

test('ohne Ende bleibt es beim blossen Wort', () => {
  // Aeltere Daten kennen das Feld nicht, und an einem Tag mit lauter
  // ausgefallenen Stunden gibt es kein Ende.
  assert.equal(stundenTitel({}), 'Stundenplan');
  assert.equal(stundenTitel({ ende: '' }), 'Stundenplan');
  assert.equal(stundenTitel(undefined), 'Stundenplan');
});

test('was keine Uhrzeit ist, wird nicht angezeigt', () => {
  for (const unfug of ['heute', '25:99', 42, null, '13:20 Uhr']) {
    assert.equal(stundenTitel({ ende: unfug }), 'Stundenplan', String(unfug));
  }
});


import { readFileSync } from 'node:fs';

// Die Seite besteht aus zwei Dateien, die GitHub getrennt und mit
// Zwischenspeicher ausliefert. Holt sich ein Geraet die neue index.html, aber
// die alte seite.js, verlangt die Seite Funktionen, die es dort noch nicht
// gibt - das Skript bricht ab und die Seite bleibt bei "Wird geladen ..."
// stehen. Am 29.08.2026 auf Thomas' iPhone passiert.
//
// Die Kennung hinter dem Fragezeichen macht daraus zwei verschiedene
// Adressen: Eine neue index.html holt zwangslaeufig eine neue seite.js.
// Sie MUSS bei jeder Aenderung an seite.js hochgezaehlt werden.

test('die Seite laedt ihr Skript mit einer Fassungskennung', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /from '\.\/seite\.js\?v=\d+'/,
    'ohne ?v=N kann ein Geraet eine alte seite.js mit einer neuen Seite mischen');
});

// Die Naht zwischen Modul und Seite: seite.test.mjs prueft die Funktion,
// niemand prueft, ob index.html sie auch aufruft. Am 30.08.2026 wurde
// terminText zu terminTexte - ein vergessener Aufrufer waere hier still
// geblieben und haette die Terminzeile verschwinden lassen.
test('die Seite ruft die Terminzeilen auch auf', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /terminTexte\(tag\)/);
  assert.doesNotMatch(html, /terminText\(/,
    'die alte Einzahl-Funktion gibt es nicht mehr');
});

// Die Naht zur Packliste: Das Modul liefert titel und details, aber ob die
// Seite daraus ein Menue baut, sieht kein Modultest.
test('die Seite baut aus den Details ein Ausklappmenue', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  // Textpruefung, keine Verhaltenspruefung: Es gibt hier kein DOM. Die
  // Bedingung steht deshalb woertlich in der Erwartung - sonst bliebe der
  // Test gruen, wenn jemand sie auf 'false' setzt (Mutationsprobe 30.08.2026).
  assert.match(html, /if \(stueck\.details\) \{/);
  assert.match(html, /el\('summary', null, stueck\.titel\)/);
  assert.doesNotMatch(html, /packText/, 'die alte Textzeile gibt es nicht mehr');
});

test('die Seite holt ihre Aufgabenliste aus dem Modul', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /offeneAufgaben\(daten\.homework, datum\)/);
  assert.doesNotMatch(html, /filter\(a => !a\.completed/,
    'die Auswahl gehoert ins Modul, wo Tests sie erreichen');
});

test('die Seite meldet sich, wenn sie haengen bleibt', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /Wird geladen/);
  assert.match(html, /nicht vollständig geladen/,
    'ein ewiges "Wird geladen ..." sieht aus wie ein langsames Netz, ist aber ein Fehler');
});

// --- Ferienhinweis ---------------------------------------------------------
// Der Satz kommt fertig aus den Daten, gerechnet wird er im privaten Projekt.
// Hier steht nur, ob er brauchbar ist: Fehlt er, verschwindet die Zeile,
// statt eine Luecke zu zeigen.

test('der Ferienhinweis kommt aus den Daten', () => {
  assert.equal(ferienText({ ferien: 'Herbstferien in 24 Tagen' }), 'Herbstferien in 24 Tagen');
});

test('ohne Ferienhinweis bleibt die Zeile weg', () => {
  assert.equal(ferienText({}), null);
  assert.equal(ferienText({ ferien: '' }), null);
  assert.equal(ferienText(null), null);
});

// Mehrere Termine kommen als Liste. Die Reihenfolge macht die Daten:
// Der naechste steht vorn, die Seite rechnet nichts nach und sortiert nicht
// um. Sie zeigt sie in der Reihenfolge, in der sie ankommen.
test('mehrere Termine kommen in der gelieferten Reihenfolge', () => {
  assert.deepEqual(
    terminTexte({ termine: ['Heute (1.1.): Fach A, Probe', 'Morgen (2.1.): Fach B, Ausflug'] }),
    ['Heute (1.1.): Fach A, Probe', 'Morgen (2.1.): Fach B, Ausflug']);
});

// Solange der Gist noch die vorige Fassung ausliefert, steht dort ein
// einzelner Satz im Feld 'termin'. Die Seite muss beides vertragen, sonst
// bricht die Anzeige in dem Fenster zwischen zwei Auslieferungen.
test('ein einzelner Termin aus der alten Fassung wird zur Liste', () => {
  assert.deepEqual(terminTexte({ termin: 'Heute (1.1.): Fach A, Probe' }),
    ['Heute (1.1.): Fach A, Probe']);
});

test('ohne Termin bleibt die Zeile weg', () => {
  assert.deepEqual(terminTexte({}), []);
  assert.deepEqual(terminTexte({ termine: [] }), []);
  assert.deepEqual(terminTexte({ termin: '' }), []);
  assert.deepEqual(terminTexte(null), []);
});

// Was nicht wie ein Satz aussieht, wird nicht gezeigt. Die Daten kommen von
// woanders her, und die Seite prueft, was sie zeichnet.
test('leere und fremde Eintraege fallen aus der Liste', () => {
  assert.deepEqual(terminTexte({ termine: ['Heute (1.1.): Fach A, Probe', '', null, 42, {}] }),
    ['Heute (1.1.): Fach A, Probe']);
  assert.deepEqual(terminTexte({ termine: 'kein Feld fuer einen Satz' }), []);
});

// --- Die Aufgabenliste -----------------------------------------------------
// Die Auswahl stand bis zum 30.08.2026 inline in index.html und war damit von
// keinem Test erreichbar. Sie steht jetzt hier, weil sie eine Regel hat:
// erledigt raus, vergangen raus, markiert raus, nach Frist sortiert.

const A = (due, rest = {}) => ({ due, text: 'etwas', completed: false, ...rest });

test('offene Aufgaben stehen nach Frist sortiert', () => {
  const liste = offeneAufgaben([A('2026-09-03'), A('2026-09-01')], '2026-09-01');
  assert.deepEqual(liste.map(a => a.due), ['2026-09-01', '2026-09-03']);
});

test('erledigte und vergangene Aufgaben fallen weg', () => {
  const liste = offeneAufgaben([
    A('2026-09-02', { completed: true }),
    A('2026-08-30'),
    A('2026-09-02'),
  ], '2026-09-01');
  assert.deepEqual(liste.map(a => a.due), ['2026-09-02']);
});

// Der Kern der Meldung vom 30.08.2026: Ein Elternabend ist keine Hausaufgabe.
// Markiert wird er im privaten Projekt; hier wird nur nicht gezeigt, was
// markiert ist. Gerechnet wird auch dabei nichts.
test('markierte Ankuendigungen stehen nicht in der Aufgabenliste', () => {
  const liste = offeneAufgaben([
    A('2026-09-01', { keineAufgabe: true }),
    A('2026-09-01'),
  ], '2026-09-01');
  assert.equal(liste.length, 1);
  assert.equal(liste[0].keineAufgabe, undefined);
});

test('ohne Aufgaben kommt eine leere Liste', () => {
  assert.deepEqual(offeneAufgaben(null, '2026-09-01'), []);
  assert.deepEqual(offeneAufgaben([], '2026-09-01'), []);
});
