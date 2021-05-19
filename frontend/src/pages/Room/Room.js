import React, { Component, useContext } from "react";
import "./Room.css"
import RoomClient from "../../RoomClient";
import randomString from 'random-string';
import store from '../../redux/store';
import * as userAction from '../../redux/actions/userActions'

import { FullScreen, useFullScreenHandle } from "react-full-screen";

import Logger from '../../Logger';
import '../Room/Room.css';
// import BottomBar from "../../components/videoContainer/BottomBar";
import MainContainer from "../../components/videoContainer/MainContainer";
// import { withRoomContext } from "../../RoomContext";
import WhiteBoard from "../../components/WhiteBoardContainer/WhiteBoard";
import ChatBox from "../../components/ChatBoxContainer/ChatBox";
import Participants from "../../components/ChatBoxContainer/Participants";
import { ThemeContext } from "../../Utils/ThemeContext";

import Sidebar from "../../components/Sidebar/Sidebar"
import BottomBar from "../../components/BottomBar/BottomBar";
// import MainContainer from "../../components/MainContainer";
import { withRoomContext } from "../../RoomContext";
// import WhiteBoard from "../../components/WhiteBoard";
import Canvas from "../../components/WhiteBoardContainer/Canvas";
import { Link } from 'react-router-dom';
import Notepad from "../../components/Notepad";
import GridView from "../../components/videoContainer/GridView/GridView"
import Polls from "../../components/Polls/Polls";
import { Grid } from "@material-ui/core";


import IdleTimer from 'react-idle-timer'
import GridCarousel from "../../components/videoContainer/GridView/GridCarousel";

const logger = new Logger('VideoView');

class Room extends Component {

    constructor(props) {
        super(props);
        this.idleTimer = null
        this.canvasVideoElementRef = React.createRef();
        this.state = {
            msright: true,
            chatstate: true,
            vidview: true,
            notepad: true,
            gridview: true,
            canvasStream: null,
            mouseActivity: false
        }



        this.handleOnIdle = this.handleOnIdle.bind(this)
        this.ChangeMsright = this.ChangeMsright.bind(this)
        this.Changechat = this.Changechat.bind(this)
        this.Changemembers = this.Changemembers.bind(this)

    }

    ChangeGridView = () => {
        console.log("grid off")
        this.setState({
            gridview: !this.state.gridview,
        })
    }
    ChangeMsright = () => {
        this.setState({
            msright: false,


        })
        console.log("ms right", this.state.msright, this.state.chatstate)
    }
    ChangeNotepadView = () => {
        if (this.state.msright == false & this.state.notepad == true) {
            console.log("waack works");

            this.setState({
                msright: true,

            })
        } else {
            this.setState({
                notepad: true,
                msright: false,
            })
        }
    }



    ChangeVWview = () => {
        this.setState({
            vidview: !this.state.vidview
        })

    }
    Changechat = () => {

        this.setState({
            chatstate: true,
            notepad: false,
        })

    }
    Changemembers = () => {
        this.setState({
            chatstate: false,
            notepad: false
        })

    }
    handleOnIdle(event) {
    this.setState({
        mouseActivity:true,
    })
        console.log('user is idle', event)
        console.log('last active', this.idleTimer.getLastActiveTime())
    }
    onExpand=()=>{

        console.log("expland");
    }
    ChatShow = () => {
        if (this.state.msright == false & this.state.chatstate == true & this.state.notepad == false) {
            console.log("waack works");

            this.setState({
                msright: true,

            })
        } else {
            this.ChangeMsright();
            this.Changechat();
        }



    }
    MembersShow = () => {
        if (this.state.msright == false & this.state.chatstate == false & this.state.notepad == false) {
            console.log("waack works");

            this.setState({
                msright: true,

            })
        } else {
            this.ChangeMsright();
            this.Changemembers();
        }
    }
    componentDidMount() {
        // const canvasVideoElement = this.canvasVideoElementRef.current;
        // canvasVideoElement.srcObject = this.state.canvasStream;

        // const { name, roomId } = this.props.match.params;
        // logger.log(this.props);
        // logger.log('I should be executed first DOM ready');
        // logger.log('name roomId', name, roomId);

        // //check if browser is supported
        // if (navigator.mediaDevices === undefined || navigator.mediaDevices.getUserMedia === undefined || window.RTCPeerConnection === undefined) {
        //     logger.error('Your browser is not supported');
        // }
        // const { roomClient } = this.props;
        ///                    <div className={this.state.msright ? "hidden":"MSright"}>


        // roomClient.join({ name, roomId, joinVideo: false, joinAudio: false });
        // roomClient.join({ name, roomId, joinVideo: true });
    }
    getStreamFromCanvas = (stream) => {
        logger.log('getStreamFromCanvas', stream);
        this.setState({
            canvasStream: stream
        })
    }
    render() {
        const { roomClient } = this.props;
        return (
            <>       

                {/*} <Participants />
                <ChatBox chatHistory={roomClient.getChatHistory()} />*/}
                <IdleTimer
                    ref={ref => { this.idleTimer = ref }}
                    timeout={3 * 1000}
                    onIdle={this.handleOnIdle}
                    debounce={250}
                    onActive={() =>this.setState({mouseActivity:false})}
                />
                <Sidebar onChildClick={() => this.ChatShow()} onMembers={this.MembersShow} onNotepad={this.ChangeNotepadView} onWhiteboard={this.ChangeVWview} />
                <div className="MainScreen">


                    {this.state.gridview ? <div className={this.state.mouseActivity?"RoomMainDiv":"RoomMainDivbig"} style={this.state.vidview ? { backgroundColor: "black" } : { backgroundColor: "white" }}>

                        {this.state.vidview ? <MainContainer /> : <WhiteBoard getStreamFromCanvas={this.getStreamFromCanvas} />}


                    </div>
                        :
                       // <GridView onGridOff={()=>this.ChangeGridView}/>
                     <GridCarousel />
                    }


                    {this.state.vidview ? <div className={this.state.msright ? "MSrighthidden": "MSright"}>
                        {
                            this.state.notepad ? <Notepad /> :

                                <div className={this.state.mouseActivity?"CP":"ntCP"} ><div className={this.state.msright,"room-CP"}>
                                    <div className={this.state.chatstate ? "room-selected" : "room-unselected"} onClick={this.Changechat}>Chats</div>
                                    <div className={this.state.chatstate ? "room-unselected" : "room-selected"} onClick={this.Changemembers}> Members</div>

                                </div>
                                   
                                        {this.state.chatstate ? <ChatBox chatHistory={roomClient.getChatHistory()} />
                                            :
                                            <Participants />

                                        }

                                </div>
                        }
                      
                    </div> :
                        <div className={this.state.msright ? "MSrighthidden" : "MSright"}>
                            {
                                this.state.notepad ? <Notepad /> :

                                    <div className={this.state.mouseActivity?"CP":"ntCP"} ><div className="room-CP">
                                        <div className={this.state.chatstate ? "room-selected" : "room-unselected"} onClick={this.Changechat}>Chats</div>
                                        <div className={this.state.chatstate ? "room-unselected" : "room-selected"} onClick={this.Changemembers}> Members</div>

                                    </div>
                                            {this.state.chatstate ? <ChatBox chatHistory={roomClient.getChatHistory()} />
                                                :
                                                <Participants />

                                            }

                                    </div>
                            }
                        </div>

                    }



                </div>
                <BottomBar onExpand={()=>{this.onExpand()}}/>


            </>
        );

    }
}

export default withRoomContext(Room);