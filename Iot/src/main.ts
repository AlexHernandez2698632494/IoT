import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http'; // Asegúrate de que esta línea esté presente
import { HomeComponent } from './app/components/home/home.component';
import { PruebaComponent } from './app/components/prueba/prueba.component';
import { LoginComponent } from './app/components/login/login.component';
import { ForgotComponent } from './app/components/forgot/forgot.component';
import { CreateAdminComponent } from './app/components/admin/create/create.component';
import { IndexAdminComponent } from './app/components/admin/index/index.component';
import { IndexEAdminComponent } from './app/components/admin/index-e/index-e.component';
import { CreateSensorsComponent } from './app/components/sensors/create/create.component';
import { IndexSensorsComponent } from './app/components/sensors/index/index.component';
import { IndexESensorsComponent } from './app/components/sensors/index-e/index-e.component';
import { IndexSessionComponent } from './app/components/session/index/index.component';
import { IndexESessionComponent } from './app/components/session/index-e/index-e.component';
import { IndexUsersComponent } from './app/components/users/index/index.component';
import { ChangePasswordComponent } from './app/components/change-password/change-password.component';
import { IndexRoleComponent } from './app/components/users/index-role/index-role.component';
import { CreateRoleComponent } from './app/components/users/create-role/create-role.component';
import { IndexDeleteRoleComponent } from './app/components/users/index-delete-role/index-delete-role.component';

const routes: Routes = [
  { path: '', redirectTo: '/Home', pathMatch: 'full' },
  { path: 'Home', component: HomeComponent },
  { path: 'prueba', component: PruebaComponent },
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LoginComponent },
  { path: 'recuperarView', component: ForgotComponent},
  // rutas de Admin:
  { path: 'admin/create', component: CreateAdminComponent }, 
  { path: 'admin/index', component: IndexAdminComponent },
  { path: 'admin/indexE', component: IndexEAdminComponent },
  // rutas de Sensores:
  { path: 'sensors/create', component: CreateSensorsComponent },
  { path: 'sensors/index', component: IndexSensorsComponent },
  { path: 'sensors/indexE', component: IndexESensorsComponent },
  // rutas de Sesiones:
  { path: 'sessions/index', component: IndexSessionComponent },
  { path: 'sessions/indexE', component: IndexESessionComponent },
  // rutas de usuarios:
  { path: 'users/index', component: IndexUsersComponent },
  { path: 'users/cambiarContra', component: ChangePasswordComponent },
  { path: 'users/roles', component: IndexRoleComponent },
  { path: 'users/rol', component: CreateRoleComponent },
  { path: 'users/role/restore',component:IndexDeleteRoleComponent}
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes), // Proveer las rutas al enrutador
    provideHttpClient() // Agrega esta línea para asegurar que HttpClient esté disponible
  ],
}).catch((err) => console.error(err));
