/* eslint-disable max-lines */
// we need all those lines of code
import { ColorCode } from '@app/constants/color-code';
import { FOUR_DIGITS, NOT_FOUND, ONE_HALF_SECOND, POINT_BONUS } from '@app/constants/data';
import { Server, Socket } from 'socket.io';
import { Service } from 'typedi';
import { GameManager } from './game-manager.service';
import { RoomManager } from './room-manager.service';

interface PlayerAnswerTime {
    playerId: string;
    answerTime: number;
}
interface Player {
    username: string;
    score: number;
    bonusAmount: number;
    numberOfSelectedChoice?: number;
    hasSubmitted?: boolean;
}

@Service()
export class UserManager {
    listOfPlayers: string[];
    roomUsernames = new Map<string, string[]>();
    roomUsernamesValidator = new Map<string, string[]>();
    roomFirstPlayerToAnswer = new Map<string, { playerIdList: PlayerAnswerTime[] }>();
    clientSocketId = new Map<string, string>();
    private clientSocketScore = new Map<string, Map<string, Player>>();
    private clientSocketQrl = new Map<string, { playerId: string; username: string; answer: string; point: number; score: number }[]>();
    private clientSocketCorrectionQrl = new Map<
        string,
        { questionIndex: number; questionTitle: string; amount0: number; amount50: number; amount100: number }[]
    >();

    constructor(
        private sio: Server,
        private roomManager: RoomManager,
        private gameManager: GameManager,
    ) {}

