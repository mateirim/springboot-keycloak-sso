import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { ApiService } from '../api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class InfoComponent implements OnInit, OnDestroy {
  userInfo: any = null;
  loading = true;
  error = false;
  
  private destroy$ = new Subject<void>();

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getUserInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.userInfo = data; this.loading = false; },
        error: () => { this.error = true; this.loading = false; }
      });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
