from .base import *

SECRET_KEY = "TESTS"

# Password hasher configuration
# See https://docs.djangoproject.com/en/5.0/ref/settings/#password-hashers
# See https://docs.djangoproject.com/en/5.0/topics/testing/overview/#password-hashing

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Email
# https://docs.djangoproject.com/en/5.0/topics/email/

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"

# Axes configuration
# See https://django-axes.readthedocs.io/en/latest/4_configuration.html

AXES_ENABLED = False
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

# DBSettings configuration
# See https://github.com/zlorf/django-dbsettings#a-note-about-caching

DBSETTINGS_USE_CACHE = False

# We want to test the home assistant middleware

ENABLE_HOME_ASSISTANT_SUPPORT = True

# Static files
# Keep tests independent from a collected staticfiles manifest.
STORAGES["staticfiles"][
    "BACKEND"
] = "django.contrib.staticfiles.storage.StaticFilesStorage"
