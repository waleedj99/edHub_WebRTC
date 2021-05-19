import React, { Component, createRef } from 'react';
import Logger from '../../Logger';
import PropTypes from 'prop-types';

const logger = new Logger('VideoView');

class VideoView extends Component {
    constructor(props) {
        super(props);

        // Latest received audio track
        // @type {MediaStreamTrack}
        this._audioTrack = null;

        // Latest received video track.
        // @type {MediaStreamTrack}
        this._videoTrack = null;

        this.videoElementRef = createRef();
        this.audioElementRef = createRef();
    }
    getFullScreenElement=()=>{
        return document.fullscreenElement  
        ||document.webkitFullscreenElement
        ||document.mozFullscreenElement
        || document.msFullscreenElement;

    }
handlefullscreen=()=>{
    console.log("this is a function not a party ");
    if(this.getFullScreenElement()){
        document.exitFullscreen();
    }
    else{
   
        document.getElementById("vidfull").requestFullscreen().catch((e)=>{
            console.log(e);
        })
    }
}
    render() {
        const { isUser } = this.props;
        logger.log(`count`);
        return (
            <>
                <video
                    ref={this.videoElementRef}
                    autoPlay
                    muted
                    playsInline
                    width="100"  
                    onDoubleClick={()=>this.handlefullscreen()}
                    id="vidfull"
                />
                <audio
                    ref={this.audioElementRef}
                    autoPlay
                    playsInline
                    muted={isUser}
                />
            </>
        )
    }

    componentDidMount() {
        const { videoTrack, audioTrack } = this.props;
        this._setTracks(videoTrack, audioTrack);
    }

    componentWillUnmount() {
        // clearInterval(this._videoResolutionTimer);
        const videoElement = this.videoElementRef.current;

        if (videoElement) {
            videoElement.oncanplay = null;
            videoElement.onplay = null;
            videoElement.onpause = null;
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {
            const { videoTrack, audioTrack } = this.props;
            this._setTracks(videoTrack, audioTrack);
        }
    }

    _setTracks(videoTrack, audioTrack) {
        if (this._videoTrack === videoTrack && this._audioTrack === audioTrack)
            return;

        this._videoTrack = videoTrack;
        this._audioTrack = audioTrack;


        // clearInterval(this._videoResolutionTimer);
        // this._hideVideoResolution();
        const videoElement = this.videoElementRef.current;
        const audioElement = this.audioElementRef.current;

        if (videoTrack) {

            // videoTrack.muted = false;
            const stream = new MediaStream();

            stream.addTrack(videoTrack);

            videoElement.srcObject = stream;

            // videoElement.oncanplay = () => this.setState({ videoCanPlay: true });

            videoElement.onplay = () => {
                audioElement.play()
                    .catch((error) => logger.warn('audioElement.play() [error:"%o]', error));
            };
            logger.log(`About to play video`);
            videoElement.play()
                .catch((error) => logger.warn('videoElement.play() [error:"%o]', error));
            logger.log(`playing video`);

            // this._showVideoResolution();
        }
        else {
            videoElement.srcObject = null;
        }

        if (audioTrack) {

            // audioTrack.muted = false;
            const stream = new MediaStream();

            stream.addTrack(audioTrack);
            audioElement.srcObject = stream;

            audioElement.play()
                .catch((error) => logger.warn('audioElement.play() [error:"%o]', error));
        }
        else {
            audioElement.srcObject = null;
        }
        logger.log(`The video and audio track`, this._videoTrack, this._audioTrack);
    }
}

VideoView.propTypes = {
    videoTrack: PropTypes.any,
    audioTrack: PropTypes.any,
};

export default VideoView;
