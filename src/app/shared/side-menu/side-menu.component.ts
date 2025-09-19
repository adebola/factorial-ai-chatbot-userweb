import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  active: boolean;
}

@Component({
  selector: 'app-side-menu',
  imports: [CommonModule, RouterModule],
  templateUrl: './side-menu.component.html',
  styleUrl: './side-menu.component.scss'
})
export class SideMenuComponent implements OnInit {

  isCollapsed = false;
  isMobile = false;
  currentUser: any = null;

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      active: false
    },
    {
      label: 'Documents',
      icon: 'description',
      route: '/documents',
      active: false
    },
    {
      label: 'Categories',
      icon: 'category',
      route: '/categories',
      active: false
    },
    {
      label: 'Websites',
      icon: 'web',
      route: '/websites',
      active: false
    },
    {
      label: 'Messages',
      icon: 'chat',
      route: '/messages',
      active: false
    },
    {
      label: 'Settings',
      icon: 'settings',
      route: '/settings',
      active: false
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.checkScreenSize();
  }

  ngOnInit(): void {
    // Listen to route changes to update active menu item
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateActiveMenuItem(event.url);
      });

    // Set initial active item
    this.updateActiveMenuItem(this.router.url);

    // Listen for window resize
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.isCollapsed = true;
    }
  }

  private updateActiveMenuItem(url: string): void {
    this.menuItems.forEach(item => {
      item.active = url.startsWith(item.route);
    });
  }

  toggleMenu(): void {
    this.isCollapsed = !this.isCollapsed;
    // Force a reflow to ensure CSS transitions work properly
    setTimeout(() => {
      // This empty timeout forces the browser to process the class change
      // before applying the transition
    }, 10);
  }

  navigateToItem(item: MenuItem): void {
    this.router.navigate([item.route]);

    // Close menu on mobile after navigation
    if (this.isMobile) {
      this.isCollapsed = true;
    }
  }

  logout(): void {
    this.authService.logout(true); // User explicitly clicked logout
    // Navigation is now handled by the auth service redirecting to auth server
  }

  // Close menu when clicking outside on mobile
  onBackdropClick(): void {
    if (this.isMobile && !this.isCollapsed) {
      this.isCollapsed = true;
    }
  }
}
