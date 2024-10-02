import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { RoomUnavailableDialogComponent } from './room-unavailable-dialog.component';

describe('RoomUnavailableDialogComponent', () => {
    let component: RoomUnavailableDialogComponent;
    let fixture: ComponentFixture<RoomUnavailableDialogComponent>;
    const mockDialogRef = {
        close: jasmine.createSpy('close'),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MatDialogModule],
            declarations: [RoomUnavailableDialogComponent],
            providers: [{ provide: MatDialogRef, useValue: mockDialogRef }],
        });
        fixture = TestBed.createComponent(RoomUnavailableDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
