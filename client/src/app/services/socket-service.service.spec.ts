/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-empty-function */
// we disable some lint to simplify some test
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SocketTestHelper } from '@app/classes/socket-test-helper';
import { QuestionType } from '@app/constants/question-type';
import { ListOfQrlAnswer } from '@app/interfaces/list-qrl-answer';
import { Question } from '@app/interfaces/question';
import { Socket } from 'socket.io-client';
import { SocketClientService } from './socket-service.service';

describe('SocketClientService', () => {
    let service: SocketClientService;
    let emitSpy: jasmine.Spy;
    let onSpy: jasmine.Spy;
    const room = '1234';

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
        });
        service = TestBed.inject(SocketClientService);
        service.socket = new SocketTestHelper() as unknown as Socket;
        emitSpy = spyOn(service.socket, 'emit').and.callThrough();
        onSpy = spyOn(service.socket, 'on').and.callThrough();
    });

    afterEach(() => {
        service.socket = new SocketTestHelper() as unknown as Socket;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should emit pauseTimer event with correct arguments when roomCode and isPanicModeOn are provided', () => {
        const roomCode = '1234';
        const isPanicModeOn = true;
        service.pauseTimer(roomCode, isPanicModeOn);
        expect(service.socket.emit).toHaveBeenCalledWith('pauseTimer', roomCode, isPanicModeOn);
    });
    it('should emit resumeTimer event with roomCode and isPanicModeOn as arguments', () => {
        const roomCode = '1234';
        const isPanicModeOn = true;
        service.resumeTimer(roomCode, isPanicModeOn);
        expect(service.socket.emit).toHaveBeenCalledWith('resumeTimer', roomCode, isPanicModeOn);
    });
    it('should emit "startPanicMode" event with roomCode parameter', () => {
        const roomCode = '1234';
        service.startPanicMode(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('startPanicMode', roomCode);
    });

    it('should disconnect', () => {
        const spy = spyOn(service.socket, 'disconnect');
        service.disconnect();
        expect(spy).toHaveBeenCalled();
    });

    it('isSocketAlive should return true if the socket is still connected', () => {
        service.socket.connected = true;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeTruthy();
    });

    it('isSocketAlive should return false if the socket is no longer connected', () => {
        service.socket.connected = false;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeFalsy();
    });

    it('isSocketAlive should return false if the socket is not defined', () => {
        (service.socket as unknown) = undefined;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeFalsy();
    });

    it('should call socket.on with an event', () => {
        const event = 'helloWorld';
        const action = () => {};
        service.on(event, action);
        expect(onSpy).toHaveBeenCalled();
        expect(onSpy).toHaveBeenCalledWith(event, action);
    });

    it('should call emit with data when using send', () => {
        const event = 'helloWorld';
        const data = 42;
        service.send(event, data);
        expect(service.socket.emit).toHaveBeenCalledWith(event, data);
    });

    it('should call emit without data when using send if data is undefined', () => {
        const event = 'helloWorld';
        service.send(event);
        expect(service.socket.emit).toHaveBeenCalledWith(event);
    });
    it('should emit redirectAll event', () => {
        const roomCode = '1234';
        const quizId = '5678';
        service.redirectAll(roomCode, quizId);
        expect(service.socket.emit).toHaveBeenCalledWith('redirectAll', roomCode, quizId);
    });

    it('should emit openDialogboxWaiting event', () => {
        const roomCode = '1234';
        const quizId = '5678';
        service.openDialogboxWaiting(roomCode, quizId);
        expect(service.socket.emit).toHaveBeenCalledWith('openDialogboxWaiting', roomCode, quizId);
    });
    it('should remove the listener for the given event when event parameter is provided', () => {
        const event = 'helloWorld';
        const spy = spyOn(service.socket, 'off');
        service.off(event);
        expect(spy).toHaveBeenCalledWith(event);
    });
    it('getSocket should return the current socket instance', () => {
        const currentSocket = service.getSocket();
        expect(currentSocket).toEqual(service.socket);
    });
    it('should emit the waitingQuizId event', () => {
        service.waitingQuizId();
        expect(service.socket.emit).toHaveBeenCalledWith('waitingQuizId');
    });

    it('should emit incrementScoreServer event with the correct arguments', () => {
        const questionPoints = 10;
        const roomCode = '1234';
        service.incrementScoreServer(questionPoints, roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('incrementScoreServer', questionPoints, service.socket.id, roomCode);
    });
    it('should emit retrieveDataPlayers event with the correct arguments', () => {
        const roomCode = '1234';
        service.getDataPlayers(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('retrieveDataPlayers', service.socket.id, roomCode);
    });

    it('should emit retrieveDataResults event with the correct arguments', () => {
        const roomCode = '1234';
        service.getDataResults(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('retrieveDataResults', service.socket.id, roomCode);
    });
    it('should emit waitingStartTimer event with the correct arguments', () => {
        const roomCode = '1234';
        const questionDuration = 10;
        service.waitingStartTimer(roomCode, questionDuration);
        expect(service.socket.emit).toHaveBeenCalledWith('waitingStartTimer', roomCode, questionDuration);
    });
    it('should emit stopTimerRoom event with the correct arguments', () => {
        const roomCode = '1234';
        service.stopTimerRoom(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('stopTimerRoom', roomCode);
    });
    it('should emit removeFromFirstToAnswerContender event with the correct arguments', () => {
        const roomCode = '1234';
        service.removeFromFirstToAnswerContender(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('removeFromFirstToAnswerContender', roomCode);
    });
    it('should emit clearAnswersOnServer event with the correct arguments', () => {
        const roomCode = '1234';
        service.clearAnswersOnServer(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('clearAnswersOnServer', roomCode);
    });
    it('should emit addToAnswerOrderList event with the correct arguments', () => {
        const roomCode = '1234';
        service.addToAnswerOrderList(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('addToAnswerOrderList', roomCode, service.socket.id);
    });
    it('should emit getUsername event with the correct arguments', () => {
        const roomCode = '1234';
        service.getUsername(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('getUsername', roomCode, service.socket.id);
    });
    it('should not connect successfully to the server', () => {
        service.socket.connected = false;
        service.connect();
        expect(service.socket.connected).toBeFalse();
    });

    it("should emit 'leaveRoom' event with provided roomCode when socket is connected", () => {
        const roomCode = '1234';
        service.socket.connected = true;
        service.leaveRoom(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('leaveRoom', roomCode);
    });
    it('should emit openNextQuestionDialog event with the correct arguments', () => {
        const roomCode = '1234';
        service.openDialogboxNextQuestionDialog(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('openNextQuestionDialog', roomCode);
    });

    it('should emit moveToNextQuestion event with the correct arguments', () => {
        const roomCode = '1234';
        const currentQuestionIndex = 2;
        service.nextQuestion(roomCode, currentQuestionIndex);
        expect(service.socket.emit).toHaveBeenCalledWith('moveToNextQuestion', roomCode, currentQuestionIndex);
    });

    it('should emit joinRoom event with the correct arguments', () => {
        const roomCode = '1234';
        service.joinRoom(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('joinRoom', roomCode);
    });

    it('should emit requestListOfPlayers event with the correct arguments', () => {
        const roomCode = '1234';
        service.requestForListOfPlayers(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('requestListOfPlayers', roomCode);
    });
    it('should emit redirectAllToResult event with the correct roomCode', () => {
        const roomCode = '1234';
        service.redirectToResult(roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('redirectAllToResult', roomCode);
    });
    it('should emit unselectedChoice event with the correct arguments', () => {
        const roomCode = '1234';
        const questionIndex = 2;
        const unselectedChoice = '';
        service.unselectedChoice(roomCode, questionIndex, unselectedChoice);
        expect(service.socket.emit).toHaveBeenCalledWith('unselectedChoice', roomCode, questionIndex, unselectedChoice);
    });
    it('should emit gameStarted event with the correct arguments for non-empty QCM', () => {
        const questions: Question[] = [
            {
                type: QuestionType.QCM,
                points: 10,
                lastModified: '',
                text: 'What is 2+2?',
                choices: [
                    { text: '4', isCorrect: true },
                    { text: '22', isCorrect: false },
                ],
            },
        ];
        const expectedServerQuestions = questions.map((question) => ({
            text: question.text,
            choices: question.choices.map((choice) => ({
                choice: choice.text,
                numberOfAnswers: 0,
                isCorrect: choice.isCorrect,
            })),
        }));

        service.gameStarted(room, questions);

        expect(service.socket.emit).toHaveBeenCalledWith('gameStarted', room, expectedServerQuestions);
    });

    it('should emit gameStarted event with the correct arguments for non-empty QRL', () => {
        const questions: Question[] = [
            {
                type: QuestionType.QRL,
                points: 10,
                lastModified: '',
                text: 'How many active players are there?',
                choices: [],
            },
        ];
        const expectedServerQuestions = questions.map((question) => ({
            text: question.text,
            choices: [
                { choice: 'Nombre de joueurs actifs', numberOfAnswers: 0, isCorrect: true },
                { choice: 'Nombre de Joueurs inactifs', numberOfAnswers: 0, isCorrect: false },
            ],
        }));

        service.gameStarted(room, questions);

        expect(service.socket.emit).toHaveBeenCalledWith('gameStarted', room, expectedServerQuestions);
    });

    it('should emit selectedChoice event with correct parameters', () => {
        const roomCode = '1234';
        const questionIndex = 2;
        const selectedChoice = 'A';
        service.selectedChoice(roomCode, questionIndex, selectedChoice);
        expect(service.socket.emit).toHaveBeenCalledWith('selectedChoice', roomCode, questionIndex, selectedChoice);
    });

    it('should emit handleChatPrivilege event with the correct arguments', () => {
        const roomCode = '1234';
        const username = 'Taro';
        const isAllowedToChat = true;
        service.handleChatPrivilege(roomCode, username, isAllowedToChat);
        expect(service.socket.emit).toHaveBeenCalledWith('handleChatPrivilege', roomCode, username, isAllowedToChat);
    });

    it('should emit answerSubmitted and playerSubmitted event with the correct arguments', () => {
        const isTimerOver = false;
        const isRandom = false;
        const questionType = QuestionType.QCM;
        service.socket.id = '1234';
        service.submitAnswer(room, questionType, isRandom, isTimerOver);
        expect(service.socket.emit).toHaveBeenCalledWith('answerSubmitted', room, questionType, service.socket.id, isRandom);
        expect(service.socket.emit).toHaveBeenCalledWith('playerSubmitted', room, service.socket.id);
    });

    it('should emit "playerActiveOrInactive" with correct parameters', () => {
        const roomCode = 'testRoom';
        const questionIndex = 1;
        const isPlayerActive = true;
        const isAlreadySentStatus = false;
        const isRemovingFromHistogram = true;

        service.playerActiveOrInactive(roomCode, questionIndex, isPlayerActive, isAlreadySentStatus, isRemovingFromHistogram);

        expect(emitSpy).toHaveBeenCalledWith(
            'playerActiveOrInactive',
            roomCode,
            questionIndex,
            isPlayerActive,
            isAlreadySentStatus,
            isRemovingFromHistogram,
        );
    });

    it('should emit "playerIsNotTyping" when player is not active', () => {
        const roomCode = 'testRoom';
        const questionIndex = 1;
        const isPlayerActive = false;
        const isAlreadySentStatus = false;
        const isRemovingFromHistogram = true;

        service.playerActiveOrInactive(roomCode, questionIndex, isPlayerActive, isAlreadySentStatus, isRemovingFromHistogram);
        expect(emitSpy).toHaveBeenCalledWith('playerIsNotTyping', roomCode, service.socket.id);
    });

    it('should emit "pausePanicMode" event with the correct roomCode', () => {
        const roomCode = 'testRoom';
        service.pausePanicMode(roomCode);
        expect(emitSpy).toHaveBeenCalledWith('pausePanicMode', roomCode);
    });

    it('should emit "resumePanicMode" event with the correct roomCode', () => {
        const roomCode = 'testRoom';
        service.resumePanicMode(roomCode);
        expect(emitSpy).toHaveBeenCalledWith('resumePanicMode', roomCode);
    });

    it('should set up a listener for "panicModeStarted"', () => {
        const callback = jasmine.createSpy('callback');
        service.onPanicModeStarted(callback);
        expect(onSpy).toHaveBeenCalledWith('panicModeStarted', callback);
    });

    it('should set up a listener for "panicModePaused"', () => {
        const callback = jasmine.createSpy('callback');
        service.onPanicModePaused(callback);
        expect(onSpy).toHaveBeenCalledWith('panicModePaused', callback);
    });

    it("should emit 'clearAnswerOrg' event with the correct room code", () => {
        service.clearAnswerOrg(room);
        expect(service.socket.emit).toHaveBeenCalledWith('clearAnswerOrg', room);
    });

    it('sendGameStartData should emit gameStartData event with correct parameters', () => {
        const roomCode = 'room123';
        const quizTitle = 'Quiz Title';
        const listOfPlayers = 3;

        service.sendGameStartData(quizTitle, listOfPlayers, roomCode);

        expect(emitSpy).toHaveBeenCalledWith(
            'gameStartData',
            roomCode,
            jasmine.objectContaining({
                quizName: quizTitle,
                playerCount: listOfPlayers,
                startTime: jasmine.any(Date),
            }),
        );
    });

    it('sendGameEndData should emit gameEndData event with correct parameters', () => {
        const roomCode = 'room123';
        const topScore = 100;

        service.sendGameEndData(topScore, roomCode);
        expect(service.socket.emit).toHaveBeenCalledWith('gameEndData', roomCode, jasmine.objectContaining({ topScore }));
    });
    it('should emit "sendAnswerToOrg" with the correct parameters', () => {
        const roomCode = 'room1';
        const username = 'user1';
        const answer = 'answer1';
        const point = 100;

        service.sendAnswerToOrg(roomCode, username, answer, point);
        expect(emitSpy).toHaveBeenCalledWith('sendAnswerToOrg', roomCode, username, answer, point, service.socket.id);
    });

    it('should emit "retrieveDataCorrection" with the correct parameters', () => {
        const roomCode = 'room1';

        service.getDataCorrectionQrl(roomCode);
        expect(emitSpy).toHaveBeenCalledWith('retrieveDataCorrection', roomCode, service.socket.id);
    });
    it('should emit playerSurrenderedDuringQRL event with correct parameters', () => {
        const roomCode = 'room1';
        const questionIndex = '';
        const isSurrendered = true;

        service.playerSurrenderedDuringQRL(roomCode, questionIndex, isSurrendered);
        expect(emitSpy).toHaveBeenCalledWith('playerSurrenderedDuringQRL', roomCode, questionIndex, isSurrendered);
    });

    it('should set up a listener for "panicModeResumed"', () => {
        const callback = jasmine.createSpy('callback');
        service.onPanicModeResumed(callback);
        expect(onSpy).toHaveBeenCalledWith('panicModeResumed', callback);
    });

    it('should emit gameStarted and return null if its neither a QCM or QRL', () => {
        const questions: Question[] = [
            {
                type: 'invalid' as QuestionType,
                points: 10,
                lastModified: '',
                text: 'What is 2+2?',
                choices: [
                    { text: '4', isCorrect: true },
                    { text: '22', isCorrect: false },
                ],
            },
        ];
        service.gameStarted(room, questions);
        expect(service.socket.emit).toHaveBeenCalledWith('gameStarted', room, [null]);
    });

    it('should emit "sendDataCorrectionQrlToServer" with the correct parameters', () => {
        const roomCode = 'room123';
        const dataCorrection = {
            questionId: 1,
            correct: true,
            questionIndex: 0,
            questionTitle: 'Sample Question',
            amount0: 10,
            amount50: 5,
            amount100: 2,
        };

        service.sendDataCorrectionQrlToServer(roomCode, dataCorrection);
        expect(emitSpy).toHaveBeenCalledWith('sendDataCorrectionQrlToServer', roomCode, dataCorrection);
    });
    it('should emit sendScoreQrlToClient event with correct parameters', () => {
        const roomCode = 'room123';
        const listOfQrlAnswer: ListOfQrlAnswer[] = [
            {
                playerId: '1',
                username: 'User1',
                answer: 'Answer1',
                point: 100,
                score: 0,
            },
        ];

        service.sendScoreQrlToClient(roomCode, listOfQrlAnswer);
        expect(emitSpy).toHaveBeenCalledWith('sendScoreQrlToClient', roomCode, listOfQrlAnswer);
    });
    it("should emit 'playerIsNotTyping' event when isPlayerActive is false", () => {
        const roomCode = 'ABC123';
        const questionIndex = 1;
        const isPlayerActive = false;
        const isAlreadySentStatus = false;
        const isRemovingFromHistogram = true;

        service.playerActiveOrInactive(roomCode, questionIndex, isPlayerActive, isAlreadySentStatus, isRemovingFromHistogram);

        expect(service.socket.emit).toHaveBeenCalledWith(
            'playerActiveOrInactive',
            roomCode,
            questionIndex,
            isPlayerActive,
            isAlreadySentStatus,
            isRemovingFromHistogram,
        );
        expect(service.socket.emit).toHaveBeenCalledWith('playerIsNotTyping', roomCode, service.socket.id);
    });
});
