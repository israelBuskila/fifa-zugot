# FIFA זוגות

Mobile-first Hebrew RTL app for 2v2 EA FC / FIFA nights. Built with Next.js App Router, TypeScript, Tailwind CSS and MongoDB Atlas.

## Setup

1. Create a MongoDB Atlas cluster and a database user with read/write access. Add the IP addresses that run the app to **Network Access**. For Vercel, use an appropriate Atlas networking option or IP access policy for your deployment.
2. Copy `.env.example` to `.env.local`. Set `MONGODB_URI` to your Atlas connection string, `MONGODB_DB`, `HOST_PASSWORD`, and a separate random `SESSION_SECRET` (32+ characters). Do not expose the URI through a `NEXT_PUBLIC_` variable.
3. Run `npm install`, `npm run db:indexes`, and `npm run seed` (optional sample data).
4. Run `npm run dev` and open http://localhost:3000. Development mode without `HOST_PASSWORD` skips the login gate; production requires both secrets.

## Atlas data model

- `players`: permanent roster, keyed by UUID `id`.
- `groups`: saved player presets with `playerIds`.
- `sessions`: a night with selected `playerIds`, current lineup, current score and an ordered `matches` array. Each match stores raw participants with team labels, scores, result type, winner, optional events, bench and lineup snapshots, and timestamps. Statistics are calculated from this history.
- Unique indexes on IDs; indexes on session status/start and date. `npm run db:indexes` creates them. No SQL migrations are needed for this MongoDB document model.

The full night is one document, so score changes, match completion, and Undo are atomic updates with an optimistic `version` check. The current UI keeps a local score draft until the server confirms it. The API rejects stale writes from another device with HTTP 409. Match Undo restores the pre-match lineup and score. When more than five people play, the bench is a queue; the first enters and the leaving player goes to its end. Draws keep the same lineup. Historical score edits change the recorded result, while later matches retain the actual lineups that were played.

## Vercel deployment

Import this repository into Vercel. Set `MONGODB_URI`, `MONGODB_DB`, `HOST_PASSWORD`, and `SESSION_SECRET` for Production and Preview, then deploy. Use an Atlas network access policy that permits Vercel's outbound traffic. Run the seed script locally against the intended Atlas database if sample data is wanted.

For AI recaps, enable Vercel AI Gateway on the project so deployments can authenticate with OIDC. For local development, set `AI_GATEWAY_API_KEY` in `.env.local`. `AI_MODEL` defaults to `google/gemini-2.5-flash-lite`; change it to any supported AI Gateway text model to switch providers. The recap endpoint requires host login and sends only the selected night's names, results, and recorded events. Each recap is generated on demand and may incur model charges.

The app includes a manifest, home-screen icons, install prompt on supported browsers, iOS installation guidance, and a service worker with a public offline fallback page. Private pages and API responses are never cached by the service worker. Use HTTPS for home-screen installation.

## Checks

`npm test`, `npm run typecheck`, `npm run build`.

## MVP choices

The host password is a single shared admin login. It can be replaced later with individual accounts. Detailed match events are optional and never interrupt the quick score flow. The AI recap is optional; deterministic stats remain in `src/lib/domain.ts`.
