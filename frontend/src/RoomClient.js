import Logger from './Logger';
import * as     mediasoupClient from 'mediasoup-client';
import constants from './settings';
import store from './redux/store';
import * as consumerActions from './redux/actions/consumerActions';
import * as producerActions from './redux/actions/producerActions';
import * as peerActions from './redux/actions/peerActions';
import * as userActions from './redux/actions/userActions';
import * as roomActions from './redux/actions/roomActions';
import * as lobbyPeerActions from './redux/actions/lobbyPeerActions';
import { signalingSocket } from './SocketClient';
import { permissions } from './permissions';

const logger = new Logger('RoomClient');

const { MODERATE_ROOM, END_MEETING, REMOVE_USER } = permissions;

const VIDEO_CONSTRAINS =
{
    'low':
    {
        width: { ideal: 320 },
        aspectRatio: 1.334
    },
    'medium':
    {
        width: { ideal: 640 },
        aspectRatio: 1.334
    },
    'high':
    {
        width: { ideal: 1280 },
        aspectRatio: 1.334
    },
    'veryhigh':
    {
        width: { ideal: 1920 },
        aspectRatio: 1.334
    },
    'ultra':
    {
        width: { ideal: 3840 },
        aspectRatio: 1.334
    }
};


const VIDEO_SIMULCAST_ENCODINGS =
    [
        { scaleResolutionDownBy: 4 },
        { scaleResolutionDownBy: 2 },
        { scaleResolutionDownBy: 1 }
    ];

// Used for VP9 webcam video.
const VIDEO_KSVC_ENCODINGS =
    [
        { scalabilityMode: 'S3T3_KEY' }
    ];

// Used for VP9 desktop sharing.
const VIDEO_SVC_ENCODINGS =
    [
        { scalabilityMode: 'S3T3', dtx: true }
    ];


