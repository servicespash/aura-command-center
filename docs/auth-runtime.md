# Authentication runtime configuration

The authentication server requires two private signing secrets:

- `AURA_AUTH_STATE_SECRET`: signs short-lived OAuth/OIDC authorization state.
- `AURA_SESSION_SIGNING_KEY`: signs the transient authenticated session cookie.

Both values are server-runtime secrets. They must never be placed in `VITE_*` variables, client source, committed files, or public repository configuration.

For a local runtime, generate independent high-entropy values and expose them only to the server process. For a hosted runtime, add them as encrypted server/runtime secrets in the platform's environment configuration.

The authentication flow intentionally fails closed when either secret is missing. The correct fix for `AURA_AUTH_STATE_SECRET is not configured` is to provision the secret in the runtime, not to hardcode a fallback.

The OAuth start endpoint emits the state and browser nonce as separate `Set-Cookie` headers. The callback validates both the signed state and browser-bound nonce before exchanging the provider authorization code.