    handleUserEvents(socket: Socket): void {
        socket.on('validateCode', (roomCode) => {
            const isCodeUsed = this.roomManager.hasRoom(roomCode);
            const isLocked = this.roomManager.isRoomLocked(roomCode);
            if (isCodeUsed) {
                if (!isLocked) {
                    socket.emit('codeValidated', true);
                } else {
                    socket.emit('roomLocked', true);
                }
            } else {
                socket.emit('codeValidated', false);
            }
        });
        socket.on('validateUsername', (userId) => {
            const lowerUsername = userId.username.toLowerCase();
            const userRoom = this.createRoomString(userId.userCode);
            let isUsernameValid = true;
            if (!this.roomManager.isRoomLocked(userId.userCode) && this.sio.sockets.adapter.rooms.get(userRoom) !== undefined) {
                if (lowerUsername !== 'organisateur' && !this.roomManager.isRoomLocked(userId.userCode)) {
                    const getLowerUsernames = this.roomUsernamesValidator.get(userRoom);
                    const getUsernames = this.roomUsernames.get(userRoom);
                    if (getLowerUsernames) {
                        if (getLowerUsernames.includes(lowerUsername)) isUsernameValid = false;
                        else {
                            getLowerUsernames.push(lowerUsername);
                            getUsernames.push(userId.username);
                        }
                    } else {
                        this.roomUsernamesValidator.set(userRoom, [lowerUsername]);
                        this.roomUsernames.set(userRoom, [userId.username]);
                    }
                } else isUsernameValid = false;
                socket.emit('usernameValidated', isUsernameValid);

                if (isUsernameValid) {
                    const clientRoomUsername = userId.userCode + userId.username;
                    this.clientSocketId.set(clientRoomUsername, socket.id);
                    if (!this.clientSocketScore.has(userRoom)) {
                        this.clientSocketScore.set(userRoom, new Map());
                        this.clientSocketQrl.set(userRoom, []);
                        this.clientSocketCorrectionQrl.set(userRoom, []);
                    }
                    this.clientSocketScore
                        .get(userRoom)
                        .set(socket.id, { username: clientRoomUsername, score: 0, bonusAmount: 0, numberOfSelectedChoice: 0, hasSubmitted: false });
                    this.roomFirstPlayerToAnswer.set(userId.userCode, { playerIdList: [] });
                    const updatedUsernames = this.roomUsernames.get(userRoom);
                    socket.join(userRoom);
                    socket.emit('listOfPlayers', updatedUsernames);
                    this.listOfPlayers = [...updatedUsernames];
                    socket.to(userRoom).emit('newPlayer', userId.username);
                }
            } else socket.emit('roomUnavailable');
        });
        socket.on('addOrganizerPlayerRandomGame', (roomCode) => {
            const userRoom = this.createRoomString(roomCode);
            const getUsernames = this.roomUsernames.get(userRoom);
            const getLowerUsernames = this.roomUsernamesValidator.get(userRoom);
            if (getUsernames) getUsernames.push('Organisateur');
            else this.roomUsernames.set(userRoom, ['Organisateur']);
            if (getLowerUsernames) getLowerUsernames.push('organisateur');
            else this.roomUsernamesValidator.set(userRoom, ['organisateur']);

            const clientRoomUsername = roomCode + 'Organisateur';
            this.clientSocketId.set(clientRoomUsername, socket.id);
            if (!this.clientSocketScore.has(userRoom)) {
                this.clientSocketScore.set(userRoom, new Map());
            }
            this.clientSocketScore.get(userRoom).set(socket.id, { username: clientRoomUsername, score: 0, bonusAmount: 0 });
            this.roomFirstPlayerToAnswer.set(roomCode, { playerIdList: [] });
        });
        socket.on('playerLeft', (deletedUser) => {
            const deletedClientRoom = this.createRoomString(deletedUser.userCode);
            const getLowerUsernames = this.roomUsernamesValidator.get(deletedClientRoom);
            const getUsernames = this.roomUsernames.get(deletedClientRoom);
            if (getLowerUsernames && getUsernames) {
                const indexToDeleteLower = getLowerUsernames.findIndex((lowerUsername) => lowerUsername === deletedUser.username.toLowerCase());
                const indexToDelete = getUsernames.findIndex((username) => username === deletedUser.username);
                getLowerUsernames.splice(indexToDeleteLower, 1);
                getUsernames.splice(indexToDelete, 1);
            }
            this.emitPlayerLeftMessage(deletedUser.username, deletedUser.userCode);
            this.sio.to(deletedClientRoom).emit('deletePlayer', deletedUser.username);
            if (getUsernames && getUsernames.length === 0) {
                this.sio.to(deletedClientRoom).emit('kickOrganizer');
            }
        });
        socket.on('playerKicked', (kickedUser) => {
            const kickedClientRoom = this.createRoomString(kickedUser.userCode);
            const getUsernames = this.roomUsernames.get(kickedClientRoom);
            if (getUsernames) {
                const indexToDelete = getUsernames.findIndex((kickedUsername) => kickedUsername === kickedUser.username);
                getUsernames.splice(indexToDelete, 1);
            }
            const kickedClient = kickedUser.userCode + kickedUser.username;
            const kickedClientId = this.clientSocketId.get(kickedClient);
            this.emitPlayerLeftMessage(kickedUser.username, kickedUser.userCode);
            this.sio.to(kickedClientId).emit('wasKicked');
            this.sio.to(kickedClientRoom).emit('deletePlayer', kickedUser.username);
        });
        socket.on('removeId', (removedUser) => {
            const removedClientRoom = this.createRoomString(removedUser.userCode);
            const removedClient = removedUser.userCode + removedUser.username;
            const clientId = this.clientSocketId.get(removedClient);
            this.clientSocketScore.get(removedClientRoom).delete(clientId);
            this.clientSocketId.delete(removedClient);
            socket.leave(removedClientRoom);
        });
        socket.on('cleanMaps', (deletedRoom) => {
            const deleteRoomName = this.createRoomString(deletedRoom.userCode);
            this.roomUsernames.delete(deleteRoomName);
            this.roomUsernamesValidator.delete(deleteRoomName);
            this.clientSocketScore.delete(deleteRoomName);
        });
        socket.on('addToAnswerOrderList', (roomCode, playerId) => {
            if (this.roomFirstPlayerToAnswer.has(roomCode)) {
                const playerAnswer: PlayerAnswerTime = {
                    playerId,
                    answerTime: Date.now(),
                };
                this.addPlayerToAnswerTime(roomCode, playerAnswer);
            }
        });
        // We need all those parameters
        // eslint-disable-next-line max-params
        socket.on('sendAnswerToOrg', (roomCode, username, answer, point, playerId) => {
            const clientRoomCode = this.createRoomString(roomCode);
            const roomDetails = this.clientSocketQrl.get(clientRoomCode);
            const score = 0;
            roomDetails.push({ playerId, username, answer, point, score });

            if (roomDetails.length >= this.sio.sockets.adapter.rooms.get(clientRoomCode)?.size - 1) {
                this.sio.to(clientRoomCode).emit('qrlAnswerSent', roomDetails);
            }
        });

        socket.on('sendScoreQrlToClient', (roomCode, listOfQrlAnswer) => {
            const clientRoomCode = this.createRoomString(roomCode);
            const roomDetails = this.clientSocketScore.get(clientRoomCode);
            for (const player of listOfQrlAnswer) {
                const playerDetails = roomDetails.get(player.playerId);
                playerDetails.score += player.score;
                this.sio.to(player.playerId).emit('updatedScoreQRL', playerDetails.score);
                this.sio.to(clientRoomCode).emit('updateScore', { name: player.username, score: playerDetails.score, isPLaying: true });
            }
        });

        socket.on('sendDataCorrectionQrlToServer', (roomCode, dataCorrection) => {
            const clientRoomCode = this.createRoomString(roomCode);
            const roomDataCorrections = this.clientSocketCorrectionQrl.get(clientRoomCode);
            roomDataCorrections.push(dataCorrection);
        });

        socket.on('retrieveDataCorrection', (roomCode, playerId) => {
            const clientRoomCode = this.createRoomString(roomCode);
            const roomDataCorrection = this.clientSocketCorrectionQrl.get(clientRoomCode);
            const dataCorrection: { questionIndex: number; questionTitle: string; amount0: number; amount50: number; amount100: number }[] = [];

            roomDataCorrection.forEach((correction) => {
                dataCorrection.push(correction);
            });

            this.sio.to(playerId).emit('listOfDataCorrectionQrl', dataCorrection);
        });

        socket.on('clearAnswerOrg', (roomCode) => {
            const clientRoomCode = this.createRoomString(roomCode);
            this.clientSocketQrl.set(clientRoomCode, []);
        });

        socket.on('incrementScoreServer', (questionPoints, playerId, roomCode) => {
            const clientRoomCode = this.createRoomString(roomCode);
            const roomDetails = this.clientSocketScore.get(clientRoomCode);
            const playerDetails = roomDetails.get(playerId);
            const username = this.getUsername(playerDetails.username);
            if (this.roomFirstPlayerToAnswer.get(roomCode).playerIdList.length === 0) {
                this.sio.to(playerId).emit('scoreUpdated', { score: playerDetails.score, bonus: false });
                this.sio.to(clientRoomCode).emit('updateScore', { name: username, score: playerDetails.score, isPLaying: true });
            }

            if (this.roomFirstPlayerToAnswer.get(roomCode).playerIdList.length === 1) {
                playerDetails.score += questionPoints * POINT_BONUS;
                playerDetails.bonusAmount += 1;
                this.sio.to(playerId).emit('scoreUpdated', { score: playerDetails.score, bonus: true });
                this.sio.to(clientRoomCode).emit('updateScore', { name: username, score: playerDetails.score, isPLaying: true });
            } else {
                const firstPlayer = this.roomFirstPlayerToAnswer.get(roomCode).playerIdList[0];
                const secondPlayer = this.roomFirstPlayerToAnswer.get(roomCode).playerIdList[1];
                const timeDifference = secondPlayer.answerTime - firstPlayer.answerTime;
                if (playerId === firstPlayer.playerId && timeDifference >= ONE_HALF_SECOND) {
                    playerDetails.score += questionPoints * POINT_BONUS;
                    playerDetails.bonusAmount += 1;
                    this.sio.to(playerId).emit('scoreUpdated', { score: playerDetails.score, bonus: true });
                    this.sio.to(clientRoomCode).emit('updateScore', { name: username, score: playerDetails.score, isPLaying: true });
                } else {
                    playerDetails.score += questionPoints;
                    this.sio.to(playerId).emit('scoreUpdated', { score: playerDetails.score, bonus: false });
                    this.sio.to(clientRoomCode).emit('updateScore', { name: username, score: playerDetails.score, isPLaying: true });
                }
            }
        });
        socket.on('clearAnswersOnServer', (roomCode) => {
            this.roomFirstPlayerToAnswer.get(roomCode).playerIdList = [];
        });
        socket.on('retrieveDataPlayers', (playerId, roomCode) => {
            const playerArray: { username: string; scores: number[]; bonusAmounts: number[] }[] = [];
            const clientRoomCode = this.createRoomString(roomCode);
            if (this.clientSocketScore.get(clientRoomCode)) {
                this.clientSocketScore.get(clientRoomCode).forEach((value) => {
                    const playerIndex = playerArray.findIndex((player) => player.username === value.username);

                    if (playerIndex !== NOT_FOUND) {
                        playerArray[playerIndex].scores.push(value.score);
                        playerArray[playerIndex].bonusAmounts.push(value.bonusAmount);
                    } else {
                        playerArray.push({
                            username: value.username,
                            scores: [value.score],
                            bonusAmounts: [value.bonusAmount],
                        });
                    }
                });
                this.sio.to(playerId).emit('listOfPlayersWithDetails', playerArray);
            }
        });

        socket.on('requestListOfPlayers', (roomCode) => {
            const userRoom = 'room' + roomCode;
            this.sio.to(userRoom).emit('answerWithListOfPlayers', this.roomUsernames.get(userRoom));
        });

        socket.on('playerSubmitted', (roomCode, playerId) => {
            const username = this.getUsernamefromId(roomCode, playerId);
            this.setSubmittedStatus(roomCode, playerId);
            this.gameManager.emitInteractionCode(this.createRoomString(roomCode), username, ColorCode.HAS_SUBMITTED);
        });
        socket.on('playerSelectedChoice', (roomCode, playerId) => {
            const username = this.getUsernamefromId(roomCode, playerId);
            this.setNumberOfChoice(roomCode, playerId, true);
            this.gameManager.emitInteractionCode(this.createRoomString(roomCode), username, ColorCode.HAS_INTERACTION);
        });
        socket.on('playerUnselectedChoice', (roomCode, playerId) => {
            const player = this.getPlayerFromId(roomCode, playerId);
            const username = this.getUsername(player.username);
            this.setNumberOfChoice(roomCode, playerId, false);
            if (!player.numberOfSelectedChoice)
                this.gameManager.emitInteractionCode(this.createRoomString(roomCode), username, ColorCode.HAS_NO_INTERACTION);
        });
        socket.on('playerIsTyping', (roomCode, playerId) => {
            this.updateTyping(roomCode, playerId, true);
        });
        socket.on('playerIsNotTyping', (roomCode, playerId) => {
            this.updateTyping(roomCode, playerId, false);
        });
        socket.on('switchPlayersToNoInteraction', (roomCode) => {
            this.switchPlayersToNoInteraction(roomCode);
        });
        socket.on('handleChatPrivilege', (roomCode, username, isAllowedToChat) => {
            this.handleChatPrivilege(roomCode, username, isAllowedToChat);
        });
    }
    createRoomString(roomCode: string): string {
        return 'room' + roomCode;
    }
    addPlayerToAnswerTime(roomId: string, playerAnswer: PlayerAnswerTime): void {
        const playerList = this.roomFirstPlayerToAnswer.get(roomId).playerIdList;
        if (playerList) {
            playerList.push(playerAnswer);
        }
    }
    getListOfPlayer(roomCode: string) {
        const userRoom = 'room' + roomCode;
        return this.roomUsernames.get(userRoom);
    }
    getUsername(userNameDetail: string) {
        return userNameDetail.slice(FOUR_DIGITS);
    }

