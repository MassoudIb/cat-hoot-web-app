import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { POINT_BONUS, SELECTED } from '@app/constants/player-question';
import { QuestionType } from '@app/constants/question-type';
import { SIXTY_SECOND, THREE_SECONDS_WAITING } from '@app/constants/time';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { QuizzesValidationService } from '@app/services/quizzes-validation.service';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Quiz } from './../../interfaces/quiz';
import { TimeService } from './../../services/time.service';

@Component({
    selector: 'app-player-question-test',
    templateUrl: './player-question-test.component.html',
    styleUrls: ['./player-question-test.component.scss'],
})
export class PlayerQuestionTestComponent implements OnInit, OnDestroy {
    @Output() questionChanged = new EventEmitter<number>();
    @Output() scoreUpdated = new EventEmitter<number>();
    quizData: Quiz[];
    currentQuestionIndex: number = 0;
    selectedAnswer: string | null = null;
    selectedAnswers: string[] = [];
    isCorrectAnswer: string | null = null;
    score: number = 0;
    isGameFinished: boolean = false;
    isQuestionFinished: boolean = false;
    isAInputActive: boolean | null = null;
    isTest: boolean = true;
    quizId: string;
    timerInitialized: boolean = false;
    qrlAnswer: string;
    private timerSubscription: Subscription;

    // We need all these services for this component
    // eslint-disable-next-line max-params
    constructor(
        private quizzesValidationService: QuizzesValidationService,
        private quizzesRequestService: QuizzesRequestService,
        protected timeService: TimeService,
        private route: ActivatedRoute,
    ) {}

    @HostListener('window:keydown', ['$event'])
    handleKeyPress(event: KeyboardEvent) {
        this.isAInputActive = document.activeElement && document.activeElement.tagName !== 'INPUT';
        if (this.isAInputActive) {
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
        if (!this.timerInitialized && this.isTest) {
            this.setupTimer();
            this.timerInitialized = true;
        }

        this.route.params.pipe(switchMap((params) => this.quizzesRequestService.getQuiz(params['quizId']))).subscribe((quiz) => {
            if (quiz) {
                this.quizData = [quiz];
                this.timeService.stopTimer();
                if (this.quizData[0].questions[this.currentQuestionIndex].type === QuestionType.QCM) {
                    this.timeService.startTimer(this.getDurationQuestion());
                } else {
                    this.timeService.startTimer(SIXTY_SECOND);
                }
            }
        });
    }

    setupTimer() {
        this.timerSubscription = this.timeService.timerExpired.subscribe(() => {
            this.isQuestionFinished = true;

            const quizId = this.quizData[0].id;
            const questionIndex = this.currentQuestionIndex;
            const selectedAnswers = this.selectedAnswers;

            this.quizzesValidationService.validateAnswer(quizId, questionIndex, selectedAnswers).subscribe({
                next: (response) => {
                    const isValid = (response as { isValid?: boolean })?.isValid || false;

                    if (isValid) {
                        this.incrementScore(this.getCurrentQuestion().points);
                        this.isCorrectAnswer = 'Correct';
                    } else {
                        this.isCorrectAnswer = 'Incorrect';
                    }

                    this.timeService.stopTimer();
                    setTimeout(() => {
                        this.isCorrectAnswer = null;
                        this.moveToNextQuestion();
                    }, THREE_SECONDS_WAITING);
                    this.selectedAnswers = [];
                },
            });
        });
    }

    ngOnDestroy() {
        if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
        }
        this.timeService.stopTimer();
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
        } else {
            this.selectedAnswers.splice(index, 1);
        }
    }

    isSelected(answer: string): boolean {
        return this.selectedAnswers.includes(answer);
    }

    submitAnswer() {
        const quizId = this.quizData[0].id;
        const questionIndex = this.currentQuestionIndex;
        if (this.quizData[0].questions[this.currentQuestionIndex].type === QuestionType.QCM) {
            const selectedAnswers = this.selectedAnswers;

            this.quizzesValidationService.validateAnswer(quizId, questionIndex, selectedAnswers).subscribe({
                next: (response) => {
                    const isValid = (response as { isValid?: boolean })?.isValid || false;
                    if (isValid) {
                        this.incrementScore(this.getCurrentQuestion().points);
                        this.isCorrectAnswer = 'Correct';
                    } else {
                        this.isCorrectAnswer = 'Incorrect';
                    }
                    this.timeService.stopTimer();
                    this.isQuestionFinished = true;
                    setTimeout(() => {
                        this.isCorrectAnswer = null;
                        this.moveToNextQuestion();
                    }, THREE_SECONDS_WAITING);
                    this.selectedAnswers = [];
                },
            });
        } else {
            this.incrementScore(this.getCurrentQuestion().points);
            this.timeService.stopTimer();
            this.isQuestionFinished = true;
            setTimeout(() => {
                this.isCorrectAnswer = null;
                this.moveToNextQuestion();
            }, THREE_SECONDS_WAITING);
            this.qrlAnswer = '';
        }
    }

    incrementScore(points: number) {
        this.score += points * POINT_BONUS;
        this.scoreUpdated.emit(this.score);
    }

    moveToNextQuestion() {
        if (this.currentQuestionIndex < this.quizData[0].questions.length - 1) {
            this.currentQuestionIndex++;
        } else {
            this.isGameFinished = true;
            setTimeout(() => {
                this.quizzesRequestService.goPageCreateGame();
            }, THREE_SECONDS_WAITING);
        }

        this.questionChanged.emit(this.currentQuestionIndex);
        this.isQuestionFinished = false;
        if (this.quizData[0].questions[this.currentQuestionIndex].type === QuestionType.QCM) {
            this.timeService.startTimer(this.getDurationQuestion());
        } else {
            this.timeService.startTimer(SIXTY_SECOND);
        }
    }
}
