from django.core.management.base import BaseCommand
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
                {"category": "Körpermaße", "text": "Körpergewicht (g)", "doctor_only": True, "answer_type": "number", "order": 1},
                {"category": "Körpermaße", "text": "Körperlänge (cm)", "doctor_only": True, "answer_type": "number", "order": 2},
                {"category": "Körpermaße", "text": "Kopfumfang (cm)", "doctor_only": True, "answer_type": "number", "order": 3},
                {"category": "Körperliche Untersuchung", "text": "Stand und erste Schritte bewertet", "doctor_only": True, "answer_type": "boolean", "order": 4},
                {"category": "Körperliche Untersuchung", "text": "Augen unauffällig", "doctor_only": True, "answer_type": "boolean", "order": 5},
                {"category": "Elternfragebogen", "text": "Zieht sich Ihr Kind an Möbeln hoch?", "doctor_only": False, "answer_type": "boolean", "order": 6},
                {"category": "Elternfragebogen", "text": "Sagt Ihr Kind einfache Silben wie 'Mama' oder 'Papa'?", "doctor_only": False, "answer_type": "boolean", "order": 7},
                {"category": "Elternfragebogen", "text": "Reagiert Ihr Kind, wenn sein Name gerufen wird?", "doctor_only": False, "answer_type": "boolean", "order": 8},
                {"category": "Elternfragebogen", "text": "Zeigt Ihr Kind mit dem Finger auf Dinge?", "doctor_only": False, "answer_type": "boolean", "order": 9},
                {"category": "Elternfragebogen", "text": "Haben Sie Fragen oder Sorgen bezüglich Ihres Kindes?", "doctor_only": False, "answer_type": "text", "order": 10},
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
        data = GERMANY_DATA if country == "de" else None

        if options["clear"]:
            deleted, _ = ExaminationProgram.objects.filter(
                country_code=country
            ).delete()
            self.stdout.write(f"Deleted existing program for country '{country}'")

        program, created = ExaminationProgram.objects.get_or_create(
            country_code=data["country_code"],
            defaults={"name": data["name"]},
        )
        if created:
            self.stdout.write(f"Created program: {program.name}")
        else:
            self.stdout.write(f"Program already exists: {program.name}")

        for type_data in data["types"]:
            questions = type_data.pop("questions")
            exam_type, _ = ExaminationType.objects.update_or_create(
                program=program,
                code=type_data["code"],
                defaults=type_data,
            )
            # Only seed questions if none exist yet
            if not exam_type.questions.exists():
                for q_data in questions:
                    ExaminationQuestion.objects.create(
                        examination_type=exam_type, **q_data
                    )
                self.stdout.write(f"  Seeded {len(questions)} questions for {exam_type.code}")
            else:
                self.stdout.write(f"  Questions already exist for {exam_type.code}, skipping")

        self.stdout.write(self.style.SUCCESS(f"Done seeding '{country}' examinations."))
