# -*- coding: utf-8 -*-
from django.middleware.csrf import get_token
from django.urls import reverse
from django.utils.translation import gettext as _
from django.views.generic.detail import DetailView

from babybuddy.mixins import PermissionRequiredMixin
from core import models

from . import graphs


def _reports_ant_enabled():
    return True


def _display_name(user):
    return user.get_full_name() or user.username


def _nav_urls():
    return {
        "dashboard": reverse("dashboard:dashboard"),
        "timeline": reverse("core:timeline"),
        "settings": reverse("babybuddy:user-settings"),
        "logout": reverse("babybuddy:logout"),
    }


def _plotly_locale(request):
    language_code = str(getattr(request, "LANGUAGE_CODE", "en")).lower()
    return "de" if language_code.startswith("de") else "en-US"


def _with_current_querystring(request, url):
    querystring = request.GET.urlencode()
    if not querystring:
        return url
    return "{}?{}".format(url, querystring)


def _build_child_switcher(request, *, current_child):
    if models.Child.objects.count() <= 1:
        return None
    match = request.resolver_match
    if not match or "slug" not in (match.kwargs or {}):
        return None

    options = []
    for child in models.Child.objects.order_by("first_name", "last_name"):
        kwargs = {**match.kwargs, "slug": child.slug}
        options.append(
            {
                "value": child.slug,
                "label": str(child),
                "href": _with_current_querystring(
                    request, reverse(match.view_name, kwargs=kwargs)
                ),
            }
        )

    return {
        "label": str(_("Child")),
        "value": current_child.slug,
        "options": options,
    }


def _report_strings():
    return {
        "dashboard": _("Dashboard"),
        "timeline": _("Timeline"),
        "settings": _("Settings"),
        "logout": _("Logout"),
        "child": _("Child"),
        "reports": _("Reports"),
        "overview": _("Overview"),
        "childActions": _("Child actions"),
        "open": _("Open"),
        "noReportData": _("There is not enough data to generate this report."),
        "reportSummary": _("Available report views for this child."),
    }


