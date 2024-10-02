import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FIVE_SECONDS } from '@app/constants/time';
import { Quiz } from '@app/interfaces/quiz';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { TimeService } from '@app/services/time.service';

@Component({
    selector: 'app-room-waiting-countdown',
    templateUrl: './room-waiting-countdown.component.html',
    styleUrls: ['./room-waiting-countdown.component.scss'],
})
export class RoomWaitingCountdownComponent {
    quizId: string;
    quizData: Quiz[];
    quizTitle: string;

    // We need all these services
    // eslint-disable-next-line max-params
    constructor(
        public dialogRef: MatDialogRef<RoomWaitingCountdownComponent>,
        protected timeService: TimeService,
        private quizzesRequestService: QuizzesRequestService,
        @Inject(MAT_DIALOG_DATA) public data: { quizId: string },
    ) {
        this.quizId = data.quizId;

        this.quizzesRequestService.getQuiz(this.quizId).subscribe((quiz) => {
            if (quiz) {
                this.quizData = [quiz];
                this.quizTitle = this.quizData[0].title;
            }
        });

        this.timeService.startTimer(FIVE_SECONDS);
        this.timeService.timerExpired.subscribe(() => {
            this.dialogRef.close();
        });
    }
}
