import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private isDark = localStorage.getItem('app-theme') !== 'light';
  readonly isDark$ = new BehaviorSubject<boolean>(this.isDark);

  setDark(dark: boolean) {
    this.isDark = dark;
    localStorage.setItem('app-theme', dark ? 'dark' : 'light');
    this.isDark$.next(dark);
  }
}
