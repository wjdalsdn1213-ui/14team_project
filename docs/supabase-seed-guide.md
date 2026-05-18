# Supabase Seed Guide

## Order

1. Create Auth users in Supabase Authentication
2. Run `supabase/schema.sql`
3. Run `supabase/seed.sql`
4. Put real values into `.env`
5. Install packages and run the app

## Auth users to create

Create these email/password users in Supabase Auth:

- `minjun@rehab.com`
- `seoyeon@email.com`
- `jihoon@email.com`
- `sua@email.com`
- `dohyun@email.com`
- `yuna@email.com`

Suggested test password:

- `1234`

## Important note

`seed.sql` links app profiles to `auth.users` by email.
If an auth user does not exist yet, that profile row will not be inserted.

## After seed

The app should have:

- 1 therapist
- 5 patients
- 10 exercises
- 5 prescriptions
- starter therapist comments

## Still needed locally

Install:

```bash
npm install
```

Then set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
