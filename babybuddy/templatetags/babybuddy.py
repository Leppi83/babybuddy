# -*- coding: utf-8 -*-

from django import template
from django.apps import apps
from django.conf import settings
from django.middleware.csrf import get_token
from django.urls import reverse
from django.utils import timezone
from django.utils.functional import lazy
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.translation import to_locale, get_language, gettext_lazy as _

from axes.helpers import get_lockout_message
from axes.models import AccessAttempt

from core.models import Child

register = template.Library()
mark_safe_lazy = lazy(mark_safe, str)


@register.simple_tag
def axes_lockout_message():
    return get_lockout_message()


@register.simple_tag(takes_context=True)
def relative_url(context, field_name, value):
    """
    Create a relative URL with an updated field value.

    :param context: current request content.
    :param field_name: the field name to update.
    :param value: the new value for field_name.
    :return: encoded relative url with updated query string.
    """
    url = "?{}={}".format(field_name, value)
    querystring = context["request"].GET.urlencode().split("&")
    filtered_querystring = filter(lambda p: p.split("=")[0] != field_name, querystring)
    encoded_querystring = "&".join(filtered_querystring)
    return "{}&{}".format(url, encoded_querystring)


@register.simple_tag()
def version_string():
    """
    Get Baby Buddy's current version string.

    :return: version string ('n.n.n (commit)').
    """
    config = apps.get_app_config("babybuddy")
    return config.version_string


@register.simple_tag()
def get_current_locale():
    """
    Get the current language's locale code.

    :return: locale code (e.g. 'de', 'fr', etc.).
    """
    return to_locale(get_language())


@register.simple_tag()
def get_child_count():
    return Child.count()


@register.simple_tag()
def get_current_timezone():
    return timezone.get_current_timezone_name()


@register.simple_tag(takes_context=True)
def make_absolute_url(context, url):
    request = context["request"]
    abs_url = request.build_absolute_uri(url)
    return abs_url


@register.simple_tag()
def user_is_locked(user):
    return AccessAttempt.objects.filter(username=user.username).exists()


@register.simple_tag()
def user_is_read_only(user):
    return user.groups.filter(name=settings.BABY_BUDDY["READ_ONLY_GROUP_NAME"]).exists()


@register.simple_tag()
def confirm_delete_text(object):
    return mark_safe_lazy(
        _("Are you sure you want to delete %(name)s?")
        % {
            "name": format_html('<span class="text-info">{}</span>', str(object)),
        }
    )


@register.simple_tag()
def confirm_unlock_text(object):
    return mark_safe_lazy(
        _("Are you sure you want to unlock %(name)s?")
        % {
            "name": format_html('<span class="text-info">{}</span>', str(object)),
        }
    )


@register.simple_tag(takes_context=True)
def ant_error_bootstrap(
    context,
    *,
    title,
    kicker,
    body,
    action_href="",
    action_label="",
):
    request = context.get("request")
    user = getattr(request, "user", None)
    is_authenticated = bool(getattr(user, "is_authenticated", False))

    if not action_href:
        action_href = reverse(
            "babybuddy:root-router" if is_authenticated else "babybuddy:login"
        )
    if not action_label:
        action_label = (
            str(_("Return to Baby Buddy"))
            if is_authenticated
            else str(_("Back to login"))
        )

    return {
        "layout": "auth",
        "pageType": "message",
        "currentPath": getattr(request, "path", "/"),
        "locale": getattr(request, "LANGUAGE_CODE", get_language() or "en"),
        "csrfToken": get_token(request) if request else "",
        "user": None,
        "urls": {
            "self": getattr(request, "path", "/"),
        },
        "strings": {
            "overview": str(_("Overview")),
            "dashboard": str(_("Dashboard")),
            "timeline": str(_("Timeline")),
            "settings": str(_("Settings")),
            "logout": str(_("Logout")),
            "welcome": str(_("Welcome")),
            "login": str(_("Login")),
            "backToLogin": str(_("Back to login")),
        },
        "messages": [],
        "messagePage": {
            "title": str(title),
            "kicker": str(kicker),
            "body": [str(body)] if body else [],
            "actions": (
                [{"href": action_href, "label": str(action_label)}]
                if action_href and action_label
                else []
            ),
        },
    }