    setSubmittedStatus(roomCode: string, playerId: string) {
        const clientRoomCode = this.createRoomString(roomCode);
        const roomDetails = this.clientSocketScore.get(clientRoomCode);
        const playerDetails = roomDetails.get(playerId);
        playerDetails.hasSubmitted = true;
    }

    emitPlayerLeftMessage(username: string, roomCode: string) {
        const room = this.createRoomString(roomCode);
        const message = `${username} a quitté la partie ${roomCode} !`;
        const timeStamp = new Date();
        this.sio.to(room).emit('newMessage', { username: 'Système', message, timeStamp, isNotification: true });
    }

    getPlayerFromId(roomCode: string, playerId: string) {
        const clientRoomCode = this.createRoomString(roomCode);
        const roomDetails = this.clientSocketScore.get(clientRoomCode);
        const playerDetails = roomDetails.get(playerId);
        return playerDetails;
    }
    getUsernamefromId(roomCode: string, playerId: string) {
        const playerDetails = this.getPlayerFromId(roomCode, playerId);
        return this.getUsername(playerDetails.username);
    }
    setNumberOfChoice(roomCode: string, playerId: string, isUp: boolean) {
        const clientRoomCode = this.createRoomString(roomCode);
        const roomDetails = this.clientSocketScore.get(clientRoomCode);
        const playerDetails = roomDetails.get(playerId);
        if (isUp) playerDetails.numberOfSelectedChoice++;
        else playerDetails.numberOfSelectedChoice--;
    }
    updateTyping(roomCode: string, playerId: string, isTyping: boolean) {
        const clientRoomCode = this.createRoomString(roomCode);

        const roomDetails = this.clientSocketScore.get(clientRoomCode);
        if (roomDetails) {
            const playerDetails = roomDetails.get(playerId);
            if (playerDetails) {
                if (!playerDetails.hasSubmitted) {
                    if (isTyping)
                        this.gameManager.emitInteractionCode(clientRoomCode, this.getUsername(playerDetails.username), ColorCode.HAS_INTERACTION);
                    else this.gameManager.emitInteractionCode(clientRoomCode, this.getUsername(playerDetails.username), ColorCode.HAS_NO_INTERACTION);
                }
            }
        }
    }
    switchPlayersToNoInteraction(roomCode: string) {
        const roomDetails = this.clientSocketScore.get(this.createRoomString(roomCode));
        roomDetails.forEach((player) => {
            player.numberOfSelectedChoice = 0;
            player.hasSubmitted = false;
            this.gameManager.emitInteractionCode(this.createRoomString(roomCode), this.getUsername(player.username), ColorCode.HAS_NO_INTERACTION);
        });
    }
    playerSelectedChoice(roomCode: string, playerId: string, isSelected: boolean) {
        const username = this.getUsernamefromId(roomCode, playerId);
        if (isSelected) {
            this.setNumberOfChoice(roomCode, playerId, isSelected);
            this.gameManager.emitInteractionCode(this.createRoomString(roomCode), username, ColorCode.HAS_INTERACTION);
        } else {
            const player = this.getPlayerFromId(roomCode, playerId);
            this.setNumberOfChoice(roomCode, playerId, isSelected);
            if (!player.numberOfSelectedChoice)
                this.gameManager.emitInteractionCode(this.createRoomString(roomCode), username, ColorCode.HAS_NO_INTERACTION);
        }
    }

    handleChatPrivilege(roomCode: string, username: string, isAllowedToChat: boolean) {
        const clientRoomCode = this.createRoomString(roomCode);
        const roomDetails = this.clientSocketScore.get(clientRoomCode);
        const playerId: string | undefined = (() => {
            if (roomDetails) {
                for (const [id, player] of roomDetails) {
                    if (this.getUsername(player.username) === username) return id;
                }
            }

            return undefined;
        })();

        if (playerId) this.gameManager.handleChatPrivilege(username, playerId, isAllowedToChat);
    }
}
