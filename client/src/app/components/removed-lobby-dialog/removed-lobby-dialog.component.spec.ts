import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { RemovedLobbyDialogComponent } from './removed-lobby-dialog.component';

describe('RemovedLobbyDialogComponent', () => {
    let component: RemovedLobbyDialogComponent;
    let fixture: ComponentFixture<RemovedLobbyDialogComponent>;
    const mockDialogRef = {
        close: jasmine.createSpy('close'),
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MatDialogModule],
            declarations: [RemovedLobbyDialogComponent],
            providers: [{ provide: MatDialogRef, useValue: mockDialogRef }],
        });
        fixture = TestBed.createComponent(RemovedLobbyDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
