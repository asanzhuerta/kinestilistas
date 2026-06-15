const CACHE_NAME = "app-tfg-shell-v3";
const OFFLINE_URL = "/offline";
const APP_SHELL = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/apple-touch-icon.png",
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isPrivateOrApiRequest(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/clients") ||
    url.pathname.startsWith("/commercials") ||
    url.pathname.startsWith("/profile")
  );
}

function isStaticShellAsset(url) {
  return (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === OFFLINE_URL ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (!isSameOrigin(url)) return;

  if (isPrivateOrApiRequest(url)) {
    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request).catch(() => caches.match(OFFLINE_URL))
      );
    }

    return;
  }

  if (isStaticShellAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseCopy);
          });

          return networkResponse;
        });
      })
    );

    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
  }
});

self.addEventListener("push", (event) => {
  const fallbackPayload = {
    title: "Nuevo aviso",
    body: "Tienes una nueva notificación en Kinestilistas.",
    url: "/profile",
  };
  let payload = fallbackPayload;

  if (event.data) {
    try {
      payload = { ...fallbackPayload, ...event.data.json() };
    } catch {
      payload = { ...fallbackPayload, body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag || "kinestilistas-notification",
      data: {
        url: payload.url || fallbackPayload.url,
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/profile",
    self.location.origin
  ).toString();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }
    )
  );
});
