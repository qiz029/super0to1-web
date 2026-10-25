# Website forms and Google Sheets

The homepage Session action follows `home.upcomingSessionId`. Only announced or open sessions qualify. With no next session, the homepage and Session page show an announcement placeholder without booking. Session booking continues to use CMS registration settings.

The Lab prototype form and email subscription modal post to `/api/intake`. The public Worker validates the input, then forwards it to a Google Apps Script web app. This keeps the shared secret out of the browser. The private Sheet has two tabs with the exact headers in `scripts/google-intake.gs`.

## Connect the destination

1. Open the private signup Sheet. Use Extensions → Apps Script to create a script bound to that document.
2. Paste `scripts/google-intake.gs` into the editor. In Project Settings enable the manifest, then use `scripts/google-intake-manifest.json` as `appsscript.json`. Google’s spreadsheet OAuth scope permits access to spreadsheets. This receiver uses only the spreadsheet ID configured in Script Properties. Review and approve that scope before deployment.
3. Generate a random secret of at least 32 bytes. Store it as `INTAKE_SECRET` in Script Properties, and set `SHEET_ID` to the private signup Sheet ID. Never commit it or include it in frontend code.
4. Deploy as a web app, executing as the owner and accessible to anyone. This publishes an append endpoint, not the Sheet. Google requires the owner to authorize the spreadsheet scope. The endpoint rejects requests without the secret and exposes no read API. Keep the Sheet private.
5. Set public Worker secrets `GOOGLE_INTAKE_URL` to the deployed `/exec` URL and `GOOGLE_INTAKE_SECRET` to the same secret. These are public-site Worker secrets, not CMS Worker secrets.
6. Add Cloudflare edge rate limiting for POST `/api/intake` before enabling public intake. Test with controlled records and verify rows in both tabs before announcing the forms as live.

For local testing put the same two variables in the ignored root `.dev.vars`, run `npm run build`, then `npx wrangler dev --ip 127.0.0.1 --port 8791`. Vite forwards `/api/intake` to that local Worker. Without configuration, submission returns an unavailable error and does not report success. Browser tests mock the receipt contract; they do not establish that a Google deployment is connected.

The receiver serializes writes and deduplicates request IDs. Email subscriptions also deduplicate email addresses. Formula-like input is stored as literal text. Client success requires a matching confirmed receipt, and failures preserve form values.

Collecting email addresses does not send newsletters or provide an unsubscribe system. Those need to be configured with the eventual email delivery workflow before sending messages. Prototype submissions do not implicitly subscribe people to email updates.

Google references: [web apps](https://developers.google.com/apps-script/guides/web), [Sheet writes](https://developers.google.com/apps-script/reference/spreadsheet/sheet), [write locking](https://developers.google.com/apps-script/reference/lock/lock-service).
