import React, { Component } from "react";
import { Button } from "@material-ui/core";
import { connect } from 'react-redux';
import { ReactComponent as VLogo } from "../Assets/Icons/edhub_dsce.jpeg"
import LpTeacher from "./LpTeacher"
import LpStudent from "./LpStudent"
import { ReactComponent as MicOn } from "../Assets/Icons/microphone.svg"
import { ReactComponent as MicOff } from "../Assets/Icons/microphone-off.svg"
import { ReactComponent as VideoIcon } from "../Assets/Icons/video.svg"
import { ReactComponent as VideoOffIcon } from "../Assets/Icons/video-off.svg"
import Logger from '../Logger';
import { withRoomContext } from "../RoomContext";
import Room from "./Room/Room";
import encrypt from "../Utils/generateToken";
import { permissions } from "../permissions";
import "./LP.css"
import { useThemeContent, useThemeUpdate } from "../Utils/ThemeContext";
import ThemeContext from "../Utils/ThemeContext"
import { contextType } from "react-modal";
import { Fullscreen } from "@material-ui/icons";

const logger = new Logger('LandingPage');

const { WAITING_ROOM, PROMOTE_PEER, MODERATE_ROOM, END_MEETING, REMOVE_USER,LOCK_MEETING } = permissions;

class LandingPage extends Component {
    static contextType = ThemeContext

    constructor(props) {
        super(props);
        this.state = {
            webcam: false,
            mic: false,
            gotRole: false,
            permissions: [],
            role: "", 
            userName: "", 
            userId: "", 
            classroomId: "",
        }
    }



    componentDidMount() {

        //check if browser is supported
        const darkmode = this.context
        this.setState({
            darktheme: false
        })
        console.log(darkmode);
        console.log(this.state.darktheme)
        this.setState({
        })
        if (navigator.mediaDevices === undefined || navigator.mediaDevices.getUserMedia === undefined || window.RTCPeerConnection === undefined) {
            logger.error('Your browser is not supported');
        }


        const { token } = this.props.match.params;
        const {role, userName, userId, classroomId} = this.decodeToken(token);

        this.setState({
            role : role, userName : userName, userId : userId, classroomId : classroomId,
        })

        this._callGetRoleAndPermission();

    }

    _callGetRoleAndPermission = async () => {

        // const token = "TOKEN_FROM_FRONTEND";
        // const encryptedToken = await encrypt(token);
        // const username = "USERNAME_FROM_FRONTEND";
        // const id = "CLASSROOMID_FROM_FRONTEND";
        // const URL = `https://engine.api.edhub.me/role/webrtc?id=${id}&username=${username}&token=${encryptedToken}`;
        // logger.log(URL);

        // get roles and permissions
        {/*} fetch(URL, {
            "method": "GET",
            // "headers": {}
        })
            .then(response => response.json())
            .then(response => {
                logger.log('_callGetRoleAndPermission()', response);
                this.setState({
                    getRole: true,
                    permissions: response.data
                })
            })
            .catch(err => {
                logger.error('_callGetRoleAndPermission()', err);
            });*/}
    }

