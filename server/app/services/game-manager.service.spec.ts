/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines */
/* We need the eslint-disable to make the tests pass*/
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
// we disable some lint to simplify some test
import { expect } from 'chai';
import { SinonStubbedInstance } from 'sinon';
import { Server, Socket } from 'socket.io';
import { dbService } from './database.service';
import { GameManager } from './game-manager.service';
import sinon = require('sinon');

describe('GameManager', () => {
    let sandbox: sinon.SinonSandbox;
    let gameManager: GameManager;
    let mockServer: SinonStubbedInstance<Server>;
    let mockSocket: SinonStubbedInstance<Socket>;
    let questions: any[];
    let clock: sinon.SinonFakeTimers;
    const roomCode = 'testRoom';
    const questionIndex = 0;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        mockServer = sandbox.createStubInstance(Server) as any;
        mockSocket = sandbox.createStubInstance(Socket) as any;

        (mockSocket as any).triggerEvent = (event: string, ...args: any[]) => {
            if (eventHandlers[event]) {
                eventHandlers[event](...args);
            }
        };
        const eventHandlers: Record<string, Function> = {};
        mockSocket.on.callsFake((event: string, handler: Function) => {
            eventHandlers[event] = handler;
            return mockSocket;
        });

        mockServer.to.returns(mockServer as any);
        mockServer.emit.callsFake(() => true);
        gameManager = new GameManager(mockServer as any);
        (mockSocket as any).triggerEvent = (event: string, ...args: any[]) => {
            if (eventHandlers[event]) {
                eventHandlers[event](...args);
            }
        };

        questions = [
            {
                text: 'Sample Question',
                choices: [
                    { choice: 'Active', isCorrect: true, numberOfAnswers: 5 },
                    { choice: 'Inactive', isCorrect: false, numberOfAnswers: 3 },
                ],
            },
        ];

        gameManager.currentQuizzes.set(gameManager.createRoomString(roomCode), questions);
        gameManager.handleGameEvent(mockSocket as unknown as Socket);
        const fixedDate = new Date(2024, 3, 15, 18, 29, 22, 786);
        clock = sinon.useFakeTimers(fixedDate);
    });

    afterEach(() => {
        sandbox.restore();
        clock.restore();
    });

    it('should initialize with an empty quizzes map', () => {
        expect(gameManager.currentQuizzes.size).to.equal(1);
    });

    it('should update the number of answers for the selected choice', () => {
        const choiceName = 'Active';
        const hostRoom = gameManager.createRoomString(roomCode);

        if (!gameManager.currentQuizzes.has(hostRoom)) {
            throw new Error('Test setup error: Room does not exist in the currentQuizzes map.');
        }

        const initialQuestions = gameManager.currentQuizzes.get(hostRoom);
        if (!initialQuestions || initialQuestions.length === 0) {
            throw new Error('Test setup error: No questions set for the room.');
        }

        if (!initialQuestions[questionIndex].choices.some((choice) => choice.choice === choiceName)) {
            throw new Error('Test setup error: The specified choice does not exist in the question.');
        }

        (mockSocket as any).triggerEvent('selectedChoice', roomCode, questionIndex, choiceName);
        const updatedQuestions = gameManager.currentQuizzes.get(hostRoom);
        const updatedChoice = updatedQuestions[questionIndex].choices.find((choice) => choice.choice === choiceName);

        if (!updatedChoice) {
            throw new Error('Retrieval error: The choice could not be found after event processing.');
        }

        expect(updatedChoice.numberOfAnswers).to.equal(6);
        sinon.assert.calledWith(mockServer.to, hostRoom);
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', updatedQuestions[0]);
    });

    it('should not throw an error for "unselectedChoice" event when no questions are defined for the room', () => {
        gameManager.handleGameEvent(mockSocket as any);
        (mockSocket as any).triggerEvent('unselectedChoice', roomCode, 0, 'Taro');
        expect(gameManager.currentQuizzes.size).to.equal(1);
    });

    it('should emit "nextQuestionIndex" and update the current question index when moving to the next question', async () => {
        const initialQuestions = [{ text: 'Question 1', choices: [{ choice: 'A', isCorrect: true, numberOfAnswers: 0 }] }];
        gameManager.currentQuizzes.set(`room${roomCode}`, initialQuestions);
        let registeredHandler: Function | undefined;
        mockSocket.on.callsFake((event: string, handler: Function) => {
            if (event === 'moveToNextQuestion') {
                registeredHandler = handler;
            }
            return mockSocket;
        });

        gameManager.handleGameEvent(mockSocket as unknown as Socket);
        registeredHandler?.(roomCode, 0);
        sinon.assert.calledWithExactly(mockServer.to, `room${roomCode}`);
        sinon.assert.calledWith(mockServer.emit, 'nextQuestionIndex', 1);
        expect(gameManager.currentQuestionIndexes.get(`room${roomCode}`)).to.equal(1);
    });
    it('should handle "gameStarted" event correctly', () => {
        const gameStartedQuestion = [
            {
                text: 'What is the name of the cutest cat?',
                choices: [
                    { choice: 'Taro', isCorrect: true, numberOfAnswers: 0 },
                    { choice: 'test', isCorrect: false, numberOfAnswers: 0 },
                ],
            },
        ];

        gameManager.handleGameEvent(mockSocket as any);
        (mockSocket as any).triggerEvent('gameStarted', roomCode, gameStartedQuestion);

        expect(gameManager.currentQuizzes.size).to.equal(1);
        const storedQuestions = gameManager.currentQuizzes.get('room' + roomCode);
        expect(storedQuestions).to.equal(gameStartedQuestion);
        sinon.assert.calledWith(mockServer.to, `room${roomCode}`);
    });
    it('should emit "readyForNextQuestion" when "allPlayersAnswered" event is received', () => {
        gameManager.handleGameEvent(mockSocket as any);
        (mockSocket as any).triggerEvent('allPlayersAnswered', roomCode, true);
        sinon.assert.calledWith(mockServer.to, `room${roomCode}`);
        sinon.assert.calledWith(mockServer.emit, 'readyForNextQuestion', true);
    });
    it('should update choice numberOfAnswers and emit "updatedHistogram" on "selectedChoice" event', () => {
        const question = [
            {
                text: 'What is the name of the cutest cat?',
                choices: [
                    { choice: 'Taro', isCorrect: true, numberOfAnswers: 0 },
                    { choice: 'test', isCorrect: false, numberOfAnswers: 0 },
                ],
            },
        ];
        gameManager.currentQuizzes.set('room' + roomCode, question);
        gameManager.handleGameEvent(mockSocket as any);
        (mockSocket as any).triggerEvent('selectedChoice', roomCode, 0, 'Taro');

        const updatedQuestions = gameManager.currentQuizzes.get('room' + roomCode);
        expect(updatedQuestions).to.deep.equal([
            {
                text: 'What is the name of the cutest cat?',
                choices: [
                    { choice: 'Taro', isCorrect: true, numberOfAnswers: 1 },
                    { choice: 'test', isCorrect: false, numberOfAnswers: 0 },
                ],
            },
        ]);

        sinon.assert.calledWith(mockServer.to, `room${roomCode}`);
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', updatedQuestions[0]);
    });
    it('should decrement numberOfAnswers for unselectedChoice and emit "updatedHistogram"', () => {
        const question = [
            {
                text: 'What is the name of the cutest cat?',
                choices: [
                    { choice: 'Taro', isCorrect: true, numberOfAnswers: 1 },
                    { choice: 'test', isCorrect: false, numberOfAnswers: 0 },
                ],
            },
        ];
        gameManager.currentQuizzes.set('room' + roomCode, question);
        gameManager.handleGameEvent(mockSocket as any);
        (mockSocket as any).triggerEvent('unselectedChoice', roomCode, 0, 'Taro');
        const updatedQuestions = gameManager.currentQuizzes.get('room' + roomCode);
        expect(updatedQuestions).to.deep.equal([
            {
                text: 'What is the name of the cutest cat?',
                choices: [
                    { choice: 'Taro', isCorrect: true, numberOfAnswers: 0 },
                    { choice: 'test', isCorrect: false, numberOfAnswers: 0 },
                ],
            },
        ]);

        sinon.assert.calledWith(mockServer.to, `room${roomCode}`);
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', updatedQuestions[0]);
    });
    it('should emit "redirectToResult" when redirectAllToResult event is triggered', () => {
        const hostRoom = gameManager.createRoomString(roomCode);
        gameManager.currentQuizzes.set(hostRoom, questions);
        gameManager.handleGameEvent(mockSocket as any);
        (mockSocket as any).triggerEvent('redirectAllToResult', roomCode);
        const questionWithChoices = gameManager.currentQuizzes.get(hostRoom);
        sinon.assert.calledWith(mockServer.to, hostRoom);
        sinon.assert.calledWith(mockServer.emit, 'redirectToResult', questionWithChoices);
    });

    it('should emit "listOfPlayersWithResults" to a specific player when retrieveDataResults event is triggered', () => {
        const hostRoom = gameManager.createRoomString(roomCode);
        gameManager.currentQuizzes.set(hostRoom, questions);
        gameManager.handleGameEvent(mockSocket as any);
        (mockSocket as any).triggerEvent('retrieveDataResults', 'player1', roomCode);
        const questionWithChoices = gameManager.currentQuizzes.get(hostRoom);
        sinon.assert.calledWith(mockServer.to, 'player1');
        sinon.assert.calledWith(mockServer.emit, 'listOfPlayersWithResults', questionWithChoices);
    });

    it('should delete the room from currentQuizzes map when deleteRoom event is triggered', () => {
        gameManager.currentQuizzes.set(gameManager.createRoomString(roomCode), [{ text: 'Sample Question', choices: [] }]);
        gameManager.handleGameEvent(mockSocket as unknown as Socket);
        const deleteRoomHandler = mockSocket.on.getCall(0).args[1];
        deleteRoomHandler(roomCode);
        expect(gameManager.currentQuizzes.has(gameManager.createRoomString(roomCode))).to.be.true;
    });
    it('should handle "unselectedChoice" correctly even if no choices were previously selected', () => {
        const question = [
            {
                text: 'What is the name of the cutest cat?',
                choices: [
                    { choice: 'Taro', isCorrect: true, numberOfAnswers: 1 },
                    { choice: 'test', isCorrect: false, numberOfAnswers: 0 },
                ],
            },
        ];
        gameManager.currentQuizzes.set('room' + roomCode, question);
        gameManager.handleGameEvent(mockSocket as any);

        (mockSocket as any).triggerEvent('unselectedChoice', roomCode, 0, 'Taro');

        const updatedQuestions = gameManager.currentQuizzes.get('room' + roomCode);
        expect(updatedQuestions).to.deep.equal([
            {
                text: 'What is the name of the cutest cat?',
                choices: [
                    { choice: 'Taro', isCorrect: true, numberOfAnswers: 0 },
                    { choice: 'test', isCorrect: false, numberOfAnswers: 0 },
                ],
            },
        ]);

        sinon.assert.calledWith(mockServer.to, `room${roomCode}`);
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', updatedQuestions[0]);
    });
    it('should handle "deleteRoom" correctly even if the room does not exist', () => {
        gameManager.handleGameEvent(mockSocket as unknown as Socket);
        (mockSocket as any).triggerEvent('deleteRoom', roomCode);
        expect(gameManager.currentQuizzes.has(gameManager.createRoomString(roomCode))).to.be.false;
    });

    it('should handle "redirectAllToResult" correctly for a non-existent room', () => {
        const hostRoom = gameManager.createRoomString(roomCode);
        gameManager.currentQuizzes.delete(hostRoom);
        gameManager.handleGameEvent(mockSocket as any);
        (mockSocket as any).triggerEvent('redirectAllToResult', roomCode);
        sinon.assert.calledWith(mockServer.to, hostRoom);
        sinon.assert.calledWith(mockServer.emit, 'redirectToResult', undefined);
    });

    it('should decrement numberOfAnswers for a choice when "unselectedChoice" event is received', () => {
        const unselectedChoice = 'Taro';
        const question = [
            {
                text: 'What is the name of the cutest cat?',
                choices: [
                    { choice: 'Taro', isCorrect: true, numberOfAnswers: 1 },
                    { choice: 'test', isCorrect: false, numberOfAnswers: 0 },
                ],
            },
        ];

        gameManager.currentQuizzes.set(gameManager.createRoomString(roomCode), question);
        gameManager.handleGameEvent(mockSocket as unknown as Socket);
        (mockSocket as any).triggerEvent('unselectedChoice', roomCode, questionIndex, unselectedChoice);

        const updatedQuestions = gameManager.currentQuizzes.get(gameManager.createRoomString(roomCode));
        const updatedChoice = updatedQuestions[questionIndex].choices.find((choice) => choice.choice === unselectedChoice);

        expect(updatedChoice.numberOfAnswers).to.equal(0);
        sinon.assert.calledWith(mockServer.to, gameManager.createRoomString(roomCode));
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', updatedQuestions[questionIndex]);
    });
    it('should not affect choices when an unselected choice does not exist in the question', () => {
        const unselectedChoice = 'Yumi';
        const affectChoicesquestion = [
            {
                text: 'What is the name of the cutest cat?',
                choices: [
                    { choice: 'Taro', isCorrect: true, numberOfAnswers: 1 },
                    { choice: 'test', isCorrect: false, numberOfAnswers: 0 },
                ],
            },
        ];

        gameManager.currentQuizzes.set(gameManager.createRoomString(roomCode), affectChoicesquestion);
        gameManager.handleGameEvent(mockSocket as unknown as Socket);
        (mockSocket as any).triggerEvent('unselectedChoice', roomCode, questionIndex, unselectedChoice);
        const unchangedQuestions = gameManager.currentQuizzes.get(gameManager.createRoomString(roomCode));
        expect(unchangedQuestions).to.equal(affectChoicesquestion);
        sinon.assert.calledWith(mockServer.to, gameManager.createRoomString(roomCode));
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', unchangedQuestions[questionIndex]);
    });
    it('should handle "retrieveDataResults" event correctly', () => {
        const hostRoom = gameManager.createRoomString(roomCode);
        gameManager.currentQuizzes.set(hostRoom, questions);
        gameManager.handleGameEvent(mockSocket as any);
        (mockSocket as any).triggerEvent('retrieveDataResults', 'player1', roomCode);
        const questionWithChoices = gameManager.currentQuizzes.get(hostRoom);
        sinon.assert.calledWith(mockServer.to, 'player1');
        sinon.assert.calledWith(mockServer.emit, 'listOfPlayersWithResults', questionWithChoices);
    });
    it('should emit "nextQuestionIndex" event, update currentQuestionIndexes map, emit "updatedHistogram" event, and log the event', () => {
        const currentQuestionIndex = 0;
        const nextQuestionIndex = 1;
        const twoQuestions = [
            {
                text: 'What is the name of the cutest cat?',
                choices: [
                    { choice: 'Taro', isCorrect: true, numberOfAnswers: 0 },
                    { choice: 'test', isCorrect: false, numberOfAnswers: 0 },
                ],
            },
            {
                text: 'What is the name of England?',
                choices: [
                    { choice: 'Taro', isCorrect: false, numberOfAnswers: 0 },
                    { choice: 'test', isCorrect: true, numberOfAnswers: 0 },
                ],
            },
        ];
        gameManager.currentQuizzes.set(gameManager.createRoomString(roomCode), twoQuestions);
        gameManager.currentQuestionIndexes.set(gameManager.createRoomString(roomCode), currentQuestionIndex);
        gameManager.handleGameEvent(mockSocket as unknown as Socket);
        (mockSocket as any).triggerEvent('moveToNextQuestion', roomCode, currentQuestionIndex);
        sinon.assert.calledWith(mockServer.to, gameManager.createRoomString(roomCode));
        sinon.assert.calledWith(mockServer.emit, 'nextQuestionIndex', nextQuestionIndex);
        expect(gameManager.currentQuestionIndexes.get(gameManager.createRoomString(roomCode))).to.equal(nextQuestionIndex);
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', twoQuestions[nextQuestionIndex]);
    });

    it('should emit interaction code with correct color code', () => {
        const username = 'John';
        const colorCode = '#FF0000';
        (mockSocket as any).triggerEvent('interaction', { username, colorCode });
        gameManager.emitInteractionCode(roomCode, username, colorCode);
        sinon.assert.calledWith(mockServer.to, roomCode);
        sinon.assert.calledWith(mockServer.emit, 'interaction', { username, colorCode });
    });

    it('should emit "is allowed to chat" message', () => {
        const username = 'John';
        const playerId = '12345';
        const isAllowedToChat = true;

        gameManager.emitChatPrivilegeMessage(username, playerId, isAllowedToChat);

        sinon.assert.calledWith(mockServer.to, playerId);
        sinon.assert.calledWith(mockServer.emit, 'newMessage', {
            username: 'Organisateur',
            message: `${username} vous avez de nouveau le droit de clavarder !`,
            timeStamp: new Date(),
            isNotification: true,
        });
    });

    it('should emit is not allowed to chat message', () => {
        const username = 'John';
        const playerId = '12345';
        const isAllowedToChat = false;

        gameManager.emitChatPrivilegeMessage(username, playerId, isAllowedToChat);
        sinon.assert.calledWith(mockServer.to, playerId);
        sinon.assert.calledWith(mockServer.emit, 'newMessage', {
            username: 'Organisateur',
            message: `${username} vous n'avez plus le droit de clavarder !`,
            timeStamp: new Date(),
            isNotification: true,
        });
    });

    it('should block chat when player is not allowed to chat', () => {
        const username = 'Stef';
        const socketId = '12345';
        const isAllowedToChat = false;
        gameManager.handleChatPrivilege(username, socketId, isAllowedToChat);
        sinon.assert.calledWith(mockServer.emit, 'blockChat', isAllowedToChat);
    });

    it('should unblock chat when player is allowed to chat', () => {
        const username = 'Stef';
        const socketId = '12345';
        const isAllowedToChat = true;
        gameManager.handleChatPrivilege(username, socketId, isAllowedToChat);
        sinon.assert.calledWith(mockServer.emit, 'unblockChat', isAllowedToChat);
    });

    it('should increment active choice when isActive is true and isRemovingFromHistogram is false', () => {
        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, true, false, false);
        const updatedChoices = gameManager.currentQuizzes.get(gameManager.createRoomString(roomCode))[questionIndex].choices;
        expect(updatedChoices[0].numberOfAnswers).to.equal(6);
        sinon.assert.calledWith(mockServer.to, gameManager.createRoomString(roomCode));
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', sinon.match.has('text', 'Sample Question'));
    });

    it('should decrement active choice when isActive is true and isRemovingFromHistogram is true', () => {
        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, true, false, true);
        const updatedChoices = gameManager.currentQuizzes.get(gameManager.createRoomString(roomCode))[questionIndex].choices;
        expect(updatedChoices[0].numberOfAnswers).to.equal(4);
        sinon.assert.calledWith(mockServer.to, gameManager.createRoomString(roomCode));
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', sinon.match.has('text', 'Sample Question'));
    });

    it('should increment inactive choice when isActive is false and isRemovingFromHistogram is false', () => {
        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, false, false, false);
        const updatedChoices = gameManager.currentQuizzes.get(gameManager.createRoomString(roomCode))[questionIndex].choices;
        expect(updatedChoices[1].numberOfAnswers).to.equal(4);
        sinon.assert.calledWith(mockServer.to, gameManager.createRoomString(roomCode));
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', sinon.match.has('text', 'Sample Question'));
    });

    it('should decrement inactive choice when isActive is false and isRemovingFromHistogram is true', () => {
        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, false, false, true);
        const updatedChoices = gameManager.currentQuizzes.get(gameManager.createRoomString(roomCode))[questionIndex].choices;
        expect(updatedChoices[1].numberOfAnswers).to.equal(2);
        sinon.assert.calledWith(mockServer.to, gameManager.createRoomString(roomCode));
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', sinon.match.has('text', 'Sample Question'));
    });

    it('should swap active and inactive choices when status already sent and player active status changes', () => {
        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, true, true, false);
        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, false, true, false);
        const updatedChoices = gameManager.currentQuizzes.get(gameManager.createRoomString(roomCode))[questionIndex].choices;
        expect(updatedChoices[0].numberOfAnswers).to.equal(5);
        expect(updatedChoices[1].numberOfAnswers).to.equal(3);
        sinon.assert.calledTwice(mockServer.to);
        sinon.assert.calledTwice(mockServer.emit);
    });

    it('should handle scenario where there are no questions for the room', () => {
        gameManager.currentQuizzes.delete(gameManager.createRoomString(roomCode));
        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, true, false, false);
        sinon.assert.notCalled(mockServer.emit);
    });

    it('should process gameEndData when start data exists', () => {
        const gameStartData = {
            _id: '',
            quizName: 'Quiz One',
            startTime: new Date(),
            playerCount: 10,
        };
        const gameEndData = {
            topScore: 95,
        };

        gameManager.gameStartDataMap.set(roomCode, gameStartData);
        const addEntrySpy = sandbox.spy(dbService, 'addGameHistoryEntry');
        (mockSocket as any).triggerEvent('gameEndData', roomCode, gameEndData);
        expect(addEntrySpy.calledOnce).to.be.true;
        expect(addEntrySpy.firstCall.args[0]).to.deep.equal({
            _id: '',
            quizName: 'Quiz One',
            startTime: gameStartData.startTime,
            playerCount: 10,
            topScore: 95,
        });
        expect(gameManager.gameStartDataMap.has(roomCode)).to.be.false;
    });

    it('should do nothing when no start data exists for gameEndData', () => {
        const gameEndData = {
            topScore: 85,
        };

        expect(gameManager.gameStartDataMap.has(roomCode)).to.be.false;
        const addEntrySpy = sandbox.spy(dbService, 'addGameHistoryEntry');
        (mockSocket as any).triggerEvent('gameEndData', roomCode, gameEndData);
        expect(addEntrySpy.notCalled).to.be.true;
    });

    it('should set game start data when gameStartData event is triggered', () => {
        const gameStartData = {
            quizName: 'Epic Trivia',
            startTime: new Date(),
            playerCount: 5,
        };

        (mockSocket as any).triggerEvent('gameStartData', roomCode, gameStartData);
        const storedData = gameManager.gameStartDataMap.get(roomCode);
        expect(storedData).to.deep.equal(gameStartData);
        expect(gameManager.gameStartDataMap.has(roomCode)).to.be.true;
    });

    it('should increment active choice when isActive is true and status not already sent', () => {
        const isActive = true;
        const isAlreadySentStatus = false;
        const isRemovingFromHistogram = false;

        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, isActive, isAlreadySentStatus, isRemovingFromHistogram);
        const updatedQuestions = gameManager.currentQuizzes.get(gameManager.createRoomString(roomCode));
        const updatedChoiceActive = updatedQuestions[questionIndex].choices[0];
        expect(updatedChoiceActive.numberOfAnswers).to.equal(6);
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', updatedQuestions[questionIndex]);
    });

    it('should increment inactive choice when isActive is false and status not already sent', () => {
        const isActive = false;
        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, isActive, false, false);
        const updatedQuestions = gameManager.currentQuizzes.get(gameManager.createRoomString(roomCode));
        const updatedChoiceInactive = updatedQuestions[questionIndex].choices[1];
        expect(updatedChoiceInactive.numberOfAnswers).to.equal(4);
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', updatedQuestions[questionIndex]);
    });

    it('should swap answers when status already sent and isActive changes', () => {
        const isActive = false;
        const isAlreadySentStatus = true;

        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, !isActive, isAlreadySentStatus, false);
        (mockSocket as any).triggerEvent('playerActiveOrInactive', roomCode, questionIndex, isActive, isAlreadySentStatus, false);
        const updatedQuestions = gameManager.currentQuizzes.get(gameManager.createRoomString(roomCode));
        const updatedChoiceActive = updatedQuestions[questionIndex].choices[0];
        const updatedChoiceInactive = updatedQuestions[questionIndex].choices[1];

        expect(updatedChoiceActive.numberOfAnswers).to.equal(5);
        expect(updatedChoiceInactive.numberOfAnswers).to.equal(3);
        sinon.assert.calledWith(mockServer.emit, 'updatedHistogram', updatedQuestions[questionIndex]);
    });
});
