import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { PlayerHeaderComponent } from './player-header.component';

describe('PlayerHeaderComponent', () => {
    let component: PlayerHeaderComponent;
    let fixture: ComponentFixture<PlayerHeaderComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [PlayerHeaderComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PlayerHeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
