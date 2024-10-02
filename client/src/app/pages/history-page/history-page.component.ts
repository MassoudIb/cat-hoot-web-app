import { Component, OnInit } from '@angular/core';
import { GameHistoryEntry } from '@app/interfaces/history';
import { QuizzesRequestService } from '@app/services/quizzes-request.service';

@Component({
    selector: 'app-history-page',
    templateUrl: './history-page.component.html',
    styleUrls: ['./history-page.component.scss'],
})
export class HistoryPageComponent implements OnInit {
    gameHistory: GameHistoryEntry[] = [];
    activeSort: 'time' | 'name' = 'time';
    sortByTime: string = 'startTime';
    sortByName: string = 'quizName';
    sortOrderTime: 'asc' | 'desc' = 'asc';
    sortOrderName: 'asc' | 'desc' = 'asc';

    constructor(private quizzesRequestService: QuizzesRequestService) {}

    ngOnInit(): void {
        this.loadHistory(this.sortByTime, this.sortOrderTime);
    }

    loadHistory(sortBy: string, sortOrder: 'asc' | 'desc'): void {
        if (sortBy === this.sortByName) {
            this.activeSort = 'name';
            this.sortOrderName = sortOrder;
        } else if (sortBy === this.sortByTime) {
            this.activeSort = 'time';
            this.sortOrderTime = sortOrder;
        }

        this.quizzesRequestService.getGameHistory(sortBy, sortOrder).subscribe({
            next: (history) => {
                this.gameHistory = history;
            },
        });
    }

    resetHistory(): void {
        this.quizzesRequestService.resetGameHistory().subscribe({
            next: () => {
                this.loadHistory(
                    this.activeSort === 'time' ? this.sortByTime : this.sortByName,
                    this.activeSort === 'time' ? this.sortOrderTime : this.sortOrderName,
                );
            },
        });
    }
}
