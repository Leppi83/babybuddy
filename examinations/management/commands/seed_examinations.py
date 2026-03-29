from django.core.management.base import BaseCommand, CommandError
from examinations.models import ExaminationProgram, ExaminationType, ExaminationQuestion

GERMANY_DATA = {
    "country_code": "de",
    "name": "Deutschland – Vorsorgeuntersuchungen",
    "types": [
        {
            "code": "U1",
            "name": "U1 – Erstuntersuchung",
            "age_min_days": 0,
            "age_max_days": 3,
            "order": 1,
            "description": "Unmittelbar nach der Geburt. Beurteilung der Vitalfunktionen und des Allgemeinzustandes des Neugeborenen.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                # Arzt: APGAR
                {"category": "APGAR", "text": "APGAR-Score nach 1 Minute", "doctor_only": True, "answer_type": "number", "order": 4},
                {"category": "APGAR", "text": "APGAR-Score nach 5 Minuten", "doctor_only": True, "answer_type": "number", "order": 5},
                {"category": "APGAR", "text": "APGAR-Score nach 10 Minuten", "doctor_only": True, "answer_type": "number", "order": 6},
                # Arzt: Körperliche Untersuchung
                {"category": "Körperliche Untersuchung", "text": "Herz und Kreislauf unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 7},
                {"category": "Körperliche Untersuchung", "text": "Lunge und Atmung unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 8},
                {"category": "Körperliche Untersuchung", "text": "Abdomen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 9},
                {"category": "Körperliche Untersuchung", "text": "Genitale und Hoden unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 10},
                {"category": "Körperliche Untersuchung", "text": "Wirbelsäule und Extremitäten unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 11},
                {"category": "Körperliche Untersuchung", "text": "Haut unauffällig (kein Ikterus, keine Ödeme)", "doctor_only": True, "answer_type": "boolean", "order": 12},
                # Arzt: Reflexe
                {"category": "Reflexe", "text": "Moro-Reflex vorhanden", "doctor_only": True, "answer_type": "boolean", "order": 13},
                {"category": "Reflexe", "text": "Saugreflex vorhanden", "doctor_only": True, "answer_type": "boolean", "order": 14},
                {"category": "Reflexe", "text": "Greifreflex vorhanden", "doctor_only": True, "answer_type": "boolean", "order": 15},
                # Arzt: Screening
                {"category": "Screening", "text": "Pulsoxymetrie (kritische Herzfehler) durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 16},
                {"category": "Screening", "text": "Neugeborenen-Hörscreening durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 17},
                {"category": "Screening", "text": "Erweitertes Neugeborenenscreening (Stoffwechsel) eingeleitet", "doctor_only": True, "answer_type": "boolean", "order": 18},
                {"category": "Screening", "text": "Mukoviszidose-Screening eingeleitet", "doctor_only": True, "answer_type": "boolean", "order": 19},
                {"category": "Prophylaxe", "text": "Vitamin-K-Prophylaxe verabreicht", "doctor_only": True, "answer_type": "boolean", "order": 20},
            ],
        },
        {
            "code": "U2",
            "name": "U2 – 3.–10. Lebenstag",
            "age_min_days": 3,
            "age_max_days": 10,
            "order": 2,
            "description": "Erkennung von Erkrankungen, die einer sofortigen Behandlung bedürfen. Erweitertes Neugeborenenscreening.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                # Arzt: Körperliche Untersuchung
                {"category": "Körperliche Untersuchung", "text": "Nabel unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Ikterus (Gelbsucht) bewertet", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Hüftgelenke klinisch unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 6},
                {"category": "Körperliche Untersuchung", "text": "Herz und Kreislauf unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 7},
                # Arzt: Screening
                {"category": "Screening", "text": "Neugeborenen-Hörscreening: Ergebnis dokumentiert", "doctor_only": True, "answer_type": "boolean", "order": 8},
                {"category": "Screening", "text": "Erweitertes Neugeborenenscreening: Ergebnis dokumentiert", "doctor_only": True, "answer_type": "boolean", "order": 9},
                {"category": "Screening", "text": "Stuhlfarb-Karte ausgehändigt (Gallengangsatresie)", "doctor_only": True, "answer_type": "boolean", "order": 10},
                # Arzt: Prophylaxe
                {"category": "Prophylaxe", "text": "Vitamin-K-Gabe (2. Dosis) erfolgt", "doctor_only": True, "answer_type": "boolean", "order": 11},
                {"category": "Prophylaxe", "text": "Vitamin-D und Fluorid empfohlen", "doctor_only": True, "answer_type": "boolean", "order": 12},
                # Eltern
                {"category": "Elternfragebogen", "text": "Wird Ihr Kind gestillt?", "doctor_only": False, "answer_type": "boolean", "order": 13},
                {"category": "Elternfragebogen", "text": "Trinkt Ihr Kind ausreichend?", "doctor_only": False, "answer_type": "boolean", "order": 14},
                {"category": "Elternfragebogen", "text": "Hat Ihr Kind regelmäßigen Stuhlgang?", "doctor_only": False, "answer_type": "boolean", "order": 15},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 16},
            ],
        },
        {
            "code": "U3",
            "name": "U3 – 4.–5. Lebenswoche",
            "age_min_days": 21,
            "age_max_days": 56,
            "order": 3,
            "description": "Erste umfassende Vorsorgeuntersuchung nach der Neugeborenenphase. Beurteilung der körperlichen und geistigen Entwicklung.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                # Arzt: Körperliche Untersuchung
                {"category": "Körperliche Untersuchung", "text": "Hüftsonografie unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augen: Fixieren und Folgen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Herz und Kreislauf unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 6},
                {"category": "Körperliche Untersuchung", "text": "Tonus und Reflexe unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 7},
                # Eltern: Vorgeschichte
                {"category": "Vorgeschichte", "text": "Gab es Probleme in der Schwangerschaft oder bei der Geburt?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                # Eltern: Ernährung
                {"category": "Ernährung", "text": "Wird Ihr Kind gestillt?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Ernährung", "text": "Haben Sie Schwierigkeiten beim Trinken oder Schlucken bemerkt?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Ernährung", "text": "Erhält Ihr Kind täglich Vitamin D?", "doctor_only": False, "answer_type": "boolean", "order": 11},
                # Eltern: Entwicklung
                {"category": "Entwicklung", "text": "Schaut Ihr Kind aufmerksam in Ihr Gesicht?", "doctor_only": False, "answer_type": "boolean", "order": 12},
                {"category": "Entwicklung", "text": "Folgt Ihr Kind einem Gegenstand mit den Augen nach beiden Seiten?", "doctor_only": False, "answer_type": "boolean", "order": 13},
                {"category": "Entwicklung", "text": "Lächelt Ihr Kind, wenn Sie mit ihm sprechen (soziales Lächeln)?", "doctor_only": False, "answer_type": "boolean", "order": 14},
                {"category": "Entwicklung", "text": "Reagiert Ihr Kind auf Geräusche (erschrickt, hält inne)?", "doctor_only": False, "answer_type": "boolean", "order": 15},
                # Eltern: Verhalten
                {"category": "Verhalten", "text": "Schreit oder quengelt Ihr Kind oft ohne erkennbaren Grund?", "doctor_only": False, "answer_type": "boolean", "order": 16},
                {"category": "Verhalten", "text": "Lässt sich Ihr Kind beruhigen, wenn es schreit?", "doctor_only": False, "answer_type": "boolean", "order": 17},
                {"category": "Verhalten", "text": "Schläft Ihr Kind überwiegend in Rückenlage?", "doctor_only": False, "answer_type": "boolean", "order": 18},
                # Eltern: Familie
                {"category": "Familie", "text": "Werden Sie von Familie oder Freunden ausreichend unterstützt?", "doctor_only": False, "answer_type": "boolean", "order": 19},
                {"category": "Familie", "text": "Haben Sie sich seit der Geburt häufig niedergeschlagen oder hoffnungslos gefühlt?", "doctor_only": False, "answer_type": "boolean", "order": 20},
                # Gesamteinschätzung
                {"category": "Gesamteinschätzung", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 21},
            ],
        },
        {
            "code": "U4",
            "name": "U4 – 3.–4. Lebensmonat",
            "age_min_days": 70,
            "age_max_days": 120,
            "order": 4,
            "description": "Beurteilung der Haltungs- und Bewegungsentwicklung sowie der Sinneswahrnehmung.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                # Arzt: Körperliche Untersuchung
                {"category": "Körperliche Untersuchung", "text": "Hüftgelenke unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augen: Lichtreaktion und Pupillen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Herz und Kreislauf unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 6},
                {"category": "Körperliche Untersuchung", "text": "Motorik: Kopfheben in Bauchlage, Tonus unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 7},
                # Eltern: Vorgeschichte
                {"category": "Vorgeschichte", "text": "Gab es seit der letzten Untersuchung Erkrankungen oder Operationen?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                # Eltern: Prophylaxe
                {"category": "Prophylaxe", "text": "Erhält Ihr Kind täglich Vitamin D?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Prophylaxe", "text": "Erhält Ihr Kind Fluorid (Kariesprophylaxe)?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                # Eltern: Verhalten / Regulation
                {"category": "Verhalten", "text": "Schreit oder quengelt Ihr Kind oft ohne erkennbaren Grund?", "doctor_only": False, "answer_type": "boolean", "order": 11},
                {"category": "Verhalten", "text": "Lässt sich Ihr Kind auf dem Arm gut beruhigen?", "doctor_only": False, "answer_type": "boolean", "order": 12},
                {"category": "Verhalten", "text": "Braucht Ihr Kind sehr lange zum Einschlafen (länger als 30 Minuten)?", "doctor_only": False, "answer_type": "boolean", "order": 13},
                # Eltern: Ernährung
                {"category": "Ernährung", "text": "Sind die Mahlzeiten mühsam oder sehr langwierig (länger als 45 Minuten)?", "doctor_only": False, "answer_type": "boolean", "order": 14},
                {"category": "Ernährung", "text": "Verweigert Ihr Kind Brust oder Flasche?", "doctor_only": False, "answer_type": "boolean", "order": 15},
                # Eltern: Entwicklung
                {"category": "Entwicklung", "text": "Freut sich Ihr Kind über Zuwendung (lächelt, gluckst)?", "doctor_only": False, "answer_type": "boolean", "order": 16},
                {"category": "Entwicklung", "text": "Erwidert Ihr Kind das Lächeln einer Bezugsperson (soziales Lächeln)?", "doctor_only": False, "answer_type": "boolean", "order": 17},
                {"category": "Entwicklung", "text": "Hält Ihr Kind Blickkontakt?", "doctor_only": False, "answer_type": "boolean", "order": 18},
                {"category": "Entwicklung", "text": "Reagiert Ihr Kind, wenn es angesprochen wird?", "doctor_only": False, "answer_type": "boolean", "order": 19},
                {"category": "Entwicklung", "text": "Hebt Ihr Kind in Bauchlage den Kopf an?", "doctor_only": False, "answer_type": "boolean", "order": 20},
                # Eltern: Familie
                {"category": "Familie", "text": "Fühlen Sie sich ausreichend unterstützt?", "doctor_only": False, "answer_type": "boolean", "order": 21},
                # Gesamteinschätzung
                {"category": "Gesamteinschätzung", "text": "Sind Sie insgesamt zufrieden mit dem Verhalten und der Entwicklung Ihres Kindes?", "doctor_only": False, "answer_type": "boolean", "order": 22},
                {"category": "Gesamteinschätzung", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 23},
            ],
        },
        {
            "code": "U5",
            "name": "U5 – 6.–7. Lebensmonat",
            "age_min_days": 155,
            "age_max_days": 210,
            "order": 5,
            "description": "Überprüfung der motorischen Entwicklung und der Sinneswahrnehmung.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                # Arzt: Körperliche Untersuchung
                {"category": "Körperliche Untersuchung", "text": "Hörprüfung unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augenstellung unauffällig (kein Schielen)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Motorik: Stützen auf gestreckten Armen in Bauchlage, Tonus unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 6},
                # Eltern: Vorgeschichte
                {"category": "Vorgeschichte", "text": "Gab es seit der letzten Untersuchung Erkrankungen oder Operationen?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                # Eltern: Prophylaxe
                {"category": "Prophylaxe", "text": "Erhält Ihr Kind täglich Vitamin D?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Prophylaxe", "text": "Erhält Ihr Kind Fluorid (Kariesprophylaxe)?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                # Eltern: Verhalten / Regulation
                {"category": "Verhalten", "text": "Ist Ihr Kind oft unruhig oder unzufrieden?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Verhalten", "text": "Lässt sich Ihr Kind gut beruhigen?", "doctor_only": False, "answer_type": "boolean", "order": 11},
                {"category": "Verhalten", "text": "Schläft Ihr Kind tagsüber regelmäßig?", "doctor_only": False, "answer_type": "boolean", "order": 12},
                {"category": "Verhalten", "text": "Wacht Ihr Kind nachts häufiger als zweimal schreiend auf?", "doctor_only": False, "answer_type": "boolean", "order": 13},
                # Eltern: Ernährung
                {"category": "Ernährung", "text": "Sind die Mahlzeiten mühsam oder sehr langwierig?", "doctor_only": False, "answer_type": "boolean", "order": 14},
                {"category": "Ernährung", "text": "Hat die Beikost (Brei) bereits begonnen?", "doctor_only": False, "answer_type": "boolean", "order": 15},
                # Eltern: Entwicklung
                {"category": "Entwicklung", "text": "Greift Ihr Kind nach Gegenständen mit beiden Händen?", "doctor_only": False, "answer_type": "boolean", "order": 16},
                {"category": "Entwicklung", "text": "Wechselt Ihr Kind Spielzeug von einer Hand in die andere?", "doctor_only": False, "answer_type": "boolean", "order": 17},
                {"category": "Entwicklung", "text": "Dreht sich Ihr Kind von der Rücken- in die Bauchlage?", "doctor_only": False, "answer_type": "boolean", "order": 18},
                {"category": "Entwicklung", "text": "Plappert Ihr Kind mit Silbenketten (z. B. ge-ge, da-da)?", "doctor_only": False, "answer_type": "boolean", "order": 19},
                {"category": "Entwicklung", "text": "Lacht Ihr Kind laut, wenn es geneckt wird?", "doctor_only": False, "answer_type": "boolean", "order": 20},
                {"category": "Entwicklung", "text": "Zeigt Ihr Kind unterschiedliches Verhalten gegenüber bekannten und unbekannten Personen?", "doctor_only": False, "answer_type": "boolean", "order": 21},
                {"category": "Entwicklung", "text": "Freut sich Ihr Kind beim Erscheinen anderer Kinder?", "doctor_only": False, "answer_type": "boolean", "order": 22},
                # Gesamteinschätzung
                {"category": "Gesamteinschätzung", "text": "Sind Sie insgesamt zufrieden mit dem Verhalten und der Entwicklung Ihres Kindes?", "doctor_only": False, "answer_type": "boolean", "order": 23},
                {"category": "Gesamteinschätzung", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 24},
            ],
        },
        {
            "code": "U6",
            "name": "U6 – 10.–12. Lebensmonat",
            "age_min_days": 280,
            "age_max_days": 365,
            "order": 6,
            "description": "Beurteilung der Entwicklung zur Selbstständigkeit und der Sprachentwicklung.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Stand und erste Schritte unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Hüften unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 6},
                # Eltern: Vorgeschichte
                {"category": "Vorgeschichte", "text": "Gab oder gibt es schwerwiegende Erkrankungen, Operationen oder Krampfanfälle?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Vorgeschichte", "text": "Schwierigkeiten beim Trinken, Füttern oder Schluckstörungen?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Vorgeschichte", "text": "Auffällige Stühle (Verstopfung oder häufiger Durchfall)?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Vorgeschichte", "text": "Regelmäßiges Schnarchen?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Vorgeschichte", "text": "Gibt es besondere Belastungen in Ihrer Familie?", "doctor_only": False, "answer_type": "boolean", "order": 11},
                # Eltern: Entwicklung
                {"category": "Entwicklung", "text": "Ist Ihr Kind oft ausgeglichen?", "doctor_only": False, "answer_type": "boolean", "order": 12},
                {"category": "Entwicklung", "text": "Lässt es sich gut beruhigen?", "doctor_only": False, "answer_type": "boolean", "order": 13},
                {"category": "Entwicklung", "text": "Schläft es gut?", "doctor_only": False, "answer_type": "boolean", "order": 14},
                {"category": "Entwicklung", "text": "Kann es frei mit geradem Rücken und sicherer Gleichgewichtskontrolle sitzen?", "doctor_only": False, "answer_type": "boolean", "order": 15},
                {"category": "Entwicklung", "text": "Benutzt es Fingerspitzen von Zeigefinger und Daumen beim Greifen?", "doctor_only": False, "answer_type": "boolean", "order": 16},
                {"category": "Entwicklung", "text": "Deutet es mit dem Zeigefinger gezielt auf Gegenstände oder Personen?", "doctor_only": False, "answer_type": "boolean", "order": 17},
                {"category": "Entwicklung", "text": "Zieht es sich selbständig an Möbeln o.ä. hoch?", "doctor_only": False, "answer_type": "boolean", "order": 18},
                {"category": "Entwicklung", "text": "Bleibt es stehen, wenn es die Möglichkeit hat, sich festzuhalten?", "doctor_only": False, "answer_type": "boolean", "order": 19},
                {"category": "Entwicklung", "text": "Formt es Doppelsilben wie \"da-da\" oder \"ba-ba\"?", "doctor_only": False, "answer_type": "boolean", "order": 20},
                {"category": "Entwicklung", "text": "Kann es \"Mama\" und/oder \"Papa\" sagen?", "doctor_only": False, "answer_type": "boolean", "order": 21},
                {"category": "Entwicklung", "text": "Versteht es ausgesprochene Verbote (\"Nein!\", \"Halt!\")?", "doctor_only": False, "answer_type": "boolean", "order": 22},
                {"category": "Entwicklung", "text": "Sucht es die Schallquelle, wenn es Musik hört?", "doctor_only": False, "answer_type": "boolean", "order": 23},
                {"category": "Entwicklung", "text": "Unterscheidet es zwischen fremden und bekannten Personen?", "doctor_only": False, "answer_type": "boolean", "order": 24},
                {"category": "Entwicklung", "text": "Sucht es von sich aus Kontakt zu Ihnen durch Blicke, Gesten, Mimik oder Plappern?", "doctor_only": False, "answer_type": "boolean", "order": 25},
                {"category": "Entwicklung", "text": "Freut es sich über andere Kinder?", "doctor_only": False, "answer_type": "boolean", "order": 26},
                # Eltern: Ernährung
                {"category": "Ernährung", "text": "Isst Ihr Kind am Tisch mit?", "doctor_only": False, "answer_type": "boolean", "order": 27},
                {"category": "Ernährung", "text": "Wird es noch gestillt?", "doctor_only": False, "answer_type": "boolean", "order": 28},
                {"category": "Ernährung", "text": "Erhält es noch Formulanahrung (Flasche)?", "doctor_only": False, "answer_type": "boolean", "order": 29},
                {"category": "Ernährung", "text": "Erhält es täglich Vitamin D und Fluorid?", "doctor_only": False, "answer_type": "boolean", "order": 30},
                # Eltern: Gesamteinschätzung
                {"category": "Gesamteinschätzung", "text": "Sind Sie insgesamt zufrieden mit dem Verhalten und der Entwicklung Ihres Kindes?", "doctor_only": False, "answer_type": "boolean", "order": 31},
            ],
        },
        {
            "code": "U7",
            "name": "U7 – 21.–24. Lebensmonat",
            "age_min_days": 575,
            "age_max_days": 730,
            "order": 7,
            "description": "Sprachentwicklung im Mittelpunkt. Beurteilung der Motorik und sozialen Entwicklung.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                # Arzt: Körperliche Untersuchung
                {"category": "Körperliche Untersuchung", "text": "Sprachbeurteilung durch den Arzt durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Gang und Gleichgewicht unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Augenstellung unauffällig (kein Schielen)", "doctor_only": True, "answer_type": "boolean", "order": 6},
                # Eltern: Vorgeschichte
                {"category": "Vorgeschichte", "text": "Gab es seit der letzten Untersuchung schwerwiegende Erkrankungen oder Operationen?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Vorgeschichte", "text": "Schnarcht Ihr Kind regelmäßig?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                # Eltern: Motorik
                {"category": "Motorik", "text": "Läuft Ihr Kind sicher und rennt es?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Motorik", "text": "Geht Ihr Kind Treppen hinauf (mit Festhalten)?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Motorik", "text": "Kann Ihr Kind kleine Türme bauen (mind. 3 Klötzchen)?", "doctor_only": False, "answer_type": "boolean", "order": 11},
                {"category": "Motorik", "text": "Kann Ihr Kind selbstständig mit dem Löffel essen?", "doctor_only": False, "answer_type": "boolean", "order": 12},
                # Eltern: Sprache
                {"category": "Sprache", "text": "Benutzt Ihr Kind mindestens 12 verschiedene Wörter?", "doctor_only": False, "answer_type": "boolean", "order": 13},
                {"category": "Sprache", "text": "Bildet Ihr Kind 2-Wort-Sätze (z. B. \"Mama da\", \"Auto weg\")?", "doctor_only": False, "answer_type": "boolean", "order": 14},
                {"category": "Sprache", "text": "Versteht Ihr Kind einfache Aufforderungen (z. B. \"Bring mir den Ball\")?", "doctor_only": False, "answer_type": "boolean", "order": 15},
                {"category": "Sprache", "text": "Schaut Ihr Kind gern Bilderbücher an und zeigt dazu?", "doctor_only": False, "answer_type": "boolean", "order": 16},
                {"category": "Sprache", "text": "Drückt Ihr Kind deutlich aus, wenn es etwas nicht möchte?", "doctor_only": False, "answer_type": "boolean", "order": 17},
                # Eltern: Sozial/Emotional
                {"category": "Sozial/Emotional", "text": "Versucht Ihr Kind, Sie irgendwo hinzuziehen oder auf Dinge hinzuzeigen?", "doctor_only": False, "answer_type": "boolean", "order": 18},
                {"category": "Sozial/Emotional", "text": "Spielt Ihr Kind Alltagstätigkeiten nach (z. B. Kochen, Puppe versorgen)?", "doctor_only": False, "answer_type": "boolean", "order": 19},
                {"category": "Sozial/Emotional", "text": "Zeigt Ihr Kind Interesse an anderen Kindern?", "doctor_only": False, "answer_type": "boolean", "order": 20},
                {"category": "Sozial/Emotional", "text": "Kann Ihr Kind eine kurze Zeit allein spielen, wenn Sie in der Nähe sind?", "doctor_only": False, "answer_type": "boolean", "order": 21},
                # Eltern: Schlaf
                {"category": "Schlaf", "text": "Braucht Ihr Kind meist weniger als 1 Stunde zum Einschlafen?", "doctor_only": False, "answer_type": "boolean", "order": 22},
                {"category": "Schlaf", "text": "Schläft Ihr Kind meist durch (oder liegt nachts weniger als 1 Stunde wach)?", "doctor_only": False, "answer_type": "boolean", "order": 23},
                # Eltern: Ernährung
                {"category": "Ernährung", "text": "Sind Sie mit dem Essverhalten Ihres Kindes zufrieden?", "doctor_only": False, "answer_type": "boolean", "order": 24},
                # Gesamteinschätzung
                {"category": "Gesamteinschätzung", "text": "Sind Sie mit der Sprachentwicklung Ihres Kindes zufrieden?", "doctor_only": False, "answer_type": "boolean", "order": 25},
                {"category": "Gesamteinschätzung", "text": "Sind Sie insgesamt zufrieden mit der Entwicklung Ihres Kindes?", "doctor_only": False, "answer_type": "boolean", "order": 26},
                {"category": "Gesamteinschätzung", "text": "Welche Fragen möchten Sie gerne besprechen?", "doctor_only": False, "answer_type": "text", "order": 27},
            ],
        },
        {
            "code": "U7a",
            "name": "U7a – 34.–36. Lebensmonat",
            "age_min_days": 1005,
            "age_max_days": 1095,
            "order": 8,
            "description": "Beurteilung von Sprache, Verhalten und sozialer Entwicklung vor dem Kindergarteneintritt.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                # Arzt: Körperliche Untersuchung
                {"category": "Körperliche Untersuchung", "text": "Sprachentwicklung bewertet (mind. 2-Wort-Sätze erwartet)", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Verhaltensbeurteilung unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augenstellung unauffällig (kein Schielen)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                # Eltern: Vorgeschichte
                {"category": "Vorgeschichte", "text": "Gab es seit der letzten Untersuchung schwerwiegende Erkrankungen oder Operationen?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                # Eltern: Motorik
                {"category": "Motorik", "text": "Hüpft Ihr Kind sicher mit beiden Beinen von der untersten Treppenstufe?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Motorik", "text": "Geht Ihr Kind Treppen im Wechselschritt?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Motorik", "text": "Kann Ihr Kind beim Rennen Hindernisse umgehen und plötzlich anhalten?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Motorik", "text": "Benutzt Ihr Kind beim Greifen kleiner Gegenstände die Fingerspitzen?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Motorik", "text": "Kann Ihr Kind eingewickelte Bonbons oder kleine Gegenstände auspacken?", "doctor_only": False, "answer_type": "boolean", "order": 11},
                {"category": "Motorik", "text": "Isst Ihr Kind mit dem Löffel mit wenig Kleckern?", "doctor_only": False, "answer_type": "boolean", "order": 12},
                # Eltern: Sprache
                {"category": "Sprache", "text": "Spricht Ihr Kind in Sätzen mit 3–5 Wörtern?", "doctor_only": False, "answer_type": "boolean", "order": 13},
                {"category": "Sprache", "text": "Verwendet Ihr Kind den eigenen Vornamen?", "doctor_only": False, "answer_type": "boolean", "order": 14},
                {"category": "Sprache", "text": "Hört Ihr Kind Kinderliedern oder Reimen aufmerksam zu?", "doctor_only": False, "answer_type": "boolean", "order": 15},
                {"category": "Sprache", "text": "Sind Sie mit der Sprachentwicklung Ihres Kindes zufrieden?", "doctor_only": False, "answer_type": "boolean", "order": 16},
                # Eltern: Sozial
                {"category": "Sozial/Emotional", "text": "Spielt Ihr Kind Rollenspiele (z. B. Kochen, Puppen füttern)?", "doctor_only": False, "answer_type": "boolean", "order": 17},
                {"category": "Sozial/Emotional", "text": "Spielt Ihr Kind über mehrere Minuten mit anderen Kindern zusammen?", "doctor_only": False, "answer_type": "boolean", "order": 18},
                {"category": "Sozial/Emotional", "text": "Hilft Ihr Kind im Haushalt mit und ahmt Tätigkeiten Erwachsener nach?", "doctor_only": False, "answer_type": "boolean", "order": 19},
                # Eltern: Kita / Prophylaxe
                {"category": "Prophylaxe", "text": "Besucht Ihr Kind eine Kita?", "doctor_only": False, "answer_type": "boolean", "order": 20},
                {"category": "Prophylaxe", "text": "Putzt Ihr Kind die Zähne mit fluoridhaltiger Kinderzahnpasta?", "doctor_only": False, "answer_type": "boolean", "order": 21},
                # Eltern: Hören
                {"category": "Hören", "text": "Haben Sie den Eindruck, dass Ihr Kind gut hören kann?", "doctor_only": False, "answer_type": "boolean", "order": 22},
                {"category": "Hören", "text": "Schnarcht Ihr Kind regelmäßig?", "doctor_only": False, "answer_type": "boolean", "order": 23},
                {"category": "Hören", "text": "Hatte Ihr Kind bereits mehr als 3 Mittelohrentzündungen?", "doctor_only": False, "answer_type": "boolean", "order": 24},
                {"category": "Hören", "text": "Dreht Ihr Kind Radio oder Fernseher auffallend laut?", "doctor_only": False, "answer_type": "boolean", "order": 25},
                # Gesamteinschätzung
                {"category": "Gesamteinschätzung", "text": "Sind Sie insgesamt zufrieden mit der Entwicklung Ihres Kindes?", "doctor_only": False, "answer_type": "boolean", "order": 26},
                {"category": "Gesamteinschätzung", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 27},
            ],
        },
        {
            "code": "U8",
            "name": "U8 – 46.–48. Lebensmonat",
            "age_min_days": 1370,
            "age_max_days": 1460,
            "order": 9,
            "description": "Schwerpunkt: Sehen, Hören, Sprache und Verhalten vor der Einschulung.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                # Arzt: Untersuchungen
                {"category": "Sinne", "text": "Sehtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Sinne", "text": "Hörtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Motorik", "text": "Grobmotorik unauffällig (Einbeinstand, Hüpfen)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Sprache", "text": "Sprachentwicklung bewertet", "doctor_only": True, "answer_type": "boolean", "order": 6},
                # Eltern: Vorgeschichte
                {"category": "Vorgeschichte", "text": "Sind seit der letzten Untersuchung schwerwiegende Erkrankungen, Krampfanfälle oder Operationen aufgetreten?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Vorgeschichte", "text": "Zeigen sich bei Ihrem Kind Ernährungsschwierigkeiten?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                # Eltern: Motorik / Selbstständigkeit
                {"category": "Motorik", "text": "Geht Ihr Kind wechselfüßig Treppen rauf und runter, ohne sich festzuhalten?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Motorik", "text": "Kann Ihr Kind Dreirad oder Laufrad fahren?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Selbstständigkeit", "text": "Zieht sich Ihr Kind weitgehend selbstständig an und aus?", "doctor_only": False, "answer_type": "boolean", "order": 11},
                {"category": "Selbstständigkeit", "text": "Kann Ihr Kind Knöpfe öffnen?", "doctor_only": False, "answer_type": "boolean", "order": 12},
                {"category": "Selbstständigkeit", "text": "Kann Ihr Kind Flüssigkeiten aus einer Flasche in ein Glas gießen?", "doctor_only": False, "answer_type": "boolean", "order": 13},
                {"category": "Selbstständigkeit", "text": "Kann sich Ihr Kind selbst ein Brot schmieren?", "doctor_only": False, "answer_type": "boolean", "order": 14},
                {"category": "Selbstständigkeit", "text": "Geht Ihr Kind selbstständig auf die Toilette?", "doctor_only": False, "answer_type": "boolean", "order": 15},
                {"category": "Selbstständigkeit", "text": "Ist Ihr Kind tagsüber trocken?", "doctor_only": False, "answer_type": "boolean", "order": 16},
                # Eltern: Sprache
                {"category": "Sprache", "text": "Sind Sie mit der Sprachentwicklung Ihres Kindes zufrieden?", "doctor_only": False, "answer_type": "boolean", "order": 17},
                {"category": "Sprache", "text": "Wird Ihr Kind von seiner Umgebung (auch Fremden) gut verstanden?", "doctor_only": False, "answer_type": "boolean", "order": 18},
                {"category": "Sprache", "text": "Stottert Ihr Kind?", "doctor_only": False, "answer_type": "boolean", "order": 19},
                {"category": "Sprache", "text": "Stellt Ihr Kind Fragen mit \"Warum?\", \"Wieso?\"?", "doctor_only": False, "answer_type": "boolean", "order": 20},
                # Eltern: Hören / Sehen
                {"category": "Hören/Sehen", "text": "Haben Sie den Eindruck, dass Ihr Kind gut hören kann?", "doctor_only": False, "answer_type": "boolean", "order": 21},
                {"category": "Hören/Sehen", "text": "Schnarcht Ihr Kind oder hält es beim Schnarchen die Luft an (Atempausen)?", "doctor_only": False, "answer_type": "boolean", "order": 22},
                {"category": "Hören/Sehen", "text": "Missversteht Ihr Kind häufig Anweisungen, wenn es dabei nicht auf den Mund sehen kann?", "doctor_only": False, "answer_type": "boolean", "order": 23},
                {"category": "Hören/Sehen", "text": "Haben Sie den Eindruck, dass Ihr Kind gut sehen kann (kein Schielen, keine Sehminderung)?", "doctor_only": False, "answer_type": "boolean", "order": 24},
                # Eltern: Sozial/Emotional
                {"category": "Sozial/Emotional", "text": "Besucht Ihr Kind einen Kindergarten?", "doctor_only": False, "answer_type": "boolean", "order": 25},
                {"category": "Sozial/Emotional", "text": "Spielt Ihr Kind Rollenspiele mit anderen Kindern?", "doctor_only": False, "answer_type": "boolean", "order": 26},
                {"category": "Sozial/Emotional", "text": "Beteiligt sich Ihr Kind an Regelspielen (Brettspiele, Kreisspiele)?", "doctor_only": False, "answer_type": "boolean", "order": 27},
                {"category": "Sozial/Emotional", "text": "Kann Ihr Kind seine Emotionen bei alltäglichen Ereignissen meist ausreichend regulieren?", "doctor_only": False, "answer_type": "boolean", "order": 28},
                {"category": "Sozial/Emotional", "text": "Trennt sich Ihr Kind ohne große Schwierigkeiten für einige Stunden von Ihnen?", "doctor_only": False, "answer_type": "boolean", "order": 29},
                # Gesamteinschätzung
                {"category": "Gesamteinschätzung", "text": "Sind Sie mit der Entwicklung und dem Verhalten Ihres Kindes zufrieden?", "doctor_only": False, "answer_type": "boolean", "order": 30},
                {"category": "Gesamteinschätzung", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 31},
            ],
        },
        {
            "code": "U9",
            "name": "U9 – 60.–64. Lebensmonat",
            "age_min_days": 1800,
            "age_max_days": 1950,
            "order": 10,
            "description": "Letzte Vorsorgeuntersuchung vor der Einschulung. Schulreife und Gesamtentwicklung.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                # Arzt: Untersuchungen
                {"category": "Sinne", "text": "Sehtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Sinne", "text": "Hörtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Koordination", "text": "Koordinations- und Gleichgewichtstest durchgeführt (Einbeinstand, Hüpfen)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Sprache", "text": "Sprachentwicklung und Aussprache bewertet", "doctor_only": True, "answer_type": "boolean", "order": 6},
                # Eltern: Vorgeschichte
                {"category": "Vorgeschichte", "text": "Sind seit der letzten Untersuchung schwerwiegende Erkrankungen oder Operationen aufgetreten?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                # Eltern: Motorik
                {"category": "Motorik", "text": "Kann Ihr Kind Treppen wechselfüßig ohne Festhalten steigen?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Motorik", "text": "Kann Ihr Kind 10 Sekunden auf einem Bein stehen?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Motorik", "text": "Kann Ihr Kind 10-mal auf einem Bein hüpfen?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Motorik", "text": "Kann Ihr Kind einen Ball aus ca. 2 m Entfernung fangen?", "doctor_only": False, "answer_type": "boolean", "order": 11},
                {"category": "Motorik", "text": "Kann Ihr Kind mit einer Kinderschere an einer geraden Linie entlangschneiden?", "doctor_only": False, "answer_type": "boolean", "order": 12},
                # Eltern: Kognition
                {"category": "Kognition", "text": "Erkennt Ihr Kind die Farben Rot, Gelb, Grün und Blau?", "doctor_only": False, "answer_type": "boolean", "order": 13},
                {"category": "Kognition", "text": "Kann Ihr Kind eine Person mit mindestens 4 Körperteilen zeichnen?", "doctor_only": False, "answer_type": "boolean", "order": 14},
                {"category": "Kognition", "text": "Erzählt Ihr Kind Ereignisse und Geschichten in richtiger zeitlicher Reihenfolge?", "doctor_only": False, "answer_type": "boolean", "order": 15},
                {"category": "Kognition", "text": "Kann Ihr Kind bis 10 zählen?", "doctor_only": False, "answer_type": "boolean", "order": 16},
                {"category": "Kognition", "text": "Kennt Ihr Kind seinen vollständigen Namen?", "doctor_only": False, "answer_type": "boolean", "order": 17},
                # Eltern: Selbstständigkeit
                {"category": "Selbstständigkeit", "text": "Zieht sich Ihr Kind selbstständig an?", "doctor_only": False, "answer_type": "boolean", "order": 18},
                {"category": "Selbstständigkeit", "text": "Kann Ihr Kind selbstständig auf die Toilette gehen?", "doctor_only": False, "answer_type": "boolean", "order": 19},
                {"category": "Selbstständigkeit", "text": "Ist Ihr Kind tagsüber und nachts trocken?", "doctor_only": False, "answer_type": "boolean", "order": 20},
                # Eltern: Sozial/Emotional
                {"category": "Sozial/Emotional", "text": "Spielt Ihr Kind Rollenspiele mit anderen Kindern?", "doctor_only": False, "answer_type": "boolean", "order": 21},
                {"category": "Sozial/Emotional", "text": "Versteht und hält Ihr Kind Spielregeln ein?", "doctor_only": False, "answer_type": "boolean", "order": 22},
                {"category": "Sozial/Emotional", "text": "Lädt Ihr Kind andere Kinder ein und wird selbst eingeladen?", "doctor_only": False, "answer_type": "boolean", "order": 23},
                {"category": "Sozial/Emotional", "text": "Besucht Ihr Kind einen Kindergarten?", "doctor_only": False, "answer_type": "boolean", "order": 24},
                # Eltern: Hören / Sehen
                {"category": "Hören/Sehen", "text": "Haben Sie den Eindruck, dass Ihr Kind gut hören kann?", "doctor_only": False, "answer_type": "boolean", "order": 25},
                {"category": "Hören/Sehen", "text": "Schnarcht Ihr Kind regelmäßig?", "doctor_only": False, "answer_type": "boolean", "order": 26},
                {"category": "Hören/Sehen", "text": "Haben Sie den Eindruck, dass Ihr Kind gut sehen kann?", "doctor_only": False, "answer_type": "boolean", "order": 27},
                # Gesamteinschätzung
                {"category": "Gesamteinschätzung", "text": "Sind Sie mit der Entwicklung und dem Verhalten Ihres Kindes zufrieden?", "doctor_only": False, "answer_type": "boolean", "order": 28},
                {"category": "Gesamteinschätzung", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 29},
            ],
        },
        {
            "code": "J1",
            "name": "J1 – 12.–14. Lebensjahr",
            "age_min_days": 4380,
            "age_max_days": 5110,
            "order": 11,
            "description": "Jugendgesundheitsuntersuchung in der Pubertät. Körperliche und psychische Entwicklung.",
            "questions": [
                # Arzt: Körpermaße
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "BMI berechnet", "doctor_only": True, "answer_type": "boolean", "order": 3},
                # Arzt: Körperliche Untersuchung
                {"category": "Körperliche Untersuchung", "text": "Blutdruck gemessen", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Wirbelsäule untersucht (Skoliose)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Pubertätsstadium (Tanner) bewertet", "doctor_only": True, "answer_type": "boolean", "order": 6},
                {"category": "Körperliche Untersuchung", "text": "Sehen und Hören bewertet", "doctor_only": True, "answer_type": "boolean", "order": 7},
                # Jugendliche/r: Gesundheit
                {"category": "Jugendliche/r – Gesundheit", "text": "Ich fühle mich insgesamt gesund.", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Jugendliche/r – Gesundheit", "text": "Ich leide häufig unter Kopfschmerzen, Bauchschmerzen oder anderen Beschwerden.", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Jugendliche/r – Gesundheit", "text": "Ich habe Schwierigkeiten beim Ein- oder Durchschlafen.", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Jugendliche/r – Gesundheit", "text": "Ich habe oft starke Stimmungsschwankungen oder bin anhaltend traurig.", "doctor_only": False, "answer_type": "boolean", "order": 11},
                {"category": "Jugendliche/r – Gesundheit", "text": "Mein Gewicht macht mir Sorgen (zu viel oder zu wenig).", "doctor_only": False, "answer_type": "boolean", "order": 12},
                # Jugendliche/r: Schule / Soziales
                {"category": "Jugendliche/r – Schule & Soziales", "text": "Ich fühle mich in der Schule und in meiner Klasse wohl.", "doctor_only": False, "answer_type": "boolean", "order": 13},
                {"category": "Jugendliche/r – Schule & Soziales", "text": "Ich habe Probleme mit meinen schulischen Leistungen.", "doctor_only": False, "answer_type": "boolean", "order": 14},
                {"category": "Jugendliche/r – Schule & Soziales", "text": "Ich kann gut mit Mitschülern und Freunden umgehen.", "doctor_only": False, "answer_type": "boolean", "order": 15},
                {"category": "Jugendliche/r – Schule & Soziales", "text": "Ich kann mit meinen Eltern über Probleme reden.", "doctor_only": False, "answer_type": "boolean", "order": 16},
                # Jugendliche/r: Freizeit / Sucht
                {"category": "Jugendliche/r – Freizeit", "text": "Ich treibe regelmäßig Sport (mind. 1–2 Mal pro Woche).", "doctor_only": False, "answer_type": "boolean", "order": 17},
                {"category": "Jugendliche/r – Freizeit", "text": "Ich verbringe täglich mehr als 3 Stunden vor Bildschirmen (ohne Schule).", "doctor_only": False, "answer_type": "boolean", "order": 18},
                {"category": "Jugendliche/r – Freizeit", "text": "Ich habe Erfahrungen mit Zigaretten, Alkohol oder anderen Drogen.", "doctor_only": False, "answer_type": "boolean", "order": 19},
                # Jugendliche/r: Offene Frage
                {"category": "Jugendliche/r – Gesamteinschätzung", "text": "Gibt es Themen, die ich gerne mit dem Arzt besprechen möchte?", "doctor_only": False, "answer_type": "text", "order": 20},
                # Eltern: Entwicklung / Gesundheit
                {"category": "Elternfragebogen – Entwicklung", "text": "Bereitet Ihnen die körperliche Entwicklung Ihres Kindes Sorge?", "doctor_only": False, "answer_type": "boolean", "order": 21},
                {"category": "Elternfragebogen – Entwicklung", "text": "Bereitet Ihnen die seelische Entwicklung oder das Verhalten Ihres Kindes Sorge?", "doctor_only": False, "answer_type": "boolean", "order": 22},
                {"category": "Elternfragebogen – Entwicklung", "text": "Gibt es Probleme in der Schule (Leistungen, Verhalten, Mobbing)?", "doctor_only": False, "answer_type": "boolean", "order": 23},
                {"category": "Elternfragebogen – Entwicklung", "text": "Bestehen erhebliche Ein- oder Durchschlafstörungen?", "doctor_only": False, "answer_type": "boolean", "order": 24},
                {"category": "Elternfragebogen – Entwicklung", "text": "Haben Sie den Eindruck, dass Ihr Kind gut sehen kann?", "doctor_only": False, "answer_type": "boolean", "order": 25},
                {"category": "Elternfragebogen – Entwicklung", "text": "Haben Sie den Eindruck, dass Ihr Kind gut hören kann?", "doctor_only": False, "answer_type": "boolean", "order": 26},
                {"category": "Elternfragebogen – Entwicklung", "text": "Besteht Nikotinkonsum, Alkohol- oder Drogenkonsum?", "doctor_only": False, "answer_type": "boolean", "order": 27},
                {"category": "Elternfragebogen – Gesamteinschätzung", "text": "Sind Sie mit der Entwicklung Ihres Kindes insgesamt zufrieden?", "doctor_only": False, "answer_type": "boolean", "order": 28},
                {"category": "Elternfragebogen – Gesamteinschätzung", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 29},
            ],
        },
    ],
}


COUNTRY_DATA_MAP = {
    "de": GERMANY_DATA,
}


class Command(BaseCommand):
    help = "Seed examination programs and questions. Use --country de to seed Germany."

    def add_arguments(self, parser):
        parser.add_argument(
            "--country",
            default="de",
            choices=["de"],
            help="Country code to seed (default: de)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing data for this country before seeding",
        )

    def handle(self, *args, **options):
        country = options["country"]
        data = COUNTRY_DATA_MAP.get(country)
        if data is None:
            raise CommandError(f"No seed data available for country '{country}'.")

        if options["clear"]:
            ExaminationProgram.objects.filter(country_code=country).delete()
            self.stdout.write(f"Deleted existing program for country '{country}'")

        program = self._seed_program(data)
        for type_data in data["types"]:
            self._seed_type(program, type_data)

        self.stdout.write(self.style.SUCCESS(f"Done seeding '{country}' examinations."))

    def _seed_program(self, data):
        program, created = ExaminationProgram.objects.get_or_create(
            country_code=data["country_code"],
            defaults={"name": data["name"]},
        )
        if created:
            self.stdout.write(f"Created program: {program.name}")
        else:
            self.stdout.write(f"Program already exists: {program.name}")
        return program

    def _seed_type(self, program, type_data):
        questions = type_data.get("questions", [])
        type_defaults = {k: v for k, v in type_data.items() if k != "questions"}
        exam_type, _ = ExaminationType.objects.update_or_create(
            program=program,
            code=type_defaults["code"],
            defaults={k: v for k, v in type_defaults.items() if k != "code"},
        )
        for q_data in questions:
            ExaminationQuestion.objects.update_or_create(
                examination_type=exam_type,
                order=q_data["order"],
                defaults={
                    "category": q_data["category"],
                    "text": q_data["text"],
                    "doctor_only": q_data.get("doctor_only", False),
                    "answer_type": q_data.get("answer_type", "boolean"),
                    "choices": q_data.get("choices"),
                },
            )
        self.stdout.write(f"  Seeded {len(questions)} questions for {exam_type.code}")