def _report_entries(child):
    return [
        {
            "key": "bmi",
            "title": str(_("Body Mass Index (BMI)")),
            "href": reverse(
                "reports:report-bmi-change-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Measurements")),
        },
        {
            "key": "diaper-amounts",
            "title": str(_("Diaper Change Amounts")),
            "href": reverse(
                "reports:report-diaperchange-amounts-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Diaper changes")),
        },
        {
            "key": "diaper-types",
            "title": str(_("Diaper Change Types")),
            "href": reverse(
                "reports:report-diaperchange-types-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Diaper changes")),
        },
        {
            "key": "diaper-intervals",
            "title": str(_("Diaper Intervals")),
            "href": reverse(
                "reports:report-diaperchange-intervals-child",
                kwargs={"slug": child.slug},
            ),
            "category": str(_("Diaper changes")),
        },
        {
            "key": "diaper-lifetimes",
            "title": str(_("Diaper Lifetimes")),
            "href": reverse(
                "reports:report-diaperchange-lifetimes-child",
                kwargs={"slug": child.slug},
            ),
            "category": str(_("Diaper changes")),
        },
        {
            "key": "feeding-amounts",
            "title": str(_("Feeding Amounts")),
            "href": reverse(
                "reports:report-feeding-amounts-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Feedings")),
        },
        {
            "key": "feeding-duration",
            "title": str(_("Feeding Durations (Average)")),
            "href": reverse(
                "reports:report-feeding-duration-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Feedings")),
        },
        {
            "key": "feeding-intervals",
            "title": str(_("Feeding Intervals")),
            "href": reverse(
                "reports:report-feeding-intervals-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Feedings")),
        },
        {
            "key": "feeding-pattern",
            "title": str(_("Feeding Pattern")),
            "href": reverse(
                "reports:report-feeding-pattern-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Feedings")),
        },
        {
            "key": "head-circumference",
            "title": str(_("Head Circumference")),
            "href": reverse(
                "reports:report-head-circumference-change-child",
                kwargs={"slug": child.slug},
            ),
            "category": str(_("Measurements")),
        },
        {
            "key": "height",
            "title": str(_("Height")),
            "href": reverse(
                "reports:report-height-change-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Measurements")),
        },
        {
            "key": "height-boy",
            "title": str(_("WHO Height Percentiles for Boys in cm")),
            "href": reverse(
                "reports:report-height-change-child-boy", kwargs={"slug": child.slug}
            ),
            "category": str(_("Measurements")),
        },
        {
            "key": "height-girl",
            "title": str(_("WHO Height Percentiles for Girls in cm")),
            "href": reverse(
                "reports:report-height-change-child-girl", kwargs={"slug": child.slug}
            ),
            "category": str(_("Measurements")),
        },
        {
            "key": "pumping-amounts",
            "title": str(_("Pumping Amounts")),
            "href": reverse(
                "reports:report-pumping-amounts-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Pumpings")),
        },
        {
            "key": "sleep-pattern",
            "title": str(_("Sleep Pattern")),
            "href": reverse(
                "reports:report-sleep-pattern-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Sleep")),
        },
        {
            "key": "sleep-totals",
            "title": str(_("Sleep Totals")),
            "href": reverse(
                "reports:report-sleep-totals-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Sleep")),
        },
        {
            "key": "temperature",
            "title": str(_("Temperature")),
            "href": reverse(
                "reports:report-temperature-change-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Measurements")),
        },
        {
            "key": "tummy-time",
            "title": str(_("Tummy Time Durations (Sum)")),
            "href": reverse(
                "reports:report-tummy-time-duration-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Tummy Time")),
        },
        {
            "key": "weight",
            "title": str(_("Weight")),
            "href": reverse(
                "reports:report-weight-change-child", kwargs={"slug": child.slug}
            ),
            "category": str(_("Measurements")),
        },
        {
            "key": "weight-boy",
            "title": str(_("WHO Weight Percentiles for Boys in kg")),
            "href": reverse(
                "reports:report-weight-change-child-boy", kwargs={"slug": child.slug}
            ),
            "category": str(_("Measurements")),
        },
        {
            "key": "weight-girl",
            "title": str(_("WHO Weight Percentiles for Girls in kg")),
            "href": reverse(
                "reports:report-weight-change-child-girl", kwargs={"slug": child.slug}
            ),
            "category": str(_("Measurements")),
        },
    ]


def _build_ant_report_list_bootstrap(request, *, child):
    return {
        "pageType": "report-list",
        "activeNavKey": None,
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": {"displayName": _display_name(request.user)},
        "urls": {**_nav_urls(), "self": request.get_full_path()},
        "childSwitcher": _build_child_switcher(request, current_child=child),
        "strings": _report_strings(),
        "reportList": {
            "childName": str(child),
            "entries": _report_entries(child),
            "actions": {
                "dashboard": reverse(
                    "dashboard:dashboard-child", kwargs={"slug": child.slug}
                ),
                "timeline": reverse("core:child", kwargs={"slug": child.slug}),
                "reports": reverse("reports:report-list", kwargs={"slug": child.slug}),
            },
        },
    }


def _build_ant_report_detail_bootstrap(
    request, *, child, title, category, html="", js=""
):
    return {
        "pageType": "report-detail",
        "activeNavKey": None,
        "currentPath": request.path,
        "locale": getattr(request, "LANGUAGE_CODE", "en"),
        "csrfToken": get_token(request),
        "user": {"displayName": _display_name(request.user)},
        "urls": {
            **_nav_urls(),
            "self": request.get_full_path(),
            "graphJs": "/static/babybuddy/js/graph.js",
        },
        "childSwitcher": _build_child_switcher(request, current_child=child),
        "strings": _report_strings(),
        "reportDetail": {
            "title": title,
            "category": category,
            "plotlyLocale": _plotly_locale(request),
            "childName": str(child),
            "html": html,
            "js": js,
            "actions": {
                "dashboard": reverse(
                    "dashboard:dashboard-child", kwargs={"slug": child.slug}
                ),
                "timeline": reverse("core:child", kwargs={"slug": child.slug}),
                "reports": reverse("reports:report-list", kwargs={"slug": child.slug}),
            },
        },
    }


