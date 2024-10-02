import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-all-players-left-dialog',
    templateUrl: './all-players-left-dialog.component.html',
    styleUrls: ['./all-players-left-dialog.component.scss'],
})
export class AllPlayersLeftDialogComponent {
    constructor(public dialogRef: MatDialogRef<AllPlayersLeftDialogComponent>) {}
}
