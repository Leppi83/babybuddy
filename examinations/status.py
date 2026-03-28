import datetime


def calculate_examination_statuses(child, examination_types, records, today=None):
    """
    Return a dict mapping examination_type.pk → status dict.

    Status dict shape:
      {
        "status": "completed" | "due" | "overdue" | "upcoming",
        "due_from": datetime.date,
        "due_to": datetime.date,
        "completed_date": datetime.date | None,
      }
    """
    if today is None:
        today = datetime.date.today()

    completed_map = {r.examination_type_id: r.date for r in records}
    result = {}

    for exam_type in examination_types:
        due_from = child.birth_date + datetime.timedelta(days=exam_type.age_min_days)
        due_to = child.birth_date + datetime.timedelta(days=exam_type.age_max_days)

        if exam_type.pk in completed_map:
            status = "completed"
            completed_date = completed_map[exam_type.pk]
        elif today < due_from:
            status = "upcoming"
            completed_date = None
        elif today <= due_to:
            status = "due"
            completed_date = None
        else:
            status = "overdue"
            completed_date = None

        result[exam_type.pk] = {
            "status": status,
            "due_from": due_from,
            "due_to": due_to,
            "completed_date": completed_date,
        }

    return result
