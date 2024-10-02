import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { KickedPlayerDialogComponent } from './kicked-player-dialog.component';

describe('KickedPlayerDialogComponent', () => {
    let component: KickedPlayerDialogComponent;
    let fixture: ComponentFixture<KickedPlayerDialogComponent>;
    const mockDialogRef = {
        close: jasmine.createSpy('close'),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MatDialogModule],
            declarations: [KickedPlayerDialogComponent],
            providers: [{ provide: MatDialogRef, useValue: mockDialogRef }],
        });
        fixture = TestBed.createComponent(KickedPlayerDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
