export const SUSPENDED_ACCOUNT_MESSAGE_STORAGE_KEY = "koli-auth-suspended-message";

const SUSPENDED_ACCOUNT_BASE_MESSAGE = "Your account has been suspended. Please contact support.";

export const isSuspendedStatus = (status?: string | null) => {
  return typeof status === "string" && status.trim().toLowerCase() === "suspended";
};

export const buildSuspendedAccountMessage = (reason?: string | null) => {
  const cleanReason = reason?.trim();
  if (!cleanReason) {
    return SUSPENDED_ACCOUNT_BASE_MESSAGE;
  }

  return `${SUSPENDED_ACCOUNT_BASE_MESSAGE} Reason: ${cleanReason}`;
};
