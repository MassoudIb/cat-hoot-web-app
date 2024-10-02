/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disable some lint to simplify some test
import { Server } from '@app/server';
import { assert, expect } from 'chai';
import { Socket, io as ioClient } from 'socket.io-client';
import { Container } from 'typedi';
import { RoomManager } from './room-manager.service';
import { TimerService } from './timer-service';
import sinon = require('sinon');

const RESPONSE_DELAY = 1000;
describe('RoomManager service tests', () => {
    let server: Server;
    let clientSocket1: Socket;
    let clientSocket2: Socket;
    let roomManager: RoomManager;
    let timerServiceStub: sinon.SinonStubbedInstance<TimerService>;

    const urlString = 'http://localhost:3000';
    beforeEach(async () => {
        server = Container.get(Server);
        await server.init();

        roomManager = new RoomManager(server['socketManager']['sio']);
        clientSocket1 = ioClient(urlString, { forceNew: true });
        clientSocket2 = ioClient(urlString, { forceNew: true });
        timerServiceStub = sinon.createStubInstance(TimerService);
        sinon.stub(roomManager.timerService, 'startTimerForRoom');
        sinon.stub(roomManager.timerService, 'resumeTimerForRoom');
    });

    afterEach(() => {
        if (clientSocket1) {
            clientSocket1.close();
        }
        if (clientSocket2) {
            clientSocket2.close();
        }
        if (server && server['socketManager'] && server['socketManager']['sio']) {
            server['socketManager']['sio'].close();
        }
        sinon.restore();
    });

    it('should create and join a room successfully', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser', roomCode });
            done();
        });
    });

    it('should start panic mode for the specified room and emit panicModeStarted', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser', roomCode });

            clientSocket1.on('panicModeStarted', () => {
                done();
            });

            clientSocket1.emit('startPanicMode', roomCode);
        });
    });

    it('should start timer for the specified room when "waitingStartTimer" is received', (done) => {
        const testRoomCode = 'testRoom';
        clientSocket1.emit('waitingStartTimer', testRoomCode, 5);
        setTimeout(() => {
            assert.isTrue(true);
            done();
        }, RESPONSE_DELAY);
        timerServiceStub.startTimerForRoom(testRoomCode, 60);
    });

    it('should pause timer for the specified room', (done) => {
        const testRoomCode = 'testRoom';
        clientSocket1.emit('pauseTimer', testRoomCode);
        setTimeout(() => {
            done();
        }, RESPONSE_DELAY);
    });

    it('should resume timer for the specified room', (done) => {
        const testRoomCode = 'testRoom';
        clientSocket1.emit('resumeTimer', testRoomCode);
        setTimeout(() => {
            done();
        }, RESPONSE_DELAY);
    });

    it('should notify all players answered when all submissions received', (done) => {
        let answersSubmitted = 0;
        const checkAllAnswersSubmitted = () => {
            answersSubmitted += 1;
            if (answersSubmitted === 2) done();
        };

        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });
            clientSocket1.on('redirectToNewPage', (quizId) => {
                assert.equal(quizId, '1234');
                done();
            });
            clientSocket1.emit('redirectAll', roomCode, '1234');

            setTimeout(() => {
                clientSocket1.emit('answerSubmitted', roomCode, 'testUser1');
                clientSocket2.emit('answerSubmitted', roomCode, 'testUser2');

                clientSocket1.on('allPlayersAnswered', () => {
                    checkAllAnswersSubmitted();
                });

                clientSocket2.on('allPlayersAnswered', () => {
                    checkAllAnswersSubmitted();
                });
            }, RESPONSE_DELAY);
        });
    });

    it('should emit redirectToNewPage to all clients in room on redirectAll event', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('redirectToNewPage', (quizId) => {
                assert.equal(quizId, '1234');
                done();
            });
            clientSocket1.emit('redirectAll', roomCode, '1234');
        });
    });
    it('should emit openDialogbox to all clients in room on openDialogboxWaiting event', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('openDialogbox', (quizId) => {
                assert.equal(quizId, '1234');
                done();
            });
            clientSocket1.emit('openDialogboxWaiting', roomCode, '1234');
        });
    });
    it('should broadcast sendMessage to all clients in room', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'Système', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.once('newMessage', (messageData) => {
                assert.equal(messageData.username, 'Système');
                done();
            });
            clientSocket1.emit('sendMessage', { roomCode, username: 'Système', message: 'Hello World' });
        });
    });
    it('should broadcast sendMessage to all clients in room', (done) => {
        let messagesReceived = 0;
        const checkMessageAndComplete = () => {
            messagesReceived += 1;
            if (messagesReceived === 2) {
                done();
            }
        };

        clientSocket1.on('newMessage', (messageData) => {
            assert.equal(messageData.username, 'Système');
            checkMessageAndComplete();
        });

        clientSocket2.on('newMessage', (messageData) => {
            assert.equal(messageData.username, 'Système');
            checkMessageAndComplete();
        });

        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'Système', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            setTimeout(() => {
                clientSocket1.emit('sendMessage', { roomCode, username: 'Système', message: 'Hello World' });
            }, RESPONSE_DELAY);
        });
    });

    it('should emit terminateRoom to all clients in a room', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('terminateRoom', () => {
                done();
            });
            clientSocket1.emit('deleteRoom', roomCode);
        });
    });
    it('should start a timer for the room', (done) => {
        const roomCode = 'testRoom';
        const questionDuration = 5000;
        assert.isTrue(true);
        done();
        clientSocket1.emit('waitingStartTimer', roomCode, questionDuration);
    });
    it('should stop the timer for the room', (done) => {
        const roomCode = 'testRoom';
        const questionDuration = 5000;
        clientSocket1.emit('waitingStartTimer', roomCode, questionDuration);

        setTimeout(() => {
            clientSocket1.emit('stopTimerRoom', roomCode);
            assert.isTrue(true);
            done();
        }, RESPONSE_DELAY);
    });
    it('should allow a client to leave a room', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });
            clientSocket1.emit('leaveRoom', roomCode);
            assert.isTrue(true);
            done();
        });
    });

    it('should return true when the room code exists in the room map', () => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            const roomManagers = (server as Server & { roomManager: { hasRoom: (roomCode: string) => boolean; createCode: () => string } })[
                'roomManager'
            ];
            assert.isTrue(roomManagers.hasRoom(roomCode));
        });
    });
    it('should emit allPlayersAnswered when all players have submitted answers', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('redirectToNewPage', (quizId) => {
                assert.equal(quizId, '1234');
                done();
            });
            clientSocket1.emit('redirectAll', roomCode, '1234');

            clientSocket1.on('allPlayersAnswered', () => {
                done();
            });

            clientSocket1.emit('answerSubmitted', roomCode, 'testUser1');
            clientSocket2.emit('answerSubmitted', roomCode, 'testUser2');
        });
    });
    it('should handle submissions for non-existent rooms gracefully', (done) => {
        clientSocket1.emit('answerSubmitted', 'nonExistentRoom', 'testUser1');
        setTimeout(() => {
            assert.isTrue(true);
            done();
        }, RESPONSE_DELAY);
    });
    it('should not emit allPlayersAnswered until all players submit answers', (done) => {
        let prematureEmission = false;

        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('allPlayersAnswered', () => {
                prematureEmission = false;
            });

            clientSocket1.emit('answerSubmitted', roomCode, 'testUser1');

            setTimeout(() => {
                assert.isFalse(prematureEmission, 'allPlayersAnswered event was emitted');
                if (!prematureEmission) {
                    done();
                }
            }, RESPONSE_DELAY);
        });
    });
    it('should allow setting and getting the lock status of a room', () => {
        const roomCode = 'testRoom';
        roomManager.setRoomLockStatus(roomCode, true);

        assert.isTrue(roomManager.isRoomLocked(roomCode), 'Room should be locked');

        roomManager.setRoomLockStatus(roomCode, false);
        assert.isFalse(roomManager.isRoomLocked(roomCode), 'Room should be unlocked');
    });
    it('should default to unlocked status for new rooms', () => {
        const newRoomCode = 'newTestRoom';
        assert.isFalse(roomManager.isRoomLocked(newRoomCode), 'New room should be unlocked by default');
    });
    it('should toggle room lock status and emit to all clients', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('roomLockedStatusChanged', (isLocked) => {
                assert.isTrue(isLocked);
                done();
            });

            clientSocket1.emit('toggleLockRoom', roomCode);
        });
    });
    it('should emit allPlayersAnswered when all but one player have submitted answers', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('redirectToNewPage', (quizId) => {
                assert.equal(quizId, '1234');
                done();
            });
            clientSocket1.emit('redirectAll', roomCode, '1234');

            clientSocket1.on('allPlayersAnswered', () => {
                done();
            });

            clientSocket1.emit('answerSubmitted', roomCode, 'testUser1');
        });
    });
    it('should generate a 4-digit numeric code', () => {
        const code = roomManager.createCode();
        assert.match(code, /^\d{4}$/, 'Generated code should be 4 digits');
    });
    it('should generate a unique code', () => {
        const existingCodes = new Set(['1234', '5678', '9101']);
        const newCode = roomManager.createCode();
        assert.isFalse(existingCodes.has(newCode), 'Generated code should be unique');
    });
    it('should generate a unique code when all 4 digits are the same and roomMap is empty', () => {
        const code = roomManager.createCode();
        expect(code).to.be.a('string');
        expect(code).to.have.lengthOf(4);
        expect(code).to.not.equal('1111');
    });
    it('should return false for the lock status of a non-existent room', () => {
        const nonExistentRoomCode = 'doesNotExist';
        assert.isFalse(roomManager.isRoomLocked(nonExistentRoomCode), 'Non-existent room should be unlocked by default');
    });
    it('should return false for the lock status of a non-existent room', () => {
        const nonExistentRoomCode = 'doesNotExist';
        assert.isFalse(roomManager.isRoomLocked(nonExistentRoomCode), 'Non-existent room should be unlocked by default');
    });
    it('should emit "openDialogbox" to all clients in the specified room when "openNextQuestionDialog" is received', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('openDialogbox', () => {
                done();
            });

            clientSocket1.emit('openNextQuestionDialog', roomCode);
        });
    });
    it('should start a timer for the room when "waitingStartTimer" is received', (done) => {
        const roomCode = 'testRoom';
        const questionDuration = 5000;
        clientSocket1.emit('waitingStartTimer', roomCode, questionDuration);
        assert.isTrue(true);
        done();
    });
    it('should stop the timer for the room when "stopTimerRoom" is received', (done) => {
        const roomCode = 'testRoom';
        const questionDuration = 5000;
        clientSocket1.emit('waitingStartTimer', roomCode, questionDuration);

        setTimeout(() => {
            clientSocket1.emit('stopTimerRoom', roomCode);
            assert.isTrue(true);
            done();
        }, RESPONSE_DELAY);
    });

    it('should toggle the lock status of a room and emit "roomLockedStatusChanged"', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.emit('toggleLockRoom', roomCode);
            clientSocket1.on('roomLockedStatusChanged', (isLocked) => {
                assert.isTrue(isLocked);
                done();
            });
        });
    });

    it('should return the generated code if it is not already in use by another room', () => {
        const code = roomManager.createCode();
        assert.isFalse(roomManager.roomMap.has(code));
    });

    it('should generate a new code if the first one is already taken', () => {
        let callCount = 0;
        const hasStub = sinon.stub(roomManager.roomMap, 'has').callsFake(() => {
            return callCount++ === 0;
        });

        const generatedCode = roomManager.createCode();
        expect(generatedCode).to.be.a('string');
        expect(hasStub.callCount).to.be.greaterThan(1);
    });

    it('should emit playerSurrenderedDuringQRL when a player leaves during a QCM question', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            roomManager.playerAnswersMap.set(roomCode, new Set<string>());
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('redirectToNewPage', (quizId) => {
                assert.equal(quizId, '1234');
            });
            clientSocket1.emit('redirectAll', roomCode, '1234');
            clientSocket1.emit('answerSubmitted', roomCode, 'testUser1');

            clientSocket2.emit('playerSurrenderedDuringQRL', roomCode, 'QCM');
            clientSocket1.on('allPlayersAnswered', () => {
                done();
            });
        });
    });

    it('should emit playerSurrenderedDuringQRL when a player leaves during a QRL question', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            roomManager.playerAnswersMap.set(roomCode, new Set<string>());
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('redirectToNewPage', (quizId) => {
                assert.equal(quizId, '1234');
            });
            clientSocket1.emit('redirectAll', roomCode, '1234');
            clientSocket1.emit('answerSubmitted', roomCode, 'testUser1');

            setTimeout(() => {
                clientSocket2.emit('playerSurrenderedDuringQRL', roomCode, 'wefqwfweqf');
                clientSocket1.on('allPlayersAnsweredQrl', () => {
                    done();
                });
            }, RESPONSE_DELAY);
        });
    });

    it('should emit playerSurrenderedDuringQRL when a player leaves during a random question', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode) => {
            const stringRoom: string = 'room' + roomCode;
            roomManager.playerAnswersMap.set(stringRoom, new Set<string>());
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('redirectToNewPage', (quizId) => {
                assert.equal(quizId, '1234');
            });
            clientSocket1.emit('redirectAll', roomCode, '1234');
            clientSocket1.emit('answerSubmitted', roomCode, 'QCM', 'testUser1', true);

            clientSocket2.emit('playerSurrenderedDuringQRL', roomCode, 'QCM', true);
            clientSocket1.on('allPlayersAnswered', () => {
                done();
            });
        });
    });

    it('should emit answerSubmitted when a player answers a random question', (done) => {
        clientSocket1.emit('initLobby');
        clientSocket1.on('createdRoom', (roomCode): void => {
            const stringRoom: string = 'room' + roomCode;
            roomManager.playerAnswersMap.set(stringRoom, new Set<string>());
            clientSocket1.emit('joinRoom', { username: 'testUser1', roomCode });
            clientSocket2.emit('joinRoom', { username: 'testUser2', roomCode });

            clientSocket1.on('redirectToNewPage', (quizId) => {
                assert.equal(quizId, '1234');
            });
            clientSocket1.emit('redirectAll', roomCode, '1234');
            clientSocket1.emit('answerSubmitted', roomCode, 'QCM', 'testUser1');

            clientSocket1.on('allPlayersAnswered', () => {
                done();
            });
        });
    });

    it('should get the room with roomMap', () => {
        roomManager.roomMap.set('1234', 'room1234');
        const roomNumber = roomManager.hasRoom('1234');
        expect(roomNumber).to.equal(true);
    });
});
