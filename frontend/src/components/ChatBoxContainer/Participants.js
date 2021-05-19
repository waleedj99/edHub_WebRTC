import { Button, IconButton, makeStyles, Toolbar } from '@material-ui/core';
import React from 'react';
import { useEffect } from 'react';
import { useState } from 'react';
import { connect } from 'react-redux';
import Logger from '../../Logger';
import { withRoomContext } from '../../RoomContext';
import { signalingSocket } from '../../SocketClient';
import HandIcon from '@material-ui/icons/PanTool';
import CancelIcon from '@material-ui/icons/Cancel';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import VideocamIcon from '@material-ui/icons/Videocam';
import VideocamOffIcon from '@material-ui/icons/VideocamOff';
import { permissions } from '../../permissions';
import { ReactComponent as Listicon } from "../../Assets/Icons/list.svg"
import { ReactComponent as Gridicon } from "../../Assets/Icons/grid.svg"
import {ReactComponent as Handicon} from "../../Assets/Icons/hand.svg"

const logger = new Logger('Praticipants');

const { MODERATE_ROOM, PROMOTE_PEER, RAISE_HAND, REMOVE_USER } = permissions;

const useStyles = makeStyles({
    outterDiv: {
        // position: 'relative',
        width: '500px',
        height: '600px',
        backgroundColor: 'gray',
        marginLeft: '10px'
        // display: 'flex',
        // flexDirection: 'column',
        // justifyContent: 'space-between'

    },
    toolBar: {
        color: 'white',
        backgroundColor: '#bf9b9b',
        display: 'flex',
        justifyContent: 'space-between',
    },
    participant: {
        display: 'flex',
        justifyContent: 'space-between',
        backgroundColor: '#efd5d2',
        color: '#484848',
        marginBottom: '8px',
        padding: '16px'
    }
});

