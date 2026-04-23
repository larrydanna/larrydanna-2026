---
title: "Behind the Music: A Song Stories Showcase"
date: "2026-04-22"
description: "Built a new section of the site dedicated to AI-assisted songwriting — each song gets its own page with backstory, lyrics, and an embedded Suno player."
tags: ["music", "suno", "site-update"]
---

I've been writing songs with Suno for a while now — AI-assisted folk and bluegrass, mostly built around real trips and real moments. The problem was that Suno is where the songs live, but not where the *stories* live.

So I built a Music section for this site.

## What it is

Each entry is a Song Story: one page with three things on it.

**The backstory** — where the song came from. The drive, the place, the moment that made me want to write it. That's mine. Suno doesn't know any of it.

**The lyrics** — formatted by verse and chorus, in a sidebar that reads like a songwriter's notebook. Each stanza gets its own block.

**The player** — an embedded Suno widget, right on the page. Hit play, then read while it plays. That's the intended experience.

## How it's built

The `/music` section uses Astro's content collections. Each song is a Markdown file with frontmatter that holds the Suno track ID(s), tags, and lyrics as a literal string. The body of the file is the backstory prose. The slug page renders everything — two columns on desktop, stacked on mobile — with the player full-width below.

Multiple tracks per story are supported. If I ever want to compare an original against a reprise, or put two alternate productions side by side, both embed with labels.

## The first entry

[Sacajawea's Grave (Reprise)](/music/sacajaweas-grave) — we almost missed the turn. A small brown highway marker in the dust, outside Fort Washakie, Wyoming. My friend Cathy said "let's stop." I turned the truck around. What we found there took a while to process.

The song came out of that visit, but not immediately — it was a few days after I'd returned home, when the memory had settled, that the words came together.

More songs coming. The Yellowstone playlists are full of them.
