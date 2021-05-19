const constants =
{
	displayName             : 'Guest',
	selectedWebcam          : null,
	selectedAudioDevice     : null,
	advancedMode            : false,
	sampleRate              : 48000,
	channelCount            : 1,
	volume                  : 1.0,
	autoGainControl         : false,
	echoCancellation        : true,
	noiseSuppression        : true,
	voiceActivatedUnmute    : false,
	noiseThreshold          : -50,
	sampleSize              : 16,
	// low, medium, high, veryhigh, ultra
	resolution              : window.config.defaultResolution || 'medium',
	frameRate               : window.config.defaultFrameRate || 15,
	screenSharingResolution : window.config.defaultScreenResolution || 'veryhigh',
	screenSharingFrameRate  : window.config.defaultScreenSharingFrameRate || 5,
	lastN                   : 4,
	permanentTopBar         : true,
	hiddenControls          : false,
	showNotifications       : true,
	notificationSounds      : true,
	buttonControlBar        : window.config.buttonControlBar || false,
	drawerOverlayed         : window.config.drawerOverlayed || true,
	...window.config.defaultAudio
};

export default constants;
