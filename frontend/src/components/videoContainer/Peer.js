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

    getInitialUserName = (userName)=>{
        var initial = "XX";
        initial = initial.split('');
        initial[0] = userName[0];
        for (let index = 0; index < userName.length; index++) {
            const c = userName[index];
            if(c === ' ' && index+1 < userName.length){
                initial[1] = userName[index+1];
            }
        }
        initial = initial.join('');
        return initial;
    }

    render() {
        const { micConsumer, webcamConsumer, screenShareConsumer,peer } = this.props;
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

        const userNameInitial = this.getInitialUserName(peer.displayName);

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
                                    {userNameInitial}
                                </div>
                                <div className={this.props.vidti}>
                                    <div className="vid-distance">{peer.displayName}</div>
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
        screenShareConsumer: peerConsumers.find((consumer) => consumer.source === 'screen'),
        peer: peer
    };
};

export default connect(mapStateToProps)(Peer);