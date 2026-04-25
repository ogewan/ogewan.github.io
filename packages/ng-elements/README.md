# @portfolio/ng-elements

Angular Elements bundle compiled to Custom Elements. Hosts the interactive career / project / learning timeline that the React shell lazy-loads on `/about`.

The Angular justification is the timeline's filter + expansion + scroll-sync state machine, modeled with RxJS. Receives the current locale as a property; reads strings from `@portfolio/content` via a small adapter. Target under 60KB gzipped.

**Status**: Phase 0 placeholder. Angular CLI initialization and the timeline component arrive in Phase 5.
