/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-lines */
// we disable some lint to simplify some test
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { Quiz } from './../interfaces/quiz';
import { QuizzesRequestService } from './quizzes-request.service';

const apiQuizzes: Quiz[] = [
    { id: '1', title: 'Quiz 1', description: 'Test quiz 1', duration: 10, isVisible: true, lastModification: '2024-01-30', questions: [] },
    { id: '2', title: 'Quiz 2', description: 'Test quiz 2', duration: 10, isVisible: true, lastModification: '2024-01-30', questions: [] },
    { id: '3', title: 'Quiz 3', description: 'Test quiz 3', duration: 10, isVisible: false, lastModification: '2024-01-30', questions: [] },
    {
        id: '4',
        title: 'Quiz 3',
        description: 'Description',
        lastModification: '2018-11-13T20:20:39+00:00',
        duration: 10,
        questions: [
            {
                type: 'QCM',
                text: 'Test',
                points: 40,
                choices: [
                    { text: 'Choice1', isCorrect: true },
                    { text: 'Choice2', isCorrect: false },
                ],
                lastModified: '',
            },
        ],
    },
];
const testQuiz: Quiz = {
    isVisible: false,
    id: '3f0d12a4-17d3-4c43-822c-0684d3f88a3f',
    title: 'Example Quiz',
    description: 'This is an example quiz',
    duration: 30,
    lastModification: '2024-02-11T16:35:37.527Z',
    questions: [
        {
            text: 'Question 1',
            type: 'QCM',
            points: 1,
            lastModified: '',
            choices: [
                { text: 'Choice 1', isCorrect: true },
                { text: 'Choice 2', isCorrect: false },
                { text: 'Choice 3', isCorrect: false },
            ],
        },
    ],
};

const randomTestQuiz: Quiz = {
    isVisible: false,
    id: 'randomQuiz%3Fid%3D12345',
    title: 'Example Random Quiz',
    description: 'This is an example random quiz',
    duration: 30,
    lastModification: '2024-02-11T16:35:37.527Z',
    questions: [
        {
            text: 'Question 1',
            type: 'QCM',
            points: 1,
            lastModified: '',
            choices: [
                { text: 'Choice 1', isCorrect: true },
                { text: 'Choice 2', isCorrect: false },
                { text: 'Choice 3', isCorrect: false },
            ],
        },
    ],
};

