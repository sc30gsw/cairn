import { Result } from "better-result";

export function tryLocalStorageGet(key: string): string | null {
  const result = Result.try({
    catch: () => null,
    try: () => localStorage.getItem(key),
  });
  return Result.isOk(result) ? result.value : null;
}

export function tryLocalStorageSet(key: string, value: string): void {
  Result.try({
    catch: () => undefined,
    try: () => {
      localStorage.setItem(key, value);
    },
  });
}

export function tryLocalStorageRemove(key: string): void {
  Result.try({
    catch: () => undefined,
    try: () => {
      localStorage.removeItem(key);
    },
  });
}

export function trySessionStorageGet(key: string): string | null {
  const result = Result.try({
    catch: () => null,
    try: () => sessionStorage.getItem(key),
  });
  return Result.isOk(result) ? result.value : null;
}

export function trySessionStorageSet(key: string, value: string): void {
  Result.try({
    catch: () => undefined,
    try: () => {
      sessionStorage.setItem(key, value);
    },
  });
}

export function trySessionStorageRemove(key: string): void {
  Result.try({
    catch: () => undefined,
    try: () => {
      sessionStorage.removeItem(key);
    },
  });
}
