import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Quiz } from '@app/interfaces/quiz';
import { AuthenticationService } from '@app/services/authentication.service';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesModificationService } from '@app/services/quizzes-modification.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';

@Component({
    selector: 'app-admin-page',
    templateUrl: './admin-page.component.html',
    styleUrls: ['./admin-page.component.scss'],
})
export class AdminPageComponent implements OnInit {
    loginForm: FormGroup;
    isLoggedIn: boolean = false;
    isPasswordValid: boolean = true;
    quizzes$ = this.quizzesRequestService.quizzes$;
    quizzes: Quiz[] = [];
    isTitleValid: boolean = true;
    isDescription: boolean = true;
    isDurationValid: boolean = true;
    quizFile: Quiz;
    fileGame: Quiz;
    password: string;

    // We need all theses services
    // eslint-disable-next-line max-params
    constructor(
        private formBuilder: FormBuilder,
        private dialogService: DialogService,
        private quizzesRequestService: QuizzesRequestService,
        private quizzesModificationService: QuizzesModificationService,
        private authenticationService: AuthenticationService,
    ) {
        this.createForm();
    }
    ngOnInit() {
        this.loadGames();
    }

    // We need any for the OnFileChange method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFileChange(event: any) {
        this.quizFile = event.target.games[0];
    }

    createForm() {
        this.loginForm = this.formBuilder.group({
            password: ['', Validators.required],
        });
    }

    submitPassword() {
        const password = this.loginForm.value.password;
        this.authenticationService.verifyPassword(password).subscribe({
            next: (success) => {
                if (success) {
                    this.isLoggedIn = true;
                    this.isPasswordValid = true;
                } else {
                    this.isPasswordValid = false;
                    this.loginForm.reset();
                }
            },
            error: () => {
                this.isPasswordValid = false;
                this.loginForm.reset();
            },
        });
    }

    validateData(quiz: Quiz) {
        if (quiz.title == null) this.isTitleValid = false;
        if (quiz.description == null) this.isDescription = false;
        if (quiz.duration == null) this.isDurationValid = false;
    }

    updateAttributes(quiz: Quiz) {
        const currentDate = new Date();
        quiz.lastModification = currentDate.toISOString();
    }

    loadGames() {
        this.quizzesRequestService.getQuizzes().subscribe({
            next: (data: Quiz[] | Quiz) => {
                this.quizzes = Array.isArray(data) ? (this.quizzes = data) : (this.quizzes = [data]);
            },
            error: () => {
                this.quizzes = [];
            },
        });
    }

    toggleVisibility(quiz: Quiz) {
        this.quizzesModificationService.updateQuizVisibility(quiz.id, !quiz.isVisible).subscribe({
            next: () => {
                quiz.isVisible = !quiz.isVisible;
                this.quizzesRequestService.loadData();
            },
        });
    }

    goToMainPage() {
        // Go to main page
    }

    deleteGame(quizToDelete: Quiz) {
        this.quizzesModificationService.deleteQuiz(quizToDelete.id).subscribe({
            next: () => {
                this.quizzesRequestService.loadData();
            },
        });
    }

    goToQuestionBank() {
        this.dialogService.openQuestionBankDialog();
    }
    goToCreateQuiz() {
        this.dialogService.openCreateQuizDialog();
    }

    goToHistory() {
        this.dialogService.openHistoryDialog();
    }

    modifyQuiz(quiz: Quiz) {
        this.dialogService.modifyQuiz(quiz);
    }
    exportGame(quiz: Quiz) {
        const gameToExport = { ...quiz };
        delete gameToExport.isVisible;
        const jsonData = JSON.stringify(gameToExport, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${quiz.title.replace(/ /g, '_')}.json`;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
