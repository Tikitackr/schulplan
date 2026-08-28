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

## Prüfen

`npm test`. Nach jeder Änderung.
