// Ambient module declarations for binary asset imports. Vite resolves these
// to URL strings at build time and emits them into dist/assets/. The shell's
// vite-env.d.ts covers the same for its own files; this shim lets the
// celestial package compile without depending on Vite's client types
// (which would be inappropriate for a non-shell workspace package).

declare module '*.webp' {
  const url: string;
  export default url;
}

declare module '*.png' {
  const url: string;
  export default url;
}

declare module '*.jpg' {
  const url: string;
  export default url;
}

declare module '*.bin?url' {
  const url: string;
  export default url;
}
