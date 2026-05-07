import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Location {
  id: string;
  name: string;
  description: string;
  category: string;
  lat: number;
  lng: number;
}

export interface Favourite {
  id: string;
  name: string;
  locationId: string;
  userId: string;
}

export interface UserInfo {
  username: string;
  email: string;
  name: string;
  preferred_username?: string;
  roles?: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getLocations(): Observable<Location[]> {
    return this.http.get<Location[]>('/api/locations');
  }

  getFavourites(): Observable<Favourite[]> {
    return this.http.get<Favourite[]>('/api/favourites');
  }

  addFavourite(locationId: string, name: string): Observable<Favourite> {
    return this.http.post<Favourite>('/api/favourites', { locationId, name });
  }

  removeFavourite(id: string): Observable<void> {
    return this.http.delete<void>(`/api/favourites/${id}`);
  }

  getUserInfo(): Observable<UserInfo> {
    return this.http.get<UserInfo>('/api/user/info');
  }
}
