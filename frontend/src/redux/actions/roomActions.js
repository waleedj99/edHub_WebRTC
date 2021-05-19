export const setEnableWaitingRoom = () =>
({
    type: 'SET_ENABLE_WAITING_ROOM'
});

export const setDisableWaitingRoom = () =>
({
    type: 'SET_DISABLE_WAITING_ROOM'
});

export const setRoomDisablePermanentLock = () =>
({
    type: 'SET_ROOM_DISABLE_PERMANENT_LOCK'
});

export const setRoomEnablePermanentLock = () =>
({
    type: 'SET_ROOM_ENABLE_PERMANENT_LOCK'
});

export const setRoomDenied = (denied) =>
({
    type: 'SET_ROOM_DENIED',
    payload: {denied}

});

export const setInLobby = (inLobby) =>
({
    type: 'SET_IN_LOBBY',
    payload: { inLobby }
});

export const toggleJoined = () =>
({
    type: 'TOGGLE_JOINED'
});

export const enableScreenShare = () =>
({
    type: 'ENABLE_SCREEN_SHARE'
});

export const disableScreenShare = () =>
({
    type: 'DISABLE_SCREEN_SHARE'
});