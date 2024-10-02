import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { SocketClientService } from '@app/services/socket-service.service';
import { RoomsService } from '@app/services/rooms.service';
import { RoomCodeDialogComponent } from './room-code-dialog.component';

describe('RoomCodeDialogComponent', () => {
    let component: RoomCodeDialogComponent;
    let fixture: ComponentFixture<RoomCodeDialogComponent>;
    let socketServiceMock: jasmine.SpyObj<SocketClientService>;
    let roomsServiceMock: jasmine.SpyObj<RoomsService>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<RoomCodeDialogComponent>>;
    let router: Router;

    beforeEach(async () => {
        socketServiceMock = jasmine.createSpyObj('SocketClientService', ['send', 'on', 'off']);
        roomsServiceMock = jasmine.createSpyObj('RoomsService', ['setRoomCode']);
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [MatDialogModule, RouterTestingModule],
            declarations: [RoomCodeDialogComponent],
            providers: [
                { provide: SocketClientService, useValue: socketServiceMock },
                { provide: RoomsService, useValue: roomsServiceMock },
                { provide: MatDialogRef, useValue: dialogRefMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(RoomCodeDialogComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('should validate code and handle locked room', () => {
        const roomCode = '1234';
        component.configureBaseSocketFeatures();
        socketServiceMock.on.calls.argsFor(0)[1](true);

        component.validateCode(roomCode);

        expect(component.errorMessage).toEqual('Cette partie est verrouillée.');
    });

    it('should validate code and navigate on success', () => {
        const roomCode = '1234';
        const navigateSpy = spyOn(router, 'navigate');

        component.configureBaseSocketFeatures();
        socketServiceMock.on.calls.argsFor(1)[1](true);

        component.validateCode(roomCode);
        fixture.detectChanges();

        expect(navigateSpy).toHaveBeenCalledWith(['/vueAttente']);
        expect(dialogRefMock.close).toHaveBeenCalled();
    });

    it('should show error message on invalid code', () => {
        const roomCode = 'invalid';
        component.configureBaseSocketFeatures();
        socketServiceMock.on.calls.argsFor(1)[1](false);

        component.validateCode(roomCode);
        fixture.detectChanges();

        expect(component.errorMessage).toEqual('Ce code est invalide.');
    });

    it('should validate code and navigate on success', () => {
        const roomCode = '1234';
        const navigateSpy = spyOn(router, 'navigate');

        component.configureBaseSocketFeatures();
        socketServiceMock.on.calls.argsFor(0)[1](false);

        component.validateCode(roomCode);
        fixture.detectChanges();

        expect(navigateSpy).toHaveBeenCalledWith(['/vueAttente']);
        expect(dialogRefMock.close).toHaveBeenCalled();
    });
});
