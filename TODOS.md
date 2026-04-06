# TODOS

When finished with an item indicate that it is resolved.


## Sticky Notes — RESOLVED

**What** Sticky Notes for your desktop

**Why** Just for fun.  Some people love a messy desk of sticky notes.

**How to apply** Open the Proof of concept: /old-files/StickyNotes.html

**Expected Output** a virtual desktop of sticky notes should open in a new window.  The example is visually unpleasant, so make it appealing.  It should open in a new window
so that a user can easily make it full screen.  Keyboard shortcuts are a plus.  Help text that appears on demand, then slides gracefully out of the way is essential.
Quality of life features should include 2 or 3 default examples when opeining to an empty screen; JSON export/import for data; multiple tabs with +/- controls and draggable order, etc.

Preserve the existing color scheme for this view.

### Needs More — RESOLVED

Add a 'live' font-size slider in the top bar, adjust the note text size
Add a 'reset' button to put the board back to it's original state.
Add a subtle message in top bar 'Just close the window... your notes will be here when you return.'
Add a button to toggle Full Screen 
Link requires 'index.html', currently gives a 404 error


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
