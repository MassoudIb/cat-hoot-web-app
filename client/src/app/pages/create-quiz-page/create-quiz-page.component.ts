/* eslint-disable max-lines */
// Our file slightly exceeds 350 lines.
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { QuestionBankModalComponent } from '@app/components/question-bank-modal/question-bank-modal.component';
import { QuestionType } from '@app/constants/question-type';
import * as validData from '@app/constants/validate-data';
import { Choice } from '@app/interfaces/choice';
import { Question } from '@app/interfaces/question';
import { Quiz } from '@app/interfaces/quiz';
import { QuizzesModificationService } from '@app/services/quizzes-modification.service';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { QuizzesValidationService } from '@app/services/quizzes-validation.service';
import { Observable, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-create-quiz-page',
    templateUrl: './create-quiz-page.component.html',
    styleUrls: ['./create-quiz-page.component.scss'],
})
export class CreateQuizPageComponent implements OnInit, OnDestroy {
    quizForm: FormGroup;
    pointsOptions: number[] = [];
    quizzes: Quiz[] = [];
    arrayTitle: string[] = [];
    showErrorMaxChoices: { [key: number]: boolean } = {};
    showCorrectIncorrectError: boolean = false;
    isEditingMode: boolean = false;
    questionsFromBank: Question[] = [];
    private questionSubscription: Subscription;

    // We need all these services
    // eslint-disable-next-line max-params
    constructor(
        private formBuilder: FormBuilder,
        private quizzesRequestService: QuizzesRequestService,
        private quizzesModificationService: QuizzesModificationService,
        private quizzesValidationService: QuizzesValidationService,
        private dialogRef: MatDialogRef<CreateQuizPageComponent>,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        @Inject(MAT_DIALOG_DATA) public data: { quiz: Quiz } | null,
    ) {}

    get questions(): FormArray {
        return this.quizForm.get('questions') as FormArray;
    }
    isEditing() {
        throw new Error('Method not implemented.');
    }
    ngOnInit() {
        this.generatePointsOptions();
        const MINIMUM_INTERVAL = 10;
        const MAXIMUM_INTERVAL = 60;
        this.loadQuestionsFromBank();

        this.quizzesRequestService
            .getQuizzes()
            .pipe(catchError(this.handleError<Quiz[]>('getQuizzes', [])))
            .subscribe({
                next: (quizzes) => {
                    this.quizzes = quizzes;
                    this.arrayTitle = quizzes.map((quiz) => quiz.title.toLowerCase());
                    this.arrayTitle.push('mode aleatoire');
                },
            });

        if (this.data && this.data.quiz) {
            this.isEditingMode = true;
            const quiz = this.data.quiz as Quiz;
            this.populateForm(quiz);
        } else {
            this.quizForm = this.formBuilder.group({
                title: ['', [Validators.required, this.validateTitle('')]],
                duration: ['', [Validators.required, Validators.min(MINIMUM_INTERVAL), Validators.max(MAXIMUM_INTERVAL)]],
                description: ['', Validators.required],
                questions: this.formBuilder.array([]),
            });
            this.addQuestion();
        }
    }

    ngOnDestroy() {
        if (this.questionSubscription) {
            this.questionSubscription.unsubscribe();
        }
    }

    loadQuestionsFromBank(): void {
        this.quizzesRequestService.getQuestions().subscribe((questions: Question[]) => {
            this.questionsFromBank = questions;
        });
    }

    populateForm(data: unknown) {
        const MINIMUM_INTERVAL = 10;
        const MAXIMUM_INTERVAL = 60;
        const quiz = data as Quiz;
        this.quizForm = this.formBuilder.group({
            id: [quiz.id],
            title: [quiz ? quiz.title : '', [Validators.required, this.validateTitle(quiz.title)]],
            duration: [quiz ? quiz.duration : '', [Validators.required, Validators.min(MINIMUM_INTERVAL), Validators.max(MAXIMUM_INTERVAL)]],
            description: [quiz ? quiz.description : '', Validators.required],
            questions: this.formBuilder.array(this.populateQuestions(quiz.questions)),
        });
    }
    populateQuestions(questions: Question[]) {
        return questions.map((question) => {
            let choicesControls: FormGroup[] = [];

            if (question.type === QuestionType.QCM && question.choices) {
                choicesControls = question.choices.map((choice) =>
                    this.formBuilder.group({
                        text: [choice.text, Validators.required],
                        isCorrect: [choice.isCorrect, Validators.required],
                    }),
                );
            }

            const questionFormGroup = this.formBuilder.group({
                type: [question.type, Validators.required],
                text: [question.text, Validators.required],
                points: [question.points, Validators.required],
                choices: this.formBuilder.array(choicesControls),
            });

            return questionFormGroup;
        });
    }
    populateChoice(choices: Choice[]) {
        return choices.map((choice) => {
            return this.formBuilder.group({
                text: [choice.text, Validators.required],
                isCorrect: [choice.isCorrect, Validators.required],
            });
        });
    }

