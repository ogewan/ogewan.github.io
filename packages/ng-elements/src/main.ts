import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { TimelineComponent } from './app/timeline.component';

// Bootstrap entry. Spins up an Angular application context (without rendering
// any root component) and uses @angular/elements to wrap the standalone
// TimelineComponent as a native custom element. Once defined, anyone can
// drop `<portfolio-timeline locale="en">` into their DOM and the React shell
// can imperatively set `el.data = nodes[]` to feed it.
async function bootstrap(): Promise<void> {
  const app = await createApplication({ providers: [] });
  const TimelineElement = createCustomElement(TimelineComponent, {
    injector: app.injector,
  });
  // Guard against double-define if the bundle is loaded more than once
  // (Vite HMR or React StrictMode double-render edge cases).
  if (!customElements.get('portfolio-timeline')) {
    customElements.define('portfolio-timeline', TimelineElement);
  }
}

void bootstrap();
