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
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Vitalzeichen", "text": "APGAR-Score nach 1 Minute", "doctor_only": True, "answer_type": "number", "order": 4},
                {"category": "Vitalzeichen", "text": "APGAR-Score nach 5 Minuten", "doctor_only": True, "answer_type": "number", "order": 5},
                {"category": "Vitalzeichen", "text": "APGAR-Score nach 10 Minuten", "doctor_only": True, "answer_type": "number", "order": 6},
                {"category": "Körperliche Untersuchung", "text": "Herz und Kreislauf unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 7},
                {"category": "Körperliche Untersuchung", "text": "Lunge und Atmung unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 8},
                {"category": "Körperliche Untersuchung", "text": "Abdomen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 9},
                {"category": "Körperliche Untersuchung", "text": "Genitale unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 10},
                {"category": "Körperliche Untersuchung", "text": "Wirbelsäule und Extremitäten unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 11},
                {"category": "Reflexe", "text": "Moro-Reflex vorhanden", "doctor_only": True, "answer_type": "boolean", "order": 12},
                {"category": "Reflexe", "text": "Saugreflex vorhanden", "doctor_only": True, "answer_type": "boolean", "order": 13},
                {"category": "Reflexe", "text": "Greifreflex vorhanden", "doctor_only": True, "answer_type": "boolean", "order": 14},
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
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Screening", "text": "Neugeborenen-Hörscreening durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Screening", "text": "Erweitertes Neugeborenenscreening (Stoffwechsel) durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Nabelschnur unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 6},
                {"category": "Körperliche Untersuchung", "text": "Ikterus (Gelbsucht) bewertet", "doctor_only": True, "answer_type": "boolean", "order": 7},
                {"category": "Körperliche Untersuchung", "text": "Hüftgelenke klinisch unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Wird Ihr Kind gestillt?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Trinkt Ihr Kind ausreichend?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 11},
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
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Hüftsonografie unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augen: Fixieren und Folgen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Herz und Kreislauf unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Lächelt Ihr Baby, wenn es angesprochen wird?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Folgt Ihr Baby mit den Augen einem Gegenstand?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Reagiert Ihr Baby auf Geräusche (Erschrecken, Innehalten)?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Schläft Ihr Baby überwiegend in Rückenlage?", "doctor_only": False, "answer_type": "boolean", "order": 10},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 11},
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
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Hüftgelenke unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augen: Lichtreaktion und Pupillen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Hebt Ihr Baby in Bauchlage den Kopf an?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Lacht Ihr Baby laut?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Greift Ihr Baby nach Gegenständen?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Dreht Ihr Baby den Kopf in Richtung von Geräuschen?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
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
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Hörprüfung unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augenstellung unauffällig (kein Schielen)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Sitzt Ihr Baby mit Unterstützung?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Plappert Ihr Baby (z. B. ba-ba, da-da)?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Erkennt Ihr Baby vertraute Personen?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Dreht sich Ihr Baby von der Rücken- in die Bauchlage?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
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
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Sprache", "text": "Sprachbeurteilung durch den Arzt durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Gang und Gleichgewicht unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Spricht Ihr Kind mindestens 20 Wörter?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Läuft Ihr Kind selbstständig?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Zeigt Ihr Kind Interesse an anderen Kindern?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Versteht Ihr Kind einfache Aufforderungen (z. B. 'Bring mir den Ball')?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
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
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Sprache", "text": "Sprachentwicklung bewertet (mind. 2-Wort-Sätze erwartet)", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Verhalten", "text": "Verhaltensauffälligkeiten bewertet", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Elternfragebogen", "text": "Spricht Ihr Kind in vollständigen Sätzen?", "doctor_only": False, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Kann sich Ihr Kind teilweise selbst an- und ausziehen?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Spielt Ihr Kind kooperativ mit anderen Kindern?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Ist Ihr Kind tagsüber trocken?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 9},
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
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Sinne", "text": "Sehtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Sinne", "text": "Hörtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Motorik", "text": "Grobmotorik unauffällig (Einbeinstand, Hüpfen)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Kann Ihr Kind auf einem Bein hüpfen?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Kennt Ihr Kind Farben?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Kann Ihr Kind einen Stift oder Pinsel halten?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Spielt Ihr Kind mit anderen Kindern ohne größere Konflikte?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
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
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Sinne", "text": "Sehtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Sinne", "text": "Hörtest durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Koordination", "text": "Koordinations- und Geschicklichkeitstests durchgeführt", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Kann Ihr Kind eine Person mit mindestens 4 Körperteilen zeichnen?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Kennt Ihr Kind seinen vollständigen Namen und seine Adresse?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Kann Ihr Kind bis 10 zählen?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Kann Ihr Kind selbstständig auf die Toilette gehen?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
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
                {"category": "Körpermaße", "text": "Körpergewicht (kg)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "BMI berechnet", "doctor_only": True, "answer_type": "boolean", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Blutdruck gemessen", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Wirbelsäule untersucht (Skoliose)", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Körperliche Untersuchung", "text": "Pubertätsstadium (Tanner) bewertet", "doctor_only": True, "answer_type": "boolean", "order": 6},
                {"category": "Jugendliche/r – Selbsteinschätzung", "text": "Ich fühle mich insgesamt gesund.", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Jugendliche/r – Selbsteinschätzung", "text": "Ich habe Probleme mit dem Schlafen.", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Jugendliche/r – Selbsteinschätzung", "text": "Ich habe Stress in der Schule oder mit Freunden.", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Bedenken bezüglich der körperlichen Entwicklung Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
                {"category": "Elternfragebogen", "text": "Haben Sie Bedenken bezüglich der psychischen Entwicklung Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 11},
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
