import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = 'http://192.168.1.82:3000';

  constructor(private http: HttpClient) {}

  // Método para registrar un admin
  registerAdmin(adminData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/user`, adminData);
  }

  // Método para obtener los usuarios con el token en los encabezados
  getUsers(): Observable<any[]> {
    const token = localStorage.getItem('token');  // Recuperamos el token desde localStorage

    if (!token) {
      throw new Error('No se encontró el token en el localStorage');
    }

    // Configuramos los encabezados con el token
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`, // Añadimos el token en el encabezado Authorization
    });

    // Realizamos la solicitud GET con los encabezados configurados
    return this.http.get<any[]>(`${this.apiUrl}/users`, { headers });
  }
  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/roles`);
  }
  
  changePassword(data: { contrasenaActual: string; nuevaContrasena: string }): Observable<any> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No se encontró el token en localStorage');
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.post(`${this.apiUrl}/change-password`, data, { headers });
  }
}
