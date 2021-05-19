import React, { Component, createRef } from 'react';
import Logger from '../../Logger';
import PropTypes from 'prop-types';

const logger = new Logger('AudioView');

class AudioView extends Component {
    constructor(props) {
        super(props);

        // Latest received audio track
        // @type {MediaStreamTrack}
        this._audioTrack = null;

        this.audioElementRef = createRef();
    }

    render() {
        const { isUser } = this.props;
        logger.log(`count`);
        return (
            <>
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
        const { audioTrack } = this.props;
        this._setTracks(audioTrack);
    }

    componentWillUnmount() {
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {
            const { audioTrack } = this.props;
            this._setTracks(audioTrack);
        }
    }

    _setTracks(audioTrack) {
        if (this._audioTrack === audioTrack)
            return;

        this._audioTrack = audioTrack;

        const audioElement = this.audioElementRef.current;

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
        logger.log(`The audio track`, this._audioTrack);
    }
}

AudioView.propTypes = {
    audioTrack: PropTypes.any,
};

export default AudioView;
