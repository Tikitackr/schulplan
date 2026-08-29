import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quelleAusFragment, ferienText, terminText } from '../seite.js';

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

// Vor dem Stueck steht das Fach ("Englisch: rote Mappe"): Die Paarung ist der
// Lerneffekt. Aeltere Daten kennen kein Fach, dann steht nur das Stueck da.

test('das Fach kommt mit', () => {
  assert.deepEqual(packEintrag({ fach: 'Englisch', text: 'etwas', farbe: '#abcdef' }),
                   { fach: 'Englisch', text: 'etwas', farbe: '#abcdef' });
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
  assert.equal(packText({ fach: 'Englisch', text: 'rote Mappe', farbe: '#e03131' }),
               'Englisch');
});

test('ohne Farbe steht das Stueck hinter dem Fach', () => {
  assert.equal(packText({ fach: 'Sport', text: 'T-Shirt, Hose', farbe: null }),
               'Sport: T-Shirt, Hose');
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

test('der Terminhinweis kommt aus den Daten', () => {
  assert.equal(terminText({ termin: 'In 2 Tagen (31.8.): Englisch, Vokabeltest' }),
    'In 2 Tagen (31.8.): Englisch, Vokabeltest');
});

test('ohne Terminhinweis bleibt die Zeile weg', () => {
  assert.equal(terminText({}), null);
  assert.equal(terminText({ termin: '' }), null);
  assert.equal(terminText(null), null);
});
