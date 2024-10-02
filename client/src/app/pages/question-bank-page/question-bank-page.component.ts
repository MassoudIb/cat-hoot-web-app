import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuestionType } from '@app/constants/question-type';
import * as validData from '@app/constants/validate-data';
import { QuizzesModificationService } from '@app/services/quizzes-modification.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { Choice } from './../../interfaces/choice';
import { Question } from './../../interfaces/question';

@Component({
    selector: 'app-question-bank-page',
    templateUrl: './question-bank-page.component.html',
    styleUrls: ['./question-bank-page.component.scss'],
})
export class QuestionBankPageComponent implements OnInit {
    questions: Question[] = [];
    questionForm: FormGroup;
    editingIndex: number | null = null;
    editingForm: FormGroup;
    pointsOptions: number[] = [];
    typeQuestion: string;
    activeFilter: string = '';
    openModify: boolean = false;

    // We need all these services for this component
    // eslint-disable-next-line max-params
    constructor(
        private formBuilder: FormBuilder,
        private quizzesRequestService: QuizzesRequestService,
        private quizzesModificationService: QuizzesModificationService,
        private snackBar: MatSnackBar,
    ) {}

    ngOnInit(): void {
        this.loadQuestions();
        this.initForm();
        this.generatePointsOptions();
        this.questionForm.get('type')?.setValue(QuestionType.QCM);
    }

    toggleNotDisplayQuestion(type: string) {
        if (this.activeFilter === type) {
            this.activeFilter = '';
        } else {
            this.activeFilter = type;
        }
    }

    openModifyBox(type: string) {
        if (this.openModify === true) {
            this.openModify = false;
        } else {
            this.openModify = true;
            this.initForm(type);
        }
    }

    generatePointsOptions() {
        this.pointsOptions = [];
        for (let points = 10; points <= validData.MAX_SCORE; points += validData.MIN_SCORE) {
            this.pointsOptions.push(points);
        }
    }

    loadQuestions(): void {
        this.quizzesRequestService.getQuestions().subscribe((questions: Question[]) => {
            this.questions = questions.sort((a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());
        });
    }

    initForm(type: string = QuestionType.QCM): void {
        this.questionForm = this.formBuilder.group({
            type: [type],
            text: ['', Validators.required],
            points: ['', [Validators.required, Validators.min(1)]],
            choices: this.formBuilder.array([this.initChoice(), this.initChoice()]),
        });
    }

    toggleQuestionType(type: string) {
        this.questionForm.get('type')?.setValue(type);
        if (type === QuestionType.QCM) {
            this.questionForm.setControl('choices', this.formBuilder.array([this.initChoice(), this.initChoice()]));
        } else {
            this.questionForm.removeControl('choices');
        }
    }

    initChoice(choice?: Choice): FormGroup {
        return this.formBuilder.group({
            text: [choice ? choice.text : '', Validators.required],
            isCorrect: [choice ? choice.isCorrect : false, Validators.required],
        });
    }

    getChoices(): FormArray {
        return this.questionForm.get('choices') as FormArray;
    }
    getEditChoices(): FormArray {
        return this.editingForm.get('choices') as FormArray;
    }

    addChoice(): void {
        const choices = this.getChoices();
        if (choices.length < validData.MAX_CHOICES) {
            choices.push(this.initChoice());
        } else {
            this.snackBar.open('Maximum des choix atteint', 'Fermer', {
                duration: 3000,
            });
        }
    }

    removeChoice(index: number): void {
        const choices = this.getChoices();
        if (choices.length > 2) {
            choices.removeAt(index);
        } else {
            this.snackBar.open('Minimum des choix atteint', 'Fermer', {
                duration: 3000,
            });
        }
    }

    deleteQuestion(question: Question): void {
        this.quizzesModificationService.deleteQuestion(question).subscribe({
            next: () => {
                this.loadQuestions();
            },
        });
    }

    updateQuestion(question: Question, questionUpdate: Question): void {
        this.quizzesModificationService.updateQuestion(question, questionUpdate).subscribe({
            next: () => {
                this.loadQuestions();
            },
        });
    }

    startEditQuestion(index: number): void {
        this.editingIndex = index;
        this.typeQuestion = this.questions[index].type;
        const question = this.questions[index];

        if (this.questions[index].type === QuestionType.QCM) {
            this.editingForm = this.formBuilder.group({
                text: [question.text, Validators.required],
                points: [question.points, [Validators.required, Validators.min(1)]],
                choices: this.formBuilder.array(question.choices.map((choice) => this.initChoice(choice))),
            });
        } else if (this.questions[index].type === QuestionType.QRL) {
            this.editingForm = this.formBuilder.group({
                text: [question.text, Validators.required],
                points: [question.points, [Validators.required, Validators.min(1)]],
            });
        }
    }

    submitEdit(): void {
        if (this.editingIndex !== null && this.editingForm.valid) {
            const questionUpdate = this.editingForm.value;
            const originalQuestionText = this.questions[this.editingIndex];
            this.updateQuestion(originalQuestionText, questionUpdate);
            this.editingIndex = null;
            this.editingForm.reset();
        }
    }

    onSubmit(): void {
        if (this.questionForm.valid) {
            this.quizzesModificationService.addQuestion(this.questionForm.value).subscribe({
                next: (response) => {
                    this.loadQuestions();
                    this.questionForm.get('type')?.setValue(QuestionType.QCM);
                    this.openModify = false;
                    if (typeof response === 'string') {
                        const message =
                            response === 'Question added successfully'
                                ? 'Question ajoutée avec succès'
                                : response === 'Question already exists'
                                ? 'Question existe déjà'
                                : response;
                        this.snackBar.open(message, 'Fermer', {
                            duration: 3000,
                        });
                    }
                },
            });
        }
    }
}
