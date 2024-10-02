import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { SocketEvent } from '@app/constants/socket-event';
import { RoomsService } from '@app/services/rooms.service';
import { SocketClientService } from '@app/services/socket-service.service';

@Component({
    selector: 'app-room-code-dialog',
    templateUrl: './room-code-dialog.component.html',
    styleUrls: ['./room-code-dialog.component.scss'],
})
export class RoomCodeDialogComponent implements OnInit {
    errorMessage: string = '';
    roomCode: string = '';

    // We need all those services
    // eslint-disable-next-line max-params
    constructor(
        private router: Router,
        public dialogRef: MatDialogRef<RoomCodeDialogComponent>,
        private socketService: SocketClientService,
        private roomsService: RoomsService,
    ) {}

    ngOnInit() {
        this.configureBaseSocketFeatures();
    }

    validateCode(code: string) {
        this.socketService.send(SocketEvent.VALIDATE_CODE, code);
        this.roomCode = code;
    }

    configureBaseSocketFeatures() {
        this.socketService.on(SocketEvent.ROOM_LOCKED, (isRoomLocked: boolean) => {
            if (!isRoomLocked) {
                this.roomsService.setRoomCode(this.roomCode);
                this.router.navigate(['/vueAttente']);
                this.dialogRef.close();
            } else this.errorMessage = 'Cette partie est verrouillée.';
        });
        this.socketService.on('codeValidated', (isCodeValid: boolean) => {
            if (isCodeValid) {
                this.roomsService.setRoomCode(this.roomCode);
                this.router.navigate(['/vueAttente']);
                this.dialogRef.close();
            } else this.errorMessage = 'Ce code est invalide.';
        });
    }
}
