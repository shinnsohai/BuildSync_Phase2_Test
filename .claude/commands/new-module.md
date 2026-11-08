---
description: Create a BuiltSync module from a short description and verify it
argument-hint: <id> <what the module should do>
---

Build a BuiltSync module. The request: $ARGUMENTS

Use the skill `new-builtsync-module` and `docs/BUILD-A-MODULE.md`. The first word of the request is the module id; the rest is the feature. Work in this order, running `node tools/verify.js` after each step: scaffold, store with tests, strings, admin page, phone screen, audit, manifest. Do not edit platform files. Finish with the report described in the skill, including what you could not check without a browser.
