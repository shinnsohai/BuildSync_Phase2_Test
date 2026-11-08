@AGENTS.md

## Claude Code notes

- To build a module, use the command `/new-module <id> <what it should do>` (or ask for the "new-builtsync-module" skill). It follows `docs/BUILD-A-MODULE.md`.
- Verify with `node tools/verify.js` before saying a change is done, and report its output, not a summary of what you expect.
- You cannot see the page unless you start the preview server (`python tools/serve.py 8766`) and use the browser tools; if you do, reset the demo data first (the button 重置演示数据) and test in both languages.
