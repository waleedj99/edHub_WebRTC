import React, { Component } from 'react';
import "./Setting.css"
import Logger from '../../../Logger';
import { connect } from 'react-redux';
import { withRoomContext } from '../../../RoomContext';
import {useThemeContent}from "../../../Utils/ThemeContext"
import ThemeContext from "../../../Utils/ThemeContext"

const logger = new Logger('Settings');
class Setting extends Component {
    constructor(props){
        super(props);
        this.state = {
          darkmode:true
        }
      }
    static contextType=  ThemeContext 
    setDarkmode(){
        console.log("setDarkmodecalled")
        this.setState({
            darkmode:false
        })
    }
    componentDidMount(){       
         const darkcolor = this.context

         console.log(this.state.darkmode);
         this.setDarkmode()
         console.log(this.state.darkmode);
     


    }
      

    state = {
        audiosettings: true,
        videosettings: false,
        preferences: false,
        resolution: ['low', 'medium', 'high', 'veryhigh', 'ultra']
    }

    render() {
                const { user, roomClient } = this.props;
        const { resolution } = this.state;
        logger.log('user.audioDevices', user.audioDevices);
        logger.log('user.webcamDevices', user.webcamDevices);
        logger.log('user.audioOutputDevices', user.audioOutputDevices);

        const webcamDevices = user.webcamDevices ? Object.values(user.webcamDevices) : [];
        const audioDevices = user.audioDevices ? Object.values(user.audioDevices) : [];
        const audioOutputDevices = user.audioOutputDevices ? Object.values(user.audioOutputDevices) : [];
      // To actaully select a new device just call roomClient.updateWebcam({restart: true,newDeviceId: DEVICE_ID});
        // Similarly roomClient.updateMic({restart: true,newDeviceId: DEVICE_ID});
        // for newResolution we use roomClient.updateWebcam({newResolution:VALUE});

        return (
            <div className="settings_modal2">
                <div className="settings_left" >
                    <div className={this.state.audiosettings ? "settings2_option settings2selected" : "settings2_option"} style={{ marginTop: 32 }} onClick={() => { this.setState({ audiosettings: true, videosettings: false, preferences: false }) }}> Audio</div>
                    <div className={this.state.videosettings ? "settings2_option settings2selected" : "settings2_option"} onClick={() => { this.setState({ videosettings: true, preferences: false, audiosettings: false }) }}> Video</div>
                    <div className={this.state.preferences ? "settings2_option settings2selected" : "settings2_option"} onClick={() => { this.setState({ videosettings: false, preferences: true, audiosettings: false }) }}> Permission</div>


                </div>
                <div className="settings_right">
                    {this.state.audiosettings ?
                        <div className="Sr_top">
                            <span className="bb-set">Select Mic</span>
                            <br />
                            {audioDevices.map((audioDevice, index) => {
                                return <li>{audioDevice.label}</li>
                            })}
                            {/* <li>Microphone One</li>
                        <li>Microphone Two</li> */}
                            <hr className="settingsline2" />
                            <span className="bb-set">                         Select Speakers
</span>
                         {audioOutputDevices.map((audioOutputDevice, index) => {
                                return <li className="bb-set">{audioOutputDevice.label}</li>
                            })}
                            {/* <li>Speaker One</li>
                        <li>Speaker two</li> */}
                        </div>
                        :
                        <div></div>
                    }
                    {this.state.videosettings ?
                        <div className="Sr_top">
                         <span >Select Camera</span><br />
                            {webcamDevices.map((webcamDevice, index) => {
                                return <li className="bb-set">{webcamDevice.label}</li>
                            })}
                            {/* <li>Camera One</li>
                        <li>Camera Two</li> */}
                            <hr className="settingsline2" />
                            <span >Video Quality:</span>
                       
                       {resolution.map((resolution, index) => {
                                return <li className="bb-set" onClick={() => roomClient.updateWebcam({ newResolution: resolution })}>{resolution}</li>
                            })}
                            {/* <li>Auto 144p 240p </li>
                        <li>(Finnese this design after functionality added) </li> */}
                        </div>
                        :
                        <div></div>
                    }
                    {this.state.preferences ? <div className="Sr_top">Participant Permissions<br /> <li className="bb-set">Share Screen</li> <li className="bb-set">Chat</li><li className="bb-set"> Rename Themselves</li><li className="bb-set">Unmute</li><hr className="settingsline2" /> Chat Permissions <li className="bb-set">Chat with No One</li><li className="bb-set">Chat with Host only</li><li className="bb-set">Chat with Everyone Publically</li><li className="bb-set">Chat with Everyone Publically & Privately</li></div> : <div></div>}

                </div>
            </div>);
    }
}

const mapStateToProps = (state) => {
    return {
        user: state.user,
    };
};

export default withRoomContext(connect(mapStateToProps)(Setting));

