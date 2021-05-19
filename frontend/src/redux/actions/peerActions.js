export const addPeer = (peer) =>
({
    type: 'ADD_PEER',
    payload: { peer }
});

export const removePeer = (peerId) =>
({
    type: 'REMOVE_PEER',
    payload: { peerId }
});


export const setPeerRaisedHand = (peerId, raisedHand, raisedHandTimestamp) =>
({
    type: 'SET_PEER_RAISED_HAND',
    payload: { peerId, raisedHand, raisedHandTimestamp }
});


export const addPeerRole = (peerId, role) =>
({
    type: 'ADD_PEER_ROLE',
    payload: { peerId, role }
});

export const removePeerRole = (peerId, role) =>
({
    type: 'REMOVE_PEER_ROLE',
    payload: { peerId, role }
});