    handleDemoWebcam = (webcam) => {
        const video = document.querySelector("#demoVideoElement");
        if (!webcam) {
            const stream = video.srcObject;
            const tracks = stream.getTracks();

            for (let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                track.stop();
            }
            video.srcObject = null;
            this.setState({
                webcam: false
            });
        }
        else {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: true })
                    .then((stream) => {
                        video.srcObject = stream;
                        this.setState({
                            webcam: true
                        });
                    })
                    .catch((error) => {
                        logger.log("handleDemoWebcam!", error);
                        this.setState({
                            webcam: false
                        });
                    });
            }
        }
    }

    handleDisplayMessage = (room) => {
        if (room.permanentLocked) {
            return "The room is Locked! Sorry you can't enter the meeting!";
        }
        if (room.denied) {
            return "You are not denined to enter the meeting!";
        }
        if (room.inLobby) {
            return "You are in waiting room - hang on until somebody lets you in ...!";
        }
        return "";
        // {room.permanentLocked ?  : {room.denied ? "" : ""}}
    }

    handleDemoMic = (mic) => {
        const audio = document.querySelector("#demoAudioElement");
        if (!mic) {
            const stream = audio.srcObject;
            const tracks = stream.getTracks();

            for (let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                track.stop();
            }
            audio.srcObject = null;
            this.setState({
                mic: false
            });
        }
        else {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then((stream) => {
                        audio.srcObject = stream;
                        this.setState({
                            mic: true
                        });
                    })
                    .catch((error) => {
                        logger.log("handleDemoWebcam!", error);
                        this.setState({
                            mic: false
                        });
                    });
            }
        }
    }
    getFullScreenElement = () => {
        return document.fullscreenElement
            || document.webkitFullscreenElement
            || document.mozFullscreenElement
            || document.msFullscreenElement;

    }
    clickFullscreen = () => {
        console.log("work");
        if (this.getFullScreenElement()) {
            document.exitFullscreen();
        }
        else {

            document.documentElement.requestFullscreen().catch((e) => {
                console.log(e);
            })
        }

    }

    setPermissions = (role) => {
        let permissions = [];
        if (role === "Host") {
            permissions = [WAITING_ROOM, PROMOTE_PEER, MODERATE_ROOM, END_MEETING, REMOVE_USER,LOCK_MEETING];
        }
        else {
        }
        this.setState({
            gotRole: true,
            permissions: permissions
        })
    }

    decodeToken = (token) => {
        const decodeToken = atob(token);
        const params = [];
        let temp = "";
        for (let i = 0; i < decodeToken.length; i++) {
            if (decodeToken[i] == '+') {
                params.push(temp);
                temp = "";
                continue;
            }
            temp += decodeToken[i];
        }
        params.push(temp);

        this.setPermissions(params[0]);

        return {
            role: params[0],
            userName: params[1],
            userId: params[2],
            classroomId: params[3]
        };
    }




    render() {
        const darkmode = this.context
        const { user, roomClient, room } = this.props;
        const { webcam, mic, gotRole, permissions,role, userName, userId, classroomId} = this.state;
        logger.log('state', this.state);
        if (!room.joined) {
            return (
                <>

                    <div className={darkmode ? "lp-main" : "lp-main-dark"}>
                        <div>
                            {/*<LpStudent/>*/}
                            <LpTeacher />
                            {!room.permanentLocked && !room.inLobby && !room.denied ?
                                <>
                                    <div className="lp-sg">
                                        <button className={darkmode ? "lp-start" : "lp-start-dark "} disabled={!gotRole} variant="contained" color="primary" onClick={() => { roomClient.join({ role, userName, userId, classroomId, joinVideo: webcam, joinAudio: mic, permissions }) }}>Start Meeting</button><br />
                                        <button variant="contained" onClick={() => { }} className={darkmode ? "lp-goback" : "lp-goback fontwhite"} >Go Back</button>
                                    </div>

                                </>
                                :
                                <div>{this.handleDisplayMessage(room)}</div>
                            }
                        </div>
                        <div className={darkmode ? "lp-line" : "lp-line-white"}></div>
                        <div className="lp-video" style={{ height: 448, width: 765 }}>
                            <video autoPlay={true} id="demoVideoElement" />

                            <audio autoPlay={true} id="demoAudioElement" />
                            <div className="lp-icondiv">
                                <div className="lp-divcenter">
                                    <div className="lp_icon"> {mic ? <MicOn className={darkmode ? "lp-iconcolor1" : "lp-iconcolor1-dark"} onClick={() => this.handleDemoMic(false)} /> : <MicOff className={darkmode ? "lp-iconcolor1" : "lp-iconcolor1-dark"} onClick={() => this.handleDemoMic(true)} />}</div>

                                    <div className="lp_icon"> {webcam ? <VideoIcon className={darkmode ? "lp-iconcolor1" : "lp-iconcolor1-dark"} onClick={() => this.handleDemoWebcam(false)} /> : <VideoOffIcon className={darkmode ? "lp-iconcolor1" : "lp-iconcolor1-dark"} onClick={() => this.handleDemoWebcam(true)} />}</div>

                                </div>
                            </div>



                        </div>
                    </div>



                </>
            );
        }
        else {
            return (
                <Room />
            );
        }
    }
}

const mapStateToProps = (state) => {
    return {
        user: state.user,
        room: state.room,
    };
};
LandingPage.contextType = ThemeContext

export default connect(mapStateToProps)(withRoomContext(LandingPage));