import React, { useRef, useState } from 'react';
import "./BottomBar.css"
import { useSelector } from 'react-redux';
import { ReactComponent as SettingsIcon } from "../../Assets/Icons/SettingsIcon.svg"
import { ReactComponent as MicOn } from "../../Assets/Icons/microphone.svg"
import { ReactComponent as MicOff } from "../../Assets/Icons/microphone-off.svg"
import { ReactComponent as VideoIcon } from "../../Assets/Icons/video.svg"
import { ReactComponent as VideoOffIcon } from "../../Assets/Icons/video-off.svg"
import { ReactComponent as ScreenShare } from "../../Assets/Icons/screen-share.svg"
import { ReactComponent as ExpandIcon } from "../../Assets/Icons/expand.svg"
import { ReactComponent as LeaveButton } from "../../Assets/Icons/leavebutton.svg"
import { useThemeContent,useThemeUpdate } from "../../Utils/ThemeContext";

import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';


import Setting from "./Settings/Setting"
import { ReactComponent as RecordIcon } from "../../Assets/Icons/record.svg"


import { BottomNavigation, BottomNavigationAction, Button, Checkbox, IconButton } from '@material-ui/core';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import VideocamIcon from '@material-ui/icons/Videocam';
import ScreenShareIcon from '@material-ui/icons/ScreenShare';
import AlbumIcon from '@material-ui/icons/Album';
import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';
import CallEndIcon from '@material-ui/icons/CallEnd';
import VideocamOffIcon from '@material-ui/icons/VideocamOff';
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare';
import { makeStyles } from '@material-ui/core/styles';
import { withRoomContext } from '../../RoomContext';
import Logger from '../../Logger';
import { permissions } from '../../permissions';
import Modal from "react-modal"
import IdleTimer from 'react-idle-timer'


const logger = new Logger('BottomBar');
const { MODERATE_ROOM, LOCK_MEETING, WAITING_ROOM } = permissions;
const useStyles = makeStyles({
    bottomBarStyle: {
        width: '100%',
        position: 'fixed',
        bottom: 0,
        backgroundColor: '#f2d8d5',
    },
});

