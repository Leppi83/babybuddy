from django.contrib import admin
from . import models

admin.site.register(models.ExaminationProgram)
admin.site.register(models.ExaminationType)
admin.site.register(models.ExaminationQuestion)
admin.site.register(models.ExaminationRecord)
