import React from 'react'
import {ReactComponent as ChatIcon} from "../../Assets/Icons/chat.svg"
import {ReactComponent as TakeNotesIcon} from "../../Assets/Icons/takenotes.svg"
import {ReactComponent as WhiteboardIcon} from "../../Assets/Icons/whiteboard.svg"
import {ReactComponent as Sidebarpeep} from "../../Assets/Icons/sidebarpeep.svg"
import {ReactComponent as PollsIcon} from "../../Assets/Icons/polls.svg"
import {ReactComponent as MembersIcon} from "../../Assets/Icons/members.svg"
import "./Sidebar.css"
import { useThemeContent } from '../../Utils/ThemeContext'

const Sidebar = (props) => {
const darkmode=useThemeContent();
    return (
        <div className="sidebar_container" >
            <div className="sidebar" style={darkmode?{color:""}:{backgroundColor:"black"}}> 
            <div className="sidebar_icon" style={darkmode?{color:""}:{color:"white"}}> <MembersIcon className={darkmode?"icon_1":"icon_1_dark"} onClick={props.onMembers}/>Members</div>

                <div className="sidebar_icon" style={darkmode?{color:""}:{color:"white"}}> <ChatIcon className={darkmode?"icon_1":"icon_1_dark"} onClick={props.onChildClick}/>Chat</div>
                <div className="sidebar_icon" style={darkmode?{color:""}:{color:"white"}}> <TakeNotesIcon className={darkmode?"icon_1":"icon_1_dark"} onClick={props.onNotepad}/>Take Notes</div>
                <div className="sidebar_icon" style={darkmode?{color:""}:{color:"white"}}> <WhiteboardIcon className={darkmode?"icon_1":"icon_1_dark"} onClick={props.onWhiteboard}/>Whiteboard</div>
                <div className="sidebar_icon" style={darkmode?{color:""}:{color:"white"}}> <PollsIcon className={darkmode?"icon_1":"icon_1_dark"}/>Polls</div>

            </div>
            <div className="sidebarpeep">
                <Sidebarpeep />
            </div>
           
        
        </div>
    )
}

export default Sidebar


