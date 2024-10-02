/* eslint-disable @typescript-eslint/no-explicit-any */
// we needed any type in the test
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeDetectorRef, SimpleChanges } from '@angular/core';
import { Result } from '@app/interfaces/result';
import { DialogService } from '@app/services/dialog.service';
import { GameService } from '@app/services/game.service';
import { Subject } from 'rxjs';
import { HistogramComponent } from './histogram.component';

describe('HistogramComponent', () => {
    let component: HistogramComponent;
    let fixture: ComponentFixture<HistogramComponent>;
    let gameServiceMock: jasmine.SpyObj<GameService>;
    let changeDetectorRefMock: jasmine.SpyObj<ChangeDetectorRef>;
    let dialogServiceMock: jasmine.SpyObj<DialogService>;
    const resultUpdatedSubject = new Subject<Result>();

    beforeEach(async () => {
        gameServiceMock = jasmine.createSpyObj('GameService', ['resultUpdated', 'subscribe']);
        gameServiceMock.resultUpdated = resultUpdatedSubject.asObservable();

        changeDetectorRefMock = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);
        await TestBed.configureTestingModule({
            declarations: [HistogramComponent],
            providers: [
                { provide: GameService, useValue: gameServiceMock },
                { provide: ChangeDetectorRef, useValue: changeDetectorRefMock },
                { provide: DialogService, useValue: dialogServiceMock },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(HistogramComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set options object with correct properties when result.choices is truthy', () => {
        component.result = {
            choices: [
                { choice: 'Choice 1', numberOfAnswers: 5, isCorrect: true },
                { choice: 'Choice 2', numberOfAnswers: 10, isCorrect: false },
            ],
            text: 'Result Text',
        };

        component.setOptions();

        expect(component.options.chart.type).toBe('bar');
        expect(component.options.title.text).toBe('Result Text');
        expect(component.options.xAxis.categories).toEqual(['Choice 1', 'Choice 2']);
        expect(component.options.yAxis.title.text).toBe('Nombre de réponses');
        expect(component.options.series[0].data).toEqual([
            { name: 'Choice 1', y: 5, color: '#28a745' },
            { name: 'Choice 2', y: 10, color: '#dc3545' },
        ]);
    });

    it('should update the chart options with the new result data', () => {
        component.options = {
            title: {
                text: '',
            },
            xAxis: {
                categories: [],
            },
            choices: [
                { choice: '', numberOfAnswers: 0, isCorrect: false },
                { choice: '', numberOfAnswers: 0, isCorrect: true },
            ],
            series: [
                {
                    name: '',
                    data: [],
                    color: '#FFFFFF',
                },
            ],
        };
        component.result = {
            text: 'Test Result',
            choices: [
                { choice: 'Choice 1', numberOfAnswers: 5, isCorrect: true },
                { choice: 'Choice 2', numberOfAnswers: 3, isCorrect: false },
            ],
        };

        component.updateChart();

        expect(component.options.title.text).toBe('Test Result');
        expect(component.options.xAxis.categories).toEqual(['Choice 1', 'Choice 2']);
        expect(component.options.series[0].data).toEqual([
            { name: 'Choice 1', y: 5, color: '#28a745' },
            { name: 'Choice 2', y: 3, color: '#dc3545' },
        ]);
    });
    it('should call updateChart and redraw when result input changes and options and chart are defined', () => {
        component.options = {};
        component.chart = jasmine.createSpyObj('chart', ['redraw']);
        spyOn(component, 'updateChart');
        component.result = { text: 'Resultat', choices: [{ choice: 'choix1', isCorrect: true, numberOfAnswers: 3 }] };
        const changes = { result: { currentValue: {}, previousValue: null } };

        component.ngOnChanges(changes as unknown as SimpleChanges);

        expect(component.updateChart).toHaveBeenCalled();
        expect(component.chart.redraw).toHaveBeenCalled();
    });

    it('should call this.chart.update when options and chart are defined', () => {
        component.options = {
            title: {
                text: '',
            },
            xAxis: {
                categories: [],
            },
            choices: [
                { choice: '', numberOfAnswers: 0, isCorrect: false },
                { choice: '', numberOfAnswers: 0, isCorrect: true },
            ],
            series: [
                {
                    name: '',
                    data: [],
                    color: '#FFFFFF',
                },
            ],
        };
        component.chart = {
            update: jasmine.createSpy('update'),
        };
        component.result = {
            text: 'Test Result',
            choices: [],
        };

        component.updateChart();

        expect(component.chart.update).toHaveBeenCalledWith(component.options);
    });
});
