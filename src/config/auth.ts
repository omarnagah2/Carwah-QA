export interface AccountAuth {
  /** Cookies + localStorage, produced by the matching setup project. */
  storageState: string;
  /** Raw sessionStorage, re-seeded by the authenticated fixture. */
  sessionFile: string;
}

/**
 * Carwah allows a single pending reservation per customer, so tests that create
 * bookings get their own account. That keeps their cancel-pending hooks from
 * touching each other's reservations and lets their spec files run in parallel.
 */
export const primaryAccount: AccountAuth = {
  storageState: './playwright/.auth/user.json',
  sessionFile: './playwright/.auth/session.json',
};

export const installmentAccount: AccountAuth = {
  storageState: './playwright/.auth/user-installment.json',
  sessionFile: './playwright/.auth/session-installment.json',
};

// Back-compat aliases for the default account.
export const authFile = primaryAccount.storageState;
export const authSessionFile = primaryAccount.sessionFile;
