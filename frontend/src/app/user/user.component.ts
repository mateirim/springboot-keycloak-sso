import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ThemeService } from '../theme.service';

declare const window: any;

@Component({
  selector: 'app-user',
  template: `
    <div class="user-page animate-in">
      <div class="settings-grid">
        <!-- Social & Friends -->
        <div class="card glass social-card">
          <div class="card-header">
            <h3><mat-icon>people</mat-icon> Social Hub</h3>
          </div>

          <div class="tabs">
            <button [class.active]="socialTab === 'friends'" (click)="socialTab = 'friends'">Friends</button>
            <button [class.active]="socialTab === 'browse'" (click)="socialTab = 'browse'; loadUsers()">Browse Users</button>
          </div>

          <div *ngIf="socialTab === 'friends'" class="friend-list">
            <div *ngFor="let f of friends" class="user-item">
              <div class="avatar">{{ (f.friendName || '?')[0].toUpperCase() }}</div>
              <div class="info">
                <span class="name">{{ f.friendName }}</span>
                <span class="subtext">&#64;{{ f.friendId }}</span>
              </div>
              <button mat-icon-button (click)="removeFriend(f.id)" matTooltip="Remove"><mat-icon>person_remove</mat-icon></button>
            </div>
            <div *ngIf="friends.length === 0" class="empty">
              <mat-icon>group_off</mat-icon>
              <p>No friends added yet.</p>
            </div>
          </div>

          <div *ngIf="socialTab === 'browse'" class="user-browser">
            <div *ngIf="loadingUsers" class="empty"><mat-spinner diameter="32"></mat-spinner></div>
            <div *ngFor="let u of kcUsers" class="user-item">
              <div class="avatar kc-avatar">{{ (u.username || '?')[0].toUpperCase() }}</div>
              <div class="info">
                <span class="name">{{ u.name || u.username }}</span>
                <span class="subtext">&#64;{{ u.username }} <span *ngIf="u.email" class="email-text">&bull; {{ u.email }}</span></span>
              </div>
              <button mat-icon-button (click)="addFriend(u.username, u.name || u.username)" color="primary" matTooltip="Add friend">
                <mat-icon>person_add</mat-icon>
              </button>
            </div>
            <div *ngIf="!loadingUsers && kcUsers.length === 0" class="empty">
              <mat-icon>search_off</mat-icon>
              <p>No other users found yet.</p>
            </div>
          </div>
        </div>

        <!-- Preferences -->
        <div class="card glass">
          <h3><mat-icon>settings</mat-icon> Preferences</h3>
          <div class="setting">
            <span>Dark Theme</span>
            <mat-slide-toggle [checked]="isDarkMode" (change)="toggleTheme($event.checked)"></mat-slide-toggle>
          </div>
          <hr>
          <button class="btn-danger" (click)="resetAll()">FACTORY RESET DATA</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-page { padding: 2rem; }
    .settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(450px, 1fr)); gap: 2rem; }
    .card { padding: 2rem; border-radius: 24px; background: var(--bg-surface); border: 1px solid var(--border); }
    .card h3 { margin: 0 0 1.5rem; display: flex; align-items: center; gap: 0.5rem; color: #6DB33F; text-shadow: 0 1px 2px rgba(0,0,0,0.05); }

    .tabs { display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border); }
    .tabs button { background: transparent; border: none; color: var(--text-secondary); padding: 1rem; cursor: pointer; border-bottom: 2px solid transparent; font-size: 0.9rem; font-weight: 600; }
    .tabs button.active { color: #6DB33F; border-bottom-color: #6DB33F; }

    .user-item { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: var(--hover-bg); border-radius: 16px; margin-bottom: 0.5rem; border: 1px solid var(--border-subtle); }
    .avatar { width: 40px; height: 40px; background: #6DB33F; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; flex-shrink: 0; }
    .kc-avatar { background: linear-gradient(135deg, #6DB33F, #34D399); }
    .info { display: flex; flex-direction: column; flex: 1; gap: 2px; }
    .name { font-weight: 700; color: var(--text-primary); font-size: 0.9rem; }
    .subtext { font-size: 0.75rem; color: var(--text-secondary); }
    .email-text { opacity: 0.7; }

    .setting { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; color: var(--text-primary); font-weight: 700; }
    hr { border-color: var(--border); margin: 1.5rem 0; opacity: 0.1; }
    .btn-danger { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; width: 100%; padding: 1rem; border-radius: 12px; cursor: pointer; font-weight: 700; }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.2); }
    .empty { text-align: center; padding: 2rem; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 0.5rem; mat-icon { font-size: 2rem; width: 2rem; height: 2rem; opacity: 0.4; } p { margin: 0; } }
  `]
})
export class UserComponent implements OnInit {
  socialTab = 'friends';
  friends: any[] = [];
  kcUsers: any[] = [];
  loadingUsers = false;
  isDarkMode = true;

  constructor(private http: HttpClient, private themeService: ThemeService) {}

  ngOnInit() {
    this.loadFriends();
    this.themeService.isDark$.subscribe(dark => this.isDarkMode = dark);
  }

  loadFriends() { this.http.get<any[]>('/api/social/friends').subscribe(f => this.friends = f); }

  loadUsers() {
    this.loadingUsers = true;
    this.kcUsers = [];
    this.http.get<any[]>('/api/social/keycloak-users').subscribe({
      next: u => { 
        this.kcUsers = u; 
        this.loadingUsers = false; 
      },
      error: () => { this.loadingUsers = false; },
      complete: () => { this.loadingUsers = false; }
    });
  }

  addFriend(username: string, name: string) {
    const trimmedName = name.trim() || username;
    this.http.post('/api/social/friends', { friendId: username, friendName: trimmedName })
      .subscribe(() => this.loadFriends());
  }

  removeFriend(id: string) {
    this.http.delete(`/api/social/friends/${id}`).subscribe(() => this.loadFriends());
  }

  toggleTheme(isDark: boolean) {
    this.themeService.setDark(isDark);
  }

  resetAll() {
    if (confirm('Wipe all personal data? This cannot be undone.')) {
      this.http.post('/api/user/reset', {}).subscribe({
        next: () => { alert('All personal data has been reset.'); window.location.reload(); },
        error: (err) => alert('Reset failed: ' + err.message)
      });
    }
  }
}
