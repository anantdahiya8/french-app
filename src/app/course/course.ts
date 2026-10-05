import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Day, Plan, PlanService, SectionKind } from '../plan.service';

const KIND_META: Record<SectionKind, { icon: string; label: string }> = {
  learn: { icon: '📖', label: 'Learn' },
  speaking: { icon: '🗣️', label: 'Speaking' },
  listening: { icon: '🎧', label: 'Listening' },
  boost: { icon: '🚀', label: 'B1 Boost' },
  anki: { icon: '🗂️', label: 'Anki' }
};

@Component({
  selector: 'app-course',
  imports: [RouterLink],
  templateUrl: './course.html',
  styleUrl: './course.scss'
})
export class Course {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly plan = toSignal<Plan | undefined>(inject(PlanService).plan$);
  private readonly dayParam = toSignal(
    this.route.queryParamMap.pipe(map((p) => Number(p.get('day')) || 1)),
    { initialValue: 1 }
  );

  protected readonly selected = computed<Day | undefined>(() => {
    const days = this.plan()?.days ?? [];
    return days.find((d) => d.number === this.dayParam()) ?? days[0];
  });

  protected readonly prev = computed(() => this.neighbour(-1));
  protected readonly next = computed(() => this.neighbour(1));

  /** Mobile day-picker drawer state. */
  protected readonly menuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  protected meta(kind: SectionKind) {
    return KIND_META[kind];
  }

  protected select(day: number): void {
    this.menuOpen.set(false);
    this.router.navigate(['/course'], { queryParams: { day } });
    window.scrollTo({ top: 0 });
  }

  private neighbour(offset: number): Day | undefined {
    const days = this.plan()?.days ?? [];
    const current = this.selected();
    if (!current) return undefined;
    return days[days.indexOf(current) + offset];
  }
}
