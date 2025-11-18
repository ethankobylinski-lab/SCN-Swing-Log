<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1kSDVmSMccQC0sH5OedC3iKzjEviLfvLi

## Supabase Setup

1. [Create a new Supabase project](https://supabase.com/dashboard/projects) and grab the **Project URL** and **anon** API key.
2. Open the SQL editor in the Supabase dashboard and run [`supabase/schema.sql`](supabase/schema.sql).  
   This creates all tables, helper functions, row-level security policies, and the `resolve_join_code` RPC used by the client.
3. In the project settings → Authentication → URL Configuration, set the **Password Reset Redirect URL** to your local dev origin (e.g. `http://localhost:5173/auth/callback`) so Supabase can send password reset links.
4. Create `.env.local` at the repo root with:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   (Keep any existing keys, such as `GEMINI_API_KEY`, alongside the Supabase values.)

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. Start the app: `npm run dev`

The UI now talks directly to Supabase (Auth + Postgres) rather than Firebase.
