import * as statusCodes from '@app/constants/status-codes';
import { dbService } from '@app/services/database.service';
import { Message } from '@common/message';
import * as express from 'express';
import * as fs from 'fs';
import { Service } from 'typedi';
import { Choice } from './../../../client/src/app/interfaces/choice';
import { Quiz } from './../../../client/src/app/interfaces/quiz';
import { INTERNAL_SERVER_ERROR, NOT_FOUND } from './../constants/http-constant';

@Service()
export class QuizController {
    router: express.Router;

    constructor() {
        this.configureRouter();
    }

    private async validateAnswer(quizId: string, questionIndex: number, selectedAnswers: string[]): Promise<boolean> {
        let quiz: Quiz;
        const id = quizId.split('id=')[1];
        if (quizId.includes('randomQuiz')) quiz = await dbService.randomQuiz(id);
        else quiz = await dbService.quiz(quizId);

        if (quiz && quiz.questions[questionIndex]) {
            const correctAnswers: string[] = quiz.questions[questionIndex].choices
                .filter((choice: Choice) => choice.isCorrect)
                .map((choice: Choice) => choice.text);
            const isValid: boolean = this.arraysEqual(selectedAnswers, correctAnswers);
            return isValid;
        } else {
            return false;
        }
    }

    private arraysEqual(arr1: string[], arr2: string[]): boolean {
        if (arr1.length !== arr2.length) return false;

        const sortedArr1 = arr1.slice().sort();
        const sortedArr2 = arr2.slice().sort();

        for (let i = 0; i < sortedArr1.length; i++) {
            if (sortedArr1[i] !== sortedArr2[i]) return false;
        }
        return true;
    }

    private configureRouter(): void {
        this.router = express.Router();
        /**
         * @swagger
         * paths:
         *   /api/auth/verifyPassword:
         *     post:
         *       description: "Verify password"
         *       requestBody:
         *         required: true
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 password:
         *                   type: string
         *                   required: true
         *       responses:
         *         '200':
         *           description: "Password is correct"
         *         '403':
         *           description: "Password is incorrect"
         */

        this.router.post('/verifyPassword', async (req: express.Request, res: express.Response) => {
            const password = req.body.password;
            const adminPassword = 'log2990-210';
            if (password === adminPassword) {
                res.status(statusCodes.SUCCESS).json({ success: true });
            } else {
                res.status(statusCodes.FORBIDDEN).json({ success: false });
            }
        });

        /**
         * @swagger
         * /api/quiz/quiz-example:
         *   get:
         *     description: Get quiz example JSON
         *     responses:
         *       200:
         *         description: Quiz example data
         *       500:
         *         description: Internal server error
         */

        this.router.post('/validate-answer', async (req: express.Request, res: express.Response) => {
            try {
                const quizId = req.body.quizId;
                const questionIndex = req.body.questionIndex;
                const selectedAnswers: string[] = req.body.selectedAnswers;

                const isValid = await this.validateAnswer(quizId, questionIndex, selectedAnswers);

                res.json({ isValid });
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR).json({ isValid: false });
            }
        });

        this.router.get('/quiz-examples', async (req: express.Request, res: express.Response) => {
            try {
                const quizzes = await dbService.quizzesCollection;
                res.json(quizzes);
            } catch (parseErr) {
                const parseErrorMessage: Message = {
                    title: 'Error',
                    body: 'Error parsing quiz data',
                };
                res.status(INTERNAL_SERVER_ERROR).json(parseErrorMessage);
            }
        });

        this.router.get('/quiz-examples/:id', async (req: express.Request, res: express.Response) => {
            try {
                const quiz = await dbService.findQuizById(req.params.id);
                if (quiz) res.json(quiz);
                else res.status(NOT_FOUND).json({ message: 'Quiz not found' });
            } catch (parseErr) {
                const parseErrorMessage: Message = {
                    title: 'Error',
                    body: 'Error parsing quiz data',
                };
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json(parseErrorMessage);
            }
        });

        this.router.patch('/quiz-examples/:id', async (req: express.Request, res: express.Response) => {
            try {
                const modifiedQuiz = await dbService.toggleQuizVisibility(req.params.id, req.body.isVisible);
                if (modifiedQuiz.matchedCount === 0) {
                    res.status(statusCodes.NOT_FOUND).json({ message: 'Quiz not found' });
                }
                res.json({ message: 'Quiz visibility updated successfully' });
            } catch (parseErr) {
                const parseErrorMessage: Message = {
                    title: 'Error',
                    body: 'Error parsing quiz data',
                };
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json(parseErrorMessage);
            }
        });

        this.router.delete('/quiz-examples/:id', async (req: express.Request, res: express.Response) => {
            try {
                const deletedQuiz = await dbService.deleteQuiz(req.params.id);
                if (deletedQuiz.deletedCount !== 1) {
                    res.status(statusCodes.NOT_FOUND).json({ message: 'Quiz not found' });
                }
                res.json({ message: 'Quiz has been deleted successfully' });
            } catch (parseErr) {
                const parseErrorMessage: Message = {
                    title: 'Error',
                    body: 'Error parsing quiz data',
                };
                res.status(INTERNAL_SERVER_ERROR).json(parseErrorMessage);
            }
        });

