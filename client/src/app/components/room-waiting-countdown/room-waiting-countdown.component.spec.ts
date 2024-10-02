/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disable some lint to simplify some test
import { EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { TimeService } from '@app/services/time.service';
import { of } from 'rxjs';
import { RoomWaitingCountdownComponent } from './room-waiting-countdown.component';

describe('RoomWaitingCountdownComponent', () => {
    let component: RoomWaitingCountdownComponent;
    let fixture: ComponentFixture<RoomWaitingCountdownComponent>;
    let quizzesRequestServiceMock: Partial<QuizzesRequestService>;
    let timeServiceMock: Partial<TimeService>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<RoomWaitingCountdownComponent>>;

    beforeEach(async () => {
        quizzesRequestServiceMock = {
            getQuiz: jasmine.createSpy().and.returnValue(of({ id: '1', title: 'Sample Quiz' })),
            quizzes$: of([]),
        };
        timeServiceMock = {
            startTimer: jasmine.createSpy(),
            timerExpired: new EventEmitter<void>(),
        };
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            declarations: [RoomWaitingCountdownComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: QuizzesRequestService, useValue: quizzesRequestServiceMock },
                { provide: TimeService, useValue: timeServiceMock },
                { provide: MAT_DIALOG_DATA, useValue: { quizId: '1' } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(RoomWaitingCountdownComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize quiz data from the provided quiz ID', () => {
        expect(quizzesRequestServiceMock.getQuiz).toHaveBeenCalledWith('1');
        expect(component.quizTitle).toEqual('Sample Quiz');
    });

    it('should start a timer on component initialization', () => {
        expect(timeServiceMock.startTimer).toHaveBeenCalledWith(5);
    });

    it('should close the dialog when timerExpired is emitted', () => {
        (timeServiceMock as TimeService).startTimer(5);
        (timeServiceMock as TimeService).timerExpired.emit();

        fixture.detectChanges();

        expect(dialogRefMock.close).toHaveBeenCalled();
    });
});
