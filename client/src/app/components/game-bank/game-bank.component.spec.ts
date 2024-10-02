/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disabled magic number because we didn't want to over saturate are constants file
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { Question } from '@app/interfaces/question';
import { DialogService } from '@app/services/dialog.service';
import { of, throwError } from 'rxjs';
import { Quiz } from './../../interfaces/quiz';
import { QuizzesRequestService } from './../../services/quizzes-request.service';
import { GameBankComponent } from './game-bank.component';

const quizzes: Quiz[] = [
    {
        id: '1',
        title: 'Quiz 1',
        description: 'Quiz 1 description',
        duration: 10,
        lastModification: '2024-01-30',
        questions: [],
        isVisible: true,
    },
    {
        id: '2',
        title: 'Quiz 2',
        description: 'Quiz 2 description',
        duration: 10,
        lastModification: '2024-02-30',
        questions: [],
        isVisible: false,
    },
    {
        id: '3',
        title: 'Mode aléatoire',
        description: 'Quiz 3 description',
        duration: 10,
        lastModification: '2024-03-30',
        questions: [],
        isVisible: true,
    },
];

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
            {
                text: '3',
                isCorrect: false,
            },
            {
                text: '4',
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
            {
                text: '7',
                isCorrect: false,
            },
            {
                text: '8',
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
            {
                text: '11',
                isCorrect: false,
            },
            {
                text: '12',
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
            {
                text: '15',
                isCorrect: false,
            },
            {
                text: '16',
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
            {
                text: '19',
                isCorrect: false,
            },
            {
                text: '20',
                isCorrect: false,
            },
        ],
        lastModified: 'Thu Mar 28 2024 11:14:22 GMT-0400 (Eastern Daylight Time)',
    },
];

describe('GameBankComponent', () => {
    let component: GameBankComponent;
    let fixture: ComponentFixture<GameBankComponent>;
    let dialogServiceMock: jasmine.SpyObj<DialogService>;
    const mockError = new Error('Quiz not found');
    const quizRequestServiceMock = jasmine.createSpyObj('QuizzesRequestService', ['getVisibleQuizzes', 'getQuiz', 'getQuestions']);
    quizRequestServiceMock.getQuiz.and.callFake((id: string) =>
        id === quizzes[1].id ? throwError(() => mockError) : of(quizzes.find((quiz) => quiz.id === id)),
    );

    beforeEach(() => {
        quizRequestServiceMock.getVisibleQuizzes.and.returnValue(of([quizzes[0], quizzes[2]]));
        quizRequestServiceMock.getQuestions.and.returnValue(of([questions[0]]));
        dialogServiceMock = jasmine.createSpyObj('DialogService', ['openUnavailableQuizDialog']);
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            declarations: [GameBankComponent],
            providers: [
                HttpClientTestingModule,
                { provide: QuizzesRequestService, useValue: quizRequestServiceMock },
                { provide: DialogService, useValue: dialogServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameBankComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set selectedQuiz property to chosen quiz object when the random quiz is chosen', () => {
        quizzes[1].title = 'Mode aléatoire';
        spyOn(component.newQuizEvent, 'emit');
        component.selectQuiz(quizzes[1], 1);
        expect(component.selectedQuiz).toEqual(quizzes[1]);
        expect(component.selectedIndex).toEqual(1);
        expect(component.newQuizEvent.emit).toHaveBeenCalledWith(quizzes[1]);
        quizzes[1].title = 'Quiz 2';
    });

    it('should set selectedQuiz property to chosen quiz object', () => {
        spyOn(component.newQuizEvent, 'emit');
        component.selectQuiz(quizzes[0], 0);
        expect(quizRequestServiceMock.getQuiz).toHaveBeenCalled();
        expect(component.selectedQuiz).toEqual(quizzes[0]);
        expect(component.selectedIndex).toEqual(0);
        expect(component.newQuizEvent.emit).toHaveBeenCalledWith(quizzes[0]);
    });

    it('should filter out the clicked quiz, display a dialog and decrement selectedIndex', () => {
        component.selectedIndex = 2;
        component.selectQuiz(quizzes[1], 1);
        expect(component.visibleQuizzes).not.toContain(quizzes[1]);
        expect(component.visibleQuizzes.length).toEqual(2);
        expect(dialogServiceMock.openUnavailableQuizDialog).toHaveBeenCalled();
        expect(component.selectedIndex).toEqual(1);
    });

    it('should filter out the clicked quiz, display a dialog and not decrement selectedIndex', () => {
        component.selectedIndex = 1;
        component.selectQuiz(quizzes[1], 1);
        expect(component.visibleQuizzes).not.toContain(quizzes[1]);
        expect(component.visibleQuizzes.length).toEqual(2);
        expect(dialogServiceMock.openUnavailableQuizDialog).toHaveBeenCalled();
        expect(component.selectedIndex).toEqual(1);
    });

    it('should call getQuizzes and getQuestions method of QuizzesRequestService', fakeAsync(() => {
        component.ngOnInit();
        tick();
        expect(quizRequestServiceMock.getVisibleQuizzes).toHaveBeenCalled();
        expect(quizRequestServiceMock.getQuestions).toHaveBeenCalled();
        expect(component.visibleQuizzes.length).toEqual(2);
        expect(component.qcmQuestions.length).toEqual(1);
        expect(component.visibleQuizzes[0].isVisible).toEqual(true);
    }));

    it('should call randomize question and append randomQuiz when theres 5 QCM questions', fakeAsync(() => {
        quizRequestServiceMock.getQuestions.and.returnValue(of([questions[0], questions[1], questions[2], questions[3], questions[4]]));
        component.ngOnInit();
        tick();
        expect(quizRequestServiceMock.getVisibleQuizzes).toHaveBeenCalled();
        expect(quizRequestServiceMock.getQuestions).toHaveBeenCalled();
        expect(component.qcmQuestions.length).toEqual(5);
        expect(component.visibleQuizzes.length).toEqual(3);
        expect(component.visibleQuizzes[0].isVisible).toEqual(true);
        flush();
    }));

    it('should set selectedQuiz property to null with invalid index', () => {
        component.selectQuiz(quizzes[0], -1);
        expect(component.selectedQuiz).toBeNull();
        component.selectQuiz(quizzes[0], 4);
        expect(component.selectedQuiz).toBeNull();
    });

    it('should call updateVisibleQuizzes method when quizToDelete property changes', () => {
        const spyUpdate = spyOn(component, 'updateVisibleQuizzes');
        const mockChanges = {
            quizToDelete: new SimpleChange(null, quizzes[0], true),
        };
        component.ngOnChanges(mockChanges);
        expect(spyUpdate).toHaveBeenCalled();
    });
});
