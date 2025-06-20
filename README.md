# messageApp

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/Tayler01/messageApp)

User accounts are handled through Supabase authentication. New or returning users
sign in using the **AuthForm** component displayed on startup. An older
`UserSetup` component that stored user details locally is no longer used and has
been removed.

## Migrations

Active database migrations live in `supabase/migrations`. Older SQL files that were replaced or abandoned during development are stored in `docs/discarded_migrations` for historical reference only. They are not part of the migration chain.
