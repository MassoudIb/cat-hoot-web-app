import { Server } from 'app/server';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { Socket, io as ioClient } from 'socket.io-client';
import { Container } from 'typedi';
import { SocketManager } from './socket-manager.service';

const RESPONSE_DELAY = 200;
describe('SocketManager service tests', () => {
    let service: SocketManager;
    let server: Server;
    let clientSocket: Socket;

    const urlString = 'http://localhost:3000';

    beforeEach(async () => {
        server = Container.get(Server);
        server.init();
        service = server['socketManager'];
        clientSocket = ioClient(urlString);
        sinon.stub(console, 'log');
    });

    afterEach(() => {
        clientSocket.close();
        service['sio'].close();
        sinon.restore();
    });

    it('should trigger the "connection" event when a socket connects', () => {
        const spy = sinon.spy(service['sio'], 'on');
        service.handleSockets();
        assert(spy.calledWith('connection'));
    });
    it('should not broadcast message to room if origin socket is not in room', (done) => {
        const testMessage = 'Hello World';
        const spy = sinon.spy(service['sio'], 'to');
        clientSocket.emit('roomMessage', testMessage);

        setTimeout(() => {
            assert(spy.notCalled);
            done();
        }, RESPONSE_DELAY);
    });

    it('should broadcast message to room if origin socket is in room', (done) => {
        const testMessage = 'Hello World';
        clientSocket.emit('initLobby');
        clientSocket.on('createdRoom', (code: string) => {
            clientSocket.emit('joinRoom', { username: 'test', roomCode: code });
            clientSocket.emit('roomMessage', testMessage);

            setTimeout(() => {
                assert(service['roomManager'].hasRoom(code));
                done();
            }, RESPONSE_DELAY);
        });
    });
});
