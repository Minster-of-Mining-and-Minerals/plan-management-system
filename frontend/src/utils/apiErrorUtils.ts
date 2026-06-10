export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  const err = error as {
    data?: {
      message?: string;
      error?: string;
      errors?: string[];
    };
  };

  if (err.data?.errors?.length) {
    return err.data.errors.join("; ");
  }

  return err.data?.message || err.data?.error || fallback;
}
