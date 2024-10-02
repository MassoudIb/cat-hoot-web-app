import { Injectable } from '@angular/core';
import { QuestionType } from '@app/constants/question-type';
import { SocketEvent } from '@app/constants/socket-event';
import { DataQrlCorrection, ListOfQrlAnswer } from '@app/interfaces/list-qrl-answer';
import { Question } from '@app/interfaces/question';
import { Socket, io } from 'socket.io-client';
import { environment } from 'src/environments/environment';

export interface CustomSocket extends Socket {
    roomId?: string;
    isAllowedToChat?: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class SocketClientService {
    socket: CustomSocket;

    isSocketAlive(): boolean {
        return !!this.socket && this.socket.connected;
    }
    getSocket() {
        return this.socket;
    }

    handleChatPrivilege(roomCode: string, username: string, allowToChat: boolean) {
        this.socket.emit(SocketEvent.HANDLE_CHAT_PRIVILEGE, roomCode, username, allowToChat);
    }

    connect(): void {
        this.socket = io(environment.serverUrl, { transports: ['websocket'], upgrade: false });
    }

    disconnect(): void {
        this.socket.disconnect();
    }

    redirectAll(roomCode: string, quizId: string): void {
        this.socket.emit(SocketEvent.REDIRECT_ALL, roomCode, quizId);
    }

    waitingQuizId(): void {
        this.socket.emit(SocketEvent.WAITING_QUIZ_ID);
    }

    openDialogboxWaiting(roomCode: string, quizId: string): void {
        this.socket.emit(SocketEvent.OPEN_DIALOG_BOX_WAITING, roomCode, quizId);
    }

    openDialogboxNextQuestionDialog(roomCode: string): void {
        this.socket.emit(SocketEvent.OPEN_NEXT_QUESTION_DIALOG, roomCode);
    }

    // We need all these parameters
    // eslint-disable-next-line max-params
    submitAnswer(roomCode: string, questionType: string, isRandom: boolean, isTimeOver: boolean): void {
        this.socket.emit(SocketEvent.ANSWER_SUBMITTED, roomCode, questionType, this.socket.id, isRandom);
        if (!isTimeOver) this.socket.emit(SocketEvent.PLAYER_SUBMITTED, roomCode, this.socket.id);
    }

    // We need all these parameters for this method
    // eslint-disable-next-line max-params
    sendAnswerToOrg(roomCode: string, username: string, answer: string, point: number) {
        this.socket.emit(SocketEvent.SEND_ANSWER_TO_ORGANIZER, roomCode, username, answer, point, this.socket.id);
    }

    sendScoreQrlToClient(roomCode: string, listOfQrlAnswer: ListOfQrlAnswer[]) {
        this.socket.emit(SocketEvent.SEND_SCORE_QRL_TO_CLIENT, roomCode, listOfQrlAnswer);
    }

    sendDataCorrectionQrlToServer(roomCode: string, dataCorrection: DataQrlCorrection) {
        this.socket.emit(SocketEvent.SEND_SCORE_QRL_TO_SERVER, roomCode, dataCorrection);
    }

    getDataCorrectionQrl(roomCode: string): void {
        this.socket.emit(SocketEvent.RETRIEVE_DATA_CORRECTION, roomCode, this.socket.id);
    }

    redirectToResult(roomCode: string) {
        this.socket.emit(SocketEvent.REDIRECT_ALL_TO_RESULT, roomCode);
    }

    leaveRoom(roomCode: string): void {
        this.socket.emit(SocketEvent.LEAVE_ROOM, roomCode);
    }

    incrementScoreServer(questionPoints: number, roomCode: string): void {
        this.socket.emit(SocketEvent.INCREMENT_SCORE_SERVER, questionPoints, this.socket.id, roomCode);
    }
    getDataPlayers(roomCode: string): void {
        this.socket.emit(SocketEvent.RETRIEVE_DATA_PLAYERS, this.socket.id, roomCode);
    }

    waitingStartTimer(roomCode: string, questionDuration: number): void {
        this.socket.emit(SocketEvent.WAITING_START_TIMER, roomCode, questionDuration);
    }

    stopTimerRoom(roomCode: string): void {
        this.socket.emit(SocketEvent.STOP_TIMER_ROOM, roomCode);
    }

    pauseTimer(roomCode: string, isPanicModeOn: boolean): void {
        this.socket.emit(SocketEvent.PAUSE_TIMER, roomCode, isPanicModeOn);
    }

    playerSurrenderedDuringQRL(roomCode: string, questionType: string, isRandom: boolean) {
        this.socket.emit(SocketEvent.PLAYER_SURRENDER_DURING_QRL, roomCode, questionType, isRandom);
    }

    resumeTimer(roomCode: string, isPanicModeOn: boolean): void {
        this.socket.emit(SocketEvent.RESUME_TIMER, roomCode, isPanicModeOn);
    }

    startPanicMode(roomCode: string) {
        this.socket.emit(SocketEvent.START_PANIC_MODE, roomCode);
    }
    pausePanicMode(roomCode: string): void {
        this.socket.emit(SocketEvent.PAUSE_PANIC_MODE, roomCode);
    }

    resumePanicMode(roomCode: string): void {
        this.socket.emit(SocketEvent.RESUME_PANIC_MODE, roomCode);
    }

    onPanicModeStarted(action: () => void): void {
        this.socket.on(SocketEvent.PANIC_MODE_STARTED, action);
    }

    onPanicModePaused(action: () => void): void {
        this.socket.on(SocketEvent.PANIC_MODE_PAUSED, action);
    }

    onPanicModeResumed(action: () => void): void {
        this.socket.on(SocketEvent.PANIC_MODE_RESUMED, action);
    }

    removeFromFirstToAnswerContender(roomCode: string): void {
        this.socket.emit(SocketEvent.REMOVE_FROM_FIRST_TO_ANSWER_CONTENDER, roomCode);
    }

    clearAnswersOnServer(roomCode: string): void {
        this.socket.emit(SocketEvent.CLEAR_ANSWER_ON_SERVER, roomCode);
    }

    addToAnswerOrderList(roomCode: string): void {
        this.socket.emit(SocketEvent.ADD_TO_ANSWER_ORDER_LIST, roomCode, this.socket.id);
    }

    getUsername(roomCode: string): void {
        this.socket.emit(SocketEvent.GET_USERNAME, roomCode, this.socket.id);
    }

    nextQuestion(roomCode: string, currentQuestionIndex: number): void {
        this.socket.emit(SocketEvent.MOVE_TO_NEXT_QUESTION, roomCode, currentQuestionIndex);
        this.socket.emit(SocketEvent.SWITCH_PLAYER_TO_NO_INTERACTION, roomCode);
    }

    joinRoom(roomCode: string): void {
        this.socket.emit(SocketEvent.JOIN_ROOM, roomCode);
    }

    requestForListOfPlayers(roomCode: string) {
        this.socket.emit(SocketEvent.REQUEST_LIST_OF_PLAYERS, roomCode);
    }

    // We need these all parameters
    // eslint-disable-next-line max-params
    playerActiveOrInactive(
        roomCode: string,
        questionIndex: number,
        isPlayerActive: boolean,
        isAlreadySentStatus: boolean,
        isRemovingFromHistogram: boolean,
    ) {
        this.socket.emit(
            SocketEvent.PLAYER_ACTIVE_OR_INACTIVE,
            roomCode,
            questionIndex,
            isPlayerActive,
            isAlreadySentStatus,
            isRemovingFromHistogram,
        );
        if (isPlayerActive) this.socket.emit(SocketEvent.PLAYER_IS_TYPING, roomCode, this.socket.id);
        else this.socket.emit(SocketEvent.PLAYER_IS_NOT_TYPING, roomCode, this.socket.id);
    }

    selectedChoice(roomCode: string, questionIndex: number, selectedChoice: string) {
        this.socket.emit(SocketEvent.SELECTED_CHOICE, roomCode, questionIndex, selectedChoice);
        this.socket.emit(SocketEvent.PLAYER_SELECTED_CHOICE, roomCode, this.socket.id);
    }

    unselectedChoice(roomCode: string, questionIndex: number, unselectedChoice: string) {
        this.socket.emit(SocketEvent.UNSELECTED_CHOICE, roomCode, questionIndex, unselectedChoice);
        this.socket.emit(SocketEvent.PLAYER_UNSELECTED_CHOICE, roomCode, this.socket.id);
    }

    clearAnswerOrg(roomCode: string) {
        this.socket.emit(SocketEvent.CLEAR_ANSWER_ORGANIZER, roomCode);
    }

    gameStarted(roomCode: string, questions: Question[]) {
        const serverQuestions = questions.map((question) => {
            if (question.type === QuestionType.QCM) {
                const serverChoice = question.choices.map((choice) => {
                    return { choice: choice.text, numberOfAnswers: 0, isCorrect: choice.isCorrect };
                });
                return { text: question.text, choices: serverChoice };
            } else if (question.type === QuestionType.QRL) {
                const serverChoice = [
                    { choice: 'Nombre de joueurs actifs', numberOfAnswers: 0, isCorrect: true },
                    { choice: 'Nombre de Joueurs inactifs', numberOfAnswers: 0, isCorrect: false },
                ];
                return { text: question.text, choices: serverChoice };
            } else {
                return null;
            }
        });
        this.socket.emit(SocketEvent.GAME_STARTED, roomCode, serverQuestions);
    }

    getDataResults(roomCode: string): void {
        this.socket.emit(SocketEvent.RETRIEVE_DATA_RESULT, this.socket.id, roomCode);
    }

    on<T>(event: string, action: (data: T) => void): void {
        this.socket.on(event, action);
    }

    // We need the Function type to be able to pass a callback to the server
    // eslint-disable-next-line @typescript-eslint/ban-types
    send<T>(event: string, data?: T, callback?: Function): void {
        this.socket.emit(event, ...[data, callback].filter((x) => x));
    }

    off(event: string): void {
        this.socket.off(event);
    }

    sendGameStartData(quizTitle: string, listOfPlayers: number, roomCode: string): void {
        const gameStartData = {
            quizName: quizTitle,
            startTime: new Date(),
            playerCount: listOfPlayers,
        };
        this.socket.emit(SocketEvent.GAME_STARTED_DATA, roomCode, gameStartData);
    }
    sendGameEndData(topScore: number, roomCode: string): void {
        const gameEndData = {
            topScore,
        };
        this.socket.emit(SocketEvent.GAME_END_DATA, roomCode, gameEndData);
    }
}
