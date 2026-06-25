const KEY = "f420-display-name";
const FLAG = "f420-name-set";

export function getDisplayName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) ?? "";
}

export function setDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, name.trim());
  localStorage.setItem(FLAG, "1");
}

export function hasSetDisplayName(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FLAG) === "1";
}
