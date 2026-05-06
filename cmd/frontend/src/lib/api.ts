export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("server returned an unreadable response");
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function putBlob(url: string, file: File): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(body || `upload failed with status ${response.status}`);
  }
}
