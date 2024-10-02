import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-room-unavailable-dialog',
    templateUrl: './room-unavailable-dialog.component.html',
    styleUrls: ['./room-unavailable-dialog.component.scss'],
})
export class RoomUnavailableDialogComponent {
    constructor(public dialogRef: MatDialogRef<RoomUnavailableDialogComponent>) {}
}
