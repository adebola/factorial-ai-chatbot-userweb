import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SideMenuComponent } from '../side-menu/side-menu.component';

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterOutlet, SideMenuComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {

}