class AntReportMixin:
    ant_title = ""
    ant_category = ""

    def ant_enabled(self):
        return _reports_ant_enabled()

    def get_template_names(self):
        if self.ant_enabled():
            return ["babybuddy/ant_app.html"]
        return [self.template_name]

    def get_ant_title(self):
        return str(self.ant_title)

    def get_ant_category(self):
        return str(self.ant_category)


class AntReportListMixin(AntReportMixin):
    ant_title = _("Reports")
    ant_category = _("Overview")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.ant_enabled():
            context["ant_page_title"] = self.get_ant_title()
            context["ant_bootstrap"] = _build_ant_report_list_bootstrap(
                self.request,
                child=context["object"],
            )
        return context


class AntReportDetailMixin(AntReportMixin):
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.ant_enabled():
            context["ant_page_title"] = self.get_ant_title()
            context["ant_bootstrap"] = _build_ant_report_detail_bootstrap(
                self.request,
                child=context["object"],
                title=self.get_ant_title(),
                category=self.get_ant_category(),
                html=context.get("html", ""),
                js=context.get("js", ""),
            )
        return context


class BMIChangeChildReport(AntReportDetailMixin, PermissionRequiredMixin, DetailView):
    """
    Graph of BMI change over time.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/bmi_change.html"
    ant_title = _("Body Mass Index (BMI)")
    ant_category = _("Measurements")

    def get_context_data(self, **kwargs):
        context = super(BMIChangeChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        objects = models.BMI.objects.filter(child=child)
        if objects:
            context["html"], context["js"] = graphs.bmi_change(objects)
        return context


class ChildReportList(AntReportListMixin, PermissionRequiredMixin, DetailView):
    """
    Listing of available reports for a child.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/report_list.html"


