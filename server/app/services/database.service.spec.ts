/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disable some lint to simplify some test
import { assert, expect } from 'chai';
import { WithId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { GameHistoryEntry } from './../../../client/src/app/interfaces/history';
import { Question } from './../../../client/src/app/interfaces/question';
import { Quiz } from './../../../client/src/app/interfaces/quiz';
import { dbService } from './database.service';

describe('DatabaseServiceTests', () => {
    let mongoServer: MongoMemoryServer;
    let uri: string;
    const testQuizzes: Quiz[] = [
        { isVisible: false, id: '1', title: 'Test Quiz1', description: 'testing quiz1', duration: 10, lastModification: '2024-02-10', questions: [] },
        { isVisible: false, id: '2', title: 'Test Quiz2', description: 'testing quiz2', duration: 15, lastModification: '2024-02-11', questions: [] },
        { isVisible: false, id: '3', title: 'Test Quiz3', description: 'testing quiz3', duration: 20, lastModification: '2024-02-12', questions: [] },
    ];
    const newQuiz: Quiz[] = [
        {
            isVisible: false,
            id: '4',
            title: 'newTitle',
            description: 'testing quiz4',
            duration: 10,
            lastModification: '2024-02-10',
            questions: [],
        },
    ];
    const testQuestions: Question[] = [
        { type: 'QCM', text: 'question1', points: 10, choices: [], lastModified: '2024-02-10' },
        { type: 'QCM', text: 'question2', points: 15, choices: [], lastModified: '2024-02-11' },
        { type: 'QCM', text: 'question3', points: 20, choices: [], lastModified: '2024-02-12' },
    ];
    const historyEntries: GameHistoryEntry[] = [
        { quizName: 'Quiz 1', startTime: new Date('2024-01-01T12:00:00Z'), playerCount: 10, topScore: 250 },
        { quizName: 'Quiz 2', startTime: new Date('2024-01-02T12:00:00Z'), playerCount: 8, topScore: 300 },
    ];

    const assertQuizProperties = (actualQuiz: WithId<Quiz>, expectedQuiz: Quiz): void => {
        expect(actualQuiz.isVisible).to.equal(expectedQuiz.isVisible);
        expect(actualQuiz.id).to.equal(expectedQuiz.id);
        expect(actualQuiz.title).to.equal(expectedQuiz.title);
        expect(actualQuiz.description).to.equal(expectedQuiz.description);
        expect(actualQuiz.duration).to.equal(expectedQuiz.duration);
        expect(actualQuiz.lastModification).to.equal(expectedQuiz.lastModification);
    };

    const assertQuestionProperties = (actualQuestion: WithId<Question>, expectedQuestion: Question): void => {
        expect(actualQuestion.type).to.equal(expectedQuestion.type);
        expect(actualQuestion.text).to.equal(expectedQuestion.text);
        expect(actualQuestion.points).to.equal(expectedQuestion.points);
        expect(actualQuestion.lastModified).to.equal(expectedQuestion.lastModified);
    };

    beforeEach(async () => {
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        await dbService.connectToServer(uri);
    });

    afterEach(async () => {
        if (dbService.client) {
            await dbService.client.close();
        }
        await mongoServer.stop();
    });

    it('should connect to the database', async () => {
        expect(dbService.client).to.not.equal(undefined);
    });

    it('should update a quiz if the quiz passed in the parameters exists in the db', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        const modifiedQuiz: Quiz[] = [
            {
                isVisible: false,
                id: '1',
                title: 'modifiedTitle',
                description: 'testing quiz1',
                duration: 10,
                lastModification: '2024-02-10',
                questions: [],
            },
        ];
        await dbService.saveQuiz(modifiedQuiz[0]);
        const getQuizzes = await dbService.quizzesCollection;
        expect(getQuizzes).to.have.lengthOf(testQuizzes.length);
        expect(getQuizzes[0].title).to.not.equal(testQuizzes[0].title);
        assertQuizProperties(getQuizzes[0] as WithId<Quiz>, modifiedQuiz[0]);
    });

    it('should save a quiz if the quiz passed in the parameters doesnt exists in the db', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        await dbService.saveQuiz(newQuiz[0]);
        const getQuizzes = await dbService.quizzesCollection;
        expect(getQuizzes).to.have.lengthOf(testQuizzes.length + 1);
        assertQuizProperties(getQuizzes[3] as WithId<Quiz>, newQuiz[0]);
    });

    it('should insert and find quizzes using an array', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        const getQuizzes = await dbService.quizzesCollection;
        assertQuizProperties(getQuizzes[0] as WithId<Quiz>, testQuizzes[0]);
    });

    it('should insert and find quizzes using a string', async () => {
        await dbService.populateDb('Quizzes', './assets/quiz-examples.json');
        const getQuizzes = await dbService.quizzesCollection;
        expect(getQuizzes).to.have.lengthOf(3);
        expect(getQuizzes[0].isVisible).to.equal(false);
        expect(getQuizzes[0].id).to.equal('1a2b3c');
        expect(getQuizzes[0].title).to.equal('Questionnaire sur le JS');
        expect(getQuizzes[0].description).to.equal('Questions de pratique sur le langage JavaScript');
        expect(getQuizzes[0].duration).to.equal(60);
        expect(getQuizzes[0].lastModification).to.equal('2018-11-13T20:20:39+00:00');
    });

    it('should insert and find the quizzes title and put them in an array', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        const getQuizzesTitles = await dbService.titleOfQuizzes;
        expect(getQuizzesTitles).to.have.lengthOf(3);
        expect(getQuizzesTitles[0].title).to.equal(testQuizzes[0].title);
        expect(getQuizzesTitles[1].title).to.equal(testQuizzes[1].title);
        expect(getQuizzesTitles[2].title).to.equal(testQuizzes[2].title);
    });

    it('should insert and find questions', async () => {
        await dbService.populateDb('Questions', testQuestions);
        const getQuestions = await dbService.questionsCollection;
        expect(getQuestions).to.have.lengthOf(testQuestions.length);
        assertQuestionProperties(getQuestions[0] as WithId<Question>, testQuestions[0]);
    });

    it('should find a specific quiz using its id with getQuiz', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        const getQuiz = await dbService.quiz('2');
        expect(getQuiz).to.not.be.instanceof(Array);
        expect(getQuiz.id).to.equal(testQuizzes[1].id);
        expect(getQuiz.title).to.equal(testQuizzes[1].title);
        expect(getQuiz.description).to.equal(testQuizzes[1].description);
        expect(getQuiz.duration).to.equal(testQuizzes[1].duration);
        expect(getQuiz.lastModification).to.equal(testQuizzes[1].lastModification);
    });

    it('should handle the case where the id is invalid for getQuiz', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        const getQuiz = await dbService.quiz('4');
        expect(getQuiz).to.equal(null);
    });

    it('should find a specific quiz using its id with findQuizById', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        const getQuiz = await dbService.findQuizById('2');
        assertQuizProperties(getQuiz as WithId<Quiz>, testQuizzes[1]);
    });

    it('should handle the case where the id is invalid for findQuizById', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        const getQuiz = await dbService.quiz('4');
        expect(getQuiz).to.equal(null);
    });

    it('should not populate a collection if it isnt empty', async () => {
        const quiz1 = { id: '1', title: 'Test Quiz1' };
        const quiz2 = [{ id: '2', title: 'Test Quiz2' }];
        const quiz3 = [{ id: '2', title: 'Test Quiz3' }];
        await dbService.db.createCollection('testCollection');
        await dbService.db.collection('testCollection').insertOne(quiz1);
        await dbService.populateDb('Quizzes', quiz2);
        await dbService.populateDb('Quizzes', quiz3);
        const databaseCollection = await dbService.db.collection('testCollection').find({}).toArray();
        assert.equal([quiz1][0].id, databaseCollection[0].id);
        assert.equal([quiz1][0].title, databaseCollection[0].title);
        assert.equal(databaseCollection.length, 1);
    });

    it('should add a question if it doesnt already exist', async () => {
        const newQuestion: Question = { type: 'QCM', text: 'question4', points: 25, choices: [], lastModified: '2024-02-15' };
        await dbService.populateDb('Questions', testQuestions);
        const messageResult = await dbService.addQuestion(newQuestion);
        const getQuestions = await dbService.questionsCollection;
        expect(getQuestions).to.have.lengthOf(testQuestions.length + 1);
        assertQuestionProperties(getQuestions[3] as WithId<Question>, newQuestion);
        expect(messageResult).to.deep.equal({ success: true, message: 'Question added successfully' });
    });

    it('should not add a question if it already exist', async () => {
        const copiedQuestion: Question = { type: 'QCM', text: 'question1', points: 10, choices: [], lastModified: '2024-02-10' };
        await dbService.populateDb('Questions', testQuestions);
        const messageResult = await dbService.addQuestion(copiedQuestion);
        const getQuestions = await dbService.questionsCollection;
        expect(getQuestions).to.have.lengthOf(testQuestions.length);
        expect(messageResult).to.deep.equal({ success: false, message: 'Question already exists' });
    });

    it('should update a question if it already exist', async () => {
        const updatedQuestion: Question = { type: 'QCM', text: 'new text', points: 15, choices: [], lastModified: '2024-02-10' };
        await dbService.populateDb('Questions', testQuestions);
        const messageResult = await dbService.updateQuestion(testQuestions[0], updatedQuestion);
        const getQuestions = await dbService.questionsCollection;
        expect(getQuestions).to.have.lengthOf(testQuestions.length);
        assertQuestionProperties(getQuestions[0] as WithId<Question>, updatedQuestion);
        expect(messageResult).to.deep.equal({ success: true, message: 'Question updated successfully' });
    });

    it('should not update a question if it doesnt exist', async () => {
        const falseQuestion: Question = { type: 'QCM', text: 'false text', points: 15, choices: [], lastModified: '2024-02-10' };
        const updatedQuestion: Question = { type: 'QCM', text: 'new text', points: 15, choices: [], lastModified: '2024-02-10' };
        await dbService.populateDb('Questions', testQuestions);
        const messageResult = await dbService.updateQuestion(falseQuestion, updatedQuestion);
        const getQuestions = await dbService.questionsCollection;
        expect(getQuestions).to.have.lengthOf(testQuestions.length);
        assertQuestionProperties(getQuestions[0] as WithId<Question>, testQuestions[0]);
        assertQuestionProperties(getQuestions[1] as WithId<Question>, testQuestions[1]);
        assertQuestionProperties(getQuestions[2] as WithId<Question>, testQuestions[2]);
        expect(messageResult).to.deep.equal({ success: false, message: 'No question found with the provided text' });
    });

    it('should delete a question if it already exist', async () => {
        await dbService.populateDb('Questions', testQuestions);
        const messageResult = await dbService.deleteQuestion(testQuestions[0]);
        const getQuestions = await dbService.questionsCollection;
        expect(getQuestions).to.have.lengthOf(testQuestions.length - 1);
        assertQuestionProperties(getQuestions[0] as WithId<Question>, testQuestions[1]);
        expect(messageResult).to.deep.equal({ success: true, message: 'Question deleted successfully' });
    });

    it('should not delete a question if it doesnt exist', async () => {
        const falseQuestion: Question = { type: 'QCM', text: 'false text', points: 15, choices: [], lastModified: '2024-02-10' };
        await dbService.populateDb('Questions', testQuestions);
        const messageResult = await dbService.deleteQuestion(falseQuestion);
        const getQuestions = await dbService.questionsCollection;
        expect(getQuestions).to.have.lengthOf(testQuestions.length);
        assertQuestionProperties(getQuestions[0] as WithId<Question>, testQuestions[0]);
        assertQuestionProperties(getQuestions[1] as WithId<Question>, testQuestions[1]);
        assertQuestionProperties(getQuestions[2] as WithId<Question>, testQuestions[2]);
        expect(messageResult).to.deep.equal({ success: false, message: 'No question found with the provided text' });
    });

    it('should find a quizzes and change its isVisible attribute', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        await dbService.toggleQuizVisibility(testQuizzes[0].id, !testQuizzes[0].isVisible);
        const getQuizzes = await dbService.quizzesCollection;
        expect(getQuizzes).to.have.lengthOf(testQuizzes.length);
        expect(getQuizzes[0].isVisible).to.equal(!testQuizzes[0].isVisible);
    });

    it('should delete a quiz if it exists', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        await dbService.deleteQuiz(testQuizzes[0].id);
        const getQuizzes = await dbService.quizzesCollection;
        expect(getQuizzes).to.have.lengthOf(testQuizzes.length - 1);
        await dbService.deleteQuiz(testQuizzes[1].id);
        const getQuizzes2 = await dbService.quizzesCollection;
        expect(getQuizzes2).to.have.lengthOf(testQuizzes.length - 2);
    });

    it('should add a new quiz if the edited quiz was deleted while it was being edited', async () => {
        await dbService.populateDb('Quizzes', testQuizzes);
        await dbService.editQuiz(newQuiz[0]);
        const getQuizzes = await dbService.quizzesCollection;
        expect(getQuizzes).to.have.lengthOf(testQuizzes.length + 1);
    });

    it('should save a random quiz', async () => {
        await dbService.populateDb('RandomQuizzes', testQuizzes);
        await dbService.addRandomQuiz(newQuiz[0]);
        const getQuizzes = await dbService.randomQuizzesCollection;
        expect(getQuizzes).to.have.lengthOf(testQuizzes.length + 1);
        assertQuizProperties(getQuizzes[3] as WithId<Quiz>, newQuiz[0]);
    });

    it('should delete a random quiz if it exists', async () => {
        await dbService.populateDb('RandomQuizzes', testQuizzes);
        await dbService.deleteRandomQuiz(testQuizzes[0].id);
        const getQuizzes = await dbService.randomQuizzesCollection;
        expect(getQuizzes).to.have.lengthOf(testQuizzes.length - 1);
        await dbService.deleteRandomQuiz(testQuizzes[1].id);
        const getQuizzes2 = await dbService.randomQuizzesCollection;
        expect(getQuizzes2).to.have.lengthOf(testQuizzes.length - 2);
    });

    it('should find a random quiz using its id with randomQuiz', async () => {
        await dbService.populateDb('RandomQuizzes', testQuizzes);
        const getQuiz = await dbService.randomQuiz('1');
        expect(getQuiz).to.not.be.instanceof(Array);
        expect(getQuiz.id).to.equal(testQuizzes[0].id);
        expect(getQuiz.title).to.equal(testQuizzes[0].title);
        expect(getQuiz.description).to.equal(testQuizzes[0].description);
        expect(getQuiz.duration).to.equal(testQuizzes[0].duration);
        expect(getQuiz.lastModification).to.equal(testQuizzes[0].lastModification);
    });

    it('should handle the case where the id is invalid for randomQuiz', async () => {
        await dbService.populateDb('RandomQuizzes', testQuizzes);
        const getQuiz = await dbService.randomQuiz('7');
        expect(getQuiz).to.equal(null);
    });

    it('should retrieve sorted game history entries by startTime', async () => {
        await dbService.populateDb('gameHistory', historyEntries);
        const results = await dbService.getGameHistory('startTime', 'asc');
        expect(results.length).to.equal(2);
        expect(results[0].quizName).to.equal('Quiz 1');
        expect(results[1].quizName).to.equal('Quiz 2');
    });

    it('should delete all game history entries', async () => {
        await dbService.resetGameHistory();
        const collection = dbService.db.collection('gameHistory');
        const count = await collection.countDocuments();
        expect(count).to.equal(0);
    });
});
