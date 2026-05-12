import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import type { TimelineNode, TimelineStringsDict } from '@portfolio/content';
import { TimelineState, type TimelineFilter } from './timeline-state.service.js';

// Polyglot bridge note for the curious:
//   This standalone component is registered as the <portfolio-timeline> custom
//   element by main.ts via @angular/elements. The React shell sets two inputs:
//     - `locale` (string attribute) — picked up by Angular's @Input() binding
//     - `data` (object property) — set imperatively on the DOM node via React
//       useEffect; Angular reads it through @Input setters
//   Object inputs cannot be passed through HTML attributes (only strings can),
//   so the React side does `el.data = nodes` after mount. See TimelineWrapper
//   in the shell for the bridge implementation.

@Component({
  selector: 'portfolio-timeline',
  standalone: true,
  imports: [CommonModule],
  providers: [TimelineState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
})
export class TimelineComponent implements OnInit, OnDestroy {
  private readonly state = inject(TimelineState);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subs = new Subscription();

  // Reactive primitives. Signals for view-bound state (auto-tracked); RxJS
  // for the cross-stream state-machine logic in TimelineState.
  readonly visibleNodes = signal<readonly TimelineNode[]>([]);
  readonly currentFilter = signal<TimelineFilter>('all');
  readonly expandedId = signal<string | null>(null);
  readonly focusedIndex = signal<number>(0);
  readonly localeSignal = signal<'en' | 'es'>('en');
  readonly stringsSignal = signal<TimelineStringsDict | null>(null);

  // Locale-resolved view of the strings dict (set by the React shell via the
  // `strings` property input) — strings are stored as { en, es } leaves; this
  // computed picks the active locale once so the template binds to plain
  // strings (no locale index in the template). Until the shell sets `strings`,
  // returns an empty-but-shaped dict so the template never dereferences null.
  readonly dict = computed(() => {
    const lang = this.localeSignal();
    const src = this.stringsSignal();
    if (!src) {
      return {
        nodes: {} as Record<string, { title: string; body: string; role?: string; org?: string }>,
        chrome: {
          heading: '',
          subtitle: '',
          filterAll: '',
          filterWork: '',
          filterSide: '',
          filterEducation: '',
          filterWriting: '',
          active: '',
          expand: '',
          collapse: '',
        },
      };
    }
    const nodes: Record<string, { title: string; body: string; role?: string; org?: string }> = {};
    for (const [id, s] of Object.entries(src.nodes)) {
      nodes[id] = {
        title: s.title[lang],
        body: s.body[lang],
        ...(s.role ? { role: s.role[lang] } : {}),
        ...(s.org ? { org: s.org[lang] } : {}),
      };
    }
    const c = src.chrome;
    return {
      nodes,
      chrome: {
        heading: c.heading[lang],
        subtitle: c.subtitle[lang],
        filterAll: c.filterAll[lang],
        filterWork: c.filterWork[lang],
        filterSide: c.filterSide[lang],
        filterEducation: c.filterEducation[lang],
        filterWriting: c.filterWriting[lang],
        active: c.active[lang],
        expand: c.expand[lang],
        collapse: c.collapse[lang],
      },
    };
  });

  // Filter pill metadata. Computed against the current locale so labels
  // re-resolve when `locale` changes — and also so Angular's strict template
  // type-check sees concrete strings instead of dynamic key indexing
  // (which would error under strictTemplates).
  readonly filters = computed(() => {
    const c = this.dict().chrome;
    return [
      { key: 'all' as TimelineFilter, label: c.filterAll },
      { key: 'work' as TimelineFilter, label: c.filterWork },
      { key: 'side' as TimelineFilter, label: c.filterSide },
      { key: 'education' as TimelineFilter, label: c.filterEducation },
      { key: 'writing' as TimelineFilter, label: c.filterWriting },
    ];
  });

  @ViewChild('nodeList', { static: false })
  nodeList?: ElementRef<HTMLElement>;

  // Input setters — both are wired by the React side. `locale` comes through
  // as an attribute (string) so it triggers Angular's element-attribute-to-input
  // bridge. `data` is set as a DOM property by React's useEffect because object
  // values can't ride attributes.
  private _locale: 'en' | 'es' = 'en';
  @Input()
  set locale(value: string | null) {
    const v = value === 'es' ? 'es' : 'en';
    this._locale = v;
    this.localeSignal.set(v);
  }
  get locale(): 'en' | 'es' {
    return this._locale;
  }

  private _data: readonly TimelineNode[] = [];
  @Input()
  set data(value: readonly TimelineNode[] | null) {
    const nodes = value ?? [];
    this._data = nodes;
    this.state.setNodes(nodes);
  }
  get data(): readonly TimelineNode[] {
    return this._data;
  }

  // `strings` is a DOM property (object, can't ride an HTML attribute) set
  // imperatively by the React shell — same bridge pattern as `data`. Keeping
  // the copy out of this bundle means config.json edits don't need an ng
  // rebuild.
  private _strings: TimelineStringsDict | null = null;
  @Input()
  set strings(value: TimelineStringsDict | null) {
    this._strings = value;
    this.stringsSignal.set(value);
  }
  get strings(): TimelineStringsDict | null {
    return this._strings;
  }

  ngOnInit(): void {
    this.subs.add(
      this.state.visibleNodes$.subscribe((nodes) => {
        this.visibleNodes.set(nodes);
        // Clamp focused index after filter changes so arrow keys don't land
        // on a now-hidden index.
        if (this.focusedIndex() >= nodes.length) this.focusedIndex.set(0);
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.filter$.subscribe((f) => {
        this.currentFilter.set(f);
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.state.expanded$.subscribe((id) => {
        this.expandedId.set(id);
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  applyFilter(filter: TimelineFilter): void {
    this.state.setFilter(filter);
  }

  toggleExpanded(id: string): void {
    this.state.toggleExpanded(id);
  }

  // Keyboard handling — full a11y per the brief:
  //   ArrowRight / ArrowDown → next node
  //   ArrowLeft / ArrowUp → previous node
  //   Enter / Space → toggle expansion
  //   Escape → collapse
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.classList.contains('node-button')) return;

    const visible = this.visibleNodes();
    const i = this.focusedIndex();

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        const next = Math.min(visible.length - 1, i + 1);
        this.focusedIndex.set(next);
        this.focusNode(next);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        const prev = Math.max(0, i - 1);
        this.focusedIndex.set(prev);
        this.focusNode(prev);
        break;
      }
      case 'Escape': {
        if (this.expandedId() !== null) {
          event.preventDefault();
          this.state.collapse();
        }
        break;
      }
    }
  }

  private focusNode(index: number): void {
    const root = this.nodeList?.nativeElement;
    if (!root) return;
    const buttons = root.querySelectorAll<HTMLButtonElement>('button.node-button');
    buttons[index]?.focus({ preventScroll: false });
  }

  trackById = (_: number, node: TimelineNode): string => node.id;
}
