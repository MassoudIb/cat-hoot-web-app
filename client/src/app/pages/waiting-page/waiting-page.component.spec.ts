/* eslint-disable @typescript-eslint/no-explicit-any */
// we disable some lint to simplify some test
import { Component, Input, NgZone } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Message } from '@app/interfaces/message';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { PlayerPageComponent } from '@app/pages/player-page/player-page.component';
import { DialogService } from '@app/services/dialog.service';
import { RoomsService } from '@app/services/rooms.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { WaitingPageComponent } from './waiting-page.component';

@Component({
    selector: 'app-player-chat',
    template: '',
})
class PlayerChatMockComponent {
    @Input() usernameChat: string = 'test';
    @Input() roomCode: string = '1234';
    @Input() roomMessages: Message[] = [];
}

describe('WaitingPageComponent', () => {
    let component: WaitingPageComponent;
    let fixture: ComponentFixture<WaitingPageComponent>;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let roomsServiceMock: jasmine.SpyObj<RoomsService>;
    let ngZone: NgZone;

    beforeEach(async () => {
        socketServiceMock = jasmine.createSpyObj('SocketClientService', ['on', 'send', 'off', 'disconnect', 'connect']);
        roomsServiceMock = jasmine.createSpyObj('RoomsService', ['getRoomCode']);

        roomsServiceMock.getRoomCode.and.returnValue('1234');
        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'usernameValidated') {
                callback(true as unknown as T);
            }
        });

        await TestBed.configureTestingModule({
            declarations: [WaitingPageComponent, PlayerChatMockComponent],
            imports: [
                ReactiveFormsModule,
                MatDialogModule,
                RouterTestingModule.withRoutes([
                    { path: 'home', component: MainPageComponent },
                    { path: 'player', component: PlayerPageComponent },
                ]),
            ],
            providers: [
                FormBuilder,
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: RoomsService, useValue: roomsServiceMock },
            ],
        }).compileComponents();

        ngZone = TestBed.inject(NgZone);
        fixture = TestBed.createComponent(WaitingPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize username validation', () => {
        component.loginForm.controls['username'].setValue('testUser');
        fixture.detectChanges();

        component.validateUsername();

        expect(socketServiceMock.send).toHaveBeenCalledWith('validateUsername', {
            username: 'testUser',
            userCode: '1234',
        });

        expect(component.hasUsername).toBeTrue();
    });

    it('If username is an empty string, the username is invalid', () => {
        component.loginForm.controls['username'].setValue('');
        fixture.detectChanges();

        component.validateUsername();

        expect(component.isUsernameValid).toBeFalse();
    });

    it('should add new player to listOfPlayers when newPlayer event is emitted', () => {
        const newUsername = 'JohnDoe';

        component.configureBaseSocketFeatures();
        socketServiceMock.on.calls.argsFor(1)[1](newUsername);

        expect(component.listOfPlayers).toContain(newUsername);
    });

    it('should delete player from listOfPlayers when deletePlayer event is triggered', () => {
        const deletedUser = 'user1';
        component.listOfPlayers = ['user1', 'user2', 'user3'];

        socketServiceMock.on.calls.argsFor(2)[1](deletedUser);

        expect(component.listOfPlayers).toEqual(['user2', 'user3']);
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

    it('should update listOfPlayers when listOfPlayers event is received', () => {
        const testPlayers = ['Player1', 'Player2', 'Player3'];

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'listOfPlayers') {
                callback(testPlayers as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();

        expect(component.listOfPlayers).toEqual(testPlayers);
    });

    it('should redirect to new page with quizId when redirectToNewPage event is received', () => {
        const router = TestBed.inject(Router);
        const navigateSpy = spyOn(router, 'navigate');
        const testQuizId = 'testQuiz123';
        component.username = 'test';

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'redirectToNewPage') {
                callback(testQuizId as unknown as T);
            }
        });
        ngZone.run(() => {
            component.configureBaseSocketFeatures();
        });

        component.roomCode = '1234';
        component.isTest = false;

        expect(navigateSpy).toHaveBeenCalledWith(['/player', { quizId: testQuizId, roomCode: '1234', isTest: false, username: 'test' }]);
    });

    it('should open countdown dialog with quizId when openDialogbox event is received', () => {
        const dialogService = TestBed.inject(DialogService);
        const dialogSpy = spyOn(dialogService, 'openCountdownDialog');
        const testQuizId = 'quiz123';

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'openDialogbox') {
                callback(testQuizId as unknown as T);
            }
        });
        ngZone.run(() => {
            component.configureBaseSocketFeatures();
        });

        expect(dialogSpy).toHaveBeenCalledWith(testQuizId);
    });

    it('should open kicked player dialog when wasKicked event is received', () => {
        const dialogService = TestBed.inject(DialogService);
        const dialogSpy = spyOn(dialogService, 'openKickedPlayerDialog');

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'wasKicked') {
                callback(undefined as unknown as T);
            }
        });

        ngZone.run(() => {
            component.configureBaseSocketFeatures();
        });

        expect(dialogSpy).toHaveBeenCalled();
    });

    it('should remove id when wasKicked event is received', () => {
        const userInfo = { username: 'testUser', roomCode: '1234' };

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'wasKicked') {
                callback(undefined as unknown as T);
            }
        });

        component.userInfo = userInfo;
        ngZone.run(() => {
            component.configureBaseSocketFeatures();
        });

        expect(socketServiceMock.send).toHaveBeenCalledWith('removeId', userInfo);
    });

    it('should terminate room when terminateRoom event is received', () => {
        const router = TestBed.inject(Router);
        const navigateSpy = spyOn(router, 'navigate');
        const dialogService = TestBed.inject(DialogService);
        const dialogSpy = spyOn(dialogService, 'openRemovedLobbyDialog');

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'terminateRoom') {
                callback(undefined as unknown as T);
            }
        });

        ngZone.run(() => {
            component.configureBaseSocketFeatures();
        });

        expect(navigateSpy).toHaveBeenCalledWith(['/']);
        expect(dialogSpy).toHaveBeenCalledWith();
    });

    it('should removePlayer when roomUnavailable event is received', () => {
        const router = TestBed.inject(Router);
        const navigateSpy = spyOn(router, 'navigate');
        const dialogService = TestBed.inject(DialogService);
        const dialogSpy = spyOn(dialogService, 'openUnavailableGame');

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'roomUnavailable') {
                callback(undefined as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();

        expect(navigateSpy).toHaveBeenCalledWith(['/']);
        expect(dialogSpy).toHaveBeenCalledWith();
    });

    it('should username validation false when usernameValidated event is received', () => {
        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'usernameValidated') {
                callback(false as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();

        expect(component.isUsernameValid).toBeFalse();
    });

    it('should disconnect the user from the socket service', fakeAsync(() => {
        ngZone.run(() => {
            component.disconnectUser();
        });
        tick();
        expect(socketServiceMock.disconnect).toHaveBeenCalled();
        expect(socketServiceMock.connect).toHaveBeenCalled();
    }));
});
