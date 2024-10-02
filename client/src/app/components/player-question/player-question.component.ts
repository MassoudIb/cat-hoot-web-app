// We need these all lines of code
/* eslint-disable max-lines */
import { animate, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { SELECTED } from '@app/constants/player-question';
import { QuestionType } from '@app/constants/question-type';
import { SocketEvent } from '@app/constants/socket-event';
import { FIVE_SECONDS_IN_MS, SIXTY_SECOND } from '@app/constants/time';
import { PlayerScore } from '@app/interfaces/player-score';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { QuizzesValidationService } from '@app/services/quizzes-validation.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { Quiz } from './../../interfaces/quiz';

const CIRCUMFERENCE = 340;
const MAXIMUM_PERCENTAGE = 100;
const QUARTER = 4;
@Component({
    selector: 'app-player-question',
    templateUrl: './player-question.component.html',
    styleUrls: ['./player-question.component.scss'],
    animations: [
        trigger('growShrink', [
            transition('* => *', [style({ transform: 'scale(1)' }), animate('0.5s', style({ transform: 'scale(1.2)' })), animate('0.5s')]),
        ]),
    ],
})
export class PlayerQuestionComponent implements OnInit, OnDestroy {
    @Output() questionChanged = new EventEmitter<number>();
    @Output() scoreUpdated = new EventEmitter<number>();
    quizData: Quiz[];
    qrlAnswersList: string[] = ['', ''];
    qrlAnswer: string;
    listOfPlayersWithDetails: { username: string; scores: number[]; bonusAmounts: number[] }[] = [];
    currentQuestionIndex: number = 0;
    selectedAnswer: string | null = null;
    selectedAnswers: string[] = [];
    isCorrectAnswer: string | null = null;
    score: number = 0;
    selectedChoice: unknown;
    isQuestionFinished: boolean = false;
    isAInputActive: boolean | null = null;
    isTimerOver: boolean = false;
    roomCode: string;
    quizId: string;
    timeRemaining: number;
    isNotAlreadyAnswer: boolean = true;
    isBonus: boolean = false;
    username: string;
    waitingCorrection: boolean = false;
    isTimerPaused: boolean;
    isAlreadySentStatus = false;
    isActiveBefore: boolean;
    timerExpired: boolean = false;
    isActive: boolean = false;
    isLeaving: boolean = false;
    isSubmitted: boolean = false;

    // We need all these services
    // eslint-disable-next-line max-params
    constructor(
        private quizzesValidationService: QuizzesValidationService,
        private quizzesRequestService: QuizzesRequestService,
        private route: ActivatedRoute,
        private socketService: SocketClientService,
        private dialogService: DialogService,
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
                    this.submitAnswer(this.isTimerOver);
                }
            }
        }
    }

    handleKeyPressForSubmit(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.submitAnswer(this.isTimerOver);
        }
    }

    ngOnInit() {
        window.onbeforeunload = () => this.ngOnDestroy();
        this.route.params.subscribe((params: Params) => {
            this.quizId = params['quizId'];
            this.roomCode = params['roomCode'];
            this.username = params['username'];

            if (this.quizId) {
                this.loadQuizData();
            }
            this.socketService.on(SocketEvent.PAUSE_TIMER, () => {
                this.handlePauseTimer();
            });
            this.socketService.on(SocketEvent.RESUME_TIMER, () => {
                this.handleResumeTimer();
            });
        });
        this.configureBaseSocketFeatures();
    }

    configureBaseSocketFeatures() {
        this.socketService.on(SocketEvent.TIMER_UPDATED, (remainingTime: number) => {
            this.timeRemaining = remainingTime;
        });

        this.socketService.on(SocketEvent.ALL_PLAYER_ANSWERED, () => {
            this.answerVerification();
        });

        this.socketService.on(SocketEvent.ALL_PLAYER_ANSWERED_QRL, () => {
            this.sendAnswerToOrg();
        });

        this.socketService.on(SocketEvent.TIMER_EXPIRED, () => {
            this.isTimerOver = true;
            this.submitAnswer(this.isTimerOver);
            this.isTimerOver = false;
            this.timerExpired = true;
            this.stopPanicModeSound();
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

        this.socketService.on(SocketEvent.NEXT_QUESTION_INDEX, (nextQuestionIndex: number) => {
            this.moveToNextQuestion();
            this.stopPanicModeSound();
            this.currentQuestionIndex = nextQuestionIndex;

            if (this.quizData[0].questions[this.currentQuestionIndex].type === QuestionType.QRL) {
                this.isPlayerActive();
            }
        });

        this.socketService.on(SocketEvent.UPDATED_SCORE_QRL, (updatedScore: number) => {
            this.waitingCorrection = false;
            this.incrementScoreClient(updatedScore);
        });

        this.socketService.on(SocketEvent.OPEN_DIALOG_BOX, () => {
            this.dialogService.openNextQuestionDialog();
        });
    }

    loadQuizData() {
        this.quizzesRequestService.getQuiz(this.quizId).subscribe((quiz) => {
            if (quiz) {
                this.quizData = [quiz];
                if (this.quizData[0].questions[0].type === QuestionType.QCM)
                    this.socketService.waitingStartTimer(this.roomCode, this.getDurationQuestion());
                else if (this.quizData[0].questions[0].type === QuestionType.QRL) {
                    this.socketService.waitingStartTimer(this.roomCode, SIXTY_SECOND);
                    this.isPlayerActive();
                }
                this.socketService.gameStarted(this.roomCode, this.quizData[0].questions);
            }
        });
    }

    ngOnDestroy() {
        if (this.quizData[0].questions[this.currentQuestionIndex].type === QuestionType.QRL) {
            this.isLeaving = true;
            this.socketService.playerActiveOrInactive(this.roomCode, this.currentQuestionIndex, this.isActive, false, true);
        }
        this.socketService.playerSurrenderedDuringQRL(this.roomCode, this.quizData[0].questions[this.currentQuestionIndex].type, false);
        this.socketService.off(SocketEvent.ALL_PLAYER_ANSWERED);
        this.socketService.off(SocketEvent.TIMER_EXPIRED);
        this.socketService.off(SocketEvent.SCORE_UPDATED);
        this.socketService.off(SocketEvent.LIST_OF_PLAYERS_WITH_DETAILS);
        this.socketService.off(SocketEvent.OPEN_DIALOG_BOX);
        this.socketService.off(SocketEvent.NEXT_QUESTION_INDEX);
        this.socketService.off(SocketEvent.REDIRECT_TO_RESULT);
        this.socketService.off(SocketEvent.UPDATED_HISTOGRAM);
        this.socketService.off(SocketEvent.TIMER_UPDATED);
        this.socketService.off(SocketEvent.UPDATED_SCORE_QRL);
        this.socketService.off(SocketEvent.ALL_PLAYER_ANSWERED_QRL);
        this.socketService.off(SocketEvent.PANIC_MODE_PAUSED);
        this.socketService.off(SocketEvent.PANIC_MODE_RESUMED);
        this.socketService.off('timerExpired');
        this.socketService.off(SocketEvent.PLAYER_ACTIVE_OR_INACTIVE);
    }

    getCircleColor(time: number): string {
        if (this.getCurrentQuestion().type === QuestionType.QCM) {
            if (time > this.getDurationQuestion() / 2) return 'green';
            if (time > this.getDurationQuestion() / QUARTER) return 'yellow';
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
        if (this.getCurrentQuestion().type === QuestionType.QCM) {
            const total = this.getDurationQuestion();
            const percentage = (time / total) * MAXIMUM_PERCENTAGE;
            const offset = -(CIRCUMFERENCE * (MAXIMUM_PERCENTAGE - percentage)) / MAXIMUM_PERCENTAGE;
            return `${offset}`;
        } else {
            const percentage = (time / SIXTY_SECOND) * MAXIMUM_PERCENTAGE;
            const offset = -(CIRCUMFERENCE * (MAXIMUM_PERCENTAGE - percentage)) / MAXIMUM_PERCENTAGE;
            return `${offset}`;
        }
    }

    playPanicModeSound(): void {
        if (!this.timerExpired) {
            const audio = document.getElementById('panicMode') as HTMLAudioElement;
            audio.play();
        }
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

    getAnwserQrl(anwser: string) {
        this.qrlAnswersList.unshift(anwser);
    }

    isPlayerActive() {
        const verification = setInterval(() => {
            this.isActive = this.qrlAnswersList[1] !== this.qrlAnswersList[0];
            if (this.isLeaving) {
                clearInterval(verification);
            } else if (!this.isAlreadySentStatus) {
                this.socketService.playerActiveOrInactive(this.roomCode, this.currentQuestionIndex, this.isActive, this.isAlreadySentStatus, false);
                this.isActiveBefore = this.isActive;
                this.isAlreadySentStatus = true;
            } else if (this.isActive !== this.isActiveBefore) {
                this.socketService.playerActiveOrInactive(this.roomCode, this.currentQuestionIndex, this.isActive, this.isAlreadySentStatus, false);
                this.isActiveBefore = this.isActive;
            }
            this.qrlAnswersList = ['', ''];

            if (this.isQuestionFinished) {
                clearInterval(verification);
                this.socketService.playerActiveOrInactive(this.roomCode, this.currentQuestionIndex, this.isActive, this.isAlreadySentStatus, true);
            }
        }, FIVE_SECONDS_IN_MS);
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

    handlePauseTimer() {
        this.isTimerPaused = true;
    }

    handleResumeTimer() {
        this.isTimerPaused = false;
    }

    submitAnswer(isTimeOver: boolean) {
        this.isSubmitted = true;
        const quizId = this.quizData[0].id;
        const questionIndex = this.currentQuestionIndex;
        if (this.quizData[0].questions[this.currentQuestionIndex].type === QuestionType.QCM) {
            const selectedAnswers = this.selectedAnswers;
            this.isNotAlreadyAnswer = false;
            this.quizzesValidationService.validateAnswer(quizId, questionIndex, selectedAnswers).subscribe({
                next: (response) => {
                    const isValid = (response as { isValid?: boolean })?.isValid || false;
                    if (isValid) {
                        this.socketService.submitAnswer(this.roomCode, this.quizData[0].questions[this.currentQuestionIndex].type, false, isTimeOver);
                        this.socketService.addToAnswerOrderList(this.roomCode);
                    } else {
                        this.socketService.submitAnswer(this.roomCode, this.quizData[0].questions[this.currentQuestionIndex].type, false, isTimeOver);
                    }
                },
            });
        } else {
            this.isNotAlreadyAnswer = false;
            this.socketService.submitAnswer(this.roomCode, this.quizData[0].questions[this.currentQuestionIndex].type, false, isTimeOver);
        }
    }

    answerVerification() {
        const quizId = this.quizData[0].id;
        const questionIndex = this.currentQuestionIndex;
        const selectedAnswers = this.selectedAnswers;

        this.quizzesValidationService.validateAnswer(quizId, questionIndex, selectedAnswers).subscribe({
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

    sendAnswerToOrg() {
        this.waitingCorrection = true;
        this.isQuestionFinished = true;
        this.socketService.stopTimerRoom(this.roomCode);
        this.socketService.sendAnswerToOrg(this.roomCode, this.username, this.qrlAnswer, Number(this.getCurrentQuestion().points));
        this.qrlAnswer = '';
    }

    incrementScoreClient(points: number, bonus?: boolean) {
        this.score = points;
        this.isBonus = bonus ?? false;
        this.scoreUpdated.emit(this.score);
    }

    moveToNextQuestion() {
        this.isSubmitted = false;
        this.socketService.getDataPlayers(this.roomCode);
        this.socketService.clearAnswersOnServer(this.roomCode);
        this.socketService.clearAnswerOrg(this.roomCode);
        this.isCorrectAnswer = null;
        this.questionChanged.emit(this.currentQuestionIndex);
        this.waitingCorrection = false;
        this.isQuestionFinished = false;
        this.isNotAlreadyAnswer = true;
        this.isAlreadySentStatus = false;
        this.selectedAnswers = [];
        this.timerExpired = false;
    }
}