class DiaperChangeAmounts(AntReportDetailMixin, PermissionRequiredMixin, DetailView):
    """
    Graph of diaper "amounts" - measurements of urine output.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/diaperchange_amounts.html"
    ant_title = _("Diaper Change Amounts")
    ant_category = _("Diaper changes")

    def get_context_data(self, **kwargs):
        context = super(DiaperChangeAmounts, self).get_context_data(**kwargs)
        child = context["object"]
        changes = models.DiaperChange.objects.filter(child=child, amount__gt=0)
        if changes and changes.count() > 0:
            context["html"], context["js"] = graphs.diaperchange_amounts(changes)
        return context


class DiaperChangeLifetimesChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of diaper "lifetimes" - time between diaper changes.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/diaperchange_lifetimes.html"
    ant_title = _("Diaper Lifetimes")
    ant_category = _("Diaper changes")

    def get_context_data(self, **kwargs):
        context = super(DiaperChangeLifetimesChildReport, self).get_context_data(
            **kwargs
        )
        child = context["object"]
        changes = models.DiaperChange.objects.filter(child=child)
        if changes and changes.count() > 1:
            context["html"], context["js"] = graphs.diaperchange_lifetimes(changes)
        return context


class DiaperChangeTypesChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of diaper changes by day and type.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/diaperchange_types.html"
    ant_title = _("Diaper Change Types")
    ant_category = _("Diaper changes")

    def get_context_data(self, **kwargs):
        context = super(DiaperChangeTypesChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        changes = models.DiaperChange.objects.filter(child=child)
        if changes:
            context["html"], context["js"] = graphs.diaperchange_types(changes)
        return context


class DiaperChangeIntervalsChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of diaper change intervals.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/diaperchange_intervals.html"
    ant_title = _("Diaper Intervals")
    ant_category = _("Diaper changes")

    def get_context_data(self, **kwargs):
        context = super(DiaperChangeIntervalsChildReport, self).get_context_data(
            **kwargs
        )
        child = context["object"]
        changes = models.DiaperChange.objects.filter(child=child)
        if changes:
            context["html"], context["js"] = graphs.diaperchange_intervals(changes)
        return context


class FeedingAmountsChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of daily feeding amounts over time.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/feeding_amounts.html"
    ant_title = _("Feeding Amounts")
    ant_category = _("Feedings")

    def __init__(self):
        super(FeedingAmountsChildReport, self).__init__()
        self.html = ""
        self.js = ""

    def get_context_data(self, **kwargs):
        context = super(FeedingAmountsChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        instances = models.Feeding.objects.filter(child=child)
        if instances:
            context["html"], context["js"] = graphs.feeding_amounts(instances)
        return context


class FeedingDurationChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of feeding durations over time.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/feeding_duration.html"
    ant_title = _("Feeding Durations (Average)")
    ant_category = _("Feedings")

    def __init__(self):
        super(FeedingDurationChildReport, self).__init__()
        self.html = ""
        self.js = ""

    def get_context_data(self, **kwargs):
        context = super(FeedingDurationChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        instances = models.Feeding.objects.filter(child=child)
        if instances:
            context["html"], context["js"] = graphs.feeding_duration(instances)
        return context


class FeedingIntervalsChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of diaper change intervals.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/feeding_intervals.html"
    ant_title = _("Feeding Intervals")
    ant_category = _("Feedings")

    def get_context_data(self, **kwargs):
        context = super(FeedingIntervalsChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        instances = models.Feeding.objects.filter(child=child)
        if instances:
            context["html"], context["js"] = graphs.feeding_intervals(instances)
        return context


class FeedingPatternChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of feeding pattern.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/feeding_pattern.html"
    ant_title = _("Feeding Pattern")
    ant_category = _("Feedings")

    def __init__(self):
        super(FeedingPatternChildReport, self).__init__()
        self.html = ""
        self.js = ""

    def get_context_data(self, **kwargs):
        context = super(FeedingPatternChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        instances = models.Feeding.objects.filter(child=child).order_by("start")
        if instances:
            context["html"], context["js"] = graphs.feeding_pattern(instances)
        return context


class HeadCircumferenceChangeChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of head circumference change over time.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/head_circumference_change.html"
    ant_title = _("Head Circumference")
    ant_category = _("Measurements")

    def get_context_data(self, **kwargs):
        context = super(HeadCircumferenceChangeChildReport, self).get_context_data(
            **kwargs
        )
        child = context["object"]
        objects = models.HeadCircumference.objects.filter(child=child)
        if objects:
            context["html"], context["js"] = graphs.head_circumference_change(objects)
        return context


class HeightChangeChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of height change over time.
    """

    def __init__(
        self,
        sex=None,
        target_url="reports:report-height-change-child",
        ant_title=None,
    ) -> None:
        self.model = models.Child
        self.permission_required = ("core.view_child",)
        self.template_name = "reports/height_change.html"
        self.sex = sex
        self.target_url = target_url
        self.ant_title = ant_title or _("Height")
        self.ant_category = _("Measurements")

    def get_context_data(self, **kwargs):
        context = super(HeightChangeChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        birthday = child.birth_date
        actual_heights = models.Height.objects.filter(child=child)
        percentile_heights = models.HeightPercentile.objects.filter(sex=self.sex)
        context["target_url"] = self.target_url
        if actual_heights:
            context["html"], context["js"] = graphs.height_change(
                actual_heights, percentile_heights, birthday
            )
        return context


class HeightChangeChildBoyReport(HeightChangeChildReport):
    def __init__(self):
        super(HeightChangeChildBoyReport, self).__init__(
            sex="boy",
            target_url="reports:report-height-change-child-boy",
            ant_title=_("WHO Height Percentiles for Boys in cm"),
        )


class HeightChangeChildGirlReport(HeightChangeChildReport):
    def __init__(self):
        super(HeightChangeChildGirlReport, self).__init__(
            sex="girl",
            target_url="reports:report-height-change-child-girl",
            ant_title=_("WHO Height Percentiles for Girls in cm"),
        )


class PumpingAmounts(AntReportDetailMixin, PermissionRequiredMixin, DetailView):
    """
    Graph of pumping milk amounts collected.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/pumping_amounts.html"
    ant_title = _("Pumping Amounts")
    ant_category = _("Pumpings")

    def get_context_data(self, **kwargs):
        context = super(PumpingAmounts, self).get_context_data(**kwargs)
        child = context["object"]
        changes = models.Pumping.objects.filter(child=child)
        if changes and changes.count() > 0:
            context["html"], context["js"] = graphs.pumping_amounts(changes)
        return context


class SleepPatternChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of sleep pattern comparing sleep to wake times by day.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/sleep_pattern.html"
    ant_title = _("Sleep Pattern")
    ant_category = _("Sleep")

    def __init__(self):
        super(SleepPatternChildReport, self).__init__()
        self.html = ""
        self.js = ""

    def get_context_data(self, **kwargs):
        context = super(SleepPatternChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        instances = models.Sleep.objects.filter(child=child).order_by("start")
        if instances:
            context["html"], context["js"] = graphs.sleep_pattern(instances)
        return context


class SleepTotalsChildReport(AntReportDetailMixin, PermissionRequiredMixin, DetailView):
    """
    Graph of total sleep by day.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/sleep_totals.html"
    ant_title = _("Sleep Totals")
    ant_category = _("Sleep")

    def __init__(self):
        super(SleepTotalsChildReport, self).__init__()
        self.html = ""
        self.js = ""

    def get_context_data(self, **kwargs):
        context = super(SleepTotalsChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        instances = models.Sleep.objects.filter(child=child).order_by("start")
        if instances:
            context["html"], context["js"] = graphs.sleep_totals(instances)
        return context


class TemperatureChangeChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of temperature change over time.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/temperature_change.html"
    ant_title = _("Temperature")
    ant_category = _("Measurements")

    def get_context_data(self, **kwargs):
        context = super(TemperatureChangeChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        objects = models.Temperature.objects.filter(child=child)
        if objects:
            context["html"], context["js"] = graphs.temperature_change(objects)
        return context


class TummyTimeDurationChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of tummy time durations over time.
    """

    model = models.Child
    permission_required = ("core.view_child",)
    template_name = "reports/tummytime_duration.html"
    ant_title = _("Tummy Time Durations (Sum)")
    ant_category = _("Tummy Time")

    def __init__(self):
        super(TummyTimeDurationChildReport, self).__init__()
        self.html = ""
        self.js = ""

    def get_context_data(self, **kwargs):
        context = super(TummyTimeDurationChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        instances = models.TummyTime.objects.filter(child=child)
        if instances:
            context["html"], context["js"] = graphs.tummytime_duration(instances)
        return context


class WeightChangeChildReport(
    AntReportDetailMixin, PermissionRequiredMixin, DetailView
):
    """
    Graph of weight change over time.
    """

    def __init__(
        self,
        sex=None,
        target_url="reports:report-weight-change-child",
        ant_title=None,
    ) -> None:
        self.model = models.Child
        self.permission_required = ("core.view_child",)
        self.template_name = "reports/weight_change.html"
        self.sex = sex
        self.target_url = target_url
        self.ant_title = ant_title or _("Weight")
        self.ant_category = _("Measurements")

    def get_context_data(self, **kwargs):
        context = super(WeightChangeChildReport, self).get_context_data(**kwargs)
        child = context["object"]
        birthday = child.birth_date
        actual_weights = models.Weight.objects.filter(child=child)
        percentile_weights = models.WeightPercentile.objects.filter(sex=self.sex)
        context["target_url"] = self.target_url
        if actual_weights:
            context["html"], context["js"] = graphs.weight_change(
                actual_weights, percentile_weights, birthday
            )
        return context


class WeightChangeChildBoyReport(WeightChangeChildReport):
    def __init__(self):
        super(WeightChangeChildBoyReport, self).__init__(
            sex="boy",
            target_url="reports:report-weight-change-child-boy",
            ant_title=_("WHO Weight Percentiles for Boys in kg"),
        )


class WeightChangeChildGirlReport(WeightChangeChildReport):
    def __init__(self):
        super(WeightChangeChildGirlReport, self).__init__(
            sex="girl",
            target_url="reports:report-weight-change-child-girl",
            ant_title=_("WHO Weight Percentiles for Girls in kg"),
        )
