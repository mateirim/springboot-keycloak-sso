import { Component, OnInit, HostBinding } from '@angular/core';
import { ApiService } from './api.service';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  username = '';
  @HostBinding('attr.data-theme') theme = 'dark';

  constructor(private api: ApiService, private themeService: ThemeService) {}

  ngOnInit() {
    this.api.getUserInfo().subscribe(user => {
      this.username = user.name || user.preferred_username || user.username || 'User';
    });

    this.themeService.isDark$.subscribe(dark => {
      this.theme = dark ? 'dark' : 'light';
      document.body.setAttribute('data-theme', this.theme);
    });
  }
}
