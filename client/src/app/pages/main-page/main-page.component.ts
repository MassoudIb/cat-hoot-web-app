import { Component } from '@angular/core';
import { DialogService } from '@app/services/dialog.service';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
})
export class MainPageComponent {
    constructor(public dialogService: DialogService) {}
}
