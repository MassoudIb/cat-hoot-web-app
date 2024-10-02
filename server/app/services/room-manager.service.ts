import { MAX_CHARACTERS } from '@app/constants/data';
import { Server, Socket } from 'socket.io';
import { TimerService } from './timer-service';

export class RoomManager {
    roomMap = new Map<string, string>();
    timerService: TimerService;
    playerAnswersMap = new Map<string, Set<string>>();
    private roomLockStatus = new Map<string, boolean>();

    constructor(private sio: Server) {
        this.timerService = new TimerService(sio);
    }
    tempMethod() {
        // Method only there for now so I don't get an error about sio not being used. Will never be called.
        // We need sio to init RoomManager in socket-manager.service.
    }

    setRoomLockStatus(roomCode: string, isLocked: boolean): void {
        this.roomLockStatus.set(roomCode, isLocked);
    }

    isRoomLocked(roomCode: string): boolean {
        return this.roomLockStatus.get(roomCode) || false;
    }

    handleRoomEvents(socket: Socket): void {
        socket.on('pauseTimer', (roomCode) => {
            const clientRoomCode = 'room' + roomCode;
            this.timerService.pauseTimerForRoom(clientRoomCode);
        });

        socket.on('resumeTimer', (roomCode) => {
            const clientRoomCode = 'room' + roomCode;
            this.timerService.resumeTimerForRoom(clientRoomCode);
        });

        socket.on('startPanicMode', (roomCode) => {
            this.timerService.startPanicModeForRoom('room' + roomCode);
            this.sio.to('room' + roomCode).emit('panicModeStarted');
        });

        socket.on('initLobby', () => {
            const roomCode = this.createCode();
            const newRoom = 'room' + roomCode;
            this.roomMap.set(roomCode, newRoom);
            this.playerAnswersMap.set(newRoom, new Set<string>());
            socket.join(newRoom);
            socket.emit('createdRoom', roomCode);
        });

        socket.on('joinRoom', ({ username, roomCode }) => {
            const roomName = 'room' + roomCode;
            const message = `${username} a rejoint la salle ${roomCode} !`;
            const timeStamp = new Date();
            this.sio.to(roomName).emit('newMessage', { username: 'Système', message, timeStamp, isNotification: true });
        });

        socket.on('sendMessage', ({ roomCode, username, message, isAllowedToChat }) => {
            if (this.roomMap.has(roomCode)) {
                const roomName = 'room' + roomCode;
                const timeStamp = new Date();
                const trimmedMessage = message.substring(0, MAX_CHARACTERS);
                const messageData = { username, message: trimmedMessage, timeStamp, isAllowedToChat };
                this.sio.to(roomName).emit('newMessage', messageData);
            }
        });

        socket.on('deleteRoom', (deletedCode: string) => {
            const removedRoomCode = 'room' + deletedCode;
            this.sio.to(removedRoomCode).emit('terminateRoom');
            this.roomMap.delete(deletedCode);
        });

        socket.on('redirectAll', (roomCode, quizId) => {
            const clientRoomCode = 'room' + roomCode;
            this.sio.to(clientRoomCode).emit('redirectToNewPage', quizId);
        });
        socket.on('openDialogboxWaiting', (roomCode, quizId) => {
            const clientRoomCode = 'room' + roomCode;
            this.sio.to(clientRoomCode).emit('openDialogbox', quizId);
        });

        socket.on('openNextQuestionDialog', (roomCode) => {
            const clientRoomCode = 'room' + roomCode;
            this.sio.to(clientRoomCode).emit('openDialogbox');
        });

        // We need all these params for this method
        // eslint-disable-next-line max-params
        socket.on('answerSubmitted', (roomCode, questionType, playerId, isRandom?) => {
            const clientRoomCode = 'room' + roomCode;
            const playerAnswers = this.playerAnswersMap.get(clientRoomCode);
            if (playerAnswers) {
                playerAnswers.add(playerId);
                if (playerAnswers.size >= this.sio.sockets.adapter.rooms.get(clientRoomCode)?.size && isRandom) {
                    this.sio.to(clientRoomCode).emit('allPlayersAnswered');
                    playerAnswers.clear();
                } else if (playerAnswers.size >= this.sio.sockets.adapter.rooms.get(clientRoomCode)?.size - 1 && !isRandom) {
                    if (questionType === 'QCM') this.sio.to(clientRoomCode).emit('allPlayersAnswered');
                    else this.sio.to(clientRoomCode).emit('allPlayersAnsweredQrl');
                    playerAnswers.clear();
                }
            }
        });

        socket.on('playerSurrenderedDuringQRL', (roomCode, questionType, isRandom?) => {
            const clientRoomCode = 'room' + roomCode;
            const playerAnswers = this.playerAnswersMap.get(clientRoomCode);
            if (playerAnswers) {
                if (playerAnswers.size >= this.sio.sockets.adapter.rooms.get(clientRoomCode)?.size && isRandom) {
                    this.sio.to(clientRoomCode).emit('allPlayersAnswered');
                    playerAnswers.clear();
                } else if (playerAnswers.size >= this.sio.sockets.adapter.rooms.get(clientRoomCode)?.size - 1 && !isRandom) {
                    if (questionType === 'QCM') this.sio.to(clientRoomCode).emit('allPlayersAnswered');
                    else this.sio.to(clientRoomCode).emit('allPlayersAnsweredQrl');
                    playerAnswers.clear();
                }
            }
        });

        socket.on('waitingStartTimer', (roomCode, questionDuration) => {
            const clientRoomCode = 'room' + roomCode;
            this.timerService.startTimerForRoom(clientRoomCode, questionDuration);
        });

        socket.on('stopTimerRoom', (roomCode) => {
            const clientRoomCode = 'room' + roomCode;
            this.timerService.stopTimerForRoom(clientRoomCode);
        });

        socket.on('leaveRoom', (roomCode) => {
            const clientRoomCode = 'room' + roomCode;
            socket.leave(clientRoomCode);
        });

        socket.on('toggleLockRoom', (roomCode) => {
            const currentStatus = this.isRoomLocked(roomCode);
            this.setRoomLockStatus(roomCode, !currentStatus);
            this.sio.to('room' + roomCode).emit('roomLockedStatusChanged', !currentStatus);
        });

        socket.on('joinRoom', (roomCode) => {
            const hostRoom = 'room' + roomCode;
            socket.join(hostRoom);
        });

        socket.on('getPlayersSizeRandom', (roomCode) => {
            const clientRoomCode = 'room' + roomCode;
            this.sio.to(clientRoomCode).emit('getRandomQuizSize', this.sio.sockets.adapter.rooms.get(clientRoomCode).size);
        });
    }

    hasRoom(roomCode: string): boolean {
        return this.roomMap.has(roomCode);
    }

    createCode(): string {
        const numbers = '0123456789';
        const codeLength = 4;
        let newRoomCode = '';
        let isCodeAvailable = false;

        while (!isCodeAvailable) {
            for (let i = 0; i < codeLength; i++) {
                newRoomCode += numbers.charAt(Math.floor(Math.random() * numbers.length));
            }
            if (!this.roomMap.has(newRoomCode)) isCodeAvailable = true;
        }
        return newRoomCode;
    }
}
