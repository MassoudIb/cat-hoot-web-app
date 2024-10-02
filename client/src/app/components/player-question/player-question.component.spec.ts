/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
// we needed to disable some lint to simplify some tests
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { SIXTY_SECOND } from '@app/constants/time';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { QuizzesValidationService } from '@app/services/quizzes-validation.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { of } from 'rxjs';
import { Quiz } from './../../interfaces/quiz';
import { PlayerQuestionComponent } from './player-question.component';

type PlayerScore = {
    score: number;
    bonus: boolean;
};

const QUARTER = 4;

describe('PlayerQuestionComponent', () => {
    let component: PlayerQuestionComponent;
    let fixture: ComponentFixture<PlayerQuestionComponent>;
    let quizzesRequestService: jasmine.SpyObj<QuizzesRequestService>;
    let quizzesValidationService: jasmine.SpyObj<QuizzesValidationService>;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    const dialogServiceMock = {
        openNextQuestionDialog: jasmine.createSpy('openNextQuestionDialog'),
    };
    const mockQuiz: Quiz = {
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
            {
                type: 'QRL',
                lastModified: '',
                text: 'TestQRL',
                points: 100,
                choices: [],
            },
        ],
    };

    beforeEach(async () => {
        const quizzesRequestServiceSpy = jasmine.createSpyObj('QuizzesRequestService', ['getQuiz']);
        quizzesValidationService = jasmine.createSpyObj('QuizzesValidationService', ['validateAnswer']);
        const audioElement = document.createElement('audio');
        audioElement.id = 'panicMode';
        spyOn(audioElement, 'play').and.callThrough();
        spyOn(audioElement, 'pause').and.callThrough();
        document.body.appendChild(audioElement);
        spyOn(window.HTMLMediaElement.prototype, 'play').and.callFake(async () => Promise.resolve());
        spyOn(window.HTMLMediaElement.prototype, 'pause').and.callFake(() => {});
        socketServiceMock = jasmine.createSpyObj('SocketClientService', [
            'on',
            'off',
            'selectedChoice',
            'waitingStartTimer',
            'unselectedChoice',
            'submitAnswer',
            'redirectAll',
            'incrementScoreServer',
            'stopTimerRoom',
            'getDataPlayers',
            'clearAnswersOnServer',
            'addToAnswerOrderList',
            'gameStarted',
            'startPanicMode',
            'resumeTimer',
            'pauseTimer',
            'onPanicModeStarted',
            'onPanicModePaused',
            'onPanicModeResumed',
            'sendAnswerToOrg',
            'clearAnswerOrg',
            'leaveRoom',
            'playerSurrenderedDuringQRL',
            'playerActiveOrInactive',
        ]);
        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, BrowserAnimationsModule],
            declarations: [PlayerQuestionComponent],
            providers: [
                { provide: QuizzesRequestService, useValue: quizzesRequestServiceSpy },
                { provide: QuizzesValidationService, useValue: quizzesValidationService },
                { provide: SocketClientService, useValue: socketServiceMock },
                Router,
                { provide: DialogService, useValue: dialogServiceMock },
                { provide: ActivatedRoute, useValue: { params: of({ quizId: '123', roomCode: 'ABC', username: 'testuser' }) } },
            ],
        });
        quizzesValidationService = TestBed.inject(QuizzesValidationService) as jasmine.SpyObj<QuizzesValidationService>;
        quizzesRequestService = TestBed.inject(QuizzesRequestService) as jasmine.SpyObj<QuizzesRequestService>;
        quizzesRequestService.getQuiz.and.returnValue(of(mockQuiz));
        fixture = TestBed.createComponent(PlayerQuestionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should handle panic mode sound play and pause', async () => {
        component.playPanicModeSound();
        fixture.detectChanges();
        expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();

        component.stopPanicModeSound();
        fixture.detectChanges();
        expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    });

    it('should handle pauseTimer event correctly', () => {
        spyOn(component, 'handlePauseTimer');
        const pauseTimerCallback = socketServiceMock.on.calls.allArgs().find((args) => args[0] === 'pauseTimer')?.[1] as () => void;
        pauseTimerCallback?.();
        expect(component.handlePauseTimer).toHaveBeenCalled();
    });

    it('should handle resumeTimer event correctly', () => {
        spyOn(component, 'handleResumeTimer');
        const resumeTimerCallback = socketServiceMock.on.calls.allArgs().find((args) => args[0] === 'resumeTimer')?.[1] as () => void;
        if (resumeTimerCallback) {
            resumeTimerCallback();
        }

        expect(component.handleResumeTimer).toHaveBeenCalled();
    });

    it('should call answerVerification on allPlayersAnswered', () => {
        spyOn(component, 'answerVerification');
        socketServiceMock.on.calls.allArgs().forEach(([eventName, callback]) => {
            if (eventName === 'allPlayersAnswered') {
                callback({} as any);
            }
        });
        expect(component.answerVerification).toHaveBeenCalled();
    });

    it('should call sendAnswerToOrg on allPlayersAnsweredQrl', () => {
        spyOn(component, 'sendAnswerToOrg');
        socketServiceMock.on.calls.allArgs().forEach(([eventName, callback]) => {
            if (eventName === 'allPlayersAnsweredQrl') {
                callback({} as any);
            }
        });
        expect(component.sendAnswerToOrg).toHaveBeenCalled();
    });

    it('should set isTimerPaused to true when called', () => {
        component.handlePauseTimer();
        expect(component.isTimerPaused).toBe(true);
    });

    it('should set isTimerPaused to false when handleResumeTimer is called', () => {
        component.handleResumeTimer();
        expect(component.isTimerPaused).toBe(false);
    });

    it('should load quiz data on initialization', () => {
        expect(quizzesRequestService.getQuiz).toHaveBeenCalledWith('123');
        expect(component.quizData).toEqual([mockQuiz]);
    });

    it('should call waitingStartTimer and isPlayerActive for QRL type question', () => {
        spyOn(component, 'isPlayerActive').and.callThrough();
        const mockQRLQuiz: Quiz = {
            id: '1a2b3c',
            title: 'Titre',
            description: 'Description',
            lastModification: '2018-11-13T20:20:39+00:00',
            duration: 10,
            questions: [
                {
                    type: 'QRL',
                    lastModified: '',
                    text: 'TestQRL',
                    points: 100,
                    choices: [],
                },
            ],
        };
        quizzesRequestService.getQuiz.and.returnValue(of(mockQRLQuiz));
        component.loadQuizData();
        expect(socketServiceMock.waitingStartTimer).toHaveBeenCalledWith(component.roomCode, SIXTY_SECOND);
        expect(component.isPlayerActive).toHaveBeenCalled();
    });

    it('should handle key press for submitting answer', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        spyOn(component, 'submitAnswer');
        component.handleKeyPressForSubmit(event);
        expect(component.submitAnswer).toHaveBeenCalled();
    });
    it('should submit answer when Enter key is pressed and input is active', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        spyOn(component, 'submitAnswer');
        component.isAInputActive = true;
        component.handleKeyPress(event);
        expect(component.submitAnswer).toHaveBeenCalled();
    });

    it('should move to next question and stop panic mode sound when nextQuestionIndex event is emitted', () => {
        spyOn(component, 'moveToNextQuestion');
        spyOn(component, 'stopPanicModeSound');
        spyOn(component, 'isPlayerActive').and.callThrough();

        const nextQuestionIndexCallback = socketServiceMock.on.calls.allArgs().find(([eventName]) => eventName === 'nextQuestionIndex')?.[1] as (
            nextQuestionIndex: number,
        ) => void;
        nextQuestionIndexCallback?.(2);

        expect(component.moveToNextQuestion).toHaveBeenCalled();
        expect(component.stopPanicModeSound).toHaveBeenCalled();
        expect(component.isPlayerActive).toHaveBeenCalled();
        expect(component.currentQuestionIndex).toBe(2);
        expect(mockQuiz.questions[2].type).toBe('QRL');
    });

    it('should handle updatedScoreQRL event correctly', () => {
        const updatedScore = 50;
        spyOn(component, 'incrementScoreClient');
        const updatedScoreQRLCallback = socketServiceMock.on.calls.allArgs().find(([eventName]) => eventName === 'updatedScoreQRL')?.[1] as (
            updatedScore: number,
        ) => void;
        updatedScoreQRLCallback?.(updatedScore);
        expect(component.waitingCorrection).toBeFalse();
        expect(component.incrementScoreClient).toHaveBeenCalledWith(updatedScore);
    });

    it('should return correct color for QCM type', () => {
        spyOn(component, 'getCurrentQuestion').and.returnValue({
            type: 'QCM',
            text: 'Question text',
            points: 10,
            choices: [],
            lastModified: '2022-04-16T12:00:00',
        });

        expect(component.getCircleColor(6)).toBe('green');
        expect(component.getCircleColor(3)).toBe('yellow');
        expect(component.getCircleColor(1)).toBe('red');
    });

    it('should return correct color for QRL type', () => {
        spyOn(component, 'getCurrentQuestion').and.returnValue({
            type: 'QRL',
            text: 'Question text',
            points: 10,
            choices: [],
            lastModified: '2022-04-16T12:00:00',
        });

        expect(component.getCircleColor(SIXTY_SECOND / 2 + 1)).toBe('green');
        expect(component.getCircleColor(SIXTY_SECOND / QUARTER + 1)).toBe('yellow');
        expect(component.getCircleColor(1)).toBe('red');
    });

    it('should return correct dash offset for QCM type', () => {
        spyOn(component, 'getCurrentQuestion').and.returnValue({
            type: 'QCM',
            text: 'Question text',
            points: 10,
            choices: [],
            lastModified: '2022-04-16T12:00:00',
        });

        expect(component.getCircleDashOffset(6)).toBe('-136');
        expect(component.getCircleDashOffset(3)).toBe('-238');
        expect(component.getCircleDashOffset(1)).toBe('-306');
    });
    it('should return correct dash offset for QRL type', () => {
        spyOn(component, 'getCurrentQuestion').and.returnValue({
            type: 'QRL',
            text: 'Question text',
            points: 10,
            choices: [],
            lastModified: '2022-04-16T12:00:00',
        });
        expect(component.getCircleDashOffset(30)).toBe('-170');
        expect(component.getCircleDashOffset(45)).toBe('-85');
    });

    it('should add answer to the beginning of qrlAnswersList', () => {
        const initialList = ['existingAnswer'];
        component.qrlAnswersList = initialList;
        component.getAnwserQrl('newAnswer');
        expect(component.qrlAnswersList[0]).toBe('newAnswer');
        expect(component.qrlAnswersList[1]).toBe('existingAnswer');
    });

    it('should call submitAnswer when Enter key is pressed', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        spyOn(component, 'submitAnswer');
        component.handleKeyPressForSubmit(event);
        expect(component.submitAnswer).toHaveBeenCalled();
    });

    it('should open next question dialog when openDialogbox event is emitted', () => {
        const openDialogboxCallback = socketServiceMock.on.calls.allArgs().find(([eventName]) => eventName === 'openDialogbox')?.[1] as () => void;
        openDialogboxCallback?.();
        expect(dialogServiceMock.openNextQuestionDialog).toHaveBeenCalled();
    });

    it('should toggle answer selection when numeric key is pressed', () => {
        const event = new KeyboardEvent('keydown', { key: '1' });
        const expectedAnswer = mockQuiz.questions[0].choices[0].text;
        component.isAInputActive = true;
        spyOn(component, 'toggleAnswerSelection');
        component.handleKeyPress(event);
        expect(component.toggleAnswerSelection).toHaveBeenCalledWith(expectedAnswer);
    });
    it('should set timeRemaining when timerUpdated event is emitted', () => {
        const expectedTimeRemaining = 60;

        socketServiceMock.on.calls.allArgs().forEach(([eventName, callback]) => {
            if (eventName === 'timerUpdated') {
                callback(expectedTimeRemaining);
            }
        });

        expect(component.timeRemaining).toEqual(expectedTimeRemaining);
    });

    it('should call answerVerification on allPlayersAnswered', fakeAsync(() => {
        spyOn(component, 'answerVerification');

        socketServiceMock.on.calls.allArgs().forEach(([eventName, callback]) => {
            if (eventName === 'allPlayersAnswered') {
                callback({} as any);
            }
        });

        tick();
        expect(component.answerVerification).toHaveBeenCalled();
    }));

    it('should call submitAnswer when timerExpired event is emitted', () => {
        spyOn(component, 'submitAnswer');
        const allArgs = socketServiceMock.on.calls.allArgs();
        const timerExpiredEvent = allArgs.find(([eventName]) => eventName === 'timerExpired');
        if (timerExpiredEvent) {
            const [, timerExpiredCallback] = timerExpiredEvent;
            timerExpiredCallback(null);
        }
        expect(component.submitAnswer).toHaveBeenCalledWith(true);
    });

    it('should increment score when scoreUpdated event is emitted', () => {
        spyOn(component, 'incrementScoreClient').and.callThrough();
        const scoreUpdateCallback = socketServiceMock.on.calls.allArgs().find(([eventName]) => eventName === 'scoreUpdated')?.[1] as (
            update: PlayerScore,
        ) => void;
        const update: PlayerScore = { score: 10, bonus: true };
        scoreUpdateCallback?.(update);
        expect(component.incrementScoreClient).toHaveBeenCalledWith(update.score, update.bonus);
    });

    it('should update listOfPlayersWithDetails when listOfPlayersWithDetails event is emitted', () => {
        const playerArray: { username: string; scores: number[]; bonusAmounts: number[] }[] = [
            { username: 'user1', scores: [10, 20], bonusAmounts: [5, 10] },
            { username: 'user2', scores: [15, 25], bonusAmounts: [8, 12] },
        ];
        const callback = socketServiceMock.on.calls.allArgs().find(([eventName]) => eventName === 'listOfPlayersWithDetails')?.[1] as (
            playerArray: any,
        ) => void;
        callback?.(playerArray);
        expect(component.listOfPlayersWithDetails).toEqual(playerArray);
        expect(socketServiceMock.on).toHaveBeenCalledWith('listOfPlayersWithDetails', jasmine.any(Function));
    });

    it('should return good answer choices', () => {
        const goodAnswerChoices = component.getGoodAnswerQuestion();
        expect(goodAnswerChoices.length).toBe(2);
        expect(goodAnswerChoices[0].text).toBe('Choice1');
        expect(goodAnswerChoices[1].text).toBe('Choice3');
    });

    it('should return wrong answer choices', () => {
        const wrongAnswerChoices = component.getWrongAnswerQuestion();
        expect(wrongAnswerChoices.length).toBe(1);
        expect(wrongAnswerChoices[0].text).toBe('Choice2');
    });

    it('should move to next question and stop panic mode sound when nextQuestionIndex event is emitted', () => {
        spyOn(component, 'moveToNextQuestion');
        spyOn(component, 'stopPanicModeSound');
        const nextQuestionIndexCallback = socketServiceMock.on.calls.allArgs().find(([eventName]) => eventName === 'nextQuestionIndex')?.[1] as (
            nextQuestionIndex: number,
        ) => void;
        nextQuestionIndexCallback?.(1);
        expect(component.moveToNextQuestion).toHaveBeenCalled();
        expect(component.stopPanicModeSound).toHaveBeenCalled();
        expect(component.currentQuestionIndex).toBe(1);
    });

    it('should add answer if not already selected', () => {
        const answer = 'Choice1';
        component.selectedAnswers = [];
        component.toggleAnswerSelection(answer);
        expect(component.selectedAnswers).toContain(answer);
    });

    it('should remove answer if already selected', () => {
        const answer = 'Choice1';
        component.selectedAnswers = [answer];
        component.toggleAnswerSelection(answer);
        expect(component.selectedAnswers).not.toContain(answer);
    });

    it('should submit answer', () => {
        component.currentQuestionIndex = 0;
        component.selectedAnswers = ['Choice1'];
        quizzesValidationService.validateAnswer.and.returnValue(of({ isValid: false }));
        component.submitAnswer(true);
        expect(quizzesValidationService.validateAnswer).toHaveBeenCalledWith('1a2b3c', 0, ['Choice1']);
    });

    it('should submit answer for non-QCM question type', () => {
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
                        type: 'QRL',
                        lastModified: '',
                        text: 'TestQRL',
                        points: 100,
                        choices: [],
                    },
                ],
            },
        ];
        component.roomCode = 'ABC';
        component.submitAnswer(false);
        expect(socketServiceMock.submitAnswer).toHaveBeenCalledWith('ABC', 'QRL', false, false);
    });

    it('should send answer to organization', () => {
        component.roomCode = 'ABC';
        component.username = 'testUser';
        component.qrlAnswer = 'Sample answer';
        component.sendAnswerToOrg();

        expect(component.waitingCorrection).toBe(true);
        expect(component.isQuestionFinished).toBe(true);
        expect(socketServiceMock.stopTimerRoom).toHaveBeenCalledWith('ABC');
        expect(socketServiceMock.sendAnswerToOrg).toHaveBeenCalledWith('ABC', 'testUser', 'Sample answer', jasmine.any(Number));
        expect(component.qrlAnswer).toBe('');
    });

    it('should toggle answer selection correctly', () => {
        const answer = 'Choice1';
        component.selectedAnswers = [answer];
        component.toggleAnswerSelection(answer);
        expect(component.selectedAnswers).not.toContain(answer);
        component.selectedAnswers = [];
        component.toggleAnswerSelection(answer);
        expect(component.selectedAnswers).toContain(answer);
    });

    it('should submit answer', () => {
        component.currentQuestionIndex = 0;
        component.selectedAnswers = ['Choice1'];
        quizzesValidationService.validateAnswer.and.returnValue(of({ isValid: true }));
        component.submitAnswer(true);
        expect(quizzesValidationService.validateAnswer).toHaveBeenCalledWith('1a2b3c', 0, ['Choice1']);
    });

    it('should handle answer verification', () => {
        component.currentQuestionIndex = 0;
        component.selectedAnswers = ['Choice1'];
        quizzesValidationService.validateAnswer.and.returnValue(of({ isValid: true }));
        component.answerVerification();
        expect(quizzesValidationService.validateAnswer).toHaveBeenCalledWith('1a2b3c', 0, ['Choice1']);
        expect(socketServiceMock.incrementScoreServer).toHaveBeenCalledWith(40, 'ABC');
        expect(component.isQuestionFinished).toBe(true);
        expect(socketServiceMock.stopTimerRoom).toHaveBeenCalledWith('ABC');
    });

    it('should increment score and emit scoreUpdated event', () => {
        component.score = 0;
        spyOn(component.scoreUpdated, 'emit');
        component.quizData[0] = mockQuiz;
        component.currentQuestionIndex = 2;

        component.incrementScoreClient(10, true);

        expect(component.score).toBe(10);
        expect(component.isBonus).toBe(true);
        expect(component.scoreUpdated.emit).toHaveBeenCalledWith(10);
    });

    it('should set isBonus to true if bonus parameter is true', () => {
        const bonus = true;
        component.incrementScoreClient(10, bonus);
        expect(component.isBonus).toBe(true);
    });

    it('should set isBonus to false if bonus parameter is false or undefined', () => {
        const bonus = false;
        component.incrementScoreClient(10, bonus);
        expect(component.isBonus).toBe(false);
    });

    it('should set isBonus to false if bonus parameter is undefined', () => {
        const bonus = undefined;
        component.incrementScoreClient(10, bonus);
        expect(component.isBonus).toBe(false);
    });

    it('should move to next question', () => {
        component.currentQuestionIndex = 0;
        component.selectedAnswers = ['Choice1'];
        component.moveToNextQuestion();
        expect(component.isQuestionFinished).toBe(false);
        expect(component.isNotAlreadyAnswer).toBe(true);
        expect(component.selectedAnswers.length).toBe(0);
    });

    it('should set isCorrectAnswer to "Incorrect" when answer is invalid', () => {
        component.currentQuestionIndex = 0;
        component.selectedAnswers = ['IncorrectChoice'];
        quizzesValidationService.validateAnswer.and.returnValue(of({ isValid: false }));
        component.answerVerification();
        expect(component.isCorrectAnswer).toBe('Incorrect');
    });
});
