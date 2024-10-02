import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnavailableQuizComponent } from './unavailable-quiz.component';

describe('UnavailableQuizComponent', () => {
    let component: UnavailableQuizComponent;
    let fixture: ComponentFixture<UnavailableQuizComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [UnavailableQuizComponent],
        });
        fixture = TestBed.createComponent(UnavailableQuizComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
