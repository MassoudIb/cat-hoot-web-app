/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disable some lint to simplify some test
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Question } from '@app/interfaces/question';
import { DialogService } from '@app/services/dialog.service';
import { of, throwError } from 'rxjs';
import { Quiz } from './../../interfaces/quiz';
import { QuizzesRequestService } from './../../services/quizzes-request.service';
import { CreateGamePageComponent } from './create-game-page.component';

const questions: Question[] = [
    {
        type: 'QCM',
        text: 'Question 1',
        points: 50,
        choices: [
            {
                text: '1',
                isCorrect: true,
            },
            {
                text: '2',
                isCorrect: false,
            },
        ],
        lastModified: 'Thu Mar 28 2024 11:14:22 GMT-0400 (Eastern Daylight Time)',
    },
    {
        type: 'QCM',
        text: 'Question 2',
        points: 50,
        choices: [
            {
                text: '5',
                isCorrect: true,
            },
            {
                text: '6',
                isCorrect: false,
            },
        ],
        lastModified: 'Thu Mar 28 2024 11:14:22 GMT-0400 (Eastern Daylight Time)',
    },
    {
        type: 'QCM',
        text: 'Question 3',
        points: 50,
        choices: [
            {
                text: '9',
                isCorrect: true,
            },
            {
                text: '10',
                isCorrect: false,
            },
        ],
        lastModified: 'Thu Mar 28 2024 11:14:22 GMT-0400 (Eastern Daylight Time)',
    },
    {
        type: 'QCM',
        text: 'Question 4',
        points: 50,
        choices: [
            {
                text: '13',
                isCorrect: true,
            },
            {
                text: '14',
                isCorrect: false,
            },
        ],
        lastModified: 'Thu Mar 28 2024 11:14:22 GMT-0400 (Eastern Daylight Time)',
    },
    {
        type: 'QCM',
        text: 'Question 5',
        points: 50,
        choices: [
            {
                text: '17',
                isCorrect: true,
            },
            {
                text: '18',
                isCorrect: false,
            },
        ],
        lastModified: 'Thu Mar 28 2024 11:14:22 GMT-0400 (Eastern Daylight Time)',
    },
];

const quiz: Quiz = {
    id: '1',
    title: 'Quiz 1',
    description: 'Quiz 1 description',
    duration: 10,
    lastModification: '2024-01-30',
    questions: [questions[0]],
    isVisible: true,
};

const invalidQuiz: Quiz = {
    id: '5',
    title: 'Quiz 5',
    description: 'Quiz 5 description',
    duration: 10,
    lastModification: '2024-01-30',
    questions: [questions[0]],
    isVisible: true,
};

const randomQuiz: Quiz = {
    id: 'randomQuiz',
    title: 'Mode aléatoire',
    description: 'Quiz aleatoire',
    duration: 20,
    lastModification: '2024-01-30',
    questions: [],
    isVisible: true,
};

@Component({
    selector: 'app-game-bank',
    template: '',
})
class GameBankMockComponent {
    @Input() quizToDelete: Quiz = quiz;
}

