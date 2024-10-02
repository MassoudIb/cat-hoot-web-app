import { EventEmitter, Injectable, Output } from '@angular/core';
import { Router } from '@angular/router';
import { POINT_BONUS } from '@app/constants/player-question';
import { QuestionType } from '@app/constants/question-type';
import { SocketEvent } from '@app/constants/socket-event';
import { ONE_SECOND_DELAY_WAITING, SIXTY_SECOND, THREE_SECONDS_WAITING } from '@app/constants/time';
import { Message } from '@app/interfaces/message';
import { Quiz } from '@app/interfaces/quiz';
import { Result } from '@app/interfaces/result';
import { DialogService } from '@app/services/dialog.service';
import { Subject } from 'rxjs';
import { SocketClientService } from './socket-service.service';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    @Output() questionChanged = new EventEmitter<number>();
    @Output() scoreUpdated = new EventEmitter<number>();

    isGameFinished: boolean = false;
    isQuestionFinished: boolean = false;
    isTimeOver: boolean = false;
    isReadyForNextQuestion: boolean = false;
    time: number = 0;
    score: number = 0;
    currentQuestionIndex: number = 0;
    quizData: Quiz[] = [];
    roomMessages: Message[] = [];
    roomCode: string = '';
    organizerName: string = 'Organisateur';
    result: Result = { text: '', choices: [{ choice: ' ', isCorrect: false, numberOfAnswers: 0 }] };
    currentQuestionType: string = '';
    currentQuestionTimeRemaining: number = 0;
    private resultSubject = new Subject<Result>();
    // We must declare resultUpdated after its subject
    // eslint-disable-next-line @typescript-eslint/member-ordering
    resultUpdated = this.resultSubject.asObservable();

    constructor(
        private dialogService: DialogService,
        private socketService: SocketClientService,
        private router: Router,
    ) {
        this.configureBaseSocketFeatures();
    }

    setCurrentQuestionType(type: string) {
        this.currentQuestionType = type;
    }

    getCurrentQuestionType(): string {
        return this.currentQuestionType;
    }

    setCurrentQuestionTimeRemaining(time: number) {
        this.currentQuestionTimeRemaining = time;
    }

    getCurrentQuestionTimeRemaining(): number {
        return this.currentQuestionTimeRemaining;
    }

    getQuiz() {
        return this.quizData[0];
    }
    setQuiz(quiz: Quiz) {
        this.quizData = [quiz];
    }

    getCurrentQuestionText() {
        return this.quizData[0] ? this.quizData[0].questions[this.currentQuestionIndex].text : '';
    }
    getCurrentQuestionPoint() {
        return this.quizData[0] ? this.quizData[0].questions[this.currentQuestionIndex].points : 0;
    }

    getDurationQuestion() {
        return this.quizData[0].duration;
    }

    incrementScore(points: number) {
        this.score += points * POINT_BONUS;
        this.scoreUpdated.emit(this.score);
    }

    beginGame(quiz: Quiz) {
        this.quizData = [quiz];
        this.currentQuestionIndex = 0;
        this.isGameFinished = false;
    }
    startGame(roomCode: string) {
        this.roomCode = roomCode;
        this.currentQuestionIndex = 0;
    }

    initializeLobby(roomCode: string) {
        this.socketService.joinRoom(roomCode);
    }

    destroyGame(roomCode: string) {
        this.roomMessages = [];
        this.socketService.send('deleteRoom', roomCode);
    }

    configureBaseSocketFeatures() {
        this.handlePlayersEvents();
        this.handleQuestionEvents();
        this.handleTimeEvents();
        this.handleRedirectionEvents();
        this.handleResultsEvents();
    }
    moveToNextQuestion() {
        if (!this.isLastQuestion()) {
            setTimeout(() => {
                this.socketService.nextQuestion(this.roomCode, this.currentQuestionIndex);
                if (this.quizData[0].questions[this.currentQuestionIndex + 1].type === QuestionType.QCM)
                    this.socketService.waitingStartTimer(this.roomCode, this.getDurationQuestion());
                else this.socketService.waitingStartTimer(this.roomCode, SIXTY_SECOND);
            }, THREE_SECONDS_WAITING + ONE_SECOND_DELAY_WAITING);
        }
    }

    goToResultPage() {
        this.socketService.redirectToResult(this.roomCode);
    }

    isReadyToMoveNextQuestion(): boolean {
        return this.isTimeOver && !this.isLastQuestion();
    }

    updateResultFromSocket(result: Result): void {
        const newResult: Result = result;
        this.resultSubject.next(newResult);
        this.result = result;
    }

    cleanOnDestroy() {
        this.socketService.off(SocketEvent.NEXT_QUESTION_INDEX);
        this.socketService.off(SocketEvent.READY_FOR_NEXT_QUESTION);
        this.socketService.off(SocketEvent.TIMER_UPDATED);
        this.socketService.off(SocketEvent.TIMER_EXPIRED);
        this.socketService.off(SocketEvent.ALL_PLAYER_ANSWERED);
        this.socketService.off(SocketEvent.ALL_PLAYER_ANSWERED_QRL);
        this.socketService.off(SocketEvent.KICK_ORGANIZER);
        this.socketService.off(SocketEvent.UPDATED_HISTOGRAM);
    }

    isLastQuestion() {
        if (this.quizData[0] && this.isTimeOver) {
            if (this.currentQuestionIndex === this.quizData[0].questions.length - 1) return true;
            return false;
        }
        return false;
    }

    handleTimeEvents() {
        this.socketService.on(SocketEvent.TIMER_UPDATED, (remainingTime: number) => {
            this.time = remainingTime;
        });
        this.socketService.on(SocketEvent.TIMER_EXPIRED, () => {
            this.isTimeOver = true;
        });
        this.socketService.on(SocketEvent.ALL_PLAYER_ANSWERED, () => {
            this.isTimeOver = true;
        });
        this.socketService.on(SocketEvent.ALL_PLAYER_ANSWERED_QRL, () => {
            this.isTimeOver = true;
        });
    }

    handleQuestionEvents() {
        this.socketService.on(SocketEvent.NEXT_QUESTION_INDEX, (nextQuestionIndex: number) => {
            this.currentQuestionIndex = nextQuestionIndex;
            this.result.text = this.quizData[0].questions[this.currentQuestionIndex].text;
            this.isTimeOver = false;
        });
        this.socketService.on(SocketEvent.READY_FOR_NEXT_QUESTION, (isReadyForNextQuestion: boolean) => {
            this.isReadyForNextQuestion = isReadyForNextQuestion;
        });
    }

    handlePlayersEvents() {
        this.socketService.on(SocketEvent.KICK_ORGANIZER, () => {
            this.router.navigate(['/home']);
            this.dialogService.openAllPlayersLeft();
        });
    }

    handleResultsEvents() {
        this.socketService.on(
            SocketEvent.UPDATED_HISTOGRAM,
            (currentQuestionChoices: { text: string; choices: { choice: string; isCorrect: boolean; numberOfAnswers: number }[] }) => {
                this.updateResultFromSocket(currentQuestionChoices);
            },
        );
    }

    handleRedirectionEvents() {
        this.socketService.on(SocketEvent.REDIRECT_TO_RESULT, (result: Result) => {
            this.router.navigate(['/resultsGame', { result, username: this.organizerName }]);
        });
    }
}
