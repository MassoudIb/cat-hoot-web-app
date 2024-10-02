import { Encoding } from 'crypto';
import * as fs from 'fs';
import { Db, Document, MongoClient, Sort } from 'mongodb';
import { Service } from 'typedi';
import { Question } from './../../../client/src/app/interfaces/question';
import { Quiz } from './../../../client/src/app/interfaces/quiz';
import { GameHistoryEntry } from './../../../client/src/app/interfaces/history';

@Service()
export class DatabaseService {
    client: MongoClient;
    db: Db;

    get questionsCollection() {
        return this.db.collection('Questions').find({}).toArray();
    }

    get quizzesCollection() {
        return this.db.collection('Quizzes').find({}).toArray();
    }

    get randomQuizzesCollection() {
        return this.db.collection('RandomQuizzes').find({}).toArray();
    }

    get titleOfQuizzes() {
        return this.db
            .collection('Quizzes')
            .find({}, { projection: { title: 1 } })
            .toArray();
    }

    async connectToServer(uri: string) {
        const TIMEOUT = 800000000;
        try {
            const connectPromise = new MongoClient(uri).connect();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Connection attempt timed out after ${TIMEOUT} milliseconds`));
                }, TIMEOUT);
            });
            this.client = (await Promise.race([connectPromise, timeoutPromise])) as MongoClient;
            this.db = this.client.db('Quizzes');
        } catch (err) {
            throw new Error('Failed to connect to MongoDb');
        }
    }

    async saveQuiz(quiz: Quiz) {
        const quizInDb = await this.findQuizById(quiz.id);
        if (quizInDb) {
            await this.editQuiz(quiz);
        } else {
            await this.addQuiz(JSON.stringify(quiz));
        }
    }

    async populateDb(collectionName: string, dataInput: string | object[]) {
        // The dataInput will always be a string. The second object array is only for testability
        // We didn't want to create unnecessary extra files only for the tests
        let data;
        if (typeof dataInput === 'string') {
            const fileContents = await this.readFile(dataInput, 'utf-8');
            data = JSON.parse(fileContents);
        } else {
            data = dataInput;
        }
        const collection = this.db.collection(collectionName);
        const nDocuments = await collection.countDocuments();
        if (nDocuments === 0) {
            await collection.insertMany(data);
        }
    }

    async readFile(path: string, encoding: Encoding) {
        return await fs.promises.readFile(path, { encoding });
    }

    async findQuizById(id: string) {
        const query = { id };
        return await this.db.collection('Quizzes').findOne(query);
    }
    async quiz(id: string): Promise<Quiz | null> {
        const query = { id };
        const quizDoc: Document | null = await this.db.collection('Quizzes').findOne(query);
        if (quizDoc) {
            const quiz: Quiz = {
                id: quizDoc.id.toString(),
                title: quizDoc.title,
                description: quizDoc.description,
                duration: quizDoc.duration,
                lastModification: quizDoc.lastModification,
                questions: quizDoc.questions,
            };

            return quiz;
        }

        return null;
    }

    async addQuestion(question: Question) {
        const collection = this.db.collection('Questions');
        const exists = await collection.findOne({ text: question.text });
        if (!exists) {
            await collection.insertOne(question);
            return { success: true, message: 'Question added successfully' };
        } else {
            return { success: false, message: 'Question already exists' };
        }
    }

    async updateQuestion(question: Question, questionUpdate: Question) {
        const collection = this.db.collection('Questions');
        const result = await collection.updateOne({ text: question.text }, { $set: questionUpdate });
        if (result.modifiedCount === 0) {
            return { success: false, message: 'No question found with the provided text' };
        } else {
            return { success: true, message: 'Question updated successfully' };
        }
    }

    async deleteQuestion(question: Question) {
        const collection = this.db.collection('Questions');
        const result = await collection.deleteOne({ text: question.text });
        if (result.deletedCount === 0) {
            return { success: false, message: 'No question found with the provided text' };
        } else {
            return { success: true, message: 'Question deleted successfully' };
        }
    }
    async toggleQuizVisibility(id: string, visibility: boolean) {
        const query = { id };
        const update = { $set: { isVisible: visibility } };
        return await this.db.collection('Quizzes').updateOne(query, update);
    }

    async deleteQuiz(id: string) {
        const query = { id };
        return await this.db.collection('Quizzes').deleteOne(query);
    }

    async addQuiz(quiz: string) {
        const collection = this.db.collection('Quizzes');
        await collection.insertOne(JSON.parse(quiz));
    }
    async editQuiz(quiz: Quiz): Promise<void> {
        const updateFields = {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            duration: quiz.duration,
            isVisible: quiz.isVisible,
            lastModification: quiz.lastModification,
            questions: quiz.questions,
        };
        const collection = this.db.collection('Quizzes');
        const editedGame = await collection.findOne({ id: quiz.id });
        if (editedGame) {
            await collection.updateOne({ id: quiz.id }, { $set: updateFields });
        } else {
            await collection.insertOne(updateFields);
        }
    }

    async addGameHistoryEntry(entry: GameHistoryEntry): Promise<void> {
        const collection = this.db.collection('gameHistory');
        await collection.insertOne(entry);
    }

    async getGameHistory(sortBy: string, sortOrder: 'asc' | 'desc'): Promise<GameHistoryEntry[]> {
        // We need to disable the eslint rule here because we need to dynamically set the sort options
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        const sortOptions: Sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        const collection = this.db.collection('gameHistory');
        return (await collection.find().sort(sortOptions).toArray()) as unknown as GameHistoryEntry[];
    }

    async resetGameHistory(): Promise<void> {
        const collection = this.db.collection('gameHistory');
        await collection.deleteMany({});
    }

    async deleteRandomQuiz(id: string) {
        const query = { id };
        return await this.db.collection('RandomQuizzes').deleteOne(query);
    }

    async addRandomQuiz(quiz: Quiz) {
        const collection = this.db.collection('RandomQuizzes');
        await collection.insertOne(quiz);
    }

    async randomQuiz(id: string): Promise<Quiz | null> {
        const query = { id };
        const quizDoc: Document | null = await this.db.collection('RandomQuizzes').findOne(query);
        if (quizDoc) {
            const quiz: Quiz = {
                id: quizDoc.id.toString(),
                title: quizDoc.title,
                description: quizDoc.description,
                duration: quizDoc.duration,
                lastModification: quizDoc.lastModification,
                questions: quizDoc.questions,
            };
            return quiz;
        }
        return null;
    }
}

export const dbService = new DatabaseService();

module.exports = { dbService };