const BottomBar = (props) => {
    const { roomClient } = props;
    const classes = useStyles();
    const user = useSelector(state => state.user);
    const room = useSelector(state => state.room);
    const [value, setValue] = useState('recents');
    const handleChange = (event, newValue) => {
        setValue(newValue);
        switch (newValue) {
            case "mic": {
                if (user.micState === 'off')
                    roomClient.updateMic({ start: true });
                else if (user.micState === 'on')
                    roomClient.muteMic();
                else if (user.micState === 'muted')
                    roomClient.unmuteMic();
                break;
            }
            case "webcam": {
                user.webcamState === 'on' ? roomClient.disableWebcam() : roomClient.updateWebcam({ start: true });
                break;
            }
            case "screenShare": {
                user.screenShareState === 'on' ? roomClient.disableScreenSharing() : roomClient.updateScreenSharing({ start: true });
                break;
            }
            case "callEnd": {
                roomClient.close();
                break;
            }
            case "meetingEnd": {
                roomClient.closeMeeting();
                break;
            }
            default:
                break;
        }
    };

    const [modalIsOpen, setIsOpen] = React.useState(false);
    function openModal() {
        setIsOpen(true);
    }
    const [leaveModal, setLeaveModal] = React.useState(false);
    function Leavemodal() {
        setLeaveModal(true);
    }


    function closeModal() {
        setIsOpen(false);
        setLeaveModal(false);

    }




    const [modalIsOpen1, setIsOpen1] = React.useState(false);
    function openModal1() {
        setIsOpen1(true); setIsOpen(false);


    }
    const [mouseactivity, setMouseactivity] = useState(false)
    const idleTimerRef = useRef(null)
    const onIdle = () => {
        closeModal();

        closeModal1();
        setMouseactivity(true);
    }


    function closeModal1() {
        setIsOpen1(false);
    }

    const darkTheme=useThemeContent()
    const toggleTheme=useThemeUpdate()
    
 const   getFullScreenElement=()=>{
        return document.fullscreenElement  
        ||document.webkitFullscreenElement
        ||document.mozFullscreenElement
        || document.msFullscreenElement;

    }
const handlefullscreen=()=>{
    console.log("this is a function not a party ");
    if(getFullScreenElement()){
        document.exitFullscreen();
    }
    else{
   
        document.documentElement.requestFullscreen().catch((e)=>{
            console.log(e);
        })
    }
}
    return (
        <div>
            <IdleTimer ref={idleTimerRef} timeout={3 * 1000} onIdle={onIdle} onActive={() => setMouseactivity(false)} />
            <div className={mouseactivity ? "bottombar" : "bottombarup"} style={darkTheme?{backgroundColor:""}:{backgroundColor:"#0000"}}value={value} onChange={handleChange}>
                <div className="bb_padding" >                <SettingsIcon className={darkTheme?"icon_1":"icon_1_dark"} onClick={openModal} />
                </div>
                <div className="bb_middle">
                    <div className="bb_icon" style={darkTheme?{color:""}:{color:"white"}}> {user.micState === "on" ? <MicOn className={darkTheme?"icon_1":"icon_1_dark"}  onClick={() => roomClient.muteMic()} /> : <MicOff className={darkTheme?"icon_1":"icon_1_dark"}  onClick={() => roomClient.updateMic({ start: true })} />}Mic</div>

                    <div className="bb_icon" style={darkTheme?{color:""}:{color:"white"}}> {user.webcamState === 'on' ? <VideoIcon className={darkTheme?"icon_1":"icon_1_dark"}  onClick={() => roomClient.disableWebcam()} /> : <VideoOffIcon className={darkTheme?"icon_1":"icon_1_dark"}  onClick={() => roomClient.updateWebcam({ start: true })} />} Video </div>

                    <div className="bb_icon" style={darkTheme?{color:""}:{color:"white"}}> {user.screenShareState === 'on' ? <ScreenShare className={darkTheme?"icon_1":"icon_1_dark"}  onClick={() => roomClient.disableScreenSharing()} /> : <ScreenShare className={darkTheme?"icon_1":"icon_1_dark"}  onClick={() => roomClient.updateScreenSharing({ start: true })} />}ScreenShare</div>
                    <div className="bb_icon" style={darkTheme?{color:""}:{color:"white"}}> <RecordIcon className={darkTheme?"icon_1":"icon_1_dark"}  onClick={toggleTheme}/>{darkTheme ? "dark":"light"}Record</div>
                    <div className="bb_icon" style={darkTheme?{color:""}:{color:"white"}}> <ExpandIcon className={darkTheme?"icon_1":"icon_1_dark"}  onClick={handlefullscreen} />Expand</div>
                    {/* <div className="bb_icon">
                        <IconButton
                            color='inherit'
                            // disabled={!canLock}
                            onClick={() => {
                                if (room.locked) {
                                    roomClient.unlockRoom();
                                }
                                else {
                                    roomClient.lockRoom();
                                }
                            }}
                        >
                            {room.locked ?
                                <LockIcon />
                                :
                                <LockOpenIcon />
                            }
                        </IconButton>
                    </div> */}


                </div>
                <div className="bb_padding" onClick={Leavemodal}><LeaveButton /> </div>
            </div>
            {/*<BottomNavigation value={value} showLabels onChange={handleChange} className={classes.bottomBarStyle}>

                <BottomNavigationAction label="Mic" value="mic" disabled={!user.canSendMic} icon={user.micState === 'on' ? <MicIcon /> : <MicOffIcon />} />
                <BottomNavigationAction label="Video" value="webcam" disabled={!user.canSendWebcam} icon={user.webcamState === 'on' ? <VideocamIcon /> : <VideocamOffIcon />} />
                <BottomNavigationAction label="Screen Share" value="screenShare" disabled={!user.canShareScreen} icon={user.screenShareState === 'on' ? <StopScreenShareIcon /> : <ScreenShareIcon />} />
                <BottomNavigationAction label="Record" value="record" icon={<AlbumIcon />} />
                <BottomNavigationAction label="Expand" value="expand" icon={<ZoomOutMapIcon />} />
                <BottomNavigationAction label="Setting" value="setting" icon={<SettingsIcon />} />
                <BottomNavigationAction label="Call End" value="callEnd" icon={<CallEndIcon />} />
                <BottomNavigationAction label="Meeting End" value="meetingEnd" icon={<CallEndIcon />} />
    </BottomNavigation>*/}

            <Modal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                className="settings1"
                overlayClassName="Overlay1"
            >
                <div className="settingsoptions">
                    <div>
                        {user.permissions.includes(MODERATE_ROOM) &&
                            <div onClick={() => {
                                roomClient.muteAll();
                            }} className="bb-set"> Mute all</div>
                        }

                        {user.permissions.includes(MODERATE_ROOM) &&
                            <div onClick={() => {
                                roomClient.stopAllPeerVideo();
                            }} className="bb-set"> Disable all videos</div>
                        }
                        {user.permissions.includes(MODERATE_ROOM) &&
                            <div onClick={() => {
                                if (room.screenShare) {
                                    roomClient.disableScreenShare();
                                }
                                else {
                                    roomClient.enableScreenShare();
                                }
                            }} className="bb-set">
                                {room.screenShare ?
                                    "Disable Screen Share"
                                    :
                                    "Enable Screen Share"
                                }
                            </div>
                        }
                        {user.permissions.includes(LOCK_MEETING) &&
                            <div className="bb-set" onClick={() => {
                                if (room.permanentLocked) {
                                    roomClient.disablePermanentLock();
                                }
                                else {
                                    roomClient.enablePermanentLock();
                                }
                            }}>
                                {room.permanentLocked ?
                                    "Unlock Meeting"
                                    :
                                    "Lock meeting"
                                }
                            </div>
                        }
                        {user.permissions.includes(WAITING_ROOM) &&
                            <div className="bb-set" onClick={() => {
                                if (room.locked) {
                                    roomClient.disableWaitingRoom();
                                }
                                else {
                                    roomClient.enableWaitingRoom();
                                }
                            }}>
                                {room.locked ?
                                    "Disable waiting room"
                                    :
                                    "Enable waiting room"
                                }
                            </div>
                        }
                    </div>
                    <hr className="settingsline" />
                    <span onClick={openModal1} className="bb-set">More Settings</span>
                    <div>
                    </div>
                </div>



            </Modal>
            <Modal
                isOpen={modalIsOpen1}
                onRequestClose={closeModal1}
                className="settings2"
                overlayClassName="Overlay2"
            >
                <Setting />
            </Modal>
            {/* This Modal is for Admitting a person inside functions need to be added */}
            {/* <Modal
                isOpen={modalIsOpen}
                onRequestClose={closeModal}
                className="MemberJoin"
                overlayClassName="Overlay3"
            >
                <div className="r-MemberJoin">
                    <p><span style={{ color: " #733D47" }}>Member one</span> Wants to Join</p>
                    <div>
                        <button className="button1">Admit</button>
                        <button style={{ marginLeft: "15px" }} className="button2">Reject</button>
                    </div>
                </div>
            </Modal> */}
            {/*This is for Leave meeting */}
            <Modal
                isOpen={leaveModal}
                onRequestClose={closeModal}
                className="LeaveModal"
                overlayClassName="Overlay3"
            >

                <button className="buttonred" onClick={() => { roomClient.closeMeeting() }}> End Meeting</button>
                <button className="buttonred1" onClick={() => { roomClient.close() }}> Leave Meeting </button>



            </Modal>
        </div>
    )
}

export default withRoomContext(BottomBar);
