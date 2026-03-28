from django.db import models
from django.utils.translation import gettext_lazy as _


class ExaminationProgram(models.Model):
    country_code = models.CharField(max_length=10, verbose_name=_("Country code"))
    name = models.CharField(max_length=200, verbose_name=_("Name"))

    class Meta:
        ordering = ["country_code"]
        verbose_name = _("Examination Program")
        verbose_name_plural = _("Examination Programs")

    def __str__(self):
        return self.name


class ExaminationType(models.Model):
    program = models.ForeignKey(
        ExaminationProgram,
        on_delete=models.CASCADE,
        related_name="examination_types",
    )
    code = models.CharField(max_length=10, verbose_name=_("Code"))
    name = models.CharField(max_length=200, verbose_name=_("Name"))
    age_min_days = models.PositiveIntegerField(verbose_name=_("Minimum age (days)"))
    age_max_days = models.PositiveIntegerField(verbose_name=_("Maximum age (days)"))
    order = models.IntegerField(default=0, verbose_name=_("Order"))
    description = models.TextField(blank=True, verbose_name=_("Description"))

    class Meta:
        ordering = ["order"]
        unique_together = [["program", "code"]]
        verbose_name = _("Examination Type")
        verbose_name_plural = _("Examination Types")

    def __str__(self):
        return self.name


class ExaminationQuestion(models.Model):
    ANSWER_TYPE_BOOLEAN = "boolean"
    ANSWER_TYPE_TEXT = "text"
    ANSWER_TYPE_NUMBER = "number"
    ANSWER_TYPE_CHOICE = "choice"
    ANSWER_TYPE_CHOICES = [
        (ANSWER_TYPE_BOOLEAN, _("Yes / No")),
        (ANSWER_TYPE_TEXT, _("Text")),
        (ANSWER_TYPE_NUMBER, _("Number")),
        (ANSWER_TYPE_CHOICE, _("Choice")),
    ]

    examination_type = models.ForeignKey(
        ExaminationType,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    category = models.CharField(max_length=100, verbose_name=_("Category"))
    text = models.TextField(verbose_name=_("Question text"))
    doctor_only = models.BooleanField(
        default=False, verbose_name=_("Doctor only")
    )
    answer_type = models.CharField(
        max_length=20,
        choices=ANSWER_TYPE_CHOICES,
        default=ANSWER_TYPE_BOOLEAN,
        verbose_name=_("Answer type"),
    )
    choices = models.JSONField(
        null=True, blank=True, verbose_name=_("Choices")
    )
    order = models.IntegerField(default=0, verbose_name=_("Order"))

    class Meta:
        ordering = ["order"]
        verbose_name = _("Examination Question")
        verbose_name_plural = _("Examination Questions")

    def __str__(self):
        return self.text[:80]


class ExaminationRecord(models.Model):
    child = models.ForeignKey(
        "core.Child",
        on_delete=models.CASCADE,
        related_name="examination_records",
    )
    examination_type = models.ForeignKey(
        ExaminationType,
        on_delete=models.CASCADE,
        related_name="records",
    )
    date = models.DateField(verbose_name=_("Date of examination"))
    answers = models.JSONField(default=dict, verbose_name=_("Answers"))
    notes = models.TextField(blank=True, verbose_name=_("Notes"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["child", "examination_type"]]
        ordering = ["examination_type__order"]
        verbose_name = _("Examination Record")
        verbose_name_plural = _("Examination Records")

    def __str__(self):
        return f"{self.child} – {self.examination_type.code} ({self.date})"
