/* eslint-disable @typescript-eslint/no-magic-numbers */
// we disable some lint to simplify some test
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ListOfQrlAnswer } from '@app/interfaces/list-qrl-answer';
import { RoomsService } from '@app/services/rooms.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { QrlCorrectionDialogComponent } from './qrl-correction-dialog.component';

describe('QrlCorrectionDialogComponent', () => {
    let component: QrlCorrectionDialogComponent;
    let fixture: ComponentFixture<QrlCorrectionDialogComponent>;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<QrlCorrectionDialogComponent>>;
    let roomServiceMock: jasmine.SpyObj<RoomsService>;

    const mockAnswer: ListOfQrlAnswer = {
        playerId: '123456789',
        username: 'Test',
        answer: 'Yes',
        point: 10,
        score: 20,
    };

    beforeEach(async () => {
        socketServiceMock = jasmine.createSpyObj('SocketClientService', [
            'on',
            'send',
            'off',
            'isSocketAlive',
            'connect',
            'sendScoreQrlToClient',
            'sendDataCorrectionQrlToServer',
        ]);
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);
        roomServiceMock = jasmine.createSpyObj('RoomsService', ['getRoomCode']);

        await TestBed.configureTestingModule({
            declarations: [QrlCorrectionDialogComponent],
            imports: [MatDialogModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: RoomsService, useValue: roomServiceMock },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        dialogAnswerList: [
                            {
                                playerId: '123456789',
                                username: 'Test',
                                answer: 'Yes',
                                point: 10,
                                score: 20,
                            },
                            {
                                playerId: '987654321',
                                username: 'Test2',
                                answer: 'Yes2',
                                point: 10,
                                score: 40,
                            },
                        ],
                    },
                },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(QrlCorrectionDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize currentAnswer with the first element of listOfAnswer', () => {
        component.currentAnswerIndex = 0;
        component.ngOnInit();
        expect(component.currentAnswer).toEqual({
            playerId: '123456789',
            username: 'Test',
            answer: 'Yes',
            point: 10,
            score: 20,
        });
    });

    it('should increment currentAnswerIndex and set currentAnswer to next answer', () => {
        component.currentAnswerIndex = 0;
        component.currentAnswer = component.listOfAnswer[component.currentAnswerIndex];
        component.nextAnswer();
        expect(component.currentAnswerIndex).toBe(1);
        expect(component.currentAnswer).toBe(component.listOfAnswer[1]);
    });

    it('should set currentScore to 0', () => {
        component.currentScore = 10;
        component.incrementZero();
        expect(component.currentScore).toBe(0);
    });

    it('should set the currentScore to 5 when point is 10 with increment50()', () => {
        const NUMBER_FIVE = 5;
        component.currentAnswerIndex = 0;
        component.currentAnswer = component.listOfAnswer[component.currentAnswerIndex];
        component.increment50();
        expect(component.currentScore).toBe(NUMBER_FIVE);
    });

    it('should set the currentScore to 10 when point is 10 with increment100()', () => {
        const NUMBER_TEN = 10;
        component.currentAnswerIndex = 0;
        component.currentAnswer = component.listOfAnswer[component.currentAnswerIndex];
        component.increment100();
        expect(component.currentScore).toBe(NUMBER_TEN);
    });

    it('should submit correction and close dialog when all answers are corrected', () => {
        component.listOfAnswer = [
            {
                playerId: '123456789',
                username: 'Test',
                answer: 'Yes',
                point: 10,
                score: 20,
            },
        ];
        component.currentAnswerIndex = 0;
        component.currentScore = 15;
        component.submitCorrection();
        expect(component.currentScore).toEqual(0);
        expect(component.currentAnswerIndex).toEqual(1);
        expect(socketServiceMock.sendScoreQrlToClient).toHaveBeenCalledWith(roomServiceMock.getRoomCode(), component.listOfAnswer);
        expect(dialogRefMock.close).toHaveBeenCalled();
    });

    it('should submit correction and move to next answer when there are more answers to correct', () => {
        component.currentAnswerIndex = 0;
        component.currentScore = 15;
        component.submitCorrection();
        expect(component.currentScore).toEqual(0);
        expect(component.currentAnswerIndex).toEqual(1);
        expect(socketServiceMock.sendScoreQrlToClient).not.toHaveBeenCalled();
        expect(dialogRefMock.close).not.toHaveBeenCalled();
    });

    it('should close dialog when "kickOrganizer" event is emitted by socket', () => {
        const kickOrganizerCallback = socketServiceMock.on.calls.mostRecent().args[1];
        expect(kickOrganizerCallback).toBeDefined();
        kickOrganizerCallback(undefined);
        expect(dialogRefMock.close).toHaveBeenCalled();
    });

    it('should increment amount0, amount50, or amount100 based on percentage', () => {
        component.amount0 = 0;
        component.amount50 = 0;
        component.amount100 = 0;
        component.currentAnswer = mockAnswer;

        component.searchPercentageIncrementation(0);
        component.searchPercentageIncrementation(5);
        component.searchPercentageIncrementation(10);

        expect(component.amount0).toBe(1);
        expect(component.amount50).toBe(1);
        expect(component.amount100).toBe(1);
    });
});
