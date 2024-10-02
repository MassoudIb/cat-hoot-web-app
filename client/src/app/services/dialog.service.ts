import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AllPlayersLeftDialogComponent } from '@app/components/all-players-left-dialog/all-players-left-dialog.component';
import { KickedPlayerDialogComponent } from '@app/components/kicked-player-dialog/kicked-player-dialog.component';
import { QrlCorrectionDialogComponent } from '@app/components/qrl-correction-dialog/qrl-correction-dialog.component';
import { RemovedLobbyDialogComponent } from '@app/components/removed-lobby-dialog/removed-lobby-dialog.component';
import { RoomCodeDialogComponent } from '@app/components/room-code-dialog/room-code-dialog.component';
import { RoomNextQuestionDialogComponent } from '@app/components/room-next-question-dialog/room-next-question-dialog.component';
import { RoomUnavailableDialogComponent } from '@app/components/room-unavailable-dialog/room-unavailable-dialog.component';
import { RoomWaitingCountdownComponent } from '@app/components/room-waiting-countdown/room-waiting-countdown.component';
import { UnavailableQuizComponent } from '@app/components/unavailable-quiz/unavailable-quiz.component';
import { ListOfQrlAnswer } from '@app/interfaces/list-qrl-answer';
import { Quiz } from '@app/interfaces/quiz';
import { CreateQuizPageComponent } from '@app/pages/create-quiz-page/create-quiz-page.component';
import { HistoryPageComponent } from '@app/pages/history-page/history-page.component';
import { PlayerLeaveComponent } from '@app/pages/player-leave-page/player-leave-page.component';
import { QuestionBankPageComponent } from '@app/pages/question-bank-page/question-bank-page.component';

@Injectable({
    providedIn: 'root',
})
export class DialogService {
    constructor(private dialogRef: MatDialog) {}

    openQuestionBankDialog() {
        this.dialogRef.open(QuestionBankPageComponent, {
            width: '50%',
            height: '80%',
        });
    }

    openCreateQuizDialog() {
        this.dialogRef.open(CreateQuizPageComponent, {
            width: '80%',
            height: '80%',
        });
    }

    openUnavailableQuizDialog() {
        this.dialogRef.open(UnavailableQuizComponent, {
            width: '30%',
            height: '15%',
        });
    }

    openRoomCodeDialog() {
        this.dialogRef.open(RoomCodeDialogComponent, {
            width: '20%',
            height: '25%',
        });
    }

    openCountdownDialog(quizId: string) {
        this.dialogRef.open(RoomWaitingCountdownComponent, {
            data: { quizId },
            width: '30%',
            height: '25%',
            disableClose: true,
        });
    }

    openCorrectionDialog(answersList: ListOfQrlAnswer[], questionTitle: string, questionIndex: number) {
        this.dialogRef.open(QrlCorrectionDialogComponent, {
            data: { dialogAnswerList: answersList, title: questionTitle, index: questionIndex },
            width: '70%',
            height: '70%',
            disableClose: true,
        });
    }

    openNextQuestionDialog() {
        this.dialogRef.open(RoomNextQuestionDialogComponent, {
            width: '30%',
            height: '25%',
            disableClose: true,
        });
    }

    openKickedPlayerDialog() {
        this.dialogRef.open(KickedPlayerDialogComponent, {
            width: '20%',
            height: '20%',
        });
    }

    openRemovedLobbyDialog() {
        this.dialogRef.open(RemovedLobbyDialogComponent, {
            width: '20%',
            height: '20%',
        });
    }

    modifyQuiz(quiz: Quiz) {
        this.dialogRef.open(CreateQuizPageComponent, {
            width: '80%',
            height: '80%',
            data: { quiz },
        });
    }

    openLeaveGame() {
        this.dialogRef.open(PlayerLeaveComponent, {
            width: '20%',
            height: '20%',
        });
    }

    openAllPlayersLeft() {
        this.dialogRef.open(AllPlayersLeftDialogComponent, {
            width: '20%',
            height: '20%',
        });
    }

    openUnavailableGame() {
        this.dialogRef.open(RoomUnavailableDialogComponent, {
            width: '20%',
            height: '20%',
        });
    }
    openHistoryDialog() {
        this.dialogRef.open(HistoryPageComponent, {
            width: '65%',
            height: '65%',
        });
    }

    closeDialog() {
        this.dialogRef.closeAll();
    }
}
