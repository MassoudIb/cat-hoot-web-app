import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class RoomsService {
    private roomCode: string;
    private roomMode: boolean;
    private roomGameId: string;

    setRoomCode(code: string) {
        this.roomCode = code;
    }

    getRoomCode(): string {
        return this.roomCode;
    }

    setRoomMode(isRandom: boolean, gameId: string) {
        if (isRandom) this.roomMode = true;
        else this.roomMode = false;
        this.roomGameId = gameId;
    }

    getRoomMode(): boolean {
        return this.roomMode;
    }

    getRoomId(): string {
        return this.roomGameId;
    }
}
