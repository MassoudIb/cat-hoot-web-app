import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { QuestionType } from '@app/constants/question-type';
import { MAX_DURATION } from '@app/constants/validate-data';
import { Choice } from '@app/interfaces/choice';
import { Answer, Quiz } from '@app/interfaces/quiz';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { QuizzesRequestService } from './quizzes-request.service';

@Injectable({
    providedIn: 'root',
})
export class QuizzesValidationService {
    quizzesSubject: BehaviorSubject<Quiz[]> = new BehaviorSubject<Quiz[]>([]);
    quizzes$: Observable<Quiz[]> = this.quizzesSubject.asObservable();
    errorMessage: string;
    isTitleUnique: boolean = true;
    nbTrueAnswers: number = 0;
    isDuplicateTitle: boolean = false;
    duplicateTitle: string = '';
    minDuration: number = 0;

    constructor(
        private http: HttpClient,
        private quizzesRequestService: QuizzesRequestService,
    ) {}

    isQuizValid(quiz: Quiz) {
        if (!quiz.title) {
            this.errorMessage = 'Le quiz doit avoir un titre';
            return false;
        }
        if (!quiz.description) {
            this.errorMessage = 'Le quiz doit avoir une description';
            return false;
        }
        if (!quiz.duration) {
            this.errorMessage = 'Le quiz doit avoir une durée déterminée';
            return false;
        }
        if (quiz.duration < this.minDuration || quiz.duration > MAX_DURATION + 1) {
            this.errorMessage = 'La durée doit être entre 1 et 60 secondes';
            return false;
        }
        if (quiz.questions.length === 0) {
            this.errorMessage = 'Le quiz doit avoir au moins une question';
            return false;
        }

        if (!this.areQuestionsValid(quiz)) return false;

        this.uniqueTitle(quiz);
        if (!this.isTitleUnique) {
            this.duplicateTitle = quiz.title;
            this.isDuplicateTitle = true;
            this.errorMessage = 'Le quiz doit avoir un titre unique';
            return false;
        }

        return true;
    }

    // We need these conditions to valid the questions
    // eslint-disable-next-line complexity
    areQuestionsValid(quiz: Quiz) {
        for (const question of quiz.questions) {
            if (!question.points) {
                this.errorMessage = "La pondération d'une question (ou plusieurs) doit être donnée";
                return false;
            }
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            if (question.points < 0 || question.points > 100 || question.points % 10 !== 0) {
                this.errorMessage = 'La pondération doit être entre 0 et 100 et un multiple de 10';
                return false;
            }
            if (!question.text) {
                this.errorMessage = 'Une question (ou plusieurs) doit avoir sa description';
                return false;
            }
            if (question.type !== QuestionType.QRL && question.type !== QuestionType.QCM) {
                this.errorMessage = 'Une question (ou plusieurs) doit être de type QRL ou QCM';
                return false;
            }
            if (question.type === QuestionType.QCM && (question.choices.length < 2 || !question.choices)) {
                this.errorMessage = 'Une question de type QCM (ou plusieurs) doit avoir au moins deux choix';
                return false;
            }

            if (question.type === QuestionType.QRL && question.choices) {
                this.errorMessage = 'Une question de type QRL (ou plusieurs) ne doit pas avoir des choix de réponse';
                return false;
            }

            if (question.type === QuestionType.QCM) {
                for (const choice of question.choices) {
                    if (!this.isChoiceValid(choice)) return false;
                }
            }

            if (question.type === QuestionType.QCM && (this.nbTrueAnswers === 0 || this.nbTrueAnswers === question.choices.length)) {
                this.errorMessage = 'Une question de type QCM ne doit pas posséder des choix seulement vrai ou faux';
                return false;
            }
            this.nbTrueAnswers = 0;
        }
        return true;
    }

    isChoiceValid(choice: Choice) {
        if (!choice) return false;
        if (!choice.text) {
            this.errorMessage = 'The choice must contain a text';
            return false;
        }
        if (choice.isCorrect) this.nbTrueAnswers++;
        return true;
    }
    validateAnswer(quizId: string, questionIndex: number, selectedAnswers: string[]): Observable<Answer> {
        const requestBody = {
            quizId,
            questionIndex,
            selectedAnswers,
        };

        return this.http.post<Answer>(environment.validateAnswerUrl, requestBody);
    }

    filterQuiz(quiz: Quiz) {
        const validQuiz = {
            isVisible: false,
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            duration: quiz.duration,
            questions: quiz.questions,
            lastModification: quiz.lastModification,
        };
        return validQuiz;
    }

    uniqueTitle(newQuiz: Quiz): void {
        if (newQuiz.title.toLowerCase() === 'mode aleatoire') {
            this.isTitleUnique = false;
            return;
        }
        this.quizzesRequestService.loadData();
        this.isTitleUnique = true;
        this.quizzes$ = this.quizzesRequestService.quizzes$;
        this.quizzes$.subscribe({
            next: (quizzes) => {
                for (const quiz of quizzes) {
                    if (quiz.title.toLowerCase() === newQuiz.title.toLowerCase()) {
                        this.isTitleUnique = false;
                        break;
                    }
                }
            },
            error: (error) => {
                throw error;
            },
        });
    }
}
