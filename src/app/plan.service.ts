import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { marked } from 'marked';
import { catchError, map, of, shareReplay } from 'rxjs';

export type SectionKind = 'learn' | 'speaking' | 'listening' | 'boost' | 'anki';

export interface Section {
  title: string;
  kind: SectionKind;
  html: string;
}

export interface Day {
  number: number;
  title: string;
  weekNumber: number;
  sections: Section[];
}

export interface Week {
  number: number;
  title: string;
  days: Day[];
}

export interface Plan {
  weeks: Week[];
  days: Day[];
}

interface RawSection {
  title: string;
  lines: string[];
}

function kindOf(title: string): SectionKind {
  const t = title.toLowerCase();
  if (t.startsWith('speaking')) return 'speaking';
  if (t.startsWith('listening')) return 'listening';
  if (t.startsWith('b1 boost')) return 'boost';
  if (t.startsWith('add to anki')) return 'anki';
  return 'learn';
}

function render(lines: string[]): string {
  return marked.parse(lines.join('\n'), { async: false }) as string;
}

export function parsePlan(md: string): Plan {
  const weeks: Week[] = [];
  const rawDays = new Map<Day, RawSection[]>();

  let week: Week | undefined;
  let day: Day | undefined;
  let section: RawSection | undefined;

  for (const line of md.split(/\r?\n/)) {
    const w = /^## WEEK (\d+)\s*[—-]\s*(.+)$/.exec(line);
    if (w) {
      week = { number: +w[1], title: w[2].trim(), days: [] };
      weeks.push(week);
      day = undefined;
      section = undefined;
      continue;
    }
    if (/^## /.test(line)) {
      // Any other top-level section (checklist, notes) ends the course content.
      week = undefined;
      day = undefined;
      section = undefined;
      continue;
    }

    const d = /^### .*?Day (\d+)\s*[—-]\s*(.+)$/.exec(line);
    if (d && week) {
      day = { number: +d[1], title: d[2].trim(), weekNumber: week.number, sections: [] };
      week.days.push(day);
      section = { title: 'Overview', lines: [] };
      rawDays.set(day, [section]);
      continue;
    }
    if (!day) continue;

    const s = /^#### (.+)$/.exec(line);
    if (s) {
      section = { title: s[1].trim(), lines: [] };
      rawDays.get(day)!.push(section);
      continue;
    }
    if (line.trim() === '---') continue;
    section!.lines.push(line);
  }

  for (const [d, sections] of rawDays) {
    d.sections = sections
      .filter((s) => s.lines.some((l) => l.trim() !== ''))
      .map((s) => ({ title: s.title, kind: kindOf(s.title), html: render(s.lines) }));
  }

  return { weeks, days: weeks.flatMap((x) => x.days) };
}

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);

  readonly plan$ = this.http.get('assets/french-plan.md', { responseType: 'text' }).pipe(
    map(parsePlan),
    catchError(() => of<Plan>({ weeks: [], days: [] })),
    shareReplay(1)
  );
}
