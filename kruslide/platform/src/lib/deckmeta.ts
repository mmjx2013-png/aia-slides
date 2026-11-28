import { b64, sha256, sha256hex } from './crypto';

/**
 * Facts about an uploaded deck, computed once at upload time and stored with the unit:
 * - the CSP hash of every inline <script> (so the deck runs under a strict script-src),
 * - the number of slides (sections with class "slide", like build.py counts them).
 */
export async function inlineScriptHashes(htmlText: string): Promise<string[]> {
  const out: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (let m; (m = re.exec(htmlText));) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
    if (type && !['text/javascript', 'module', 'application/javascript'].includes(type)) continue; // JSON data blocks never run
    out.push(`'sha256-${b64(await sha256(m[2]))}'`);
  }
  return [...new Set(out)];
}

/** Slides outside scripts and comments (the deck engine's own source mentions `<section class="slide">`). */
export function countSlides(htmlText: string): number {
  const markup = htmlText.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  return (markup.match(/<section\b[^>]*class="(?:[^"]*\s)?slide(?:\s[^"]*)?"/g) || []).length;
}

export function looksLikeHtmlDocument(htmlText: string): boolean {
  return /^﻿?\s*(<!--[\s\S]*?-->\s*)*<(!doctype\s+html|html)\b/i.test(htmlText.slice(0, 4096));
}

export { sha256hex };
