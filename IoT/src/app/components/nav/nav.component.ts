import { Component, HostListener, Output, EventEmitter } from '@angular/core';
import { SideComponent } from '../side/side.component';
import { BottomTabComponent } from '../bottom-tab/bottom-tab.component';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [SideComponent, BottomTabComponent, CommonModule],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent {
  isLargeScreen: boolean = window.innerWidth > 1024;
  @Output() bodySizeChange = new EventEmitter<boolean>();
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.isLargeScreen = window.innerWidth > 1024;
  }
}
