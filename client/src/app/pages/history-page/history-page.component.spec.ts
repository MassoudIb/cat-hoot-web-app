import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';
import { of } from 'rxjs';
import { HistoryPageComponent } from './history-page.component';

describe('HistoryPageComponent', () => {
    let component: HistoryPageComponent;
    let fixture: ComponentFixture<HistoryPageComponent>;
    let quizzesRequestServiceMock: jasmine.SpyObj<QuizzesRequestService>;

    beforeEach(async () => {
        quizzesRequestServiceMock = jasmine.createSpyObj('QuizzesRequestService', ['getGameHistory', 'resetGameHistory']);
        quizzesRequestServiceMock.getGameHistory.and.returnValue(
            of([{ quizName: 'Quiz on cats', startTime: new Date(), playerCount: 1, topScore: 150 }]),
        );
        quizzesRequestServiceMock.resetGameHistory.and.returnValue(of(undefined));

        await TestBed.configureTestingModule({
            declarations: [HistoryPageComponent],
            imports: [HttpClientTestingModule],
            providers: [{ provide: QuizzesRequestService, useValue: quizzesRequestServiceMock }],
        }).compileComponents();

        fixture = TestBed.createComponent(HistoryPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load history on init', fakeAsync(() => {
        component.loadHistory('startTime', 'asc');
        tick();
        expect(quizzesRequestServiceMock.getGameHistory).toHaveBeenCalledWith('startTime', 'asc');
        expect(component.gameHistory.length).toBeGreaterThan(0);
    }));

    it('should sort by name', fakeAsync(() => {
        component.loadHistory('quizName', 'asc');
        tick();
        expect(component.activeSort).toBe('name');
        expect(component.sortOrderTime).toBe('asc');
    }));

    it('should reset history and reload', fakeAsync(() => {
        component.activeSort = 'time';
        component.resetHistory();
        tick();
        expect(quizzesRequestServiceMock.resetGameHistory).toHaveBeenCalled();
        expect(quizzesRequestServiceMock.getGameHistory).toHaveBeenCalledTimes(2);
    }));

    it('should reset history and reload', fakeAsync(() => {
        component.activeSort = 'name';
        component.resetHistory();
        tick();
        expect(quizzesRequestServiceMock.resetGameHistory).toHaveBeenCalled();
        expect(quizzesRequestServiceMock.getGameHistory).toHaveBeenCalledTimes(2);
    }));
});
