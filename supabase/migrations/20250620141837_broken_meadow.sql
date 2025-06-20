/*
  # Enable pg_net extension

  1. Extensions
    - Enable `pg_net` extension for network capabilities
    - This extension is required for HTTP requests and network operations in Supabase functions

  2. Notes
    - The pg_net extension provides network access capabilities to PostgreSQL
    - This is essential for functions that need to make HTTP requests or send notifications
    - Without this extension, RPC calls that require network access will fail with "schema net does not exist" error
*/

-- Enable the pg_net extension for network capabilities
CREATE EXTENSION IF NOT EXISTS pg_net;