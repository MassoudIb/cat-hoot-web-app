import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PlayerChatComponent } from '@app/components/player-chat/player-chat.component';
import { PlayerHeaderComponent } from '@app/components/player-header/player-header.component';
import { PlayerQuestionTestComponent } from '@app/components/player-question-test/player-question-test.component';
import { PlayerQuestionComponent } from '@app/components/player-question/player-question.component';
import { PlayerScoreboardComponent } from '@app/components/player-scoreboard/player-scoreboard.component';
import { AppRoutingModule } from '@app/modules/app-routing.module';
import { AppMaterialModule } from '@app/modules/material.module';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { AppComponent } from '@app/pages/app/app.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { PlayerPageComponent } from '@app/pages/player-page/player-page.component';
import { AllPlayersLeftDialogComponent } from './components/all-players-left-dialog/all-players-left-dialog.component';
import { FileUploaderComponent } from './components/file-uploader/file-uploader.component';
import { GameBankComponent } from './components/game-bank/game-bank.component';
import { HistogramComponent } from './components/histogram/histogram.component';
import { KickedPlayerDialogComponent } from './components/kicked-player-dialog/kicked-player-dialog.component';
import { ListPlayerResultComponent } from './components/list-player-result/list-player-result.component';
import { PlayerQuestionRandomComponent } from './components/player-question-random/player-question-random.component';
import { QrlCorrectionDialogComponent } from './components/qrl-correction-dialog/qrl-correction-dialog.component';
import { QuestionBankModalComponent } from './components/question-bank-modal/question-bank-modal.component';
import { RemovedLobbyDialogComponent } from './components/removed-lobby-dialog/removed-lobby-dialog.component';
import { RoomCodeDialogComponent } from './components/room-code-dialog/room-code-dialog.component';
import { RoomNextQuestionDialogComponent } from './components/room-next-question-dialog/room-next-question-dialog.component';
import { RoomUnavailableDialogComponent } from './components/room-unavailable-dialog/room-unavailable-dialog.component';
import { RoomWaitingCountdownComponent } from './components/room-waiting-countdown/room-waiting-countdown.component';
import { UnavailableQuizComponent } from './components/unavailable-quiz/unavailable-quiz.component';
import { CreateGamePageComponent } from './pages/create-game-page/create-game-page.component';
import { CreateQuizPageComponent } from './pages/create-quiz-page/create-quiz-page.component';
import { HostPageComponent } from './pages/host-page/host-page.component';
import { OrganizerWaitingPageComponent } from './pages/organizer-waiting-page/organizer-waiting-page.component';
import { PlayerLeaveComponent } from './pages/player-leave-page/player-leave-page.component';
import { QuestionBankPageComponent } from './pages/question-bank-page/question-bank-page.component';
import { ResultsGamePageComponent } from './pages/results-game-page/results-game-page.component';
import { WaitingPageComponent } from './pages/waiting-page/waiting-page.component';
import { HistoryPageComponent } from './pages/history-page/history-page.component';

/**
 * Main module that is used in main.ts.
 * All automatically generated components will appear in this module.
 * Please do not move this module in the module folder.
 * Otherwise Angular Cli will not know in which module to put new component
 */
@NgModule({
    declarations: [
        AppComponent,
        MainPageComponent,
        PlayerPageComponent,
        PlayerHeaderComponent,
        PlayerChatComponent,
        PlayerQuestionComponent,
        PlayerScoreboardComponent,
        CreateGamePageComponent,
        GameBankComponent,
        WaitingPageComponent,
        AdminPageComponent,
        QuestionBankPageComponent,
        CreateQuizPageComponent,
        FileUploaderComponent,
        QuestionBankModalComponent,
        HostPageComponent,
        UnavailableQuizComponent,
        OrganizerWaitingPageComponent,
        RoomCodeDialogComponent,
        RoomWaitingCountdownComponent,
        PlayerQuestionTestComponent,
        KickedPlayerDialogComponent,
        RemovedLobbyDialogComponent,
        ResultsGamePageComponent,
        ListPlayerResultComponent,
        PlayerLeaveComponent,
        RoomNextQuestionDialogComponent,
        HistogramComponent,
        AllPlayersLeftDialogComponent,
        RoomUnavailableDialogComponent,
        QrlCorrectionDialogComponent,
        PlayerQuestionRandomComponent,
        HistoryPageComponent,
    ],
    imports: [AppMaterialModule, AppRoutingModule, BrowserAnimationsModule, BrowserModule, FormsModule, HttpClientModule, ReactiveFormsModule],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
