const UPDATED_TOAST_KEY = 'lucky_app_updated';
const UPDATING_KEY = 'lucky_updating';
const LAST_UPDATE_KEY = 'lucky_last_update_version';
const MIN_CHECK_GAP_MS = 30000;

export function getBundledVersion(): string {
    return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
}

export async function fetchServerVersion(): Promise<string | null> {
    try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.version != null ? String(data.version) : null;
    } catch { return null; }
}

export function isNewVersionAvailable(serverVersion: string): boolean {
    return serverVersion !== getBundledVersion();
}

export async function clearAppCaches(): Promise<void> {
    if ('caches' in window) {
        await Promise.all((await caches.keys()).map(n => caches.delete(n)));
    }
}

async function unregisterServiceWorkers(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    await Promise.all((await navigator.serviceWorker.getRegistrations()).map(r => r.unregister()));
}

async function preloadFreshAssets(bust: string): Promise<void> {
    const origin = window.location.origin;
    const htmlUrl = `${origin}/?_appv=${encodeURIComponent(bust)}&_t=${Date.now()}`;
    const res = await fetch(htmlUrl, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) return;
    const html = await res.text();
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]);
    await Promise.all(assets.map(p => fetch(`${origin}${p}?t=${Date.now()}`, { cache: 'no-store' }).catch(() => {})));
}

export function clearAppUpdateQueryParam(): void {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('_appv')) return;
    url.searchParams.delete('_appv');
    url.searchParams.delete('_t');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

export function showUpdatedToast(): void {
    if (!sessionStorage.getItem(UPDATED_TOAST_KEY)) return;
    sessionStorage.removeItem(UPDATED_TOAST_KEY);
    import('react-hot-toast').then(({ toast }) => {
        toast.success('¡App actualizada a la última versión!', { duration: 4000, icon: '✅' });
    });
}

export async function applyAppUpdate(serverVersion?: string): Promise<void> {
    const bust = serverVersion || String(Date.now());
    sessionStorage.setItem(UPDATED_TOAST_KEY, '1');
    sessionStorage.setItem(UPDATING_KEY, '1');
    if (serverVersion) localStorage.setItem(LAST_UPDATE_KEY, serverVersion);

    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;font-family:sans-serif;">
        <div style="text-align:center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:lky-spin .8s linear infinite;margin:0 auto 12px;display:block">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <p style="color:#f8fafc;font-size:14px;font-weight:800;letter-spacing:0.05em;margin:0">Actualizando...</p>
            <p style="color:#64748b;font-size:11px;font-weight:600;margin:6px 0 0">Espere un momento</p>
        </div>
        <style>@keyframes lky-spin{to{transform:rotate(360deg)}}</style>
    </div>`;

    try { await preloadFreshAssets(bust); } catch {}
    try { await unregisterServiceWorkers(); } catch {}
    try { await clearAppCaches(); } catch {}

    const target = `${window.location.origin}/?_appv=${encodeURIComponent(bust)}&_t=${Date.now()}`;
    window.location.assign(target);
}

let updateInProgress = false;

export async function checkAndApplyUpdate(options: { silent?: boolean; delayMs?: number; serverVersion?: string } = {}): Promise<boolean> {
    if (updateInProgress || sessionStorage.getItem(UPDATED_TOAST_KEY)) return false;

    const serverVersion = options.serverVersion ?? (await fetchServerVersion());
    if (!serverVersion || !isNewVersionAvailable(serverVersion)) return false;

    // Evita re-aplicar la misma versión tras un reload
    if (serverVersion === localStorage.getItem(LAST_UPDATE_KEY)) return false;

    updateInProgress = true;

    const delay = options.delayMs ?? (options.silent ? 0 : 2000);
    if (delay > 0) await new Promise(r => setTimeout(r, delay));

    await applyAppUpdate(serverVersion);
    return true;
}

export function initAppVersionSync(options: { enabled?: () => boolean } = {}): () => void {
    clearAppUpdateQueryParam();
    sessionStorage.removeItem(UPDATING_KEY);
    showUpdatedToast();

    let lastCheckAt = 0;

    const runCheck = (serverVersion?: string) => {
        if (options.enabled && !options.enabled()) return;
        const now = Date.now();
        if (!serverVersion && now - lastCheckAt < MIN_CHECK_GAP_MS) return;
        lastCheckAt = now;
        checkAndApplyUpdate(serverVersion ? { serverVersion } : {});
    };

    const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') runCheck();
    };
    const onFocus = () => runCheck();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    runCheck();

    return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('focus', onFocus);
    };
}
