import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PERCENTAGE_50 } from '@app/constants/player-question';
import { FIFTY_PERCENT, ONE_HUNDRED_PERCENT } from '@app/constants/results-game';
import { SocketEvent } from '@app/constants/socket-event';
import { DataQrlCorrection, ListOfQrlAnswer } from '@app/interfaces/list-qrl-answer';
import { RoomsService } from '@app/services/rooms.service';
import { SocketClientService } from '@app/services/socket-service.service';
@Component({
    selector: 'app-qrl-correction-dialog',
    templateUrl: './qrl-correction-dialog.component.html',
    styleUrls: ['./qrl-correction-dialog.component.scss'],
})
export class QrlCorrectionDialogComponent implements OnInit {
    listOfAnswer: ListOfQrlAnswer[];
    dataCorrection: DataQrlCorrection = { questionIndex: 0, questionTitle: '', amount0: 0, amount50: 0, amount100: 0 };
    currentAnswerIndex = 0;
    currentAnswer: ListOfQrlAnswer;
    currentScore: number = 0;
    questionTitle: string;
    questionIndex: number;
    amount0: number = 0;
    amount50: number = 0;
    amount100: number = 0;
    // We need all these services
    // eslint-disable-next-line max-params
    constructor(
        public dialogRef: MatDialogRef<QrlCorrectionDialogComponent>,
        private socketService: SocketClientService,
        private roomService: RoomsService,
        @Inject(MAT_DIALOG_DATA) public data: { dialogAnswerList: ListOfQrlAnswer[]; title: string; index: number },
    ) {
        this.listOfAnswer = data.dialogAnswerList;
        this.questionTitle = data.title;
        this.questionIndex = data.index;
    }

    ngOnInit(): void {
        this.configureBaseSocketFeatures();
        this.currentAnswer = this.listOfAnswer[this.currentAnswerIndex];
        this.dataCorrection.questionTitle = this.questionTitle;
        this.dataCorrection.questionIndex = this.questionIndex;
    }

    configureBaseSocketFeatures() {
        this.socketService.on(SocketEvent.KICK_ORGANIZER, () => {
            this.dialogRef.close();
        });
    }

    nextAnswer(): void {
        this.currentAnswerIndex += 1;
        this.currentAnswer = this.listOfAnswer[this.currentAnswerIndex];
    }

    incrementZero() {
        this.currentScore = 0;
    }

    increment50() {
        this.currentScore = this.currentAnswer.point * PERCENTAGE_50;
    }

    increment100() {
        this.currentScore = this.currentAnswer.point;
    }

    searchPercentageIncrementation(score: number) {
        const percentage = (score / this.currentAnswer.point) * ONE_HUNDRED_PERCENT;
        switch (percentage) {
            case 0: {
                this.amount0++;
                break;
            }
            case FIFTY_PERCENT: {
                this.amount50++;
                break;
            }
            case ONE_HUNDRED_PERCENT: {
                this.amount100++;
                break;
            }
        }
    }

    submitCorrection() {
        this.searchPercentageIncrementation(this.currentScore);
        this.dataCorrection.amount0 = this.amount0;
        this.dataCorrection.amount50 = this.amount50;
        this.dataCorrection.amount100 = this.amount100;

        this.currentAnswer.score = this.currentScore;
        this.currentScore = 0;
        this.currentAnswerIndex += 1;
        if (this.currentAnswerIndex === this.listOfAnswer.length) {
            this.dialogRef.close();
            this.socketService.sendScoreQrlToClient(this.roomService.getRoomCode(), this.listOfAnswer);
            this.socketService.sendDataCorrectionQrlToServer(this.roomService.getRoomCode(), this.dataCorrection);
        } else {
            this.currentAnswer = this.listOfAnswer[this.currentAnswerIndex];
        }
    }
}
