import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-removed-lobby-dialog',
    templateUrl: './removed-lobby-dialog.component.html',
    styleUrls: ['./removed-lobby-dialog.component.scss'],
})
export class RemovedLobbyDialogComponent {
    constructor(public dialogRef: MatDialogRef<RemovedLobbyDialogComponent>) {}
}
