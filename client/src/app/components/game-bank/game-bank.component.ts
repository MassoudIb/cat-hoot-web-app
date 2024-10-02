import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { MIN_RANDOM_QUESTIONS } from '@app/constants/validate-data';
import { Question } from '@app/interfaces/question';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Quiz } from './../../interfaces/quiz';

@Component({
    selector: 'app-game-bank',
    templateUrl: './game-bank.component.html',
    styleUrls: ['./game-bank.component.scss'],
})
export class GameBankComponent implements OnInit, OnDestroy, OnChanges {
    @Output() newQuizEvent = new EventEmitter<Quiz>();
    @Input() quizToDelete: Quiz;
    visibleQuizzes: Quiz[] = [];
    qcmQuestions: Question[] = [];
    selectedQuiz: Quiz | null = null;
    selectedIndex: number | null = null;
    randomQuiz: Quiz = {
        title: 'Mode aléatoire',
        duration: 20,
        description: 'Un quiz avec 5 questions à choix multiples aléatoires',
        questions: [],
        id: uuidv4(),
        lastModification: new Date().toISOString(),
        isVisible: true,
    };
    private subscriptions: Subscription = new Subscription();

    constructor(
        private quizzesRequestService: QuizzesRequestService,
        private dialogService: DialogService,
    ) {}

    ngOnInit() {
        this.subscriptions.add(
            this.quizzesRequestService.getQuestions().subscribe({
                next: (questions) => {
                    const filteredQuestions = questions.filter((question) => question.type === 'QCM');
                    this.qcmQuestions = filteredQuestions;
                },
                complete: () => {
                    this.quizzesRequestService.getVisibleQuizzes().subscribe({
                        next: (quizzes) => {
                            this.visibleQuizzes = quizzes;
                            if (this.qcmQuestions.length >= MIN_RANDOM_QUESTIONS) this.visibleQuizzes.unshift(this.randomQuiz);
                        },
                    });
                },
            }),
        );
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.quizToDelete) this.updateVisibleQuizzes(this.quizToDelete);
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    selectQuiz(clickedQuiz: Quiz, pos: number): void {
        if (pos >= 0 && pos < this.visibleQuizzes.length) {
            if (clickedQuiz.title === this.randomQuiz.title) this.emitQuiz(clickedQuiz, pos);
            else {
                this.subscriptions.add(
                    this.quizzesRequestService
                        .getQuiz(clickedQuiz.id)
                        .pipe(
                            catchError(() => {
                                return of(null);
                            }),
                        )
                        .subscribe((selectedQuiz) => {
                            if (selectedQuiz && selectedQuiz.isVisible) {
                                this.emitQuiz(clickedQuiz, pos);
                            } else {
                                this.dialogService.openUnavailableQuizDialog();
                                this.updateVisibleQuizzes(clickedQuiz as Quiz);
                                if (this.selectedIndex && this.selectedIndex > pos) this.selectedIndex--;
                            }
                        }),
                );
            }
        }
    }

    updateVisibleQuizzes(unavailableQuiz: Quiz) {
        this.visibleQuizzes = this.visibleQuizzes.filter((quiz) => quiz.id !== unavailableQuiz.id);
    }

    emitQuiz(chosenQuiz: Quiz, pos: number) {
        this.selectedQuiz = chosenQuiz;
        this.selectedIndex = pos;
        this.newQuizEvent.emit(this.selectedQuiz);
    }
}
