// Minimal class-name joiner. Avoids the clsx dependency for something this small;
// all we need is to drop falsy values and join with spaces.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
