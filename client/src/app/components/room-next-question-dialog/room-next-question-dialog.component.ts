import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { THREE_SECONDS } from '@app/constants/time';
import { TimeService } from '@app/services/time.service';

@Component({
    selector: 'app-room-next-question-dialog',
    templateUrl: './room-next-question-dialog.component.html',
    styleUrls: ['./room-next-question-dialog.component.scss'],
})
export class RoomNextQuestionDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<RoomNextQuestionDialogComponent>,
        protected timeService: TimeService,
    ) {
        this.timeService.startTimer(THREE_SECONDS);
        this.timeService.timerExpired.subscribe(() => {
            this.dialogRef.close();
        });
    }
}