        this.router.get('/question-examples', async (req: express.Request, res: express.Response) => {
            try {
                const quizzes = await dbService.questionsCollection;
                res.json(quizzes);
            } catch (parseErr) {
                const parseErrorMessage: Message = {
                    title: 'Error',
                    body: 'Error parsing quiz data',
                };
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json(parseErrorMessage);
            }
        });

        this.router.post('/questions', async (req, res) => {
            try {
                const result = await dbService.addQuestion(req.body);
                res.status(statusCodes.CREATED).json(result.message);
            } catch (error) {
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error adding question' });
            }
        });

        this.router.put('/questions', async (req, res) => {
            try {
                const { question, questionUpdate } = req.body;
                const result = await dbService.updateQuestion(question, questionUpdate);
                if (result) {
                    res.status(statusCodes.SUCCESS).json(result.message);
                } else {
                    res.status(statusCodes.NOT_FOUND).json(result);
                }
            } catch (error) {
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Error updating question' });
            }
        });

        this.router.delete('/questions', async (req, res) => {
            try {
                const result = await dbService.deleteQuestion(req.body);
                if (result.success) {
                    res.status(statusCodes.SUCCESS).json(result.message);
                } else {
                    res.status(statusCodes.NOT_FOUND).json(result.message);
                }
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR).json({ message: 'Error deleting question' });
            }
        });

        this.router.get('/quiz-example', (req: express.Request, res: express.Response) => {
            const filePath = './../server/assets/quiz-example.json';
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ title: 'Error', body: 'Error reading quiz data' });
                    return;
                }
                try {
                    const jsonData = JSON.parse(data);
                    res.json(jsonData);
                } catch (parseErr) {
                    const parseErrorMessage: Message = {
                        title: 'Error',
                        body: 'Error parsing quiz data',
                    };
                    res.status(INTERNAL_SERVER_ERROR).json(parseErrorMessage);
                }
            });
        });

        this.router.post('/quiz-examples', (req: express.Request, res: express.Response) => {
            const quiz = req.body;
            try {
                dbService.saveQuiz(quiz);
                res.json(quiz);
            } catch (parseErr) {
                const parseErrorMessage: Message = {
                    title: 'Error',
                    body: 'Error adding quiz',
                };
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json(parseErrorMessage);
            }
        });

        this.router.put('/quiz-examples', async (req: express.Request, res: express.Response) => {
            const quiz = req.body;
            try {
                await dbService.editQuiz(quiz);
                res.json(quiz);
            } catch (error) {
                const parseErrorMessage: Message = {
                    title: 'Error',
                    body: 'Error editing quiz',
                };
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json(parseErrorMessage);
            }
        });

        this.router.post('/quiz-examples/random-quiz', (req: express.Request, res: express.Response) => {
            const quiz = req.body;
            try {
                dbService.addRandomQuiz(quiz);
                res.json(quiz);
            } catch (parseErr) {
                const parseErrorMessage: Message = {
                    title: 'Error',
                    body: 'Error adding quiz',
                };
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json(parseErrorMessage);
            }
        });

        this.router.get('/quiz-examples/random-quiz/:id', async (req: express.Request, res: express.Response) => {
            try {
                const quiz = await dbService.randomQuiz(req.params.id);
                if (quiz) res.json(quiz);
                else res.status(NOT_FOUND).json({ message: 'Quiz not found' });
            } catch (parseErr) {
                const getErrorMessage: Message = {
                    title: 'Error',
                    body: 'Error getting quiz data',
                };
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json(getErrorMessage);
            }
        });

        this.router.delete('/quiz-examples/random-quiz/:id', async (req: express.Request, res: express.Response) => {
            try {
                const quiz = await dbService.deleteRandomQuiz(req.params.id);
                if (quiz) res.json(quiz);
                else res.status(NOT_FOUND).json({ message: 'Quiz not found' });
            } catch (parseErr) {
                const deleteErrorMessage: Message = {
                    title: 'Error',
                    body: 'Error deleting quiz data',
                };
                res.status(statusCodes.INTERNAL_SERVER_ERROR).json(deleteErrorMessage);
            }
        });

        this.router.get('/game-history', async (req: express.Request, res: express.Response) => {
            const { sortBy, sortOrder } = req.query;
            try {
                const history = await dbService.getGameHistory(sortBy as string, sortOrder as 'asc' | 'desc');
                res.json(history);
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR).json({ message: 'Error retrieving game history' });
            }
        });

        this.router.delete('/game-history', async (req: express.Request, res: express.Response) => {
            try {
                await dbService.resetGameHistory();
                res.json({ message: 'Historique supprimé avec succès' });
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR).json({ message: 'Erreur lors de la suppression de l historique' });
            }
        });
    }
}