export default class RoomClient {
    constructor() {
        this._peerId = null;
        this._startDevicesListener();

        this._chatHistory = {};

        this._canvasHistory = [];

        // Closed flag.
        this._closed = false;

        this._muted = false;

        // Whether simulcast should be used for sharing
        this._useSharingSimulcast = false;

        // Local webcam mediasoup Producer.
        this._webcamProducer = null;

        // Local mic mediasoup Producer.
        this._micProducer = null;

        // Transport for sending.
        this._sendTransport = null;

        // Wether we should produce
        this._produce = true;

        // mediasoup-client Device instance.
        // @type {mediasoupClient.Device}
        this._mediasoupDevice = null;

        // Map of webcam MediaDeviceInfos indexed by deviceId.
        // @type {Map<String, MediaDeviceInfos>}
        this._webcams = {};
        this._audioDevices = {};
        this._audioOutputDevices = {};

        // mediasoup Consumers.
        // @type {Map<String, mediasoupClient.Consumer>}
        this._consumers = new Map();

        this._screenSharing = null;

        this._screenSharingProducer = null;
        this._recordedBlobs = [];
        this._mediaRecorder = null;

    }
    hello() {
        logger.warn('Hello from room Client');
    }
    async join({ role, userName, userId, classroomId, joinVideo, joinAudio, permissions }) {
        logger.log('join payload', role, userName, userId, classroomId, joinVideo, joinAudio, permissions);
        // console.log(name, roomId, joinVideo, joinAudio);

        this._roomId = classroomId;
        this._userName = userName;
        this._peerId = userId;
        this._role = role;


        store.dispatch(userActions.setuser({ userId, userName }));
        // this._signalingUrl = this._getSignalingUrl(this._peerId, roomId);
        // this._signalingSocket = socketClient(this._signalingUrl, opts);
        this._signalingSocket = signalingSocket;
        logger.warn(this._signalingSocket);

        // this._signalingSocket.on('connect', async () => {
        logger.log(`signaling Peer "connect" event`);
        this._signalingSocket.emit('join', { peerId: this._peerId, roomId: this._roomId, permissions });
        // });

        this._signalingSocket.on('disconnect', (reason) => {
            logger.log(`signaling Peer "disconnect" event reason = ${reason}`);
        });

        this._signalingSocket.on('request', async (request, cb) => {
            logger.log(
                'socket "request" event [method:"%s", data:"%o"]',
                request.method, request.data);

            switch (request.method) {
                case 'newConsumer': {
                    const {
                        peerId,
                        producerId,
                        id,
                        kind,
                        rtpParameters,
                        type,
                        appData,
                        producerPaused
                    } = request.data;

                    const consumer = await this._recvTransport.consume(
                        {
                            id,
                            producerId,
                            kind,
                            rtpParameters,
                            appData: { ...appData, peerId } // Trick.
                        });

                    // Store in the map.
                    this._consumers.set(consumer.id, consumer);

                    consumer.on('transportclose', () => {
                        this._consumers.delete(consumer.id);
                    });

                    const { spatialLayers, temporalLayers } =
                        mediasoupClient.parseScalabilityMode(
                            consumer.rtpParameters.encodings[0].scalabilityMode);

                    //TODO: call dispatch here
                    store.dispatch(consumerActions.addConsumer(
                        {
                            id: consumer.id,
                            peerId: peerId,
                            kind: kind,
                            type: type,
                            locallyPaused: false,
                            remotelyPaused: producerPaused,
                            rtpParameters: consumer.rtpParameters,
                            source: consumer.appData.source,
                            spatialLayers: spatialLayers,
                            temporalLayers: temporalLayers,
                            preferredSpatialLayer: spatialLayers - 1,
                            preferredTemporalLayer: temporalLayers - 1,
                            priority: 1,
                            codec: consumer.rtpParameters.codecs[0].mimeType.split('/')[1],
                            track: consumer.track
                        },
                        peerId));

                    cb(null);
                    break;
                }
                default: {
                    break;
                }
            }
        });

        this._signalingSocket.on('notification', async (notification) => {
            logger.log(`socket "notification event [method:"%s", data:"%o"]"`, notification.method, notification.data);
            try {
                switch (notification.method) {
                    case 'enteredLobby':
                        {
                            store.dispatch(roomActions.setInLobby(true));

                            // const { displayName } = store.getState().settings;
                            // const { picture } = store.getState().me;

                            // await this.sendRequest('changeDisplayName', { displayName });
                            // await this.sendRequest('changePicture', { picture });
                            break;
                        }
                    case 'roomReady':
                        {
                            // const { turnServers } = notification.data;

                            // this._turnServers = turnServers;

                            store.dispatch(roomActions.toggleJoined());
                            store.dispatch(roomActions.setInLobby(false));

                            await this._joinRoom({ joinVideo, joinAudio });

                            break;
                        }
                    case 'roomBack': {
                        await this._joinRoom({ joinVideo, joinAudio });
                        break;
                    }
                    case 'newPeer': {
                        const { id, roles } = notification.data;
                        logger.log(`I got you bro newPeer`, id, roles);
                        store.dispatch(
                            peerActions.addPeer({ id, roles, consumers: [] }));
                        // TODO: sound notification
                        // this._soundNotification();
                        break;
                    }
                    case 'peerClosed': {
                        const { peerId } = notification.data;

                        store.dispatch(
                            peerActions.removePeer(peerId));

                        break;
                    }
                    case 'producerScore': {
                        const { producerId, score } = notification.data;
                        logger.log(`producerScore`, producerId, score);
                        // store.dispatch(
                        //     producerActions.setProducerScore(producerId, score));

                        break;
                    }

                    case 'consumerClosed': {
                        const { consumerId } = notification.data;
                        const consumer = this._consumers.get(consumerId);

                        if (!consumer)
                            break;

                        consumer.close();

                        if (consumer.hark != null)
                            consumer.hark.stop();

                        this._consumers.delete(consumerId);

                        const { peerId } = consumer.appData;

                        store.dispatch(
                            consumerActions.removeConsumer(consumerId, peerId));

                        break;
                    }

                    case 'consumerPaused': {
                        const { consumerId } = notification.data;
                        const consumer = this._consumers.get(consumerId);

                        if (!consumer)
                            break;

                        store.dispatch(
                            consumerActions.setConsumerPaused(consumerId, 'remote'));

                        break;
                    }

                    case 'consumerResumed': {
                        const { consumerId } = notification.data;
                        const consumer = this._consumers.get(consumerId);

                        if (!consumer)
                            break;

                        store.dispatch(
                            consumerActions.setConsumerResumed(consumerId, 'remote'));

                        break;
                    }
                    case 'moderator:kick': {
                        // Need some feedback
                        this.close();
                        break;
                    }
                    case 'moderator:mute': {
                        this.muteMic();
                        break;
                    }
                    case 'moderator:stopVideo':
                        {
                            this.disableWebcam();

                            // store.dispatch(requestActions.notify(
                            // 	{
                            // 		text: intl.formatMessage({
                            // 			id: 'moderator.muteVideo',
                            // 			defaultMessage: 'Moderator stopped your video'
                            // 		})
                            // 	}));

                            break;
                        }
                    case 'moderator:requestPeerVideo':
                        {
                            logger.log('moderator:requestPeerVideo is requested');
                        }
                    case 'raisedHand':
                        {
                            logger.log('RaisedHand', notification.data);
                            const {
                                peerId,
                                raisedHand,
                                raisedHandTimestamp
                            } = notification.data;

                            store.dispatch(
                                peerActions.setPeerRaisedHand(
                                    peerId,
                                    raisedHand,
                                    raisedHandTimestamp
                                )
                            );
                            break;
                        }
                    case 'enableWaitingRoom':
                        {
                            store.dispatch(
                                roomActions.setEnableWaitingRoom());

                            // store.dispatch(requestActions.notify(
                            //     {
                            //         text: intl.formatMessage({
                            //             id: 'room.locked',
                            //             defaultMessage: 'Room is now locked'
                            //         })
                            //     }));

                            break;
                        }

                    case 'disableWaitingRoom':
                        {
                            store.dispatch(
                                roomActions.setDisableWaitingRoom());

                            // store.dispatch(requestActions.notify(
                            //     {
                            //         text: intl.formatMessage({
                            //             id: 'room.unlocked',
                            //             defaultMessage: 'Room is now unlocked'
                            //         })
                            //     }));

                            break;
                        }
                    case 'enablePermanentLock':
                        {
                            store.dispatch(
                                roomActions.setRoomEnablePermanentLock());

                            // store.dispatch(requestActions.notify(
                            //     {
                            //         text: intl.formatMessage({
                            //             id: 'room.locked',
                            //             defaultMessage: 'Room is now locked'
                            //         })
                            //     }));

                            break;
                        }
                    case 'disablePermanentLock':
                        {
                            store.dispatch(
                                roomActions.setRoomDisablePermanentLock());

                            // store.dispatch(requestActions.notify(
                            //     {
                            //         text: intl.formatMessage({
                            //             id: 'room.locked',
                            //             defaultMessage: 'Room is now locked'
                            //         })
                            //     }));

                            break;
                        }
                    case 'enableScreenShare':
                        {
                            store.dispatch(
                                roomActions.enableScreenShare());

                            // store.dispatch(requestActions.notify(
                            //     {
                            //         text: intl.formatMessage({
                            //             id: 'room.locked',
                            //             defaultMessage: 'Room is now locked'
                            //         })
                            //     }));

                            break;
                        }
                    case 'disableScreenShare':
                        {
                            store.dispatch(
                                roomActions.disableScreenShare());

                            // store.dispatch(requestActions.notify(
                            //     {
                            //         text: intl.formatMessage({
                            //             id: 'room.locked',
                            //             defaultMessage: 'Room is now locked'
                            //         })
                            //     }));

                            break;
                        }
                    case 'parkedPeer':
                        {
                            const { peerId } = notification.data;

                            store.dispatch(
                                lobbyPeerActions.addLobbyPeer(peerId));
                            // store.dispatch(
                            //     roomActions.setToolbarsVisible(true));

                            // this._soundNotification();

                            // store.dispatch(requestActions.notify(
                            //     {
                            //         text: intl.formatMessage({
                            //             id: 'room.newLobbyPeer',
                            //             defaultMessage: 'New participant entered the lobby'
                            //         })
                            //     }));

                            break;
                        }
                    case 'lobby:peerDenied': {
                        store.dispatch(roomActions.setRoomDenied(true));
                        break;
                    }
                    case 'lobby:peerKicked': {
                        const { peerId } = notification.data;

                        store.dispatch(
                            lobbyPeerActions.removeLobbyPeer(peerId));

                        break;
                    }
                    case 'lobby:peerClosed':
                        {
                            const { peerId } = notification.data;

                            store.dispatch(
                                lobbyPeerActions.removeLobbyPeer(peerId));

                            // store.dispatch(requestActions.notify(
                            //     {
                            //         text: intl.formatMessage({
                            //             id: 'room.lobbyPeerLeft',
                            //             defaultMessage: 'Participant in lobby left'
                            //         })
                            //     }));

                            break;
                        }

                    case 'lobby:promotedPeer':
                        {
                            const { peerId } = notification.data;

                            store.dispatch(
                                lobbyPeerActions.removeLobbyPeer(peerId));

                            break;
                        }
                    case 'gotRole':
                        {
                            const { peerId, role } = notification.data;

                            if (peerId === this._peerId) {
                                store.dispatch(userActions.addRole(role));

                                // store.dispatch(requestActions.notify(
                                //     {
                                //         text: intl.formatMessage({
                                //             id: 'roles.gotRole',
                                //             defaultMessage: 'You got the role: {role}'
                                //         }, {
                                //             role
                                //         })
                                //     }));
                            }
                            else
                                store.dispatch(peerActions.addPeerRole(peerId, role));

                            break;
                        }

                    case 'lostRole':
                        {
                            const { peerId, role } = notification.data;

                            if (peerId === this._peerId) {
                                store.dispatch(userActions.removeRole(role));

                                // store.dispatch(requestActions.notify(
                                //     {
                                //         text: intl.formatMessage({
                                //             id: 'roles.lostRole',
                                //             defaultMessage: 'You lost the role: {role}'
                                //         }, {
                                //             role
                                //         })
                                //     }));
                            }
                            else
                                store.dispatch(peerActions.removePeerRole(peerId, role));

                            break;
                        }
                    case 'gotPermission':
                        {
                            const { peerId, permission } = notification.data;

                            if (peerId === this._peerId) {
                                store.dispatch(userActions.addPermission(permission));

                                // store.dispatch(requestActions.notify(
                                //     {
                                //         text: intl.formatMessage({
                                //             id: 'roles.gotRole',
                                //             defaultMessage: 'You got the role: {role}'
                                //         }, {
                                //             role
                                //         })
                                //     }));
                            }
                            else
                                store.dispatch(peerActions.addPeerRole(peerId, permission));

                            break;
                        }

                    case 'lostPermission':
                        {
                            const { peerId, permission } = notification.data;

                            if (peerId === this._peerId) {
                                store.dispatch(userActions.removePermission(permission));

                                // store.dispatch(requestActions.notify(
                                //     {
                                //         text: intl.formatMessage({
                                //             id: 'roles.lostRole',
                                //             defaultMessage: 'You lost the role: {role}'
                                //         }, {
                                //             role
                                //         })
                                //     }));
                            }
                            else
                                store.dispatch(peerActions.removePeerRole(peerId, permission));

                            break;
                        }
                    default: {
                        break;
                    }
                }
            } catch (error) {
                logger.error('error on socket "notification" event [error:"%o"]', error);
            }
        })
    }

