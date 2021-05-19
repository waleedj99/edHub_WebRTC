const initialState = {
    locked: false,
    inLobby: false,
    denied: false,
    joined: false,
    permanentLocked: false,
    screenShare: true,
};

const room = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_ENABLE_WAITING_ROOM':
            {
                return { ...state, locked: true };
            }

        case 'SET_DISABLE_WAITING_ROOM':
            {
                return { ...state, locked: false };
            }

        case 'SET_ROOM_DENIED': {
            const { denied } = action.payload;
            return { ...state, denied };
        }

        case 'SET_IN_LOBBY':
            {
                const { inLobby } = action.payload;

                return { ...state, inLobby };
            }
        case 'TOGGLE_JOINED':
            {
                const joined = true;

                return { ...state, joined };
            }
        case 'SET_ROOM_DISABLE_PERMANENT_LOCK':
            {
                return { ...state, permanentLocked: false }
            }
        case 'SET_ROOM_ENABLE_PERMANENT_LOCK':
            {
                return { ...state, permanentLocked: true }
            }
        case 'ENABLE_SCREEN_SHARE':
            {
                return { ...state, screenShare: true }
            }
        case 'DISABLE_SCREEN_SHARE':
            {
                return { ...state, screenShare: false }
            }
        default:
            return state;
    }
}

export default room;
