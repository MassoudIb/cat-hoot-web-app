import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { DialogService } from '@app/services/dialog.service';
import { SocketClientService } from '@app/services/socket-service.service';
import { PlayerLeaveComponent } from './player-leave-page.component';

describe('PlayerLeaveComponent', () => {
    let component: PlayerLeaveComponent;
    let fixture: ComponentFixture<PlayerLeaveComponent>;
    let mockDialogService: jasmine.SpyObj<DialogService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;

    beforeEach(async () => {
        mockDialogService = jasmine.createSpyObj('DialogService', ['closeDialog']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        socketServiceMock = jasmine.createSpyObj('SocketClientService', ['on', 'send', 'off', 'isSocketAlive', 'connect', 'leaveRoom', 'disconnect']);

        await TestBed.configureTestingModule({
            declarations: [PlayerLeaveComponent],
            imports: [RouterTestingModule],
            providers: [
                { provide: DialogService, useValue: mockDialogService },
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: Router, useValue: mockRouter },
                { provide: SocketClientService, useValue: socketServiceMock },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(PlayerLeaveComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close dialog on "noLeave"', () => {
        component.noLeave();
        expect(mockDialogService.closeDialog).toHaveBeenCalled();
    });

    it('should navigate to home page when yesLeave is called', () => {
        component.yesLeave();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
        expect(socketServiceMock.disconnect).toHaveBeenCalled();
        expect(socketServiceMock.connect).toHaveBeenCalled();
    });
});