    close() {
        if (this._closed)
            return;

        this._closed = true;

        logger.log('close()');

        this._signalingSocket.close();

        // Close mediasoup Transports.
        if (this._sendTransport)
            this._sendTransport.close();

        if (this._recvTransport)
            this._recvTransport.close();

        // store.dispatch(roomActions.setRoomState('closed'));

        window.location = '/';
    }

    async closeMeeting() {
        logger.log('closeMeeting()');

        // store.dispatch(
        // 	roomActions.setCloseMeetingInProgress(true));

        try {
            if (!this._hasPermission(END_MEETING)) {
                throw new Error('user not authorized')
            }
            await this._sendRequest('moderator:closeMeeting');
            this.close();
        }
        catch (error) {
            logger.error('closeMeeting() [error:"%o"]', error);
        }


        // store.dispatch(
        // 	roomActions.setCloseMeetingInProgress(false));
    }

    async muteAll() {
        logger.log('muteAll()');

        try {
            if (!this._hasPermission(MODERATE_ROOM)) {
                throw new Error('user not authorized')
            }
            await this._sendRequest('moderator:muteAll');
        }
        catch (error) {
            logger.error('muteAll() [error:"%o"]', error);
        }
    }

    async _joinRoom({ joinVideo, joinAudio }) {
        logger.log('_joinRoom()');
        try {
            this._mediasoupDevice = new mediasoupClient.Device();
            const routerRtpCapabilities = await this._sendRequest('getRouterRtpCapabilities');
            // TODO: for the orientation issue 
            // routerRtpCapabilities.headerExtensions = routerRtpCapabilities.headerExtensions
            //     .filter((ext) => ext.uri !== 'urn:3gpp:video-orientation');

            if (!this._mediasoupDevice.loaded)
                await this._mediasoupDevice.load({ routerRtpCapabilities });

            if (this._produce) {
                await this._createTransport('send');
            }
            await this._createTransport('recv');

            // Set our media capabilities.
            store.dispatch(userActions.setMediaCapabilities(
                {
                    canSendMic: this._mediasoupDevice.canProduce('audio'),
                    canSendWebcam: this._mediasoupDevice.canProduce('video'),
                    canShareScreen: this._mediasoupDevice.canProduce('video')
                    // 	this._screenSharing.isScreenShareAvailable(),
                    // canShareFiles: this._torrentSupport
                }));

            // join send request
            const {
                authenticated,
                permissions,
                roles,
                peers,
                tracker,
                roomPermissions,
                allowWhenRoleMissing,
                chatHistory,
                canvasHistory,
                fileHistory,
                lastNHistory,
                locked,
                lobbyPeers,
                accessCode
            } = await this._sendRequest('join', { rtpCapabilities: this._mediasoupDevice.rtpCapabilities });

            // logger.log('send request join return values', authenticated,
            //     roles,
            //     peers,
            //     tracker,
            //     roomPermissions,
            //     allowWhenRoleMissing,
            //     chatHistory,
            //     fileHistory,
            //     lastNHistory,
            //     locked,
            //     lobbyPeers,
            //     accessCode);
            logger.log('chat History', chatHistory);
            this._chatHistory['Everyone'] = chatHistory;

            logger.log('canvas History', canvasHistory);
            this._canvasHistory = canvasHistory;

            store.dispatch(userActions.addPermissions(permissions));

            for (const peer of peers) {
                store.dispatch(
                    peerActions.addPeer({ ...peer, consumers: [] }));
            }

            locked ?
                store.dispatch(roomActions.setEnableWaitingRoom()) :
                store.dispatch(roomActions.setDisableWaitingRoom());

            (lobbyPeers.length > 0) && lobbyPeers.forEach((peer) => {
                store.dispatch(
                    lobbyPeerActions.addLobbyPeer(peer.id));
                // store.dispatch(
                //     lobbyPeerActions.setLobbyPeerDisplayName(peer.displayName, peer.id));
                // store.dispatch(
                //     lobbyPeerActions.setLobbyPeerPicture(peer.picture, peer.id));
            });

            logger.log(
                '_joinRoom() joined [authenticated:"%s", peers:"%o", roles:"%o"]',
                authenticated,
                peers,
                roles
            );

            if (this._produce) {
                if (this._mediasoupDevice.canProduce('audio')) {
                    if (joinAudio && !this._muted) {
                        await this.updateMic({ start: true });
                        let autoMuteThreshlod = 4;

                        if (autoMuteThreshlod && peers.length >= autoMuteThreshlod) {
                            this.muteMic();
                        }
                    }
                }
                if (joinVideo) {
                    this.updateWebcam({ start: true });
                }
            }
            await this._updateAudioOutputDevices();

            const { selectedAudioOutputDevice } = constants;

            // if(!selectedAudioOutputDevice && this._audioOutputDevices !== {}){

            // }

        } catch (error) {
            logger.error('_joinRoom() [error:"%o"]', error);
            this.close();
        }
    }

