import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { parsePlan } from './plan.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('parsePlan', () => {
  const md = [
    '## WEEK 1 — Foundations (Days 1–7)',
    '### 📅 Day 1 — Greetings',
    '#### Part 1: Basics',
    'Hello',
    '---',
    '#### Speaking Task (35 min)',
    '- Say it',
    '## Quick Daily Checklist',
    '- [ ] ignored'
  ].join('\n');

  it('parses weeks, days and sections', () => {
    const plan = parsePlan(md);
    expect(plan.weeks.length).toBe(1);
    expect(plan.days.length).toBe(1);
    expect(plan.days[0].title).toBe('Greetings');
    expect(plan.days[0].sections.map((s) => s.kind)).toEqual(['learn', 'speaking']);
  });
});
