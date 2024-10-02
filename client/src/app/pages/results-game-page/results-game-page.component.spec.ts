/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disable some lint to simplify some test
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HistogramComponent } from '@app/components/histogram/histogram.component';
import { PlayerHeaderComponent } from '@app/components/player-header/player-header.component';
import { Message } from '@app/interfaces/message';
import { Result } from '@app/interfaces/result';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { GameService } from '@app/services/game.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { of } from 'rxjs';
import { ResultsGamePageComponent } from './results-game-page.component';
@Component({
    selector: 'app-player-chat',
    template: '',
})
class PlayerChatMockComponent {
    @Input() usernameChat: string = 'test';
    @Input() roomCode: string = '1234';
    @Input() roomMessages: Message[] = [];
}

@Component({
    selector: 'app-list-player-result',
    template: '',
})
class ListPlayerResultMockComponent {
    @Input() listOfPlayersWithDetails: { username: string; scores: number[]; bonusAmounts: number[] }[] = [];
}

describe('ResultsGamePageComponent', () => {
    let component: ResultsGamePageComponent;
    let fixture: ComponentFixture<ResultsGamePageComponent>;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let gameServiceMock: jasmine.SpyObj<GameService>;

    beforeEach(async () => {
        spyOn(window.HTMLMediaElement.prototype, 'play').and.callFake(async () => Promise.resolve());
        socketServiceMock = jasmine.createSpyObj('SocketClientService', [
            'on',
            'send',
            'off',
            'getDataPlayers',
            'getDataResults',
            'isSocketAlive',
            'connect',
            'disconnect',
            'leaveRoom',
            'newMessage',
            'getDataCorrectionQrl',
            'sendGameEndData',
        ]);

        gameServiceMock = jasmine.createSpyObj('GameService', [
            'destroyGame',
            'cleanOnDestroy',
            'startGame',
            'initializeLobby',
            'setQuiz',
            'goToResultPage',
            'updateResultFromSocket',
        ]);

        await TestBed.configureTestingModule({
            declarations: [
                PlayerHeaderComponent,
                ResultsGamePageComponent,
                PlayerChatMockComponent,
                HistogramComponent,
                ListPlayerResultMockComponent,
            ],
            imports: [MatDialogModule, HttpClientTestingModule, RouterTestingModule.withRoutes([{ path: 'home', component: MainPageComponent }])],
            providers: [
                { provide: GameService, useValue: gameServiceMock },
                { provide: SocketClientService, useValue: socketServiceMock },

                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: of({ quizId: 'quiz123', roomCode: '4567', isTest: false, username: 'test' }),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ResultsGamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set the activeTab property to the provided tabName when tabName is provided', () => {
        component.openTab('Podium');
        expect(component.activeTab).toBe('Podium');
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

    it('should decrement resultIndex and call gameService.updateResultFromSocket with previous result', () => {
        component.resultIndex = 1;
        component.listOfResults = [
            {
                text: 'Titre1',
                choices: [
                    { choice: 'ChoixA', isCorrect: true, numberOfAnswers: 10 },
                    { choice: 'ChoixB', isCorrect: false, numberOfAnswers: 5 },
                ],
            },
            {
                text: 'Titre2',
                choices: [
                    { choice: 'ChoixC', isCorrect: true, numberOfAnswers: 7 },
                    { choice: 'ChoixD', isCorrect: false, numberOfAnswers: 3 },
                ],
            },
        ];

        component.viewResultFromPreviousQuestion();
        expect(component.resultIndex).toBe(0);
        expect(gameServiceMock.updateResultFromSocket).toHaveBeenCalledWith(component.listOfResults[0]);
    });

    it('should increment resultIndex and call gameService.updateResultFromSocket with next result', () => {
        component.resultIndex = 0;
        component.listOfResults = [
            {
                text: 'Titre1',
                choices: [
                    { choice: 'ChoixA', isCorrect: true, numberOfAnswers: 10 },
                    { choice: 'ChoixB', isCorrect: false, numberOfAnswers: 5 },
                ],
            },
            {
                text: 'Titre2',
                choices: [
                    { choice: 'ChoixC', isCorrect: true, numberOfAnswers: 7 },
                    { choice: 'ChoixD', isCorrect: false, numberOfAnswers: 3 },
                ],
            },
        ];

        component.viewResultFromNextQuestion();
        expect(component.resultIndex).toBe(1);
        expect(gameServiceMock.updateResultFromSocket).toHaveBeenCalledWith(component.listOfResults[1]);
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

    it('should sort list of players with details by total score and username', () => {
        component.sortedListOfPlayersWithDetails = [
            { username: '1234Ac', scores: [10], bonusAmounts: [0] },
            { username: '1234Ab', scores: [10], bonusAmounts: [0] },
            { username: '1234O', scores: [21], bonusAmounts: [0] },
            { username: '1234R', scores: [8], bonusAmounts: [0] },
        ];

        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'listOfPlayersWithDetails') {
                callback(component.sortedListOfPlayersWithDetails as unknown as T);
            }
        });

        component.configureBaseSocketFeatures();
        fixture.detectChanges();
        expect(component.sortedListOfPlayersWithDetails[0].username).toBe('O');
        expect(component.sortedListOfPlayersWithDetails[1].username).toBe('Ab');
        expect(component.sortedListOfPlayersWithDetails[2].username).toBe('Ac');
        expect(component.sortedListOfPlayersWithDetails[3].username).toBe('R');
    });

    it('should set listOfResults and call gameService.updateResultFromSocket when listOfPlayersWithResults event is received', () => {
        const mockResults: Result[] = [
            {
                text: 'Result 1',
                choices: [
                    { choice: 'Choice 1', isCorrect: true, numberOfAnswers: 10 },
                    { choice: 'Choice 2', isCorrect: false, numberOfAnswers: 5 },
                ],
            },
        ];

        // eslint-disable-next-line @typescript-eslint/ban-types
        // we disable some lint to simplify some test
        socketServiceMock.on.and.callFake((event: string, callback: Function) => {
            if (event === 'listOfPlayersWithResults') {
                callback(mockResults);
            }
        });

        component.configureBaseSocketFeatures();
        expect(component.listOfResults).toEqual(mockResults);
        expect(gameServiceMock.updateResultFromSocket).toHaveBeenCalledWith(mockResults[0]);
    });

    it('should disconnect the user from the socket service', () => {
        const router = TestBed.inject(Router);
        const navigateSpy = spyOn(router, 'navigate');
        component.disconnectUser();
        expect(socketServiceMock.disconnect).toHaveBeenCalled();
        expect(navigateSpy).toHaveBeenCalledWith(['/home']);
        expect(socketServiceMock.connect).toHaveBeenCalled();
    });

    it('should return the original list of results when there are QRL data corrections', () => {
        const mockResults: Result[] = [
            {
                text: 'Result 1',
                choices: [
                    { choice: 'Choice 1', isCorrect: true, numberOfAnswers: 10 },
                    { choice: 'Choice 2', isCorrect: false, numberOfAnswers: 5 },
                ],
            },
        ];
        component.listOfCorrection = [{ questionIndex: 0, questionTitle: 'title', amount0: 0, amount50: 0, amount100: 0 }];
        const result = component.addQrlDataToListOfResults(mockResults);
        expect(result.length).toEqual(1);
    });

    it('should return the correct top score when the sortedListOfPlayersWithDetails is not empty and has at least one player with a score', () => {
        component.sortedListOfPlayersWithDetails = [{ username: '1234', scores: [10, 5, 3], bonusAmounts: [0, 0, 0] }];
        const result = component.calculateTopScore();
        expect(result).toEqual(18);
    });

    it('should call leaveRoom method of socketService with roomCode parameter', fakeAsync(() => {
        component.roomCode = '1234';
        component.ngOnDestroy();
        expect(socketServiceMock.leaveRoom).toHaveBeenCalledWith('1234');
        tick(1000);
        expect(socketServiceMock.sendGameEndData).toHaveBeenCalledWith(component.topScore, '1234');
        flush();
    }));

    it('should add new messages to roomMessages with formatted timestamp and isSent when newMessage event is received', () => {
        const mockListCorrection = [{ questionIndex: 0, questionTitle: 'title', amount0: 0, amount50: 0, amount100: 0 }];
        socketServiceMock.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            if (event === 'listOfDataCorrectionQrl') {
                callback(mockListCorrection as unknown as T);
            }
        });
        component.configureBaseSocketFeatures();

        expect(component.listOfCorrection).toEqual(mockListCorrection);
        expect(socketServiceMock.getDataResults).toHaveBeenCalledWith(component.roomCode);
    });
});
