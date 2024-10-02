/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disable some lint to simplify some test
import { EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { TimeService } from '@app/services/time.service';
import { RoomNextQuestionDialogComponent } from './room-next-question-dialog.component';

describe('RoomNextQuestionDialogComponent', () => {
    let component: RoomNextQuestionDialogComponent;
    let fixture: ComponentFixture<RoomNextQuestionDialogComponent>;
    let timeServiceMock: Partial<TimeService>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<RoomNextQuestionDialogComponent>>;

    beforeEach(async () => {
        timeServiceMock = {
            startTimer: jasmine.createSpy(),
            timerExpired: new EventEmitter<void>(),
        };
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

        TestBed.configureTestingModule({
            declarations: [RoomNextQuestionDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: TimeService, useValue: timeServiceMock },
            ],
        });
        fixture = TestBed.createComponent(RoomNextQuestionDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should start a timer on component initialization', () => {
        expect(timeServiceMock.startTimer).toHaveBeenCalledWith(3);
    });

    it('should close the dialog when timerExpired is emitted', () => {
        (timeServiceMock as TimeService).startTimer(3);
        (timeServiceMock as TimeService).timerExpired.emit();

        fixture.detectChanges();

        expect(dialogRefMock.close).toHaveBeenCalled();
    });
});
