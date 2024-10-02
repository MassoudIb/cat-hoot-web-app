import * as http from 'http';
import * as io from 'socket.io';
import { GameManager } from './game-manager.service';
import { RoomManager } from './room-manager.service';
import { UserManager } from './user-manager.service';

export class SocketManager {
    private roomManager: RoomManager;
    private userManager: UserManager;
    private gameManager: GameManager;
    private sio: io.Server;

    constructor(server: http.Server) {
        this.sio = new io.Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
        this.roomManager = new RoomManager(this.sio);
        this.gameManager = new GameManager(this.sio);
        this.userManager = new UserManager(this.sio, this.roomManager, this.gameManager);
    }

    handleSockets(): void {
        this.sio.on('connection', (socket) => {
            this.roomManager.handleRoomEvents(socket);
            this.userManager.handleUserEvents(socket);
            this.gameManager.handleGameEvent(socket);
        });
    }
}
