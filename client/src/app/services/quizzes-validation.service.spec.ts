/* eslint-disable max-lines */
// we disable some lint to simplify some test
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable } from 'rxjs';
import { Answer, Quiz } from './../interfaces/quiz';
import { QuizzesValidationService } from './quizzes-validation.service';

const testQuizQCM: Quiz = {
    isVisible: false,
    id: '3f0d12a4-17d3-4c43-822c-0684d3f88a3f',
    title: 'Example Quiz',
    description: 'This is an example quiz',
    duration: 30,
    lastModification: '2024-02-11T16:35:37.527Z',
    questions: [
        {
            text: 'Question 1',
            type: 'QCM',
            points: 10,
            lastModified: '',
            choices: [
                { text: 'Choice 1', isCorrect: true },
                { text: 'Choice 2', isCorrect: false },
                { text: 'Choice 3', isCorrect: false },
            ],
        },
    ],
};

const testQuizQRL: Quiz = {
    isVisible: false,
    id: '3f0d12a4-17d3-4c43-822c-0684d3f88a3f',
    title: 'Example Quiz',
    description: 'This is an example quiz',
    duration: 30,
    lastModification: '2024-02-11T16:35:37.527Z',
    questions: [
        {
            text: 'Question 1',
            type: 'QRL',
            points: 10,
            lastModified: '',
            choices: [{ text: 'Choice 1', isCorrect: true }],
        },
    ],
};
const extraAttributeQuiz: Quiz & { extraAttribute?: string } = {
    id: '1',
    title: 'Quiz 1',
    description: 'Test quiz 1',
    duration: 10,
    isVisible: true,
    lastModification: '2024-01-30',
    questions: [],
    extraAttribute: 'Am extra',
};
describe('QuizzesValidationService', () => {
    let quizzesValidationService: QuizzesValidationService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [QuizzesValidationService],
            imports: [RouterTestingModule, HttpClientTestingModule],
        });
        quizzesValidationService = TestBed.inject(QuizzesValidationService);
    });
    it('should be created', () => {
        expect(quizzesValidationService).toBeTruthy();
    });

    it('should return a quiz without non recognized attributes', () => {
        const filteredQuiz = quizzesValidationService.filterQuiz(extraAttributeQuiz);
        expect(filteredQuiz).toEqual({
            id: '1',
            title: 'Quiz 1',
            description: 'Test quiz 1',
            duration: 10,
            isVisible: false,
            lastModification: '2024-01-30',
            questions: [],
        });
    });
    it('should return true when all required fields are present and valid', () => {
        const isValid = quizzesValidationService.isQuizValid({
            isVisible: false,
            id: '3f0d12a4-17d3-4c43-822c-0684d3f88a3f',
            title: 'Example Quiz',
            description: 'This is an example quiz',
            duration: 30,
            lastModification: '2024-02-11T16:35:37.527Z',
            questions: [
                {
                    text: 'Question 1',
                    type: 'QCM',
                    points: 10,
                    lastModified: '',
                    choices: [
                        { text: 'Choice 1', isCorrect: true },
                        { text: 'Choice 2', isCorrect: false },
                        { text: 'Choice 3', isCorrect: false },
                    ],
                },
            ],
        });
        expect(isValid).toBe(true);
    });

    it('should set duplicateTitle, isDuplicateTitle, and errorMessage when title is not unique', () => {
        const quiz: Quiz = {
            id: '1',
            title: 'Math Quiz',
            description: 'Test your math skills',
            duration: 30,
            lastModification: '2021-10-01',
            questions: [
                {
                    text: 'Question 1',
                    type: 'QCM',
                    points: 10,
                    lastModified: '',
                    choices: [
                        { text: 'Choice 1', isCorrect: true },
                        { text: 'Choice 2', isCorrect: false },
                        { text: 'Choice 3', isCorrect: false },
                    ],
                },
            ],
        };

        spyOn(quizzesValidationService, 'uniqueTitle').and.callFake(() => {
            quizzesValidationService.isTitleUnique = false;
        });
        const result = quizzesValidationService.isQuizValid(quiz);
        expect(result).toBe(false);
        expect(quizzesValidationService.duplicateTitle).toEqual(quiz.title);
        expect(quizzesValidationService.isDuplicateTitle).toBe(true);
        expect(quizzesValidationService.errorMessage).toEqual('Le quiz doit avoir un titre unique');
    });

    it('should return false when title is missing', () => {
        const quiz = {
            id: '1',
            duration: 30,
            lastModification: '2021-10-01',
            description: 'Test your math skills',
            questions: [],
        } as unknown as Quiz;
        const isValid = quizzesValidationService.isQuizValid(quiz);
        expect(isValid).toBe(false);
        expect(quizzesValidationService.errorMessage).toEqual('Le quiz doit avoir un titre');
    });
    it('should return false when all answers to a question are true or false', () => {
        const quiz = testQuizQCM;
        quiz.questions[0].choices[0].isCorrect = true;
        quiz.questions[0].choices[1].isCorrect = true;
        quiz.questions[0].choices[2].isCorrect = true;
        const isValid = quizzesValidationService.areQuestionsValid(quiz);
        expect(isValid).toBe(false);
        expect(quizzesValidationService.errorMessage).toEqual('Une question de type QCM ne doit pas posséder des choix seulement vrai ou faux');
        quiz.questions[0].choices[0].isCorrect = false;
    });

    it('should return an Observable of type Answer when given valid quizId, questionIndex, and selectedAnswers', () => {
        const quizId = 'quizId';
        const questionIndex = 0;
        const selectedAnswers = ['validAnswer1', 'validAnswer2'];
        const result = quizzesValidationService.validateAnswer(quizId, questionIndex, selectedAnswers);
        expect(result).toBeInstanceOf(Observable);
        expect(result).toEqual(jasmine.any(Observable));
        expect(result).toEqual(jasmine.any(Observable<Answer>));
    });

    it('should return false when description is missing', () => {
        const quiz = {
            id: '1',
            title: 'Math Quiz',
            duration: 30,
            lastModification: '2021-10-01',
            questions: [],
        } as unknown as Quiz;
        const isValid = quizzesValidationService.isQuizValid(quiz);
        expect(isValid).toBe(false);
        expect(quizzesValidationService.errorMessage).toEqual('Le quiz doit avoir une description');
    });
    it('should return false when duration is missing', () => {
        const quiz = {
            id: '1',
            title: 'Math Quiz',
            description: 'Test your math skills',
            lastModification: '2021-10-01',
            questions: [],
        } as unknown as Quiz;
        const isValid = quizzesValidationService.isQuizValid(quiz);
        expect(isValid).toBe(false);
        expect(quizzesValidationService.errorMessage).toEqual('Le quiz doit avoir une durée déterminée');
    });
    it('should return false when questions are missing', () => {
        const quiz = {
            id: '1',
            title: 'Math Quiz',
            description: 'Test your math skills',
            duration: 30,
            lastModification: '2021-10-01',
            questions: [],
        } as unknown as Quiz;
        const isValid = quizzesValidationService.isQuizValid(quiz);
        expect(isValid).toBe(false);
        expect(quizzesValidationService.errorMessage).toEqual('Le quiz doit avoir au moins une question');
    });
    it('should return false when the question type is neither QCM nor QRL', () => {
        const quiz = {
            questions: [
                {
                    text: 'What is 2 + 2?',
                    points: 10,
                    type: 'invalid type',
                    choices: [{ text: '3', isCorrect: false }],
                },
            ],
        } as unknown as Quiz;
        const isValid = quizzesValidationService.areQuestionsValid(quiz);
        expect(isValid).toBe(false);
        expect(quizzesValidationService.errorMessage).toEqual('Une question (ou plusieurs) doit être de type QRL ou QCM');
    });
    it('should return false when duration is under 0', () => {
        const quiz = testQuizQCM;
        quiz.duration = -1;
        const isValid = quizzesValidationService.isQuizValid(quiz);
        expect(isValid).toBe(false);
    });
    it('should return false when a question has less than 2 choices', () => {
        const quiz = {
            id: '1',
            title: 'Math Quiz',
            description: 'Test your math skills',
            duration: 10,
            lastModification: '2021-10-01',
            questions: [
                {
                    text: 'What is 2 + 2?',
                    points: 10,
                    type: 'QCM',
                    choices: [{ text: '3', isCorrect: false }],
                },
            ],
        } as unknown as Quiz;
        const isValid = quizzesValidationService.isQuizValid(quiz);
        expect(isValid).toBe(false);
    });
    it('should return false if points are missing', () => {
        const quiz = {
            questions: [
                {
                    text: 'What is 2 + 2?',
                    type: 'QCM',
                    choices: [{ text: '3', isCorrect: false }],
                },
            ],
        } as unknown as Quiz;
        expect(quizzesValidationService.areQuestionsValid(quiz)).toEqual(false);
    });

    it('should return false if points are negative', () => {
        const quiz = {
            questions: [
                {
                    text: 'What is 2 + 2?',
                    points: -10,
                    type: 'QCM',
                    choices: [{ text: '3', isCorrect: false }],
                },
            ],
        } as unknown as Quiz;
        expect(quizzesValidationService.areQuestionsValid(quiz)).toEqual(false);
    });
    it('should return false when text is missing', () => {
        const quiz = {
            questions: [
                {
                    points: 10,
                    type: 'QCM',
                    choices: [{ text: '3', isCorrect: false }],
                },
            ],
        } as unknown as Quiz;
        expect(quizzesValidationService.areQuestionsValid(quiz)).toBe(false);
        expect(quizzesValidationService.areQuestionsValid(quiz)).toBe(false);
    });
    it('should return false if the choices are missing', () => {
        const quiz = {
            questions: [
                {
                    text: 'What is 2 + 2?',
                    points: 10,
                    type: 'QCM',
                    choices: [{ isCorrect: false }],
                },
            ],
        } as unknown as Quiz;
        expect(quizzesValidationService.isChoiceValid(quiz.questions[0].choices[0])).toBe(false);
        expect(quizzesValidationService.errorMessage).toEqual('The choice must contain a text');
    });

    it('should return false when a question (QRL) contains choices', () => {
        const quiz = testQuizQRL;
        expect(quizzesValidationService.areQuestionsValid(quiz)).toBe(false);
        expect(quizzesValidationService.errorMessage).toEqual('Une question de type QRL (ou plusieurs) ne doit pas avoir des choix de réponse');
    });
});