    generatePointsOptions() {
        this.pointsOptions = [];
        for (let points = 10; points <= validData.MAX_SCORE; points += validData.MIN_SCORE) {
            this.pointsOptions.push(points);
        }
    }

    validateTitle(title: string): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (this.quizzesValidationService.isDuplicateTitle) {
                if (this.quizzesValidationService.duplicateTitle.toLowerCase() === control.value.toLowerCase()) {
                    return { titleExists: true };
                }
                return null;
            } else {
                if (this.arrayTitle.includes(control.value.toLowerCase()) && control.value.toLowerCase() !== title.toLowerCase()) {
                    return { titleExists: true };
                }
                return null;
            }
        };
    }

    validateTime() {
        const control = this.quizForm.get('duration');
        if (control) {
            control.updateValueAndValidity();
        }
    }

    onSubmit() {
        if (this.quizForm.valid) {
            if (this.quizzesValidationService.isDuplicateTitle) {
                this.quizzesModificationService.saveNewQuiz(this.quizForm.value).subscribe({
                    next: () => {
                        this.quizzesValidationService.isDuplicateTitle = false;
                        this.dialogRef.close();
                    },
                });
            } else if (this.isEditingMode) {
                this.quizzesModificationService.saveEditedQuiz(this.quizForm.value).subscribe({
                    next: () => {
                        this.dialogRef.close();
                    },
                });
            } else {
                this.quizzesModificationService.saveNewQuiz(this.quizForm.value).subscribe({
                    next: () => {
                        this.dialogRef.close();
                    },
                });
            }
        } else {
            if (!this.quizForm.valid) {
                this.quizForm.markAllAsTouched();
            }
        }
    }

    addQuestion(type: string = QuestionType.QCM) {
        const MINIMUM_POINTS = 10;
        const questionGroup = this.formBuilder.group({
            type: [type],
            text: ['', Validators.required],
            points: [MINIMUM_POINTS, Validators.required],
            choices: this.formBuilder.array(
                type === QuestionType.QCM ? [this.initAnswerChoice(false), this.initAnswerChoice(true)] : [],
                this.validateAnswerChoices,
            ),
        });
        this.questions.push(questionGroup);
    }

    initAnswerChoice(isCorrect: boolean): FormGroup {
        return this.formBuilder.group({
            text: ['', Validators.required],
            isCorrect: [isCorrect, Validators.required],
        });
    }

    createAnswerChoices(): FormGroup[] {
        return [this.formBuilder.group({ text: 'True', isCorrect: 'true' }), this.formBuilder.group({ text: 'False', isCorrect: 'false' })];
    }
    deleteQuestion(index: number) {
        if (this.questions.length > 1) {
            this.questions.removeAt(index);
        }
    }

    toggleQuestionType(questionIndex: number, type: string) {
        const question = this.questions.at(questionIndex) as FormGroup;
        question.get('type')?.setValue(type);
        if (type === QuestionType.QCM) {
            const choicesArray = this.formBuilder.array([this.initAnswerChoice(false), this.initAnswerChoice(true)], this.validateAnswerChoices);
            question.setControl('choices', choicesArray);
        } else {
            question.removeControl('choices');
        }
    }

    addAnswerChoice(questionIndex: number) {
        const answerChoices = this.questions.at(questionIndex).get('choices') as FormArray;
        if (answerChoices.length < validData.MAX_CHOICES) {
            this.showErrorMaxChoices[questionIndex] = false;
            answerChoices.push(
                this.formBuilder.group({
                    text: ['', Validators.required],
                    isCorrect: [false, Validators.required],
                }),
            );
        } else {
            this.showErrorMaxChoices[questionIndex] = true;
        }
    }

    toggleChoice(questionIndex: number, choiceIndex: number) {
        const question = this.questions.at(questionIndex);
        const choices = question.get('choices') as FormArray;
        const choice = choices.at(choiceIndex);
        const isCorrectControl = choice.get('isCorrect');
        if (isCorrectControl) {
            isCorrectControl.setValue(!isCorrectControl.value);
            choices.updateValueAndValidity();
        }
    }
    validateAnswerChoices(control: AbstractControl): ValidationErrors | null {
        const formArray = control as FormArray;
        const parent = control.parent;
        if (parent && parent.value.type !== QuestionType.QCM) {
            return null;
        }
        const trueCount = formArray.controls.filter((formControl) => formControl.value.isCorrect === true).length;
        const arrayChoice = formArray.controls.map((formControl) => formControl.value.text);
        const uniqueChoice = new Set();
        const duplicateChoice: string[] = [];
        arrayChoice.forEach((item) => {
            if (uniqueChoice.has(item)) {
                duplicateChoice.push(item);
            } else {
                uniqueChoice.add(item);
            }
        });

        if (duplicateChoice.length > 0 && !duplicateChoice.includes('')) {
            return { correctIncorrect: 'Vous ne pouvez pas avoir des choix dupliqués' };
        }

        if (trueCount === 0 || trueCount === formArray.length) {
            return { correctIncorrect: 'Chaque question requiert au moins une réponse correcte et une réponse incorrecte.' };
        }

        return null;
    }

    deleteAnswerChoice(question: AbstractControl, index: number) {
        const answerChoices = this.getAnswerChoices(question);
        if (answerChoices.length > 2) {
            answerChoices.removeAt(index);
            this.showErrorMaxChoices[index] = false;
        }
    }

    getAnswerChoices(question: AbstractControl): FormArray {
        return question.get('choices') as FormArray;
    }

    importQuestion(index: number) {
        const dialogRef = this.dialog.open(QuestionBankModalComponent, {
            width: '600px',
            data: { questions: this.questionsFromBank },
        });

        dialogRef.afterClosed().subscribe((selectedQuestion) => {
            this.toggleQuestionType(index, selectedQuestion.type);
            if (selectedQuestion) {
                this.updateQuestionForm(index, selectedQuestion);
            }
        });
    }

    updateQuestionForm(questionIndex: number, question: Question) {
        const questionsControl = this.quizForm.get('questions') as FormArray;
        const questionGroup = questionsControl.at(questionIndex) as FormGroup;

        const newQuestion = this.formBuilder.group({
            text: [question.text, Validators.required],
            points: [question.points, Validators.required],
        });
        questionGroup.patchValue(newQuestion.value);

        if (question.type === QuestionType.QCM && question.choices) {
            questionGroup.setControl('choices', this.formBuilder.array(this.populateChoice(question.choices), this.validateAnswerChoices));
        }
    }

    exportQuestion(index: number) {
        const question = this.questions.at(index);
        if (question.valid) {
            this.quizzesModificationService.addQuestion(question.value).subscribe({
                next: (response) => {
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
                error: () => {
                    this.snackBar.open("Erreur lors de l'ajout de la question", 'Fermer', {
                        duration: 3000,
                    });
                },
            });
        } else {
            this.snackBar.open("Erreur lors de l'ajout de la question", 'Fermer', {
                duration: 3000,
            });
        }
    }

    moveQuestionUp(index: number, event: Event) {
        event.stopPropagation();
        const question = this.questions.at(index);
        this.questions.removeAt(index);
        this.questions.insert(index - 1, question);
    }

    moveQuestionDown(index: number, event: Event) {
        event.stopPropagation();
        const question = this.questions.at(index);
        this.questions.removeAt(index);
        this.questions.insert(index + 1, question);
    }

    moveChoiceUp(questionIndex: number, choiceIndex: number, event: Event): void {
        event.stopPropagation();
        const answerChoices = this.getAnswerChoices(this.questions.at(questionIndex)) as FormArray;
        const currentChoice = answerChoices.at(choiceIndex);
        answerChoices.removeAt(choiceIndex);
        answerChoices.insert(choiceIndex - 1, currentChoice);
    }

    moveChoiceDown(questionIndex: number, choiceIndex: number, event: Event): void {
        event.stopPropagation();
        const answerChoices = this.getAnswerChoices(this.questions.at(questionIndex)) as FormArray;
        const currentChoice = answerChoices.at(choiceIndex);
        answerChoices.removeAt(choiceIndex);
        answerChoices.insert(choiceIndex + 1, currentChoice);
    }

    private handleError<T>(request: string, result?: T): (error: Error) => Observable<T> {
        return () => of(result as T);
    }
}
