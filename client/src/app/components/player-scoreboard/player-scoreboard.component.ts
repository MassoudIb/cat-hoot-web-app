import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-player-scoreboard',
    templateUrl: './player-scoreboard.component.html',
    styleUrls: ['./player-scoreboard.component.scss'],
})
export class PlayerScoreboardComponent {
    @Input() score: number = 0;
}
