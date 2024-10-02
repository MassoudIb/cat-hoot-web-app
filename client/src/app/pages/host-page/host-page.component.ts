import { animate, style, transition, trigger } from '@angular/animations';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionType } from '@app/constants/question-type';
import { SocketEvent } from '@app/constants/socket-event';
import { SIXTY_SECOND, TEN_SECONDS, TWENTY_SECONDS } from '@app/constants/time';
import { ListOfQrlAnswer } from '@app/interfaces/list-qrl-answer';
import { Message } from '@app/interfaces/message';
import { Player } from '@app/interfaces/player';
import { Question } from '@app/interfaces/question';
import { Quiz } from '@app/interfaces/quiz';
import { DialogService } from '@app/services/dialog.service';
import { GameService } from '@app/services/game.service';
import { PlayerInteractionService } from '@app/services/player-interaction.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { RoomsService } from '@app/services/rooms.service';
import { SharedMessagesService } from '@app/services/shared-messages-service';
import { SocketClientService } from '@app/services/socket-service.service';
import { TimeService } from '@app/services/time.service';

const CIRCUMFERENCE = 340;
const MAXIMUM_PERCENTAGE = 100;
const QUARTER = 4;
@Component({
    selector: 'app-host-page',
    templateUrl: './host-page.component.html',
    styleUrls: ['./host-page.component.scss'],
    providers: [TimeService, GameService],
    animations: [
        trigger('growShrink', [
            transition('* => *', [style({ transform: 'scale(1)' }), animate('0.5s', style({ transform: 'scale(1.2)' })), animate('0.5s')]),
        ]),
    ],
})
export class HostPageComponent implements OnInit, OnDestroy {
    currentQuizId: string;
    currentQuiz: Quiz;
    currentQuestion: Question;
    currentQuestionIndex: number = 0;
    players: Player[] = [];
    roomCode: string = '';
    organizerName: string = 'Organisateur';
    roomMessages: Message[] = [];
    time: number;
    test: number;
    isGameOngoing: boolean = true;
    listOfAnswers: ListOfQrlAnswer[];
    isTimerPaused: boolean = false;
    isPanicModeOn: boolean = false;
    allPlayersAnswered: boolean = false;
    remainingTime: number;

    // We need all these services in this component
    // eslint-disable-next-line max-params
    constructor(
        private route: ActivatedRoute,
        private quizzesRequestService: QuizzesRequestService,
        protected playerInteractionService: PlayerInteractionService,
        protected gameService: GameService,
        private socketService: SocketClientService,
        private dialogService: DialogService,
        private sharedMessagesService: SharedMessagesService,
        private roomsService: RoomsService,
        private router: Router,
    ) {}

    ngOnInit() {
        this.startGame();
        window.onbeforeunload = () => {
            this.ngOnDestroy();
            sessionStorage.setItem('navigating', 'false');
        };
        this.configureBaseSocketFeatures();
        this.roomCode = this.roomsService.getRoomCode();
        this.roomMessages = this.sharedMessagesService.getMessages();
    }

    configureBaseSocketFeatures(): void {
        this.socketService.on(SocketEvent.OPEN_DIALOG_BOX, () => {
            this.currentQuestionIndex += 1;
            this.currentQuestion = this.currentQuiz.questions[this.currentQuestionIndex];
            this.dialogService.openNextQuestionDialog();
        });

        this.socketService.on(SocketEvent.ALL_PLAYER_ANSWERED, () => {
            this.allPlayersAnswered = true;
        });

        this.socketService.on(SocketEvent.ALL_PLAYER_ANSWERED_QRL, () => {
            this.allPlayersAnswered = true;
        });

        this.socketService.on(SocketEvent.QRL_ANSWER_SENT, (listOfAnswers: ListOfQrlAnswer[]) => {
            this.listOfAnswers = listOfAnswers;
            this.sortUsername(this.listOfAnswers);
            this.dialogService.openCorrectionDialog(this.listOfAnswers, this.currentQuestion.text, this.currentQuestionIndex);
        });

        this.socketService.on(SocketEvent.NEW_MESSAGE, (messageData: Message) => {
            const isSent = messageData.username === this.organizerName;
            const formattedMessage = {
                ...messageData,
                timeStamp: new Date(messageData.timeStamp),
                isSent,
            };
            if (formattedMessage.message !== '') {
                this.sharedMessagesService.addMessage(formattedMessage);
            }
        });

        this.socketService.on(SocketEvent.TIMER_UPDATED, (remainingTime: number) => {
            this.remainingTime = remainingTime;
        });
    }

    ngOnDestroy() {
        if (this.isGameOngoing) this.gameService.destroyGame(this.roomCode);
        this.gameService.cleanOnDestroy();
        this.socketService.off(SocketEvent.OPEN_DIALOG_BOX);
        this.socketService.off(SocketEvent.NEW_MESSAGE);
        this.playerInteractionService.listOfPlayers = [];
        this.socketService.off(SocketEvent.QRL_ANSWER_SENT);
    }

