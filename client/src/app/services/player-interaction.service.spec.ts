import { TestBed } from '@angular/core/testing';

import { ColorCode } from '@app/constants/color-code';
import { HostPageComponent } from '@app/pages/host-page/host-page.component';
import { PlayerInteractionService } from './player-interaction.service';
import { SocketClientService } from './socket-service.service';

const listOfPlayers = [
    { name: 'John', score: 10, isPlaying: true, colorState: ColorCode.HAS_SUBMITTED },
    { name: 'Alice', score: 5, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION },
    { name: 'Bob', score: 8, isPlaying: true, colorState: ColorCode.HAS_INTERACTION },
    { name: 'Patrick', score: 20, isPlaying: true, colorState: ColorCode.HAS_LEFT },
];

const expectedAscendingListOfPlayers = [
    { name: 'Alice', score: 5, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION },
    { name: 'Bob', score: 8, isPlaying: true, colorState: ColorCode.HAS_INTERACTION },
    { name: 'John', score: 10, isPlaying: true, colorState: ColorCode.HAS_SUBMITTED },
    { name: 'Patrick', score: 20, isPlaying: true, colorState: ColorCode.HAS_LEFT },
];

const expectedDescendingListOfPlayers = [
    { name: 'Patrick', score: 20, isPlaying: true, colorState: ColorCode.HAS_LEFT },
    { name: 'John', score: 10, isPlaying: true, colorState: ColorCode.HAS_SUBMITTED },
    { name: 'Bob', score: 8, isPlaying: true, colorState: ColorCode.HAS_INTERACTION },
    { name: 'Alice', score: 5, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION },
];

