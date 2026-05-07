import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService, Location, Favourite } from '../api.service';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import * as maplibregl from 'maplibre-gl';

@Component({
  selector: 'app-creator',
  template: `
    <div class="map-page-layout">
      <div class="map-sidebar glass">
        <div class="sidebar-header">
          <h3>
            <span class="accent">★</span> Favourites
            <span class="fav-count" *ngIf="favourites.length > 0">{{ favourites.length }}</span>
          </h3>
          <button mat-icon-button (click)="resetFavourites()" matTooltip="Clear all" *ngIf="favourites.length > 0">
            <mat-icon>delete_sweep</mat-icon>
          </button>
        </div>

        <div class="fav-list">
          <div *ngFor="let fav of favourites" class="fav-item" (click)="flyTo(fav)">
            <div class="fav-item-left">
              <div class="fav-star-icon">★</div>
              <div class="fav-info">
                <span class="fav-name">{{ fav.name }}</span>
                <span class="fav-category">{{ getCategoryForFav(fav) || 'Location' }}</span>
              </div>
            </div>
            <div class="fav-actions">
              <button mat-icon-button class="fly-btn" matTooltip="Fly to" (click)="flyTo(fav); $event.stopPropagation()">
                <mat-icon>my_location</mat-icon>
              </button>
              <button mat-icon-button class="remove-btn" matTooltip="Remove" (click)="removeFavourite(fav.id, $event)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <div *ngIf="favourites.length === 0" class="empty-fav">
            <div class="empty-fav-icon">
              <mat-icon>star_border</mat-icon>
            </div>
            <p>No favourites yet.<br><strong>Click a pin</strong> on the map to add locations.</p>
          </div>
        </div>
      </div>

      <div class="map-container-wrap">
        <div id="map" class="map-canvas"></div>
        <div class="map-controls glass">
          <mat-form-field appearance="outline" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput (keyup)="onFilterChange($any($event.target).value)" placeholder="Search locations...">
          </mat-form-field>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-page-layout { display: flex; height: calc(100vh - 120px); gap: 1rem; }

    /* ── Sidebar ── */
    .map-sidebar {
      width: 320px; display: flex; flex-direction: column; padding: 1.25rem;
      border-radius: 20px; overflow: hidden;
      background: var(--bg-surface);
      border: 1px solid var(--border);
    }
    .sidebar-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1rem; padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
      h3 { margin: 0; font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 6px; color: var(--text-primary); }
    }
    .fav-count {
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; background: #6DB33F; color: white;
      border-radius: 50%; font-size: 0.7rem; font-weight: 800;
    }
    .accent { color: #6DB33F; }

    .fav-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-right: 2px; }

    .fav-item {
      padding: 0.75rem 0.875rem; border-radius: 12px;
      display: flex; justify-content: space-between; align-items: center;
      cursor: pointer; transition: all 0.18s ease;
      background: var(--hover-bg);
      border: 1px solid var(--border-subtle);
    }
    .fav-item:hover { background: rgba(109,179,63,0.1); border-color: #6DB33F; transform: translateX(2px); }
    .fav-item-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .fav-star-icon {
      width: 32px; height: 32px; flex-shrink: 0;
      background: rgba(245,158,11,0.15); border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #f59e0b; font-size: 16px;
    }
    .fav-info { display: flex; flex-direction: column; min-width: 0; }
    .fav-name { font-weight: 700; color: var(--text-primary); font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fav-category { font-size: 0.75rem; color: var(--text-secondary); margin-top: 1px; }
    .fav-actions { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
    .fly-btn { color: #6DB33F !important; }
    .remove-btn { color: rgba(239,68,68,0.6) !important; }
    .remove-btn:hover { color: #ef4444 !important; }

    .empty-fav {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      flex: 1; padding: 2rem 1rem; text-align: center; gap: 1rem;
    }
    .empty-fav-icon {
      width: 64px; height: 64px;
      background: rgba(109,179,63,0.08); border-radius: 20px;
      display: flex; align-items: center; justify-content: center;
      color: rgba(109,179,63,0.4); font-size: 2rem;
    }
    .empty-fav p { margin: 0; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.5; }
    .empty-fav strong { color: #6DB33F; }

    /* ── Map ── */
    .map-container-wrap { flex: 1; position: relative; border-radius: 20px; overflow: hidden; border: 1px solid var(--border); }
    .map-canvas { width: 100%; height: 100%; }
    .map-controls { 
      position: absolute; top: 1rem; left: 1rem; padding: 0.4rem 0.75rem; border-radius: 12px; width: 280px; z-index: 10; 
      background: var(--bg-glass); border: 1px solid var(--border); backdrop-filter: blur(8px);
    }
    .search-field { 
      width: 100%; 
      input { color: var(--text-primary) !important; }
      ::placeholder { color: var(--text-secondary) !important; }
    }
    ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    /* ── SVG Markers (injected into DOM via innerHTML) ── */
    ::ng-deep .map-pin-wrap {
      cursor: pointer; transition: transform 0.15s ease; transform-origin: bottom center;
    }
    ::ng-deep .map-pin-wrap:hover { transform: scale(1.25) translateY(-2px); }
    ::ng-deep .map-pin-wrap svg { display: block; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45)); }
  `]
})
export class CreatorComponent implements OnInit, OnDestroy {
  private map!: maplibregl.Map;
  private markers: maplibregl.Marker[] = [];
  private locations: Location[] = [];
  public favourites: Favourite[] = [];
  private destroy$ = new Subject<void>();
  filterValue = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [0, 20],
      zoom: 1.5
    });
    this.map.addControl(new maplibregl.NavigationControl());
    this.loadData();
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); this.map?.remove(); }

  loadData() {
    this.api.getLocations().pipe(
      takeUntil(this.destroy$),
      switchMap(locs => { this.locations = locs; return this.api.getFavourites(); })
    ).subscribe(favs => {
      this.favourites = favs;
      this.renderMarkers();
    });
  }

  renderMarkers() {
    this.markers.forEach(m => m.remove());
    this.markers = [];

    const filtered = this.locations.filter(l => 
      l.name.toLowerCase().includes(this.filterValue) || 
      l.category?.toLowerCase().includes(this.filterValue)
    );

    for (const loc of filtered) {
      const isFav = this.favourites.some(f => f.locationId === loc.id);
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = isFav
        ? `<div class="map-pin-wrap">
            <svg width="28" height="38" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0 C5.373 0 0 5.373 0 12 c0 9 12 20 12 20 S24 21 24 12 C24 5.373 18.627 0 12 0 Z" fill="#f59e0b"/>
              <text x="12" y="15" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="white">★</text>
            </svg>
           </div>`
        : `<div class="map-pin-wrap">
            <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0 C5.373 0 0 5.373 0 12 c0 9 12 20 12 20 S24 21 24 12 C24 5.373 18.627 0 12 0 Z" fill="#6DB33F"/>
              <circle cx="12" cy="11" r="4" fill="white" opacity="0.9"/>
            </svg>
           </div>`;
      
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div class="map-popup">
          <h3 style="color: #1e293b; margin: 0 0 4px;">${loc.name}</h3>
          <p style="color: #64748b; font-size: 0.8rem; margin: 0 0 12px;">${loc.category || 'Point of Interest'}</p>
          <button class="popup-btn-fav" data-id="${loc.id}" data-name="${loc.name}" style="
            background: ${isFav ? '#ef4444' : '#6DB33F'};
            color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-weight: 700; width: 100%;
          ">
            ${isFav ? '★ Unfavourite' : '☆ Favourite'}
          </button>
        </div>
      `);

      popup.on('open', () => {
        const btn = document.querySelector(`.popup-btn-fav[data-id="${loc.id}"]`) as HTMLButtonElement;
        if (btn) {
          btn.onclick = () => {
            this.toggleFavourite(loc.id, loc.name);
            popup.remove();
          };
        }
      });

      const marker = new maplibregl.Marker(el).setLngLat([loc.lng, loc.lat]).setPopup(popup).addTo(this.map);
      this.markers.push(marker);
    }
  }

  toggleFavourite(id: string, name: string) {
    const existing = this.favourites.find(f => f.locationId === id);
    if (existing) {
      this.api.removeFavourite(existing.id).subscribe(() => this.loadData());
    } else {
      this.api.addFavourite(id, name).subscribe(() => this.loadData());
    }
  }

  getCategoryForFav(fav: Favourite): string {
    return this.locations.find(l => l.id === fav.locationId)?.category ?? '';
  }

  flyTo(fav: Favourite) {
    const loc = this.locations.find(l => l.id === fav.locationId);
    if (loc) this.map.flyTo({ center: [loc.lng, loc.lat], zoom: 12 });
  }

  removeFavourite(id: string, event: Event) {
    event.stopPropagation();
    this.api.removeFavourite(id).subscribe(() => this.loadData());
  }

  resetFavourites() {
    if (confirm('Clear all favourites?')) {
      // In a real app we'd have a bulk delete API
      this.favourites.forEach(f => this.api.removeFavourite(f.id).subscribe());
      setTimeout(() => this.loadData(), 500);
    }
  }

  onFilterChange(v: string) {
    this.filterValue = v.toLowerCase();
    this.renderMarkers();
  }
}
