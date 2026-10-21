# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Supabase customer profiles

The app stores customer profiles in Supabase and only lists profiles whose owners opted in to visibility. To install the required table, row-level security policies, signup trigger, and profile image bucket:

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/xmmikhtsxbhzfpbrqjfz/sql/new).
2. Run the SQL in [supabase/schema.sql](supabase/schema.sql).
3. Create an account, complete its profile, enable **Visa min profil**, and save.

New profiles are hidden until their owner publishes them. Never use a Supabase `service_role` key in the frontend.

## Mobile app

The Expo mobile client lives in [mobile](mobile). It shares Supabase auth and profile data with the web app and currently includes login/signup, persistent sessions, visible-member discovery, swipe actions, profile editing, and profile visibility.

The mobile profile expansion adds image uploads, interests, relationship intent, and lifestyle preferences. Run [supabase/mobile-profile-expansion.sql](supabase/mobile-profile-expansion.sql) in the Supabase SQL Editor before saving those new preference fields.

Outing preferences add food and venue choices, openness to trying new activities, first-date setting, and the choice to opt in or out of dating challenges. Run [supabase/mobile-outing-preferences.sql](supabase/mobile-outing-preferences.sql) in the Supabase SQL Editor before saving these fields.

Phone verification uses Supabase Auth's phone-change SMS OTP flow. Before using it, enable phone authentication in Supabase **Authentication → Providers → Phone** and configure an SMS provider and phone-change message template. The ID/passport screen stays disabled until a secure Sumsub token endpoint and signed verification-result callback are configured; never enable it with a client-side flag alone.

Message and chat background colors are saved separately to each member's profile. Run [supabase/mobile-chat-color.sql](supabase/mobile-chat-color.sql), [supabase/mobile-chat-panel-color.sql](supabase/mobile-chat-panel-color.sql), and [supabase/mobile-chat-background-customization.sql](supabase/mobile-chat-background-customization.sql) in the Supabase SQL Editor to enable saving and restoring colors and patterns.

Persistent mobile likes and the Connections view use [supabase/mobile-social.sql](supabase/mobile-social.sql). Run that migration before expecting like/pass actions to survive app restarts.

Mobile chat and challenge records use [supabase/mobile-community.sql](supabase/mobile-community.sql). Run it before using the Connections **Skriv** action; the Challenges catalog is currently shown in a prepared state while real partner booking is still disabled.

Block and report actions use [supabase/mobile-safety.sql](supabase/mobile-safety.sql). Run it before using the safety controls in Connections.

From the workspace root:

```sh
npm run web --prefix mobile
```

For a phone, install Expo Go and scan the QR code from the Expo terminal. The phone and development computer must be on the same network. For App Store/Google Play distribution, add EAS Build and the Apple/Google credentials after the mobile MVP is approved.

The mobile app is configured for EAS with bundle ID `com.jannahu.app`. From `mobile/`, use `npx eas login`, then `npx eas build --profile preview` for an internal test build or `npx eas build --profile production` for store builds.

## In-app voice calls

Calls use LiveKit Cloud audio rooms and Supabase Realtime invitations. After updating this feature, rerun [supabase/schema.sql](supabase/schema.sql) in the project's SQL Editor to add the participant-protected `calls` table and enable Realtime.

Add these variables to the Vercel project for Production and Preview:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the browser app.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the call-token function.
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` from LiveKit Cloud.

Keep `LIVEKIT_API_SECRET` server-only; never name it with a `VITE_` prefix. Add the production site URL to Supabase Auth's redirect allowlist.

## Deploy web app and publish updates

The web app is configured for Vercel in [vercel.json](vercel.json). To publish automatically whenever you push changes:

1. Create a GitHub repository and push this project to it. Keep `.env` files out of Git; `.env.example` is safe to commit and lists the required variable names.
2. In Vercel, import that GitHub repository as a project. Keep the project root as the repository root; the Vite build command (`npm run build`) and output directory (`dist`) are configured in `vercel.json`.
3. In the Vercel project's **Settings → Environment Variables**, set the production values for `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`. Keep `LIVEKIT_API_SECRET` server-only.
4. Make sure `VITE_ADMIN_BYPASS_AUTH` is not set to `true` in Vercel. It is only for local development and disables the dashboard sign-in check.
5. Push changes to the connected production branch to publish a production deployment. Pushes to other branches create preview deployments.

After the initial GitHub/Vercel connection, Vercel builds and publishes updates automatically; no separate deploy command is needed.
