# Home Assistant: Baby Sleep View (Baby Buddy)

Diese Beispielkonfiguration liefert:

- Baby-Name als Chip
- Start/Stop-Button fuer Sleep-Timer (`Start` oder laufende Zeit)
- Tages-Tabelle mit `Tag | Start | Ende | Dauer | ID`
- Manueller Eintrag ueber `+`
- Loeschen ueber `-` (per ID aus Tabelle)

## Dateien

- `baby_sleep_package.yaml`: Helper, Sensoren, Scripts, REST-Add/Delete
- `baby_sleep_view.yaml`: Lovelace-View (Raw YAML)

## Einrichtung

1. `baby_sleep_package.yaml` nach `config/packages/baby_sleep_package.yaml` kopieren.
2. In `baby_sleep_package.yaml` alle `YOUR_BABY_BUDDY_HOST` und `YOUR_BABY_BUDDY_API_TOKEN` ersetzen.
3. Timer-Entity ist bereits gesetzt auf `switch.annika_lene_hennig_timer`.
4. `input_number.bb_sleep_child_id` auf die echte Child-ID setzen (wird fuer manuellen `+` Eintrag benoetigt).
5. Home Assistant neu laden/restarten.
6. `baby_sleep_view.yaml` als neue Lovelace-View (Raw config) einfuegen.

## Warum vorher Fehler kamen

- `!secret babybuddy_base_url/api/...` ist ungueltig, weil `!secret` nicht mit Text verkettet werden kann.
- Wenn ein Package durch YAML-Fehler nicht laedt, fehlen danach alle darin definierten Services/Sensoren (`rest_command.*`, `sensor.*`, `script.*`).
- `baby_buddy.start_timer` und `baby_buddy.add_sleep` sind in deiner HA-Instanz offenbar nicht vorhanden. Daher nutzt dieses Paket jetzt `switch.turn_on/off` plus direkte REST-API fuer manuelle Eintraege.

## Sicherheit

Dein API-Token wurde im Chat geteilt. Technisch funktioniert es, aber aus Sicherheitsgruenden solltest du den Token in Baby Buddy rotieren und danach den neuen Token eintragen.

## Hinweis zu + / - in der Tabelle

Inline-Buttons direkt in Markdown-Tabellen sind in Standard-Lovelace nicht robust. Deshalb sind `+` und `-` als direkte Bedienzeilen unter der Tabelle umgesetzt, mit derselben Funktion.
