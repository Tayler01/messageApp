# messageApp

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/Tayler01/messageApp)

User accounts are handled through Supabase authentication. New or returning users
sign in using the **AuthForm** component displayed on startup. An older
`UserSetup` component that stored user details locally is no longer used and has
been removed.

## Environment setup

Create a `.env` file in the project root and add your Supabase credentials:

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

An `.env.example` file is included as a template.
