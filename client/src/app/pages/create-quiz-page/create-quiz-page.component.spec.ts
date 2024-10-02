/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable max-lines */
// we disable some lint to simplify some test
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { QuestionBankModalComponent } from '@app/components/question-bank-modal/question-bank-modal.component';
import { QuestionType } from '@app/constants/question-type';
import { Choice } from '@app/interfaces/choice';
import { Question } from '@app/interfaces/question';
import { QuizzesModificationService } from '@app/services/quizzes-modification.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { QuizzesValidationService } from '@app/services/quizzes-validation.service';
import { Subscription, of, throwError } from 'rxjs';
import { CreateQuizPageComponent } from './create-quiz-page.component';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('CreateQuizPageComponent', () => {
    let component: CreateQuizPageComponent;
    let fixture: ComponentFixture<CreateQuizPageComponent>;
    let dialogRefSpy: jasmine.SpyObj<MatDialog>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let formBuilder: FormBuilder;
    let matSnackBarMock: jasmine.SpyObj<MatSnackBar>;

    const mockQuiz = {
        id: '1',
        title: 'Sample Quiz',
        duration: 30,
        description: 'A sample quiz description',
        questions: [{ text: 'Question 1', points: 10, choices: [{ text: 'Choice 1', isCorrect: true }] }],
    };

    const quizzesModificationServiceMock = {
        saveNewQuiz: jasmine.createSpy('saveNewQuiz').and.returnValue(of(true)),
        saveEditedQuiz: jasmine.createSpy('saveEditedQuiz').and.returnValue(of(true)),
        addQuestion: jasmine.createSpy('addQuestion').and.returnValue(of('Question added successfully')),
        ngOnInit: jasmine.createSpy('ngOnInit'),
        isDuplicateTitle: false,
        duplicateTitle: '',
    };
    const quizzesRequestServiceMock = {
        getQuizzes: jasmine.createSpy('getQuizzes').and.returnValue(of([])),
        getQuestions: jasmine.createSpy('getQuestions').and.returnValue(of([{ id: '1', text: 'Sample Question 1', choices: [], points: 10 }])),
        ngOnInit: jasmine.createSpy('ngOnInit'),
        isDuplicateTitle: false,
        duplicateTitle: '',
    };
    const quizzesValidationServiceMock = {
        isQuizValid: jasmine.createSpy('isQuizValid').and.returnValue(true),
        ngOnInit: jasmine.createSpy('ngOnInit'),
        isDuplicateTitle: false,
        duplicateTitle: '',
    };

    beforeEach(async () => {
        dialogRefSpy = jasmine.createSpyObj('MatDialog', ['closeAll', 'afterClosed', 'close']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        matSnackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);
        await TestBed.configureTestingModule({
            declarations: [CreateQuizPageComponent],
            providers: [
                { provide: MatDialog, useValue: dialogSpy },
                { provide: QuizzesModificationService, useValue: quizzesModificationServiceMock },
                { provide: QuizzesRequestService, useValue: quizzesRequestServiceMock },
                { provide: QuizzesValidationService, useValue: quizzesValidationServiceMock },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: { quiz: mockQuiz } },
                { provide: MatSnackBar, useValue: matSnackBarMock },
                FormBuilder,
            ],
            imports: [ReactiveFormsModule, MatDialogModule, NoopAnimationsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateQuizPageComponent);
        formBuilder = TestBed.inject(FormBuilder);
        component = fixture.componentInstance;
        component.quizForm = formBuilder.group({
            duration: ['', []],
        });
        const questions = [{ id: '1', text: 'Sample Question 1', choices: [], points: 10 }];
        quizzesRequestServiceMock.getQuestions.and.returnValue(of(questions));
        fixture.detectChanges();
    });

    afterEach(() => {
        dialogRefSpy.closeAll.calls.reset();
    });

    it('should create a form with the correct initial state', () => {
        expect(component.quizForm).toBeTruthy();
        expect(component.quizForm.get('title')).toBeTruthy();
        expect(component.quizForm.get('description')).toBeTruthy();
        expect(component.quizForm.get('duration')).toBeTruthy();
        expect(component.quizForm.get('questions')).toBeTruthy();
        expect(component.quizForm.get('questions')?.value.length).toBe(1);
        expect(component.quizForm.get('questions')?.value[0].text).toBe('Question 1');
        expect(component.quizForm.get('questions')?.value[0].points).toBe(10);
        expect(component.quizForm.get('questions')?.value[0].choices.length).toBe(0);
    });

    it('should add a question to the form', () => {
        expect(component.questions.controls.length).toBe(1);
        const questionGroup = component.questions.at(0) as FormGroup;
        expect(questionGroup.get('text')).toBeTruthy();
        expect(questionGroup.get('points')).toBeTruthy();
        component.addAnswerChoice(0);

        const answerChoices = questionGroup.get('choices') as FormArray;
        if (answerChoices) {
            expect(answerChoices.controls.length).toBe(1);
        }
    });
    it('should delete a question from the form', () => {
        component.addQuestion();
        expect(component.questions.controls.length).toBe(2);
        component.deleteQuestion(0);
        expect(component.questions.controls.length).toBe(1);
    });

    it('should add and delete an answer choice for a question', () => {
        component.addQuestion();
        const questionIndex = 0;
        component.addAnswerChoice(questionIndex);
        component.addAnswerChoice(questionIndex);
        component.addAnswerChoice(questionIndex);

        const questionGroup = component.questions.at(questionIndex) as FormGroup;
        const answerChoices = questionGroup.get('choices') as FormArray;
        expect(answerChoices.controls.length).toBe(3);
        component.deleteAnswerChoice(questionGroup, 2);
        expect(answerChoices.controls.length).toBe(2);
    });

    it('should have the first element as 10 and the last element as 100 and a length of 10', () => {
        component.generatePointsOptions();
        expect(component.pointsOptions[0]).toBe(10);
        expect(component.pointsOptions[component.pointsOptions.length - 1]).toBe(100);
        expect(component.pointsOptions.length).toBe(10);
    });

    it('should return true when the control value is included in the arrayTitle, otherwise null', () => {
        component.arrayTitle = ['title1', 'title2', 'title3'];
        const controlNull = { value: 'title4' };
        const resultNull = component.validateTitle('')(controlNull as AbstractControl);
        expect(resultNull).toBeNull();
        component.arrayTitle = [];
    });

    it('should return true when the tittle exist, otherwise null', () => {
        quizzesValidationServiceMock.isDuplicateTitle = true;
        quizzesValidationServiceMock.duplicateTitle = 'title1';
        const controlDuplicatedTitle = { value: 'title1' };
        const controlNull = { value: 'title4' };
        const resultTrue = component.validateTitle('title1')(controlDuplicatedTitle as AbstractControl);
        expect(resultTrue).toEqual({ titleExists: true });
        const resultNull = component.validateTitle('title1')(controlNull as AbstractControl);
        expect(resultNull).toBeNull();
        component.arrayTitle = [];
    });

    it('should return title exist when control value is included in arrayTitle and control value is not equal to title', () => {
        component.arrayTitle = ['title1', 'title2', 'title3'];
        quizzesValidationServiceMock.isDuplicateTitle = false;
        quizzesValidationServiceMock.duplicateTitle = '';
        const control = { value: 'title2' };
        const title = 'title1';
        const result = component.validateTitle(title)(control as AbstractControl);
        expect(result).toEqual({ titleExists: true });
        component.arrayTitle = [];
    });

    it('should update the value of isCorrect control to its opposite when toggling a choice', () => {
        component.addQuestion();
        const questionIndex = 0;
        const initialIsCorrectValue = false;
        const question = component.questions.at(questionIndex) as FormGroup;
        const choices = question.get('choices') as FormArray;
        choices.push(component.initAnswerChoice(initialIsCorrectValue));
        component.toggleChoice(questionIndex, 0);
        const updatedChoice = choices.at(0) as FormGroup;
        const updatedIsCorrectValue = updatedChoice?.get('isCorrect')?.value;
        expect(updatedIsCorrectValue).toBe(true);
    });

    it('should return null when there is at least one correct answer and one incorrect answer', () => {
        const formArray = new FormArray([
            new FormControl({ text: 'Answer 1', isCorrect: true }),
            new FormControl({ text: 'Answer 2', isCorrect: false }),
            new FormControl({ text: 'Answer 3', isCorrect: false }),
        ]);

        const validationErrors = component.validateAnswerChoices(formArray);
        expect(validationErrors).toBeNull();
    });

    it('should return an error when all answers are correct and there is no incorrect answer', () => {
        const formArray = new FormArray([
            new FormControl({ text: 'Answer 1', isCorrect: true }),
            new FormControl({ text: 'Answer 2', isCorrect: true }),
            new FormControl({ text: 'Answer 3', isCorrect: true }),
        ]);

        const validationErrors = component.validateAnswerChoices(formArray);
        expect(validationErrors).toEqual({ correctIncorrect: 'Chaque question requiert au moins une réponse correcte et une réponse incorrecte.' });
    });

    it('should return an error when there are duplicated choices', () => {
        const formArray = new FormArray([
            new FormControl({ text: 'Answer 1', isCorrect: true }),
            new FormControl({ text: 'Answer 1', isCorrect: false }),
        ]);

        const validationErrors = component.validateAnswerChoices(formArray);
        expect(validationErrors).toEqual({ correctIncorrect: 'Vous ne pouvez pas avoir des choix dupliqués' });
    });

    it('should create answer choices with correct values', () => {
        const answerChoices = component.createAnswerChoices();
        expect(answerChoices.length).toBe(2);
        expect(answerChoices[0].value).toEqual({
            text: 'True',
            isCorrect: 'true',
        });
        expect(answerChoices[1].value).toEqual({
            text: 'False',
            isCorrect: 'false',
        });
    });

    it('should not return an error for the original title in edit mode', () => {
        component.arrayTitle = ['existing title', 'another title'];
        const validatorFn = component.validateTitle('existing title');
        const control = new FormControl('existing title');
        expect(validatorFn(control)).toBeNull();
    });

    it('should call updateValueAndValidity on the duration control when validateTime is called', () => {
        const durationControl = component.quizForm.get('duration');
        if (durationControl) {
            spyOn(durationControl, 'updateValueAndValidity');
            component.validateTime();
            expect(durationControl.updateValueAndValidity).toHaveBeenCalled();
        } else {
            fail('Duration control does not exist');
        }
    });

    it('should populate the form with quiz data', () => {
        component.populateForm(mockQuiz);
        expect(component.quizForm.value.id).toBe(mockQuiz.id);
        expect(component.quizForm.value.title).toBe(mockQuiz.title);
        expect(component.quizForm.value.duration).toBe(mockQuiz.duration);
        expect(component.quizForm.value.description).toBe(mockQuiz.description);
        const questionsValue = component.quizForm.get('questions')?.value;
        if (questionsValue) {
            expect(questionsValue.length).toBe(mockQuiz.questions.length);

            mockQuiz.questions.forEach((question, index) => {
                const formQuestion = questionsValue[index];
                expect(formQuestion.text).toEqual(question.text);
                expect(formQuestion.points).toEqual(question.points);
            });
        }
    });

    it('should move the first question down', () => {
        component.addQuestion();
        component.addQuestion();
        component.addQuestion();
        const initialFirstQuestion = component.questions.at(0).value;
        component.moveQuestionDown(0, new Event('click'));
        const newSecondQuestion = component.questions.at(1).value;
        expect(newSecondQuestion).toEqual(initialFirstQuestion);
    });

    it('should move the second question up', () => {
        component.addQuestion();
        component.addQuestion();
        component.addQuestion();
        const initialSecondQuestion = component.questions.at(1).value;
        component.moveQuestionUp(1, new Event('click'));
        const newFirstQuestion = component.questions.at(0).value;
        expect(newFirstQuestion).toEqual(initialSecondQuestion);
    });

    it('should move the second choice up within a question', () => {
        component.addQuestion();
        const questionIndex = 0;
        component.addAnswerChoice(questionIndex);
        component.addAnswerChoice(questionIndex);
        const initialSecondChoice = component.getAnswerChoices(component.questions.at(questionIndex)).at(1).value;
        const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') };
        component.moveChoiceUp(questionIndex, 1, mockEvent as unknown as Event);
        const newSecondChoice = component.getAnswerChoices(component.questions.at(questionIndex)).at(0).value;
        expect(newSecondChoice).toEqual(initialSecondChoice);
    });

    it('should move the second choice down within a question', () => {
        component.addQuestion();
        const questionIndex = 0;
        component.addAnswerChoice(questionIndex);
        component.addAnswerChoice(questionIndex);
        component.addAnswerChoice(questionIndex);
        const initialSecondChoice = component.getAnswerChoices(component.questions.at(questionIndex)).at(1).value;
        const initialThirdChoice = component.getAnswerChoices(component.questions.at(questionIndex)).at(2).value;
        const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') };
        component.moveChoiceDown(questionIndex, 1, mockEvent as unknown as Event);
        const newSecondChoice = component.getAnswerChoices(component.questions.at(questionIndex)).at(2).value;
        const newThirdChoice = component.getAnswerChoices(component.questions.at(questionIndex)).at(1).value;
        expect(newSecondChoice).toEqual(initialSecondChoice);
        expect(newThirdChoice).toEqual(initialThirdChoice);
    });

    it('should update the order of answer choices in the form array', () => {
        component.addQuestion();
        const questionIndex = 0;
        component.addAnswerChoice(questionIndex);
        component.addAnswerChoice(questionIndex);
        component.addAnswerChoice(questionIndex);
        component.addAnswerChoice(questionIndex);

        const answerChoices = component.getAnswerChoices(component.questions.at(questionIndex));
        const initialOrder = answerChoices.value;
        const mockEvent = { stopPropagation: jasmine.createSpy() };
        component.moveChoiceUp(questionIndex, 1, mockEvent as unknown as Event);
        const newOrder = answerChoices.value;
        expect(newOrder).toEqual([initialOrder[1], initialOrder[0], initialOrder[2], initialOrder[3]]);
    });

    it('should not allow more than 4 answer choices per question', () => {
        component.addQuestion();
        const questionIndex = 0;

        for (let i = 0; i < 4; i++) {
            component.addAnswerChoice(questionIndex);
        }

        component.addAnswerChoice(questionIndex);
        expect(component.showErrorMaxChoices[questionIndex]).toBeTrue();
    });
    it('should not add a question when the maximum number of questions has been reached', () => {
        for (let i = 0; i < 4; i++) {
            component.addQuestion();
        }
        expect(component.questions.controls.length).toBe(5);
    });

    it('should unsubscribe from questionSubscription when it exists', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyComponent = component as any;
        const unsubscribeSpy = spyOn(Subscription.prototype, 'unsubscribe').and.callThrough();
        anyComponent.questionSubscription = new Subscription();
        component.ngOnDestroy();
        expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should open dialog window and update form with selected question', () => {
        const mockSelectedQuestion = {
            text: 'Sample Question',
            points: 10,
            type: null,
        };
        dialogSpy.open.and.returnValue({
            afterClosed: () => of(mockSelectedQuestion),
        } as MatDialogRef<typeof component>);

        component.importQuestion(0);

        expect(dialogSpy.open).toHaveBeenCalledWith(QuestionBankModalComponent, {
            width: '600px',
            data: { questions: component.questionsFromBank },
        });
        fixture.detectChanges();
        expect(component.questions.controls[0].value).toEqual(mockSelectedQuestion);
    });

    it('should display success alert when question is added successfully', () => {
        const mockSelectedQuestion = {
            text: 'Sample Question',
            points: 10,
            choices: [{ text: 'Choice 1', isCorrect: true }],
            type: 'QCM',
            lastModified: '',
        };
        component.questions.push(formBuilder.group(mockSelectedQuestion));
        quizzesModificationServiceMock.addQuestion.and.returnValue(of('Question added successfully'));

        component.exportQuestion(1);

        expect(quizzesModificationServiceMock.addQuestion).toHaveBeenCalled();
        expect(matSnackBarMock.open).toHaveBeenCalled();
    });

    it('should display already exists alert when question already exists', () => {
        const mockSelectedQuestion = {
            text: 'Sample Question',
            points: 10,
            choices: [{ text: 'Choice 1', isCorrect: true }],
            type: 'QCM',
            lastModified: '',
        };
        component.questions.push(formBuilder.group(mockSelectedQuestion));
        quizzesModificationServiceMock.addQuestion.and.returnValue(of('Question already exists'));
        component.exportQuestion(1);

        expect(quizzesModificationServiceMock.addQuestion).toHaveBeenCalled();
        expect(matSnackBarMock.open).toHaveBeenCalled();
    });

    it('should handle HTTP error response', () => {
        const mockSelectedQuestion = {
            text: 'Sample Question',
            points: 10,
            choices: [{ text: 'Choice 1', isCorrect: true }],
            type: 'QCM',
            lastModified: '',
        };
        component.questions.push(formBuilder.group(mockSelectedQuestion));
        const errorResponse = new ErrorEvent('Network error', {
            message: 'An error occurred while adding the question',
        });
        quizzesModificationServiceMock.addQuestion.and.returnValue(throwError(() => ({ error: errorResponse })));

        component.exportQuestion(1);

        expect(quizzesModificationServiceMock.addQuestion).toHaveBeenCalled();
        expect(matSnackBarMock.open).toHaveBeenCalled();
    });

    it('should throw an error when isEditing method is called', () => {
        expect(() => {
            component.isEditing();
        }).toThrowError('Method not implemented.');
    });

    it('should call saveNewQuiz and close dialog on successful new quiz submission', () => {
        component.isEditingMode = false;
        quizzesModificationServiceMock.isDuplicateTitle = false;
        component.quizForm = formBuilder.group({
            title: 'Sample Quiz',
            description: 'A sample quiz description',
            duration: 30,
            questions: [
                {
                    text: 'Question 1',
                    points: 10,
                    choices: [
                        { text: 'Choice 1', isCorrect: true },
                        { text: 'Choice 1', isCorrect: false },
                    ],
                },
            ],
        });
        component.onSubmit();
        expect(quizzesModificationServiceMock.saveNewQuiz).toHaveBeenCalledWith(component.quizForm.value);
    });

    it('should call saveEditedQuiz and close dialog on successful quiz edit submission', () => {
        quizzesValidationServiceMock.isDuplicateTitle = false;
        component.isEditingMode = true;
        component.quizForm = formBuilder.group({
            title: 'Sample Quiz',
            description: 'A sample quiz description',
            duration: 30,
            questions: [
                {
                    text: 'Question 1',
                    points: 10,
                    choices: [
                        { text: 'Choice 1', isCorrect: true },
                        { text: 'Choice 1', isCorrect: false },
                    ],
                },
            ],
        });
        component.onSubmit();
        expect(quizzesModificationServiceMock.saveEditedQuiz).toHaveBeenCalledWith(component.quizForm.value);
    });
    it('should call saveNewQuiz and close dialog when the title is not duplicated and when not in editing mode', () => {
        quizzesModificationServiceMock.isDuplicateTitle = false;
        component.isEditingMode = false;
        component.quizForm = formBuilder.group({
            title: 'Sample Quiz',
            description: 'A sample quiz description',
            duration: 30,
            questions: [{ text: 'Question 1', points: 10, choices: [{ text: 'Choice 1', isCorrect: true }] }],
        });
        component.onSubmit();
        expect(quizzesModificationServiceMock.saveNewQuiz).toHaveBeenCalledWith(component.quizForm.value);
    });
    it('should call this.quizForm.markAllAsTouched() when the quiz form is not valid', () => {
        quizzesValidationServiceMock.isDuplicateTitle = false;
        const quizForm = formBuilder.group({
            title: ['', Validators.required],
            duration: ['', [Validators.required, Validators.min(10), Validators.max(60)]],
            description: ['', Validators.required],
            questions: formBuilder.array([]),
        });

        component.quizForm = quizForm;
        spyOn(quizForm, 'markAllAsTouched');
        component.onSubmit();

        expect(quizForm.markAllAsTouched).toHaveBeenCalled();
    });

    it('should handle errors from getQuizzes method and continue execution', () => {
        const expectedError = new Error('Error fetching quizzes');
        quizzesRequestServiceMock.getQuizzes.and.returnValue(throwError(() => expectedError));
        component.ngOnInit();
        fixture.detectChanges();
        expect(component.quizzes).toEqual([]);
    });
    it('should display an error message when the question is invalid An error occurred while adding the question', () => {
        const mockSelectedQuestion = {
            text: 'Sample Question',
            points: 10,
            choices: [{ text: 'Choice 1', isCorrect: true }],
            type: QuestionType.QCM,
            lastModified: '',
        };
        component.questions.push(formBuilder.group(mockSelectedQuestion));
        quizzesModificationServiceMock.addQuestion.and.returnValue(throwError(() => new Error('An error occurred while adding the question')));
        component.exportQuestion(1);
        expect(matSnackBarMock.open).toHaveBeenCalled();
    });

    it('should set this.formBuilder.group if question.type === QuestionType.QCM && question.choices', () => {
        const questions: Question[] = [
            {
                type: QuestionType.QCM,
                text: 'What is the capital of France?',
                points: 10,
                choices: [
                    { text: 'Paris', isCorrect: true },
                    { text: 'London', isCorrect: false },
                    { text: 'Berlin', isCorrect: false },
                    { text: 'Madrid', isCorrect: false },
                ],
                lastModified: '2021-10-01',
            },
            {
                type: QuestionType.QCM,
                text: 'What is the largest planet in our solar system?',
                points: 10,
                choices: [
                    { text: 'Jupiter', isCorrect: true },
                    { text: 'Mars', isCorrect: false },
                    { text: 'Earth', isCorrect: false },
                    { text: 'Saturn', isCorrect: false },
                ],
                lastModified: '2021-10-02',
            },
        ];

        const populatedQuestions = component.populateQuestions(questions);

        expect(populatedQuestions.length).toBe(2);

        const firstQuestion = populatedQuestions[0];
        expect(firstQuestion.get('type')?.value).toBe(QuestionType.QCM);
        expect(firstQuestion.get('text')?.value).toBe('What is the capital of France?');
        expect(firstQuestion.get('points')?.value).toBe(10);

        const firstQuestionChoices = firstQuestion.get('choices') as FormArray;
        expect(firstQuestionChoices.length).toBe(4);

        const firstChoice = firstQuestionChoices.at(0) as FormGroup;
        expect(firstChoice.get('text')?.value).toBe('Paris');
        expect(firstChoice.get('isCorrect')?.value).toBe(true);

        const secondChoice = firstQuestionChoices.at(1) as FormGroup;
        expect(secondChoice.get('text')?.value).toBe('London');
        expect(secondChoice.get('isCorrect')?.value).toBe(false);

        const secondQuestion = populatedQuestions[1];
        expect(secondQuestion.get('type')?.value).toBe(QuestionType.QCM);
        expect(secondQuestion.get('text')?.value).toBe('What is the largest planet in our solar system?');
        expect(secondQuestion.get('points')?.value).toBe(10);

        const secondQuestionChoices = secondQuestion.get('choices') as FormArray;
        expect(secondQuestionChoices.length).toBe(4);

        const thirdChoice = secondQuestionChoices.at(2) as FormGroup;
        expect(thirdChoice.get('text')?.value).toBe('Earth');
        expect(thirdChoice.get('isCorrect')?.value).toBe(false);

        const fourthChoice = secondQuestionChoices.at(3) as FormGroup;
        expect(fourthChoice.get('text')?.value).toBe('Saturn');
        expect(fourthChoice.get('isCorrect')?.value).toBe(false);
    });

    it('should initialize component with default values when no data is provided', () => {
        component.data = null;

        component.ngOnInit();

        expect(component.quizForm.value).toEqual({
            title: '',
            duration: '',
            description: '',
            questions: [
                {
                    type: QuestionType.QCM,
                    text: '',
                    points: 10,
                    choices: [
                        { text: '', isCorrect: false },
                        { text: '', isCorrect: true },
                    ],
                },
            ],
        });
    });

    it("should return an array of form groups with 'text' and 'isCorrect' form controls", () => {
        const choices: Choice[] = [
            { text: 'Option 1', isCorrect: true },
            { text: 'Option 2', isCorrect: false },
            { text: 'Option 3', isCorrect: false },
        ];

        const result = component.populateChoice(choices);

        expect(result.length).toBe(choices.length);
        result.forEach((group, index) => {
            expect(group instanceof FormGroup).toBe(true);
            expect(group.controls['text'].value).toBe(choices[index].text);
            expect(group.controls['isCorrect'].value).toBe(choices[index].isCorrect);
        });
    });
    it('should toggle the question type to the provided type when the question index is valid', () => {
        const questionFormGroup = formBuilder.group({
            type: [QuestionType.QCM],
            text: ['Sample Question', Validators.required],
            points: [10, Validators.required],
            choices: formBuilder.array(
                [
                    formBuilder.group({
                        text: ['Choice 1', Validators.required],
                        isCorrect: [false, Validators.required],
                    }),
                    formBuilder.group({
                        text: ['Choice 2', Validators.required],
                        isCorrect: [true, Validators.required],
                    }),
                ],
                component.validateAnswerChoices,
            ),
        });

        component.questions.push(questionFormGroup);

        component.toggleQuestionType(0, QuestionType.QRL);

        expect(component.questions.at(0).get('type')?.value).toEqual(QuestionType.QRL);

        component.toggleQuestionType(0, QuestionType.QCM);

        expect(component.questions.at(0).get('type')?.value).toEqual(QuestionType.QCM);
    });

    it('should return null if the question type is not QCM', () => {
        const formArray = formBuilder.array([formBuilder.control('Choice 1'), formBuilder.control('Choice 2')]);
        const formGroup = formBuilder.group({
            type: [QuestionType.QRL],
            choices: formArray,
        });
        const control = formGroup.get('choices');
        const result = component.validateAnswerChoices(control as unknown as AbstractControl);
        expect(result).toBeNull();
    });

    it('should update the text and points of the given question in the form', () => {
        const questionIndex = 0;
        const question: Question = {
            type: QuestionType.QCM,
            text: 'What is the capital of France?',
            points: 10,
            choices: [
                { text: 'Paris', isCorrect: true },
                { text: 'London', isCorrect: false },
                { text: 'Berlin', isCorrect: false },
            ],
            lastModified: '2021-10-01',
        };

        component.updateQuestionForm(questionIndex, question);

        const questionsControl = component.quizForm.get('questions') as FormArray;
        const questionGroup = questionsControl.at(questionIndex) as FormGroup;

        expect(questionGroup.get('text')?.value).toEqual(question.text);
        expect(questionGroup.get('points')?.value).toEqual(question.points);
    });
});