describe('QuizzesRequestService', () => {
    let service: QuizzesRequestService;
    let httpTestingController: HttpTestingController;
    let router: Router;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [QuizzesRequestService],
            imports: [HttpClientTestingModule, RouterTestingModule],
        });
        service = TestBed.inject(QuizzesRequestService);
        httpTestingController = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
    it('should retrieve quizzes when doing a GET request to the API', () => {
        service.getQuizzes().subscribe((quizzes) => {
            expect(quizzes.length).toBe(3);
            expect(quizzes.length).toBe(1);
            expect(quizzes).toEqual(apiQuizzes);
        });

        const req = httpTestingController.match(environment.databaseQuizzesUrl);
        expect(req[0].request.method).toEqual('GET');
        req[0].flush(apiQuizzes);
        httpTestingController.verify();
    });
    it('should return the correct Quiz object when given a valid id', () => {
        const quizId = '3f0d12a4-17d3-4c43-822c-0684d3f88a3f';
        service.getQuiz(quizId).subscribe((quiz) => {
            expect(quiz).toEqual(testQuiz);
        });
        const req = httpTestingController.match(`${environment.databaseQuizzesUrl}/${quizId}`);
        expect(req[0].request.method).toEqual('GET');
        req[0].flush(testQuiz);

        service.getQuiz(randomTestQuiz.id).subscribe((quiz) => {
            expect(quiz).toEqual(randomTestQuiz);
        });
    });
    it('should handle error when the id does not exist', () => {
        const quizId = '54';
        service.getQuiz(quizId).subscribe({
            next: () => fail('should have failed with error 500'),
            error: (error) => {
                expect(error).toBeTruthy();
            },
        });

        const req = httpTestingController.match(`${environment.databaseQuizzesUrl}/${quizId}`);
        expect(req[0].request.method).toEqual('GET');
        req[0].flush(null, { status: 500, statusText: 'Server Error' });
    });
    it('should return an observable of quizzes filtered by isVisible property', () => {
        service.getVisibleQuizzes().subscribe((visibleQuizzes) => {
            expect(visibleQuizzes).toEqual(apiQuizzes.filter((quiz) => quiz.isVisible === true));
        });
        const req = httpTestingController.match(environment.databaseQuizzesUrl);
        expect(req[0].request.method).toEqual('GET');
        req[0].flush(apiQuizzes);
    });

    it('should find the quiz specified by quizIs', () => {
        const quizId = apiQuizzes[1].id;
        const expectedQuizzes = apiQuizzes[1];
        service.quizzesSubject.next(apiQuizzes);
        service.findSelectedQuiz(quizId).subscribe((selectedQuiz) => {
            expect(selectedQuiz).toEqual(expectedQuizzes);
        });
    });

    it('should load the data from the database', () => {
        service.loadData();
        const req = httpTestingController.match(`${environment.databaseQuizzesUrl}`);
        expect(req[0].request.method).toEqual('GET');
        req[0].flush(apiQuizzes);
        service.quizzes$.subscribe((loadedQuizzes) => {
            expect(loadedQuizzes).toEqual(apiQuizzes);
        });
    });

    it('should handle and return an empty array if the HTTP response is empty', () => {
        const expectedQuestions: Quiz['questions'] = [];
        spyOn(service['http'], 'get').and.returnValue(of(expectedQuestions));
        const result = service.getQuestions();

        result.subscribe((questions) => {
            expect(questions).toEqual(expectedQuestions);
        });
    });

    it('should use router to navigate to the correct route', () => {
        const navigateSpy = spyOn(router, 'navigate');
        service.goPageCreateGame();
        expect(navigateSpy).toHaveBeenCalledWith(['/createGame']);
    });

    it('should save a random quiz to the database', () => {
        const randomQuiz = testQuiz;
        service.saveRandomQuiz(randomQuiz).subscribe((quiz) => {
            expect(quiz).toEqual(randomQuiz);
        });
        const req = httpTestingController.expectOne(`${environment.databaseRandomQuizzesUrl}`);
        expect(req.request.method).toEqual('POST');
        req.flush(randomQuiz);
    });
    it('should handle error when saving an edited or a new quiz', () => {
        const incompleteQuiz: Partial<Quiz> = {};
        service.saveRandomQuiz(incompleteQuiz as Quiz).subscribe({
            next: () => fail('should have failed with error 500'),
            error: (error) => {
                expect(error).toBeTruthy();
            },
        });
        const req = httpTestingController.expectOne(`${environment.databaseRandomQuizzesUrl}`);
        expect(req.request.method).toEqual('POST');
        req.flush(null, { status: 500, statusText: 'Server Error' });
    });

    it('should send a DELETE request to the correct URL with the provided quizId parameter', () => {
        const quizId = testQuiz.id;
        service.deleteRandomQuiz(quizId).subscribe((quiz) => {
            expect(quiz).toEqual(testQuiz);
        });
        const req = httpTestingController.expectOne(`${environment.databaseRandomQuizzesUrl}/${quizId}`);
        expect(req.request.method).toEqual('DELETE');
        req.flush(testQuiz);
    });
    it('should handle error when deleting quiz', () => {
        const quizId = '123';
        service.deleteRandomQuiz(quizId).subscribe({
            next: () => fail('should have failed with error 500'),
            error: (error) => {
                expect(error).toBeTruthy();
            },
        });
        const req = httpTestingController.expectOne(`${environment.databaseRandomQuizzesUrl}/${quizId}`);
        expect(req.request.method).toEqual('DELETE');
        req.flush(null, { status: 500, statusText: 'Server Error' });
    });

    it('should return an observable of GameHistoryEntry array when given valid sortBy and sortOrder parameters', () => {
        const sortBy = 'time';
        const sortOrder = 'asc';
        service.getGameHistory(sortBy, sortOrder).subscribe((history) => {
            expect(history).toEqual([]);
        });
        const req = httpTestingController.expectOne(`${environment.databaseHistoryUrl}/?sortBy=${sortBy}&sortOrder=${sortOrder}`);
        expect(req.request.method).toEqual('GET');
        req.flush([]);
    });

    it('should successfully delete game history from the database', () => {
        const httpSpy = spyOn(service['http'], 'delete').and.returnValue(of(null));

        service.resetGameHistory().subscribe(() => {
            expect(httpSpy).toHaveBeenCalledWith(`${environment.databaseHistoryUrl}/`);
        });
    });
});
