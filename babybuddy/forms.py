# -*- coding: utf-8 -*-
from django import forms
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import PasswordChangeForm, UserCreationForm
from django.contrib.auth.models import Group
from django.utils.translation import gettext_lazy as _

from .models import Settings


class BabyBuddyUserForm(forms.ModelForm):
    is_read_only = forms.BooleanField(
        required=False,
        label=_("Read only"),
        help_text=_("Restricts user to viewing data only."),
    )

    class Meta:
        model = get_user_model()
        fields = [
            "username",
            "first_name",
            "last_name",
            "email",
            "is_staff",
            "is_read_only",
            "is_active",
        ]

    def __init__(self, *args, **kwargs):
        user = kwargs["instance"]
        if user:
            kwargs["initial"].update(
                {
                    "is_read_only": user.groups.filter(
                        name=settings.BABY_BUDDY["READ_ONLY_GROUP_NAME"]
                    ).exists()
                }
            )
        super(BabyBuddyUserForm, self).__init__(*args, **kwargs)

    def save(self, commit=True):
        user = super(BabyBuddyUserForm, self).save(commit=False)
        is_read_only = self.cleaned_data["is_read_only"]
        if is_read_only:
            user.is_superuser = False
        else:
            user.is_superuser = True
        if commit:
            user.save()
        readonly_group = Group.objects.get(
            name=settings.BABY_BUDDY["READ_ONLY_GROUP_NAME"]
        )
        if is_read_only:
            user.groups.add(readonly_group.id)
        else:
            user.groups.remove(readonly_group.id)
        return user


class UserAddForm(BabyBuddyUserForm, UserCreationForm):
    pass


class UserUpdateForm(BabyBuddyUserForm):
    pass


class UserForm(forms.ModelForm):
    class Meta:
        model = get_user_model()
        fields = ["first_name", "last_name", "email"]


class UserPasswordForm(PasswordChangeForm):
    class Meta:
        fields = ["old_password", "new_password1", "new_password2"]


class UserSettingsForm(forms.ModelForm):
    dashboard_visible_items = forms.CharField(
        required=False, widget=forms.HiddenInput()
    )

    class Meta:
        model = Settings
        fields = [
            "dashboard_refresh_rate",
            "dashboard_hide_empty",
            "dashboard_hide_age",
            "language",
            "timezone",
            "pagination_count",
            "dashboard_visible_items",
            "llm_provider",
            "llm_model",
            "llm_base_url",
            "llm_api_key",
        ]
        widgets = {
            "llm_api_key": forms.PasswordInput(render_value=False),
        }

    def __init__(self, *args, **kwargs):
        super(UserSettingsForm, self).__init__(*args, **kwargs)
        self.dashboard_item_choices = Settings.DASHBOARD_ITEM_CHOICES
        if self.instance and self.instance.pk:
            selected = self.instance.dashboard_selected_items()
        else:
            selected = Settings.dashboard_default_visible_items()
        self.dashboard_selected_items = selected
        self.fields["dashboard_visible_items"].initial = ",".join(selected)

    def clean_dashboard_visible_items(self):
        raw = self.cleaned_data.get("dashboard_visible_items", "")
        allowed = {key for key, _label in Settings.DASHBOARD_ITEM_CHOICES}
        if not raw and self.instance and self.instance.pk:
            return self.instance.dashboard_selected_items()
        selected = [item.strip() for item in raw.split(",") if item.strip()]
        return [item for item in selected if item in allowed]

    def save(self, commit=True):
        instance = super(UserSettingsForm, self).save(commit=False)
        instance.dashboard_visible_items = self.cleaned_data.get(
            "dashboard_visible_items", []
        )
        if commit:
            instance.save()
        return instance
