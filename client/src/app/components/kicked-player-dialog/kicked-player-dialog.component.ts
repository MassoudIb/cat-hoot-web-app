import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-kicked-player-dialog',
    templateUrl: './kicked-player-dialog.component.html',
    styleUrls: ['./kicked-player-dialog.component.scss'],
})
export class KickedPlayerDialogComponent {
    constructor(public dialogRef: MatDialogRef<KickedPlayerDialogComponent>) {}
}
