import { TestBed } from '@angular/core/testing';

import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
    let service: RoomsService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(RoomsService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set the room code when a valid code is provided', () => {
        const code = 'ABC123';

        service.setRoomCode(code);

        expect(service.getRoomCode()).toEqual(code);
    });

    it('should set room mode to true when isRandom is true and gameId is provided', () => {
        const gameId = '123';
        service.setRoomMode(true, gameId);

        expect(service.getRoomMode()).toBeTrue();
    });

    it('should set room mode to false when isRandom is false', () => {
        const gameId = '123';
        service.setRoomMode(false, gameId);

        expect(service.getRoomMode()).toBeFalse();
        expect(service.getRoomId()).toEqual(gameId);
    });
});
