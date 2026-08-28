import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quelleAusFragment } from '../seite.js';

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
