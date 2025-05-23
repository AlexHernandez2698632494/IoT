import { Component, OnInit, HostListener, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { SideComponent } from '../../side/side.component';
import { BottomTabComponent } from '../../bottom-tab/bottom-tab.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin/admin.service';
import Swal from 'sweetalert2';  // Importar SweetAlert2
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { EditServiceDialogComponent } from '../../../modals/edit-service-dialog/edit-service-dialog.component';

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SideComponent,
    BottomTabComponent,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDividerModule,
  ],
  templateUrl: './index.component.html',
  styleUrl: './index.component.css'
})
export class IndexServiceComponent implements OnInit {
  isLargeScreen: boolean = window.innerWidth > 1024;
  @Output() bodySizeChange = new EventEmitter<boolean>();
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.isLargeScreen = window.innerWidth > 1024;
  }

  isSidebarCollapsed = true
  onSideNavToggle(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }
  constructor(
    private adminService: AdminService,
    private router: Router,
    private dialog: MatDialog // Inyectar MatDialog
  ) { }
  ngOnInit() {
    this.loadServices();
  }

  // Carga los usuarios desde el servicio
  loadServices() {
    const token = sessionStorage.getItem('token');  // Recuperamos el token desde sessionStorage

    if (!token) {
      // Mostrar una alerta si no se encuentra el token
      Swal.fire({
        icon: 'error',
        title: 'No se encuentra el token',
        text: 'Por favor, inicie sesión nuevamente.',
      }).then(() => {
        // Opcional: Redirigir al usuario a la página de login
        this.router.navigate(['/login']);
      });
      return;  // No continuar si no hay token
    }
  }

  editService() {
    const dialogRef = this.dialog.open(EditServiceDialogComponent, {
      width: '400px',
    });
  }  

  deleteService() {
      // Mostrar un cuadro de confirmación con el nombre del usuario
      Swal.fire({
        title: '¿Estás seguro?',
        text: `¿Estás seguro que deseas eliminar el servicio?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminarlo!',
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire('Eliminado!', `El servicio ha sido eliminado correctamente.`, 'success');
        }
      });
    }
}
