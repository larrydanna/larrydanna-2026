---
title: "Building This Site"
date: "2026-03-30"
description: "larrydanna.com has been offline for years. Here's what I used to bring it back and why."
tags: ["Astro", "Web", "Meta"]
draft: false
---

This site has been offline for a long time. The last version was an ASP.NET MVC app running on a server I was paying for monthly. At some point the value proposition stopped making sense and I let it go.

Coming back to it in 2026, I had a clearer idea of what I actually wanted.

## What I wanted

A place for the interactive tools I build for myself. I have a Jeopardy game, a month calendar, a year-at-a-glance, a handful of productivity forms I use regularly. They lived in a folder on my machine. Putting them on a domain means I can get to them from anywhere.

A place to write. Not a Substack, not a Medium account — something I own. The old site had blog posts. A few are worth keeping.

A professional presence. I've been writing software since Visual Basic 3. C#, SQL, .NET across three decades of business software. At some point you want a place that reflects that, especially when you're looking at new opportunities.

And the other things: bluegrass, vintage computing, the C64 projects I'm slowly building.

## What I built it with

**Astro** for the framework. Static site generation, islands architecture for the interactive tools, content collections for blog and tips. It builds to plain HTML and deploys without a server.

**Cloudflare Pages** for hosting. Free, fast, instant deploys on git push. The site is on their edge network so it loads quickly everywhere.

**Vanilla JavaScript** for all the tools. No React, no Vue. The Jeopardy game is 447 lines of a single class. The calendar tools are a few dozen lines each. When you don't need a framework, you shouldn't use one.

The design system I built from scratch — warm dark background (`#0F0D0A`), amber accent (`#D4863A`), Instrument Serif for headlines, IBM Plex Sans for everything else. I was tired of the cold blue-black developer portfolio aesthetic. Every personal site looks the same. This one doesn't.

## What's coming

More tools as I build them. The 16 remaining toys from the old site that need jQuery removed before they can migrate. Blog posts as I write them. Tips as I accumulate them. The vintage computing section will grow as my 6502 projects develop.

The source is at [github.com/larrydanna/larrydanna-2026](https://github.com/larrydanna/larrydanna-2026) if you want to see how any of it works.
