import { Component, OnInit, OnDestroy, ViewEncapsulation, ViewChild, AfterViewInit } from '@angular/core';
import { ApiService, Location, Favourite } from '../api.service';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class InfoComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;
  
  userInfo: any = null;
  loading = true;
  error = false;
  locations: Location[] = [];
  favourites: Favourite[] = [];
  filterValue = '';
  
  dataSource = new MatTableDataSource<Location>([]);
  locColumns = ['index', 'name', 'category', 'lat', 'lng', 'favorite'];
  
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];
  
  private destroy$ = new Subject<void>();

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getUserInfo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.userInfo = data; this.loading = false; },
        error: () => { this.error = true; this.loading = false; }
      });
    this.loadLocations();
    
    // Custom filter predicate for locations
    this.dataSource.filterPredicate = (data: Location, filter: string) => {
      const q = filter.trim().toLowerCase();
      return data.name.toLowerCase().includes(q) || 
             (data.category?.toLowerCase().includes(q) ?? false);
    };
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  loadLocations() {
    this.api.getLocations().pipe(
      takeUntil(this.destroy$),
      switchMap(locs => { 
        this.locations = locs; 
        this.dataSource.data = locs;
        return this.api.getFavourites(); 
      })
    ).subscribe(favs => this.favourites = favs);
  }

  isFav(loc: Location): boolean {
    return this.favourites.some(f => f.locationId === loc.id);
  }

  toggleFav(loc: Location) {
    const existing = this.favourites.find(f => f.locationId === loc.id);
    if (existing) {
      this.api.removeFavourite(existing.id).subscribe(() => this.loadLocations());
    } else {
      this.api.addFavourite(loc.id, loc.name).subscribe(() => this.loadLocations());
    }
  }

  onFilterChange() {
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
    this.pageIndex = 0;
  }

  get pagedLocations(): Location[] {
    // Start with the filtered data
    let data = [...this.dataSource.filteredData];
    
    // Explicit manual sorting
    const sort = this.sort;
    if (sort && sort.active && sort.direction) {
      const isAsc = sort.direction === 'asc';
      const prop = sort.active;
      
      data.sort((a: any, b: any) => {
        const valA = a[prop];
        const valB = b[prop];
        
        let comparison = 0;
        if (valA > valB) comparison = 1;
        else if (valA < valB) comparison = -1;
        
        return isAsc ? comparison : -comparison;
      });
    }
    
    // Apply pagination
    const start = this.pageIndex * this.pageSize;
    return data.slice(start, start + this.pageSize);
  }

  get totalFiltered(): number { return this.dataSource.filteredData.length; }

  get totalPages(): number { return Math.ceil(this.totalFiltered / this.pageSize); }

  get pageEnd(): number { return Math.min((this.pageIndex + 1) * this.pageSize, this.totalFiltered); }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}

