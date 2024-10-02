/* eslint-disable max-lines */
// we disable some lint to simplify some test
import { Application } from '@app/app';
import { QuizController } from '@app/controllers/quiz.controller';
import { dbService } from '@app/services/database.service';
import * as chai from 'chai';
import * as express from 'express';
import * as fs from 'fs';
import { StatusCodes } from 'http-status-codes';
import { DeleteResult, ObjectId, WithId } from 'mongodb';
import * as Sinon from 'sinon';
import * as supertest from 'supertest';
import { Container } from 'typedi';
import { Quiz } from './../../../client/src/app/interfaces/quiz';

const expectedQuizData = { id: '1', name: 'Mock Quiz' };

describe('QuizController', () => {
    const quizController: QuizController = new QuizController();
    let expressApp: express.Application;
    let fsReadFileStub: Sinon.SinonStub;
    let dbServiceMock: Sinon.SinonMock;
    const id = '1';
    const invalidId = 'error';
    const arr1: string[] = ['a', 'b', 'c'];
    const arr2: string[] = ['a', 'b', 'd'];
    const arr3: string[] = ['a', 'b', 'c', 'd'];
    const quizId = 'validQuizId';
    let questionIndex = 0;
    const selectedAnswersRight = ['A', 'B'];
    const selectedAnswersWrong = ['A', 'C'];
    const quiz: Quiz = {
        id: 'validQuizId',
        title: 'Quiz Title',
        description: 'Quiz Description',
        duration: 10,
        lastModification: '2022-01-01',
        questions: [
            {
                type: 'QCM',
                text: 'Question 1',
                points: 40,
                choices: [
                    { text: 'A', isCorrect: true },
                    { text: 'B', isCorrect: true },
                    { text: 'C', isCorrect: false },
                    { text: 'D', isCorrect: false },
                ],
                lastModified: '',
            },
        ],
    };
    type QuizWithId = WithId<Quiz>;
    const quizWithId: QuizWithId = {
        ...quiz,
        _id: new ObjectId(),
    };
    const originalQuestion = quiz.questions;
    const updatedQuestion = {
        type: 'QCM',
        text: 'Question 1',
        points: 40,
        choices: [
            { text: 'DE', isCorrect: true },
            { text: 'TA', isCorrect: true },
            { text: 'ALLO', isCorrect: false },
            { text: 'AHBAH', isCorrect: false },
        ],
        lastModified: '',
    };

    beforeEach(async () => {
        const app = Container.get(Application);
        expressApp = app.app;
        fsReadFileStub = Sinon.stub(fs, 'readFile');
        dbServiceMock = Sinon.mock(dbService);
    });

    afterEach(async () => {
        fsReadFileStub.restore();
        dbServiceMock.restore();
        Sinon.restore();
    });
    it('should return true when selected answers match the correct answers', async () => {
        dbServiceMock.expects('quiz').withArgs(quizId).resolves(quiz);

        const isValid = await quizController['validateAnswer'](quizId, questionIndex, selectedAnswersRight);

        chai.expect(isValid).to.equal(true);
        dbServiceMock.verify();
    });

    it('should return false when selected answers do not match the correct answers', async () => {
        dbServiceMock.expects('quiz').withArgs(quizId).resolves(quiz);

        const isValid = await quizController['validateAnswer'](quizId, questionIndex, selectedAnswersWrong);

        chai.expect(isValid).to.equal(false);
        dbServiceMock.verify();
    });

    it('should return false when question index is out of range', async () => {
        questionIndex = 1;
        quiz.questions = [
            {
                type: 'QCM',
                text: 'Question 1',
                points: 40,
                choices: [
                    { text: 'A', isCorrect: true },
                    { text: 'B', isCorrect: true },
                    { text: 'C', isCorrect: false },
                ],
                lastModified: '',
            },
        ];

        dbServiceMock.expects('quiz').withArgs(quizId).resolves(quiz);

        const isValid = await quizController['validateAnswer'](quizId, questionIndex, selectedAnswersRight);

        chai.expect(isValid).to.equal(false);
        dbServiceMock.verify();
    });

    it('should return true when comparing two identical arrays', () => {
        const result = quizController['arraysEqual'](arr1, arr1);
        chai.expect(result).to.equal(true);
    });

    it('should return false when comparing two different arrays', () => {
        const result = quizController['arraysEqual'](arr1, arr2);
        chai.expect(result).to.equal(false);
    });

    it('should return false when comparing two arrays of different size', () => {
        const result = quizController['arraysEqual'](arr1, arr3);
        chai.expect(result).to.equal(false);
    });

    it('should return quizzes on GET /api/quiz/quiz-examples', async () => {
        Sinon.stub(dbService, 'quizzesCollection').get(async () => Promise.resolve([expectedQuizData]));
        return supertest(expressApp)
            .get('/api/quiz/quiz-examples')
            .expect(StatusCodes.OK)
            .then((response) => {
                chai.expect(response.body).to.deep.equal([expectedQuizData]);
            });
    });

    it('should return the quiz when it exists', async () => {
        Sinon.stub(dbService, 'findQuizById').withArgs(id).resolves(quizWithId);
        return supertest(expressApp).get(`/api/quiz/quiz-examples/${id}`).expect(StatusCodes.OK);
    });

    it('should return an internal server error on an invalid json parse', async () => {
        Sinon.stub(dbService, 'quizzesCollection').get(async () => Promise.reject(Error));
        return supertest(expressApp)
            .get('/api/quiz/quiz-examples')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.body.title).to.equal('Error');
                chai.expect(response.body.body).to.equal('Error parsing quiz data');
            });
    });

    it('should return status code 302 on bad GET request', async () => {
        Sinon.stub(dbService, 'quizzesCollection').get(async () => Promise.resolve([expectedQuizData]));
        return supertest(expressApp).get('/api/quiz/nireujervodk').expect(StatusCodes.MOVED_TEMPORARILY);
    });

    it('should return quizzes on GET /api/quiz/quiz-examples', async () => {
        const expectedQuestionData = { id: '1', text: 'Mock Question' };
        Sinon.stub(dbService, 'questionsCollection').get(async () => Promise.resolve([expectedQuestionData]));
        return supertest(expressApp)
            .get('/api/quiz/question-examples')
            .expect(StatusCodes.OK)
            .then((response) => {
                chai.expect(response.body).to.deep.equal([expectedQuestionData]);
            });
    });

    it('should return an internal server error on an invalid json parse', async () => {
        Sinon.stub(dbService, 'questionsCollection').get(async () => Promise.reject(Error));
        return supertest(expressApp)
            .get('/api/quiz/question-examples')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.body.title).to.equal('Error');
                chai.expect(response.body.body).to.equal('Error parsing quiz data');
            });
    });

    it('should return 404 NOT FOUND for an invalid id', async () => {
        Sinon.stub(dbService, 'findQuizById').withArgs(invalidId).resolves(null);
        return supertest(expressApp)
            .get(`/api/quiz/quiz-examples/${invalidId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                chai.expect(response.body).to.deep.equal({ message: 'Quiz not found' });
            });
    });

    it('should return 404 NOT FOUND when attempting to delete a non-existing quiz', async () => {
        const nonExistingQuizId = 'nonExistingId';
        const deleteResult: DeleteResult = {
            acknowledged: true,
            deletedCount: 0,
        };

        Sinon.stub(dbService, 'deleteQuiz').withArgs(nonExistingQuizId).resolves(deleteResult);

        return supertest(expressApp)
            .delete(`/api/quiz/quiz-examples/${nonExistingQuizId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                chai.expect(response.body).to.deep.equal({ message: 'Quiz not found' });
            });
    });

    it('should return 500 INTERNAL SERVER ERROR when adding a question fails', async () => {
        const mockError = new Error('Mock error');
        Sinon.stub(dbService, 'addQuestion').rejects(mockError);

        const requestBody = quiz.questions;
        return supertest(expressApp)
            .post('/api/quiz/questions')
            .send(requestBody)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.body).to.deep.equal({ message: 'Error adding question' });
            });
    });

    it('should return 201 CREATED with a message when adding a question successfully', async () => {
        const successMessage = 'Question added successfully';
        Sinon.stub(dbService, 'addQuestion').resolves({ message: successMessage, success: true });

        const requestBody = quiz.questions;

        return supertest(expressApp)
            .post('/api/quiz/questions')
            .send(requestBody)
            .expect(StatusCodes.CREATED)
            .then((response) => {
                chai.expect(response.body).to.equal(successMessage);
            });
    });

    it('should return the appropriate response when updating a question', async () => {
        Sinon.stub(dbService, 'updateQuestion').resolves({ message: 'Question updated successfully', success: true });

        return supertest(expressApp)
            .put('/api/quiz/questions')
            .send({ question: originalQuestion, questionUpdate: updatedQuestion })
            .expect(StatusCodes.OK)
            .then((response) => {
                chai.expect(response.body).to.equal('Question updated successfully');
            });
    });

    it('should handle question update requests, returning the appropriate response for error cases', async () => {
        Sinon.stub(dbService, 'updateQuestion').throws(new Error('Mock error'));

        return supertest(expressApp)
            .put('/api/quiz/questions')
            .send({ question: originalQuestion, questionUpdate: updatedQuestion })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.body).to.deep.equal({ message: 'Error updating question' });
            });
    });

    it('should return 500 and an error message when an error occurs during quiz parsing', async () => {
        Sinon.stub(dbService, 'quiz').withArgs(id).throws(new Error('parsing error'));
        return supertest(expressApp)
            .get(`/api/quiz/quiz-examples/${id}`)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.body.title).to.deep.equal('Error');
                chai.expect(response.body.body).to.deep.equal('Error parsing quiz data');
            });
    });

    it('should return quiz data on successful file read and parse', async () => {
        fsReadFileStub.yields(null, JSON.stringify(expectedQuizData));

        return supertest(expressApp)
            .get('/api/quiz/quiz-example')
            .expect(StatusCodes.OK)
            .then((response) => {
                chai.expect(response.body).to.deep.equal(expectedQuizData);
            });
    });

    it('should return 404 and an error message when the question is not found', async () => {
        Sinon.stub(dbService, 'updateQuestion').resolves(null);

        return supertest(expressApp)
            .put('/api/quiz/questions')
            .send({
                question: 'questionId',
                questionUpdate: quiz.questions,
            })
            .expect(StatusCodes.NOT_FOUND);
    });

    it('should return an error message on file read error', async () => {
        fsReadFileStub.yields(new Error('read error'));

        return supertest(expressApp)
            .get('/api/quiz/quiz-example')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.body.title).to.equal('Error');
                chai.expect(response.body.body).to.equal('Error reading quiz data');
            });
    });

    it('should return an error message on parse error', async () => {
        fsReadFileStub.yields(null, 'invalid JSON');

        return supertest(expressApp)
            .get('/api/quiz/quiz-example')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.body.title).to.equal('Error');
                chai.expect(response.body.body).to.equal('Error parsing quiz data');
            });
    });

    it('should return isValid true when answer is valid', async () => {
        // we disable some lint to simplify some test
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validateAnswerStub = Sinon.stub((quizController as any).__proto__, 'validateAnswer').resolves(true);

        const requestBody = {
            quizId: '123',
            questionIndex: 0,
            selectedAnswers: ['A', 'B'],
        };

        return supertest(expressApp)
            .post('/api/quiz/validate-answer')
            .send(requestBody)
            .expect(StatusCodes.OK)
            .set('Accept', 'application/json')
            .then((response) => {
                chai.expect(response.body).to.deep.equal({ isValid: true });
            });
        // we disable some lint to simplify some test
        // eslint-disable-next-line no-unreachable
        validateAnswerStub.restore();
    });

    it('should return isValid false and status code 500 when an error occurs', async () => {
        // we disable some lint to simplify some test
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Sinon.stub((quizController as any).__proto__, 'validateAnswer').rejects(new Error('Validation failed'));

        const requestBody = {
            quizId: '123',
            questionIndex: 0,
            selectedAnswers: ['A', 'B'],
        };

        return supertest(expressApp)
            .post('/api/quiz/validate-answer')
            .send(requestBody)
            .set('Accept', 'application/json')
            .then((response) => {
                chai.expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
                chai.expect(response.body).to.deep.equal({ isValid: false });
            });
    });

    it('should return status code 500 when an error occurs during quiz deletion', async () => {
        const mockError = new Error('Mock error');

        Sinon.stub(dbService, 'deleteQuiz').rejects(mockError);
        return supertest(expressApp)
            .delete('/api/quiz/quiz-examples/mockQuizId')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
            });
    });

    it('should edit a quiz successfully', async () => {
        const mockReq = {
            body: { id: '1', name: 'Edited Quiz' },
        };

        Sinon.stub(dbService, 'editQuiz').resolves();
        const response = await supertest(expressApp).put('/api/quiz/quiz-examples').send(mockReq.body).expect(StatusCodes.OK);

        chai.expect(response.status).to.equal(StatusCodes.OK);
        chai.expect(response.body).to.deep.equal(mockReq.body);
    });

    it('should handle error if editing quiz fails', async () => {
        const expectedError = new Error('Mock error');
        const mockReq = {
            body: { id: '1', name: 'Edited Quiz' },
        };

        Sinon.stub(dbService, 'editQuiz').rejects(expectedError);
        const response = await supertest(expressApp).put('/api/quiz/quiz-examples').send(mockReq.body).expect(StatusCodes.INTERNAL_SERVER_ERROR);
        chai.expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
        chai.expect(response.body).to.deep.equal({ title: 'Error', body: 'Error editing quiz' });
    });

    it('should return success if password is correct', async () => {
        const req = {
            body: {
                password: 'log2990-210',
            },
        };

        const response = await supertest(expressApp).post('/api/quiz/verifyPassword').send(req.body).expect(StatusCodes.OK);
        chai.expect(response.status).to.equal(StatusCodes.OK);
        chai.expect(response.body).to.deep.equal({ success: true });
    });

    it('should return fail if password is incorrect', async () => {
        const req = {
            body: {
                password: 'Wrong',
            },
        };
        const response = await supertest(expressApp).post('/api/quiz/verifyPassword').send(req.body).expect(StatusCodes.FORBIDDEN);
        chai.expect(response.status).to.equal(StatusCodes.FORBIDDEN);
        chai.expect(response.body).to.deep.equal({ success: false });
    });

    it('should return success when quiz visibility is updated', async () => {
        const reqBody = {
            isVisible: true,
        };
        // we disable some lint to simplify some test
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockDbResponse = { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null as any };
        const toggleQuizVisibilityStub = Sinon.stub(dbService, 'toggleQuizVisibility').resolves(mockDbResponse);
        const response = await supertest(expressApp).patch('/api/quiz/quiz-examples/validQuizId').send(reqBody).expect(StatusCodes.OK);
        chai.expect(response.body).to.deep.equal({ message: 'Quiz visibility updated successfully' });
        toggleQuizVisibilityStub.restore();
    });

    it('should return fail when quiz is not found', async () => {
        const reqBody = {
            isVisible: true,
        };
        // we disable some lint to simplify some test
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockDbResponse = { acknowledged: false, matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedId: null as any };
        const toggleQuizVisibilityStub = Sinon.stub(dbService, 'toggleQuizVisibility').resolves(mockDbResponse);
        const response = await supertest(expressApp).patch('/api/quiz/quiz-examples/123').send(reqBody).expect(StatusCodes.NOT_FOUND);
        chai.expect(response.body).to.deep.equal({ message: 'Quiz not found' });
        toggleQuizVisibilityStub.restore();
    });

    it('should delete question successfully', async () => {
        Sinon.stub(dbService, 'deleteQuestion').resolves({ success: true, message: 'Question deleted successfully' });

        const response = await supertest(expressApp).delete('/api/quiz/questions').expect(StatusCodes.OK);
        chai.expect(response.status).to.equal(StatusCodes.OK);
        chai.expect(response.body).to.deep.equal('Question deleted successfully');
    });

    it('should fail for deleting the question when question is not found', async () => {
        Sinon.stub(dbService, 'deleteQuestion').resolves({ success: false, message: 'Question deleted failed' });

        const response = await supertest(expressApp).delete('/api/quiz/questions').expect(StatusCodes.NOT_FOUND);
        chai.expect(response.status).to.equal(StatusCodes.NOT_FOUND);
        chai.expect(response.body).to.deep.equal('Question deleted failed');
    });

    it('should delete the quiz (modifiedCount == 1)', async () => {
        const mockDbResponse = {
            acknowledged: true,
            deletedCount: 1,
            success: true,
            message: 'Quiz has been deleted successfully',
        };
        Sinon.stub(dbService, 'deleteQuiz').resolves(mockDbResponse);
        const response = await supertest(expressApp).delete('/api/quiz/quiz-examples/InvalidId').expect(StatusCodes.OK);
        chai.expect(response.status).to.equal(StatusCodes.OK);
        chai.expect(response.body).to.deep.equal({ message: 'Quiz has been deleted successfully' });
    });

    it('should return status code 500 when an error occurs during question deletion', async () => {
        const mockError = new Error('Mock error');

        Sinon.stub(dbService, 'deleteQuestion').rejects(mockError);
        return supertest(expressApp)
            .delete('/api/quiz/questions')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
            });
    });

    it('should save a quiz successfully', async () => {
        const mockReq = {
            body: { id: '1', name: 'Saved Quiz' },
        };

        Sinon.stub(dbService, 'saveQuiz').resolves();
        const response = await supertest(expressApp).post('/api/quiz/quiz-examples').send(mockReq.body).expect(StatusCodes.OK);
        chai.expect(response.status).to.equal(StatusCodes.OK);
        chai.expect(response.body).to.deep.equal(mockReq.body);
    });

    it('should handle error if saving quiz fails', async () => {
        const expectedError = new Error('Mock error');
        const mockReq = {
            body: { id: '1', name: 'Saved Quiz' },
        };

        Sinon.stub(dbService, 'saveQuiz').throws(expectedError);
        const response = await supertest(expressApp).post('/api/quiz/quiz-examples').send(mockReq.body).expect(StatusCodes.INTERNAL_SERVER_ERROR);
        chai.expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
        chai.expect(response.body).to.deep.equal({ title: 'Error', body: 'Error adding quiz' });
    });

    it('should save a random quiz successfully', async () => {
        const mockReq = {
            body: { id: '1', name: 'Saved Quiz' },
        };

        Sinon.stub(dbService, 'addRandomQuiz').resolves();
        const response = await supertest(expressApp).post('/api/quiz/quiz-examples/random-quiz').send(mockReq.body).expect(StatusCodes.OK);
        chai.expect(response.status).to.equal(StatusCodes.OK);
    });

    it('should handle error if saving random quiz fails', async () => {
        const expectedError = new Error('Mock error');
        const mockReq = {
            body: { id: '1', name: 'Saved Quiz' },
        };

        Sinon.stub(dbService, 'addRandomQuiz').throws(expectedError);
        const response = await supertest(expressApp)
            .post('/api/quiz/quiz-examples/random-quiz')
            .send(mockReq.body)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR);
        chai.expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
        chai.expect(response.body).to.deep.equal({ title: 'Error', body: 'Error adding quiz' });
    });

    it('should return the random quiz when it exists', async () => {
        Sinon.stub(dbService, 'randomQuiz').withArgs(id).resolves(quizWithId);
        return supertest(expressApp).get(`/api/quiz/quiz-examples/random-quiz/${id}`).expect(StatusCodes.OK);
    });

    it('should return 404 NOT FOUND for adding an invalid random quiz id', async () => {
        Sinon.stub(dbService, 'randomQuiz').withArgs(invalidId).resolves(null);
        return supertest(expressApp)
            .get(`/api/quiz/quiz-examples/random-quiz/${invalidId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                chai.expect(response.body).to.deep.equal({ message: 'Quiz not found' });
            });
    });

    it('should return status code 500 when an error occurs during random quiz selection', async () => {
        const mockError = new Error('Mock error');

        Sinon.stub(dbService, 'randomQuiz').rejects(mockError);
        return supertest(expressApp)
            .get('/api/quiz/quiz-examples/random-quiz/mockQuizId')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
                chai.expect(response.body).to.deep.equal({ title: 'Error', body: 'Error getting quiz data' });
            });
    });

    it('should delete the random quiz when it exists', async () => {
        const mockDbResponse = {
            acknowledged: true,
            deletedCount: 1,
            success: true,
            message: 'Quiz has been deleted successfully',
        };
        Sinon.stub(dbService, 'deleteRandomQuiz').withArgs(id).resolves(mockDbResponse);
        return supertest(expressApp).delete(`/api/quiz/quiz-examples/random-quiz/${id}`).expect(StatusCodes.OK);
    });

    it('should return 404 NOT FOUND for deleting an invalid random quiz id', async () => {
        Sinon.stub(dbService, 'deleteRandomQuiz').withArgs(invalidId).resolves(null);
        return supertest(expressApp)
            .delete(`/api/quiz/quiz-examples/random-quiz/${invalidId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                chai.expect(response.body).to.deep.equal({ message: 'Quiz not found' });
            });
    });

    it('should return status code 500 when an error occurs during random quiz deletion', async () => {
        const mockError = new Error('Mock error');

        Sinon.stub(dbService, 'deleteRandomQuiz').rejects(mockError);
        return supertest(expressApp)
            .delete('/api/quiz/quiz-examples/random-quiz/mockQuizId')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
                chai.expect(response.body).to.deep.equal({ title: 'Error', body: 'Error deleting quiz data' });
            });
    });

    it('should return game history sorted by provided parameters', async () => {
        const sortBy = 'time';
        const sortOrder = 'asc';
        Sinon.stub(dbService, 'getGameHistory').withArgs(sortBy, sortOrder).resolves([]);
        return supertest(expressApp)
            .get(`/api/quiz/game-history?sortBy=${sortBy}&sortOrder=${sortOrder}`)
            .expect(StatusCodes.OK)
            .then((response) => {
                chai.expect(response.body).to.deep.equal([]);
            });
    });

    it('should return status code message deleted successfully when game history is reset', async () => {
        Sinon.stub(dbService, 'resetGameHistory').resolves();
        return supertest(expressApp).delete('/api/quiz/game-history').expect(StatusCodes.OK);
    });

    it('should return status code 500 when an error occurs during game history reset', async () => {
        const mockError = new Error('Mock error');

        Sinon.stub(dbService, 'resetGameHistory').rejects(mockError);
        return supertest(expressApp)
            .delete('/api/quiz/game-history')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
            });
    });

    it('should return status code 500 when an error occurs during game history retrieval', async () => {
        const mockError = new Error('Mock error');

        Sinon.stub(dbService, 'getGameHistory').rejects(mockError);
        return supertest(expressApp)
            .get('/api/quiz/game-history?sortBy=time&sortOrder=asc')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                chai.expect(response.status).to.equal(StatusCodes.INTERNAL_SERVER_ERROR);
            });
    });
});
