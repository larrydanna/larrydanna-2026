---
title: "Tips page now pulls from my knowledge base"
date: "2026-04-22"
tags: ["site", "knowledge-base", "astro"]
description: "Revamped the Tips page to merge local code tips with articles from my GitHub knowledge base — search, source toggle, and tag filtering all in one place."
---

The Tips page got a significant upgrade today. It used to show only the handful of local code snippets I'd written directly into the site. Now it pulls in all 27 articles from my [knowledge-base repository](https://github.com/larrydanna/knowledge-base) at build time and displays them in the same card format alongside the local tips.

## How it works

Astro fetches the `INDEX.md` from the knowledge base repo during the build. The index is already structured — each article has a title, description, tags, date, and category (Environment or Engineering). A small parser turns that into typed data, merges it with local tips, and sorts everything newest-first.

Knowledge base articles link directly to GitHub. The build degrades gracefully if the fetch fails — you just see local tips only.

## Finding things as it grows

The collection is 32 items today (5 local + 27 KB), but the knowledge base has been growing fast. So the page needed to scale:

- **Search box** — filters by title, description, and tags as you type
- **Source toggle** — All / Site Tips / Knowledge Base, with live counts
- **Tag filter pills** — same as before, now spanning both sources

The combination means you can jump straight to, say, Knowledge Base → search "vscode" → click a tag to narrow further. That should hold up well past 200 articles without any redesign.

## Visual treatment

KB articles use the same left-border card style as local tips. The border is muted instead of amber to signal they're external links. A small `↗ KB` badge in the meta line makes the destination obvious before you click.
