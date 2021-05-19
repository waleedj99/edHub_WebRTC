import socketClient from 'socket.io-client';

const opts = {
    transports: ['websocket']
};

// const signalingUrl = getSignalingUrl;

// getSignalingUrl = ({ peerId, roomId }) => {
    const hostName = window.location.hostname === 'localhost' ? '0.0.0.0' : window.location.hostname;
    const port = process.env.REACT_APP_SERVER_PORT || 443;
    const url = `https://${hostName}:${port}`///?peerId=${peerId}&roomId=${roomId}`;
    // return url;
// }

// export const getSignalingUrl;

export const signalingSocket = socketClient(url, opts);

