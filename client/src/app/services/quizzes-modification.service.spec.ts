/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines */
// we disable some lint to simplify some test
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Question } from '@app/interfaces/question';
import { environment } from 'src/environments/environment.prod';
import { Quiz } from './../interfaces/quiz';
import { QuizzesModificationService } from './quizzes-modification.service';

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
const expectedQuizVisibility: Quiz = {
    isVisible: true,
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

const question: Question = {
    text: 'Test question',
    type: 'QCM',
    points: 1,
    lastModified: '',
    choices: [
        { text: 'Choice 1', isCorrect: true },
        { text: 'Choice 2', isCorrect: false },
    ],
};
describe('QuizzesModificationService', () => {
    let service: QuizzesModificationService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [QuizzesModificationService],
            imports: [HttpClientTestingModule, RouterTestingModule],
        });
        service = TestBed.inject(QuizzesModificationService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should update the visibility of a quiz with a valid quizId and isVisible value', () => {
        const quizId = '3f0d12a4-17d3-4c43-822c-0684d3f88a3f';
        const isVisible = true;
        service.updateQuizVisibility(quizId, isVisible).subscribe({
            next: (response) => {
                expect(response[0]).toEqual(expectedQuizVisibility);
                expect(response[0].id).toBe(quizId);
                expect(response[0].isVisible).toBe(isVisible);
            },
            error: () => {
                fail('Error updating quiz visibility');
            },
        });
        const req = httpTestingController.expectOne(`${environment.databaseQuizzesUrl}/${quizId}`);
        expect(req.request.method).toEqual('PATCH');
        req.flush([expectedQuizVisibility]);
    });

    it('should send a DELETE request to the correct URL with the given quizId', () => {
        const quizId = apiQuizzes[0].id;
        service.deleteQuiz(quizId).subscribe();
        const req = httpTestingController.match(`${environment.databaseQuizzesUrl}/${quizId}`);
        expect(req[0].request.method).toEqual('DELETE');
        req[0].flush({ id: quizId });
    });
    it('should handle error when deleting quiz', () => {
        const quizId = '123';
        service.deleteQuiz(quizId).subscribe({
            next: () => fail('should have failed with error 500'),
            error: (error) => {
                expect(error).toBeTruthy();
            },
        });
        const req = httpTestingController.expectOne(`${environment.databaseQuizzesUrl}/${quizId}`);
        expect(req.request.method).toEqual('DELETE');
        req.flush(null, { status: 500, statusText: 'Server Error' });
    });
    it('should delete a quiz and check if the apiQuizzes is shorter by one', () => {
        const quizId = apiQuizzes[0].id;
        const expectedQuizzes = apiQuizzes.filter((quiz) => quiz.id !== quizId);
        service.deleteQuiz(quizId).subscribe({
            next: (quizzes) => expect(quizzes.length).toBe(3),
            error: () => fail('Should not have failed'),
        });
        const req = httpTestingController.expectOne(`${environment.databaseQuizzesUrl}/${quizId}`);
        expect(req.request.method).toEqual('DELETE');
        req.flush(expectedQuizzes);
    });

    it('should handle error when updating visibility', () => {
        const quizId = '123';
        service.updateQuizVisibility(quizId, true).subscribe({
            next: () => fail('should have failed with error 500'),
            error: (error) => {
                expect(error).toBeTruthy();
            },
        });
        const req = httpTestingController.expectOne(`${environment.databaseQuizzesUrl}/${quizId}`);
        expect(req.request.method).toEqual('PATCH');
        req.flush(null, { status: 500, statusText: 'Server Error' });
    });
    it('should handle error when saving an edited or a new quiz', () => {
        const incompleteQuiz: Partial<Quiz> = {};

        service.saveEditedQuiz(incompleteQuiz as Quiz).subscribe({
            next: () => fail('should have failed with error 400'),
            error: (error) => {
                expect(error).toBeTruthy();
            },
        });

        const reqEditedQuiz = httpTestingController.expectOne(`${environment.databaseQuizzesUrl}`);
        expect(reqEditedQuiz.request.method).toEqual('PUT');
        reqEditedQuiz.flush(null, { status: 400, statusText: 'Server Error' });

        service.saveNewQuiz(incompleteQuiz as Quiz).subscribe({
            next: () => fail('should have failed with error 500'),
            error: (error) => {
                expect(error).toBeTruthy();
            },
        });

        const reqNewQuiz = httpTestingController.expectOne(`${environment.databaseQuizzesUrl}`);
        expect(reqNewQuiz.request.method).toEqual('POST');
        reqNewQuiz.flush(null, { status: 500, statusText: 'Server Error' });
    });

    it('should send an HTTP PUT request to the correct URL with the updated quiz object', () => {
        service.saveEditedQuiz(testQuiz).subscribe();
        const req = httpTestingController.expectOne(`${environment.databaseQuizzesUrl}`);
        expect(req.request.method).toEqual('PUT');
        expect(req.request.body).toEqual(testQuiz);
        req.flush(testQuiz);
    });
    it('should send an HTTP POST request to the correct URL with the new quiz object', () => {
        const newQuiz: Quiz = {
            id: '1',
            title: 'New Quiz',
            description: 'This is a new quiz',
            duration: 10,
            isVisible: true,
            lastModification: '2024-03-18',
            questions: [],
        };

        service.saveNewQuiz(newQuiz).subscribe((savedQuiz) => {
            expect(savedQuiz).toEqual(newQuiz);

            const currentQuizzes = service.quizzesSubject.value;
            expect(currentQuizzes).toContain(savedQuiz);
        });

        const req = httpTestingController.expectOne(environment.databaseQuizzesUrl);
        expect(req.request.method).toEqual('POST');
        expect(req.request.body).toEqual(newQuiz);

        req.flush(newQuiz);
    });

    it('should update quizzesSubject with the updated quiz', () => {
        const initialQuizzes: Quiz[] = [
            { id: '1', title: 'Quiz 1', description: 'Test quiz 1', duration: 10, isVisible: true, lastModification: '2024-01-30', questions: [] },
            { id: '2', title: 'Quiz 2', description: 'Test quiz 2', duration: 10, isVisible: true, lastModification: '2024-01-30', questions: [] },
        ];
        service.quizzesSubject.next(initialQuizzes);
        const updatedQuiz: Quiz = {
            id: '2',
            title: 'Updated Quiz 2',
            description: 'Updated test quiz 2',
            duration: 15,
            isVisible: false,
            lastModification: '2024-03-19T05:40:51.748Z',
            questions: [],
        };
        service.saveEditedQuiz(updatedQuiz).subscribe();
        const req = httpTestingController.expectOne(`${environment.databaseQuizzesUrl}`);
        expect(req.request.method).toEqual('PUT');
        expect(req.request.body).toEqual(updatedQuiz);
        req.flush(updatedQuiz);

        service.quizzesSubject.subscribe((quizzes) => {
            const index = quizzes.findIndex((q) => q.id === updatedQuiz.id);
            expect(index).toBeGreaterThan(-1);

            expect(quizzes[index].title).toEqual(updatedQuiz.title);
            expect(quizzes[index].description).toEqual(updatedQuiz.description);
            expect(quizzes[index].duration).toEqual(updatedQuiz.duration);
            expect(quizzes[index].isVisible).toEqual(updatedQuiz.isVisible);
            expect(quizzes[index].lastModification).toEqual(updatedQuiz.lastModification);
        });
    });

    it('should send a POST request to the correct URL with the provided question object', () => {
        const expectedUrl = 'http://ec2-35-183-205-174.ca-central-1.compute.amazonaws.com:3000/api/quiz/questions';

        service.addQuestion(question).subscribe();
        const req = httpTestingController.expectOne(expectedUrl);
        expect(req.request.method).toEqual('POST');
        expect(req.request.body).toEqual(question);
    });

    it('should send a DELETE request to the correct URL with the question object as the body', () => {
        const expectedUrl = 'http://ec2-35-183-205-174.ca-central-1.compute.amazonaws.com:3000/api/quiz/questions';

        service.deleteQuestion(question).subscribe((response) => {
            expect(response).toBeTruthy();
        });

        const req = httpTestingController.expectOne(expectedUrl);
        expect(req.request.method).toEqual('DELETE');
        expect(req.request.body).toEqual(question);
        req.flush({});
    });

    it('should update the question with the provided questionUpdate object', () => {
        const expectedUrl = 'http://ec2-35-183-205-174.ca-central-1.compute.amazonaws.com:3000/api/quiz/questions';
        const questionUpdate: Question = {
            text: 'Updated question',
            type: 'QCM',
            points: 2,
            lastModified: '',
            choices: [
                { text: 'Updated choice 1', isCorrect: true },
                { text: 'Updated choice 2', isCorrect: false },
            ],
        };
        service.updateQuestion(question, questionUpdate).subscribe();
        const req = httpTestingController.expectOne(expectedUrl);
        expect(req.request.method).toEqual('PUT');
        expect(req.request.body).toEqual({ question, questionUpdate });
    });
});
