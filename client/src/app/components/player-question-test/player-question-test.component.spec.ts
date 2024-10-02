import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
    ComponentFixture,
    TestBed /* , discardPeriodicTasks, fakeAsync, flush, tick*/,
    discardPeriodicTasks,
    fakeAsync,
    flush,
    tick,
    waitForAsync,
} from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { POINT_BONUS } from '@app/constants/player-question';
import { SIXTY_SECOND, THREE_SECONDS_WAITING } from '@app/constants/time';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { QuizzesValidationService } from '@app/services/quizzes-validation.service';
import { of } from 'rxjs';
import { TimeService } from './../../services/time.service';
import { PlayerQuestionTestComponent } from './player-question-test.component';

describe('PlayerQuestionTestComponent', () => {
    let component: PlayerQuestionTestComponent;
    let fixture: ComponentFixture<PlayerQuestionTestComponent>;
    let quizzesRequestService: QuizzesRequestService;
    let quizzesValidationService: QuizzesValidationService;
    let timeService: TimeService;
    // let ngZone: NgZone;

    beforeEach(waitForAsync(() => {
        const activatedRouteMock = {
            params: of({ quizId: '1a2b3c' }),
        };

        TestBed.configureTestingModule({
            declarations: [PlayerQuestionTestComponent],
            imports: [HttpClientTestingModule, RouterTestingModule],
            providers: [QuizzesRequestService, QuizzesValidationService, TimeService, { provide: ActivatedRoute, useValue: activatedRouteMock }],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PlayerQuestionTestComponent);
        component = fixture.componentInstance;
        quizzesRequestService = TestBed.inject(QuizzesRequestService);
        quizzesValidationService = TestBed.inject(QuizzesValidationService);
        timeService = TestBed.inject(TimeService);

        component.isAInputActive = true;
        component.currentQuestionIndex = 0;
        component.quizData = [
            {
                id: '1a2b3c',
                title: 'Titre',
                description: 'Description',
                lastModification: '2018-11-13T20:20:39+00:00',
                duration: 10,
                questions: [
                    {
                        type: 'QCM',
                        lastModified: '',
                        text: 'Test',
                        points: 40,
                        choices: [
                            { text: 'Choice1', isCorrect: true },
                            { text: 'Choice2', isCorrect: false },
                            { text: 'Choice3', isCorrect: true },
                        ],
                    },
                    {
                        type: 'QCM',
                        lastModified: '',
                        text: 'Test2',
                        points: 20,
                        choices: [{ text: 'Choice4', isCorrect: true }],
                    },
                ],
            },
        ];
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
        expect(quizzesValidationService).toBeTruthy();
        expect(timeService).toBeTruthy();
    });

    it('should handle timer expiration event correctly', () => {
        const mockResponse = { isValid: true };
        const mockQuizId = '1a2b3c';
        const mockQuestionIndex = 0;
        component.selectedAnswers = ['Choice1', 'Choice2'];
        spyOn(timeService, 'stopTimer').and.callThrough();
        const validateAnswerSpy = spyOn(quizzesValidationService, 'validateAnswer').and.returnValue(of(mockResponse));
        component.setupTimer();
        timeService.timerExpired.next();
        expect(component.isQuestionFinished).toBe(true);
        expect(validateAnswerSpy).toHaveBeenCalledWith(mockQuizId, mockQuestionIndex, component.selectedAnswers);
        expect(component.isCorrectAnswer).toBe('Correct');
        expect(timeService.stopTimer).toHaveBeenCalled();

        jasmine.clock().install();
        jasmine.clock().tick(THREE_SECONDS_WAITING);
        expect(component.selectedAnswers).toEqual([]);
        jasmine.clock().uninstall();
    });
    it('should handle timer expiration event correctly', () => {
        const mockResponse = { isValid: false };
        const mockQuizId = '1a2b3c';
        const mockQuestionIndex = 0;
        component.selectedAnswers = ['Choice1', 'Choice2'];
        spyOn(timeService, 'stopTimer').and.callThrough();
        const validateAnswerSpy = spyOn(quizzesValidationService, 'validateAnswer').and.returnValue(of(mockResponse));
        component.setupTimer();
        timeService.timerExpired.next();
        expect(component.isQuestionFinished).toBe(true);
        expect(validateAnswerSpy).toHaveBeenCalledWith(mockQuizId, mockQuestionIndex, component.selectedAnswers);
        expect(component.isCorrectAnswer).toBe('Incorrect');
        expect(timeService.stopTimer).toHaveBeenCalled();

        jasmine.clock().install();
        jasmine.clock().tick(THREE_SECONDS_WAITING);
        expect(component.selectedAnswers).toEqual([]);
        jasmine.clock().uninstall();
    });

    it('should call stopTimer method of timeService on ngOnDestroy', () => {
        const stopTimerSpy = spyOn(timeService, 'stopTimer').and.callThrough();
        component.ngOnDestroy();
        expect(stopTimerSpy).toHaveBeenCalled();
    });

    it('should select the corresponding answer when a valid key is pressed', () => {
        const mockEvent = new KeyboardEvent('keydown', { key: '1' });
        component.handleKeyPress(mockEvent);
        expect(component.selectedAnswers).toEqual(['Choice1']);
    });

    it('should not select an answer when a pressed key is invalid', () => {
        const mockEvent = new KeyboardEvent('keydown', { key: 'a' });
        component.handleKeyPress(mockEvent);
        expect(component.selectedAnswers).toEqual([]);
    });

    it('should call the handleKeyPressForSubmit when the Enter key is pressed', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        spyOn(component, 'submitAnswer');
        component.handleKeyPressForSubmit(event);
        expect(component.submitAnswer).toHaveBeenCalled();
    });

    it('should set quizData and start timer if quiz is retrieved successfully', () => {
        const getQuizSpy = spyOn(quizzesRequestService, 'getQuiz').and.returnValue(of(component.quizData[0]));
        const ngOnInitSpy = spyOn(component, 'ngOnInit').and.callThrough();
        const stopTimerSpy = spyOn(timeService, 'stopTimer').and.callThrough();
        const startTimerSpy = spyOn(timeService, 'startTimer').and.callThrough();
        component.ngOnInit();

        expect(getQuizSpy).toHaveBeenCalledWith('1a2b3c');
        expect(component.quizData).toEqual(component.quizData);
        expect(stopTimerSpy).toHaveBeenCalled();
        expect(startTimerSpy).toHaveBeenCalledWith(component.getDurationQuestion());

        expect(ngOnInitSpy).toHaveBeenCalled();
    });

    it('should submit the answer when the Enter key is pressed and the question is not finished', () => {
        component.isQuestionFinished = false;
        const submitAnswerSpy = spyOn(component, 'submitAnswer');
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        component.handleKeyPress(event);
        expect(submitAnswerSpy).toHaveBeenCalled();
    });

    it('should return the current question', () => {
        expect(component.getCurrentQuestion()).toEqual(component.quizData[0].questions[0]);
    });

    it('should return the good answer(s)', () => {
        expect(component.getGoodAnswerQuestion()).toEqual([
            { text: 'Choice1', isCorrect: true },
            { text: 'Choice3', isCorrect: true },
        ]);
    });

    it('should return the wrong answer(s)', () => {
        expect(component.getWrongAnswerQuestion()).toEqual([{ text: 'Choice2', isCorrect: false }]);
    });

    it('should return the duration of questions', () => {
        expect(component.getDurationQuestion()).toEqual(component.quizData[0].duration);
    });

    it('should remove answer from selectedAnswers if the answeralready selected', () => {
        component.selectedAnswers = ['A', 'B', 'C'];
        component.toggleAnswerSelection('B');
        expect(component.selectedAnswers).toEqual(['A', 'C']);
    });

    it('should do nothing with the score when submitting a wrong answer', () => {
        component.currentQuestionIndex = 0;
        component.selectedAnswers = ['Choice2'];
        spyOn(quizzesValidationService, 'validateAnswer').and.returnValue(of({ isValid: false }));
        component.submitAnswer();
        expect(component.isCorrectAnswer).toBe('Incorrect');
        expect(component.score).toBe(0);
    });

    it('should increment with the score when submitting good answer(s)', () => {
        component.currentQuestionIndex = 0;
        component.selectedAnswers = ['Choice1', 'Choice3'];
        spyOn(quizzesValidationService, 'validateAnswer').and.returnValue(of({ isValid: true }));
        component.submitAnswer();

        // Note : We always give the bonus for testing mode (20%)
        expect(component.score).toBe(component.quizData[0].questions[0].points * POINT_BONUS);
        expect(component.isCorrectAnswer).toBe('Correct');
    });

    it('should set isGameFinished to true and navigate to create game page after THREE_SECONDS_WAITING', fakeAsync(() => {
        component.currentQuestionIndex = 1;
        component.isGameFinished = false;
        const quizzesServiceSpy = spyOn(quizzesRequestService, 'goPageCreateGame');
        component.moveToNextQuestion();
        tick(THREE_SECONDS_WAITING);
        expect(component.isGameFinished).toBe(true);
        expect(quizzesServiceSpy).toHaveBeenCalled();
        discardPeriodicTasks();
        flush();
    }));

    it('should start timer with SIXTY_SECOND duration if question type is not QCM', () => {
        const mockQuiz = {
            id: '1a2b3c',
            title: 'Titre',
            description: 'Description',
            lastModification: '2018-11-13T20:20:39+00:00',
            duration: 10,
            questions: [
                {
                    type: 'QRL',
                    lastModified: '',
                    text: 'Test',
                    points: 40,
                    choices: [],
                },
            ],
        };
        const getQuizSpy = spyOn(quizzesRequestService, 'getQuiz').and.returnValue(of(mockQuiz));
        const startTimerSpy = spyOn(timeService, 'startTimer').and.callThrough();
        component.ngOnInit();
        expect(getQuizSpy).toHaveBeenCalled();
        expect(startTimerSpy).toHaveBeenCalledWith(SIXTY_SECOND);
    });

    it('should go the next question if the game isnt finished yet', fakeAsync(() => {
        const mockResponse = { isValid: true };
        spyOn(quizzesValidationService, 'validateAnswer').and.returnValue(of(mockResponse));
        component.submitAnswer();
        tick(THREE_SECONDS_WAITING);
        expect(component.isCorrectAnswer).toBeNull();
        discardPeriodicTasks();
        flush();
    }));

    it('should handle submitting the answer when the question is not of QCM type', () => {
        const stopTimerSpy = spyOn(component['timeService'], 'stopTimer');
        const incrementScoreSpy = spyOn(component, 'incrementScore').and.callThrough();
        component.quizData[0].questions[0].type = 'SomeOtherType';
        component.submitAnswer();
        expect(incrementScoreSpy).toHaveBeenCalledWith(component.getCurrentQuestion().points);
        expect(stopTimerSpy).toHaveBeenCalled();
        expect(component.isQuestionFinished).toBeTrue();
        jasmine.clock().install();
        jasmine.clock().tick(THREE_SECONDS_WAITING);
        expect(component.isCorrectAnswer).toBeNull();
        expect(component.qrlAnswer).toEqual('');
        jasmine.clock().uninstall();
    });
});
