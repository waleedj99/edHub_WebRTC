import {combineReducers} from 'redux';
import consumers from './consumers';
import producers from './producers';
import user from './user';
import peers from './peers';
import canvas from './canvas';
import room from './room';
import lobbyPeers from './lobbyPeers';
import notifications from './notifications';

export default combineReducers({
    consumers,
    user,
    producers,
    peers,
    canvas,
    room,
    lobbyPeers,
    notifications,
});