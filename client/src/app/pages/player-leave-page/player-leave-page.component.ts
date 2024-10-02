import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService } from '@app/services/dialog.service';
import { RoomsService } from '@app/services/rooms.service';
import { SocketClientService } from '@app/services/socket-service.service';

@Component({
    selector: 'app-player-leave',
    templateUrl: './player-leave-page.component.html',
    styleUrls: ['./player-leave-page.component.scss'],
})
export class PlayerLeaveComponent {
    // We need all these services
    // eslint-disable-next-line max-params
    constructor(
        private dialogService: DialogService,
        private router: Router,
        private socketService: SocketClientService,
        private roomService: RoomsService,
    ) {}

    noLeave() {
        this.dialogService.closeDialog();
    }

    yesLeave() {
        this.socketService.disconnect();
        this.router.navigate(['/']);
        this.socketService.connect();
        this.socketService.leaveRoom(this.roomService.getRoomCode());
        this.dialogService.closeDialog();
    }
}
