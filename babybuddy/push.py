import json
import logging

from django.conf import settings

from pywebpush import webpush, WebPushException

logger = logging.getLogger(__name__)


def send_push_notification(user, title, body, url=None):
    """Send a push notification to all of a user's subscribed devices.

    Returns the number of devices successfully notified.
    """
    if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
        logger.warning("VAPID keys not configured — push notification skipped.")
        return 0

    payload = json.dumps({"title": title, "body": body, "url": url or "/"})
    vapid_claims = {"sub": settings.VAPID_CLAIMS_EMAIL or "mailto:noreply@example.com"}
    sent = 0

    for sub in user.push_subscriptions.all():
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims=vapid_claims,
            )
            sent += 1
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                logger.info("Removing expired push subscription %s", sub.endpoint[:50])
                sub.delete()
            else:
                logger.error("Push failed for %s: %s", sub.endpoint[:50], e)

    return sent
