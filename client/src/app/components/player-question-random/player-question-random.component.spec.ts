/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
// we needed to disable some lint to simplify some tests
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, flush, tick } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { THREE_SECONDS_WAITING } from '@app/constants/time';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { QuizzesValidationService } from '@app/services/quizzes-validation.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { of } from 'rxjs';
import { Quiz } from './../../interfaces/quiz';
import { PlayerQuestionRandomComponent } from './player-question-random.component';

type PlayerScore = {
    score: number;
    bonus: boolean;
};

describe('PlayerQuestionRandomComponent', () => {
    let component: PlayerQuestionRandomComponent;
    let fixture: ComponentFixture<PlayerQuestionRandomComponent>;
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
        ],
    };

    beforeEach(async () => {
        const quizzesRequestServiceSpy = jasmine.createSpyObj('QuizzesRequestService', ['getQuiz', 'deleteRandomQuiz']);
        quizzesValidationService = jasmine.createSpyObj('QuizzesValidationService', ['validateAnswer']);
        const audioElement = document.createElement('audio');
        audioElement.id = 'panicMode';
        spyOn(audioElement, 'play').and.callThrough();
        spyOn(audioElement, 'pause').and.callThrough();
        document.body.appendChild(audioElement);
        spyOn(window.HTMLMediaElement.prototype, 'play').and.callFake(async () => Promise.resolve());
        spyOn(window.HTMLMediaElement.prototype, 'pause').and.callFake(() => {
            /* vide */
        });
        socketServiceMock = jasmine.createSpyObj('SocketClientService', [
            'on',
            'off',
            'send',
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
            'playerSurrenderedDuringQRL',
            'redirectToResult',
        ]);

        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, BrowserAnimationsModule],
            declarations: [PlayerQuestionRandomComponent],
            providers: [
                { provide: QuizzesRequestService, useValue: quizzesRequestServiceSpy },
                { provide: QuizzesValidationService, useValue: quizzesValidationService },
                { provide: SocketClientService, useValue: socketServiceMock },
                Router,
                { provide: DialogService, useValue: dialogServiceMock },
                { provide: ActivatedRoute, useValue: { params: of({ quizId: '1a2b3c', roomCode: 'ABC', username: 'Organisateur' }) } },
            ],
        }).compileComponents();

        quizzesValidationService = TestBed.inject(QuizzesValidationService) as jasmine.SpyObj<QuizzesValidationService>;
        quizzesRequestService = TestBed.inject(QuizzesRequestService) as jasmine.SpyObj<QuizzesRequestService>;
        quizzesRequestService.getQuiz.and.returnValue(of(mockQuiz));
        fixture = TestBed.createComponent(PlayerQuestionRandomComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return "green" if time is greater than half the duration', () => {
        const time = component.getDurationQuestion() / 2 + 1;
        const color = component.getCircleColor(time);
        expect(color).toBe('green');
    });

    it('should return "yellow" if time is greater than a quarter but less than half the duration', () => {
        const time = component.getDurationQuestion() / 4 + 1;
        const color = component.getCircleColor(time);
        expect(color).toBe('yellow');
    });

    it('should return "red" if time is less than a quarter of the duration', () => {
        const time = component.getDurationQuestion() / 4 - 1;
        const color = component.getCircleColor(time);
        expect(color).toBe('red');
    });

    it('should handle panic mode sound play and pause', async () => {
        component.playPanicModeSound();
        fixture.detectChanges();
        expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();

        component.stopPanicModeSound();
        fixture.detectChanges();
        expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    });

    it('should call answerVerification on allPlayersAnswered', fakeAsync(() => {
        spyOn(component, 'answerVerification');
        spyOn(component, 'moveToNextQuestion');
        const callback = (component as any).socketService.on.calls.argsFor(1)[1];
        callback();
        expect(component.answerVerification).toHaveBeenCalled();
        expect(component.moveToNextQuestion).toHaveBeenCalled();
    }));

    it('should load quiz data on initialization', () => {
        expect(quizzesRequestService.getQuiz).toHaveBeenCalledWith('1a2b3c');
        expect(component.quizData).toEqual([mockQuiz]);
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

    it('should call submitAnswer when Enter key is pressed', () => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        spyOn(component, 'submitAnswer');
        component.handleKeyPressForSubmit(event);
        expect(component.submitAnswer).toHaveBeenCalled();
    });

    it('should open next question dialog when openDialogbox event is emitted', () => {
        const dialogServiceMock2 = TestBed.inject(DialogService) as jasmine.SpyObj<DialogService>;
        const callback = (component as any).socketService.on.calls.argsFor(6)[1];
        callback();
        expect(dialogServiceMock2.openNextQuestionDialog).toHaveBeenCalled();
    });

    it('should call incrementScoreClient on updatedScoreQRL event', () => {
        const updatedScore = 100;
        spyOn(component, 'incrementScoreClient');
        const updatedScoreCallback = socketServiceMock.on.calls.argsFor(5)[1];
        updatedScoreCallback(updatedScore);
        expect(component.incrementScoreClient).toHaveBeenCalledWith(updatedScore);
    });

    it('should update numberOfPlayers on getRandomQuizSize event', () => {
        const playersSize = 5;
        const expectedNumberOfPlayers = playersSize;
        const getRandomQuizSizeCallback = socketServiceMock.on.calls.argsFor(7)[1];
        getRandomQuizSizeCallback(playersSize);
        expect(component.numberOfPlayers).toEqual(expectedNumberOfPlayers);
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

    it('should call submitAnswer on timerExpired', fakeAsync(() => {
        spyOn(component, 'submitAnswer');
        const submitAnswerCallback = (component as any).socketService.on.calls.argsFor(2)[1];
        submitAnswerCallback();
        expect(component.submitAnswer).toHaveBeenCalledTimes(1);
    }));

    it('should call incrementScoreClient when scoreUpdated event is emitted', () => {
        const update: PlayerScore = { score: 100, bonus: true };
        spyOn(component, 'incrementScoreClient').and.callThrough();
        const scoreUpdatedCallback = socketServiceMock.on.calls.argsFor(3)[1];
        scoreUpdatedCallback(update);
        expect(component.incrementScoreClient).toHaveBeenCalledWith(update.score, update.bonus);
    });

    it('should update listOfPlayersWithDetails when listOfPlayersWithDetails event is emitted', () => {
        spyOn<any>(component, 'configureBaseSocketFeatures').and.callThrough();
        const playerDetails = [{ username: 'user1', scores: [10], bonusAmounts: [5] }];
        const callback = (component as any).socketService.on.calls.argsFor(4)[1];
        callback(playerDetails);
        expect(component.listOfPlayersWithDetails.length).toBe(1);
        expect(component.listOfPlayersWithDetails[0]).toEqual(playerDetails[0]);
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
        quizzesValidationService.validateAnswer.and.returnValue(of({ isValid: true }));
        component.submitAnswer();
        expect(quizzesValidationService.validateAnswer).toHaveBeenCalledWith('1a2b3c', 0, ['Choice1']);
        expect(socketServiceMock.submitAnswer).toHaveBeenCalledWith('ABC', component.quizData[0].questions[0].type, true, true);
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

    it('should send addOrganizerPlayerRandomGame message if username is Organisateur', () => {
        component.username = 'Organisateur';
        expect(socketServiceMock.send).toHaveBeenCalledWith('addOrganizerPlayerRandomGame', component.roomCode);
    });

    it('should submit answer', () => {
        component.currentQuestionIndex = 0;
        component.selectedAnswers = ['Choice1'];
        quizzesValidationService.validateAnswer.and.returnValue(of({ isValid: true }));

        component.submitAnswer();

        expect(quizzesValidationService.validateAnswer).toHaveBeenCalledWith('1a2b3c', 0, ['Choice1']);
        expect(socketServiceMock.addToAnswerOrderList).toHaveBeenCalledWith('ABC');
        expect(socketServiceMock.submitAnswer).toHaveBeenCalledWith('ABC', component.quizData[0].questions[0].type, true, true);
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

    it('should move to next question and finish game if it is the last question', fakeAsync(() => {
        component.currentQuestionIndex = component.quizData[0].questions.length - 1;
        component.moveToNextQuestion();
        tick(THREE_SECONDS_WAITING);
        expect(component.isQuestionFinished).toBe(false);
        expect(component.isNotAlreadyAnswer).toBe(true);
        expect(component.selectedAnswers.length).toBe(0);
        expect(component.isGameFinished).toBe(true);
        expect(socketServiceMock.redirectToResult).toHaveBeenCalledWith(component.roomCode);
        flush();
        discardPeriodicTasks();
    }));
    it('should set isCorrectAnswer to "Incorrect" when answer is invalid', () => {
        component.currentQuestionIndex = 0;
        component.selectedAnswers = ['IncorrectChoice'];
        quizzesValidationService.validateAnswer.and.returnValue(of({ isValid: false }));
        component.answerVerification();
        expect(component.isCorrectAnswer).toBe('Incorrect');
    });
});
