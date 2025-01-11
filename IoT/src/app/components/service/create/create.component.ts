import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from '../../nav/nav.component';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

@Component({
  selector: 'app-create',
  imports: [
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    CommonModule,
    RouterOutlet,
    NavComponent,
    MatButtonModule
  ],
  templateUrl: './create.component.html',
  styleUrl: './create.component.css'
})
export class CreateServiceComponent {

  serviceForm: FormGroup;
  constructor(    private router: Router,
    private fb: FormBuilder,){
      this.serviceForm = this.fb.group({
        apiKey: ['', [Validators.required]],
        tipoEntidad: ['', [Validators.required]],
        path: ['', [Validators.required, Validators.email]],
      });
    }
    onBackClick(): void {
      // Regresar a la vista de administrador
      this.router.navigate(['/admin/index']);
    }
}
