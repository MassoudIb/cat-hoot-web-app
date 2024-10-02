import { TestBed } from '@angular/core/testing';
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
import { CreateQuizPageComponent } from '@app/pages/create-quiz-page/create-quiz-page.component';
import { HistoryPageComponent } from '@app/pages/history-page/history-page.component';
import { PlayerLeaveComponent } from '@app/pages/player-leave-page/player-leave-page.component';
import { QuestionBankPageComponent } from '@app/pages/question-bank-page/question-bank-page.component';
import { DialogService } from './dialog.service';

const apiQuiz = {
    id: '1',
    title: 'Quiz 1',
    description: 'Test quiz 1',
    duration: 10,
    isVisible: true,
    lastModification: '2024-01-30',
    questions: [],
};

describe('DialogService', () => {
    let service: DialogService;
    let dialogSpy: jasmine.SpyObj<MatDialog>;

    beforeEach(() => {
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open', 'closeAll']);
        TestBed.configureTestingModule({
            providers: [DialogService, { provide: MatDialog, useValue: dialogSpy }],
        });
        service = TestBed.inject(DialogService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should open the QuestionBankPageComponent dialog with width and height set to 80%', () => {
        service.openQuestionBankDialog();
        expect(dialogSpy.open).toHaveBeenCalledWith(QuestionBankPageComponent, {
            width: '50%',
            height: '80%',
        });
    });
    it('should should open the CreateQuizPageComponent dialog with width and height set to 80% ', () => {
        service.openCreateQuizDialog();
        expect(dialogSpy.open).toHaveBeenCalledWith(CreateQuizPageComponent, {
            width: '80%',
            height: '80%',
        });
    });
    it('should should open the CreateQuizPageComponent dialog with width and height set to 80% ', () => {
        service.openCreateQuizDialog();
        expect(dialogSpy.open).toHaveBeenCalledWith(CreateQuizPageComponent, {
            width: '80%',
            height: '80%',
        });
    });

    it('should should open the CreateQuizPageComponent dialog with width and height set to 80% and injected data ', () => {
        service.modifyQuiz(apiQuiz);
        expect(dialogSpy.open).toHaveBeenCalledWith(CreateQuizPageComponent, {
            width: '80%',
            height: '80%',
            data: { quiz: apiQuiz },
        });
    });

    it('should should open the UnavailableQuizComponent dialog with width set to 30% and height set to 15% ', () => {
        service.openUnavailableQuizDialog();
        expect(dialogSpy.open).toHaveBeenCalledWith(UnavailableQuizComponent, {
            width: '30%',
            height: '15%',
        });
    });

    it('should should open the RoomCodeDialogComponent dialog with width set to 20% and height set to 25%', () => {
        service.openRoomCodeDialog();
        expect(dialogSpy.open).toHaveBeenCalledWith(RoomCodeDialogComponent, {
            width: '20%',
            height: '25%',
        });
    });

    it('should should open the KickedPlayerDialogComponent dialog with width and height set to 20%', () => {
        service.openKickedPlayerDialog();
        expect(dialogSpy.open).toHaveBeenCalledWith(KickedPlayerDialogComponent, {
            width: '20%',
            height: '20%',
        });
    });

    it('should should open the RemovedLobbyDialogComponent dialog with width and height set to 20%', () => {
        service.openRemovedLobbyDialog();
        expect(dialogSpy.open).toHaveBeenCalledWith(RemovedLobbyDialogComponent, {
            width: '20%',
            height: '20%',
        });
    });

    it('should should open the PlayerLeaveComponent dialog with width and height set to 20%', () => {
        service.openLeaveGame();
        expect(dialogSpy.open).toHaveBeenCalledWith(PlayerLeaveComponent, {
            width: '20%',
            height: '20%',
        });
    });

    it('should should open the AllPlayersLeftDialogComponent dialog with width and height set to 20%', () => {
        service.openAllPlayersLeft();
        expect(dialogSpy.open).toHaveBeenCalledWith(AllPlayersLeftDialogComponent, {
            width: '20%',
            height: '20%',
        });
    });

    it('should should open the RoomWaitingCountdownComponent dialog with width set to 30 % and height set to 25% and injected data ', () => {
        service.openCountdownDialog(apiQuiz.id);
        expect(dialogSpy.open).toHaveBeenCalledWith(RoomWaitingCountdownComponent, {
            data: Object({ quizId: apiQuiz.id }),
            width: '30%',
            height: '25%',
            disableClose: true,
        });
    });

    it('should should open the RoomNextQuestionDialogComponent dialog with width set to 30 % and height set to 25%', () => {
        service.openNextQuestionDialog();
        expect(dialogSpy.open).toHaveBeenCalledWith(RoomNextQuestionDialogComponent, {
            width: '30%',
            height: '25%',
            disableClose: true,
        });
    });

    it('should should open the openCorrectionDialog dialog with width and height set to 70%', () => {
        service.openCorrectionDialog([], '', 0);
        expect(dialogSpy.open).toHaveBeenCalledWith(QrlCorrectionDialogComponent, {
            data: { dialogAnswerList: [], title: '', index: 0 },
            width: '70%',
            height: '70%',
            disableClose: true,
        });
    });

    it('should should open the RoomUnavailableDialogComponent dialog with width and height set to 20%', () => {
        service.openUnavailableGame();
        expect(dialogSpy.open).toHaveBeenCalledWith(RoomUnavailableDialogComponent, {
            width: '20%',
            height: '20%',
        });
    });

    it('should should open the HistoryPageComponent dialog with width and height set to 50%', () => {
        service.openHistoryDialog();
        expect(dialogSpy.open).toHaveBeenCalledWith(HistoryPageComponent, {
            width: '65%',
            height: '65%',
        });
    });

    it('should close all dialogs the dialog ', () => {
        service.closeDialog();
        expect(dialogSpy.closeAll).toHaveBeenCalled();
    });
});
