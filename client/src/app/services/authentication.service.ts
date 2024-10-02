import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

@Injectable({
    providedIn: 'root',
})
export class AuthenticationService {
    constructor(private http: HttpClient) {}

    verifyPassword(password: string): Observable<boolean> {
        return this.http.post<boolean>(environment.passwordUrl, { password });
    }
}