    async updateWebcam({ start = false, restart = false, newDeviceId = null, newResolution = null, newFrameRate = null }) {
        logger.log(
            'updateWebcam() [start:"%s", restart:"%s", newDeviceId:"%s", newResolution:"%s", newFrameRate:"%s"]',
            start,
            restart,
            newDeviceId,
            newResolution,
            newFrameRate
        );

        let track;

        try {
            if (!this._mediasoupDevice.canProduce('video'))
                throw new Error('cannot produce video');

            if (newDeviceId && !restart)
                throw new Error('changing device requires restart');

            const deviceId = await this._getWebcamDeviceId(newDeviceId);
            const device = this._webcams[deviceId];

            if (!device)
                throw new Error('no webcam devices');

            let {
                resolution,
                frameRate
            } = constants;

            resolution = newResolution ? newResolution : resolution;
            frameRate = newFrameRate ? newFrameRate : frameRate;

            if ((restart && this._webcamProducer) || start) {
                if (this._webcamProducer) {
                    await this.disableWebcam();
                }

                const stream = await navigator.mediaDevices.getUserMedia(
                    {
                        video: {
                            deviceId: { ideal: deviceId },
                            ...VIDEO_CONSTRAINS[resolution],
                            frameRate
                        }
                    }
                );

                ([track] = stream.getVideoTracks());

                await this._updateWebcamDevices();

                const { deviceId: trackDeviceId } = track.getSettings();

                if (this._useSimulcast) {
                    // If VP9 is the only available video codec then use SVC.
                    const firstVideoCodec = this._mediasoupDevice
                        .rtpCapabilities
                        .codecs
                        .find((c) => c.kind === 'video');

                    let encodings;

                    if (firstVideoCodec.mimeType.toLowerCase() === 'video/vp9')
                        encodings = VIDEO_KSVC_ENCODINGS;
                    else if ('simulcastEncodings' in window.config)
                        encodings = window.config.simulcastEncodings;
                    else
                        encodings = VIDEO_SIMULCAST_ENCODINGS;

                    this._webcamProducer = await this._sendTransport.produce(
                        {
                            track,
                            encodings,
                            codecOptions:
                            {
                                videoGoogleStartBitrate: 1000
                            },
                            appData:
                            {
                                source: 'webcam'
                            }
                        });
                }
                else {
                    this._webcamProducer = await this._sendTransport.produce({
                        track,
                        appData:
                        {
                            source: 'webcam'
                        }
                    });
                }

                store.dispatch(producerActions.addProducer(
                    {
                        id: this._webcamProducer.id,
                        source: 'webcam',
                        paused: this._webcamProducer.paused,
                        track: this._webcamProducer.track,
                        rtpParameters: this._webcamProducer.rtpParameters,
                        codec: this._webcamProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
                    }));

                this._webcamProducer.on('transportclose', () => {
                    this._webcamProducer = null;
                });

                this._webcamProducer.on('trackended', () => {
                    this.disableWebcam();
                });
            }
            else if (this._webcamProducer) {
                ({ track } = this._webcamProducer);
                await track.applyConstraints({
                    ...VIDEO_CONSTRAINS[resolution],
                    frameRate
                });

                // Also change resolution of extra video producers
                // for (const producer of this._extraVideoProducers.values()) {
                //     ({ track } = producer);

                //     await track.applyConstraints(
                //         {
                //             ...VIDEO_CONSTRAINS[resolution],
                //             frameRate
                //         }
                //     );
                // }
            }
            store.dispatch(userActions.setWebcamState({ webcamState: "on" }));
        }
        catch (error) {
            logger.error('updateWebcam() [error:"%o"]', error);
            if (track)
                track.stop();
        }
    }

    async disableWebcam() {
        logger.log('disableWebcam()');

        if (!this._webcamProducer)
            return;

        // store.dispatch(meActions.setWebcamInProgress(true));

        this._webcamProducer.close();

        store.dispatch(
            producerActions.removeProducer(this._webcamProducer.id));

        try {
            await this._sendRequest(
                'closeProducer', { producerId: this._webcamProducer.id });
        }
        catch (error) {
            logger.error('disableWebcam() [error:"%o"]', error);
        }

        this._webcamProducer = null;

        // store.dispatch(meActions.setWebcamInProgress(false));
        store.dispatch(userActions.setWebcamState({ webcamState: 'off' }));
    }

    async updateMic({ start = false, restart = false, newDeviceId = null }) {
        logger.log(
            'updateMic() [start:"%s", restart:"%s", newDeviceId:"%s"]',
            start,
            restart,
            newDeviceId
        );
        let track;
        try {
            if (!this._mediasoupDevice.canProduce('audio'))
                throw new Error('cannot produce audio');

            if (newDeviceId && !restart)
                throw new Error('changing device requires restart');

            const deviceId = await this._getAudioDeviceId(newDeviceId);
            logger.log(`This is the device Id`, deviceId);
            const device = this._audioDevices[deviceId];

            if (!device)
                throw new Error('no audio devices');

            const {
                sampleRate,
                channelCount,
                volume,
                autoGainControl,
                echoCancellation,
                noiseSuppression,
                sampleSize
            } = constants;

            if ((restart && this._micProducer) || start) {
                // TODO: local hark disconnect
                // this.disconnectLocalHark();
                // TODO: check this line
                if (this._micProducer)
                    await this.disableMic();

                const stream = await navigator.mediaDevices.getUserMedia(
                    {
                        audio: {
                            deviceId: { ideal: deviceId },
                            sampleRate,
                            channelCount,
                            volume,
                            autoGainControl,
                            echoCancellation,
                            noiseSuppression,
                            sampleSize
                        }
                    }
                );

                ([track] = stream.getAudioTracks());

                this._updateAudioDevices();

                const { deviceId: trackDeviceId } = track.getSettings();

                this._micProducer = await this._sendTransport.produce(
                    {
                        track,
                        codecOptions:
                        {
                            opusStereo: false,
                            opusDtx: true,
                            opusFec: true,
                            opusPtime: '3',
                            opusMaxPlaybackRate: 48000
                        },
                        appData:
                            { source: 'mic' }
                    }
                );

                store.dispatch(producerActions.addProducer(
                    {
                        id: this._micProducer.id,
                        source: 'mic',
                        paused: this._micProducer.paused,
                        track: this._micProducer.track,
                        rtpParameters: this._micProducer.rtpParameters,
                        codec: this._micProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
                    }));

                this._micProducer.on('transportclose', () => {
                    this._micProducer = null;
                });

                this._micProducer.on('trackended', () => {
                    this.disableMic();
                });

                // this._micProducer.volume = 0;

                // this.connectLocalHark(track);
            }
            else if (this._micProducer) {
                ({ track } = this._micProducer);

                await track.applyConstraints(
                    {
                        sampleRate,
                        channelCount,
                        volume,
                        autoGainControl,
                        echoCancellation,
                        noiseSuppression,
                        sampleSize
                    }
                );

                // if (this._harkStream != null)
                // {
                // 	const [ harkTrack ] = this._harkStream.getAudioTracks();

                // 	harkTrack && await harkTrack.applyConstraints(
                // 		{
                // 			sampleRate,
                // 			channelCount,
                // 			volume,
                // 			autoGainControl,
                // 			echoCancellation,
                // 			noiseSuppression,
                // 			sampleSize
                // 		}
                // 	);
                // }

            }
            store.dispatch(userActions.setMicState({ micState: 'on' }));

        } catch (error) {

            logger.error('updateMic() [error:"%o"]', error);
            if (track)
                track.stop();
        }
    }

