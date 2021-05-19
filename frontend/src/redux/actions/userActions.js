export const setuser = ({ peerId }) =>
({
    type: 'SET_USER',
    payload: { peerId }
});

export const setMediaCapabilities = ({
    canSendMic,
    canSendWebcam,
    canShareScreen,
}) =>
({
    type: 'SET_MEDIA_CAPABILITIES',
    payload: { canSendMic, canSendWebcam, canShareScreen }
});

export const setWebcamState = ({ webcamState }) => ({
    type: 'SET_WEBCAM_STATE',
    payload: { webcamState }
});

export const setMicState = ({ micState }) => ({
    type: 'SET_MIC_STATE',
    payload: { micState }
});

export const setScreenShareState = ({ screenShareState }) => ({
    type: 'SET_SCREEN_SHARE_STATE',
    payload: { screenShareState }
});

export const setAudioDevices = (devices) => ({
    type: 'SET_AUDIO_DEVICES',
    payload: { devices }
});

export const setAudioOutputDevices = (devices) => ({
    type: 'SET_AUDIO_OUTPUT_DEVICES',
    payload: { devices }
});

export const setWebcamDevices = (devices) => ({
    type: 'SET_WEBCAM_DEVICES',
    payload: { devices }
});

export const addRole = (role) =>
({
    type: 'ADD_ROLE',
    payload: { role }
});

export const removeRole = (role) =>
({
    type: 'REMOVE_ROLE',
    payload: { role }
});

export const addPermission = (permission) =>
({
    type: 'ADD_PERMISSION',
    payload: { permission }
});

export const addPermissions = (permissions) =>
({
    type: 'ADD_PERMISSIONS',
    payload: { permissions }
});

export const removePermission = (permission) =>
({
    type: 'REMOVE_PERMISSION',
    payload: { permission }
});
