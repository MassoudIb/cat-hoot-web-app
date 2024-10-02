import { Server, Socket } from 'socket.io';
import { GameHistoryEntry } from './../../../client/src/app/interfaces/history';
import { dbService } from './database.service';

import { Service } from 'typedi';

interface Choice {
    choice: string;
    isCorrect: boolean;
    numberOfAnswers: number;
}
interface Question {
    text: string;
    choices: Choice[];
}

interface GameStartData {
    quizName: string;
    startTime: Date;
    playerCount: number;
}

@Service()
export class GameManager {
    currentQuizzes = new Map<string, Question[]>();
    currentQuestionIndexes = new Map<string, number>();
    gameStartDataMap = new Map<string, GameStartData>();

    constructor(private sio: Server) {}
    handleGameEvent(socket: Socket) {
        socket.on('moveToNextQuestion', (roomCode, currentQuestionIndex) => {
            const hostRoom = 'room' + roomCode;
            this.sio.to(hostRoom).emit('nextQuestionIndex', ++currentQuestionIndex);
            this.currentQuestionIndexes.set(hostRoom, currentQuestionIndex);
            const nextQuestion = this.currentQuizzes.get(hostRoom)[currentQuestionIndex];
            this.sio.to(hostRoom).emit('updatedHistogram', nextQuestion);
        });

        socket.on('allPlayersAnswered', (roomCode, isReadyForNextQuestion) => {
            const hostRoom = 'room' + roomCode;
            this.sio.to(hostRoom).emit('readyForNextQuestion', isReadyForNextQuestion);
        });

        socket.on('gameStarted', (roomCode, questions) => {
            const hostRoom = this.createRoomString(roomCode);
            this.currentQuestionIndexes.set(hostRoom, 0);
            this.currentQuizzes.set(hostRoom, questions);
            this.sio.to(hostRoom).emit('updatedHistogram', this.currentQuizzes.get(hostRoom)[0]);
        });

        // We need these all parameters
        // eslint-disable-next-line max-params
        socket.on('playerActiveOrInactive', (roomCode, questionIndex, isActive, isAlreadySentStatus, isRemovingFromHistogram) => {
            const hostRoom = this.createRoomString(roomCode);
            this.updateHistogramQRL(hostRoom, questionIndex, isActive, isAlreadySentStatus, isRemovingFromHistogram);
        });

        socket.on('selectedChoice', (roomCode, questionIndex, selectedChoice) => {
            const hostRoom = this.createRoomString(roomCode);
            const currentQuestions = this.currentQuizzes.get(hostRoom);
            if (currentQuestions !== undefined) {
                const question = currentQuestions[questionIndex];
                const choiceToUpdate = question.choices.find((choice) => choice.choice === selectedChoice);
                if (choiceToUpdate) {
                    ++choiceToUpdate.numberOfAnswers;
                }
                question.choices.map((choice) => {
                    if (choice === choiceToUpdate) choice = choiceToUpdate;
                });
                currentQuestions[questionIndex] = question;
                this.currentQuizzes.set(hostRoom, currentQuestions);
                this.sio.to(hostRoom).emit('updatedHistogram', currentQuestions[questionIndex]);
            }
        });
        socket.on('unselectedChoice', (roomCode, questionIndex, unSelectedChoice) => {
            const hostRoom = this.createRoomString(roomCode);

            const currentQuestions = this.currentQuizzes.get(hostRoom);
            if (currentQuestions !== undefined) {
                const question = currentQuestions[questionIndex];
                const choiceToUpdate = question.choices.find((choice) => choice.choice === unSelectedChoice);
                if (choiceToUpdate) {
                    --choiceToUpdate.numberOfAnswers;
                }
                question.choices.map((choice) => {
                    if (choice === choiceToUpdate) choice = choiceToUpdate;
                });
                currentQuestions[questionIndex] = question;
                this.currentQuizzes.set(hostRoom, currentQuestions);
                this.sio.to(hostRoom).emit('updatedHistogram', currentQuestions[questionIndex]);
            }
        });
        socket.on('redirectAllToResult', (roomCode) => {
            const hostRoom = this.createRoomString(roomCode);
            const questionWithChoices = this.currentQuizzes.get(hostRoom);
            this.sio.to(hostRoom).emit('redirectToResult', questionWithChoices);
        });

        socket.on('retrieveDataResults', (playerId, roomCode) => {
            const hostRoom = this.createRoomString(roomCode);
            const questionWithChoices = this.currentQuizzes.get(hostRoom);
            this.sio.to(playerId).emit('listOfPlayersWithResults', questionWithChoices);
        });

        socket.on('deleteRoom', (roomCode) => {
            const hostRoom = this.createRoomString(roomCode);
            this.currentQuizzes.delete(hostRoom);
        });

        socket.on('gameStartData', (roomCode: string, gameStartData) => {
            this.gameStartDataMap.set(roomCode, gameStartData);
        });

        socket.on('gameEndData', (roomCode, gameEndData) => {
            const gameStartData = this.gameStartDataMap.get(roomCode);
            if (gameStartData) {
                const gameHistoryEntry: GameHistoryEntry = {
                    ...gameStartData,
                    topScore: gameEndData.topScore,
                };
                dbService.addGameHistoryEntry(gameHistoryEntry);

                this.gameStartDataMap.delete(roomCode);
            }
        });
    }

