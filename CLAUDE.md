# gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools directly.

## Available gstack skills

/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /autoplan, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn

If gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.

## Design System

**Always read `DESIGN.md` before making any visual or UI decisions.**

The approved design system (Warm Dark / Studio Amber) is documented in `DESIGN.md` at the repo root. Key rules:
- Colors: never hardcode hex values — use CSS custom properties (`--accent`, `--bg`, `--surface`, etc.)
- Fonts: Instrument Serif for display/hero only; IBM Plex Sans for all UI and body; JetBrains Mono for code
- Motion: none. No transitions, animations, or hover effects beyond instant color/border changes
- Border radius: 4px for buttons/inputs, 8px for cards — consistent, not pill-shaped

Preview: `start "" "C:/Users/larry/.gstack/projects/larrydanna-2026/designs/design-system-20260330/preview.html"`

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
