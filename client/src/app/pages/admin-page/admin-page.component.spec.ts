/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disable some lint to simplify some test
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Quiz } from '@app/interfaces/quiz';
import { AuthenticationService } from '@app/services/authentication.service';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesModificationService } from '@app/services/quizzes-modification.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { of, throwError } from 'rxjs';
import { AdminPageComponent } from './admin-page.component';

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let quizzesRequestServiceMock: jasmine.SpyObj<QuizzesRequestService>;
    let quizzesModificationServiceMock: jasmine.SpyObj<QuizzesModificationService>;
    let dialogServiceMock: jasmine.SpyObj<DialogService>;
    let authenticationService: jasmine.SpyObj<AuthenticationService>;

    const mockQuiz: Quiz = {
        isVisible: true,
        id: 'mockId',
        title: 'Mock Quiz',
        description: 'This is a mock quiz for testing',
        duration: 15,
        lastModification: '2022-01-01T00:00:00Z',
        questions: [
            {
                type: 'multiple-choice',
                text: 'Sample Question',
                points: 5,
                choices: [
                    { text: 'Answer 1', isCorrect: true },
                    { text: 'Answer 2', isCorrect: false },
                ],
                lastModified: '2022-01-01T00:00:00Z',
            },
        ],
    };

    beforeEach(async () => {
        quizzesRequestServiceMock = jasmine.createSpyObj('QuizzesRequestService', ['getQuizzes', 'loadData']);
        quizzesModificationServiceMock = jasmine.createSpyObj('QuizzesModificationService', ['updateQuizVisibility', 'loadData']);
        dialogServiceMock = jasmine.createSpyObj('DialogService', ['openQuestionBankDialog', 'openCreateQuizDialog', 'modifyQuiz']);
        authenticationService = jasmine.createSpyObj('AuthenticationService', ['verifyPassword']);

        quizzesRequestServiceMock.getQuizzes.and.returnValue(of([]));

        await TestBed.configureTestingModule({
            declarations: [AdminPageComponent],
            imports: [HttpClientTestingModule, MatDialogModule, NoopAnimationsModule, ReactiveFormsModule, RouterTestingModule],
            providers: [
                { provide: QuizzesRequestService, useValue: quizzesRequestServiceMock },
                { provide: QuizzesModificationService, useValue: quizzesModificationServiceMock },
                { provide: DialogService, useValue: dialogServiceMock },
                { provide: AuthenticationService, useValue: authenticationService },
                FormBuilder,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(AdminPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        quizzesRequestServiceMock.getQuizzes.calls.reset();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load quizzes on init', () => {
        component.ngOnInit();
        expect(quizzesRequestServiceMock.getQuizzes).toHaveBeenCalled();
    });

    it('should load an array of games from the server', () => {
        quizzesRequestServiceMock.getQuizzes.and.returnValue(
            of([
                { id: '1', title: 'Game 1', description: '', duration: 0, lastModification: '', questions: [] },
                { id: '2', title: 'Game 2', description: '', duration: 50, lastModification: '', questions: [] },
            ]),
        );

        component.loadGames();

        expect(component.quizzes.length).toBe(2);
        expect(component.quizzes[0].id).toEqual('1');
        expect(component.quizzes[1].id).toEqual('2');
        expect(component.quizzes[1].duration).toEqual(50);
    });
    it('should toggle visibility from true to false when quiz is visible', () => {
        const quiz: Quiz = {
            isVisible: true,
            id: '123',
            title: 'Example Quiz',
            description: 'This is an example quiz',
            duration: 10,
            lastModification: '2021-10-01',
            questions: [],
        };

        quizzesModificationServiceMock.updateQuizVisibility.and.returnValue(of([]));

        component.toggleVisibility(quiz);

        expect(quizzesModificationServiceMock.updateQuizVisibility).toHaveBeenCalledWith(quiz.id, false);
        expect(quiz.isVisible).toBe(false);
        expect(quizzesRequestServiceMock.loadData).toHaveBeenCalled();
    });

    it('should navigate to main page successfully', () => {
        spyOn(component, 'goToMainPage');
        component.goToMainPage();
        expect(component.goToMainPage).toHaveBeenCalled();
    });

    it('should navigate to quiz bank successfully', () => {
        spyOn(component, 'goToQuestionBank');
        component.goToQuestionBank();
        expect(component.goToQuestionBank).toHaveBeenCalled();
    });

    it('should navigate to create quiz dialog successfully', () => {
        spyOn(component, 'goToCreateQuiz');
        component.goToCreateQuiz();
        expect(component.goToCreateQuiz).toHaveBeenCalled();
    });

    it('should navigate to history dialog successfully', () => {
        spyOn(component, 'goToHistory');
        component.goToHistory();
        expect(component.goToHistory).toHaveBeenCalled();
    });

    it('should export a game object to a JSON file with correct filename', () => {
        const game: Quiz = {
            id: '1',
            title: 'Game 1',
            description: 'Description of game 1',
            duration: 10,
            lastModification: '2021-10-01',
            questions: [],
        };
        const expectedFilename = 'Game_1.json';

        const mockAnchorElement = document.createElement('a');
        spyOn(document, 'createElement').and.returnValue(mockAnchorElement);
        spyOn(mockAnchorElement, 'click');
        const mockBlobURL = 'mockBlobURL';
        spyOn(URL, 'createObjectURL').and.returnValue(mockBlobURL);
        const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');
        component.exportGame(game);
        expect(mockAnchorElement.download).toEqual(expectedFilename);
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(mockAnchorElement.click).toHaveBeenCalled();
        expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockBlobURL);
    });

    it('should update the lastModification property with the current date and time in ISO format', () => {
        const currentDate = new Date();
        const quiz: Quiz = {
            id: '1',
            title: 'Game 1',
            description: 'Description of game 1',
            duration: 10,
            lastModification: '',
            questions: [],
        };

        component.updateAttributes(quiz);
        expect(quiz.lastModification).toBe(currentDate.toISOString());
    });

    it('should validate quiz with title and description and duration', () => {
        const quiz: Quiz = {
            isVisible: true,
            id: '123',
            title: 'Math Quiz',
            description: 'Test your math skills',
            duration: 15,
            lastModification: '2021-10-01',
            questions: [],
        };
        component.validateData(quiz);
        expect(component.isTitleValid).toBe(true);
        expect(component.isDescription).toBe(true);
        expect(component.isDurationValid).toBe(true);
    });

    it('should validate quiz with empty title, description and duration', () => {
        const quiz: Quiz = {
            isVisible: true,
            id: '',
            title: null as never,
            description: null as never,
            duration: null as never,
            lastModification: '2021-10-01',
            questions: [],
        };
        component.validateData(quiz);
        expect(component.isTitleValid).toBe(false);
        expect(component.isDescription).toBe(false);
        expect(component.isDurationValid).toBe(false);
    });

    it('should call dialogService.openQuestionBankDialog()', () => {
        component.goToQuestionBank();
        expect(dialogServiceMock.openQuestionBankDialog).toHaveBeenCalled();
    });

    it('should call the openCreateQuizDialog method of the dialogService', () => {
        component.goToCreateQuiz();
        expect(dialogServiceMock.openCreateQuizDialog).toHaveBeenCalled();
    });

    it('should call the modifyQuiz method of the dialogService with the provided quiz object', () => {
        component.modifyQuiz(mockQuiz);
        expect(dialogServiceMock.modifyQuiz).toHaveBeenCalledWith(mockQuiz);
    });

    it('should set quizFile to the first file in the event targets games array', () => {
        const mockFile = new File([''], 'mockFile');
        const mockEvent = {
            target: {
                games: [mockFile],
            },
        } as unknown as Event;
        component.onFileChange(mockEvent);
        expect(component.quizFile).toEqual(jasmine.any(File));
    });

    it('should send password to authentication service for verification', () => {
        authenticationService.verifyPassword.and.returnValue(of(true));
        component.loginForm.controls['password'].setValue('password');
        component.submitPassword();
        expect(authenticationService.verifyPassword).toHaveBeenCalledWith('password');
    });

    it('should not log in user and set isPasswordValid flag to false when password is incorrect', () => {
        authenticationService.verifyPassword.and.returnValue(of(false));
        component.loginForm = new FormGroup({
            password: new FormControl('incorrectPassword'),
        });

        component.submitPassword();
        expect(component.isLoggedIn).toBeFalse();
        expect(component.isPasswordValid).toBeFalse();
    });

    it('should reset form if there is an error verifying the password', () => {
        authenticationService.verifyPassword.and.returnValue(throwError(() => new Error('Error verifying password')));
        component.loginForm = new FormGroup({
            password: new FormControl('password123', Validators.required),
        });

        component.submitPassword();
        expect(component.loginForm.value.password).toBeNull();
    });
    it('should handle server connection errors', () => {
        quizzesRequestServiceMock.getQuizzes.and.returnValue(throwError(() => new Error('Server connection error')));
        component.loadGames();
        expect(component.quizzes).toEqual([]);
    });
});
