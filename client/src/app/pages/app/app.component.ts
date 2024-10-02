import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SocketClientService } from '@app/services/socket-service.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
    constructor(
        public socketService: SocketClientService,
        private router: Router,
    ) {}

    get socketId() {
        return this.socketService.socket.id ? this.socketService.socket.id : '';
    }

    ngOnInit(): void {
        this.connect();
        if (sessionStorage.getItem('navigating') === 'false') {
            sessionStorage.removeItem('navigating');
            this.router.navigate(['/home']);
        }
    }

    connect() {
        if (!this.socketService.isSocketAlive()) {
            this.socketService.connect();
        }
    }
}
