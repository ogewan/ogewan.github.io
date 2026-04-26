import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, Observable } from 'rxjs';
import type { TimelineCategory, TimelineNode } from '@portfolio/content';

// The Angular justification — an RxJS state machine that fuses three concerns
// the timeline has to keep coherent at all times:
//   1. Filter pill state (all / work / side / education / writing)
//   2. Expanded node id (one at a time, or null)
//   3. The visible node list, derived from #1 and the input nodes
//
// Doing this declaratively in RxJS makes invariants like "if the active filter
// hides the currently expanded node, collapse it" a one-liner instead of a
// scattered set of imperative checks. This is the pattern the brief asks
// the polyglot piece to make legible.

export type TimelineFilter = 'all' | TimelineCategory;

@Injectable()
export class TimelineState {
  // Source streams — both private; the public observables expose only what
  // the component needs, in derived form.
  private readonly nodesSource = new BehaviorSubject<readonly TimelineNode[]>([]);
  private readonly filterSource = new BehaviorSubject<TimelineFilter>('all');
  private readonly expandedSource = new BehaviorSubject<string | null>(null);

  // Stream of the *visible* nodes after filter applied, sorted newest first
  // by startedAt (descending). Distinct-until-changed avoids re-renders when
  // the filtered set is structurally identical.
  readonly visibleNodes$: Observable<readonly TimelineNode[]> = combineLatest([
    this.nodesSource,
    this.filterSource,
  ]).pipe(
    map(([nodes, filter]) => {
      const filtered =
        filter === 'all' ? nodes.slice() : nodes.filter((n) => n.category === filter);
      filtered.sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
      return filtered;
    }),
    distinctUntilChanged((a, b) => a.length === b.length && a.every((n, i) => n.id === b[i]?.id)),
  );

  readonly filter$ = this.filterSource.asObservable();
  readonly expanded$ = this.expandedSource.asObservable();

  setNodes(nodes: readonly TimelineNode[]): void {
    this.nodesSource.next(nodes);
  }

  setFilter(filter: TimelineFilter): void {
    this.filterSource.next(filter);
    // Auto-collapse any expanded node that's no longer visible after the
    // filter change. This is the kind of invariant that's a pain to get
    // right with imperative click handlers; here it's three lines.
    const expanded = this.expandedSource.value;
    if (expanded === null) return;
    const stillVisible =
      filter === 'all' ||
      this.nodesSource.value.find((n) => n.id === expanded)?.category === filter;
    if (!stillVisible) this.expandedSource.next(null);
  }

  toggleExpanded(id: string): void {
    this.expandedSource.next(this.expandedSource.value === id ? null : id);
  }

  collapse(): void {
    this.expandedSource.next(null);
  }
}
