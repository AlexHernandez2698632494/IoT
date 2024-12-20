import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Importar RouterModule
import { HomeComponent } from '../home/home.component';
import { routes } from '../../app.routes';

@Component({
  selector: 'app-side',
  standalone: true,
  imports: [CommonModule, RouterModule], // Incluir RouterModule aquí
  templateUrl: './side.component.html',
  styleUrls: ['./side.component.css'],
})
export class SideComponent {
  isCollapsed = true; // Inicialmente está colapsada (solo íconos)

  menuItemsTop = [
    { icon: 'home', label: 'Home', route: '/', submenu: [], isSubmenuOpen: false },
    { 
      icon: 'add', 
      label: 'Registrar', 
      isSubmenuOpen: false, 
      submenu: [
        { label: 'Registrar Administrador', route: '/admin/create' },
        { label: 'Control Administrador', route: '/admin/index' },
        { label: 'Administradores Eliminados', route: '/admin/indexE' },
      ]
    },
    { 
      icon: 'notifications', 
      label: 'Alertas', 
      isSubmenuOpen: false, 
      submenu: [
        { label: 'Registrar Alertas', route: '/alert/create' },
        { label: 'Control de Alertas', route: '/alert/index' },
        { label: 'Alertas Eliminadas', route: '/alert/indexE' },
      ]
    },
    { 
      icon: 'subscriptions', 
      label: 'Suscripciones', 
      isSubmenuOpen: false, 
      submenu: [
        { label: 'Registrar Suscripciones', route: '/suscription/create' },
        { label: 'Control de Suscripciones', route: '/suscription/index' },
        { label: 'Suscripciones Eliminadas', route: '/suscription/indexE' },
      ]
    },
    { 
      icon: 'apps', 
      label: 'Servicios', 
      isSubmenuOpen: false, 
      submenu: [
        { label: 'Registrar Servicio', route: '/services/create' },
        { label: 'Control de Servicios', route: '/services/index' },
        { label: 'Servicios Eliminados', route: '/services/indexE' },
      ]
    },
    { 
      icon: 'sensors', 
      label: 'Sensores', 
      isSubmenuOpen: false, 
      submenu: [
        { label: 'Registrar Sensor', route: '/sensors/create' },
        { label: 'Control Sensores', route: '/sensors/index' },
        { label: 'Sensores Eliminados', route: '/sensors/indexE' },
      ]
    },
    { 
      icon: 'history', 
      label: 'Ver Historial', 
      isSubmenuOpen: false, 
      submenu: [
        { label: 'Control Sesiones', route: '/sessions/index' },
        { label: 'Sesiones Eliminadas', route: '/sessions/indexE' },
      ]
    },
    { 
      icon: 'people', 
      label: 'Usuarios', 
      isSubmenuOpen: false, 
      submenu: [
        { label: 'Control Usuarios', route: '/users/index' },
      ]
    },
    { icon: 'lock', label: 'Cambiar Contraseña', route: '/users/cambiarContra', submenu: [], isSubmenuOpen: false },
  ];
  
  menuItemsBottom = [
    { icon: 'logout', label: 'Cerrar Sesión', route: '/logout', submenu: [], isSubmenuOpen: false },
  ];

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleSubmenu(item: any) {
    if (item.submenu) {
      // Si el menú está colapsado, expandirlo
      if (this.isCollapsed) {
        this.isCollapsed = false;
      }
  
      // Cerrar todos los submenús de la sección superior, excepto el actual
      this.menuItemsTop.forEach(menuItem => {
        if (menuItem !== item) {
          menuItem.isSubmenuOpen = false;
        }
      });
  
      // Alternar el submenú del elemento actual
      item.isSubmenuOpen = !item.isSubmenuOpen;
    }
  }
}
