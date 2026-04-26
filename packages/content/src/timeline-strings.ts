import type { TimelineLocaleDict } from './timeline-types.js';

// Per-locale strings. Phase 6 will move these into @portfolio/content/locales/
// alongside the rest of the i18n bundles, but for Phase 5 we keep timeline
// content here so the Angular component has a single import to read from.
//
// Spanish is machine-translated, pending native review. Same disclaimer
// applies to all es-* locale strings produced before Phase 8 polish.

export const TIMELINE_LOCALES: Record<'en' | 'es', TimelineLocaleDict> = {
  en: {
    nodes: {
      'atlas-console': {
        title: 'Lead frontend · Atlas Console',
        role: 'Lead engineer',
        org: 'Atlas Industries',
        body: "Telemetry-to-paint P99 14ms across 28 consoles in two ground stations. Three vehicles currently flying. The brief: a flight director's readout grid, not a dashboard.",
      },
      tide: {
        title: 'Tide — slow-reading RSS client',
        body: 'Side project. RSS for people who would rather read fewer things, more attentively. No infinite scroll, no engagement metrics — a tide table of what arrived and when.',
      },
      aperture: {
        title: 'Aperture — film-grain shader playground',
        body: 'A configurable film-grain pipeline for R3F. Open-sourced after I got tired of shipping the same shader copy-pasted into three different projects.',
      },
      'oklch-essay': {
        title: 'OKLCH for engineers',
        body: 'Essay on perceptual color spaces written for the shop floor: how oklch lets you build a real color system instead of guessing at hex values.',
      },
      brightline: {
        title: 'Senior engineer · Brightline Aerospace',
        role: 'Senior engineer',
        org: 'Brightline Aerospace',
        body: 'Built the ground-systems frontend stack from scratch. Three large console projects, one design system that survived all of them.',
      },
      soundfields: {
        title: 'Soundfields — the indie detour',
        body: 'A two-year side project that paid the bills while I figured out what I actually wanted to do. Shipped 12 EPs and a generative ambient web app.',
      },
      pentagram: {
        title: 'Designer · Pentagram',
        role: 'Designer',
        org: 'Pentagram',
        body: 'Identity and design-system work for technical clients. Where I learned that the best brand systems read like specs, not mood boards.',
      },
      'tec-research': {
        title: 'Tec de Monterrey · research lab',
        role: 'Research assistant',
        org: 'Tec de Monterrey',
        body: 'CS undergrad with an HCI/graphics focus. Spent the last year building tools for the lab to render their own datasets.',
      },
    },
    chrome: {
      heading: 'Trajectory',
      subtitle: '2014 → present · expand any node for the long version',
      filterAll: 'All',
      filterWork: 'Work',
      filterSide: 'Side projects',
      filterEducation: 'Education',
      filterWriting: 'Writing',
      active: 'Active',
      expand: 'Expand',
      collapse: 'Collapse',
    },
  },
  es: {
    nodes: {
      'atlas-console': {
        title: 'Frontend principal · Atlas Console',
        role: 'Ingeniero principal',
        org: 'Atlas Industries',
        body: 'Latencia telemetría-a-pixel P99 de 14ms en 28 consolas, dos estaciones terrestres. Tres vehículos volando ahora. El brief: una grilla de readouts para directores de vuelo, no un dashboard.',
      },
      tide: {
        title: 'Tide — lector de RSS de lectura lenta',
        body: 'Proyecto secundario. RSS para gente que prefiere leer menos, con más atención. Sin scroll infinito, sin métricas de engagement — una tabla de mareas de lo que llegó y cuándo.',
      },
      aperture: {
        title: 'Aperture — playground de shader de grano',
        body: 'Pipeline configurable de grano de película para R3F. Open source después de cansarme de copiar el mismo shader en tres proyectos.',
      },
      'oklch-essay': {
        title: 'OKLCH para ingenieros',
        body: 'Ensayo sobre espacios de color perceptuales escrito para el taller: cómo oklch te permite construir un sistema de color real, no adivinar valores hex.',
      },
      brightline: {
        title: 'Ingeniero senior · Brightline Aerospace',
        role: 'Ingeniero senior',
        org: 'Brightline Aerospace',
        body: 'Construí el stack de frontend para sistemas en tierra desde cero. Tres proyectos grandes de consola, un sistema de diseño que sobrevivió a todos.',
      },
      soundfields: {
        title: 'Soundfields — el desvío indie',
        body: 'Proyecto secundario de dos años que pagó las cuentas mientras descubría qué quería hacer realmente. Saqué 12 EPs y una app web de ambient generativo.',
      },
      pentagram: {
        title: 'Diseñador · Pentagram',
        role: 'Diseñador',
        org: 'Pentagram',
        body: 'Trabajo de identidad y sistemas de diseño para clientes técnicos. Donde aprendí que los mejores sistemas de marca leen como specs, no como mood boards.',
      },
      'tec-research': {
        title: 'Tec de Monterrey · laboratorio de investigación',
        role: 'Asistente de investigación',
        org: 'Tec de Monterrey',
        body: 'Licenciatura en CS con enfoque en HCI/gráficos. Pasé el último año construyendo herramientas para que el lab renderizara sus propios datasets.',
      },
    },
    chrome: {
      heading: 'Trayectoria',
      subtitle: '2014 → presente · expande cualquier nodo para la versión larga',
      filterAll: 'Todo',
      filterWork: 'Trabajo',
      filterSide: 'Proyectos paralelos',
      filterEducation: 'Educación',
      filterWriting: 'Escritura',
      active: 'Activo',
      expand: 'Expandir',
      collapse: 'Colapsar',
    },
  },
};
