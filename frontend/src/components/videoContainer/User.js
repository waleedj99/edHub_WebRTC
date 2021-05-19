import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';
import { ReactComponent as MicrophoneOn } from "../../Assets/Icons/microphone.svg"

import { ReactComponent as MicrophoneOff } from "../../Assets/Icons/microphone-off.svg"
import { ReactComponent as VideoIcon } from "../../Assets/Icons/video-off.svg"

// import {ReactComponent as MicrophoneOn} from "../Assets/Icons/microphone.svg"
// import {ReactComponent as MicrophoneOff} from "../Assets/Icons/microphone-off.svg"
// import {ReactComponent as Video} from "../Assets/Icons/video.svg"
// import {ReactComponent as VideoOff} from "../Assets/Icons/video-off.svg"



// import PropTypes from 'prop-types'
import Logger from '../../Logger';
import VideoView from './VideoView';

const logger = new Logger('User');

class User extends Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {

    }

    componentDidUpdate() {
    }
    handleshuja=()=>{
        console.log("shuja handled")
    }

    render() {
        const { webcamProducer, screenShareProducer, micProducer, user } = this.props;
        logger.log(user.micState, user.webcamState, user.screenShareState);
        return (
            <div id="two" className={this.props.stylename}>
                <div className="vidratio">
                    <div className="vidcontent"> {/* Add a state here to change the background color  */}
                        {user.webcamState === "on"?
                            <span onCLick={this.handleshuja()}>
                                {
                                    user.screenShareState==="on" ? <span> {
                                        screenShareProducer &&
                                        <VideoView
                                            isUser={false}
                                            videoTrack={screenShareProducer && screenShareProducer.track}
                                            width="100"
                                            controls />
                                    }</span>:  <VideoView
                                    isUser={true}
                                    videoTrack={webcamProducer && webcamProducer.track}
                                    width="100" />
                                }
                               
                               
                            </span> :
                            <span onCLick={this.handleshuja()}>
                                 {
                                    user.screenShareState==="on" ? <span> {
                                        screenShareProducer &&
                                        <VideoView
                                            isUser={false}
                                            videoTrack={screenShareProducer && screenShareProducer.track}
                                            width="100"
                                            controls />
                                    }</span>: 
                                <div className={this.props.novideo} >
                                    <div className="circle"> MN </div>
                                    <div className={this.props.vidti}>
                                        <div>
                                            Member Name
                                            </div>
                                        <div className="vid-distance">
                                            {user.micState == "on" ? <MicrophoneOn className={this.props.vidti, "icon1"} /> : <MicrophoneOff className={this.props.vidti, "icon1"} />}
                                            <VideoIcon className={this.props.vidti, "icon1"} />
                                        </div>
                                    </div>

                                </div>}
                            </span>}



                    </div>
                </div>
            </div>
        )
    }
}

// User.propTypes = {

// }

const mapStateToProps = (state) => {
    let producers = state.producers;
    const getWebcamProducer = () => {
        return Object.values(producers).find((producer) => producer.source === 'webcam');
    }
    const getScreenShareProducer = () => {
        return Object.values(producers).find((producer) => producer.source === 'screen');
    }
    const getMicProducer = () => {
        return Object.values(producers).find((producer) => producer.source === 'mic');
    }

    return {
        webcamProducer: getWebcamProducer(),
        screenShareProducer: getScreenShareProducer(),
        micProducer: getMicProducer(),
        user: state.user,
    };
};

export default connect(mapStateToProps)(User);
