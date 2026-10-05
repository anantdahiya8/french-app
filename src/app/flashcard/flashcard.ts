import { HttpClient } from '@angular/common/http';
import { Component, HostListener, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';

type DeckType = 'words' | 'sentences';
type Decks = Record<string, Record<string, string>>;
interface DeckState {
  status: 'loading' | 'ready' | 'error';
  data: Decks | null;
}

const FILES: Record<DeckType, string> = {
  words: 'assets/words.json',
  sentences: 'assets/sentence.json'
};
const SWIPE_THRESHOLD = 60; // px needed to count as a swipe
const TAP_SLOP = 8; // px of movement still treated as a tap

@Component({
  selector: 'app-flashcard',
  imports: [RouterLink],
  templateUrl: './flashcard.html',
  styleUrl: './flashcard.scss'
})
export class Flashcard {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  protected readonly sets = [1, 2, 3, 4];

  private readonly type$ = this.route.queryParamMap.pipe(
    map((p): DeckType => (p.get('type') === 'sentences' ? 'sentences' : 'words')),
    distinctUntilChanged()
  );

  protected readonly type = toSignal(this.type$, { initialValue: 'words' as DeckType });

  protected readonly set = toSignal(
    this.route.queryParamMap.pipe(
      map((p) => {
        const n = Number(p.get('set'));
        return n >= 1 && n <= 4 ? n : 1;
      }),
      distinctUntilChanged()
    ),
    { initialValue: 1 }
  );

  protected readonly state = toSignal(
    this.type$.pipe(
      switchMap((t) =>
        this.http.get<Decks>(FILES[t]).pipe(
          map((data): DeckState => ({ status: 'ready', data })),
          catchError(() => of<DeckState>({ status: 'error', data: null })),
          startWith<DeckState>({ status: 'loading', data: null })
        )
      )
    ),
    { initialValue: { status: 'loading', data: null } as DeckState }
  );

  protected readonly cards = computed(() => {
    const deck = this.state().data?.['set' + this.set()] ?? {};
    return Object.entries(deck).map(([front, back]) => ({ front, back }));
  });

  protected readonly total = computed(() => this.cards().length);
  protected readonly index = signal(0);
  protected readonly flipped = signal(false);

  /**
   * A one-item list so Angular re-creates the card element for every new card.
   * That avoids a flip-back animation that would briefly show the next answer.
   */
  protected readonly visible = computed(() => {
    const card = this.cards()[this.index()];
    return card ? [{ index: this.index(), ...card }] : [];
  });

  protected readonly dragX = signal(0);
  protected readonly dragging = signal(false);
  protected readonly dragTransform = computed(
    () => `translateX(${this.dragX()}px) rotate(${this.dragX() / 25}deg)`
  );

  private startX = 0;
  private pointerId: number | null = null;

  constructor() {
    // Start from the first card whenever the deck or set changes.
    effect(() => {
      this.type();
      this.set();
      untracked(() => {
        this.index.set(0);
        this.flipped.set(false);
      });
    });
  }

  protected choose(type: DeckType, set: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type, set },
      replaceUrl: true
    });
  }

  protected flip(): void {
    this.flipped.update((v) => !v);
  }

  protected next(): void {
    if (this.index() < this.total() - 1) {
      this.flipped.set(false);
      this.index.update((i) => i + 1);
    }
  }

  protected goTo(input: HTMLInputElement): void {
    const n = Math.round(Number(input.value));
    if (!Number.isFinite(n) || !input.value || !this.total()) {
      input.value = '' + (this.index() + 1);
      return;
    }
    const target = Math.min(Math.max(n, 1), this.total()) - 1;
    this.flipped.set(false);
    this.index.set(target);
    input.value = '' + (target + 1);
  }

  protected prev(): void {
    if (this.index() > 0) {
      this.flipped.set(false);
      this.index.update((i) => i - 1);
    }
  }

  // ---- swipe / tap handling ----
  protected onDown(e: PointerEvent): void {
    this.pointerId = e.pointerId;
    this.startX = e.clientX;
    this.dragging.set(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  protected onMove(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    this.dragX.set(e.clientX - this.startX);
  }

  protected onUp(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.startX;
    this.endDrag();
    if (Math.abs(dx) < TAP_SLOP) this.flip();
    else if (dx <= -SWIPE_THRESHOLD) this.next();
    else if (dx >= SWIPE_THRESHOLD) this.prev();
  }

  protected endDrag(): void {
    this.pointerId = null;
    this.dragging.set(false);
    this.dragX.set(0);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'BUTTON' || tag === 'A') return;
    if (e.key === 'ArrowRight') this.next();
    else if (e.key === 'ArrowLeft') this.prev();
    else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.flip();
    }
  }
}
