import { Component, OnInit, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface StoredFile {
  id: string;
  filename: string;
  size: number;
  uploadDate: string;
  contentType: string;
  isOwner?: boolean;
}

interface KcUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

@Component({
  selector: 'app-files',
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="files-container">
      <div class="page-header">
        <div>
          <h2>File Storage</h2>
          <p class="subtitle">Upload and manage your files — stored in MongoDB GridFS</p>
        </div>
        <button class="upload-btn" (click)="fileInput.click()" [disabled]="uploading || !canUpload()" [title]="!canUpload() ? 'Contributors and administrators can upload files' : ''">
          <mat-icon>upload_file</mat-icon>
          {{ uploading ? 'Uploading...' : 'Upload File' }}
        </button>
        <input #fileInput type="file" hidden (change)="onFileSelected($event)" multiple>
      </div>

      <mat-progress-bar *ngIf="uploading" mode="determinate" [value]="uploadProgress" class="upload-bar"></mat-progress-bar>

      <div *ngIf="error" class="error-banner">
        <mat-icon>error_outline</mat-icon> {{ error }}
      </div>

      <!-- Share picker panel -->
      <div *ngIf="shareTarget" class="share-panel glass-panel">
        <div class="share-panel-header">
          <mat-icon>share</mat-icon>
          <span>Share <strong>{{ shareTarget.filename }}</strong> with:</span>
          <button mat-icon-button (click)="shareTarget = null"><mat-icon>close</mat-icon></button>
        </div>
        <div *ngIf="loadingUsers" class="share-loading"><mat-spinner diameter="24"></mat-spinner></div>
        <div class="share-user-list">
          <div *ngFor="let u of kcUsers" class="share-user-item" (click)="confirmShare(u)">
            <div class="share-avatar">{{ (u.username || '?')[0].toUpperCase() }}</div>
            <div class="share-user-info">
              <span class="share-user-name">{{ u.firstName || '' }} {{ u.lastName || '' }}<span *ngIf="!u.firstName && !u.lastName">{{ u.username }}</span></span>
              <span class="share-user-sub">&#64;{{ u.username }}<span *ngIf="u.email"> &bull; {{ u.email }}</span></span>
            </div>
            <mat-icon class="share-arrow">arrow_forward</mat-icon>
          </div>
          <div *ngIf="!loadingUsers && kcUsers.length === 0" class="share-empty">No users found.</div>
        </div>
      </div>

      <div class="table-wrap glass-panel">
        <mat-table [dataSource]="dataSource" matSort class="files-table">

          <ng-container matColumnDef="filename">
            <mat-header-cell *matHeaderCellDef mat-sort-header>Name</mat-header-cell>
            <mat-cell *matCellDef="let f">
              <mat-icon class="file-icon">{{ iconFor(f.contentType) }}</mat-icon>
              {{ f.filename }}
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="size">
            <mat-header-cell *matHeaderCellDef mat-sort-header>Size</mat-header-cell>
            <mat-cell *matCellDef="let f">{{ formatSize(f.size) }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="contentType">
            <mat-header-cell *matHeaderCellDef mat-sort-header>Type</mat-header-cell>
            <mat-cell *matCellDef="let f" class="mono">{{ f.contentType }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="uploadDate">
            <mat-header-cell *matHeaderCellDef mat-sort-header>Uploaded</mat-header-cell>
            <mat-cell *matCellDef="let f">{{ f.uploadDate | date:'short' }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="actions">
            <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
            <mat-cell *matCellDef="let f">
              <button mat-icon-button (click)="download(f)" matTooltip="Download">
                <mat-icon>download</mat-icon>
              </button>
              <button mat-icon-button (click)="openShare(f)" matTooltip="Share with user" *ngIf="f.isOwner && (hasRole('contributor') || hasRole('administrator'))">
                <mat-icon>share</mat-icon>
              </button>
              <button mat-icon-button (click)="delete(f)" matTooltip="Delete" class="delete-btn" *ngIf="f.isOwner && canDelete()" [disabled]="!canDelete()">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="columns"></mat-header-row>
          <mat-row *matRowDef="let row; columns: columns;"></mat-row>

          <mat-row *matNoDataRow class="no-data-row">
            <mat-cell colspan="5" class="no-data">
              <mat-icon>cloud_upload</mat-icon>
              <span>No files yet — upload your first file above</span>
            </mat-cell>
          </mat-row>
        </mat-table>
      </div>
    </div>
  `,
  styles: [`
    .files-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;

      h2 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    }

    .subtitle { margin: 4px 0 0; color: #64748b; font-size: 0.875rem; }

    .upload-btn {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: rgba(109, 179, 63, 0.12);
      border: 1px solid rgba(109, 179, 63, 0.35);
      border-radius: 12px;
      color: #6DB33F;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;

      &:hover:not(:disabled) { background: rgba(109, 179, 63, 0.25); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }

      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }

    .upload-bar { border-radius: 4px; }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      color: #f87171;
      font-size: 0.875rem;
    }

    .table-wrap {
      overflow: auto;
      border-radius: 16px;
    }

    .files-table {
      width: 100%;
      background: transparent;

      .mat-mdc-header-cell {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      }

      .mat-mdc-cell {
        color: #cbd5e1 !important;
        font-size: 0.875rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      }

      // Column Widths
      .mat-column-filename    { flex: 1; min-width: 240px; }
      .mat-column-size        { flex: 0 0 100px; }
      .mat-column-contentType { flex: 0 0 160px; }
      .mat-column-uploadDate  { flex: 0 0 160px; }
      .mat-column-actions     { flex: 0 0 160px; justify-content: center; gap: 4px; }

      .mat-mdc-row:hover .mat-mdc-cell {
        background: rgba(255, 255, 255, 0.03) !important;
      }

      .mat-mdc-header-row {
        background: rgba(255, 255, 255, 0.02) !important;
      }
    }

    /* Theme overrides consolidated in styles.scss */


    .file-icon { font-size: 18px; width: 18px; height: 18px; color: #6DB33F; margin-right: 8px; vertical-align: middle; }
    .mono { font-family: monospace; font-size: 0.8rem; }
    .delete-btn mat-icon { color: #ef4444; }

    .no-data {
      text-align: center;
      padding: 3rem !important;
      color: #475569;
      flex: 1;
      justify-content: center;
      mat-icon { display: block; font-size: 48px; width: 48px; height: 48px; margin: 0 auto 1rem; }
      span { display: block; }
    }

    .share-panel {
      padding: 1.25rem;
      border-radius: 16px;
    }
    .share-panel-header {
      display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;
      mat-icon:first-child { color: #6DB33F; }
      span { flex: 1; font-size: 0.9rem; color: #94a3b8; }
      strong { color: #e2e8f0; }
    }
    .share-loading { display: flex; justify-content: center; padding: 1rem; }
    .share-user-list { display: flex; flex-direction: column; gap: 0.4rem; max-height: 260px; overflow-y: auto; }
    .share-user-item {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem;
      border-radius: 10px; cursor: pointer; transition: background 0.15s;
      &:hover { background: rgba(109,179,63,0.1); .share-arrow { opacity: 1; } }
    }
    .share-avatar {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(135deg, #6DB33F, #34D399);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; color: white; font-size: 0.85rem;
    }
    .share-user-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .share-user-name { font-weight: 600; color: #e2e8f0; font-size: 0.875rem; }
    .share-user-sub { font-size: 0.72rem; color: #64748b; }
    .share-arrow { color: #6DB33F; opacity: 0; transition: opacity 0.15s; font-size: 18px; width: 18px; height: 18px; }
    .share-empty { text-align: center; padding: 1.5rem; color: #475569; font-size: 0.875rem; }
  `]
})
export class FilesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  columns = ['filename', 'size', 'contentType', 'uploadDate', 'actions'];
  dataSource = new MatTableDataSource<StoredFile>([]);
  uploading = false;
  uploadProgress = 0;
  error = '';
  shareTarget: StoredFile | null = null;
  kcUsers: KcUser[] = [];
  loadingUsers = false;
  roles: string[] = [];
  currentUserId: string = '';

  @ViewChild(MatSort) set sort(s: MatSort) { this.dataSource.sort = s; }

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.loadRoles();
    this.load();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  loadRoles() {
    this.http.get<any>('/api/user/info')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: info => {
          this.roles = info.roles || [];
          this.currentUserId = info.sub || '';
        },
        error: () => this.roles = []
      });
  }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  canUpload(): boolean {
    return this.hasRole('contributor') || this.hasRole('administrator');
  }

  canDelete(): boolean {
    return this.hasRole('administrator');
  }

  load() {
    this.error = '';
    this.http.get<StoredFile[]>('/api/files')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: files => this.dataSource.data = files,
        error: () => this.error = 'Could not load files.'
      });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    Array.from(input.files).forEach(f => this.uploadFile(f));
    input.value = '';
  }

  uploadFile(file: File) {
    this.uploading = true;
    this.uploadProgress = 0;
    const form = new FormData();
    form.append('file', file);

    this.http.post('/api/files', form, { reportProgress: true, observe: 'events' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: event => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress = Math.round(100 * event.loaded / event.total);
          } else if (event.type === HttpEventType.Response) {
            this.uploading = false;
            this.load();
          }
        },
        error: () => {
          this.error = 'Upload failed.';
          this.uploading = false;
        }
      });
  }

  download(f: StoredFile) {
    window.open(`/api/files/${f.id}`, '_blank');
  }

  openShare(f: StoredFile) {
    this.shareTarget = f;
    if (this.kcUsers.length === 0) {
      this.loadingUsers = true;
      this.http.get<KcUser[]>('/api/social/keycloak-users').subscribe({
        next: u => { 
          this.kcUsers = u.filter(user => user.id !== this.currentUserId); 
          this.loadingUsers = false; 
        },
        error: () => { this.loadingUsers = false; }
      });
    }
  }

  confirmShare(u: KcUser) {
    if (!this.shareTarget) return;
    const f = this.shareTarget;
    this.shareTarget = null;
    this.http.post(`/api/files/${f.id}/share`, { userId: u.id }).subscribe({
      next: () => this.snackBar.open(`Shared "${f.filename}" with @${u.username}`, 'Close', { duration: 3000 }),
      error: () => this.snackBar.open('Share failed.', 'Close', { duration: 3000 })
    });
  }

  delete(f: StoredFile) {
    if (!confirm(`Delete "${f.filename}"?`)) return;
    this.http.delete(`/api/files/${f.id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.load(), error: () => this.error = 'Delete failed.' });
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }

  iconFor(contentType: string): string {
    if (contentType?.startsWith('image/')) return 'image';
    if (contentType?.startsWith('video/')) return 'videocam';
    if (contentType?.startsWith('audio/')) return 'audio_file';
    if (contentType?.includes('pdf'))      return 'picture_as_pdf';
    if (contentType?.includes('zip') || contentType?.includes('tar')) return 'folder_zip';
    return 'insert_drive_file';
  }
}
