/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disable some lint to simplify some test
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { QuizzesModificationService } from 'src/app/services/quizzes-modification.service';
import { QuizzesRequestService } from 'src/app/services/quizzes-request.service';
import { QuestionBankPageComponent } from './question-bank-page.component';

describe('QuestionBankPageComponent', () => {
    let component: QuestionBankPageComponent;
    let fixture: ComponentFixture<QuestionBankPageComponent>;
    let quizzesModificationServiceMock: jasmine.SpyObj<QuizzesModificationService>;
    let quizzesRequestServiceMock: jasmine.SpyObj<QuizzesRequestService>;
    let matSnackBarMock: jasmine.SpyObj<MatSnackBar>;

    beforeEach(async () => {
        quizzesModificationServiceMock = jasmine.createSpyObj('QuizzesService', ['getQuestions', 'addQuestion', 'deleteQuestion', 'updateQuestion']);
        quizzesRequestServiceMock = jasmine.createSpyObj('QuizzesService', ['getQuestions']);
        matSnackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);
        quizzesRequestServiceMock.getQuestions.and.returnValue(
            of([
                {
                    text: 'Sample Question',
                    type: 'QCM',
                    points: 10,
                    choices: [{ text: 'Choice 1', isCorrect: true }],
                    lastModified: '',
                },
            ]),
        );
        quizzesModificationServiceMock.addQuestion.and.returnValue(of({}));
        quizzesModificationServiceMock.deleteQuestion.and.returnValue(of({}));
        quizzesModificationServiceMock.updateQuestion.and.returnValue(of({}));

        await TestBed.configureTestingModule({
            declarations: [QuestionBankPageComponent],
            providers: [
                FormBuilder,
                { provide: QuizzesModificationService, useValue: quizzesModificationServiceMock },
                { provide: QuizzesRequestService, useValue: quizzesRequestServiceMock },
                { provide: MatSnackBar, useValue: matSnackBarMock },
            ],
            imports: [ReactiveFormsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(QuestionBankPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load questions on init', () => {
        expect(quizzesRequestServiceMock.getQuestions).toHaveBeenCalled();
        expect(component.questions.length).toBeGreaterThan(0);
    });

    it('should add a question', () => {
        component.questionForm.controls['text'].setValue('New Question');
        component.questionForm.controls['points'].setValue(10);
        component.questionForm.setControl('choices', new FormBuilder().array([new FormBuilder().group({ text: 'New Choice', isCorrect: true })]));
        component.onSubmit();
        expect(quizzesModificationServiceMock.addQuestion).toHaveBeenCalled();
    });

    it('should add a new choice to the form array when called', () => {
        const initialChoicesLength = component.getChoices().length;
        component.addChoice();
        const updatedChoicesLength = component.getChoices().length;
        expect(updatedChoicesLength).toBe(initialChoicesLength + 1);
    });

    it('should delete a question', () => {
        component.questions = [
            {
                text: 'Sample Question',
                type: 'QCM',
                points: 10,
                choices: [{ text: 'Choice 1', isCorrect: true }],
                lastModified: '',
            },
        ];
        component.deleteQuestion(component.questions[0]);
        expect(quizzesModificationServiceMock.deleteQuestion).toHaveBeenCalledWith(component.questions[0]);
    });

    it('should update a question', () => {
        component.startEditQuestion(0);
        component.editingForm.controls['text'].setValue('Updated Question');
        component.submitEdit();
        expect(quizzesModificationServiceMock.updateQuestion).toHaveBeenCalled();
    });
    it('should remove a choice from the form array when called', () => {
        component.getChoices().push(new FormBuilder().group({ text: 'New Choice', isCorrect: true }));
        const initialChoicesLength = component.getChoices().length;
        component.removeChoice(0);
        const updatedChoicesLength = component.getChoices().length;
        expect(updatedChoicesLength).toBe(initialChoicesLength - 1);
    });

    it('should get edit choices while editing', () => {
        component.startEditQuestion(0);
        expect(component.getEditChoices().length).toBeGreaterThan(0);
    });

    it('should show "Question ajoutée avec succès" alert when the question is added successfully', () => {
        quizzesModificationServiceMock.addQuestion.and.returnValue(of('Question added successfully' as unknown as object));
        component.questionForm.controls['text'].setValue('New Question');
        component.questionForm.controls['points'].setValue(10);
        component.questionForm.setControl('choices', new FormBuilder().array([new FormBuilder().group({ text: 'New Choice', isCorrect: true })]));
        component.onSubmit();
        expect(matSnackBarMock.open).toHaveBeenCalled();
    });

    it('should show "Question existe déjà" alert when the question already exists', () => {
        quizzesModificationServiceMock.addQuestion.and.returnValue(of('Question already exists' as unknown as object));
        component.questionForm.controls['text'].setValue('Existing Question');
        component.questionForm.controls['points'].setValue(10);
        component.questionForm.setControl(
            'choices',
            new FormBuilder().array([new FormBuilder().group({ text: 'Existing Choice', isCorrect: true })]),
        );
        component.onSubmit();
        expect(matSnackBarMock.open).toHaveBeenCalled();
    });

    it('should handle other success messages', () => {
        const customMessage = 'Custom success message';
        quizzesModificationServiceMock.addQuestion.and.returnValue(of(customMessage as unknown as object));
        component.questionForm.controls['text'].setValue('Another New Question');
        component.questionForm.controls['points'].setValue(10);
        component.questionForm.setControl(
            'choices',
            new FormBuilder().array([new FormBuilder().group({ text: 'Another New Choice', isCorrect: true })]),
        );
        component.onSubmit();
        expect(matSnackBarMock.open).toHaveBeenCalled();
    });

    it('should display an alert message if the maximum number of choices has been reached', () => {
        component.initForm();
        component.addChoice();
        component.addChoice();
        component.addChoice();
        component.addChoice();
        component.addChoice();
        expect(matSnackBarMock.open).toHaveBeenCalled();
    });

    it('should set activeFilter to type when activeFilter is empty and type is passed as argument', () => {
        component.activeFilter = '';
        component.toggleNotDisplayQuestion('QCM');
        expect(component.activeFilter).toBe('QCM');
    });

    it('should set activeFilter to empty when activeFilter is type', () => {
        component.activeFilter = 'QCM';
        component.toggleNotDisplayQuestion('QCM');
        expect(component.activeFilter).toBe('');
    });

    it('should toggle openModify to false', () => {
        component.openModify = true;
        component.openModifyBox('QCM');
        expect(component.openModify).toBe(false);
    });

    it('should toggle openModify to true', () => {
        component.openModify = false;
        component.openModifyBox('QCM');
        expect(component.openModify).toBe(true);
    });

    it('should set the value of the type form control to QCM when toggling the question type to QCM', () => {
        component.toggleQuestionType('QCM');
        expect(component.questionForm.get('type')?.value).toBe('QCM');
    });

    it('should set the value of the type form control to QRL when toggling the question type to QRL', () => {
        component.toggleQuestionType('QRL');
        expect(component.questionForm.get('type')?.value).toBe('QRL');
    });
});
