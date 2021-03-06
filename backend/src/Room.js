const EventEmitter = require('events').EventEmitter;
const { AwaitQueue } = require('awaitqueue');
const axios = require('axios');
const Logger = require('./Logger');
const Lobby = require('./Lobby');
const { SocketTimeoutError } = require('./errors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const userRoles = require('../userRoles');
const permissions = require('../permissions');
const fs = require('fs');

const {
	BYPASS_ROOM_LOCK,
	BYPASS_LOBBY
} = require('../access');
const {
	WAITING_ROOM,
	LOCK_MEETING,
	CHANGE_ROOM_LOCK,
	PROMOTE_PEER,
	SEND_CHAT,
	MODERATE_CHAT,
	SHARE_SCREEN,
	EXTRA_VIDEO,
	SHARE_FILE,
	MODERATE_FILES,
	MODERATE_ROOM,
	END_MEETING,
	REMOVE_USER
} = permissions;

const config = require('../config');

const logger = new Logger('Room');

// In case they are not configured properly
const roomAccess =
{
	[BYPASS_ROOM_LOCK]: [userRoles.ADMIN],
	[BYPASS_LOBBY]: [userRoles.NORMAL],
	...config.accessFromRoles
};

const roomPermissions =
{
	[CHANGE_ROOM_LOCK]: [userRoles.NORMAL],
	[PROMOTE_PEER]: [userRoles.NORMAL],
	[SEND_CHAT]: [userRoles.NORMAL],
	[MODERATE_CHAT]: [userRoles.MODERATOR],
	[SHARE_SCREEN]: [userRoles.NORMAL],
	[EXTRA_VIDEO]: [userRoles.NORMAL],
	[SHARE_FILE]: [userRoles.NORMAL],
	[MODERATE_FILES]: [userRoles.MODERATOR],
	[MODERATE_ROOM]: [userRoles.MODERATOR],
	...config.permissionsFromRoles
};

let count = 0;

const roomAllowWhenRoleMissing = config.allowWhenRoleMissing || [];

const ROUTER_SCALE_SIZE = config.routerScaleSize || 40;

class Room extends EventEmitter {
	/**
	 * Factory function that creates and returns Room instance.
	 *
	 * @async
	 *
	 * @param {mediasoup.Worker} mediasoupWorkers - The mediasoup Worker in which a new
	 *   mediasoup Router must be created.
	 * @param {String} roomId - Id of the Room instance.
	 */
	static async create({ mediasoupWorkers, roomId }) {
		logger.info('create() [roomId:"%s"]', roomId);

		// Shuffle workers to get random cores
		let shuffledWorkers = mediasoupWorkers.sort(() => Math.random() - 0.5);

		// Router media codecs.
		const mediaCodecs = config.mediasoup.router.mediaCodecs;

		const mediasoupRouters = new Map();

		let firstRouter = null;

		for (const worker of shuffledWorkers) {
			const router = await worker.createRouter({ mediaCodecs });

			if (!firstRouter)
				firstRouter = router;

			mediasoupRouters.set(router.id, router);
		}

		// Create a mediasoup AudioLevelObserver on first router
		const audioLevelObserver = await firstRouter.createAudioLevelObserver(
			{
				maxEntries: 1,
				threshold: -80,
				interval: 800
			});

		firstRouter = null;
		shuffledWorkers = null;

		return new Room({ roomId, mediasoupRouters, audioLevelObserver });
	}

	constructor({ roomId, mediasoupRouters, audioLevelObserver }) {
		logger.info('constructor() [roomId:"%s"]', roomId);

		super();
		this.setMaxListeners(Infinity);

		this._uuid = uuidv4();

		// Room ID.
		this._roomId = roomId;

		// Closed flag.
		this._closed = false;

		// Joining queue
		this._queue = new AwaitQueue();

		// Locked flag.
		this._locked = false;

		// Permanent Lock flag
		this._permanent_locked = false;

		// ScreenShare
		this._canShareScreen = false;

		// Waiting Room
		this._waitingRoom = true;

		// if true: accessCode is a possibility to open the room
		this._joinByAccesCode = true;

		// access code to the room,
		// applicable if ( _locked == true and _joinByAccessCode == true )
		this._accessCode = '';

		this._lobby = new Lobby();

		this._chatHistory = [];

		this._fileHistory = [];

		this._canvasHistory = {
			actions: [],
			undoActions: [],
			redoActions: [],
		};

		this._lastN = [];

		this._peers = {};

		this._peerStats = {}

		this._selfDestructTimeout = null;

		// Array of mediasoup Router instances.
		this._mediasoupRouters = mediasoupRouters;

		// The router we are currently putting peers in
		this._routerIterator = this._mediasoupRouters.values();

		this._currentRouter = this._routerIterator.next().value;

		// mediasoup AudioLevelObserver.
		this._audioLevelObserver = audioLevelObserver;

		// Current active speaker.
		this._currentActiveSpeaker = null;

		this._handleLobby();
		this._handleAudioLevelObserver();

		if (process.env.STATS) {
			this._getStats();
		}
	}

	_getStats() {
		setInterval(() => this._updateStats(this._peers), 1000);
	}

	isLocked() {
		return this._locked;
	}

	isWaitingRoomEnabled() {
		return this._waitingRoom;
	}

	close() {
		logger.log('close()');

		this._closed = true;

		this._queue.close();

		this._queue = null;

		if (this._selfDestructTimeout)
			clearTimeout(this._selfDestructTimeout);

		this._selfDestructTimeout = null;

		this._chatHistory = null;

		this._fileHistory = null;

		this._canvasHistory = null;

		this._lobby.close();

		this._lobby = null;

		// Close the peers.
		for (const peer in this._peers) {
			if (!this._peers[peer].closed)
				this._peers[peer].close();
		}

		this._peers = null;

		// Close the mediasoup Routers.
		for (const router of this._mediasoupRouters.values()) {
			router.close();
		}

		this._routerIterator = null;

		this._currentRouter = null;

		this._mediasoupRouters.clear();

		this._audioLevelObserver = null;

		// Emit 'close' event.
		this.emit('close');
	}

	verifyPeer({ id, token }) {
		try {
			// const decoded = jwt.verify(token, this._uuid);

			// logger.info('verifyPeer() [decoded:"%o"]', decoded);

			// return decoded.id === id;
			return true;
		}
		catch (err) {
			logger.warn('verifyPeer() | invalid token');
		}

		return false;
	}

	handlePeer({ peer, returning }) {
		logger.info('handlePeer() [peer:"%s", roles:"%s", returning:"%s"]', peer.id, peer.roles, returning);

		// Should not happen
		if (this._peers[peer.id]) {
			logger.warn(
				'handleConnection() | there is already a peer with same peerId [peer:"%s"]',
				peer.id);
		}

		if (this._permanent_locked) {
			logger.log('this._permanent_locked', peer.id);
			this._notification(peer.socket, 'enablePermanentLock');
		}
		// Returning user
		else if (returning) {
			logger.log('peerJoining1', peer, true);
			this._peerJoining(peer, true);
		}
		// Has a role that is allowed to bypass room lock
		else if (this._hasAccess(peer, BYPASS_ROOM_LOCK)) {

			logger.log('peerJoining2', peer);
			this._peerJoining(peer);
		}
		else if (
			'maxUsersPerRoom' in config &&
			(
				Object.keys(this._peers).length +
				this._lobby.peerList().length
			) >= config.maxUsersPerRoom) {

			logger.log('_handleOverRoomLimit', peer);
			this._handleOverRoomLimit(peer);
		}
		else if (this._locked) {
			logger.log('_parkPeer', peer);
			this._parkPeer(peer);
		}
		else {

			logger.log('last option', peer);
			// Has a role that is allowed to bypass lobby
			// this._hasAccess(peer, BYPASS_LOBBY) ?
			this._peerJoining(peer);
			// this._handleGuest(peer);
		}
	}

	_handleOverRoomLimit(peer) {
		this._notification(peer.socket, 'overRoomLimit');
	}

	_handleGuest(peer) {
		if (config.activateOnHostJoin && !this.checkEmpty())
			this._peerJoining(peer);
		else {
			this._parkPeer(peer);
			this._notification(peer.socket, 'signInRequired');
		}
	}

	_handleLobby() {
		this._lobby.on('promotePeer', (promotedPeer) => {
			logger.info('promotePeer() [promotedPeer:"%s"]', promotedPeer.id);

			const { id } = promotedPeer;

			this._peerJoining(promotedPeer);

			for (const peer of this._getAllowedPeers(PROMOTE_PEER)) {
				this._notification(peer.socket, 'lobby:promotedPeer', { peerId: id });
			}
		});

		this._lobby.on('peerRolesChanged', (peer) => {
			// Has a role that is allowed to bypass room lock
			if (this._hasAccess(peer, BYPASS_ROOM_LOCK)) {
				this._lobby.promotePeer(peer.id);

				return;
			}

			if ( // Has a role that is allowed to bypass lobby
				!this._locked &&
				this._hasAccess(peer, BYPASS_LOBBY)
			) {
				this._lobby.promotePeer(peer.id);

				return;
			}
		});

		this._lobby.on('changeDisplayName', (changedPeer) => {
			const { id, displayName } = changedPeer;

			for (const peer of this._getAllowedPeers(PROMOTE_PEER)) {
				this._notification(peer.socket, 'lobby:changeDisplayName', { peerId: id, displayName });
			}
		});

		this._lobby.on('changePicture', (changedPeer) => {
			const { id, picture } = changedPeer;

			for (const peer of this._getAllowedPeers(PROMOTE_PEER)) {
				this._notification(peer.socket, 'lobby:changePicture', { peerId: id, picture });
			}
		});

		this._lobby.on('peerKicked', (kickedPeer) => {
			logger.info('peerKicked() [kickedPeer:"%s"]', kickedPeer.id);

			const { id } = kickedPeer;

			this._notification(kickedPeer.socket, 'lobby:peerDenied');

			for (const peer of this._getAllowedPeers(PROMOTE_PEER)) {
				this._notification(peer.socket, 'lobby:peerKicked', { peerId: id });
			}
		});

		this._lobby.on('peerClosed', (closedPeer) => {
			logger.info('peerClosed() [closedPeer:"%s"]', closedPeer.id);

			const { id } = closedPeer;

			for (const peer of this._getAllowedPeers(PROMOTE_PEER)) {
				this._notification(peer.socket, 'lobby:peerClosed', { peerId: id });
			}
		});

		// If nobody left in lobby we should check if room is empty too and initiating
		// rooms selfdestruction sequence  
		this._lobby.on('lobbyEmpty', () => {
			if (this.checkEmpty()) {
				this.selfDestructCountdown();
			}
		});
	}

	_handleAudioLevelObserver() {
		// Set audioLevelObserver events.
		// this._audioLevelObserver.on('volumes', (volumes) => {
		// 	const { producer, volume } = volumes[0];

		// 	// Notify all Peers.
		// 	for (const peer of this._getJoinedPeers()) {
		// 		this._notification(
		// 			peer.socket,
		// 			'activeSpeaker',
		// 			{
		// 				peerId: producer.appData.peerId,
		// 				volume: volume
		// 			});
		// 	}
		// });

		// this._audioLevelObserver.on('silence', () => {
		// 	// Notify all Peers.
		// 	for (const peer of this._getJoinedPeers()) {
		// 		this._notification(
		// 			peer.socket,
		// 			'activeSpeaker',
		// 			{ peerId: null }
		// 		);
		// 	}
		// });
	}

	logStatus() {
		logger.info(
			'logStatus() [room id:"%s", peers:"%s"]',
			this._roomId,
			Object.keys(this._peers).length
		);
	}

	dump() {
		return {
			roomId: this._roomId,
			peers: Object.keys(this._peers).length
		};
	}

	get id() {
		return this._roomId;
	}

	selfDestructCountdown() {
		logger.log('selfDestructCountdown() started');

		if (this._selfDestructTimeout)
			clearTimeout(this._selfDestructTimeout);

		this._selfDestructTimeout = setTimeout(() => {
			if (this._closed)
				return;

			if (this.checkEmpty() && this._lobby.checkEmpty()) {
				logger.info(
					'Room deserted for some time, closing the room [roomId:"%s"]',
					this._roomId);
				this.close();
			}
			else
				logger.log('selfDestructCountdown() aborted; room is not empty!');
		}, 10000);
	}

	checkEmpty() {
		return Object.keys(this._peers).length === 0;
	}

	_parkPeer(parkPeer) {
		logger.log('parkPeer()', PROMOTE_PEER);
		this._lobby.parkPeer(parkPeer);
		logger.log('_getAllowedPeers', this._getAllowedPeers(PROMOTE_PEER));
		for (const peer of this._getAllowedPeers(PROMOTE_PEER)) {
			this._notification(peer.socket, 'parkedPeer', { peerId: parkPeer.id });
		}
	}

	_peerJoining(peer, returning = false) {
		logger.log('inside peerJoining');
		this._queue.push(async () => {
			logger.log('peer.socket.join', this._roomId);
			peer.socket.join(this._roomId);

			// If we don't have this peer, add to end
			!this._lastN.includes(peer.id) && this._lastN.push(peer.id);

			this._peers[peer.id] = peer;

			// Assign routerId
			peer.routerId = await this._getRouterId();

			this._handlePeer(peer);

			if (returning) {
				logger.info('about to call roomBack');
				this._notification(peer.socket, 'roomBack');
			}
			else {
				// const token = jwt.sign({ id: peer.id }, this._uuid, { noTimestamp: true });

				// peer.socket.handshake.session.token = token;

				// peer.socket.handshake.session.save();

				// let turnServers;

				// if ('turnAPIURI' in config) {
				// 	try {
				// 		const { data } = await axios.get(
				// 			config.turnAPIURI,
				// 			{
				// 				params: {
				// 					...config.turnAPIparams,
				// 					'api_key': config.turnAPIKey,
				// 					'ip': peer.socket.request.connection.remoteAddress
				// 				}
				// 			});

				// 		turnServers = [{
				// 			urls: data.uris,
				// 			username: data.username,
				// 			credential: data.password
				// 		}];
				// 	}
				// 	catch (error) {
				// 		if ('backupTurnServers' in config)
				// 			turnServers = config.backupTurnServers;

				// 		logger.error('_peerJoining() | error on REST turn [error:"%o"]', error);
				// 	}
				// }
				// else if ('backupTurnServers' in config) {
				// 	turnServers = config.backupTurnServers;
				// }

				this._notification(peer.socket, 'roomReady');
			}
		})
			.catch((error) => {
				logger.error('_peerJoining() [error:"%o"]', error);
			});
	}

	_handlePeer(peer) {
		logger.log('_handlePeer() [peer:"%s"]', peer.id);

		peer.on('close', () => {
			this._handlePeerClose(peer);
		});

		peer.on('displayNameChanged', ({ oldDisplayName }) => {
			// Ensure the Peer is joined.
			if (!peer.joined)
				return;

			// Spread to others
			this._notification(peer.socket, 'changeDisplayName', {
				peerId: peer.id,
				displayName: peer.displayName,
				oldDisplayName: oldDisplayName
			}, true);
		});

		peer.on('pictureChanged', () => {
			// Ensure the Peer is joined.
			if (!peer.joined)
				return;

			// Spread to others
			this._notification(peer.socket, 'changePicture', {
				peerId: peer.id,
				picture: peer.picture
			}, true);
		});

		peer.on('gotRole', ({ newRole }) => {
			// Ensure the Peer is joined.
			if (!peer.joined)
				return;

			// Spread to others
			this._notification(peer.socket, 'gotRole', {
				peerId: peer.id,
				role: newRole
			}, true, true);

			// Got permission to promote peers, notify peer of
			// peers in lobby
			if (roomPermissions.PROMOTE_PEER.includes(newRole)) {
				const lobbyPeers = this._lobby.peerList();

				lobbyPeers.length > 0 && this._notification(peer.socket, 'parkedPeers', {
					lobbyPeers
				});
			}
		});

		peer.on('lostRole', ({ oldRole }) => {
			// Ensure the Peer is joined.
			if (!peer.joined)
				return;

			// Spread to others
			this._notification(peer.socket, 'lostRole', {
				peerId: peer.id,
				role: oldRole
			}, true, true);
		});

		peer.socket.on('request', (request, cb) => {
			logger.log(
				'Peer "request" event [method:"%s", peerId:"%s"]',
				request.method, peer.id);

			this._handleSocketRequest(peer, request, cb)
				.catch((error) => {
					logger.error('"request" failed [error:"%o"]', error);

					cb(error);
				});
		});

		// Peer left before we were done joining
		if (peer.closed)
			this._handlePeerClose(peer);
	}

	async _updateStats(peers) {
		count = count + 1;
		logger.info('update State');
		let stats = [];
		for (let [peerId, peer] of Object.entries(peers)) {
			logger.info('I am a peer with', peerId);

			let peerStats = [];

			const transports = peer.getAllTransport();
			let transportStats = {};
			for (let [transportId, transport] of transports) {
				transportStats[transportId] = await transport.getStats();
			}
			peerStats.push({ transport: transportStats });

			const producers = peer.getAllProducer();
			let producerStats = {};
			for (let [producerId, producer] of producers) {
				producerStats[producerId] = await producer.getStats()
			};
			peerStats.push({ producer: producerStats });

			const consumers = peer.getAllConsumer();
			let consumerStats = {};
			for (let [consumerId, consumer] of consumers) {
				consumerStats[consumerId] = await consumer.getStats();
			}
			peerStats.push({ consumer: consumerStats });

			stats.push({ peer: peerStats });
		}


		this._peerStats[count] = stats;
		if (count === parseInt(process.env.STATS)) {
			fs.writeFile('statLog.txt', JSON.stringify(this._peerStats), function (err) {
				if (err) throw err;
				console.log('Saved!');
			});
		}
	}

	_handlePeerClose(peer) {
		logger.log('_handlePeerClose() [peer:"%s"]', peer.id);

		if (this._closed)
			return;

		// If the Peer was joined, notify all Peers.
		if (peer.joined)
			this._notification(peer.socket, 'peerClosed', { peerId: peer.id }, true);

		// Remove from lastN
		this._lastN = this._lastN.filter((id) => id !== peer.id);

		// Need this to know if this peer was the last with PROMOTE_PEER
		const hasPromotePeer = peer.roles.some((role) =>
			roomPermissions[PROMOTE_PEER].includes(role)
		);

		delete this._peers[peer.id];

		// No peers left with PROMOTE_PEER, might need to give
		// lobbyPeers to peers that are left.
		if (
			hasPromotePeer &&
			!this._lobby.checkEmpty() &&
			roomAllowWhenRoleMissing.includes(PROMOTE_PEER) &&
			this._getPeersWithPermission(PROMOTE_PEER).length === 0
		) {
			const lobbyPeers = this._lobby.peerList();

			for (const allowedPeer of this._getAllowedPeers(PROMOTE_PEER)) {
				this._notification(allowedPeer.socket, 'parkedPeers', { lobbyPeers });
			}
		}

		// If this is the last Peer in the room and
		// lobby is empty, close the room after a while.
		if (this.checkEmpty() && this._lobby.checkEmpty())
			this.selfDestructCountdown();
	}

	async _handleSocketRequest(peer, request, cb) {
		const router =
			this._mediasoupRouters.get(peer.routerId);

		switch (request.method) {
			case 'getRouterRtpCapabilities':
				{
					cb(router.rtpCapabilities);

					break;
				}

			case 'join':
				{
					logger.info('new Peer join',peer);
					// Ensure the Peer is not already joined.
					if (peer.joined)
						throw new Error('Peer already joined');

					const {
						// displayName,
						// picture,
						rtpCapabilities
					} = request.data;

					// Store client data into the Peer data object.
					// peer.displayName = displayName;
					// peer.picture = picture;
					peer.rtpCapabilities = rtpCapabilities;

					// Tell the new Peer about already joined Peers.
					// And also create Consumers for existing Producers.

					const joinedPeers = this._getJoinedPeers(peer);

					const peerInfos = joinedPeers
						.map((joinedPeer) => (joinedPeer.peerInfo));

					let lobbyPeers = [];

					// Allowed to promote peers, notify about lobbypeers
					if (this._hasPermission(peer, PROMOTE_PEER))
						lobbyPeers = this._lobby.peerList();

					cb({
						permissions: peer.permissions,
						roles: peer.roles,
						peers: peerInfos,
						tracker: config.fileTracker,
						authenticated: peer.authenticated,
						roomPermissions: roomPermissions,
						userRoles: userRoles,
						allowWhenRoleMissing: roomAllowWhenRoleMissing,
						fileHistory: this._fileHistory,
						lastNHistory: this._lastN,
						locked: this._locked,
						lobbyPeers: lobbyPeers,
						accessCode: this._accessCode
					});

					// Mark the new Peer as joined.
					peer.joined = true;

					// logger.log(`I am called when join is triggered and I have`,joinedPeers);

					for (const joinedPeer of joinedPeers) {
						// Create Consumers for existing Producers.
						for (const producer of joinedPeer.producers.values()) {
							this._createConsumer(
								{
									consumerPeer: peer,
									producerPeer: joinedPeer,
									producer
								});
						}
					}

					// Notify the new Peer to all other Peers.
					for (const otherPeer of this._getJoinedPeers(peer)) {
						this._notification(
							otherPeer.socket,
							'newPeer',
							{
								id: peer.id,
								displayName: peer.displayName,
								// picture: picture,
								roles: peer.roles
							}
						);
					}

					logger.log(
						'peer joined [peer: "%s"]',
						peer.id);

					break;
				}

			case 'createWebRtcTransport':
				{
					// NOTE: Don't require that the Peer is joined here, so the client can
					// initiate mediasoup Transports and be ready when he later joins.
					logger.log(request);
					const { producing, consuming } = request.data;


					const webRtcTransportOptions =
					{
						...config.mediasoup.webRtcTransportOptions,
						appData: { producing, consuming }
					};

					// if (forceTcp) {
					// 	webRtcTransportOptions.enableUdp = false;
					// 	webRtcTransportOptions.enableTcp = true;
					// }
					logger.log(producing, consuming, webRtcTransportOptions);

					const transport = await router.createWebRtcTransport(
						webRtcTransportOptions
					);

					transport.on('dtlsstatechange', (dtlsState) => {
						if (dtlsState === 'failed' || dtlsState === 'closed')
							logger.warn('WebRtcTransport "dtlsstatechange" event [dtlsState:%s]', dtlsState);
					});

					// Store the WebRtcTransport into the Peer data Object.
					peer.addTransport(transport.id, transport);

					cb({
						id: transport.id,
						iceParameters: transport.iceParameters,
						iceCandidates: transport.iceCandidates,
						dtlsParameters: transport.dtlsParameters
					});

					const { maxIncomingBitrate } = config.mediasoup.webRtcTransportOptions;

					// If set, apply max incoming bitrate limit.
					if (maxIncomingBitrate) {
						try { await transport.setMaxIncomingBitrate(maxIncomingBitrate); }
						catch (error) { }
					}

					break;
				}

			case 'connectWebRtcTransport':
				{
					const { transportId, dtlsParameters } = request.data;
					const transport = peer.getTransport(transportId);

					if (!transport)
						throw new Error(`transport with id "${transportId}" not found`);

					await transport.connect({ dtlsParameters });

					cb();

					break;
				}

			case 'restartIce':
				{
					const { transportId } = request.data;
					const transport = peer.getTransport(transportId);

					if (!transport)
						throw new Error(`transport with id "${transportId}" not found`);

					const iceParameters = await transport.restartIce();

					cb(iceParameters);

					break;
				}

			case 'produce':
				{
					let { appData } = request.data;

					// if (
					// 	appData.source === 'screen' &&
					// 	!this._hasPermission(peer, SHARE_SCREEN)
					// )
					// 	throw new Error('peer not authorized');

					// if (
					// 	appData.source === 'extravideo' &&
					// 	!this._hasPermission(peer, EXTRA_VIDEO)
					// )
					// 	throw new Error('peer not authorized');

					// Ensure the Peer is joined.
					if (!peer.joined)
						throw new Error('Peer not yet joined');

					const { transportId, kind, rtpParameters } = request.data;
					const transport = peer.getTransport(transportId);

					if (!transport)
						throw new Error(`transport with id "${transportId}" not found`);

					// Add peerId into appData to later get the associated Peer during
					// the 'loudest' event of the audioLevelObserver.
					appData = { ...appData, peerId: peer.id };

					const producer =
						await transport.produce({ kind, rtpParameters, appData });

					logger.log('producer ++++++++++++++++++++++++++++++', producer);

					const pipeRouters = this._getRoutersToPipeTo(peer.routerId);

					for (const [routerId, destinationRouter] of this._mediasoupRouters) {
						if (pipeRouters.includes(routerId)) {
							await router.pipeToRouter({
								producerId: producer.id,
								router: destinationRouter
							});
						}
					}

					// Store the Producer into the Peer data Object.
					peer.addProducer(producer.id, producer);

					// Set Producer events.
					producer.on('score', (score) => {
						this._notification(peer.socket, 'producerScore', { producerId: producer.id, score });
					});

					producer.on('videoorientationchange', (videoOrientation) => {
						logger.log(
							'producer "videoorientationchange" event [producerId:"%s", videoOrientation:"%o"]',
							producer.id, videoOrientation);
					});

					cb({ id: producer.id });

					// Optimization: Create a server-side Consumer for each Peer.
					for (const otherPeer of this._getJoinedPeers(peer)) {
						this._createConsumer(
							{
								consumerPeer: otherPeer,
								producerPeer: peer,
								producer
							});
					}

					// Add into the audioLevelObserver.
					if (kind === 'audio') {
						this._audioLevelObserver.addProducer({ producerId: producer.id })
							.catch(() => { });
					}

					break;
				}

			case 'closeProducer':
				{
					// Ensure the Peer is joined.
					if (!peer.joined)
						throw new Error('Peer not yet joined');

					const { producerId } = request.data;
					const producer = peer.getProducer(producerId);

					if (!producer)
						throw new Error(`producer with id "${producerId}" not found`);

					producer.close();

					// Remove from its map.
					peer.removeProducer(producer.id);

					cb();

					break;
				}

			case 'pauseProducer':
				{
					// Ensure the Peer is joined.
					if (!peer.joined)
						throw new Error('Peer not yet joined');

					const { producerId } = request.data;
					const producer = peer.getProducer(producerId);

					if (!producer)
						throw new Error(`producer with id "${producerId}" not found`);

					await producer.pause();

					cb();

					break;
				}

			case 'resumeProducer':
				{
					// Ensure the Peer is joined.
					if (!peer.joined)
						throw new Error('Peer not yet joined');

					const { producerId } = request.data;
					const producer = peer.getProducer(producerId);

					if (!producer)
						throw new Error(`producer with id "${producerId}" not found`);

					await producer.resume();

					cb();

					break;
				}

			case 'pauseConsumer':
				{
					// Ensure the Peer is joined.
					if (!peer.joined)
						throw new Error('Peer not yet joined');

					const { consumerId } = request.data;
					const consumer = peer.getConsumer(consumerId);

					if (!consumer)
						throw new Error(`consumer with id "${consumerId}" not found`);

					await consumer.pause();

					cb();

					break;
				}

			case 'resumeConsumer':
				{
					// Ensure the Peer is joined.
					if (!peer.joined)
						throw new Error('Peer not yet joined');

					const { consumerId } = request.data;
					const consumer = peer.getConsumer(consumerId);

					if (!consumer)
						throw new Error(`consumer with id "${consumerId}" not found`);

					await consumer.resume();

					cb();

					break;
				}

			case 'setConsumerPreferedLayers':
				{
					// Ensure the Peer is joined.
					if (!peer.joined)
						throw new Error('Peer not yet joined');

					const { consumerId, spatialLayer, temporalLayer } = request.data;
					const consumer = peer.getConsumer(consumerId);

					if (!consumer)
						throw new Error(`consumer with id "${consumerId}" not found`);

					await consumer.setPreferredLayers({ spatialLayer, temporalLayer });

					cb();

					break;
				}

			case 'setConsumerPriority':
				{
					// Ensure the Peer is joined.
					if (!peer.joined)
						throw new Error('Peer not yet joined');

					const { consumerId, priority } = request.data;
					const consumer = peer.getConsumer(consumerId);

					if (!consumer)
						throw new Error(`consumer with id "${consumerId}" not found`);

					await consumer.setPriority(priority);

					cb();

					break;
				}

			case 'requestConsumerKeyFrame':
				{
					// Ensure the Peer is joined.
					if (!peer.joined)
						throw new Error('Peer not yet joined');

					const { consumerId } = request.data;
					const consumer = peer.getConsumer(consumerId);

					if (!consumer)
						throw new Error(`consumer with id "${consumerId}" not found`);

					await consumer.requestKeyFrame();

					cb();

					break;
				}

			case 'getTransportStats':
				{
					const { transportId } = request.data;
					const transport = peer.getTransport(transportId);

					if (!transport)
						throw new Error(`transport with id "${transportId}" not found`);

					const stats = await transport.getStats();

					cb(stats);

					break;
				}

			case 'getProducerStats':
				{
					const { producerId } = request.data;
					const producer = peer.getProducer(producerId);

					if (!producer)
						throw new Error(`producer with id "${producerId}" not found`);

					const stats = await producer.getStats();

					cb(stats);

					break;
				}

			case 'getConsumerStats':
				{
					const { consumerId } = request.data;
					const consumer = peer.getConsumer(consumerId);

					if (!consumer)
						throw new Error(`consumer with id "${consumerId}" not found`);

					const stats = await consumer.getStats();

					cb(stats);

					break;
				}

			case 'changeDisplayName':
				{
					// Ensure the Peer is joined.
					if (!peer.joined)
						throw new Error('Peer not yet joined');

					const { displayName } = request.data;

					peer.displayName = displayName;

					// This will be spread through events from the peer object

					// Return no error
					cb();

					break;
				}

			/* case 'changePicture':
			{
				// Ensure the Peer is joined.
				if (!peer.joined)
					throw new Error('Peer not yet joined');
	
				const { picture } = request.data;
	
				peer.picture = picture;
	
				// Spread to others
				this._notification(peer.socket, 'changePicture', {
					peerId  : peer.id,
					picture : picture
				}, true);
	
				// Return no error
				cb();
	
				break;
			} */
			case 'chatHistory': {
				// if (!this._hasPermission(peer, MODERATE_CHAT))
				// 	throw new Error('peer not authorized');

				// this._chatHistory = [];

				// Spread to perticular peer
				this._notifyTo('chat', peer.socket, 'chatHistory', {
					peerId: peer.id,
					chatHistory: this._chatHistory
				});

				// Return no error
				cb();

				break;
			}

			case 'chatMessage':
				{
					// if (!this._hasPermission(peer, SEND_CHAT))
					// 	throw new Error('peer not authorized');

					const { chatMessage } = request.data;

					chatMessage['sender'] = peer.id;
					logger.log('chatMessage', chatMessage);

					this._chatHistory.push(chatMessage);

					if (chatMessage.to === 'Everyone') {
						// Spread to others
						this._notifyTo('chat', peer.socket, 'chatMessage', {
							peerId: peer.id,
							chatMessage: chatMessage
						}, true);
					}
					else {
						this._notifyTo('chat', this._peers[chatMessage.to].socket, 'chatMessage', {
							peerId: peer.id,
							chatMessage: chatMessage
						});
					}

					// Return no error
					cb();

					break;
				}

			case 'moderator:clearChat':
				{
					if (!this._hasPermission(peer, MODERATE_CHAT))
						throw new Error('peer not authorized');

					this._chatHistory = [];

					// Spread to others
					this._notification(peer.socket, 'moderator:clearChat', null, true);

					// Return no error
					cb();

					break;
				}

			case 'enableWaitingRoom':
				{
					if (!this._hasPermission(peer, WAITING_ROOM))
						throw new Error('peer not authorized');

					this._locked = true;

					// Spread to others
					this._notification(peer.socket, 'enableWaitingRoom', {
						peerId: peer.id
					}, true);

					// Return no error
					cb();

					break;
				}

			case 'disableWaitingRoom':
				{
					if (!this._hasPermission(peer, WAITING_ROOM))
						throw new Error('peer not authorized');

					this._locked = false;

					// Spread to others
					this._notification(peer.socket, 'disableWaitingRoom', {
						peerId: peer.id
					}, true);

					// Return no error
					cb();

					break;
				}

			case 'enablePermanentLock':
				{
					if (!this._hasPermission(peer, LOCK_MEETING))
						throw new Error('peer not authorized');

					this._permanent_locked = true;

					// Spread to others
					this._notification(peer.socket, 'enablePermanentLock', {
						peerId: peer.id
					}, true);

					// Return no error
					cb();

					break;
				}
			case 'disablePermanentLock':
				{
					if (!this._hasPermission(peer, LOCK_MEETING))
						throw new Error('peer not authorized');

					this._permanent_locked = false;

					// Spread to others
					this._notification(peer.socket, 'disablePermanentLock', {
						peerId: peer.id
					}, true);

					// Return no error
					cb();

					break;
				}

			case 'enableScreenShare':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					this._canShareScreen = true;

					// Spread to others
					this._notification(peer.socket, 'enableScreenShare', {
						peerId: peer.id
					}, true);

					// Return no error
					cb();

					break;
				}

			case 'disableScreenShare':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					this._canShareScreen = false;

					// Spread to others
					this._notification(peer.socket, 'disableScreenShare', {
						peerId: peer.id
					}, true);

					// Return no error
					cb();

					break;
				}

			case 'setAccessCode':
				{
					const { accessCode } = request.data;

					this._accessCode = accessCode;

					// Spread to others
					// if (request.public) {
					this._notification(peer.socket, 'setAccessCode', {
						peerId: peer.id,
						accessCode: accessCode
					}, true);
					// }

					// Return no error
					cb();

					break;
				}

			case 'setJoinByAccessCode':
				{
					const { joinByAccessCode } = request.data;

					this._joinByAccessCode = joinByAccessCode;

					// Spread to others
					this._notification(peer.socket, 'setJoinByAccessCode', {
						peerId: peer.id,
						joinByAccessCode: joinByAccessCode
					}, true);

					// Return no error
					cb();

					break;
				}

			case 'promotePeer':
				{
					if (!this._hasPermission(peer, PROMOTE_PEER))
						throw new Error('peer not authorized');

					const { peerId } = request.data;

					this._lobby.promotePeer(peerId);

					// Return no error
					cb();

					break;
				}

			case 'promoteAllPeers':
				{
					if (!this._hasPermission(peer, PROMOTE_PEER))
						throw new Error('peer not authorized');

					this._lobby.promoteAllPeers();

					// Return no error
					cb();

					break;
				}

			case 'sendFile':
				{
					if (!this._hasPermission(peer, SHARE_FILE))
						throw new Error('peer not authorized');

					const { magnetUri } = request.data;

					this._fileHistory.push({ peerId: peer.id, magnetUri: magnetUri });

					// Spread to others
					this._notification(peer.socket, 'sendFile', {
						peerId: peer.id,
						magnetUri: magnetUri
					}, true);

					// Return no error
					cb();

					break;
				}

			case 'moderator:clearFileSharing':
				{
					if (!this._hasPermission(peer, MODERATE_FILES))
						throw new Error('peer not authorized');

					this._fileHistory = [];

					// Spread to others
					this._notification(peer.socket, 'moderator:clearFileSharing', null, true);

					// Return no error
					cb();

					break;
				}

			case 'raisedHand':
				{
					const { raisedHand } = request.data;

					peer.raisedHand = raisedHand;

					// Spread to others
					this._notifyTo('notification', peer.socket, 'raisedHand', {
						peerId: peer.id,
						raisedHand: raisedHand,
						raisedHandTimestamp: peer.raisedHandTimestamp
					}, true);

					// Return no error
					cb();

					break;
				}

			case 'moderator:mute':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					const { peerId } = request.data;

					const mutePeer = this._peers[peerId];

					if (!mutePeer)
						throw new Error(`peer with id "${peerId}" not found`);

					this._notification(mutePeer.socket, 'moderator:mute');

					cb();

					break;
				}

			case 'moderator:muteAll':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					// Spread to others
					this._notification(peer.socket, 'moderator:mute', null, true);

					cb();

					break;
				}

			case 'moderator:stopVideo':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					const { peerId } = request.data;

					const stopVideoPeer = this._peers[peerId];

					if (!stopVideoPeer)
						throw new Error(`peer with id "${peerId}" not found`);

					this._notification(stopVideoPeer.socket, 'moderator:stopVideo');

					cb();

					break;
				}
			case 'moderator:requestPeerVideo':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					const { peerId } = request.data;

					const requestVideoPeer = this._peers[peerId];

					if (!requestVideoPeer)
						throw new Error(`peer with id "${peerId}" not found`);

					this._notifyTo('participants', requestVideoPeer.socket, 'moderator:requestPeerVideo', { peerId });

					cb();

					break;
				}
			case 'moderator:requestPeerAudio':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					const { peerId } = request.data;

					const requestAudioPeer = this._peers[peerId];

					if (!requestAudioPeer)
						throw new Error(`peer with id "${peerId}" not found`);

					this._notifyTo('participants', requestAudioPeer.socket, 'moderator:requestPeerAudio', { peerId });

					cb();

					break;
				}

			case 'moderator:stopAllVideo':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					// Spread to others
					this._notification(peer.socket, 'moderator:stopVideo', null, true);

					cb();

					break;
				}

			case 'moderator:stopAllScreenSharing':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					// Spread to others
					this._notification(peer.socket, 'moderator:stopScreenSharing', null, true);

					cb();

					break;
				}

			case 'moderator:stopScreenSharing':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					const { peerId } = request.data;

					const stopVideoPeer = this._peers[peerId];

					if (!stopVideoPeer)
						throw new Error(`peer with id "${peerId}" not found`);

					this._notification(stopVideoPeer.socket, 'moderator:stopScreenSharing');

					cb();

					break;
				}

			case 'moderator:closeMeeting':
				{
					if (!this._hasPermission(peer, END_MEETING))
						throw new Error('peer not authorized');

					this._notification(peer.socket, 'moderator:kick', null, true);

					cb();

					// Close the room
					this.close();

					break;
				}

			case 'moderator:kickLobbyPeer':
				{
					if (!this._hasPermission(peer, REMOVE_USER))
						throw new Error('peer not authorized');

					const { peerId } = request.data;

					this._lobby.kick(peerId);

					// if (!kickLobbyPeer)
					// 	throw new Error(`peer with id "${peerId}" not found`);

					// this._notification(kickLobbyPeer.socket, 'lobby:peerClosed');

					// kickLobbyPeer.close();

					cb();

					break;
				}

			case 'moderator:kickPeer':
				{
					if (!this._hasPermission(peer, REMOVE_USER))
						throw new Error('peer not authorized');

					const { peerId } = request.data;

					const kickPeer = this._peers[peerId];

					if (!kickPeer)
						throw new Error(`peer with id "${peerId}" not found`);

					this._notification(kickPeer.socket, 'moderator:kick');

					kickPeer.close();

					cb();

					break;
				}

			case 'moderator:lowerHand':
				{
					if (!this._hasPermission(peer, MODERATE_ROOM))
						throw new Error('peer not authorized');

					const { peerId } = request.data;

					const lowerPeer = this._peers[peerId];

					if (!lowerPeer)
						throw new Error(`peer with id "${peerId}" not found`);

					this._notification(lowerPeer.socket, 'moderator:lowerHand');

					cb();

					break;
				}
			case 'canvasHistory': {
				const canvasHistory = this._canvasHistory;
				// Spread to others
				this._notifyTo('canvas', peer.socket, 'canvasHistory', {
					peerId: peer.id,
					canvasHistory
				});
				cb();
				break;
			}

			case 'drawPoint': {
				const { drawPoint } = request.data;
				// Spread to others
				this._notifyTo('canvas', peer.socket, 'drawPoint', {
					peerId: peer.id,
					drawPoint: drawPoint
				}, true);
				cb();
				break;
			}
			case 'drawLazer': {
				const { points } = request.data;
				// Spread to others
				this._notifyTo('canvas', peer.socket, 'drawLazer', {
					peerId: peer.id,
					points: [...points]
				}, true);
				cb();
				break;
			}
			case 'lazerEnd': {
				// const { drawPoint } = request.data;
				// Spread to others
				this._notifyTo('canvas', peer.socket, 'lazerEnd', {
					peerId: peer.id,
					// drawPoint: drawPoint
				}, true);
				cb();
				break;
			}
			case 'eraserPoint': {
				const { eraserPoint } = request.data;
				this._notifyTo('canvas', peer.socket, 'eraserPoint', {
					peerId: peer.id,
					eraserPoint: eraserPoint
				}, true);
				cb();
				break;
			}
			case 'saveLine': {
				const { line } = request.data;
				this._notifyTo('canvas', peer.socket, 'saveLine', {
					peerId: peer.id,
					line: line
				}, true);
				cb();
				break;
			}
			case 'saveAction': {
				const { action } = request.data;
				this._canvasHistory.actions.push(action);
				this._canvasHistory.undoActions.push(action);
				this._canvasHistory.redoActions = [];
				this._notifyTo('canvas', peer.socket, 'saveAction', {
					peerId: peer.id,
					action: action
				}, true);
				cb();
				break;
			}
			case 'deleteLine': {
				const { index } = request.data;
				const action = {
					type: 'deleteLine',
					data: { index }
				}
				// this._canvasHistory.push(JSON.stringify(action));
				this._notifyTo('canvas', peer.socket, 'deleteLine', {
					peerId: peer.id,
					index
				}, true);
				cb();
				break;
			}
			case 'deleteAction': {
				const { index } = request.data;
				const action = {
					type: 'deleteAction',
					data: { index }
				}
				const data = this._canvasHistory.actions[index];
				this._canvasHistory.actions.splice(index, 1);
				this._canvasHistory.undoActions.push(data);
				this._notifyTo('canvas', peer.socket, 'deleteAction', {
					peerId: peer.id,
					index
				}, true);
				cb();
				break;
			}
			case 'clearScreen': {
				this._canvasHistory.undoActions = [...this._canvasHistory.undoActions, ...this._canvasHistory.actions];
				this._canvasHistory.actions = [];
				this._canvasHistory.redoActions = [];
				this._notifyTo('canvas', peer.socket, 'clearScreen', {
					peerId: peer.id,
				}, true);
				cb();
				break;
			}
			case 'undoScreen': {
				// const action = {
				// 	type: 'undoScreen',
				// }
				const action = this._canvasHistory.actions.pop();
				this._canvasHistory.undoActions.pop();
				this._canvasHistory.redoActions.push(action);
				this._notifyTo('canvas', peer.socket, 'undoScreen', {
					peerId: peer.id,
				}, true);
				cb();
				break;
			}
			case 'redoScreen': {
				const action = this._canvasHistory.redoActions.pop();
				this._canvasHistory.actions.push(action);
				this._canvasHistory.undoActions.push(action);
				this._notifyTo('canvas', peer.socket, 'redoScreen', {
					peerId: peer.id,
				}, true);
				cb();
				break;
			}

			default:
				{
					logger.error('unknown request.method "%s"', request.method);

					cb(500, `unknown request.method "${request.method}"`);
				}
		}
	}

	/**
	 * Creates a mediasoup Consumer for the given mediasoup Producer.
	 *
	 * @async
	 */
	async _createConsumer({ consumerPeer, producerPeer, producer }) {
		logger.log(
			'_createConsumer() [consumerPeer:"%s", producerPeer:"%s", producer:"%s"]',
			consumerPeer.id,
			producerPeer.id,
			producer.id
		);

		const router = this._mediasoupRouters.get(producerPeer.routerId);

		// Optimization:
		// - Create the server-side Consumer. If video, do it paused.
		// - Tell its Peer about it and wait for its response.
		// - Upon receipt of the response, resume the server-side Consumer.
		// - If video, this will mean a single key frame requested by the
		//   server-side Consumer (when resuming it).

		// NOTE: Don't create the Consumer if the remote Peer cannot consume it.
		if (
			!consumerPeer.rtpCapabilities ||
			!router.canConsume(
				{
					producerId: producer.id,
					rtpCapabilities: consumerPeer.rtpCapabilities
				})
		) {
			return;
		}

		// Must take the Transport the remote Peer is using for consuming.
		const transport = consumerPeer.getConsumerTransport();

		// This should not happen.
		if (!transport) {
			logger.warn('_createConsumer() | Transport for consuming not found');

			return;
		}

		// Create the Consumer in paused mode.
		let consumer;

		try {
			consumer = await transport.consume(
				{
					producerId: producer.id,
					rtpCapabilities: consumerPeer.rtpCapabilities,
					paused: producer.kind === 'video'
				});

			logger.log('Consumer +++++++++++++', consumer);

			if (producer.kind === 'audio')
				await consumer.setPriority(255);
		}
		catch (error) {
			logger.warn('_createConsumer() | [error:"%o"]', error);

			return;
		}

		// Store the Consumer into the consumerPeer data Object.
		consumerPeer.addConsumer(consumer.id, consumer);

		// Set Consumer events.
		consumer.on('transportclose', () => {
			// Remove from its map.
			consumerPeer.removeConsumer(consumer.id);
		});

		consumer.on('producerclose', () => {
			// Remove from its map.
			consumerPeer.removeConsumer(consumer.id);

			this._notification(consumerPeer.socket, 'consumerClosed', { consumerId: consumer.id });
		});

		consumer.on('producerpause', () => {
			this._notification(consumerPeer.socket, 'consumerPaused', { consumerId: consumer.id });
		});

		consumer.on('producerresume', () => {
			this._notification(consumerPeer.socket, 'consumerResumed', { consumerId: consumer.id });
		});

		consumer.on('score', (score) => {
			this._notification(consumerPeer.socket, 'consumerScore', { consumerId: consumer.id, score });
		});

		consumer.on('layerschange', (layers) => {
			this._notification(
				consumerPeer.socket,
				'consumerLayersChanged',
				{
					consumerId: consumer.id,
					spatialLayer: layers ? layers.spatialLayer : null,
					temporalLayer: layers ? layers.temporalLayer : null
				}
			);
		});

		// Send a request to the remote Peer with Consumer parameters.
		try {
			await this._request(
				consumerPeer.socket,
				'newConsumer',
				{
					peerId: producerPeer.id,
					kind: consumer.kind,
					producerId: producer.id,
					id: consumer.id,
					rtpParameters: consumer.rtpParameters,
					type: consumer.type,
					appData: producer.appData,
					producerPaused: consumer.producerPaused
				}
			);

			// Now that we got the positive response from the remote Peer and, if
			// video, resume the Consumer to ask for an efficient key frame.
			await consumer.resume();
			logger.log(`consumer resume`);

			this._notification(
				consumerPeer.socket,
				'consumerScore',
				{
					consumerId: consumer.id,
					score: consumer.score
				}
			);
		}
		catch (error) {
			logger.warn('_createConsumer() | [error:"%o"]', error);
		}
	}

	_hasPermission(peer, permission) {
		const hasPermission = peer.permissions.includes(permission);

		if (hasPermission)
			return true;
		return false;
	}

	_hasAccess(peer, access) {
		return peer.roles.some((role) => roomAccess[access].includes(role));
	}

	/**
	 * Helper to get the list of joined peers.
	 */
	_getJoinedPeers(excludePeer = undefined) {
		// logger.log(`I am called when join is called and came to get joinedPeers`,this._peers);
		return Object.values(this._peers)
			.filter((peer) => peer.joined && peer !== excludePeer);
	}

	_getAllowedPeers(permission = null, excludePeer = undefined, joined = true) {
		const peers = this._getPeersWithPermission(permission, excludePeer, joined);

		if (peers.length > 0)
			return peers;

		// Allow if config is set, and no one is present
		if (roomAllowWhenRoleMissing.includes(permission))
			return Object.values(this._peers);

		return peers;
	}

	_getPeersWithPermission(permission = null, excludePeer = undefined, joined = true) {
		return Object.values(this._peers)
			.filter(
				(peer) =>
					peer.joined === joined &&
					peer !== excludePeer &&
					peer.permissions.includes(permission)
			);
	}

	_timeoutCallback(callback) {
		let called = false;

		const interval = setTimeout(
			() => {
				if (called)
					return;
				called = true;
				callback(new SocketTimeoutError('Request timed out'));
			},
			config.requestTimeout || 20000
		);

		return (...args) => {
			if (called)
				return;
			called = true;
			clearTimeout(interval);

			callback(...args);
		};
	}

	_sendRequest(socket, method, data = {}) {
		return new Promise((resolve, reject) => {
			socket.emit(
				'request',
				{ method, data },
				this._timeoutCallback((err, response) => {
					if (err) {
						reject(err);
					}
					else {
						resolve(response);
					}
				})
			);
		});
	}

	async _request(socket, method, data) {
		logger.log('_request() [method:"%s", data:"%o"]', method, data);

		const {
			requestRetries = 3
		} = config;

		for (let tries = 0; tries < requestRetries; tries++) {
			try {
				return await this._sendRequest(socket, method, data);
			}
			catch (error) {
				if (
					error instanceof SocketTimeoutError &&
					tries < requestRetries
				)
					logger.warn('_request() | timeout, retrying [attempt:"%s"]', tries);
				else
					throw error;
			}
		}
	}

	_notification(socket, method, data = {}, broadcast = false, includeSender = false) {
		if (broadcast) {
			socket.broadcast.to(this._roomId).emit(
				'notification', { method, data }
			);

			if (includeSender)
				socket.emit('notification', { method, data });
		}
		else {
			socket.emit('notification', { method, data });
		}
	}

	_notifyTo(notifyTo, socket, method, data = {}, broadcast = false, includeSender = false) {
		{
			logger.log(notifyTo, socket, method, data, broadcast, includeSender);
			if (broadcast) {
				socket.broadcast.to(this._roomId).emit(
					notifyTo, { method, data }
				);

				if (includeSender)
					socket.emit(notifyTo, { method, data });
			}
			else {
				socket.emit(notifyTo, { method, data });
			}
		}
	}

	async _pipeProducersToNewRouter() {
		const peersToPipe =
			Object.values(this._peers)
				.filter((peer) => peer.routerId !== this._currentRouter.id);

		for (const peer of peersToPipe) {
			const srcRouter = this._mediasoupRouters.get(peer.routerId);

			for (const producerId of peer.producers.keys()) {
				await srcRouter.pipeToRouter({
					producerId,
					router: this._currentRouter
				});
			}
		}
	}

	async _getRouterId() {
		if (this._currentRouter) {
			const routerLoad =
				Object.values(this._peers)
					.filter((peer) => peer.routerId === this._currentRouter.id).length;

			if (routerLoad >= ROUTER_SCALE_SIZE) {
				this._currentRouter = this._routerIterator.next().value;

				if (this._currentRouter) {
					await this._pipeProducersToNewRouter();

					return this._currentRouter.id;
				}
			}
			else {
				return this._currentRouter.id;
			}
		}

		return this._getLeastLoadedRouter();
	}

	// Returns an array of router ids we need to pipe to
	_getRoutersToPipeTo(originRouterId) {
		return Object.values(this._peers)
			.map((peer) => peer.routerId)
			.filter((routerId, index, self) =>
				routerId !== originRouterId && self.indexOf(routerId) === index
			);
	}

	_getLeastLoadedRouter() {
		let load = Infinity;
		let id;

		for (const routerId of this._mediasoupRouters.keys()) {
			const routerLoad =
				Object.values(this._peers).filter((peer) => peer.routerId === routerId).length;

			if (routerLoad < load) {
				id = routerId;
				load = routerLoad;
			}
		}

		return id;
	}
}


module.exports = Room;
