import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListPlayerResultComponent } from './list-player-result.component';

describe('ListPlayerResultComponent', () => {
    let component: ListPlayerResultComponent;
    let fixture: ComponentFixture<ListPlayerResultComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [ListPlayerResultComponent],
        });
        fixture = TestBed.createComponent(ListPlayerResultComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
