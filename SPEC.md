# Baby Buddy Sleep Recommendations (Nap + Bedtime)

## Ziel
Im Child-Dashboard sollen getrennte Empfehlungen angezeigt werden:
- Next Nap recommendation (earliest/ideal/latest)
- Bedtime (night sleep) recommendation (earliest/ideal/latest + target bedtime)

Zusätzlich: Home Assistant JSON Endpoint für REST Sensoren.
Optional: Ollama nur zur Erklärung (keine Zeitberechnung).

## Datenquellen
- Django model core.models.Sleep enthält: child, start, end, nap (bool), duration.
- nap=True bedeutet Tagesschlaf; nap=False für Nachtschlaf.
- Child enthält birth_date (Alter in Tagen).

## Regeln – Nap
- Wachfenster nach Alter (Min/Max in Minuten) als Default:
  - <=28d: 35–70
  - <=60d: 45–90
  - <=120d: 75–120
  - <=180d: 120–180
  - <=270d: 150–210
  - <=365d: 180–240
  - <=548d: 240–300
  - fallback: 240–360
- last_end = letzter Sleep nach end
- earliest = last_end + wake_min
- latest   = last_end + wake_max
- ideal = (min+max)/2
- optional personalisieren:
  - personal_target = median der letzten N Wachphasen: sleep[i].start - sleep[i-1].end
  - ideal = clamp(personal_target, min, max)
- short-nap modifier:
  - wenn letzter Sleep nap=True und duration < 40min -> min/max um 10% reduzieren
- overtired:
  - wenn now > latest => status=overtired_risk und empfehle now (earliest=ideal=latest=now)

## Regeln – Bedtime (Nachtschlaf)
- last_nap_end = end des letzten nap=True Sleeps (fallback: letzter Sleep end)
- night wake window:
  - wmin_n = wake_min * 1.10
  - wmax_n = wake_max * 1.20
- earliest = last_nap_end + wmin_n
- latest   = last_nap_end + wmax_n
- target bedtime aus Historie:
  - median der lokalen Start-Uhrzeit der letzten 7–14 Sleeps mit nap=False
  - wenn <3 Datenpunkte: default target=20:00 (konfigurierbar später)
  - target_today = combine today + target time; wenn stark in Vergangenheit -> +1 day
- ideal = clamp(target_today, earliest, latest)
- overtired analog wie Nap
- optional Hinweis:
  - wenn earliest deutlich (>60min) nach target_today liegt und target aus History stammt: reason=late_last_nap_pushes_bedtime

## Output Struktur (bundle)
recommend_sleep_bundle(child):
{
  "as_of": <localtime>,
  "child": {"id":..., "slug":..., "name":...},
  "nap": {...},
  "bedtime": {...}
}

## UI
- New dashboard card in Child dashboard:
  - Nap section: ideal + window + last_sleep_end + status
  - Bedtime section: ideal + window + target_today + status + reason tags
- Implementierung über dashboard inclusion tags + templates.

## HA JSON Endpoint
- DRF action in ChildViewSet:
  GET /api/children/{slug}/sleep-recommendations/
- Response = recommend_sleep_bundle(child)
- Wird durch bestehende API Auth (Token) geschützt.

## Ollama optional (nur Erklärungstext)
- ENV:
  - OLLAMA_ENABLED=1
  - OLLAMA_URL=http://ollama:11434
  - OLLAMA_MODEL=llama3.1:8b-instruct (oder Quant)
  - OLLAMA_TIMEOUT_S=2.5 (default)
- LLM darf keine Zeiten verändern.
- Prompt: max 3 Sätze, keine medizinischen Ratschläge.
- Wenn Fehler/Timeout: return None, UI zeigt nichts.

## Dateiliste (expected changes)
- NEW core/recommendations/__init__.py
- NEW core/recommendations/sleep.py
- NEW core/recommendations/ollama.py (optional)
- MODIFY dashboard/templatetags/cards.py
- NEW dashboard/templates/cards/sleep_recommendations.html
- MODIFY dashboard/templates/dashboard/child.html
- MODIFY api/views.py (HA endpoint)
- NEW core/tests/test_sleep_recommendations.py
