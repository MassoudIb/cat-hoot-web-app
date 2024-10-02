import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { GameHistoryEntry } from '@app/interfaces/history';
import { Quiz } from '@app/interfaces/quiz';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment.prod';

@Injectable({
    providedIn: 'root',
})
export class QuizzesRequestService {
    quizzesSubject: BehaviorSubject<Quiz[]> = new BehaviorSubject<Quiz[]>([]);
    quizzes$: Observable<Quiz[]> = this.quizzesSubject.asObservable();
    selectedQuizId: string;
    duplicateTitle: string = '';
    minDuration: number = 0;

    constructor(
        private http: HttpClient,
        private router: Router,
    ) {
        this.loadData();
    }
    getQuizzes(): Observable<Quiz[]> {
        return this.http.get<Quiz[]>(environment.databaseQuizzesUrl);
    }

    getQuiz(id: string): Observable<Quiz> {
        let urlWithId: string;
        if (id.includes('randomQuiz')) {
            const randomQuizId = id.split('id=')[1];
            urlWithId = `${environment.databaseRandomQuizzesUrl}/${randomQuizId}`;
        } else urlWithId = `${environment.databaseQuizzesUrl}/${id}`;
        return this.http.get<Quiz>(urlWithId).pipe(
            catchError((error) => {
                throw error;
            }),
        );
    }

    getQuestions(): Observable<Quiz['questions']> {
        return this.http.get<Quiz['questions']>(environment.databaseQuestionsUrl);
    }

    getVisibleQuizzes(): Observable<Quiz[]> {
        return this.getQuizzes().pipe(map((quizzes) => quizzes.filter((quiz) => quiz.isVisible)));
    }

    findSelectedQuiz(quizId: string): Observable<Quiz | undefined> {
        return this.quizzes$.pipe(map((quizzes) => quizzes.find((quiz) => quiz.id === quizId)));
    }

    loadData() {
        this.http.get<Quiz[]>(environment.databaseQuizzesUrl).subscribe((data) => {
            this.quizzesSubject.next(data);
        });
    }

    goPageCreateGame() {
        this.router.navigate(['/createGame']);
    }

    getGameHistory(sortBy: string, sortOrder: 'asc' | 'desc'): Observable<GameHistoryEntry[]> {
        const url = `${environment.databaseHistoryUrl}/?sortBy=${sortBy}&sortOrder=${sortOrder}`;
        return this.http.get<GameHistoryEntry[]>(url);
    }

    resetGameHistory(): Observable<void> {
        return this.http.delete<void>(`${environment.databaseHistoryUrl}/`);
    }

    saveRandomQuiz(randomQuiz: Quiz): Observable<Quiz> {
        return this.http.post<Quiz>(`${environment.databaseRandomQuizzesUrl}`, randomQuiz).pipe(
            catchError((error) => {
                throw error;
            }),
        );
    }

    deleteRandomQuiz(quizId: string): Observable<Quiz> {
        return this.http.delete<Quiz>(`${environment.databaseRandomQuizzesUrl}/${quizId}`).pipe(
            catchError((error) => {
                throw error;
            }),
        );
    }
}
