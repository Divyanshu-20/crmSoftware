# ENT Clinic MVP

Minimal forms-only MVP using Next.js, Tailwind, TypeScript, supabase-js (browser), and @react-pdf/renderer.

## Setup
1. Create `.env.local` and set:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
2. In Supabase SQL editor, run `supabase.sql` (schema + permissive prototype RLS). Prototype only; tighten when adding auth.
3. Install deps and run:
```
npm install
npm run dev
```

## Notes
- No API routes; browser calls Supabase directly.
- PDFs are generated on demand and downloaded (no storage).
- RLS is permissive for prototype only.
