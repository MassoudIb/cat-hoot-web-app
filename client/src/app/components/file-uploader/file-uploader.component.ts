import { Component, Input } from '@angular/core';
import { Quiz } from '@app/interfaces/quiz';
import { DialogService } from '@app/services/dialog.service';
import { QuizzesModificationService } from '@app/services/quizzes-modification.service';
import { QuizzesValidationService } from '@app/services/quizzes-validation.service';

@Component({
    selector: 'app-file-uploader',
    templateUrl: './file-uploader.component.html',
    styleUrls: ['./file-uploader.component.scss'],
})
export class FileUploaderComponent {
    @Input() label: string;
    @Input() allowedExtensions: string[] = [];
    @Input() allowMultipleFiles: boolean = false;

    allowedList: string;
    isInputCorrect: boolean = false;
    isUploaded: boolean = false;
    errorMessage: string = 'Votre fichier de quiz (.json) est mal structuré';
    file: File;
    processedQuiz: Quiz;

    constructor(
        private quizzesModificationService: QuizzesModificationService,
        private quizzesValidationService: QuizzesValidationService,
        private dialogService: DialogService,
    ) {}

    onFileChanged(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input && input.files) {
            this.file = input.files[0];
            const fileReader = new FileReader();
            fileReader.onload = () => {
                const data = fileReader.result as string;
                const jsonData = JSON.parse(data);
                if (this.quizzesValidationService.isQuizValid(jsonData)) {
                    this.processedQuiz = this.quizzesValidationService.filterQuiz(jsonData);
                    this.isInputCorrect = true;
                    this.isUploaded = false;
                } else if (this.quizzesValidationService.isDuplicateTitle) {
                    this.errorMessage = this.quizzesValidationService.errorMessage;
                    this.dialogService.modifyQuiz(jsonData);
                } else {
                    this.isInputCorrect = false;
                    this.isUploaded = false;
                    this.errorMessage = this.quizzesValidationService.errorMessage;
                }
                input.value = '';
            };
            fileReader.readAsText(this.file, 'UTF-8');
        }
    }

    saveQuiz(): void {
        if (this.isInputCorrect) {
            this.quizzesModificationService.saveNewQuiz(this.processedQuiz).subscribe({
                next: () => {
                    this.isUploaded = true;
                },
            });
            this.isUploaded = true;
        } else {
            this.errorMessage = this.quizzesValidationService.errorMessage;
        }
    }
}
