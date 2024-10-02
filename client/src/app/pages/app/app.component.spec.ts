import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from '@app/pages/app/app.component';
import { SocketClientService } from '@app/services/socket-service.service';

class MockSocketClientService {
    socket = { id: '123' };
    isSocketAlive() {
        return false;
    }

    // we disable some lint to simplify some test
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    connect() {}
}

describe('AppComponent', () => {
    let component: AppComponent;
    let fixture: ComponentFixture<AppComponent>;
    let mockSocketService: MockSocketClientService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [{ provide: SocketClientService, useClass: MockSocketClientService }],
            declarations: [AppComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        mockSocketService = TestBed.inject(SocketClientService) as unknown as MockSocketClientService;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('ngOnInit should call connect', () => {
        spyOn(component, 'connect');
        component.ngOnInit();
        expect(component.connect).toHaveBeenCalled();
    });

    it('connect should call socketService.connect when socket is not alive', () => {
        spyOn(mockSocketService, 'connect');
        component.connect();
        expect(mockSocketService.connect).toHaveBeenCalled();
    });

    it('socketId should return empty string when socket ID is not available', () => {
        mockSocketService.socket.id = '';
        expect(component.socketId).toEqual('');
    });

    it('should return socket id when socket is alive', () => {
        expect(component.socketId).toEqual('123');
    });

    it('should remove navigating from sessionStorage et navigate to /home page', () => {
        spyOn(sessionStorage, 'getItem').and.callFake((key: string) => {
            if (key === 'navigating') {
                return 'false';
            }
            return null;
        });
        spyOn(sessionStorage, 'removeItem');
        const router = TestBed.inject(Router);
        const navigateSpy = spyOn(router, 'navigate');

        component.ngOnInit();

        expect(sessionStorage.getItem).toHaveBeenCalledWith('navigating');
        expect(sessionStorage.removeItem).toHaveBeenCalledWith('navigating');
        expect(navigateSpy).toHaveBeenCalledWith(['/home']);
    });
});
