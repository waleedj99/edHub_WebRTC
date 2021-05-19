const initialState = {};

const peers = (state = initialState, action) => {
    switch (action.type) {
        case 'ADD_PEER': {
            console.log(`ADD_PEER`, action);
            return { ...state, [action.payload.peer.id]: action.payload.peer };
        }
        case 'REMOVE_PEER':
            {
                const { peerId } = action.payload;
                const newState = { ...state };

                delete newState[peerId];

                return newState;
            }
        case 'SET_PEER_RAISED_HAND':
            const { peerId } = action.payload;
            const olderPeer = state[peerId];
            if (!olderPeer) return state;
            return {
                ...state,
                [olderPeer.id]: {
                    ...olderPeer,
                    raisedHand: action.payload.raisedHand,
                    raisedHandTimestamp: action.payload.raisedHandTimestamp
                }
            };
        case 'ADD_CONSUMER': {
            const { consumer, peerId } = action.payload;
            const olderPeer = state[peerId];
            if (!olderPeer) return state;
            const consumers = [...olderPeer.consumers, consumer.id];
            return { ...state, [olderPeer.id]: { ...olderPeer, consumers } };
        }
        case 'REMOVE_CONSUMER': {
            const { consumerId, peerId } = action.payload;
            const olderPeer = state[peerId];
            if (!olderPeer) return state;
            const consumers = olderPeer.consumers.filter((consumer) => consumer !== consumerId);
            return { ...state, [olderPeer.id]: { ...olderPeer, consumers } };
        }

        case 'ADD_PEER_ROLE':
            {
                const { peerId, role } = action.payload;
                const olderPeer = state[peerId];
                if (!olderPeer) return state;
                const roles = [...olderPeer.roles, role];

                return { ...state, [olderPeer.id]: { ...olderPeer, roles } };
            }

        case 'REMOVE_PEER_ROLE':
            {
                const { peerId, role } = action.payload;
                const olderPeer = state[peerId];
                if (!olderPeer) return state;

                const roles = olderPeer.roles.filter((r) => r !== role);

                return { ...state, [olderPeer.id]: { ...olderPeer, roles } };
            }
        default:
            return state;
    }
}

export default peers;
