/* eslint-disable @typescript-eslint/no-explicit-any */
// we disable some lint to simplify some test
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { PlayerChatComponent } from '@app/components/player-chat/player-chat.component';
import { PlayerHeaderComponent } from '@app/components/player-header/player-header.component';
import { PlayerQuestionRandomComponent } from '@app/components/player-question-random/player-question-random.component';
import { PlayerScoreboardComponent } from '@app/components/player-scoreboard/player-scoreboard.component';
import { Message } from '@app/interfaces/message';
import { Result } from '@app/interfaces/result';
import { DialogService } from '@app/services/dialog.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { BehaviorSubject } from 'rxjs';
import { PlayerPageComponent } from './player-page.component';

describe('PlayerPageComponent', () => {
    let component: PlayerPageComponent;
    let fixture: ComponentFixture<PlayerPageComponent>;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;

    const dialogServiceMock = {
        openLeaveGame: jasmine.createSpy('openLeaveGame'),
        openRemovedLobbyDialog: jasmine.createSpy('openRemovedLobbyDialog'),
    };
    const mockRandomGameParams = {
        quizId: 'randomQuiz',
        roomCode: '4567',
    };
    const mockBaseParams = {
        quizId: 'quiz123',
        roomCode: '4567',
    };
    const mockQueryParams = new BehaviorSubject<any>(mockBaseParams);

    beforeEach(async () => {
        socketServiceMock = jasmine.createSpyObj('SocketClientService', [
            'on',
            'send',
            'off',
            'terminateRoom',
            'redirectToResult',
            'isSocketAlive',
            'connect',
            'leaveRoom',
            'redirectAllToResult',
            'newMessage',
            'onPanicModeStarted',
            'onPanicModePaused',
            'onPanicModeResumed',
            'isAllowedToChat',
            'blockChat',
            'unblockChat',
            'playerLeft',
        ]);

        await TestBed.configureTestingModule({
            declarations: [
                PlayerPageComponent,
                PlayerScoreboardComponent,
                PlayerHeaderComponent,
                PlayerChatComponent,
                // PlayerQuestionComponent,
                PlayerQuestionRandomComponent,
            ],
            imports: [RouterTestingModule, MatDialogModule, HttpClientTestingModule, FormsModule],
            providers: [
                { provide: DialogService, useValue: dialogServiceMock },
                { provide: SocketClientService, useValue: socketServiceMock },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: mockQueryParams.asObservable(),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should navigate to home and open dialog when terminateRoom event is received', () => {
        const router = TestBed.inject(Router);
        const navigateSpy = spyOn(router, 'navigate');
        const mockSocket = jasmine.createSpyObj('CustomSocket', ['isAllowedToChat']);
        mockSocket.isAllowedToChat = true;
        socketServiceMock.socket = mockSocket;
        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'terminateRoom') {
                callback('Room terminated' as unknown as T);
            }
        });
        component.ngOnInit();
        expect(navigateSpy).toHaveBeenCalledWith(['/home']);
        expect(dialogServiceMock.openRemovedLobbyDialog).toHaveBeenCalled();
    });

    it('should call the openLeaveGame method of the dialogService', () => {
        component.goToLeaveGame();
        expect(dialogServiceMock.openLeaveGame).toHaveBeenCalled();
    });
    it('should navigate to resultsGame when redirectToResult event is received', fakeAsync(() => {
        const router = TestBed.inject(Router);
        const navigateSpy = spyOn(router, 'navigate');
        const resultData: Result = {
            text: 'Résultat du quiz',
            choices: [
                { choice: 'Option 1', isCorrect: true, numberOfAnswers: 10 },
                { choice: 'Option 2', isCorrect: false, numberOfAnswers: 5 },
            ],
        };

        const mockSocket = jasmine.createSpyObj('CustomSocket', ['isAllowedToChat']);
        mockSocket.isAllowedToChat = true;
        socketServiceMock.socket = mockSocket;
        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'redirectToResult') {
                callback(resultData as unknown as T);
            }
        });
        component.username = 'test';
        component.ngOnInit();
        expect(navigateSpy).toHaveBeenCalledWith(['/resultsGame', { result: resultData, username: 'test' }]);
        flush();
    }));

    it('should update the score when onScoreUpdated method is called', () => {
        const updatedScore = 100;
        component.onScoreUpdated(updatedScore);
        expect(component.score).toEqual(updatedScore);
    });

    it('should add new messages to roomMessages with formatted timestamp and isSent when newMessage event is received', () => {
        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'newMessage') {
                const messageData: Message = {
                    username: 'Organisateur',
                    message: 'Bienvenue!',
                    timeStamp: new Date(),
                    isSent: false,
                    isNotification: false,
                };
                callback(messageData as unknown as T);
            }
        });
        component.configureBaseSocketFeatures();

        expect(component.roomMessages.length).toBeGreaterThan(0);
    });

    it('should set isQuizRandom to true if quizId includes randomQuiz', fakeAsync(() => {
        mockQueryParams.next(mockRandomGameParams);
        tick();
        component.ngOnInit();
        tick();
        expect(component.isRandom).toBeTrue();
        mockQueryParams.next(mockBaseParams);
        flush();
    }));

    it('should update isAllowedToChat and socketService.socket.isAllowedToChat when blockChat event is received', () => {
        const mockSocket = jasmine.createSpyObj('CustomSocket', ['isAllowedToChat']);
        mockSocket.isAllowedToChat = true;
        socketServiceMock.socket = mockSocket;

        socketServiceMock.on.and.callFake((event: string, callback: (data: any) => void) => {
            if (event === 'blockChat') {
                callback(mockSocket.isAllowedToChat);
            }
        });
        component.ngOnInit();
        expect(component.isAllowedToChat).toBe(mockSocket.isAllowedToChat);
        expect(socketServiceMock.socket.isAllowedToChat).toBe(mockSocket.isAllowedToChat);
    });

    it('should update isAllowedToChat and socketService.socket.isAllowedToChat when unblockChat event is received', () => {
        const mockSocket = jasmine.createSpyObj('CustomSocket', ['isAllowedToChat']);
        mockSocket.isAllowedToChat = true;
        socketServiceMock.socket = mockSocket;

        socketServiceMock.on.and.callFake((event: string, callback: (data: any) => void) => {
            if (event === 'unblockChat') {
                callback(mockSocket.isAllowedToChat);
            }
        });

        component.ngOnInit();
        expect(component.isAllowedToChat).toBe(mockSocket.isAllowedToChat);
        expect(socketServiceMock.socket.isAllowedToChat).toBe(mockSocket.isAllowedToChat);
    });
});
