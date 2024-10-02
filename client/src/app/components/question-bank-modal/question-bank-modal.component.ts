import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Question } from '@app/interfaces/question';

@Component({
    selector: 'app-question-bank-modal',
    templateUrl: './question-bank-modal.component.html',
    styleUrls: ['./question-bank-modal.component.scss'],
})
export class QuestionBankModalComponent {
    hoveredQuestion: Question | null = null;
    constructor(
        public dialogRef: MatDialogRef<QuestionBankModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { questions: Question[] },
    ) {}

    selectQuestion(question: Question) {
        this.dialogRef.close(question);
    }
}
