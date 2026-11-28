import type { Ctx } from './env';

type Handler = (ctx: Ctx) => Response | Promise<Response>;
interface Route { method: 'GET' | 'POST'; re: RegExp; keys: string[]; handler: Handler; }

/** A tiny router: "/app/books/:id" style patterns, ":path*" for the rest of the path. */
export class Router {
  private routes: Route[] = [];
  get(p: string, h: Handler) { return this.add('GET', p, h); }
  post(p: string, h: Handler) { return this.add('POST', p, h); }
  private add(method: Route['method'], pattern: string, handler: Handler) {
    const keys: string[] = [];
    const src = pattern.replace(/[.]/g, '\\.').replace(/:(\w+)(\*)?/g, (_, k: string, star: string) => {
      keys.push(k);
      return star ? '(.+)' : '([^/]+)';
    });
    this.routes.push({ method, re: new RegExp(`^${src}$`), keys, handler });
    return this;
  }
  /** Returns the handler and params, 'method' if the path exists for another method, or null. */
  match(method: string, path: string): { handler: Handler; params: Record<string, string> } | 'method' | null {
    let other = false;
    for (const r of this.routes) {
      const m = r.re.exec(path);
      if (!m) continue;
      if (r.method !== method && !(method === 'HEAD' && r.method === 'GET')) { other = true; continue; }
      const params: Record<string, string> = {};
      try {
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      } catch {
        return null; // malformed %-encoding
      }
      return { handler: r.handler, params };
    }
    return other ? 'method' : null;
  }
}
