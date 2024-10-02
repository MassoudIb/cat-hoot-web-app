import { SocketTestHelper } from './socket-test-helper';

describe('SocketTestHelper', () => {
    let socketTestHelper: SocketTestHelper;

    beforeEach(() => {
        socketTestHelper = new SocketTestHelper();
    });

    it('should correctly emit events', () => {
        const spy = spyOn(console, 'log');
        const eventName = 'testEvent';
        const args = ['arg1', 'arg2'];

        socketTestHelper.emit(eventName, ...args);

        expect(spy).toHaveBeenCalledWith(jasmine.stringMatching(`Emit called with event: ${eventName} and args:`), args);
    });
    it('should remove callbacks for an event', () => {
        const callback = jasmine.createSpy('callback');
        const eventName = 'testEvent';

        socketTestHelper.on(eventName, callback);
        socketTestHelper.off(eventName);
        socketTestHelper.peerSideEmit(eventName);

        expect(callback).not.toHaveBeenCalled();
    });
    it('should have a disconnect method that can be called', () => {
        expect(socketTestHelper.disconnect).toBeDefined();
        expect(() => socketTestHelper.disconnect()).not.toThrow();
    });
    it('should handle cases where callbacks associated with the given event throw errors', () => {
        const callback = jasmine.createSpy('callback').and.throwError('Error');
        const eventName = 'testEvent';

        socketTestHelper.on(eventName, callback);

        expect(() => socketTestHelper.peerSideEmit(eventName)).not.toThrow();
    });
});
