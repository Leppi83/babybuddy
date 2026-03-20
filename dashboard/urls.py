# -*- coding: utf-8 -*-
from django.urls import path

from . import views

app_name = "dashboard"

urlpatterns = [
    path("dashboard/", views.Dashboard.as_view(), name="dashboard"),
    path(
        "children/<str:slug>/dashboard/",
        views.ChildDashboard.as_view(),
        name="dashboard-child",
    ),
    path(
        "children/<int:pk>/insights/",
        views.ChildInsightsView.as_view(),
        name="child-insights",
    ),
    path(
        "children/<str:slug>/topics/<str:topic>/",
        views.ChildTopicView.as_view(),
        name="child-topic",
    ),
]
