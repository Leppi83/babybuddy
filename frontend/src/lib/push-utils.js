/**
 * Web Push notification utilities.
 *
 * Handles permission requests, subscription management, and server sync.
 */

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Check if push notifications are supported in this browser. */
export function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Get current Notification.permission state. */
export function getPermissionState() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

/** Check if there is an active push subscription. */
export async function getExistingSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Subscribe to push notifications.
 * Requests permission if needed, creates a push subscription,
 * and POSTs it to the server.
 */
export async function subscribeToPush(vapidPublicKey, csrfToken, subscribeUrl) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const subJson = subscription.toJSON();
  const response = await fetch(subscribeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    }),
  });

  if (!response.ok) {
    return { ok: false, reason: "server-error" };
  }
  return { ok: true };
}

/**
 * Unsubscribe from push notifications.
 * Removes the browser subscription and tells the server to delete it.
 */
export async function unsubscribeFromPush(csrfToken, unsubscribeUrl) {
  const subscription = await getExistingSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await fetch(unsubscribeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify({ endpoint }),
    });
  }
  return { ok: true };
}
