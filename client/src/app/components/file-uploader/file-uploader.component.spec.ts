import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Quiz } from '@app/interfaces/quiz';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesModificationService } from '@app/services/quizzes-modification.service';
import { QuizzesValidationService } from '@app/services/quizzes-validation.service';
import { of } from 'rxjs';
import { FileUploaderComponent } from './file-uploader.component';

const apiQuiz = {
    id: 1,
    isVisible: false,
    title: 'Quiz',
    description: 'example',
    duration: 30,
    lastModification: '2018-11-13T20:20:39+00:00',
    questions: [
        {
            type: 'QCM',
            text: 'Test',
            points: 40,
            choices: [
                { text: 'Choice1', isCorrect: true },
                { text: 'Choice2', isCorrect: false },
            ],
        },
    ],
};
const fileContent = JSON.stringify(apiQuiz);
const blob = new Blob([fileContent], { type: 'application/json' });
const file = new File([blob], 'quiz.json');
const apiEvent = { target: { files: [file] } };
describe('FileUploaderComponent', () => {
    let component: FileUploaderComponent;
    let fixture: ComponentFixture<FileUploaderComponent>;
    let matDialogMock: jasmine.SpyObj<MatDialog>;
    let quizzesModificationServiceMock: jasmine.SpyObj<QuizzesModificationService>;
    let quizzesValidationServiceMock: jasmine.SpyObj<QuizzesValidationService>;
    let dialogServiceMock: jasmine.SpyObj<DialogService>;

    beforeEach(() => {
        quizzesModificationServiceMock = jasmine.createSpyObj('QuizzesModificationService', ['saveNewQuiz']);
        quizzesValidationServiceMock = jasmine.createSpyObj('QuizzesValidationService', ['isQuizValid', 'filterQuiz']);
        matDialogMock = jasmine.createSpyObj('MatDialog', ['open']);
        dialogServiceMock = jasmine.createSpyObj('DialogService', ['modifyQuiz']);

        TestBed.configureTestingModule({
            declarations: [FileUploaderComponent],
            imports: [HttpClientTestingModule],
            providers: [
                { provide: QuizzesModificationService, useValue: quizzesModificationServiceMock },
                { provide: QuizzesValidationService, useValue: quizzesValidationServiceMock },
                { provide: MatDialog, useValue: matDialogMock },
            ],
        });
        fixture = TestBed.createComponent(FileUploaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
    it('should not process the quiz and when the input file is not valid', () => {
        const invalidQuiz = '{"title": "Quiz 1"}';
        const event = { target: { files: [new File([invalidQuiz], 'quiz.js', { type: 'application/json' })] } };
        component.onFileChanged(event as unknown as Event);
        expect(component.processedQuiz).toBeUndefined();
        expect(component.isInputCorrect).toBe(false);
        expect(component.isUploaded).toBe(false);
        expect(component.errorMessage).toBeDefined();
    });
    it('should call saveNewQuiz when the input file is correct', () => {
        quizzesModificationServiceMock.saveNewQuiz.and.returnValue(of({} as unknown as Quiz));
        const processedQuizMock = apiQuiz as unknown as Quiz;
        component.isInputCorrect = true;
        component.processedQuiz = processedQuizMock;

        component.saveQuiz();

        expect(quizzesModificationServiceMock.saveNewQuiz).toHaveBeenCalledWith(processedQuizMock);
        expect(component.isUploaded).toBe(true);
    });
    it('should show an error message if the input file is not correct', () => {
        quizzesModificationServiceMock.saveNewQuiz.and.returnValue(of({} as unknown as Quiz));
        const processedQuizMock = apiQuiz as unknown as Quiz;
        component.isInputCorrect = false;
        component.processedQuiz = processedQuizMock;

        component.saveQuiz();

        expect(component.isUploaded).toBe(false);
    });
    it('should process the quiz if the input file is valid', fakeAsync(() => {
        component.onFileChanged(apiEvent as unknown as Event);

        quizzesValidationServiceMock.isQuizValid.and.callFake(() => true);

        component.onFileChanged(apiEvent as unknown as Event);

        fixture.detectChanges();
        tick();
        expect(component.isUploaded).toBe(false);
    }));

    it('should call modifyQuiz from diaolgService when the title is used', () => {
        const fileReaderMock = new FileReader();
        fileReaderMock.onload = () => {
            quizzesValidationServiceMock.isQuizValid.and.callFake((quiz) => {
                expect(quiz).toEqual(apiQuiz as unknown as Quiz);
                return true;
            });
            quizzesValidationServiceMock.isQuizValid.and.returnValue(false);
            quizzesValidationServiceMock.isDuplicateTitle = true;

            component.onFileChanged(apiEvent as unknown as Event);
            expect(dialogServiceMock.modifyQuiz).toHaveBeenCalled();
        };
    });
});
