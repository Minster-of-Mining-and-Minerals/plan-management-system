const DEFAULT_ONLYOFFICE_URL = "http://localhost:8080";

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/**
 * Prefer the API-provided Document Server URL (deployment-accurate),
 * then the build-time public env, then local default.
 * Always return an absolute URL so the editor never resolves against the Next.js app origin.
 */
export function resolveOnlyofficeUrl(documentServerUrl?: string | null): string {
  const candidates = [
    documentServerUrl,
    process.env.NEXT_PUBLIC_ONLYOFFICE_URL,
    DEFAULT_ONLYOFFICE_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = String(candidate).trim().replace(/\/$/, "");
    if (isAbsoluteHttpUrl(normalized)) {
      return normalized;
    }
  }

  return DEFAULT_ONLYOFFICE_URL;
}

export function buildOnlyofficeStartupMessage(documentServerUrl: string): string {
  return [
    `ONLYOFFICE Document Server is not running at ${documentServerUrl}.`,
    "1. Start Docker Desktop and wait until it is fully running.",
    "2. In a terminal: cd collaboration-service && npm run onlyoffice:up",
    "3. Wait 1–2 minutes, then refresh this page.",
  ].join("\n");
}

/**
 * Clear any DocsAPI left on the page so @onlyoffice/document-editor-react
 * reloads api.js from the absolute documentServerUrl.
 *
 * If DocsAPI is already present (e.g. from a previous probe that removed the
 * script tag), DocEditor resolves editor assets against the Next.js origin
 * (e.g. :3000/en/documents/...) instead of ONLYOFFICE (:8081).
 */
function clearPreloadedDocsApi(script?: HTMLScriptElement | null) {
  if (typeof window === "undefined") return;

  try {
    const editor = window as Window & {
      DocsAPI?: unknown;
      DocEditor?: unknown;
    };
    delete editor.DocsAPI;
    delete editor.DocEditor;
  } catch {
    const editor = window as Window & {
      DocsAPI?: unknown;
      DocEditor?: unknown;
    };
    editor.DocsAPI = undefined;
    editor.DocEditor = undefined;
  }

  script?.remove();
  document.getElementById("onlyoffice-api-script")?.remove();
}

/**
 * Probe ONLYOFFICE the same way the editor loads DocsAPI (script tag, no CORS),
 * then wipe DocsAPI so the React component owns the real load with the correct URL.
 */
export function checkOnlyofficeHealth(
  documentServerUrl: string,
  timeoutMs = 8000
): Promise<{ ok: boolean; message: string }> {
  if (typeof window === "undefined") {
    return Promise.resolve({ ok: true, message: "" });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    let settled = false;

    const finish = (result: { ok: boolean; message: string }) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      // Always clear — leave a clean slate for DocumentEditor.
      clearPreloadedDocsApi(script);
      resolve(result);
    };

    const timeout = window.setTimeout(() => {
      finish({
        ok: false,
        message: buildOnlyofficeStartupMessage(documentServerUrl),
      });
    }, timeoutMs);

    script.src = `${documentServerUrl}/web-apps/apps/api/documents/api.js`;
    script.async = true;
    script.onload = () => finish({ ok: true, message: "" });
    script.onerror = () =>
      finish({
        ok: false,
        message: buildOnlyofficeStartupMessage(documentServerUrl),
      });

    document.head.appendChild(script);
  });
}
