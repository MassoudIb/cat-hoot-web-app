import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-list-player-result',
    templateUrl: './list-player-result.component.html',
    styleUrls: ['./list-player-result.component.scss'],
})
export class ListPlayerResultComponent {
    @Input() listOfPlayersWithDetails: { username: string; scores: number[]; bonusAmounts: number[] }[] = [];
}
