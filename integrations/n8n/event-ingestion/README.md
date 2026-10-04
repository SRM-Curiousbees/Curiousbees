# n8n workflow: institutional email → CuriousBees events

Import **`workflow.json`** into n8n. The setup guide, from credentials to
troubleshooting, is in
[docs/integrations/n8n-event-ingestion.md](../../../docs/integrations/n8n-event-ingestion.md).

- `src/`: the logic that runs inside the workflow's Code nodes, as plain,
  dependency-free JavaScript.
- `build-workflow.js`: generates `workflow.json` from `src/`. Run
  `npm run build` here after editing `src/`; `npm run check` fails if
  `workflow.json` is stale.
- `test/`: `npm test`. Gmail fixtures, mocked Gemini answers, a simulated run of
  every Code node, and network access blocked.

`workflow.json` contains no secrets and no real credential IDs. Gmail, Gemini
and CuriousBees credentials are chosen in n8n after import.
