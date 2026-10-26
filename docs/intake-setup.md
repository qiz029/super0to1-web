# Website forms and destinations

The homepage Session action follows `home.upcomingSessionId`. Only announced or open sessions qualify. With no next session, the homepage and Session page show an announcement placeholder without booking. Session booking continues to use CMS registration settings.

The Lab prototype form and email subscription modal post to `/api/intake`. The public Worker validates the input and routes newsletters to Brevo and prototypes to a Google Apps Script web app. Provider credentials stay out of the browser. Missing Brevo configuration never falls back to Google Sheets.

## Connect email subscriptions

1. Create the Brevo account and a dedicated website subscribers list. Complete account and sender setup in Brevo before sending campaigns.
2. Store `BREVO_API_KEY` as a public Worker secret and set `BREVO_LIST_ID` to the dedicated list's numeric ID. Never commit the key or expose it in frontend code.
3. Verify a controlled signup in that list, repeat it to confirm no duplicate, and check the form's error state before enabling public intake. These requests collect contacts; they do not send a campaign or welcome email.

The adapter adds new contacts or adds existing contacts to the configured list. It does not change other lists or reset unsubscribe flags. Previously unsubscribed contacts get a confirmation-required error; re-subscription needs a separate confirmed workflow. Brevo campaign sending and unsubscribe handling must be configured before mailing the list.

References: [create contact](https://developers.brevo.com/reference/create-contact), [read contact](https://developers.brevo.com/reference/get-contact-info), [update contact](https://developers.brevo.com/reference/update-contact).

## Connect prototype submissions

1. Open the private signup Sheet. Use Extensions → Apps Script to create a script bound to that document.
2. Paste `scripts/google-intake.gs` into the editor. In Project Settings enable the manifest, then use `scripts/google-intake-manifest.json` as `appsscript.json`. Google’s spreadsheet OAuth scope permits access to spreadsheets. This receiver uses only the spreadsheet ID configured in Script Properties. Review and approve that scope before deployment.
3. Generate a random secret of at least 32 bytes. Store it as `INTAKE_SECRET` in Script Properties, and set `SHEET_ID` to the private signup Sheet ID. Never commit it or include it in frontend code.
4. Deploy as a web app, executing as the owner and accessible to anyone. This publishes an append endpoint, not the Sheet. Google requires the owner to authorize the spreadsheet scope. The endpoint rejects requests without the secret and exposes no read API. Keep the Sheet private.
5. Set public Worker secrets `GOOGLE_INTAKE_URL` to the deployed `/exec` URL and `GOOGLE_INTAKE_SECRET` to the same secret. These are public-site Worker secrets, not CMS Worker secrets.
6. Add Cloudflare edge rate limiting for POST `/api/intake` before enabling public intake. Test with controlled records and verify a row in the prototype tab before announcing the forms as live.

For local testing put the destination variables in the ignored root `.dev.vars`, run `npm run build`, then `npx wrangler dev --ip 127.0.0.1 --port 8791`. Vite forwards `/api/intake` to that local Worker. Without configuration, submission returns an unavailable error and does not report success. Browser tests mock the receipt contract; they do not establish that a Google deployment is connected.

The Google receiver accepts only prototypes, serializes writes and deduplicates request IDs. Formula-like input is stored as literal text. Client success requires a matching confirmed receipt, and failures preserve form values.

Prototype submissions do not implicitly subscribe people to email updates. Unit tests mock Brevo responses and browser tests mock submission receipts; neither proves that a live provider is connected.

Google references: [web apps](https://developers.google.com/apps-script/guides/web), [Sheet writes](https://developers.google.com/apps-script/reference/spreadsheet/sheet), [write locking](https://developers.google.com/apps-script/reference/lock/lock-service).

Product stage values are `building` (no users), `testing` (users but no paying customers), and `paying` (paying customers). The form, Worker validation and Google receiver must use the same values. Update the Apps Script deployment before enabling this form; old `idea`, `prototype`, and `ready` stage values are rejected. The internal submission type and existing Sheet tab name stay unchanged.

Tester email entry points use the same newsletter form with a validated `source` value. Configure `BREVO_TESTER_LIST_ID` as a separate positive list ID in addition to `BREVO_LIST_ID`. A tester is added to both the general and tester lists, so list membership records the tester entry source. Existing subscriptions keep their other lists and unsubscribe flags. Missing tester-list configuration returns unavailable rather than silently losing attribution. The source distinguishes tester entry from general signup, not a confirmed event registration. No extra personal fields are requested.
