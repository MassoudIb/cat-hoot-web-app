/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-unused-expressions */
// we disable some lint to simplify some test
import { ColorCode } from '@app/constants/color-code';
import { Server } from 'app/server';
import { assert, expect } from 'chai';
import { Socket, io as ioClient } from 'socket.io-client';
import { Container } from 'typedi';
import { GameManager } from './game-manager.service';
import { UserManager } from './user-manager.service';
import sinon = require('sinon');

const RESPONSE_DELAY = 1000;
interface Player {
    username: string;
    score: number;
    bonusAmount: number;
    numberOfSelectedChoice?: number;
}

describe('UserManager', () => {
    let server: Server;
    let clientSocket: Socket;
    let userManager: UserManager;
    let gameManagerMock: GameManager;

    const urlString = 'http://localhost:3000';

    beforeEach(async () => {
        server = Container.get(Server);
        await server.init();
        gameManagerMock = new GameManager(server['socketManager']['sio']);
        userManager = new UserManager(server['socketManager']['sio'], server['socketManager']['roomManager'], gameManagerMock);
        clientSocket = ioClient(urlString, { forceNew: true });
    });

    afterEach(() => {
        if (clientSocket) {
            clientSocket.close();
        }
        server['socketManager']['sio'].close();
    });

    it('should create a room string', () => {
        const roomCode = '1234';
        const roomString = userManager.createRoomString(roomCode);
        expect(roomString).to.equal('room1234');
    });

    it('should emit "codeValidated" with true if room code is used and not locked', (done) => {
        const roomCode = '1234';
        userManager['roomManager'].hasRoom = () => true;
        userManager['roomManager'].setRoomLockStatus(roomCode, false);
        clientSocket.emit('validateCode', roomCode);
        clientSocket.on('codeValidated', (isValid: boolean) => {
            assert.isTrue(isValid);
            done();
        });
    });

    it('should emit "codeValidated" with false if room code is used and locked', (done) => {
        const roomCode = '1234';
        userManager['roomManager'].setRoomLockStatus(roomCode, true);
        userManager['roomManager'].hasRoom = () => true;
        clientSocket.emit('validateCode', roomCode);
        clientSocket.on('roomLocked', (isValid: boolean) => {
            assert.isTrue(isValid);
            done();
        });
    });

    it('should emit "codeValidated" with false if room code is not used', (done) => {
        const roomCode = '1234';
        userManager['roomManager'].hasRoom = () => false;
        clientSocket.emit('validateCode', roomCode);
        clientSocket.on('codeValidated', (isValid: boolean) => {
            assert.isFalse(isValid);
            done();
        });
    });

    it('should emit "usernameValidated" with true for a unique username', (done) => {
        const clientSocketOrganizer = ioClient('http://localhost:3000', { forceNew: true });
        const clientSocketUser1 = ioClient('http://localhost:3000', { forceNew: true });

        clientSocketOrganizer.emit('initLobby');
        clientSocketOrganizer.on('createdRoom', (roomCode) => {
            userManager['roomManager'].setRoomLockStatus(roomCode, false);
            clientSocketUser1.emit('validateUsername', { username: 'user1', userCode: roomCode });

            clientSocketUser1.on('usernameValidated', (isValid: boolean) => {
                try {
                    assert.isTrue(isValid);
                    done();
                } catch (error) {
                    done(error);
                }
            });
        });
    });

    it('should emit "usernameValidated" with false for an already used username', (done) => {
        const clientSocketOrganizer = ioClient('http://localhost:3000', { forceNew: true });
        const clientSocketUser1 = ioClient('http://localhost:3000', { forceNew: true });

        clientSocketOrganizer.emit('initLobby');
        clientSocketOrganizer.on('createdRoom', (roomCode) => {
            userManager['roomManager'].setRoomLockStatus(roomCode, false);
            clientSocketUser1.emit('validateUsername', { username: 'alreadyUsedUser', userCode: roomCode });
            setTimeout(() => {
                clientSocketUser1.emit('validateUsername', { username: 'alreadyUsedUser', userCode: roomCode });
                clientSocketUser1.on('usernameValidated', (isValid: boolean) => {
                    assert.isFalse(isValid);
                    done();
                });
            }, RESPONSE_DELAY);
        });
    });

    it('should emit "usernameValidated" with false for "organisateur"', (done) => {
        const clientSocketOrganizer = ioClient('http://localhost:3000', { forceNew: true });
        const clientSocketUser1 = ioClient('http://localhost:3000', { forceNew: true });

        clientSocketOrganizer.emit('initLobby');
        clientSocketOrganizer.on('createdRoom', (roomCode) => {
            userManager['roomManager'].setRoomLockStatus(roomCode, false);
            clientSocketUser1.emit('validateUsername', { username: 'organisateur', userCode: roomCode });
            clientSocketUser1.on('usernameValidated', (isValid: boolean) => {
                expect(isValid).to.be.false;
                done();
            });
        });
    });

    it('should emit "usernameValidated" with true for 2 unique username', (done) => {
        const clientSocketOrganizer = ioClient('http://localhost:3000', { forceNew: true });
        const clientSocketUser1 = ioClient('http://localhost:3000', { forceNew: true });
        const clientSocketUser2 = ioClient('http://localhost:3000', { forceNew: true });

        clientSocketOrganizer.emit('initLobby');
        clientSocketOrganizer.on('createdRoom', (roomCode) => {
            userManager['roomManager'].setRoomLockStatus(roomCode, false);
            clientSocketUser1.emit('validateUsername', { username: 'uniqueUser1', userCode: roomCode });
            setTimeout(() => {
                clientSocketUser2.emit('validateUsername', { username: 'uniqueUser2', userCode: roomCode });
                clientSocketUser2.on('usernameValidated', (isValid: boolean) => {
                    assert.isTrue(isValid);
                    done();
                });
            }, RESPONSE_DELAY);
        });
    });

    it('should handle a player leaving, update the usernames lists, and emit events accordingly', (done) => {
        const clientSocketOrganizer = ioClient('http://localhost:3000', { forceNew: true });
        const clientSocketUser1 = ioClient('http://localhost:3000', { forceNew: true });

        clientSocketOrganizer.emit('initLobby');
        clientSocketOrganizer.on('createdRoom', (roomCode) => {
            clientSocketUser1.emit('validateUsername', { username: 'user1', userCode: roomCode });

            setTimeout(() => {
                clientSocketUser1.emit('playerLeft', { username: 'user1', userCode: roomCode });

                clientSocketUser1.on('deletePlayer', (deletedUsername) => {
                    try {
                        expect(deletedUsername).to.equal('user1');
                        done();

                        clientSocketUser1.close();
                        clientSocketOrganizer.close();
                    } catch (error) {
                        done(error);
                    }
                });
            }, RESPONSE_DELAY);
        });
    });

    it('addPlayerToAnswerTime should add a player answer time to the list', () => {
        userManager.roomFirstPlayerToAnswer.set('room123', { playerIdList: [] });
        userManager.roomUsernames.set('user123', ['Alice', 'Bob']);

        const playerAnswerTime = { playerId: 'player1', answerTime: 100 };
        userManager.addPlayerToAnswerTime('room123', playerAnswerTime);

        const list = userManager.roomFirstPlayerToAnswer.get('room123').playerIdList;
        expect(list).to.include(playerAnswerTime);
    });

    it('getListOfPlayer should return the list of players for a given room', () => {
        userManager.roomUsernames.set('room123', ['Alice', 'Bob']);
        const players = userManager.getListOfPlayer('123');
        expect(players).to.deep.equal(['Alice', 'Bob']);
    });

    it('getUsername should return the username without the room code prefix', () => {
        userManager.roomFirstPlayerToAnswer.set('room123', { playerIdList: [] });
        userManager.roomUsernames.set('user123', ['Alice', 'Bob']);
        const username = userManager.getUsername('user123Alice');
        expect(username).to.equal('123Alice');
    });
    it('should handle a player being kicked, update the usernames lists, and emit events accordingly', (done) => {
        const clientSocketOrganizer = ioClient('http://localhost:3000', { forceNew: true });
        const clientSocketUser1 = ioClient('http://localhost:3000', { forceNew: true });

        clientSocketOrganizer.emit('initLobby');
        clientSocketOrganizer.on('createdRoom', (roomCode) => {
            clientSocketUser1.emit('validateUsername', { username: 'user1', userCode: roomCode });

            setTimeout(() => {
                clientSocketOrganizer.emit('playerKicked', { username: 'user1', userCode: roomCode });

                clientSocketUser1.on('wasKicked', () => {
                    try {
                        clientSocketUser1.on('deletePlayer', (deletedUsername) => {
                            expect(deletedUsername).to.equal('user1');
                            done();

                            clientSocketUser1.close();
                            clientSocketOrganizer.close();
                        });
                    } catch (error) {
                        done(error);
                    }
                });
            }, RESPONSE_DELAY);
        });
    });
    it('should handle a client ID removal and update internal mappings and leave the room accordingly', (done) => {
        const username = 'testUser';
        const clientSocketOrganizer = ioClient('http://localhost:3000', { forceNew: true });

        clientSocketOrganizer.emit('initLobby');
        clientSocketOrganizer.on('createdRoom', (roomCode) => {
            clientSocket.emit('validateUsername', { username, userCode: roomCode });

            setTimeout(() => {
                clientSocket.emit('removeId', { username, userCode: roomCode });

                setTimeout(() => {
                    expect(userManager.clientSocketId.has(username)).to.be.false;
                    done();
                    clientSocketOrganizer.close();
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        });
    });

    it('should clean up internal maps when receiving a cleanMaps event for a given room', (done) => {
        const clientSocketAdmin = ioClient('http://localhost:3000', { forceNew: true });
        const username = 'testUser';

        clientSocketAdmin.emit('initLobby');
        clientSocketAdmin.on('createdRoom', (roomCode) => {
            clientSocket.emit('validateUsername', { username, userCode: roomCode });

            setTimeout(() => {
                clientSocket.emit('cleanMaps', { userCode: roomCode });

                setTimeout(() => {
                    expect(userManager.roomUsernamesValidator.has(roomCode)).to.be.false;
                    expect(userManager.roomUsernames.has(roomCode)).to.be.false;
                    done();

                    clientSocketAdmin.close();
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        });
    });

    it('should add a player to the answer order list when receiving an addToAnswerOrderList event', (done) => {
        const clientSocketAdmin = ioClient('http://localhost:3000', { forceNew: true });
        const username = 'testUser';

        clientSocketAdmin.emit('initLobby');
        clientSocketAdmin.on('createdRoom', (roomCode) => {
            clientSocket.emit('validateUsername', { username, userCode: roomCode });

            setTimeout(() => {
                clientSocket.emit('addToAnswerOrderList', roomCode, { playerIdList: [] });

                setTimeout(() => {
                    expect(userManager.roomFirstPlayerToAnswer.has(roomCode)).to.be.false;
                    done();

                    clientSocketAdmin.close();
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        });
    });

    it('should clear the answers list for a given room', (done) => {
        const clientSocketAdmin = ioClient('http://localhost:3000', { forceNew: true });
        const username1 = 'playerOne';
        const username2 = 'playerTwo';

        clientSocketAdmin.emit('initLobby');
        clientSocketAdmin.on('createdRoom', (roomCode) => {
            const clientSocketPlayerOne = ioClient('http://localhost:3000', { forceNew: true });
            const clientSocketPlayerTwo = ioClient('http://localhost:3000', { forceNew: true });

            clientSocketPlayerOne.emit('validateUsername', { username: username1, userCode: roomCode });
            clientSocketPlayerTwo.emit('validateUsername', { username: username2, userCode: roomCode });

            setTimeout(() => {
                clientSocketPlayerOne.emit('addToAnswerOrderList', roomCode, clientSocketPlayerOne.id);
                clientSocketPlayerTwo.emit('addToAnswerOrderList', roomCode, clientSocketPlayerTwo.id);

                setTimeout(() => {
                    clientSocketAdmin.emit('clearAnswersOnServer', roomCode);

                    setTimeout(() => {
                        expect(userManager.roomFirstPlayerToAnswer.get(roomCode)).to.be.undefined;
                        done();

                        clientSocketAdmin.close();
                        clientSocketPlayerOne.close();
                        clientSocketPlayerTwo.close();
                    }, RESPONSE_DELAY);
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        });
    });

    it('should emit player details to a requesting client', (done) => {
        const clientSocketAdmin = ioClient('http://localhost:3000', { forceNew: true });
        const clientSocketRequesting = ioClient('http://localhost:3000', { forceNew: true });
        const usernameAdmin = 'adminUser';
        const usernameRequesting = 'requestingUser';

        clientSocketAdmin.emit('initLobby');
        clientSocketAdmin.on('createdRoom', (roomCode) => {
            clientSocketAdmin.emit('validateUsername', { username: usernameAdmin, userCode: roomCode });
            clientSocketRequesting.emit('validateUsername', { username: usernameRequesting, userCode: roomCode });

            setTimeout(() => {
                const playerDetails = [
                    { username: roomCode + usernameAdmin, scores: [0], bonusAmounts: [0] },
                    { username: roomCode + usernameRequesting, scores: [0], bonusAmounts: [0] },
                ];

                clientSocketRequesting.emit('retrieveDataPlayers', clientSocketRequesting.id, roomCode);

                clientSocketRequesting.on('listOfPlayersWithDetails', (playerArray) => {
                    try {
                        expect(playerArray).to.deep.include.members(playerDetails);
                        done();
                    } catch (error) {
                        done(error);
                    } finally {
                        clientSocketAdmin.close();
                        clientSocketRequesting.close();
                    }
                });
            }, RESPONSE_DELAY);
        });
    });

    it('should emit list of players to all clients in a room', (done) => {
        const clientSocketAdmin = ioClient('http://localhost:3000', { forceNew: true });
        const clientSocketUser = ioClient('http://localhost:3000', { forceNew: true });
        const usernameAdmin = 'adminUser';
        const usernameUser = 'testUser';

        clientSocketAdmin.emit('initLobby');
        clientSocketAdmin.on('createdRoom', (roomCode) => {
            clientSocketAdmin.emit('validateUsername', { username: usernameAdmin, userCode: roomCode });
            clientSocketUser.emit('validateUsername', { username: usernameUser, userCode: roomCode });

            setTimeout(() => {
                userManager.roomUsernames.set(userManager.createRoomString(roomCode), [usernameAdmin, usernameUser]);

                clientSocketAdmin.emit('requestListOfPlayers', roomCode);

                clientSocketAdmin.on('answerWithListOfPlayers', (listOfPlayers) => {
                    try {
                        expect(listOfPlayers).to.include.members([usernameAdmin, usernameUser]);
                        done();
                    } catch (error) {
                        done(error);
                    } finally {
                        clientSocketAdmin.close();
                        clientSocketUser.close();
                    }
                });
            }, RESPONSE_DELAY);
        });
    });

    it('should return playerId if username is found in roomDetails', () => {
        const roomCode = '1234';
        const username = 'John';
        const isAllowedToChat = true;
        userManager['gameManager'] = gameManagerMock;
        const handleChatPrivilegeSpy = sinon.spy(gameManagerMock, 'handleChatPrivilege');

        userManager.handleChatPrivilege(roomCode, username, isAllowedToChat);

        expect(handleChatPrivilegeSpy.calledOnceWithExactly(username, sinon.match.string, isAllowedToChat));
    });

    it('should call setNumberOfChoice and emit interaction code when isSelected is true', () => {
        const roomCode = '1234';
        const playerId = 'player1';
        const isSelected = true;
        const setNumberOfChoiceStub = sinon.stub(userManager, 'setNumberOfChoice');
        const emitInteractionCodeStub = sinon.stub(gameManagerMock, 'emitInteractionCode');

        const player1 = { username: 'TestUser', score: 0, bonusAmount: 0 };
        const player2 = { username: 'OtherUser', score: 0, bonusAmount: 0 };
        const mockClientSocketScore = new Map<string, Map<string, { username: string; score: number; bonusAmount: number }>>([
            [
                'room1234',
                new Map<string, { username: string; score: number; bonusAmount: number }>([
                    ['player1', player1],
                    ['player2', player2],
                ]),
            ],
        ]);
        userManager['clientSocketScore'] = mockClientSocketScore;

        userManager.playerSelectedChoice(roomCode, playerId, isSelected);

        expect(setNumberOfChoiceStub.calledOnceWithExactly(roomCode, playerId, isSelected)).to.be.true;
        expect(
            emitInteractionCodeStub.calledOnceWithExactly(
                userManager.createRoomString(roomCode),
                userManager.getUsernamefromId(roomCode, playerId),
                ColorCode.HAS_INTERACTION,
            ),
        ).to.be.true;

        setNumberOfChoiceStub.restore();
        emitInteractionCodeStub.restore();
    });
    it('should call setNumberOfChoice and emit interaction code when isSelected is false and player.numberOfSelectedChoice is 0', () => {
        const roomCode = '1234';
        const playerId = 'player1';
        const isSelected = false;
        const setNumberOfChoiceStub = sinon.stub(userManager, 'setNumberOfChoice');
        const emitInteractionCodeStub = sinon.stub(gameManagerMock, 'emitInteractionCode');

        const player1 = { username: 'TestUser', score: 0, bonusAmount: 0, numberOfSelectedChoice: 0 };
        const player2 = { username: 'OtherUser', score: 0, bonusAmount: 0, numberOfSelectedChoice: 1 };
        const mockClientSocketScore = new Map<string, Map<string, Player>>([
            [
                'room1234',
                new Map<string, Player>([
                    ['player1', player1],
                    ['player2', player2],
                ]),
            ],
        ]);
        userManager['clientSocketScore'] = mockClientSocketScore;

        userManager.playerSelectedChoice(roomCode, playerId, isSelected);

        expect(setNumberOfChoiceStub.calledOnceWithExactly(roomCode, playerId, isSelected)).to.be.true;
        expect(
            emitInteractionCodeStub.calledOnceWithExactly(
                userManager.createRoomString(roomCode),
                userManager.getUsernamefromId(roomCode, playerId),
                ColorCode.HAS_NO_INTERACTION,
            ),
        ).to.be.true;

        setNumberOfChoiceStub.restore();
        emitInteractionCodeStub.restore();
    });
    it("should reset the 'numberOfSelectedChoice' property to 0 for all players in the room when there are players in the room", () => {
        const roomCode = '1234';
        userManager['clientSocketScore'].set(
            userManager.createRoomString(roomCode),
            new Map([
                ['player1', { username: 'player1', score: 0, bonusAmount: 0, numberOfSelectedChoice: 2 }],
                ['player2', { username: 'player2', score: 0, bonusAmount: 0, numberOfSelectedChoice: 3 }],
                ['player3', { username: 'player3', score: 0, bonusAmount: 0, numberOfSelectedChoice: 1 }],
            ]),
        );

        userManager.switchPlayersToNoInteraction(roomCode);

        const roomDetails = userManager['clientSocketScore'].get(userManager.createRoomString(roomCode));
        roomDetails.forEach((player) => {
            expect(player.numberOfSelectedChoice).to.equal(0);
        });
    });

    it('should not increment the number of selected choice when isUp is false and the current number of selected choice is 0', () => {
        const roomCode = '1234';
        const playerId = 'player1';
        const isUp = false;
        userManager['clientSocketScore'].set(
            userManager.createRoomString(roomCode),
            new Map([['player1', { username: 'player1', score: 0, bonusAmount: 0, numberOfSelectedChoice: 2 }]]),
        );

        userManager.setNumberOfChoice(roomCode, playerId, isUp);

        const clientRoomCode = userManager.createRoomString(roomCode);
        const roomDetails = userManager['clientSocketScore'].get(clientRoomCode);
        const playerDetails = roomDetails.get(playerId);

        expect(playerDetails.numberOfSelectedChoice).to.equal(1);
    });

    it('should decrement the number of selected choice when isUp is false and the current number of selected choice is greater than 0', () => {
        const roomCode = '1234';
        const playerId = 'player1';
        const isUp = true;
        userManager['clientSocketScore'].set(
            userManager.createRoomString(roomCode),
            new Map([['player1', { username: 'player1', score: 0, bonusAmount: 0, numberOfSelectedChoice: 2 }]]),
        );

        userManager.setNumberOfChoice(roomCode, playerId, isUp);
        userManager.setNumberOfChoice(roomCode, playerId, isUp);
        userManager.setNumberOfChoice(roomCode, playerId, !isUp);

        const clientRoomCode = userManager.createRoomString(roomCode);
        const roomDetails = userManager['clientSocketScore'].get(clientRoomCode);
        const playerDetails = roomDetails.get(playerId);

        expect(playerDetails.numberOfSelectedChoice).to.equal(3);
    });
});
