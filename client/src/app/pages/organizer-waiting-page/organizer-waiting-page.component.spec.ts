/* eslint-disable @typescript-eslint/no-explicit-any */
// we disable some lint to simplify some test
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Message } from '@app/interfaces/message';
import { Quiz } from '@app/interfaces/quiz';
import { DialogService } from '@app/services/dialog.service';
import { RoomsService } from '@app/services/rooms.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { BehaviorSubject, of } from 'rxjs';
import { QuizzesRequestService } from './../../services/quizzes-request.service';
import { OrganizerWaitingPageComponent } from './organizer-waiting-page.component';

@Component({
    selector: 'app-player-chat',
    template: '',
})
class PlayerChatMockComponent {
    @Input() usernameChat: string = 'test';
    @Input() roomCode: string = '1234';
    @Input() roomMessages: Message[] = [];
}

const RESPONSE_DELAY = 6000;
describe('OrganizerWaitingPageComponent', () => {
    let component: OrganizerWaitingPageComponent;
    let fixture: ComponentFixture<OrganizerWaitingPageComponent>;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let roomsServiceMock: jasmine.SpyObj<RoomsService>;
    let dialogServiceMock: jasmine.SpyObj<DialogService>;
    let routerMock: Router;
    const mockRandomGameParams = {
        quizId: 'randomQuiz',
        roomCode: '4567',
    };
    const mockBaseParams = {
        quizId: 'quiz123',
        roomCode: '4567',
    };
    const mockQueryParams = new BehaviorSubject<any>(mockBaseParams);
    const quiz: Quiz = {
        id: 'quiz123',
        title: 'Test Quiz',
        description: 'Test Description',
        duration: 10,
        questions: [],
        lastModification: '2024-01-30',
    };

    const quizRequestServiceMock = jasmine.createSpyObj('QuizzesRequestService', ['deleteRandomQuiz', 'getQuiz']);
    quizRequestServiceMock.deleteRandomQuiz.and.returnValue(of());
    quizRequestServiceMock.getQuiz.and.returnValue(of(quiz));

    beforeEach(async () => {
        socketServiceMock = jasmine.createSpyObj('SocketClientService', [
            'on',
            'send',
            'off',
            'redirectAll',
            'openDialogboxWaiting',
            'sendGameStartData',
        ]);
        roomsServiceMock = jasmine.createSpyObj('RoomsService', ['setRoomCode', 'getRoomCode']);
        dialogServiceMock = jasmine.createSpyObj('DialogService', ['openCountdownDialog']);

        await TestBed.configureTestingModule({
            declarations: [OrganizerWaitingPageComponent, PlayerChatMockComponent],
            imports: [MatDialogModule, RouterTestingModule],
            providers: [
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: DialogService, useValue: dialogServiceMock },
                { provide: RoomsService, useValue: roomsServiceMock },
                { provide: QuizzesRequestService, useValue: quizRequestServiceMock },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: mockQueryParams.asObservable(),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(OrganizerWaitingPageComponent);
        component = fixture.componentInstance;
        routerMock = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should add new player to listOfPlayers when newPlayer event is emitted', () => {
        const newPlayerName = 'NewPlayer';
        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'newPlayer') {
                callback(newPlayerName as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();
        expect(component.listOfPlayers).toContain(newPlayerName);
    });

    it('should delete player from listOfPlayers when deletePlayer event is triggered', () => {
        const playerToRemove = 'Player1';
        component.listOfPlayers = [playerToRemove, 'Player2'];

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'deletePlayer') {
                callback(playerToRemove as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();
        expect(component.listOfPlayers).not.toContain(playerToRemove);
    });

    it('should redirect to host page when redirectToNewPage event is received', () => {
        const navigateSpy = spyOn(routerMock, 'navigate');

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'redirectToNewPage') {
                callback(undefined as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();
        expect(navigateSpy).toHaveBeenCalledWith([`hostVue/${component.roomCode}/${component.quizId}`]);
    });

    it('should redirect to player page when redirectToNewPage event is received and the quiz is random', () => {
        const navigateSpy = spyOn(routerMock, 'navigate');
        component.isQuizRandom = true;

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'redirectToNewPage') {
                callback(undefined as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();
        expect(navigateSpy).toHaveBeenCalledWith([
            '/player',
            { quizId: component.quizId, roomCode: component.roomCode, isTest: false, username: 'Organisateur' },
        ]);
    });

    it('should update isRoomLocked when roomLockedStatusChanged event is received', () => {
        expect(component.isRoomLocked).toBeFalse();

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'roomLockedStatusChanged') {
                callback(true as unknown as T);
            }
        });

        component.ngOnInit();

        expect(component.isRoomLocked).toBeTrue();

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'roomLockedStatusChanged') {
                callback(false as unknown as T);
            }
        });

        component.ngOnInit();
        expect(component.isRoomLocked).toBeFalse();
    });

    it('should update roomCode and call setRoomCode when createdRoom event is received', () => {
        const testRoomCode = '1234';

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'createdRoom') {
                callback(testRoomCode as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();
        expect(component.roomCode).toEqual(testRoomCode);
        expect(roomsServiceMock.setRoomCode).toHaveBeenCalledWith(testRoomCode);
    });

    it('should open countdown dialog when openDialogbox event is received', () => {
        const testQuizId = 'quiz123';

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'openDialogbox') {
                callback(testQuizId as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();
        expect(dialogServiceMock.openCountdownDialog).toHaveBeenCalledWith(testQuizId);
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

    it('should call redirectAll with roomCode and quizId', () => {
        component.roomCode = '1234';
        component.quizId = 'quiz123';
        component.redirectAll();
        expect(socketServiceMock.redirectAll).toHaveBeenCalledWith('1234', 'quiz123');
    });

    it('should send playerKicked event with userInfo', () => {
        component.roomCode = '1234';
        component.removePlayer('testPlayer');
        expect(socketServiceMock.send).toHaveBeenCalledWith('playerKicked', { username: 'testPlayer', userCode: '1234' });
    });

    it('should call openDialogboxWaiting and redirectAll after timeout', fakeAsync(() => {
        component.roomCode = '1234';
        component.quizId = 'quiz123';
        component.quizTitle = 'Test Quiz';
        component.openDialogboxWaiting();

        tick(RESPONSE_DELAY);

        expect(socketServiceMock.openDialogboxWaiting).toHaveBeenCalledWith('1234', 'quiz123');
        expect(quizRequestServiceMock.getQuiz).toHaveBeenCalledWith('quiz123');
        expect(socketServiceMock.redirectAll).toHaveBeenCalledWith('1234', 'quiz123');
        expect(component.quizData).toEqual([quiz]);
        expect(component.quizTitle).toEqual('Test Quiz');
    }));

    it('should toggle lock status of the room', () => {
        component.roomCode = '1234';

        component.toggleLockRoom();

        expect(socketServiceMock.send).toHaveBeenCalledWith('toggleLockRoom', '1234');
    });

    it('should return true if room is locked and there are players', () => {
        component.isRoomLocked = true;
        component.listOfPlayers.push('Player1');
        expect(component.canStartGame()).toBeTrue();
    });

    it('should return false if room is not locked', () => {
        component.isRoomLocked = false;
        component.listOfPlayers.push('Player1');
        expect(component.canStartGame()).toBeFalse();
    });

    it('should return false if there are no players', () => {
        component.isRoomLocked = true;
        expect(component.canStartGame()).toBeFalse();
    });

    it('should return true if the quiz is random and only the organizer is the only player', () => {
        component.isRoomLocked = true;
        component.isQuizRandom = true;
        component.canStartGame();
        expect(component.canStartGame()).toBeTrue();
    });

    it('should set isQuizRandom to true if quizId includes randomQuiz', async () => {
        mockQueryParams.next(mockRandomGameParams);

        component.ngOnInit();
        expect(component.isQuizRandom).toBeTrue();
        mockQueryParams.next(mockBaseParams);
    });
});