describe('CreateGameComponent', () => {
    let component: CreateGamePageComponent;
    let fixture: ComponentFixture<CreateGamePageComponent>;
    let router: Router;
    let dialogServiceMock: jasmine.SpyObj<DialogService>;
    const quizRequestServiceMock = jasmine.createSpyObj('QuizzesRequestService', ['getQuiz', 'getQuestions', 'saveRandomQuiz']);
    quizRequestServiceMock.getQuiz.and.returnValue(of([quiz]));
    quizRequestServiceMock.getQuestions.and.returnValue(of([questions[0], questions[1], questions[2], questions[3], questions[4]]));
    quizRequestServiceMock.saveRandomQuiz.and.returnValue(of([quiz]));

    beforeEach(async () => {
        quizRequestServiceMock.getQuiz.and.returnValue(of([quiz]));
        quizRequestServiceMock.getQuestions.and.returnValue(of([questions[0], questions[1], questions[2], questions[3], questions[4]]));
        dialogServiceMock = jasmine.createSpyObj('DialogService', ['openUnavailableQuizDialog']);
        await TestBed.configureTestingModule({
            declarations: [CreateGamePageComponent, GameBankMockComponent],
            imports: [RouterTestingModule.withRoutes([]), HttpClientTestingModule],
            providers: [
                { provide: QuizzesRequestService, useValue: quizRequestServiceMock },
                { provide: DialogService, useValue: dialogServiceMock },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(CreateGamePageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set displayedQuiz property when valid quiz is passed', () => {
        component.displayQuizDetails(quiz);
        expect(component.displayedQuiz).not.toBeNull();
        expect(component.displayedQuiz).toEqual(quiz);
        if (component.displayedQuiz !== null) {
            expect(component.displayedQuiz.id).toEqual('1');
            expect(component.displayedQuiz.title).toEqual('Quiz 1');
            expect(component.displayedQuiz.description).toEqual('Quiz 1 description');
            expect(component.displayedQuiz.duration).toEqual(10);
            expect(component.displayedQuiz.lastModification).toEqual('2024-01-30');
            expect(component.displayedQuiz.questions).toEqual([questions[0]]);
            expect(component.displayedQuiz.isVisible).toEqual(true);
        }
    });

    it('should set displayedQuiz and isRandomQuiz property when a random quiz is passed', () => {
        component.displayQuizDetails(randomQuiz);
        expect(component.displayedQuiz).not.toBeNull();
        expect(component.displayedQuiz).toEqual(randomQuiz);
    });

    it('should set displayedQuiz property to null when null quiz is passed', () => {
        component.displayQuizDetails(null);
        expect(component.displayedQuiz).toBeNull();
    });

    it('should set displayedQuiz property to null when undefined quiz is passed', () => {
        component.displayQuizDetails(undefined);
        expect(component.displayedQuiz).toBeNull();
    });

    it('should display a matDialog and set properties when the selected quiz is invalid', () => {
        quizRequestServiceMock.getQuiz.and.returnValue(of(null));
        component.checkQuizAvailability(quiz, true);
        expect(dialogServiceMock.openUnavailableQuizDialog).toHaveBeenCalled();
        expect(component.unavailableQuiz).toEqual(quiz);
        expect(component.displayedQuiz).toEqual(null);
    });

    it('should catchError and display a matDialog and set properties when the getQuiz method causes an error', () => {
        const mockError = new Error('Quiz not found');
        quizRequestServiceMock.getQuiz.and.returnValue(throwError(() => mockError));
        component.checkQuizAvailability(invalidQuiz, true);
        expect(dialogServiceMock.openUnavailableQuizDialog).toHaveBeenCalled();
        expect(component.unavailableQuiz).toEqual(invalidQuiz);
        expect(component.displayedQuiz).toEqual(null);
    });

    it('should route to the vueAttente if a valid quiz as been selected to start a game', () => {
        quizRequestServiceMock.getQuiz.and.returnValue(of(quiz));
        spyOn(router, 'navigate');
        component.checkQuizAvailability(quiz, true);
        expect(router.navigate).toHaveBeenCalledWith([`/vueAttenteOrg/${quiz.id}?id=${component.gameId}`]);
    });

    it('should route to the player component if a valid quiz as been selected to test a game', () => {
        quizRequestServiceMock.getQuiz.and.returnValue(of(quiz));
        spyOn(router, 'navigate');
        component.checkQuizAvailability(quiz, false);
        expect(router.navigate).toHaveBeenCalledWith(['/player', Object({ quizId: quiz.id, isTest: true })]);
    });

    it('should route to the vueAttente with the randomQuiz id if a valid random quiz as been selected to start a game', () => {
        spyOn(router, 'navigate');
        component.displayQuizDetails(randomQuiz);
        component.checkQuizAvailability(randomQuiz, true);
        expect(router.navigate).toHaveBeenCalledWith([`/vueAttenteOrg/randomQuiz?id=${component.gameId}`]);
    });

    it('should return an array of questions thats different than the previous array with length equal to MIN_RANDOM_QUESTIONS', () => {
        const questionArray: Question[] = [
            { type: 'QCM', text: 'Question 1', points: 1, choices: [], lastModified: '' },
            { type: 'QCM', text: 'Question 2', points: 1, choices: [], lastModified: '' },
            { type: 'QCM', text: 'Question 3', points: 1, choices: [], lastModified: '' },
            { type: 'QCM', text: 'Question 4', points: 1, choices: [], lastModified: '' },
            { type: 'QCM', text: 'Question 5', points: 1, choices: [], lastModified: '' },
            { type: 'QCM', text: 'Question 6', points: 1, choices: [], lastModified: '' },
        ];
        const spyRandom = spyOn(Math, 'random');
        const spyFloor = spyOn(Math, 'floor');

        const result = component.randomizeQuestions(questionArray);
        expect(result.length).toBe(5);
        expect(spyRandom).toHaveBeenCalledTimes(5);
        expect(spyFloor).toHaveBeenCalledTimes(5);
    });
});
