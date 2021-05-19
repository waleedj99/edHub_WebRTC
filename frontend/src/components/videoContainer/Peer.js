import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';
import Logger from '../../Logger';
import consumers from '../../redux/reducers/consumers';
import VideoView from './VideoView';
import { ReactComponent as VideoIcon } from "../../Assets/Icons/video-off.svg"

import { ReactComponent as MicrophoneOn } from "../../Assets/Icons/microphone.svg"
import { ReactComponent as MicrophoneOff } from "../../Assets/Icons/microphone-off.svg"
// import { ReactComponent as MicrophoneOff } from "../Assets/Icons/microphone-off.svg"
//import { ReactComponent as Video } from "../Assets/Icons/video.svg"
//import { ReactComponent as VideoOff } from "../Assets/Icons/video-off.svg"
import "./Styles.css"
import AudioView from './AudioView';
const logger = new Logger('Peer');

class Peer extends Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() { }

    componentDidUpdate(prevProps) { }

    render() {
        const { micConsumer, webcamConsumer, screenShareConsumer } = this.props;
        const micState = (
            Boolean(micConsumer) &&
            !micConsumer.locallyPaused &&
            !micConsumer.remotelyPaused
        );

        const webcamState = (
            Boolean(webcamConsumer) &&
            !webcamConsumer.locallyPaused &&
            !webcamConsumer.remotelyPaused
        );

        const screenShareState = (
            Boolean(screenShareConsumer) &&
            !screenShareConsumer.locallyPaused &&
            !screenShareConsumer.remotelyPaused
        );

        logger.log('micState, webcamState, screenShareState', micState, webcamState, screenShareState);

        return (<div id="peer" className={this.props.stylename}>
            <div className="vidratio">
                <div className="vidcontent">
                    {webcamState ?
                        <span >
                            {
                                screenShareState ?<span>
                                     {
                                screenShareConsumer &&
                                <VideoView isUser={false}
                                    videoTrack={screenShareConsumer && screenShareConsumer.track}
                                />
                            }
                                </span> :  <VideoView isUser={false}
                                videoTrack={webcamConsumer && webcamConsumer.track}
                            />
                            }
                          
                           
                        </span>
                        :
                        <span>{
                            screenShareState?<span>
                                {
                                screenShareConsumer &&
                                <VideoView isUser={false}
                                    videoTrack={screenShareConsumer && screenShareConsumer.track}
                                />
                            }

                            </span>:<div className={this.props.novideo} >
                                <div className="circle">
                                    MN
                                </div>
                                <div className={this.props.vidti}>
                                    <div className="vid-distance">Member Name </div>
                                    <div className="vid-distance">
                                        {micState ? <MicrophoneOn className={this.props.vidti, "icon1"} /> : <MicrophoneOff className={this.props.vidti, "icon1"} />}
                                        <VideoIcon className={this.props.vidti, "icon1"} />
                                    </div>
                                </div>
                            </div>
                            
                            }
                            
                        </span>
                    }
                    <AudioView isUser={false}
                        audioTrack={micConsumer && micConsumer.track}
                    />


                </div>
            </div>
        </div>
        )
    }
}

const mapStateToProps = (state, ownProps) => {
    const { peer } = ownProps;
    logger.log(`peer`, peer);
    const peerConsumersKey = peer.consumers;
    logger.log('peerConsumersKey', peerConsumersKey);
    const allConsumers = state.consumers;
    logger.log('allConsumers', allConsumers);
    const peerConsumers = peerConsumersKey.map((peerConsumerKey) => allConsumers[peerConsumerKey]);
    logger.log('peerConsumers', peerConsumers);
    return {
        micConsumer: peerConsumers.find((consumer) => consumer.source === 'mic'),
        webcamConsumer: peerConsumers.find((consumer) => consumer.source === 'webcam'),
        screenShareConsumer: peerConsumers.find((consumer) => consumer.source === 'screen')
    };
};

export default connect(mapStateToProps)(Peer);