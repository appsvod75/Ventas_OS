let io = null;

function initIO(server) {
    const { Server } = require('socket.io');

    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:4000', 'http://localhost:5173'];

    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (allowedOrigins.indexOf(origin) === -1) {
                    return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
                }
                return callback(null, true);
            },
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
}

function getIO() {
    return io;
}

module.exports = { initIO, getIO };
