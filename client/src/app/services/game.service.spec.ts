/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disable some lint to simplify some test
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { QuestionType } from '@app/constants/question-type';
import { SIXTY_SECOND } from '@app/constants/time';
import { Quiz } from '@app/interfaces/quiz';
import { Result } from '@app/interfaces/result';
import { DialogService } from '@app/services/dialog.service';
import { GameService } from './game.service';
import { SocketClientService } from './socket-service.service';

const quiz1: Quiz = {
    id: '1',
    title: 'Quiz 1',
    description: 'Quiz 1 description',
    duration: 10,
    lastModification: '2024-01-30',
    questions: [],
    isVisible: true,
};

const quiz2: Quiz = {
    id: '2',
    title: 'Quiz 2',
    description: 'Quiz 2 description',
    duration: 20,
    lastModification: '2024-02-30',
    questions: [],
    isVisible: true,
};

describe('GameService', () => {
    let service: GameService;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let router: Router;
    const dialogServiceMock = {
        openAllPlayersLeft: jasmine.createSpy('openAllPlayersLeft'),
    };

    beforeEach(() => {
        socketServiceMock = jasmine.createSpyObj('SocketService', [
            'on',
            'emit',
            'send',
            'off',
            'joinRoom',
            'requestForListOfPlayers',
            'deleteRoom',
            'nextQuestion',
            'waitingStartTimer',
            'redirectToResult',
            'newPlayer',
            'deletePlayer',
            'nextQuestionIndex',
            'readyForNextQuestion',
            'answerWithListOfPlayers',
            'timerUpdated',
            'timerExpired',
            'allPlayersAnswered',
            'kickOrganizer',
            'updatedHistogram',
            'updateScore',
            'updatedHistogram',
        ]);
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, RouterTestingModule, MatDialogModule],
            providers: [
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: DialogService, useValue: dialogServiceMock },
            ],
        });
        service = TestBed.inject(GameService);
        router = TestBed.inject(Router);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return the first quiz in the quizData array', () => {
        service.quizData = [quiz1, quiz2];
        expect(service.getQuiz()).toEqual(quiz1);
    });

    it('should set the quizData array to contain the provided quiz object', () => {
        service.setQuiz(quiz1);
        expect(service.quizData).toEqual([quiz1]);
    });

    it('should return the text of the current question when quizData is not empty and currentQuestionIndex is valid', () => {
        service.quizData = [quiz1];
        service.currentQuestionIndex = 0;
        service.quizData[0].questions = [{ type: 'QCM', text: 'Question 1', lastModified: '2024-03-19', points: 10, choices: [] }];
        expect(service.getCurrentQuestionText()).toEqual('Question 1');
        expect(service.getCurrentQuestionPoint()).toEqual(10);
        expect(service.getDurationQuestion()).toEqual(10);
    });

    it('should return an empty text and a value of 0 points if quizData is empty', () => {
        service.quizData = [];
        service.currentQuestionIndex = 0;
        expect(service.getCurrentQuestionText()).toEqual('');
        expect(service.getCurrentQuestionPoint()).toEqual(0);
    });

    it('should increment the score by the correct amount when given a positive integer', () => {
        service.score = 0;
        service.incrementScore(5);
        expect(service.score).toEqual(6);
    });

    it('should set the quizData property to an array containing the provided quiz object', () => {
        service.beginGame(quiz1);
        expect(service.quizData).toEqual([quiz1]);
        expect(service.isGameFinished).toEqual(false);
        expect(service.currentQuestionIndex).toEqual(0);
    });

    it('should join a room with startGame and a given room code', () => {
        service.startGame('123');
        expect(service.roomCode).toEqual('123');
        expect(service.currentQuestionIndex).toEqual(0);
    });

    it('should join the room using socketService.joinRoom when roomCode is provided', () => {
        service.initializeLobby('123');
        expect(socketServiceMock.joinRoom).toHaveBeenCalledWith('123');
    });

    it('should delete all room messages when destroyGame is called', () => {
        service.roomMessages = [{ username: 'test', message: 'test', timeStamp: new Date(), isSent: true, isNotification: false }];
        service.destroyGame('123');
        expect(service.roomMessages).toEqual([]);
        expect(socketServiceMock.send).toHaveBeenCalledWith('deleteRoom', '123');
    });

    it('should call nextQuestion and waitingStartTimer if the next question is a QCM', fakeAsync(() => {
        service.roomCode = '123';
        service.currentQuestionIndex = 0;
        service.quizData = [quiz1];
        service.quizData[0].questions = [
            { type: 'QCM', text: 'Question 1', lastModified: '2024-03-19', points: 10, choices: [] },
            { type: 'QCM', text: 'Question 2', lastModified: '2024-03-19', points: 10, choices: [] },
        ];
        service.moveToNextQuestion();
        tick(4000);
        expect(socketServiceMock.nextQuestion).toHaveBeenCalledWith('123', 0);
        expect(socketServiceMock.waitingStartTimer).toHaveBeenCalledWith('123', 10);
    }));

    it('should call waitingStartTimer and wait sixty seconds if the next question is not a QCM', fakeAsync(() => {
        service.roomCode = '123';
        service.currentQuestionIndex = 0;
        service.quizData = [quiz1];
        service.quizData[0].questions = [
            { type: QuestionType.QCM, text: 'Question 1', lastModified: '2024-03-19', points: 10, choices: [] },
            { type: QuestionType.QRL, text: 'Question 2', lastModified: '2024-03-19', points: 10, choices: [] },
        ];
        service.moveToNextQuestion();
        tick(4000);
        expect(socketServiceMock.waitingStartTimer).toHaveBeenCalledWith('123', SIXTY_SECOND);
    }));

    it('should call redirectToResult method of socketService with roomCode property as argument', () => {
        service.roomCode = '123';
        service.goToResultPage();
        expect(socketServiceMock.redirectToResult).toHaveBeenCalledWith('123');
    });

    it('should return true when isTimeOver is true and isLastQuestion is false', () => {
        service.isTimeOver = true;
        service.isLastQuestion = () => false;
        const readyToMove = service.isReadyToMoveNextQuestion();
        expect(readyToMove).toBeTrue();
    });

    it('should update the result property with the provided result', () => {
        const result = { text: 'Résultat du quiz', choices: [{ choice: 'Option 1', isCorrect: true, numberOfAnswers: 10 }] };
        service.updateResultFromSocket(result);
        expect(service.result).toEqual(result);
    });

    it('should call off method on socketService with all the arguments', () => {
        service.cleanOnDestroy();
        expect(socketServiceMock.off).toHaveBeenCalledWith('nextQuestionIndex');
        expect(socketServiceMock.off).toHaveBeenCalledWith('readyForNextQuestion');
        expect(socketServiceMock.off).toHaveBeenCalledWith('timerUpdated');
        expect(socketServiceMock.off).toHaveBeenCalledWith('timerExpired');
        expect(socketServiceMock.off).toHaveBeenCalledWith('allPlayersAnswered');
        expect(socketServiceMock.off).toHaveBeenCalledWith('kickOrganizer');
        expect(socketServiceMock.off).toHaveBeenCalledWith('updatedHistogram');
        expect(socketServiceMock.off).toHaveBeenCalledWith('updatedHistogram');
    });

    it('should return true when quizData is not empty, isTimeOver is true, and currentQuestionIndex is equal to the last index', () => {
        service.quizData = [quiz1];
        service.isTimeOver = true;
        service.currentQuestionIndex = 0;
        service.quizData[0].questions = [{ type: 'QCM', text: 'Question 1', lastModified: '2024-03-19', points: 10, choices: [] }];
        const isLastQuestion = service.isLastQuestion();
        expect(isLastQuestion).toBeTrue();
    });

    it('should return false if currentQuestionIndex is not equal to the last index of the questions', () => {
        service.quizData = [quiz1];
        service.isTimeOver = true;
        service.currentQuestionIndex = 0;
        service.quizData[0].questions = [
            { type: 'QCM', text: 'Question 1', lastModified: '2024-03-19', points: 10, choices: [] },
            { type: 'QCM', text: 'Question 2', lastModified: '2024-03-19', points: 20, choices: [] },
        ];
        const isLastQuestion = service.isLastQuestion();
        expect(isLastQuestion).toBeFalse();
    });

    it('should set time on timerUpdated event', () => {
        const expectedTime = 10;
        socketServiceMock.on.and.callFake(<T>(event: string = 'timerUpdated', callback: (data: T) => void) => {
            if (event === 'timerUpdated') {
                callback(expectedTime as unknown as T);
            }
        });

        service.handleTimeEvents();
        expect(service.time).toBe(expectedTime);
    });

    it('should set isTimeOver to true on timerExpired event', () => {
        socketServiceMock.on.and.callFake(<T>(event: string = 'timerExpired', callback: (data: T) => void) => {
            if (event === 'timerExpired') {
                callback(undefined as unknown as T);
            }
        });

        service.handleTimeEvents();
        expect(service.isTimeOver).toBeTrue();
    });

    it('should set isTimeOver to true on allPlayersAnswered event', () => {
        socketServiceMock.on.and.callFake(<T>(event: string = 'allPlayersAnswered', callback: (data: T) => void) => {
            if (event === 'allPlayersAnswered') {
                callback(undefined as unknown as T);
            }
        });

        service.handleTimeEvents();
        expect(service.isTimeOver).toBeTrue();
    });

    it('should change the question index', () => {
        service.quizData = [quiz1];
        const nextQuestionIndex = 1;
        service.quizData[0].questions = [
            { type: 'QCM', text: 'Question 1', lastModified: '2024-03-19', points: 10, choices: [] },
            { type: 'QCM', text: 'Question 2', lastModified: '2024-03-19', points: 20, choices: [] },
        ];
        socketServiceMock.on.and.callFake(<T>(event: string = 'nextQuestionIndex', callback: (data: T) => void) => {
            if (event === 'nextQuestionIndex') {
                callback(nextQuestionIndex as unknown as T);
            }
        });

        service.handleQuestionEvents();
        expect(service.isTimeOver).toBeFalse();
        expect(service.currentQuestionIndex).toEqual(nextQuestionIndex);
        expect(service.result.text).toEqual(quiz1.questions[nextQuestionIndex].text);
    });

    it('should the state of isReadyForNextQuestion on the listener readyForNextQuestion', () => {
        const isReadyForNextQuestion = false;
        socketServiceMock.on.and.callFake(<T>(event: string = 'readyForNextQuestion', callback: (data: T) => void) => {
            if (event === 'readyForNextQuestion') {
                callback(isReadyForNextQuestion as unknown as T);
            }
        });

        service.handleQuestionEvents();
        expect(service.isReadyForNextQuestion).toBeFalse();
    });

    it('should send the user to /home and open a dialog on event kickOrganizer', () => {
        spyOn(router, 'navigate');
        socketServiceMock.on.and.callFake(<T>(event: string = 'kickOrganizer', callback: (data: T) => void) => {
            if (event === 'kickOrganizer') {
                callback(undefined as unknown as T);
            }
        });

        service.handlePlayersEvents();
        expect(dialogServiceMock.openAllPlayersLeft).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should update the histogram with the new result', () => {
        spyOn(service, 'updateResultFromSocket');
        const currentQuestionChoice: Result = { text: 'test', choices: [{ choice: 'Option 1', isCorrect: true, numberOfAnswers: 10 }] };
        socketServiceMock.on.and.callFake(<T>(event: string = 'updatedHistogram', callback: (data: T) => void) => {
            if (event === 'updatedHistogram') {
                callback(currentQuestionChoice as unknown as T);
            }
        });

        service.handleResultsEvents();
        expect(service.updateResultFromSocket).toHaveBeenCalledWith(currentQuestionChoice);
    });

    it('should redirect the user to the result page', () => {
        spyOn(router, 'navigate');
        const result: Result = { text: 'test', choices: [{ choice: 'Option 1', isCorrect: true, numberOfAnswers: 10 }] };
        socketServiceMock.on.and.callFake(<T>(event: string = 'redirectToResult', callback: (data: T) => void) => {
            if (event === 'redirectToResult') {
                callback(result as unknown as T);
            }
        });

        service.handleRedirectionEvents();
        expect(router.navigate).toHaveBeenCalledWith(['/resultsGame', { result, username: service.organizerName }]);
    });

    it('should set the current question type to the provided type', () => {
        service.setCurrentQuestionType(QuestionType.QCM);
        expect(service.currentQuestionType).toEqual(QuestionType.QCM);
        expect(service.getCurrentQuestionType()).toEqual(QuestionType.QCM);
    });

    it('should set the current question time remaining to the given time', () => {
        service.setCurrentQuestionTimeRemaining(10);
        expect(service.currentQuestionTimeRemaining).toEqual(10);
        expect(service.getCurrentQuestionTimeRemaining()).toEqual(10);
    });
});
