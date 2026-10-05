import { Routes } from '@angular/router';

import { Course } from './course/course';
import { Flashcard } from './flashcard/flashcard';
import { Home } from './home/home';

export const routes: Routes = [
  { path: '', component: Home, title: 'Learn French' },
  { path: 'course', component: Course, title: 'French Course' },
  { path: 'flashcard', component: Flashcard, title: 'French Flashcards' },
  { path: '**', redirectTo: '' }
];
