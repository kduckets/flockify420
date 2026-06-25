const DEVICE_KEY   = "f420-visitor-id";
const USERNAME_KEY = "f420-username";
const NAME_FLAG    = "f420-name-set";

function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
  return id;
}

export function getUsername(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(USERNAME_KEY) ?? "";
}

export function setUsername(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERNAME_KEY, name.trim());
  localStorage.setItem(NAME_FLAG, "1");
}

export function hasSetUsername(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(NAME_FLAG) === "1";
}

// Redis field used for this user's ratings and comment ownership
export function getEffectiveUserId(): string {
  const u = getUsername();
  return u || getDeviceId();
}
