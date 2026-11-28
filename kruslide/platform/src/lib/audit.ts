import type { Env } from '../env';

export async function audit(env: Env, now: number, actor: string, action: string, target?: string | null, detail?: unknown): Promise<void> {
  await env.DB.prepare('INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(now, actor.slice(0, 64), action.slice(0, 64), target ? String(target).slice(0, 128) : null,
      detail === undefined ? null : JSON.stringify(detail).slice(0, 2000))
    .run();
}