describe('PlayerInteractionService', () => {
    let service: PlayerInteractionService;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let hostPageComponentMock: jasmine.SpyObj<HostPageComponent>;

    beforeEach(() => {
        socketServiceMock = jasmine.createSpyObj('SocketService', [
            'on',
            'emit',
            'send',
            'off',
            'joinRoom',
            'requestForListOfPlayers',
            'deleteRoom',
            'nextQuestion',
            'waitingStartTimer',
            'redirectToResult',
            'newPlayer',
            'deletePlayer',
            'nextQuestionIndex',
            'readyForNextQuestion',
            'answerWithListOfPlayers',
            'timerUpdated',
            'timerExpired',
            'allPlayersAnswered',
            'kickOrganizer',
            'updatedHistogram',
            'updateScore',
            'updatedHistogram',
            'handleChatPrivilege',
        ]);
        hostPageComponentMock = jasmine.createSpyObj('HostPageComponent', ['ngOnInit']);
        TestBed.configureTestingModule({
            providers: [
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: HostPageComponent, useValue: hostPageComponentMock },
            ],
        });
        service = TestBed.inject(PlayerInteractionService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call all handle events methods when configureBaseSocketFeatures is invoked', () => {
        spyOn(service, 'handlePlayersEvents').and.stub();
        spyOn(service, 'handleInteractionEvents').and.stub();
        spyOn(service, 'handleScoreEvents').and.stub();

        service.configureBaseSocketFeatures();
        expect(service.handlePlayersEvents).toHaveBeenCalled();
        expect(service.handleInteractionEvents).toHaveBeenCalled();
        expect(service.handleScoreEvents).toHaveBeenCalled();
    });

    it('should find the user to delete and change the isPlaying attribute to false', () => {
        const nameToDelete = 'test1';
        service.listOfPlayers = [
            { name: 'test1', score: 25, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION },
            { name: 'test2', score: 50, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION },
        ];
        socketServiceMock.on.and.callFake(<T>(event: string = 'deletePlayer', callback: (data: T) => void) => {
            if (event === 'deletePlayer') {
                callback(nameToDelete as unknown as T);
            }
        });

        service.handlePlayersEvents();
        expect(service.listOfPlayers[0].isPlaying).toBeFalse();
    });

    it('Should add the new players to the listOfPlayers with a score of 0 and isPlaying set to true, and set them to no interaction', () => {
        service.listOfPlayers = [
            { name: 'test1', score: 25, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION, isAllowedToChat: true },
            { name: 'test2', score: 50, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION, isAllowedToChat: true },
        ];
        const addedPlayers = ['test3', 'test4'];

        socketServiceMock.on.and.callFake(<T>(event: string = 'answerWithListOfPlayers', callback: (data: T) => void) => {
            if (event === 'answerWithListOfPlayers') {
                callback(addedPlayers as unknown as T);
            }
        });

        service.handlePlayersEvents();
        expect(service.listOfPlayers).toEqual([
            { name: 'test1', score: 25, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION, isAllowedToChat: true },
            { name: 'test2', score: 50, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION, isAllowedToChat: true },
            { name: 'test3', score: 0, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION, isAllowedToChat: true },
            { name: 'test4', score: 0, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION, isAllowedToChat: true },
        ]);
    });

    it('should update the score of the selected player', () => {
        service.listOfPlayers = [{ name: 'test', score: 0, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION, isAllowedToChat: true }];
        const player = { name: 'test', score: 25, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION, isAllowedToChat: true };
        socketServiceMock.on.and.callFake(<T>(event: string = 'updateScore', callback: (data: T) => void) => {
            if (event === 'updateScore') {
                callback(player as unknown as T);
            }
        });

        service.handleScoreEvents();
        expect(service.listOfPlayers[0].score).toEqual(player.score);
        expect(service.listOfPlayers[0].isAllowedToChat).toBe(true);
    });

    it('should update the color state of the selected player', () => {
        service.listOfPlayers = [{ name: 'Amine', score: 0, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION }];
        const player = { username: 'Amine', colorCode: ColorCode.HAS_INTERACTION };
        socketServiceMock.on.and.callFake(<T>(event: string = 'interaction', callback: (data: T) => void) => {
            if (event === 'interaction') {
                callback(player as unknown as T);
            }
        });

        service.handleInteractionEvents();
        expect(service.listOfPlayers[0].colorState).toEqual(player.colorCode);
    });

    it('should call off method on socketService with all the arguments', () => {
        service.cleanOnDestroy();
        expect(socketServiceMock.off).toHaveBeenCalledWith('deletePlayer');
        expect(socketServiceMock.off).toHaveBeenCalledWith('answerWithListOfPlayers');
        expect(socketServiceMock.off).toHaveBeenCalledWith('interaction');
        expect(socketServiceMock.off).toHaveBeenCalledWith('updateScore');
    });
    it('should sort players by name in ascending order when isNameAscending is true', () => {
        service.listOfPlayers = listOfPlayers;
        service.isNameAscending = true;
        service.sortPlayersByName();
        expect(service.listOfPlayers).toEqual(expectedAscendingListOfPlayers);
    });

    it('should sort players by name in descending order when isNameAscending is false', () => {
        service.listOfPlayers = listOfPlayers;
        service.isNameAscending = false;
        service.sortPlayersByName();
        expect(service.listOfPlayers).toEqual(expectedDescendingListOfPlayers);
    });

    it('should sort players by score in ascending order when isScoreAscending is true', () => {
        service.listOfPlayers = listOfPlayers;
        service.isScoreAscending = true;
        service.sortPlayersByScore();
        expect(service.listOfPlayers).toEqual(expectedAscendingListOfPlayers);
    });
    it('should sort players by score in descending order when isScoreDescending is false', () => {
        service.listOfPlayers = listOfPlayers;
        service.isScoreAscending = false;
        service.sortPlayersByScore();
        expect(service.listOfPlayers).toEqual(expectedDescendingListOfPlayers);
    });

    it('should sort players by colorState in ascending order when isColorStateAscending is true', () => {
        service.listOfPlayers = listOfPlayers;
        service.isColorStateAscending = true;
        service.sortPlayersByColorState();
        expect(service.listOfPlayers).toEqual(expectedAscendingListOfPlayers);
    });

    it('should sort players by colorState in descending order when isColorStateDescending is false', () => {
        service.listOfPlayers = listOfPlayers;
        service.isColorStateAscending = false;
        service.sortPlayersByColorState();
        expect(service.listOfPlayers).toEqual(expectedDescendingListOfPlayers);
    });

    it('should sort the list of players by ascending color state', () => {
        service.listOfPlayers = [
            { name: 'Philippe', score: 10, isPlaying: true, colorState: ColorCode.HAS_INTERACTION },
            { name: 'Anthony', score: 3, isPlaying: true, colorState: ColorCode.HAS_LEFT },
        ];

        service.sortPlayerByAscendingState();

        expect(service.listOfPlayers).toEqual([
            { name: 'Philippe', score: 10, isPlaying: true, colorState: ColorCode.HAS_INTERACTION },
            { name: 'Anthony', score: 3, isPlaying: true, colorState: ColorCode.HAS_LEFT },
        ]);
    });

    it('should sort the list of players by descending color state', () => {
        service.isColorStateAscending = false;
        service.listOfPlayers = [
            { name: 'Philippe', score: 10, isPlaying: true, colorState: ColorCode.HAS_INTERACTION },
            { name: 'Anthony', score: 3, isPlaying: true, colorState: ColorCode.HAS_LEFT },
        ];

        service.sortPlayerByDescendingState();

        expect(service.listOfPlayers).toEqual([
            { name: 'Anthony', score: 3, isPlaying: true, colorState: ColorCode.HAS_LEFT },
            { name: 'Philippe', score: 10, isPlaying: true, colorState: ColorCode.HAS_INTERACTION },
        ]);
    });

    it('should sort the list of players by ascending name if the color state is the same', () => {
        service.listOfPlayers = [
            { name: 'Philippe', score: 10, isPlaying: true, colorState: ColorCode.HAS_LEFT },
            { name: 'Anthony', score: 3, isPlaying: true, colorState: ColorCode.HAS_LEFT },
            { name: 'Sacha', score: 20, isPlaying: true, colorState: ColorCode.HAS_SUBMITTED },
        ];

        service.sortPlayerByAscendingState();

        expect(service.listOfPlayers).toEqual([
            { name: 'Sacha', score: 20, isPlaying: true, colorState: ColorCode.HAS_SUBMITTED },
            { name: 'Anthony', score: 3, isPlaying: true, colorState: ColorCode.HAS_LEFT },
            { name: 'Philippe', score: 10, isPlaying: true, colorState: ColorCode.HAS_LEFT },
        ]);
    });

    it('should sort the list of players by descending name if the color state is the same', () => {
        service.listOfPlayers = [
            { name: 'Massoud', score: 10, isPlaying: true, colorState: ColorCode.HAS_LEFT },
            { name: 'Amine', score: 3, isPlaying: true, colorState: ColorCode.HAS_LEFT },
            { name: 'Sacha', score: 20, isPlaying: true, colorState: ColorCode.HAS_SUBMITTED },
        ];

        service.sortPlayerByDescendingState();

        expect(service.listOfPlayers).toEqual([
            { name: 'Amine', score: 3, isPlaying: true, colorState: ColorCode.HAS_LEFT },
            { name: 'Massoud', score: 10, isPlaying: true, colorState: ColorCode.HAS_LEFT },
            { name: 'Sacha', score: 20, isPlaying: true, colorState: ColorCode.HAS_SUBMITTED },
        ]);
    });

    it('should set the roomCode, join the room and request for the list of players', () => {
        const roomCode = '1234';
        service.initializeLobby(roomCode);
        expect(socketServiceMock.joinRoom).toHaveBeenCalled();
        expect(socketServiceMock.requestForListOfPlayers).toHaveBeenCalled();
    });

    it('should call handleChatPrivilege from socketService', () => {
        service.roomCode = '1234';
        const roomCode = '1234';
        const player = { name: 'Massoud', score: 0, isPlaying: true, colorState: ColorCode.HAS_NO_INTERACTION, isAllowedToChat: false };
        const isAllowedToChat = false;
        service.handleChatPrivilege(player, isAllowedToChat);
        expect(socketServiceMock.handleChatPrivilege).toHaveBeenCalledWith(roomCode, player.name, isAllowedToChat);
    });
});
