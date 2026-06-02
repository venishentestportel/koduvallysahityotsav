const { Server } = require('socket.io');

let io;

function initSockets(server) {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('Frontend connected:', socket.id);
        
        socket.on('disconnect', () => {
            console.log('Frontend disconnected:', socket.id);
        });
    });
}

function getIo() {
    return io;
}

module.exports = {
    initSockets,
    getIo
};
