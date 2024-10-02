import { animate, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { SELECTED } from '@app/constants/player-question';
import { SocketEvent } from '@app/constants/socket-event';
import { THREE_SECONDS, THREE_SECONDS_WAITING } from '@app/constants/time';
import { PlayerScore } from '@app/interfaces/player-score';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { QuizzesValidationService } from '@app/services/quizzes-validation.service';
import { RoomsService } from '@app/services/rooms.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { Quiz } from './../../interfaces/quiz';
import { TimeService } from './../../services/time.service';

const CIRCUMFERENCE = 340;
const MAXIMUM_PERCENTAGE = 100;
const QUARTER = 4;
@Component({
    selector: 'app-player-question-random',
    templateUrl: './player-question-random.component.html',
    styleUrls: ['./player-question-random.component.scss'],
    animations: [
        trigger('growShrink', [
            transition('* => *', [style({ transform: 'scale(1)' }), animate('0.5s', style({ transform: 'scale(1.2)' })), animate('0.5s')]),
        ]),
    ],
})
export class PlayerQuestionRandomComponent implements OnInit, OnDestroy {
    @Output() questionChanged = new EventEmitter<number>();
    @Output() scoreUpdated = new EventEmitter<number>();
    quizData: Quiz[];
    listOfPlayersWithDetails: { username: string; scores: number[]; bonusAmounts: number[] }[] = [];
    currentQuestionIndex: number = 0;
    selectedAnswer: string | null = null;
    selectedAnswers: string[] = [];
    isCorrectAnswer: string | null = null;
    score: number = 0;
    selectedChoice: unknown;
    isGameFinished: boolean = false;
    isQuestionFinished: boolean = false;
    allPlayersSentAnswers: boolean = false;
    isKeyAnwserEnabled = true;
    isAInputActive: boolean | null = null;
    isTest: boolean = true;
    roomCode: string;
    quizId: string;
    timeRemaining: number;
    isNotAlreadyAnswer: boolean = true;
    isBonus: boolean = false;
    username: string;
    histogram: string;
    numberOfPlayers: number;
    randomQuizId: string;

    // We need all these services
    // eslint-disable-next-line max-params
    constructor(
        private quizzesValidationService: QuizzesValidationService,
        private quizzesRequestService: QuizzesRequestService,
        private route: ActivatedRoute,
        private socketService: SocketClientService,
        private dialogService: DialogService,
        protected timeService: TimeService,
        private roomsService: RoomsService,
    ) {}

    @HostListener('window:keydown', ['$event'])
    handleKeyPress(event: KeyboardEvent) {
        this.isAInputActive = document.activeElement && document.activeElement.tagName !== 'INPUT';
        if (this.isAInputActive && this.isNotAlreadyAnswer) {
            const keyNumber = Number(event.key);
            if (!isNaN(keyNumber) && keyNumber > 0 && keyNumber <= this.getCurrentQuestion().choices.length) {
                const answerIndex = keyNumber - 1;
                const answerText = this.getCurrentQuestion().choices[answerIndex].text;
                this.toggleAnswerSelection(answerText);
            } else {
                if (event.key === 'Enter' && !this.isQuestionFinished) {
                    this.submitAnswer();
                }
            }
        }
    }

    handleKeyPressForSubmit(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.submitAnswer();
        }
    }

    ngOnInit() {
        window.onbeforeunload = () => this.ngOnDestroy();
        this.route.params.subscribe((params: Params) => {
            this.quizId = params['quizId'];
            this.roomCode = params['roomCode'];
            this.username = params['username'];
            if (this.username === 'Organisateur') this.socketService.send('addOrganizerPlayerRandomGame', this.roomCode);

            if (this.quizId) {
                this.loadQuizData();
            }
            this.randomQuizId = this.quizId.split('id=')[1];
            this.roomsService.setRoomMode(true, this.randomQuizId);
        });
        this.configureBaseSocketFeatures();
        this.socketService.send(SocketEvent.GET_PLAYER_SIZE_RANDOM, this.roomCode);
    }

    configureBaseSocketFeatures() {
        this.socketService.on(SocketEvent.TIMER_UPDATED, (remainingTime: number) => {
            this.timeRemaining = remainingTime;
        });

        this.socketService.on(SocketEvent.ALL_PLAYER_ANSWERED, () => {
            this.allPlayersSentAnswers = true;
            this.answerVerification();
            this.moveToNextQuestion();
        });

        this.socketService.on(SocketEvent.TIMER_EXPIRED, () => {
            this.submitAnswer();
        });

        this.socketService.on(SocketEvent.SCORE_UPDATED, (update: PlayerScore) => {
            this.incrementScoreClient(update.score, update.bonus);
        });

        this.socketService.on(
            SocketEvent.LIST_OF_PLAYERS_WITH_DETAILS,
            (playerArray: { username: string; scores: number[]; bonusAmounts: number[] }[]) => {
                this.listOfPlayersWithDetails = playerArray;
            },
        );

        this.socketService.on(SocketEvent.UPDATED_SCORE_QRL, (updatedScore: number) => {
            this.incrementScoreClient(updatedScore);
        });

        this.socketService.on(SocketEvent.OPEN_DIALOG_BOX, () => {
            this.dialogService.openNextQuestionDialog();
        });

        this.socketService.on(SocketEvent.GET_RANDOM_QUIZ_SIZE, (playersSize: number) => {
            this.numberOfPlayers = playersSize;
        });
    }

    loadQuizData() {
        this.quizzesRequestService.getQuiz(this.quizId).subscribe((quiz) => {
            if (quiz) {
                this.quizData = [quiz];
                this.socketService.waitingStartTimer(this.roomCode, this.getDurationQuestion());
                this.socketService.gameStarted(this.roomCode, this.quizData[0].questions);
            }
        });
    }

    ngOnDestroy() {
        if (this.numberOfPlayers === 1 && !this.isGameFinished) this.quizzesRequestService.deleteRandomQuiz(this.randomQuizId).subscribe();
        else if (!this.isGameFinished) {
            this.socketService.send(SocketEvent.GET_PLAYER_SIZE_RANDOM, this.roomCode);
            this.socketService.playerSurrenderedDuringQRL(this.roomCode, this.quizData[0].questions[this.currentQuestionIndex].type, true);
        }
        this.socketService.off(SocketEvent.ALL_PLAYER_ANSWERED);
        this.socketService.off(SocketEvent.TIMER_EXPIRED);
        this.socketService.off(SocketEvent.SCORE_UPDATED);
        this.socketService.off(SocketEvent.LIST_OF_PLAYERS_WITH_DETAILS);
        this.socketService.off(SocketEvent.OPEN_DIALOG_BOX);
        this.socketService.off(SocketEvent.NEXT_QUESTION_INDEX);
        this.socketService.off(SocketEvent.REDIRECT_TO_RESULT);
        this.socketService.off(SocketEvent.TIMER_UPDATED);
        this.socketService.off(SocketEvent.GET_RANDOM_QUIZ_SIZE);
    }

    getCircleColor(time: number): string {
        if (time > this.getDurationQuestion() / 2) return 'green';
        if (time > this.getDurationQuestion() / QUARTER) return 'yellow';
        return 'red';
    }

    getCircleDashArray(): string {
        return '340';
    }

    getCircleDashOffset(time: number): string {
        const total = this.getDurationQuestion();
        const percentage = (time / total) * MAXIMUM_PERCENTAGE;
        const offset = -(CIRCUMFERENCE * (MAXIMUM_PERCENTAGE - percentage)) / MAXIMUM_PERCENTAGE;
        return `${offset}`;
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

    getCurrentQuestion() {
        return this.quizData[0].questions[this.currentQuestionIndex];
    }

    getGoodAnswerQuestion() {
        return this.getCurrentQuestion().choices.filter((choice: { text: string; isCorrect: boolean }) => choice.isCorrect);
    }

    getWrongAnswerQuestion() {
        return this.getCurrentQuestion().choices.filter((choice: { text: string; isCorrect: boolean }) => choice.isCorrect === false);
    }

    getDurationQuestion() {
        return this.quizData[0].duration;
    }

    toggleAnswerSelection(answer: string) {
        const index = this.selectedAnswers.indexOf(answer);
        if (index === SELECTED) {
            this.selectedAnswers.push(answer);
            this.socketService.selectedChoice(this.roomCode, this.currentQuestionIndex, answer);
        } else {
            this.socketService.unselectedChoice(this.roomCode, this.currentQuestionIndex, answer);
            this.selectedAnswers.splice(index, 1);
        }
    }

    isSelected(answer: string): boolean {
        return this.selectedAnswers.includes(answer);
    }

    submitAnswer() {
        const questionIndex = this.currentQuestionIndex;
        const selectedAnswers = this.selectedAnswers;
        this.isNotAlreadyAnswer = false;
        this.quizzesValidationService.validateAnswer(this.quizId, questionIndex, selectedAnswers).subscribe({
            next: (response) => {
                const isValid = (response as { isValid?: boolean })?.isValid || false;
                if (isValid) this.socketService.addToAnswerOrderList(this.roomCode);
                this.socketService.submitAnswer(this.roomCode, this.quizData[0].questions[this.currentQuestionIndex].type, true, true);
            },
        });
    }

    answerVerification() {
        const questionIndex = this.currentQuestionIndex;
        const selectedAnswers = this.selectedAnswers;

        this.quizzesValidationService.validateAnswer(this.quizId, questionIndex, selectedAnswers).subscribe({
            next: (response) => {
                const isValid = (response as { isValid?: boolean })?.isValid || false;
                if (isValid) {
                    this.socketService.incrementScoreServer(Number(this.getCurrentQuestion().points), this.roomCode);
                    this.isCorrectAnswer = 'Correct';
                } else {
                    this.isCorrectAnswer = 'Incorrect';
                }
                this.isQuestionFinished = true;
                this.socketService.stopTimerRoom(this.roomCode);
            },
        });
    }

    incrementScoreClient(points: number, bonus?: boolean) {
        this.score = points;
        this.isBonus = bonus ?? false;
        this.scoreUpdated.emit(this.score);
    }

    moveToNextQuestion() {
        this.timeService.startTimer(THREE_SECONDS);
        setTimeout(() => {
            if (this.currentQuestionIndex < this.quizData[0].questions.length - 1) this.currentQuestionIndex++;
            else {
                this.isGameFinished = true;
                this.socketService.redirectToResult(this.roomCode);
            }

            this.questionChanged.emit(this.currentQuestionIndex);
            this.isQuestionFinished = false;
            this.isNotAlreadyAnswer = true;
            this.isCorrectAnswer = null;
            this.selectedAnswers = [];
            this.allPlayersSentAnswers = false;
            this.socketService.clearAnswersOnServer(this.roomCode);
            this.socketService.waitingStartTimer(this.roomCode, this.getDurationQuestion());
        }, THREE_SECONDS_WAITING);
    }
}
