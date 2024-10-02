// We need all these lines of code for tests
/* eslint-disable max-lines */
import { NgZone } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HistogramComponent } from '@app/components/histogram/histogram.component';
import { PlayerChatComponent } from '@app/components/player-chat/player-chat.component';
import { PlayerHeaderComponent } from '@app/components/player-header/player-header.component';
import { Message } from '@app/interfaces/message';
import { Quiz } from '@app/interfaces/quiz';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { DialogService } from '@app/services/dialog.service';
import { GameService } from '@app/services/game.service';
import { PlayerInteractionService } from '@app/services/player-interaction.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { TimeService } from '@app/services/time.service';
import { Observable, of } from 'rxjs';
import { HostPageComponent } from './host-page.component';

describe('HostPageComponent', () => {
    let component: HostPageComponent;
    let fixture: ComponentFixture<HostPageComponent>;
    let gameServiceMock: jasmine.SpyObj<GameService>;
    let quizzesRequestServiceMock: jasmine.SpyObj<QuizzesRequestService>;
    let socketClientServiceMock: jasmine.SpyObj<SocketClientService>;
    let timeServiceMock: jasmine.SpyObj<TimeService>;
    let activatedRouteStub: { params: Observable<unknown> };
    let ngZone: NgZone;
    let dialogServiceMock: jasmine.SpyObj<DialogService>;
    let playerInteractionServiceMock: jasmine.SpyObj<PlayerInteractionService>;

    beforeEach(async () => {
        spyOn(window.HTMLMediaElement.prototype, 'play').and.callFake(async () => Promise.resolve());
        spyOn(window.HTMLMediaElement.prototype, 'pause').and.callFake(() => {
            /* vide */
        });
        dialogServiceMock = jasmine.createSpyObj('DialogService', ['openNextQuestionDialog', 'openCorrectionDialog']);
        gameServiceMock = jasmine.createSpyObj('GameService', [
            'destroyGame',
            'cleanOnDestroy',
            'startGame',
            'initializeLobby',
            'setQuiz',
            'goToResultPage',
        ]);
        quizzesRequestServiceMock = jasmine.createSpyObj('QuizzesRequestService', ['getQuiz']);
        socketClientServiceMock = jasmine.createSpyObj('SocketClientService', [
            'on',
            'send',
            'off',
            'isSocketAlive',
            'connect',
            'redirectToResult',
            'joinRoom',
            'requestForListOfPlayers',
            'qrlAnswerSent',
            'openDialogboxNextQuestionDialog',
            'connect',
            'disconnect',
            'pauseTimer',
            'resumeTimer',
            'startPanicMode',
            'onPanicModePaused',
            'onPanicModeResumed',
            'allPlayersAnswered',
            'allPlayersAnsweredQrl',
            'timerUpdated',
            'stopPanicModeSound',
            'playPanicModeSound',
        ]);
        timeServiceMock = jasmine.createSpyObj('TimeService', ['startTimer', 'stopTimer']);
        playerInteractionServiceMock = jasmine.createSpyObj('PlayerInteractionService', ['configureBaseSocketFeatures', 'initializeLobby']);
        activatedRouteStub = {
            params: of({ roomCode: '123', quizId: 'quiz123' }),
        };
        quizzesRequestServiceMock.getQuiz.and.returnValue(
            of({
                id: '1',
                title: 'Sample Quiz',
                description: 'A sample quiz for testing',
                duration: 30,
                lastModification: '2021-01-01T00:00:00Z',
                questions: [
                    {
                        type: 'choice',
                        text: 'Sample Question',
                        points: 10,
                        choices: [{ text: 'Sample Choice', isCorrect: true }],
                        lastModified: '2021-01-01T00:00:00Z',
                    },
                ],
            }),
        );

        await TestBed.configureTestingModule({
            declarations: [HostPageComponent, PlayerChatComponent, HistogramComponent, PlayerHeaderComponent],
            providers: [
                { provide: GameService, useValue: gameServiceMock },
                { provide: QuizzesRequestService, useValue: quizzesRequestServiceMock },
                { provide: SocketClientService, useValue: socketClientServiceMock },
                { provide: TimeService, useValue: timeServiceMock },
                { provide: ActivatedRoute, useValue: activatedRouteStub },
                { provide: DialogService, useValue: dialogServiceMock },
                { provide: PlayerInteractionService, useValue: playerInteractionServiceMock },
            ],
            imports: [FormsModule, RouterTestingModule.withRoutes([{ path: 'home', component: MainPageComponent }]), NoopAnimationsModule],
        }).compileComponents();
        ngZone = TestBed.inject(NgZone);
        fixture = TestBed.createComponent(HostPageComponent);
        component = fixture.componentInstance;
        component.ngOnInit();

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call ngOnDestroy in ngOnInit', () => {
        spyOn(component, 'ngOnDestroy');

        window.dispatchEvent(new Event('beforeunload'));

        expect(component.ngOnDestroy).toHaveBeenCalled();
    });

    it('should toggle "isTimerPaused" boolean when called', () => {
        component.isTimerPaused = false;
        component.toggleTimer();
        expect(component.isTimerPaused).toBe(true);
        component.toggleTimer();
        expect(component.isTimerPaused).toBe(false);
    });

    it('should toggle "isTimerPaused" boolean when called when isPanicModeOn is true', () => {
        component.isTimerPaused = false;
        component.isPanicModeOn = true;
        component.toggleTimer();
        expect(component.isTimerPaused).toBe(true);
        component.toggleTimer();
        expect(component.isTimerPaused).toBe(false);
    });

    it('should set isPanicModeOn to true when isTimerPaused is false', () => {
        component.isTimerPaused = false;
        component.activatePanicMode();
        expect(component.isPanicModeOn).toBe(true);
    });

    it('should unsubscribe from socket events on destroy', () => {
        component.isGameOngoing = true;

        component.ngOnDestroy();

        expect(socketClientServiceMock.off).toHaveBeenCalledWith('openDialogbox');
        expect(socketClientServiceMock.off).toHaveBeenCalledWith('newMessage');
    });

    it('should finish the game and navigate to result page', () => {
        ngZone.run(() => {
            component.gameFinished();
        });
        spyOn(component, 'gameFinished').and.callThrough();
        expect(component.isGameOngoing).toBeFalse();
    });

    it('should add new messages to roomMessages with formatted timestamp and isSent when newMessage event is received', fakeAsync(() => {
        const testMessage: Message = {
            username: 'Organisateur',
            message: 'Bienvenue!',
            timeStamp: new Date(),
            isSent: false,
            isNotification: false,
        };

        socketClientServiceMock.on.and.callFake(<T>(event: string = 'newMessage', callback: (data: T) => void) => {
            if (event === 'newMessage') {
                callback(testMessage as unknown as T);
            }
        });

        fixture.detectChanges();
        component.configureBaseSocketFeatures();

        tick();

        expect(component.roomMessages.length).toBeGreaterThan(0);
        expect(component.roomMessages[0].message).toEqual('Bienvenue!');
        expect(component.roomMessages[0].isSent).toBeTrue();
    }));

    it('should call openNextQuestionDialog when openDialogbox event is received', fakeAsync(() => {
        const mockData = {};
        socketClientServiceMock.on.and.callFake(<T>(event: string = 'openDialogbox', callback: (data: T) => void) => {
            if (event === 'openDialogbox') {
                callback(mockData as unknown as T);
            }
        });

        fixture.detectChanges();
        ngZone.run(() => {
            component.configureBaseSocketFeatures();
        });
        tick();

        expect(dialogServiceMock.openNextQuestionDialog).toHaveBeenCalled();
    }));

    it('should call openDialogboxNextQuestionDialog method from socketService with roomCode parameter', () => {
        const roomCode = '4532';
        component.roomCode = roomCode;
        component.openDialogboxNextQuestion();
        expect(socketClientServiceMock.openDialogboxNextQuestionDialog).toHaveBeenCalledWith(roomCode);
    });

    it('should sort listOfAnswers by username', () => {
        component.listOfAnswers = [
            { playerId: '1', username: 'O', answer: 'Yes', point: 10, score: 20 },
            { playerId: '2', username: 'Ab', answer: 'Yes', point: 10, score: 0 },
            { playerId: '3', username: 'R', answer: 'Yes', point: 10, score: 10 },
            { playerId: '4', username: 'Ac', answer: 'Yes', point: 10, score: 50 },
        ];

        socketClientServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'qrlAnswerSent') {
                callback(component.listOfAnswers as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();
        fixture.detectChanges();
        expect(component.listOfAnswers[0].username).toBe('Ab');
        expect(component.listOfAnswers[1].username).toBe('Ac');
        expect(component.listOfAnswers[2].username).toBe('O');
        expect(component.listOfAnswers[3].username).toBe('R');
    });
    it('should disconnect the user from the socket service', () => {
        ngZone.run(() => {
            component.disconnectUser();
        });
        expect(socketClientServiceMock.disconnect).toHaveBeenCalled();
        expect(socketClientServiceMock.connect).toHaveBeenCalled();
    });

    it('should toggle "isNameAscending" property of "playerInteractionService" from true to false', () => {
        playerInteractionServiceMock.isNameAscending = true;
        component.toggleIsNameAscending();
        expect(playerInteractionServiceMock.isNameAscending).toBe(false);
    });

    it('should toggle "isScoreAscending" property of "playerInteractionService" from false to true', () => {
        playerInteractionServiceMock.isScoreAscending = false;
        component.toggleIsScoreAscending();
        expect(playerInteractionServiceMock.isScoreAscending).toBe(true);
    });

    it('should toggle "isColorStateAscending" property of "playerInteractionService" from true to false', () => {
        playerInteractionServiceMock.isColorStateAscending = true;
        component.toggleIsColorStateAscending();
        expect(playerInteractionServiceMock.isColorStateAscending).toBe(false);
    });

    it('should set allPlayersAnswered to true when "allPlayersAnswered" event is emitted', () => {
        component.allPlayersAnswered = false;

        socketClientServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'allPlayersAnswered') {
                callback(component.allPlayersAnswered as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();
        expect(component.allPlayersAnswered).toBe(true);
    });

    it('should set allPlayersAnswered to true when "allPlayersAnsweredQrl" event is emitted', () => {
        component.allPlayersAnswered = false;
        socketClientServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'allPlayersAnsweredQrl') {
                callback(component.allPlayersAnswered as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();
        expect(component.allPlayersAnswered).toBe(true);
    });

    it('should update remainingTime when "timerUpdated" event is emitted', () => {
        const remainingTime = 60;
        socketClientServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'timerUpdated') {
                callback(remainingTime as unknown as T);
            }
        });
        component.configureBaseSocketFeatures();
        expect(component.remainingTime).toEqual(remainingTime);
    });

    it('should register "onPanicModePaused" socket event and stop panic mode sound', () => {
        spyOn(component, 'stopPanicModeSound');
        component.configureBaseSocketFeatures();
        component.stopPanicModeSound();
        expect(component.stopPanicModeSound).toHaveBeenCalled();
    });

    it('should register "onPanicModeResumed" socket event and play panic mode sound', () => {
        spyOn(component, 'playPanicModeSound');
        component.configureBaseSocketFeatures();
        component.playPanicModeSound();
        expect(component.playPanicModeSound).toHaveBeenCalled();
    });

    it('should return red when its almost over and question type is QRL', () => {
        const FORTY_SECONDS = 40;
        component.currentQuiz = {
            questions: [
                {
                    type: 'QRL',
                    text: '',
                    points: 0,
                    choices: [],
                    lastModified: '',
                },
            ],
        } as unknown as Quiz;
        component.currentQuestionIndex = 0;
        component.time = 60;
        const color = component.getCircleColor(FORTY_SECONDS);
        expect(color).toBe('green');
    });

    it('should return red when its almost over and question type is QCM', () => {
        const FIVE_SECONDS = 5;
        component.currentQuiz = {
            questions: [
                {
                    type: 'QCM',
                    text: '',
                    points: 0,
                    choices: [],
                    lastModified: '',
                },
            ],
        } as unknown as Quiz;
        component.currentQuestionIndex = 0;
        component.time = 30;
        const color = component.getCircleColor(FIVE_SECONDS);
        expect(color).toBe('red');
    });

    it('should return true when current question type is QCM and remaining time is greater than 10 seconds', () => {
        component.currentQuiz = {
            questions: [
                {
                    type: 'QCM',
                    text: '',
                    points: 0,
                    choices: [],
                    lastModified: '',
                },
            ],
        } as unknown as Quiz;
        component.currentQuestionIndex = 0;
        component.remainingTime = 15;
        const result = component.shouldShowPanicButton();
        expect(result).toBe(true);
    });

    it('should return a string with a negative number when time is 0 and the question type is QCM', () => {
        component.currentQuiz = {
            questions: [
                {
                    type: 'QCM',
                    text: '',
                    points: 0,
                    choices: [],
                    lastModified: '',
                },
            ],
        } as unknown as Quiz;
        component.currentQuestionIndex = 0;
        component.time = 120;
        const time = 0;
        const circleDashOffset = component.getCircleDashOffset(time);
        expect(circleDashOffset).toBe('-340');
    });
});
