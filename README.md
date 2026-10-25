# super0to1.com

Official website for the Super 0→1 Initiative. Built with Vite, React, TypeScript and React Router.
Brand palette, typefaces, the pearl motif and session photos come from the `super0to1/website`
prototype and its *Super 0-1 Intro* deck.

## Develop

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run lint
```

## Languages

English lives at `/`, Chinese at `/zh/...`. Interface copy is in `src/i18n/messages.ts` (the `zh`
object must match the `en` shape); content fields that differ by language are `{ en, zh }` objects.
The Worker picks the language for visitors: the `lang` cookie set by the EN/中 switch wins, otherwise
the browser's first `Accept-Language`. Crawlers get the URL they ask for; each page lists its
`hreflang` alternates.

## Edit content

The private CMS is at **https://cms.super0to1.com**. It manages sessions, videos, projects,
homepage recommendations, images and registration settings. See [CMS guide](docs/cms-guide.md)
for editing, publication, recovery and local development.

`content/published/site.json` contains only the approved public snapshot. The CMS GitHub App
commits this file to `main`; drafts and preview snapshots remain in Cloudflare D1 and private R2.
`src/content/` supplies typed adapters plus code-managed program copy. Page/interface copy remains
in `src/i18n/messages.ts`; About, Method and Lab copy editors are planned for phase two.

Registration priority: session-specific URL → role-specific URL → default URL → contact email →
opening-soon dialog. HTTPS targets receive `role` and `lang` query parameters.

## Routes

`/`, `/method`, `/projects`, `/projects/:slug`, `/lab`, `/sessions`, `/sessions/:slug`, `/lens`,
`/lens/:id`, `/about`.

## Deploy

The site runs on Cloudflare Workers (static assets) at https://super0to1.com.

### Automatic deployment

`.github/workflows/deploy.yml` deploys pushes to `main`. It installs the locked dependencies on
Node.js 24, runs lint, tests and both production builds, applies D1 migrations, then deploys both Workers and assets with
the project's locked Wrangler version. The workflow checks the live deployment's commit marker
and both language homepages, and verifies that unauthenticated CMS requests are blocked before reporting success. Deployments run one at a time; a running
deployment is not cancelled by a newer push. Manual runs are also available on `main`.

Set these repository **Settings → Secrets and variables → Actions** secrets before the first push:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | The account containing the `super0to1-web` Worker |
| `CLOUDFLARE_API_TOKEN` | Account: Workers Scripts Edit, Account Settings Read, D1 Edit, Workers R2 Storage Edit; zone: Workers Routes Edit, Zone Read |

Use a token scoped to the deployment account and the `super0to1.com` zone, following
[Cloudflare's GitHub Actions setup](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).
Do not use a local Wrangler OAuth session as the CI credential. Never commit credentials.
The workflow uses the GitHub `production` environment; leave required reviewers disabled for
unattended deployment on every `main` update.

### Local deployment

```sh
npm run deploy       # public site only; prefer GitHub Actions for verified releases
npm run cms:deploy   # CMS only; requires provisioned D1/R2 and Worker secrets
```

`wrangler.jsonc` binds `super0to1.com` and `www.super0to1.com` as custom domains; `worker/index.ts`
redirects www to the apex, picks the language, and serves the prerendered pages in `dist/` (real 404s for
unknown paths). Hashed assets and fonts
are cached for a year via `public/_headers`.

## Brand

- Colors: `#53453A` brown, `#F4FDAF` pale yellow, `#C3FF00` lime, white (tokens in `src/styles/global.css`)
- Type: Bricolage Grotesque (display, optical sizes), Instrument Sans (body), Geist Mono (labels) —
  variable fonts from google/fonts, subset to Latin + arrows with `pyftsubset` and self-hosted in
  `public/fonts/`. Chinese falls back to PingFang SC / Noto Sans SC / Microsoft YaHei.
- Pearl Method: Thread = Mission & Vision, Strand = Stage (Direction, Product, Go-To-Market), Pearl = Loop (Problem → Action → Outcome)
