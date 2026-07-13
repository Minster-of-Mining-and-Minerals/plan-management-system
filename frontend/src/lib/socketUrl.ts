export function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  const port = process.env.NEXT_PUBLIC_SOCKET_PORT || "5000";
  const fileUrl = process.env.NEXT_PUBLIC_FILE_URL || "http://localhost:4000";

  try {
    const parsed = new URL(fileUrl);
    return `${parsed.protocol}//${parsed.hostname}:${port}`;
  } catch {
    return `http://localhost:${port}`;
  }
}
