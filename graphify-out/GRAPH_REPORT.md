# Graph Report - mainwt  (2026-11-25)

## Corpus Check
- 4 files · ~1,217 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: .ttf 12, .woff2 4, (none) 3)

## Summary
- 19 nodes · 15 edges · 4 communities (2 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8a64b9d4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MEMORY.md: shared memory for every Claude chat
- Presentation styles: the owner's vocabulary
- CLAUDE.md
- README.md

## God Nodes (most connected - your core abstractions)
1. `MEMORY.md: shared memory for every Claude chat` - 6 edges
2. `Presentation styles: the owner's vocabulary` - 5 edges
3. `Shared memory (every chat)` - 1 edges
4. `graphify` - 1 edges
5. `How the owner works` - 1 edges
6. `Presentations` - 1 edges
7. `Tools that work` - 1 edges
8. `Projects` - 1 edges
9. `Log (newest first; one line each; date, what, where)` - 1 edges
10. `Type 1: the target ("perfect")` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (4 total, 2 thin omitted)

### Community 0 - "MEMORY.md: shared memory for every Claude chat"
Cohesion: 0.29
Nodes (6): How the owner works, Log (newest first; one line each; date, what, where), MEMORY.md: shared memory for every Claude chat, Presentations, Projects, Tools that work

### Community 1 - "Presentation styles: the owner's vocabulary"
Cohesion: 0.33
Nodes (5): Lessons for next time (the owner's feedback, 24 Nov 2026), Never, Presentation styles: the owner's vocabulary, Type 1: the target ("perfect"), Type 2: acceptable, the minimum standard

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._