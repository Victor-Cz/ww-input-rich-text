/**
 * @name whenIdle
 * @description Lance fn quand le navigateur est libre (requestIdleCallback,
 * au plus tard après timeoutMs), ou au tour suivant là où requestIdleCallback
 * n'existe pas (Safari). Rend la fonction qui annule.
 */
export function whenIdle(fn, { timeoutMs = 2000, scope = globalThis } = {}) {
    if (typeof scope.requestIdleCallback === 'function') {
        const handle = scope.requestIdleCallback(() => fn(), { timeout: timeoutMs });
        return () => scope.cancelIdleCallback(handle);
    }
    const handle = setTimeout(fn, 0);
    return () => clearTimeout(handle);
}