    async disableMic() {
        logger.log('disableMic()');

        if (!this._micProducer)
            return;

        // store.dispatch(meActions.setAudioInProgress(true));

        this._micProducer.close();

        store.dispatch(
            producerActions.removeProducer(this._micProducer.id));

        try {
            await this._sendRequest(
                'closeProducer', { producerId: this._micProducer.id });
        }
        catch (error) {
            logger.error('disableMic() [error:"%o"]', error);
        }

        this._micProducer = null;

        store.dispatch(userActions.setMicState({ micState: 'off' }));

        // store.dispatch(meActions.setAudioInProgress(false));
    }


    async muteMic() {
        logger.log('muteMic()');

        if (this._micProducer === null) {
            return;
        }

        this._micProducer.pause();

        try {
            await this._sendRequest(
                'pauseProducer', { producerId: this._micProducer.id });

            store.dispatch(
                producerActions.setProducerPaused(this._micProducer.id));

            store.dispatch(userActions.setMicState({ micState: 'muted' }));
        }
        catch (error) {
            logger.error('muteMic() [error:"%o"]', error);

            // store.dispatch(requestActions.notify(
            //     {
            //         type: 'error',
            //         text: intl.formatMessage({
            //             id: 'devices.microphoneMuteError',
            //             defaultMessage: 'Unable to mute your microphone'
            //         })
            //     }));
        }
    }

    async unmuteMic() {
        logger.log('unmuteMic()');

        if (!this._micProducer) {
            this.updateMic({ start: true });
        }
        else {
            this._micProducer.resume();

            try {
                await this._sendRequest(
                    'resumeProducer', { producerId: this._micProducer.id });

                store.dispatch(
                    producerActions.setProducerResumed(this._micProducer.id));


                store.dispatch(userActions.setMicState({ micState: 'on' }));
            }
            catch (error) {
                logger.error('unmuteMic() [error:"%o"]', error);

                // store.dispatch(requestActions.notify(
                //     {
                //         type: 'error',
                //         text: intl.formatMessage({
                //             id: 'devices.microphoneUnMuteError',
                //             defaultMessage: 'Unable to unmute your microphone'
                //         })
                //     }));
            }
        }
    }


    async updateScreenSharing({ start = false, newResolution = null, newFrameRate = null }) {
        logger.log('updateScreenSharing() [start:"%s"]', start);

        let track;

        try {
            logger.log('updateScreenSharing', store.getState().room.screenShare);

            if (!store.getState().room.screenShare) {
                throw new Error('Screen Share is disabled');
            }


            // const available = this._screenSharing.isScreenShareAvailable();

            // if (!available)
            //     throw new Error('screen sharing not available');

            if (!this._mediasoupDevice.canProduce('video'))
                throw new Error('cannot produce video');

            // if (newResolution)
            //     store.dispatch(settingsActions.setScreenSharingResolution(newResolution));

            // if (newFrameRate)
            //     store.dispatch(settingsActions.setScreenSharingFrameRate(newFrameRate));

            // store.dispatch(meActions.setScreenShareInProgress(true));

            const {
                screenSharingResolution,
                screenSharingFrameRate
            } = constants;

            if (start) {
                const stream = await navigator.mediaDevices.getDisplayMedia(
                    {
                        audio: false,
                        video:
                        {
                            width: { max: 1920 },
                            height: { max: 1080 },
                            frameRate: screenSharingFrameRate
                        }
                    });

                // const stream = await this._screenSharing.start({
                //     ...VIDEO_CONSTRAINS[screenSharingResolution],
                //     frameRate: screenSharingFrameRate
                // });

                ([track] = stream.getVideoTracks());

                if (this._useSharingSimulcast) {
                    // If VP9 is the only available video codec then use SVC.
                    const firstVideoCodec = this._mediasoupDevice
                        .rtpCapabilities
                        .codecs
                        .find((c) => c.kind === 'video');

                    let encodings;

                    if (firstVideoCodec.mimeType.toLowerCase() === 'video/vp9') {
                        encodings = VIDEO_SVC_ENCODINGS;
                    }
                    else if ('simulcastEncodings' in window.config) {
                        encodings = window.config.simulcastEncodings
                            .map((encoding) => ({ ...encoding, dtx: true }));
                    }
                    else {
                        encodings = VIDEO_SIMULCAST_ENCODINGS
                            .map((encoding) => ({ ...encoding, dtx: true }));
                    }

                    this._screenSharingProducer = await this._sendTransport.produce(
                        {
                            track,
                            encodings,
                            codecOptions:
                            {
                                videoGoogleStartBitrate: 1000
                            },
                            appData:
                            {
                                source: 'screen'
                            }
                        });
                }
                else {
                    this._screenSharingProducer = await this._sendTransport.produce({
                        track,
                        appData:
                        {
                            source: 'screen'
                        }
                    });
                }

                store.dispatch(producerActions.addProducer(
                    {
                        id: this._screenSharingProducer.id,
                        deviceLabel: 'screen',
                        source: 'screen',
                        paused: this._screenSharingProducer.paused,
                        track: this._screenSharingProducer.track,
                        rtpParameters: this._screenSharingProducer.rtpParameters,
                        codec: this._screenSharingProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
                    }));

                this._screenSharingProducer.on('transportclose', () => {
                    this._screenSharingProducer = null;
                });

                this._screenSharingProducer.on('trackended', () => {
                    // store.dispatch(requestActions.notify(
                    //     {
                    //         type: 'error',
                    //         text: intl.formatMessage({
                    //             id: 'devices.screenSharingDisconnected',
                    //             defaultMessage: 'Screen sharing disconnected'
                    //         })
                    //     }));

                    this.disableScreenSharing(stream);
                });
            }
            else if (this._screenSharingProducer) {
                ({ track } = this._screenSharingProducer);

                await track.applyConstraints(
                    {
                        ...VIDEO_CONSTRAINS[screenSharingResolution],
                        frameRate: screenSharingFrameRate
                    }
                );
            }
            store.dispatch(userActions.setScreenShareState({ screenShareState: 'on' }));
        }
        catch (error) {
            logger.error('updateScreenSharing() [error:"%o"]', error);

            // store.dispatch(requestActions.notify(
            //     {
            //         type: 'error',
            //         text: intl.formatMessage({
            //             id: 'devices.screenSharingError',
            //             defaultMessage: 'An error occurred while accessing your screen'
            //         })
            //     }));

            if (track)
                track.stop();
        }

        // store.dispatch(meActions.setScreenShareInProgress(false));
    }

