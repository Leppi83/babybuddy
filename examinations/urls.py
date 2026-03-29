from django.urls import path
from . import views

app_name = "examinations"

urlpatterns = [
    path(
        "children/<str:slug>/examinations/",
        views.ExaminationListView.as_view(),
        name="list",
    ),
    path(
        "children/<str:slug>/examinations/<str:code>/",
        views.ExaminationFormView.as_view(),
        name="form",
    ),
    path(
        "children/<str:slug>/examinations/<str:code>/save/",
        views.ExaminationSaveView.as_view(),
        name="save",
    ),
    path(
        "children/<str:slug>/examinations/<str:code>/toggle/",
        views.ExaminationToggleView.as_view(),
        name="toggle",
    ),
]
