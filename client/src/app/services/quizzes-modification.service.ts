import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { INVALID_ID } from '@app/constants/validate-data';
import { Question } from '@app/interfaces/question';
import { Quiz } from '@app/interfaces/quiz';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment.prod';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
    providedIn: 'root',
})
export class QuizzesModificationService {
    quizzesSubject: BehaviorSubject<Quiz[]> = new BehaviorSubject<Quiz[]>([]);
    quizzes$: Observable<Quiz[]> = this.quizzesSubject.asObservable();
    errorMessage: string;
    isTitleUnique: boolean = true;
    nbTrueAnswers: number = 0;
    selectedQuiz: Quiz | undefined;
    isDuplicateTitle: boolean = false;
    duplicateTitle: string = '';
    minDuration: number = 0;

    constructor(private http: HttpClient) {}

    addQuestion(question: Question): Observable<object> {
        this.updateLastModificationQuestion(question);
        return this.http.post(environment.databaseQuestionsUrl.replace('question-examples', 'questions'), question);
    }

    updateQuestion(question: Question, questionUpdate: Question): Observable<object> {
        this.updateLastModificationQuestion(questionUpdate);
        return this.http.put(environment.databaseQuestionsUrl.replace('question-examples', 'questions'), { question, questionUpdate });
    }

    updateQuizVisibility(quizId: string, isVisible: boolean): Observable<Quiz[]> {
        return this.http.patch<Quiz[]>(`${environment.databaseQuizzesUrl}/${quizId}`, { isVisible }).pipe(
            catchError((error) => {
                throw error;
            }),
        );
    }

    saveEditedQuiz(editedQuiz: Quiz): Observable<Quiz> {
        this.updateLastModification(editedQuiz);
        return this.http.put<Quiz>(`${environment.databaseQuizzesUrl}`, editedQuiz).pipe(
            tap((updatedQuiz) => {
                const currentQuizzes = this.quizzesSubject.value;
                const index = currentQuizzes.findIndex((quiz) => quiz.id === updatedQuiz.id);
                if (index !== INVALID_ID) {
                    currentQuizzes[index] = updatedQuiz;
                    this.quizzesSubject.next(currentQuizzes);
                }
            }),
            catchError((error) => {
                throw error;
            }),
        );
    }

    saveNewQuiz(newQuiz: Quiz): Observable<Quiz> {
        this.updateAttributes(newQuiz);
        return this.http.post<Quiz>(`${environment.databaseQuizzesUrl}`, newQuiz).pipe(
            tap((savedQuiz) => {
                const currentQuizzes = this.quizzesSubject.value;
                this.quizzesSubject.next([...currentQuizzes, savedQuiz]);
            }),
            catchError((error) => {
                throw error;
            }),
        );
    }

    deleteQuiz(quizId: string): Observable<Quiz[]> {
        return this.http.delete<Quiz[]>(`${environment.databaseQuizzesUrl}/${quizId}`).pipe(
            catchError((error) => {
                throw error;
            }),
        );
    }

    deleteQuestion(question: Question): Observable<object> {
        return this.http.delete(environment.databaseQuestionsUrl.replace('question-examples', 'questions'), { body: question });
    }

    private updateAttributes(quiz: Quiz) {
        // quiz.id = crypto.randomUUID(); This line generates an error with the deployment when we use http
        quiz.id = uuidv4();
        this.updateLastModification(quiz);
    }
    private updateLastModification(quiz: Quiz) {
        const currentDate = new Date();
        quiz.lastModification = currentDate.toISOString();
    }
    private updateLastModificationQuestion(question: Question) {
        const currentDate = new Date();
        question.lastModified = currentDate.toString();
    }
}
