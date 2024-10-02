import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Question } from '@app/interfaces/question';
import { QuestionBankModalComponent } from './question-bank-modal.component';

const mockDialogRef = {
    close: jasmine.createSpy('close'),
};

const mockDialogData: Question = { type: 'QCM', lastModified: '', text: 'Question 1', points: 10, choices: [{ text: 'Choice 1', isCorrect: true }] };

describe('QuestionBankModalComponent', () => {
    let component: QuestionBankModalComponent;
    let fixture: ComponentFixture<QuestionBankModalComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [QuestionBankModalComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(QuestionBankModalComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close the dialog with selected question when selectQuestion is called', () => {
        const questionToSelect = mockDialogData;
        component.selectQuestion(questionToSelect);
        expect(mockDialogRef.close).toHaveBeenCalledWith(questionToSelect);
    });
});