    async disableScreenSharing(stream) {
        logger.log('disableScreenSharing()');

        if (!this._screenSharingProducer)
            return;

        // store.dispatch(meActions.setScreenShareInProgress(true));

        this._screenSharingProducer.close();

        store.dispatch(
            producerActions.removeProducer(this._screenSharingProducer.id));

        try {
            await this._sendRequest(
                'closeProducer', { producerId: this._screenSharingProducer.id });
        }
        catch (error) {
            logger.error('disableScreenSharing() [error:"%o"]', error);
        }

        this._screenSharingProducer = null;


        store.dispatch(userActions.setScreenShareState({ screenShareState: 'off' }));

        // if (this._screenSharing) {
        //     this._screenSharing.stop();
        // }
        if (stream instanceof MediaStream === false) {
            return;
        }

        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
        }

        // store.dispatch(meActions.setScreenShareInProgress(false));
    }





    async _getAudioDeviceId(newDeviceId) {
        logger.log('_getAudioDeviceId()');

        try {
            logger.log('_getAudioDeviceId() | calling _updateAudioDeviceId()');

            await this._updateAudioDevices();

            let { selectedAudioDevice } = constants;
            selectedAudioDevice = newDeviceId ? newDeviceId : selectedAudioDevice;

            if (selectedAudioDevice && this._audioDevices[selectedAudioDevice])
                return selectedAudioDevice;
            else {
                const audioDevices = Object.values(this._audioDevices);

                return audioDevices[0] ? audioDevices[0].deviceId : null;
            }
        }
        catch (error) {
            logger.error('_getAudioDeviceId() [error:"%o"]', error);
        }
    }

    async _getWebcamDeviceId(newDeviceId) {
        logger.log(`_getWebcamDeviceId()`);
        try {
            logger.log(`_getWebcamDeviceId() | calling _updateWebcam()`);

            await this._updateWebcamDevices();

            let { selectedWebcam } = constants;
            selectedWebcam = newDeviceId ? newDeviceId : selectedWebcam;

            if (selectedWebcam && this._webcams[selectedWebcam])
                return selectedWebcam;
            else {
                const webcams = Object.values(this._webcams);

                return webcams[0] ? webcams[0].deviceId : null;
            }
        } catch (error) {
            logger.error('_getWebcamDeviceId() [error:"%o"]', error);
        }
    }


    async _createTransport(type) {

        logger.log(`creating transport of type ${type}`);
        const transportInfo = await this._sendRequest(
            'createWebRtcTransport',
            {
                // forceTcp: this._forceTcp,
                producing: type === 'send',
                consuming: type === 'recv'
            });

        // const {
        //     id,
        //     iceParameters,
        //     iceCandidates,
        //     dtlsParameters
        // } = transportInfo;
        logger.log(transportInfo);
        let _transport;

        if (type === 'send') {
            this._sendTransport = this._mediasoupDevice.createSendTransport(transportInfo);
            _transport = this._sendTransport;
        }
        else if (type === 'recv') {
            this._recvTransport = this._mediasoupDevice.createRecvTransport(transportInfo);
            _transport = this._recvTransport;
        }
        else {
            throw new Error(`bad transport 'type': ${type}`);
        }
        _transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            logger.log(`transport on connect called`);
            this._sendRequest('connectWebRtcTransport', {
                transportId: _transport.id,
                dtlsParameters
            })
                .then(callback)
                .catch(errback);
        });
        if (type === 'send') {
            this._sendTransport.on(
                'produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                    try {
                        logger.log(`transport on produce called`);
                        const { id } = await this._sendRequest(
                            'produce',
                            {
                                transportId: this._sendTransport.id,
                                kind,
                                rtpParameters,
                                appData
                            });
                        logger.log(`transport on produce request retured `, id)
                        callback({ id });
                    } catch (error) {
                        errback(error);
                    }
                }
            );
        }
    }

    async _sendRequest(method, data) {
        // logger.log(`sendRequest() [method:"%s", data:"%o"]`, method, data);
        return new Promise((resolve, reject) => {
            if (!this._signalingSocket) {
                reject('No socket connection');
            }
            else {
                this._signalingSocket.emit(
                    'request',
                    { method, data },
                    (response) => {
                        if (response && response.error) {
                            logger.error(response.error);
                            reject(response.error);
                        }
                        else {
                            resolve(response);
                        }
                    }
                );
            }
        });
    }

    // _getSignalingUrl(peerId, roomId) {
    //     const hostName = window.location.hostname === 'localhost' ? '0.0.0.0' : window.location.hostname;
    //     const port = 5000;
    //     const url = `https://${hostName}:${port}`///?peerId=${peerId}&roomId=${roomId}`;
    //     return url;
    // }

    async _startDevicesListener() {
        logger.log('start device listeners', navigator);
        try {
            await navigator.mediaDevices.addEventListener('devicechange', async () => {
                logger.log('_startDevicesListener() | navigator.mediaDevices.ondevicechange');

                await this._updateAudioDevices();
                await this._updateWebcamDevices();
                await this._updateAudioOutputDevices();

                logger.log(`Your devices changed, configure your devices in the settings dialog`);
            });
        }
        catch (e) {
            logger.error(e);
        }
    }

    async _updateAudioDevices() {
        logger.log('_updateAudioDevices');

        // Rest the list
        this._audioDevices = {};

        try {
            logger.log(`_updateAudioDevices | calling enumerateDevices`);

            const devices = await navigator.mediaDevices.enumerateDevices();

            logger.log(`Devices we have`, devices);

            for (const device of devices) {
                if (device.kind !== 'audioinput') continue;
                // logger.log(device);
                this._audioDevices[device.deviceId] = device;
            }


            store.dispatch(userActions.setAudioDevices(this._audioDevices));

        } catch (error) {
            logger.error(`_updateAudioDevices [error:"%o"]`, error);
        }
    }

    async _updateWebcamDevices() {
        logger.log('_updateWebcamDevices()');

        // Reset the list.
        this._webcams = {};

        try {
            logger.log('_updateWebcamDevices() | calling enumerateDevices()');

            const devices = await navigator.mediaDevices.enumerateDevices();

            for (const device of devices) {
                if (device.kind !== 'videoinput')
                    continue;

                this._webcams[device.deviceId] = device;
            }

            store.dispatch(userActions.setWebcamDevices(this._webcams));
        }
        catch (error) {
            logger.error('_updateWebcamDevices() [error:"%o"]', error);
        }
    }

    async _updateAudioOutputDevices() {
        logger.log('_updateAudioOutputDevices()');

        // Reset the list.
        this._audioOutputDevices = {};

        try {
            logger.log('_updateAudioOutputDevices() | calling enumerateDevices()');

            const devices = await navigator.mediaDevices.enumerateDevices();

            for (const device of devices) {
                if (device.kind !== 'audiooutput')
                    continue;

                this._audioOutputDevices[device.deviceId] = device;
            }

            store.dispatch(userActions.setAudioOutputDevices(this._audioOutputDevices));
        }
        catch (error) {
            logger.error('_updateAudioOutputDevices() [error:"%o"]', error);
        }
    }

    async sendCanvasData(method, data) {
        // logger.log('999999999', data);
        // logger.log('sendCanvasData() [drawPoint:"%s"]', data, method);
        // logger.log('Drawing',JSON.stringify(drawing));
        try {
            // store.dispatch(
            // 	chatActions.addUserMessage(chatMessage.text));

            await this._sendRequest(method, data);
        }
        catch (error) {
            logger.error('sendCanvasData() [error:"%o"]', error);

            // store.dispatch(requestActions.notify(
            // 	{
            // 		type: 'error',
            // 		text: intl.formatMessage({
            // 			id: 'room.chatError',
            // 			defaultMessage: 'Unable to send chat message'
            // 		})
            // 	}));
        }
    }

    async sendChatMessage(method, data) {
        // logger.log('sendChatMessage() [chatMessage:"%s"]', chatMessage);

        try {
            // store.dispatch(
            // 	chatActions.addUserMessage(chatMessage.text));

            await this._sendRequest(method, data);
        }
        catch (error) {
            logger.error('sendChatMessage() [error:"%o"]', error);

            // store.dispatch(requestActions.notify(
            // 	{
            // 		type: 'error',
            // 		text: intl.formatMessage({
            // 			id: 'room.chatError',
            // 			defaultMessage: 'Unable to send chat message'
            // 		})
            // 	}));
        }
    }

    async sendRequest(method, data) {
        logger.log('sendRequest() [method:"%s", data:"%o"]', method, data);

        // const {
        // 	requestRetries = 3
        // } = window.config;

        // for (let tries = 0; tries < requestRetries; tries++) {
        try {
            return await this._sendRequest(method, data);
        }
        catch (error) {
            // if (
            // 	error instanceof SocketTimeoutError &&
            // 	tries < requestRetries
            // )
            logger.warn('sendRequest() [error:"%o"]', error);
            // else
            // 	throw error;
        }
        // }
    }

    async recordMeeting() {
        logger.log('recordMeeting()');
        try {
            const {
                screenSharingResolution,
                screenSharingFrameRate
            } = constants;
            const stream = await navigator.mediaDevices.getDisplayMedia({
                audio: false,
                video:
                {
                    width: { max: 1920 },
                    height: { max: 1080 },
                    frameRate: screenSharingFrameRate
                }
            });
            logger.log('Got The stream', stream);
            this.startRecording(stream);
        }
        catch (error) {
            logger.error('recordMeeting() [error:"%o"]', error);
        }
    }

    async startRecording(stream) {
        let options = { mimeType: 'video/webm;codecs=vp9,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.error(`${options.mimeType} is not supported`);
            options = { mimeType: 'video/webm;codecs=vp8,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.error(`${options.mimeType} is not supported`);
                options = { mimeType: 'video/webm' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.error(`${options.mimeType} is not supported`);
                    options = { mimeType: '' };
                }
            }
        }

        try {
            this._mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            logger.error('Exception while creating MediaRecorder:', e);
            // errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
            return;
        }

        logger.log('Created MediaRecorder', this._mediaRecorder, 'with options', options);
        // recordButton.textContent = 'Stop Recording';
        // playButton.disabled = true;
        // downloadButton.disabled = true;

        this._mediaRecorder.onstop = (event) => {
            console.log('Recorder stopped: ', event);
            console.log('Recorded Blobs: ', this._recordedBlobs);
        };

        this._mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this._recordedBlobs.push(event.data);
            }
        };

        this._mediaRecorder.onstart = (event) => {
            logger.log('recording on start');
        }

        this._mediaRecorder.start();
        console.log('MediaRecorder started', this._mediaRecorder);
    }

    stopRecording() {
        logger.log('Stop recording');
        this._mediaRecorder.stop();
        this._mediaRecorder.onstop = (event) => {
            console.log('Recorder stopped: ', event);
            console.log('Recorded Blobs: ', this._recordedBlobs);
        };
    }

    async enableWaitingRoom() {
        logger.log('enableWaitingRoom()');

        try {
            await this.sendRequest('enableWaitingRoom');

            store.dispatch(
                roomActions.setEnableWaitingRoom());

            // store.dispatch(requestActions.notify(
            //     {
            //         text: intl.formatMessage({
            //             id: 'room.youLocked',
            //             defaultMessage: 'You locked the room'
            //         })
            //     }));
        }
        catch (error) {
            // store.dispatch(requestActions.notify(
            //     {
            //         type: 'error',
            //         text: intl.formatMessage({
            //             id: 'room.cantLock',
            //             defaultMessage: 'Unable to lock the room'
            //         })
            //     }));

            logger.error('enableWaitingRoom() [error:"%o"]', error);
        }
    }

    async disableWaitingRoom() {
        logger.log('disableWaitingRoom()');

        try {
            await this.sendRequest('disableWaitingRoom');

            store.dispatch(
                roomActions.setDisableWaitingRoom());

            // store.dispatch(requestActions.notify(
            //     {
            //         text: intl.formatMessage({
            //             id: 'room.youUnLocked',
            //             defaultMessage: 'You unlocked the room'
            //         })
            //     }));
        }
        catch (error) {
            // store.dispatch(requestActions.notify(
            //     {
            //         type: 'error',
            //         text: intl.formatMessage({
            //             id: 'room.cantUnLock',
            //             defaultMessage: 'Unable to unlock the room'
            //         })
            //     }));

            logger.error('disableWaitingRoom() [error:"%o"]', error);
        }
    }

    async enablePermanentLock() {
        logger.log('enablePermanentLock()');

        try {
            await this.sendRequest('enablePermanentLock');

            store.dispatch(
                roomActions.setRoomEnablePermanentLock());

            // store.dispatch(requestActions.notify(
            //     {
            //         text: intl.formatMessage({
            //             id: 'room.youLocked',
            //             defaultMessage: 'You locked the room'
            //         })
            //     }));
        }
        catch (error) {
            // store.dispatch(requestActions.notify(
            //     {
            //         type: 'error',
            //         text: intl.formatMessage({
            //             id: 'room.cantLock',
            //             defaultMessage: 'Unable to lock the room'
            //         })
            //     }));

            logger.error('enablePermanentLock() [error:"%o"]', error);
        }
    }

    async disablePermanentLock() {
        logger.log('disablePermanentLock()');

        try {
            await this.sendRequest('disablePermanentLock');

            store.dispatch(
                roomActions.setRoomDisablePermanentLock());

            // store.dispatch(requestActions.notify(
            //     {
            //         text: intl.formatMessage({
            //             id: 'room.youLocked',
            //             defaultMessage: 'You locked the room'
            //         })
            //     }));
        }
        catch (error) {
            // store.dispatch(requestActions.notify(
            //     {
            //         type: 'error',
            //         text: intl.formatMessage({
            //             id: 'room.cantLock',
            //             defaultMessage: 'Unable to lock the room'
            //         })
            //     }));

            logger.error('disablePermanentLock() [error:"%o"]', error);
        }
    }

    async disableScreenShare() {
        logger.log('disableScreenShare()');

        try {
            await this.sendRequest('disableScreenShare');

            store.dispatch(
                roomActions.disableScreenShare());

            // store.dispatch(requestActions.notify(
            //     {
            //         text: intl.formatMessage({
            //             id: 'room.youLocked',
            //             defaultMessage: 'You locked the room'
            //         })
            //     }));
        }
        catch (error) {
            // store.dispatch(requestActions.notify(
            //     {
            //         type: 'error',
            //         text: intl.formatMessage({
            //             id: 'room.cantLock',
            //             defaultMessage: 'Unable to lock the room'
            //         })
            //     }));

            logger.error('disableScreenShare() [error:"%o"]', error);
        }
    }

    async enableScreenShare() {
        logger.log('enableScreenShare()');

        try {
            await this.sendRequest('enableScreenShare');

            store.dispatch(
                roomActions.enableScreenShare());

            // store.dispatch(requestActions.notify(
            //     {
            //         text: intl.formatMessage({
            //             id: 'room.youLocked',
            //             defaultMessage: 'You locked the room'
            //         })
            //     }));
        }
        catch (error) {
            // store.dispatch(requestActions.notify(
            //     {
            //         type: 'error',
            //         text: intl.formatMessage({
            //             id: 'room.cantLock',
            //             defaultMessage: 'Unable to lock the room'
            //         })
            //     }));

            logger.error('enableScreenShare() [error:"%o"]', error);
        }
    }

    async promoteAllLobbyPeers() {
        logger.log('promoteAllLobbyPeers()');

        // store.dispatch(
        //     roomActions.setLobbyPeersPromotionInProgress(true));

        try {

            await this.sendRequest('promoteAllPeers');
        }
        catch (error) {
            logger.error('promoteAllLobbyPeers() [error:"%o"]', error);
        }

        // store.dispatch(
        //     roomActions.setLobbyPeersPromotionInProgress(false));
    }

    async promoteLobbyPeer(peerId) {
        logger.log('promoteLobbyPeer() [peerId:"%s"]', peerId);

        // store.dispatch(
        // 	lobbyPeerActions.setLobbyPeerPromotionInProgress(peerId, true));

        try {
            await this.sendRequest('promotePeer', { peerId });
        }
        catch (error) {
            logger.error('promoteLobbyPeer() [error:"%o"]', error);
        }

        // store.dispatch(
        // 	lobbyPeerActions.setLobbyPeerPromotionInProgress(peerId, false));
    }

    async kickLobbyPeer(peerId) {
        logger.log('kickLobbyPeer() [peerId:"%s"]', peerId);

        try {
            if (!this._hasPermission(REMOVE_USER)) {
                throw new Error('user not authorized')
            }
            await this.sendRequest('moderator:kickLobbyPeer', { peerId });
        }
        catch (error) {
            logger.error('kickLobbyPeer() [error:"%o"]', error);
        }
    }

    async kickPeer(peerId) {
        logger.log('kickPeer() [peerId:"%s"]', peerId);

        try {
            if (!this._hasPermission(REMOVE_USER)) {
                throw new Error('user not authorized')
            }
            await this.sendRequest('moderator:kickPeer', { peerId });
        }
        catch (error) {
            logger.error('kickPeer() [error:"%o"]', error);
        }
    }

    async mutePeer(peerId) {
        logger.log('mutePeer() [peerId:"%s"]', peerId);

        try {
            if (!this._hasPermission(MODERATE_ROOM)) {
                throw new Error('user not authorized')
            }
            await this.sendRequest('moderator:mute', { peerId });
        }
        catch (error) {
            logger.error('mutePeer() [error:"%o"]', error);
        }
    }

    async stopPeerVideo(peerId) {
        logger.log('stopPeerVideo() [peerId:"%s"]', peerId);

        // store.dispatch(
        //     peerActions.setStopPeerVideoInProgress(peerId, true));

        try {
            if (!this._hasPermission(MODERATE_ROOM)) {
                throw new Error('user not authorized')
            }
            await this.sendRequest('moderator:stopVideo', { peerId });
        }
        catch (error) {
            logger.error('stopPeerVideo() [error:"%o"]', error);
        }

        // store.dispatch(
        //     peerActions.setStopPeerVideoInProgress(peerId, false));
    }

    async requestPeerVideo(peerId) {
        logger.log('requestPeerVideo() [peerId:"%s"]', peerId);

        try {
            if (!this._hasPermission(MODERATE_ROOM)) {
                throw new Error('user not authorized')
            }
            await this.sendRequest('moderator:requestPeerVideo', { peerId });
        }
        catch (error) {
            logger.error('requestPeerVideo() [error:"%o"]', error);
        }
    }

    async requestPeerAudio(peerId) {
        logger.log('requestPeerAudio() [peerId:"%s"]', peerId);

        try {
            if (!this._hasPermission(MODERATE_ROOM)) {
                throw new Error('user not authorized')
            }
            await this.sendRequest('moderator:requestPeerAudio', { peerId });
        }
        catch (error) {
            logger.error('requestPeerAudio() [error:"%o"]', error);
        }
    }

    async stopAllPeerVideo() {
        logger.log('stopAllPeerVideo()');

        // store.dispatch(
        //     roomActions.setStopAllVideoInProgress(true));

        try {
            if (!this._hasPermission(MODERATE_ROOM)) {
                throw new Error('user not authorized')
            }
            await this.sendRequest('moderator:stopAllVideo');
        }
        catch (error) {
            logger.error('stopAllPeerVideo() [error:"%o"]', error);
        }

        // store.dispatch(
        //     roomActions.setStopAllVideoInProgress(false));
    }

    getChatHistory() {

    }

    async getNewChatHistory() {
        logger.log('getNewChatHistory()');

        try {
            // if (!this._hasPermission(MODERATE_ROOM)) {
            //     throw new Error('user not authorized')
            // }
            await this.sendRequest('chatHistory');
        }
        catch (error) {
            logger.error('getNewChatHistory() [error:"%o"]', error);
        }
    }

    async getCanvasHistory() {
        logger.log('getCanvasHistory()');

        try {
            // if (!this._hasPermission(MODERATE_ROOM)) {
            //     throw new Error('user not authorized')
            // }
            await this.sendRequest('canvasHistory');
        }
        catch (error) {
            logger.error('getCanvasHistory() [error:"%o"]', error);
        }
    }

    _hasPermission(permission) {
        const userPermissions = store.getState().user.permissions;
        if (userPermissions.includes(permission)) {
            return true;
        }
        return false;
    }
}