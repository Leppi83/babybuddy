# -*- coding: utf-8 -*-
from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path, reverse_lazy
from django.views.static import serve

from . import views
from core.views import QuickLogView

app_patterns = [
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path(
        "reset/",
        views.PasswordResetView.as_view(
            success_url=reverse_lazy("babybuddy:password_reset_done")
        ),
        name="password_reset",
    ),
    path(
        "reset/<uidb64>/<token>/",
        views.PasswordResetConfirmView.as_view(
            success_url=reverse_lazy("babybuddy:password_reset_complete")
        ),
        name="password_reset_confirm",
    ),
    path(
        "reset/done/",
        views.PasswordResetDoneView.as_view(),
        name="password_reset_done",
    ),
    path(
        "reset/complete/",
        views.PasswordResetCompleteView.as_view(),
        name="password_reset_complete",
    ),
    path("", views.RootRouter.as_view(), name="root-router"),
    path("welcome/", views.Welcome.as_view(), name="welcome"),
    path("users/", views.UserList.as_view(), name="user-list"),
    path("users/add/", views.UserAdd.as_view(), name="user-add"),
    path("users/<int:pk>/edit/", views.UserUpdate.as_view(), name="user-update"),
    path("users/<int:pk>/unlock/", views.UserUnlock.as_view(), name="user-unlock"),
    path("users/<int:pk>/delete/", views.UserDelete.as_view(), name="user-delete"),
    path("user/password/", views.UserPassword.as_view(), name="user-password"),
    path("user/settings/", views.UserSettings.as_view(), name="user-settings"),
    path("user/add-device/", views.UserAddDevice.as_view(), name="user-add-device"),
    path("settings/", views.SiteSettings.as_view(), name="site_settings"),
    path("settings/<str:app_label>/", views.AppSettings.as_view(), name="app_settings"),
]

urlpatterns = [
    path("sw.js", views.ServiceWorkerView.as_view(), name="service-worker"),
    path("api/quick-log/<str:entry_type>/", QuickLogView.as_view(), name="quick-log"),
    path(
        "log/sleep/start/",
        views.QuickLogFormView.as_view(),
        {"entry_type": "sleep"},
        name="quick-log-sleep-start",
    ),
    path(
        "log/<str:entry_type>/", views.QuickLogFormView.as_view(), name="quick-log-form"
    ),
    path("admin/", admin.site.urls),
    path("", include("api.urls", namespace="api")),
    path("", include((app_patterns, "babybuddy"), namespace="babybuddy")),
    path("user/lang", include("django.conf.urls.i18n")),
    path("", include("core.urls", namespace="core")),
    path("", include("dashboard.urls", namespace="dashboard")),
    path("", include("reports.urls", namespace="reports")),
]

if settings.DEBUG:  # pragma: no cover
    from django.conf.urls.static import static

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
elif settings.SERVE_MEDIA:  # pragma: no cover
    media_prefix = settings.MEDIA_URL.lstrip("/")
    urlpatterns += [
        re_path(
            rf"^{media_prefix}(?P<path>.*)$",
            serve,
            {"document_root": settings.MEDIA_ROOT},
        )
    ]
