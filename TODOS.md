# TODOS

## Toy dependency audit

**What:** Go through each of the 24 toys in `d:\work\Webs\larrydanna.com\17.2\toys\`
and check for external CDN script tags (jQuery, Bootstrap JS, any `cdn.` URL).

**Why:** Determines which toys can migrate to `/tools/[slug]` at launch vs which
need CDN removal work first. Without this audit, the /tools section scope is undefined.

**How to apply:** Open each toy's HTML file, scan for `<script src="http` or
`<script src="https`. No external scripts = migrate now. Has external scripts = note
the dependency, defer unless the dep is trivially removable.

**Expected output:** A short list like:
- sql.html — vanilla ✓
- regex.html — vanilla ✓
- codebreaker/ — uses jQuery ✗ (defer)
- ...

**Depends on:** Nothing. Do this before step 6 in the Next Steps.

**Effort:** ~30 minutes
