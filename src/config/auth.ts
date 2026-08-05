export interface AccountAuth {
  /** Cookies + localStorage, produced by the setup project. */
  storageState: string;
  /** Raw sessionStorage, re-seeded by the authenticated fixture. */
  sessionFile: string;
}

/**
 * The one account the suite runs as. Signing in happens once per run, in the
 * `setup` project, and every spec reuses the session it writes here.
 */
export const primaryAccount: AccountAuth = {
  storageState: './playwright/.auth/user.json',
  sessionFile: './playwright/.auth/session.json',
};

/**
 * Kept as a name, not a second account: the instalment booking and rent-to-own
 * used to have their own customer so their pending reservations could not
 * collide. They now share the single session above, which means the
 * one-pending-reservation-per-customer rule applies across the whole suite and
 * booking specs must not overlap — the default single worker keeps them
 * sequential.
 */
export const installmentAccount: AccountAuth = primaryAccount;

// Back-compat aliases for the default account.
export const authFile = primaryAccount.storageState;
export const authSessionFile = primaryAccount.sessionFile;
