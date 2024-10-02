import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AllPlayersLeftDialogComponent } from './all-players-left-dialog.component';

describe('AllPlayersLeftDialogComponent', () => {
    let component: AllPlayersLeftDialogComponent;
    let fixture: ComponentFixture<AllPlayersLeftDialogComponent>;
    const mockDialogRef = {
        close: jasmine.createSpy('close'),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MatDialogModule],
            declarations: [AllPlayersLeftDialogComponent],
            providers: [{ provide: MatDialogRef, useValue: mockDialogRef }],
        });
        fixture = TestBed.createComponent(AllPlayersLeftDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
