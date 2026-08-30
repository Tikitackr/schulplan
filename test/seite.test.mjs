import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quelleAusFragment, ferienText, terminTexte, offeneAufgaben } from '../seite.js';

// Die Seite darf nur Adressen abrufen, die wie eine Gist-Kennung aussehen.
// Sonst waere sie ein offener Abrufdienst fuer beliebige Adressen.

test('eine gueltige Kennung ergibt eine Adresse', () => {
  const url = quelleAusFragment('#0123456789abcdef0123456789abcdef');
  assert.ok(url.startsWith('https://gist.githubusercontent.com/'));
  assert.ok(url.endsWith('/raw/plan.json'));
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

// Ein Packlisten-Eintrag kommt aus den Daten als { text } und, wo es eine
// Mappe ist, zusaetzlich als { farbe }. Die Farbe wird zu einem Punkt vor dem
// Text. Was nicht wie ein Farbwert aussieht, wird nicht gezeichnet: Sonst
// stuende ein Wert aus den Daten ungeprueft in der Darstellung.

test('ein Eintrag mit Farbe ergibt Text und Farbe', () => {
  assert.deepEqual(packEintrag({ text: 'etwas', farbe: '#abcdef' }),
                   { fach: null, text: 'etwas', farbe: '#abcdef' });
});

test('ein Eintrag ohne Farbe bekommt keinen Punkt', () => {
  assert.deepEqual(packEintrag({ text: 'etwas' }), { fach: null, text: 'etwas', farbe: null });
});

test('ein blosser Text bleibt lesbar', () => {
  // Die aeltere Fassung der Daten fuehrte die Packliste als Texte. Zwischen
  // einer neuen Seite und dem naechsten stuendlichen Lauf liegt sonst eine
  // Stunde mit leerer Liste.
  assert.deepEqual(packEintrag('etwas'), { fach: null, text: 'etwas', farbe: null });
});

test('was kein Farbwert ist, wird nicht gezeichnet', () => {
  for (const unfug of ['rot', '#abc', '#ABCDEF', 'red; background: url(x)', '#abcdefg', 42, null]) {
    assert.equal(packEintrag({ text: 'etwas', farbe: unfug }).farbe, null, String(unfug));
  }
});

test('ein Eintrag ohne Text ergibt nichts', () => {
  assert.equal(packEintrag({}), null);
  assert.equal(packEintrag(''), null);
  assert.equal(packEintrag(undefined), null);
});

// Vor dem Stueck steht das Fach ("Fach A: rote Mappe"): Die Paarung ist der
// Lerneffekt. Aeltere Daten kennen kein Fach, dann steht nur das Stueck da.

test('das Fach kommt mit', () => {
  assert.deepEqual(packEintrag({ fach: 'Fach A', text: 'etwas', farbe: '#abcdef' }),
                   { fach: 'Fach A', text: 'etwas', farbe: '#abcdef' });
});

test('ohne Fach bleibt das Stueck fuer sich', () => {
  assert.equal(packEintrag({ text: 'etwas' }).fach, null);
  assert.equal(packEintrag('etwas').fach, null);
});

test('ein Fach, das kein Text ist, wird verworfen', () => {
  assert.equal(packEintrag({ fach: 42, text: 'etwas' }).fach, null);
  assert.equal(packEintrag({ fach: '', text: 'etwas' }).fach, null);
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

import { packText } from '../seite.js';

// Was in der Zeile steht. Traegt der Eintrag eine Farbe, ist es eine Mappe -
// dann sagt der Punkt die Farbe und das Wort "rote Mappe" waere dieselbe
// Angabe ein zweites Mal. Ohne Farbe ist das Stueck die eigentliche Angabe.

test('eine Mappe zeigt nur ihr Fach, die Farbe sagt der Punkt', () => {
  assert.equal(packText({ fach: 'Fach A', text: 'rote Mappe', farbe: '#e03131' }),
               'Fach A');
});

test('ohne Farbe steht das Stueck hinter dem Fach', () => {
  assert.equal(packText({ fach: 'Fach B', text: 'ein Beutel', farbe: null }),
               'Fach B: ein Beutel');
});

test('ohne Fach bleibt das Stueck fuer sich', () => {
  // Aeltere Daten kennen kein Fach. Dann faellt nichts weg, auch bei Farbe
  // nicht - sonst stuende dort gar nichts.
  assert.equal(packText({ fach: null, text: 'rote Mappe', farbe: '#e03131' }), 'rote Mappe');
  assert.equal(packText({ fach: null, text: 'Zirkel', farbe: null }), 'Zirkel');
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