    toggleTimer(): void {
        this.isTimerPaused = !this.isTimerPaused;

        if (!this.isTimerPaused) {
            if (this.isPanicModeOn) {
                this.socketService.startPanicMode(this.roomCode);
            } else {
                this.socketService.resumeTimer(this.roomCode, this.isPanicModeOn);
            }
        } else {
            this.socketService.pauseTimer(this.roomCode, this.isPanicModeOn);
        }
    }

    shouldShowPanicButton(): boolean {
        const questionType = this.currentQuiz?.questions[this.gameService.currentQuestionIndex]?.type;
        const time = this.remainingTime;
        const canActivate = (questionType === QuestionType.QCM && time > TEN_SECONDS) || (questionType === QuestionType.QRL && time > TWENTY_SECONDS);
        return canActivate;
    }

    activatePanicMode() {
        this.isPanicModeOn = true;
        this.playPanicModeSound();
        if (!this.isTimerPaused) {
            this.socketService.startPanicMode(this.roomCode);
        }
    }
    getCircleColor(time: number): string {
        if (this.currentQuiz?.questions[this.currentQuestionIndex]?.type === QuestionType.QCM) {
            const totalQuestionTime = this.time;
            if (time > totalQuestionTime / 2) return 'green';
            if (time > totalQuestionTime / QUARTER) return 'yellow';
            return 'red';
        } else {
            if (time > SIXTY_SECOND / 2) return 'green';
            if (time > SIXTY_SECOND / QUARTER) return 'yellow';
            return 'red';
        }
    }

    getCircleDashArray(): string {
        return '340';
    }

    getCircleDashOffset(time: number): string {
        if (this.currentQuiz?.questions[this.currentQuestionIndex]?.type === QuestionType.QCM) {
            const totalQuestionTime = this.time;
            const percentage = (time / totalQuestionTime) * MAXIMUM_PERCENTAGE;
            const offset = -(CIRCUMFERENCE * (MAXIMUM_PERCENTAGE - percentage)) / MAXIMUM_PERCENTAGE;
            return `${offset}`;
        } else {
            const percentage = (time / SIXTY_SECOND) * MAXIMUM_PERCENTAGE;
            const offset = -(CIRCUMFERENCE * (MAXIMUM_PERCENTAGE - percentage)) / MAXIMUM_PERCENTAGE;
            return `${offset}`;
        }
    }

    playPanicModeSound(): void {
        const audio = document.getElementById('panicMode') as HTMLAudioElement;
        audio.play();
    }

    stopPanicModeSound(): void {
        const audio = document.getElementById('panicMode') as HTMLAudioElement;
        audio.pause();
        audio.currentTime = 0;
    }
    gameFinished() {
        this.isGameOngoing = false;
        this.gameService.goToResultPage();
    }

    disconnectUser() {
        this.socketService.disconnect();
        this.router.navigate(['/home']);
        this.socketService.connect();
    }

    openDialogboxNextQuestion() {
        this.socketService.openDialogboxNextQuestionDialog(this.roomCode);
        this.gameService.moveToNextQuestion();
        this.allPlayersAnswered = false;
        this.isPanicModeOn = false;
        this.stopPanicModeSound();
    }
    toggleIsNameAscending() {
        this.playerInteractionService.isNameAscending = !this.playerInteractionService.isNameAscending;
    }

    toggleIsScoreAscending() {
        this.playerInteractionService.isScoreAscending = !this.playerInteractionService.isScoreAscending;
    }

    toggleIsColorStateAscending() {
        this.playerInteractionService.isColorStateAscending = !this.playerInteractionService.isColorStateAscending;
    }

    private setUpGame() {
        this.quizzesRequestService.getQuiz(this.currentQuizId).subscribe((quiz: Quiz) => {
            this.currentQuiz = quiz;
            this.time = quiz.duration;
            this.currentQuestion = quiz.questions[this.currentQuestionIndex];
            this.gameService.startGame(this.roomCode);
            this.gameService.setQuiz(quiz);
        });
    }

    private startGame() {
        this.route.params.subscribe((params) => {
            this.roomCode = params['roomCode'];
            this.playerInteractionService.initializeLobby(this.roomCode);
            this.playerInteractionService.configureBaseSocketFeatures();
            this.gameService.initializeLobby(this.roomCode);
        });
        this.route.params.subscribe((params) => {
            this.currentQuizId = params['quizId'];
        });
        this.setUpGame();
    }

    private sortUsername(listOfAnswers: ListOfQrlAnswer[]) {
        for (let i = 0; i < listOfAnswers.length; i++) {
            for (let j = 0; j < listOfAnswers.length - i - 1; j++) {
                const nameA = listOfAnswers[j].username.toUpperCase();
                const nameB = listOfAnswers[j + 1].username.toUpperCase();
                if (nameA > nameB) {
                    const temp = listOfAnswers[j + 1];
                    listOfAnswers[j + 1] = listOfAnswers[j];
                    listOfAnswers[j] = temp;
                }
            }
        }
        this.listOfAnswers = listOfAnswers;
    }
}