function Participants(props) {
    const { peers, roomClient, lobbyPeers, allConsumers, userPermissions } = props;
    logger.log(props);
    const classes = useStyles();
    const [raisedHand, setRaisedHand] = useState(false);
    useEffect(() => {
        signalingSocket.on('participants', async (participant) => {
            logger.log('GGGG', participant.method);
            try {
                switch (participant.method) {
                    case 'moderator:requestPeerVideo': {
                        const { peerId } = participant.data;
                        logger.log(peerId, participant.data);
                        break;
                    }
                    case 'moderator:requestPeerAudio': {
                        const { peerId } = participant.data;
                        logger.log(peerId, participant.data);
                        break;
                    }
                    default:
                        break;
                }
            } catch (error) {
                logger.error('error on socket "canvas" event [error:"%o"]', error);
            }
        });
    }, []);
    return (
        <div className="cb-outerdiv">
            <div className="cb-usericons">
                <div className="p-lg">
                    <p>        <Listicon /> List View</p>
                    <p style={{ color: "#DAD9D9" }}>        <Gridicon style={{ marginRight: "5px" }} />Grid View</p>


                </div>
            </div>
            {/*<Toolbar className={classes.toolBar}>
                <h3>Participants</h3>
                <Button variant="contained" disabled={!userPermissions.includes(RAISE_HAND)} onClick={() => { roomClient.sendRequest('raisedHand', { raisedHand: !raisedHand }); setRaisedHand(!raisedHand); }}>{raisedHand ? 'Lower Hand' : 'Raise Hand'}</Button>
                <Button variant="contained" disabled={!userPermissions.includes(PROMOTE_PEER) || lobbyPeers.length === 0} onClick={() => roomClient.promoteAllLobbyPeers()}>Admit All</Button>
                {/* <Button variant="contained" disabled={Object.values(peers).length === 0} onClick={() => roomClient.muteAll() }>Mute All</Button> 
            </Toolbar>*/}
            <div className="p-full">
                <div style={{ margin: '8px' }}>
                    {userPermissions.includes(PROMOTE_PEER) &&
                        <div>
                            {lobbyPeers.length > 0 ? <span className="p-wr">Waiting Room <button className="p-admit" disabled={!userPermissions.includes(PROMOTE_PEER) || lobbyPeers.length === 0} onClick={() => roomClient.promoteAllLobbyPeers()}>Admit all</button></span> : null}
                            {lobbyPeers.map((peerId) => {
                                return (
                                    <div className="p-div" key={peerId}>
                                        <span style={{ display: 'flex' }}>
                                            <div className="p-image"></div>
                                            <p className="p-p">{peerId}</p>
                                        </span>
                                        <div className="p-divicons">
                                            <IconButton style={{ padding: 8, width: 38, height: 38 }}>
                                                <CheckCircleIcon style={{ fontSize: 20, color: "#733D47" }} disabled={!userPermissions.includes(PROMOTE_PEER)} onClick={() => roomClient.promoteLobbyPeer(peerId)} />

                                            </IconButton>
                                            <IconButton style={{ padding: 8, width: 38, height: 38 }}>

                                                <CancelIcon style={{ fontSize: 20, color: "#733D47" }} disabled={!userPermissions.includes(PROMOTE_PEER)} onClick={() => roomClient.kickLobbyPeer(peerId)} />
                                            </IconButton>
                                        </div>
                                        <hr className="p-hr" />

                                    </div>
                                );
                            })
                            }
                        </div>
                    }


                    <div className="p-div">
                        <span style={{ display: 'flex' }}> <div className="p-image"> {raisedHand ? <HandIcon style={{ color: 'blue' }} fontSize='small' /> : null}</div>
                            <p className="p-p">Me</p>
                        </span>

                    </div>
                    {Object.values(peers).map((peer) => {
                        const peerConsumersKey = peer.consumers;
                        const peerConsumers = peerConsumersKey.map((peerConsumerKey) => allConsumers[peerConsumerKey]);
                        const micConsumer = peerConsumers.find((consumer) => consumer.source === 'mic');
                        const webcamConsumer = peerConsumers.find((consumer) => consumer.source === 'webcam');
                        return (
                            <div className="p-div" key={peer.id}>
                                <span style={{ display: 'flex' }}>
                                    <div className="p-image green"><Handicon/></div>
                                    <p className="p-p">{peer.id}</p>
                                </span>
                                <div className="p-divicons">

                                    {/* This is to remove user 
                               <CancelIcon disabled={!userPermissions.includes(REMOVE_USER)} onClick={() => roomClient.kickPeer(peer.id)} />
                               */}
                                    <IconButton style={{ padding: 8, width: 38, height: 38 }} disabled={!userPermissions.includes(MODERATE_ROOM)}>
                                        {!micConsumer || micConsumer.remotelyPaused ?
                                            <VolumeOffIcon onClick={() => {
                                                roomClient.requestPeerAudio(peer.id);
                                            }} style={{ fontSize: 20, color: "#733D47" }} />
                                            :
                                            <VolumeUpIcon onClick={() => {
                                                roomClient.mutePeer(peer.id);
                                            }} style={{ fontSize: 20, color: "#733D47" }} className="p-icon" />
                                        }
                                    </IconButton>
                                    <IconButton style={{ padding: 8, width: 38, height: 38 }} disabled={!userPermissions.includes(MODERATE_ROOM)}>
                                        {!webcamConsumer || webcamConsumer.remotelyPaused ?
                                            <VideocamOffIcon style={{ fontSize: 20, color: "#733D47" }} onClick={() => {
                                                roomClient.requestPeerVideo(peer.id);

                                            }} />
                                            :
                                            <VideocamIcon style={{ fontSize: 20, color: "#733D47" }} onClick={() => {
                                                roomClient.stopPeerVideo(peer.id);
                                            }} />
                                        }
                                    </IconButton>
                                </div>
                            </div>
                        );
                    })}

                </div>
            </div>
        </div>
    )
}

Participants.propTypes = {

}

const mapStateToProps = (state) => {
    logger.log(`CCCCC`, state);
    return {
        peers: state.peers,
        lobbyPeers: Object.keys(state.lobbyPeers),
        allConsumers: state.consumers,
        userPermissions: state.user.permissions
    }
};

export default connect(mapStateToProps)(withRoomContext(Participants));
