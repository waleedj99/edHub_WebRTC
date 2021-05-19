const initialState = {
    id: null,
    userName: "Guest",
    canSendMic: false,
    canSendWebcam: false,
    canShareScreen: false,
    canShareFiles: false,
    audioDevices: null,
    webcamDevices: null,
    audioOutputDevices: null,
    raisedHand: false,
    webcamState: "off",
    micState: "off",
    screenShareState: "off",
    roles: ['normal'], // Default role
    permissions: [],
}

const user = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_USER':
            const { userId, userName} = action.payload;
            return {
                ...state,
                id: userId,
                userName: userName
            };
        case 'SET_MEDIA_CAPABILITIES':
            {
                const {
                    canSendMic,
                    canSendWebcam,
                    canShareScreen,
                } = action.payload;

                return {
                    ...state,
                    canSendMic,
                    canSendWebcam,
                    canShareScreen,
                };
            }
        case 'SET_WEBCAM_STATE': {
            const { webcamState } = action.payload;
            return {
                ...state,
                webcamState
            }
        }
        case 'SET_MIC_STATE': {
            const { micState } = action.payload;
            return {
                ...state,
                micState
            }
        }
        case 'SET_SCREEN_SHARE_STATE': {
            const { screenShareState } = action.payload;
            return {
                ...state,
                screenShareState
            }
        }
        case 'SET_AUDIO_DEVICES':
            {
                const { devices } = action.payload;

                return { ...state, audioDevices: devices };
            }

        case 'SET_AUDIO_OUTPUT_DEVICES':
            {
                const { devices } = action.payload;

                return { ...state, audioOutputDevices: devices };
            }

        case 'SET_WEBCAM_DEVICES':
            {
                const { devices } = action.payload;

                return { ...state, webcamDevices: devices };
            }
        case 'ADD_ROLE':
            {
                if (state.roles.includes(action.payload.role))
                    return state;

                const roles = [...state.roles, action.payload.role];

                return { ...state, roles };
            }

        case 'REMOVE_ROLE':
            {
                const roles = state.roles.filter((role) =>
                    role !== action.payload.role);

                return { ...state, roles };
            }

        case 'ADD_PERMISSION':
            {
                const { permission } = action.payload;
                if (state.permissions.includes(permission))
                    return state;

                const permissions = [...state.permissions, permission];

                return { ...state, permissions };
            }
        case 'ADD_PERMISSIONS':
            {
                const { permissions } = action.payload;
                if (permissions.length < 1)
                    return state;

                const newPermissions = [...state.permissions, ...permissions];
                const uniquePermissions = [...new Set([...newPermissions])];

                return { ...state, permissions: uniquePermissions };
            }

        case 'REMOVE_PERMISSION':
            {
                const permissions = state.permissions.filter((permission) =>
                    permission !== action.payload.permission);

                return { ...state, permissions };
            }

        default:
            return state;
    }
}

export default user;