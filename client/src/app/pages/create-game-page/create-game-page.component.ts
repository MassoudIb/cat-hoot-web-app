import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { QuestionType } from '@app/constants/question-type';
import { MIN_RANDOM_QUESTIONS } from '@app/constants/validate-data';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Question } from './../../interfaces/question';
import { Quiz } from './../../interfaces/quiz';

@Component({
    selector: 'app-create-game-page',
    templateUrl: './create-game-page.component.html',
    styleUrls: ['./create-game-page.component.scss'],
})
export class CreateGamePageComponent implements OnDestroy {
    readonly title: string = 'Créer une partie';
    displayedQuiz: Quiz | null = null;
    quizzes: Quiz[] = [];
    unavailableQuiz: Quiz;
    selectedIndex: number;
    gameId = uuidv4();
    isTest: boolean;
    isQuizRandom: boolean = false;
    randomQuizId: string = 'randomQuiz';
    private subscriptions: Subscription = new Subscription();

    constructor(
        private quizzesRequestService: QuizzesRequestService,
        private router: Router,
        private dialogService: DialogService,
    ) {}

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    displayQuizDetails(quiz: Quiz | null | undefined) {
        if (quiz) {
            this.displayedQuiz = quiz;
            if (quiz.questions.length === 0) this.isQuizRandom = true;
            else this.isQuizRandom = false;
        }
    }

    checkQuizAvailability(clickedQuiz: Quiz, selectedButton: boolean) {
        if (this.isQuizRandom) {
            this.subscriptions.add(
                this.quizzesRequestService.getQuestions().subscribe({
                    next: (questions) => {
                        const filteredQuestions = questions.filter((question) => question.type === QuestionType.QCM);
                        if (filteredQuestions.length >= MIN_RANDOM_QUESTIONS) {
                            clickedQuiz.questions = this.randomizeQuestions(filteredQuestions);
                            clickedQuiz.id = this.gameId;
                            this.quizzesRequestService.saveRandomQuiz(clickedQuiz).subscribe();
                            this.router.navigate([`/vueAttenteOrg/${this.randomQuizId}?id=${this.gameId}`]);
                        } else this.showUnavailableDialog(clickedQuiz);
                    },
                }),
            );
        } else {
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
                            this.quizzesRequestService.selectedQuizId = selectedQuiz.id;
                            if (selectedButton) {
                                this.router.navigate([`/vueAttenteOrg/${selectedQuiz.id}?id=${this.gameId}`]);
                            } else this.router.navigate(['/player', { quizId: selectedQuiz.id, isTest: true }]);
                        } else this.showUnavailableDialog(clickedQuiz);
                    }),
            );
        }
    }

    showUnavailableDialog(chosenQuiz: Quiz) {
        this.dialogService.openUnavailableQuizDialog();
        this.unavailableQuiz = chosenQuiz;
        this.displayedQuiz = null;
    }

    randomizeQuestions(questionArray: Question[]): Question[] {
        let i;
        for (i = questionArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * i);
            const temp = questionArray[i];
            questionArray[i] = questionArray[j];
            questionArray[j] = temp;
        }
        return questionArray.slice(0, MIN_RANDOM_QUESTIONS);
    }
}
