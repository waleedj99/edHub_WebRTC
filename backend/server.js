const express = require('express');
const socketIo = require('socket.io');
const https = require('https');
const router = require('./router');
// const cors = require('cors');
const config = require('./config');
const fs = require('fs');
const mediasoup = require('mediasoup');
const { AwaitQueue } = require('awaitqueue');
const Room = require('./src/Room');
const Peer = require('./src/Peer');
const Logger = require('./src/Logger');

const { addUser, getUser, getUsersInRoom } = require('./user');

const queue = new AwaitQueue();

const logger = new Logger('Server');

// HTTPS server.
// @type {https.Server}
let httpsServer;

// Express application.
// @type {Function}
let expressApp;

// mediasoup Workers.
// @type {Array<mediasoup.Worker>}
const mediasoupWorkers = [];

// Map of Room instances indexed by roomId.
const rooms = new Map();

// Map of Peer instances indexed by peerId.
const peers = new Map();

// socketIO
let io;

async function run() {

    //Run mediasoup workers
    await runMediasoupWorkers();

    //Create Express App
    await createExpressApp();

    //Run Https server
    await runHttpsServer();

    // Run SocketIO Websocket server
    await runSocketIOServer();
}

/**
 * Launch as many mediasoup Workers as given in the configuration file.
 */
async function runMediasoupWorkers() {

    const { numWorkers } = config.mediasoup;

    logger.info(`running ${numWorkers} mediasoup Workers...`);

    for (let i = 0; i < numWorkers; ++i) {
        const worker = await mediasoup.createWorker(
            {
                logLevel: config.mediasoup.workerSettings.logLevel,
                logTags: config.mediasoup.workerSettings.logTags,
                rtcMinPort: Number(config.mediasoup.workerSettings.rtcMinPort),
                rtcMaxPort: Number(config.mediasoup.workerSettings.rtcMaxPort)
            });

        worker.on('died', () => {
            logger.error('mediasoup Worker died, exiting  in 2 seconds... [pid:%d]', worker.pid);
            setTimeout(() => process.exit(1), 2000);
        });

        mediasoupWorkers.push(worker);

        // Log worker resource usage every X seconds.
        // setInterval(async () => {
        //     const usage = await worker.getResourceUsage();
        //     logger.log(`mediasoup Worker resource usage [pid:${worker.pid}]:`,usage);
        // }, 120000);
    }
}

async function createExpressApp() {
    logger.info(`creating Express app...`);
    expressApp = express();
    expressApp.use(express.json());
    // expressApp.use(cors());
    if (process.env.MODE === 'deploy') {
        expressApp.use(express.static('public'));
        expressApp.use((req, res) => res.sendFile(`${__dirname}/public/index.html`));
    }
    else {
        expressApp.use(router);
    }
}


/**
 * Create a Node.js HTTPS server. It listens in the IP and port given in the
 * configuration file and reuses the Express application as request listener.
 */
async function runHttpsServer() {
    logger.info('running an HTTPS server...');

    // HTTPS server for the protoo WebSocket server.
    const tls = {
        cert: fs.readFileSync(config.https.sslCrt),
        key: fs.readFileSync(config.https.sslKey),
    };

    httpsServer = https.createServer(tls, expressApp);
    httpsServer.on('error', (e) => {
        logger.error('https server error,', e.message);
    });

    await new Promise((resolve) => {
        httpsServer.listen(
            Number(config.https.listenPort), config.https.listenIp, () => {
                logger.info(`server is running and listening on https://${config.https.listenIp}:${config.https.listenPort}`);
                resolve();
            });
    });
}

async function runSocketIOServer() {

    io = socketIo(httpsServer);

    //Handle connection from Clients.
    io.on('connection', (socket) => {
        logger.info(`We have a new connection ${socket.id}`);

        // const { roomId, peerId } = socket.handshake.query;
        // let roomId, peerId
        socket.on('join', ({ peerId, roomId ,permissions}) => {
            logger.warn('I came here')
            logger.warn(roomId, peerId);

            // logger.warn(roomId,peerId);
            if (!roomId || !peerId) {
                logger.warn('connection request without roomId and/or peerId');

                socket.disconnect(true);

                return;
            }


            logger.info('connection request [roomId:"%s", peerId:"%s"]', roomId, peerId);

            queue.push(async () => {

                // const { token } = socket.handshake.session;
                token = "Mohit";

                const room = await getOrCreateRoom({ roomId });

                let peer = peers.get(peerId);
                let returning = false;

                if (peer && !token) { // Don't allow hijacking sessions
                    socket.disconnect(true);

                    return;
                }
                else if (token && room.verifyPeer({ id: peerId, token })) { // Returning user, remove if old peer exists
                    if (peer)
                        peer.close();

                    // returning = true;
                }

                peer = new Peer({ id: peerId, roomId, socket,permissions });

                peers.set(peerId, peer);

                peer.on('close', () => {
                    peers.delete(peerId);

                    statusLog();
                });

                // if (Boolean(socket.handshake.session.passport) && Boolean(socket.handshake.session.passport.user)) {
                //     const {
                //         id,
                //         displayName,
                //         picture,
                //         email,
                //         _userinfo
                //     } = socket.handshake.session.passport.user;

                //     peer.authId = id;
                //     peer.displayName = displayName;
                //     peer.picture = picture;
                //     peer.email = email;
                //     peer.authenticated = true;

                //     if (typeof config.userMapping === 'function') {
                //         await config.userMapping({ peer, roomId, userinfo: _userinfo });
                //     }
                // }

                logger.log('about to call room.handlePeer with');
                room.handlePeer({ peer, returning });

                statusLog();
            })
                .catch((error) => {
                    logger.error('room creation or room joining failed [error:"%o"]', error);

                    if (socket)
                        socket.disconnect(true);

                    return;
                });

        });

        // socket.on('join', ({ name, room }, callback) => {
        //     const { error, user } = addUser({ id: socket.id, name, room });

        //     if (error) return callback(error);

        //     socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the room ${user.room}` });
        //     socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!!` });

        //     socket.join(user.room);

        //     io.to(user.room).emit('roomData', { users: getUsersInRoom(user.room) });
        //     callback();
        // });

        // socket.on('sendMessage', (message, callback) => {
        //     const user = getUser(socket.id);
        //     io.to(user.room).emit('message', { user: user.name, text: message });
        //     callback();
        // });

        socket.on('disconnect', () => {
            logger.info(`Socket has disconnected`);
        });
    });
}


function statusLog() {
    logger.info(`Number of rooms: ${rooms.size}`);
    logger.info(`Number of peers: ${peers.size}`);
    // if (statusLogger)
    // {
    // 	statusLogger.log({
    // 		rooms : rooms,
    // 		peers : peers
    // 	});
    // }
}


/**
 * Get a Room instance (or create one if it does not exist).
 */
async function getOrCreateRoom({ roomId }) {
    let room = rooms.get(roomId);

    // If the Room does not exist create a new one.
    if (!room) {
        logger.info('creating a new Room [roomId:"%s"]', roomId);

        // const mediasoupWorker = getMediasoupWorker();

        room = await Room.create({ mediasoupWorkers, roomId });

        rooms.set(roomId, room);

        statusLog();

        room.on('close', () => {
            rooms.delete(roomId);

            statusLog();
        });
    }

    return room;
}

run();