    createRoomString(roomCode: string): string {
        return 'room' + roomCode;
    }
    emitInteractionCode(roomCode: string, username: string, colorCode: string) {
        this.sio.to(roomCode).emit('interaction', { username, colorCode });
    }
    emitChatPrivilegeMessage(username: string, playerId: string, isAllowedToChat: boolean) {
        let message = `${username} vous n'avez plus le droit de clavarder !`;
        if (isAllowedToChat) message = `${username} vous avez de nouveau le droit de clavarder !`;
        const timeStamp = new Date();
        this.sio.to(playerId).emit('newMessage', { username: 'Organisateur', message, timeStamp, isNotification: true });
    }
    handleChatPrivilege(username: string, socketId: string, isAllowedToChat: boolean) {
        if (isAllowedToChat) {
            this.sio.to(socketId).emit('unblockChat', isAllowedToChat);
        } else this.sio.to(socketId).emit('blockChat', isAllowedToChat);
        this.emitChatPrivilegeMessage(username, socketId, isAllowedToChat);
    }

    // We need these all parameters
    // eslint-disable-next-line max-params
    updateHistogramQRL(hostRoom: string, questionIndex: number, isActive: boolean, isAlreadySentStatus: boolean, isRemovingFromHistogram: boolean) {
        const currentQuestions = this.currentQuizzes.get(hostRoom);

        if (currentQuestions !== undefined) {
            const question = currentQuestions[questionIndex];
            const choiceToUpdateActive = question.choices[0];
            const choiceToUpdateInactive = question.choices[1];

            if (isRemovingFromHistogram) {
                if (isActive) {
                    --choiceToUpdateActive.numberOfAnswers;
                } else if (!isActive) {
                    --choiceToUpdateInactive.numberOfAnswers;
                }
            } else if (!isAlreadySentStatus) {
                if (isActive) {
                    ++choiceToUpdateActive.numberOfAnswers;
                } else if (!isActive) {
                    ++choiceToUpdateInactive.numberOfAnswers;
                }
            } else {
                if (isActive) {
                    ++choiceToUpdateActive.numberOfAnswers;
                    --choiceToUpdateInactive.numberOfAnswers;
                } else if (!isActive) {
                    ++choiceToUpdateInactive.numberOfAnswers;
                    --choiceToUpdateActive.numberOfAnswers;
                }
            }

            currentQuestions[questionIndex] = question;
            this.sio.to(hostRoom).emit('updatedHistogram', currentQuestions[questionIndex]);
        }
    }
}
