# CLAUDE.md — schulplan

Diese Ablage ist **öffentlich**. Alles hier ist für jeden lesbar, dauerhaft
und über Suchmaschinen auffindbar.

## Die eine Regel

**Hier steht nie eine Schulinformation.** Kein Fachname, keine Mappenfarbe,
kein Raum, kein Personenname, keine Adresse einer Datenquelle. Auch nicht in
Testdaten, auch nicht in Kommentaren, auch nicht "nur als Beispiel".

Testdaten sind erfunden und sehen erfunden aus.

Der Grund: Die Seite zeigt den Stundenplan eines Kindes. Die Daten liegen an
einem nicht auffindbaren Ort, und diese Ablage darf nicht der Wegweiser
dorthin werden.

## Was das hier ist

Nur der Anzeigecode. Die Daten kommen zur Laufzeit von einer Adresse, die im
Link hinter dem Rautezeichen steht.

Gerechnet wird nichts: Was angezeigt wird, kommt fertig aus den Daten. Wer
etwas an der Logik ändern will, ist hier falsch.

## Wo der Stand steht

Im privaten Schwester-Projekt `untis-kalender`, in dessen `CLAUDE.md` und in
`docs/spezifikation-tagesseite.md`. Diese Ablage führt keinen eigenen Stand.

Die folgende Zeile sagt das dem Dashboard-Generator im Vault. Ohne sie meldet
er hier einen fehlenden „Aktueller Stand"-Abschnitt, obwohl das Absicht ist.

Stand-Quelle: ~/Projekte/untis-kalender/CLAUDE.md

## Wenn du seite.js änderst

**Die Kennung `?v=N` im Import in `index.html` hochzählen.** Die beiden
Dateien werden getrennt und mit zehn Minuten Zwischenspeicher ausgeliefert.
Ohne neue Kennung kann ein Gerät die neue `index.html` mit der alten
`seite.js` mischen; dann fehlen der Seite Funktionen, das Skript bricht ab,
und es bleibt bei „Wird geladen …" stehen. Am 29.08.2026 auf einem iPhone
passiert. Ein Test wacht darüber, dass die Kennung überhaupt da ist — dass sie
hochgezählt wurde, kann er nicht wissen.

## Prüfen

`npm test`. Nach jeder Änderung.
