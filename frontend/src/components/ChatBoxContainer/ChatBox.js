import React, { useEffect, useState, Component } from 'react';
import useScrollTrigger from '@material-ui/core/useScrollTrigger';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import { AppBar, Collapse, Container, FormControl, IconButton, InputAdornment, makeStyles, OutlinedInput, TextField, Toolbar } from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import { withStyles } from '@material-ui/styles';
import Message from './Message';
import Logger from '../../Logger';
import { withRoomContext } from '../../RoomContext';
import { signalingSocket } from '../../SocketClient';
import ScrollToBottom from 'react-scroll-to-bottom';
import EmojiPicker from 'emoji-picker-react';
import EmojiEmotionsIcon from '@material-ui/icons/EmojiEmotions';
import CloseIcon from '@material-ui/icons/Close';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import ImageIcon from '@material-ui/icons/Image';
import SaveAltIcon from '@material-ui/icons/SaveAlt';
import { connect } from 'react-redux';
import { MdAttachFile } from "react-icons/md";
import { ChatType, FILE_SIZE_LIMIT, AcceptableFileType, ImageFileType } from '../../Utils/Constants';
import * as digitalOceanSpaces from '../../Utils/digitalOcean';
import imageCompression from 'browser-image-compression';
import { Alert, AlertTitle } from '@material-ui/lab';
import InsertChartIcon from '@material-ui/icons/InsertChart';
import * as canvasAction from '../../redux/actions/canvasAction'
import store from '../../redux/store';
import DragAndDrop from '../DragAndDrop';
import { ReactComponent as MusicIcon } from "../../Assets/Icons/music.svg"
import { ReactComponent as GalleryIcon } from "../../Assets/Icons/gallery.svg"
import { ReactComponent as EarthIcon } from "../../Assets/Icons/earth.svg"
import { ReactComponent as FileIcon } from "../../Assets/Icons/file.svg"
import ThemeContext from "../../Utils/ThemeContext"
import ScrollableFeed from 'react-scrollable-feed'


import "./ChatBox.css"
const logger = new Logger('ChatBox');

const limit = 15000;

const styles = () => ({
    outterDiv: {
        // position: 'relative',
        width: '500px',
        height: '600px',
        backgroundColor: 'gray',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',

    },
    inputTextField: {
        width: '100%',
        // position: 'absolute',
        // bottom: 0,
        // left: 0,
        backgroundColor: 'white',
    },
    toolBar: {
        color: 'white',
        backgroundColor: '#bf9b9b',
        display: 'flex',
        justifyContent: 'space-between',
    },
    messageBox: {
        marginRight: '16px',
        marginLeft: '16px',
        height: '470px',
        // backgroundColor:'blue',
    }
});

class ChatBox extends Component {
    constructor(props) {
        super(props);
        this.state = {
            message: '',
            messages: {},
            emoji: false,
            selectSender: 'Everyone',
            file: null,
            sizeAlert: false,
            dropdown:false,
            yo:"yhi",
            chatarray:[],
        }
        this.DropDownMembers = this.DropDownMembers.bind(this)
    }
    DropDownMembers = () => {
        console.log("dropdown", this.state.dropdown)
        this.setState({
            dropdown: !this.state.dropdown
        })
        console.log(this.state.yo);

    }

    getandSetChatHistory = () => {
        this.props.roomClient.getNewChatHistory();
    }

    componentDidMount() {
        this.getandSetChatHistory();
        signalingSocket.on('chat', async (chat) => {
            logger.log('chat socket:', chat.method);
            try {
                switch (chat.method) {
                    case 'chatMessage': {
                        const { peerId, chatMessage } = chat.data;
                        logger.log(peerId, chatMessage, this.state.messages);
                        const key = (chatMessage.to === 'Everyone') ? chatMessage.to : chatMessage.sender;
                        logger.log('socket chatMessage', chatMessage);
                        // this.updateMessages(key, chatMessage);
                        if (chatMessage.type === ChatType.IMAGE) {
                            logger.log('About to download from server', chatMessage.name);
                            this.downloadFileFromServer(chatMessage.name, (url) => {
                                chatMessage.chat = url;
                                this.updateMessages(key, chatMessage);
                            });
                        }
                        else {
                            this.updateMessages(key, chatMessage);
                        }
                        break;
                    }
                    case 'chatHistory': {
                        const { peerId, chatHistory } = chat.data;
                        logger.log(peerId, chatHistory, 'chat History');
                        // this._chatHistory['Everyone'] = chatHistory;
                        const finalChatHistory = {};
                        finalChatHistory['Everyone'] = chatHistory;
                        this.setState({
                            messages: finalChatHistory
                        });
                    }
                    default:
                        break;
                }
            } catch (error) {
                logger.error('error on socket "canvas" event [error:"%o"]', error);
            }
        });
        // document.addEventListener('keydown', this.keyDown);
    }

    componentWillUnmount() {

        // document.removeEventListener('keydown', this.keyDown);
    }

    keyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            this.handleSendChat();
        }
    }

    updateChat = (event) => {
        event.preventDefault();
        event.stopPropagation();
        let text = event.target.value;
       text = text.slice(0,limit);
        logger.log('updateChat', event.nativeEvent.data);
        this.setState({ message: (text) })
    }

    componentDidUpdate() {
        logger.warn('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', this.props.canvasUrl, this.props.updateCanvasUrl);
        if (this.props.isUrlReady === true) {
            logger.warn('isUrlReady', this.props.canvasUrl);
            this.sendFileToChat(this.props.canvasUrl, ChatType.IMAGE);
            store.dispatch(canvasAction.isUrlReady({ isUrlReady: false }));
        }
    }

    updateMessages = (sender, message) => {
        const messages = this.state.messages;
        if (messages[sender]) {
            messages[sender].push(message);
        }
        else {
            messages[sender] = [message];
        }
        this.setState({
            ...this.state,
            messages: messages
        });
    }

    handleSendChat = ({ chat = this.state.message, type = ChatType.TEXT, sentByKeyboard = false } = {}) => {
        logger.log('handleSendChat', chat, type, sentByKeyboard);
        if (sentByKeyboard) {
            chat.slice(0, -2);
            logger.log('handleSendChat', chat);
        }
        if (chat.length === 0) {
            return;
        }

        const chatMessage = this.createAddChatMessage({ chat, type });
        logger.log('handleSendChat', chatMessage);
        this.props.roomClient.sendChatMessage('chatMessage', { chatMessage });
        this.updateMessages(chatMessage.to, chatMessage);
        this.setState({
            message: "",
        });
    }

    createAddChatMessage = ({ chat = this.state.message, type = ChatType.TEXT } = {}) => {
        const date = new Date();
        const time = (date.getHours().toString().length < 2 ? `0${date.getHours()}` : `${date.getHours()}`) + ':' + (date.getMinutes().toString().length < 2 ? `0${date.getMinutes()}` : `${date.getMinutes()}`)
        const chatMessage = {
            chat,
            dateTime: time,
            to: this.state.selectSender,
            sender: 'me',
            type,
        }
        return chatMessage;
    }


    handleEmojiClick = (event, emojiObject) => {
        let message = this.state.message + emojiObject.emoji;
        this.setState({
            message: message,
        });
    }
    handleSelectEomji = () => {
        const setEmoji = !this.state.emoji;
        this.setState({
            emoji: setEmoji
        });
        if (!setEmoji) {
            document.getElementById("cb-chatText").focus();
        }
    }
    handleSenderSelect = (e) => {
        console.log(e);
        this.setState({
            selectSender: e
                });
    }
    handleSenderSelectShuja = (e) => {
        console.log(e);
        this.setState({
            selectSender: e,
            
        });
    
    {this.state.chatarray.includes(e)? console.log("there so dont add"):        this.setState({chatarray:[...this.state.chatarray,e]});
}
        console.log(this.state.chatarray);
    }
    handleUploadFile = async (event, file, type) => {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        logger.log('MyFile', file);
        logger.log('Mai abhi run hora hu! thik hai?', this.state.file);
        if (ImageFileType.includes(file.type)) {
            type = ChatType.IMAGE;
        }
        else {
            type = ChatType.FILE;
        }
        if (file.size > FILE_SIZE_LIMIT) {
            logger.log(`File can not be larger than ${FILE_SIZE_LIMIT / 1000000}MB`);
            this.setState({
                sizeAlert: true,
            }, () => {
                setTimeout(() => this.setState({ sizeAlert: false }), 10000);
            })
            return;
        }
        if (!AcceptableFileType.includes(file.type)) {
            logger.log(`File can not be of type ${file.type}`);
            this.setState({
                sizeAlert: true,
            }, () => {
                setTimeout(() => this.setState({ sizeAlert: false }), 10000);
            })
            return;
        }
        this.sendFileToChat(file, type);
    }

    sendFileToChat = async (file, type) => {
        const fileUrl = this.fileToUrl(file);
        let chatMessage = this.createAddChatMessage({ chat: fileUrl, type });
        this.updateMessages(chatMessage.to, chatMessage);

        logger.log('CompressedFile', file);

        await this.uploadFileToServer(file, (url, name) => {
            logger.log('MyFile', url, name);
            chatMessage.name = name;
            this.props.roomClient.sendChatMessage('chatMessage', { chatMessage });
        });
    }

    fileToUrl = (file) => URL.createObjectURL(file);

    saveChat = () => {
        const element = document.getElementById('downloadATag');
        const messages = this.state.messages;
        let chatToSave = '';
        logger.log(messages, Object.keys(messages), Object.values(messages), Object.entries(messages))
        for (let key of Object.keys(messages)) {
            chatToSave += `To ${key}: \n`;
            for (let msg of messages[key]) {
                if (msg.type === ChatType.TEXT) {
                    chatToSave += `${msg.dateTime}   ->   From ${msg.sender}: ${msg.chat}\n`;
                }
                else {
                    chatToSave += `${msg.dateTime}   ->   From ${msg.sender}: ${msg.name}\n`;
                }
            }
            chatToSave += `\n\n`;
        }
        logger.log(chatToSave);
        const file = new Blob([chatToSave], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "chat.txt";
        element.click();
    }

    canvasSnapshot = () => {
        store.dispatch(canvasAction.updateCanvasUrl({ updateCanvasUrl: true }));
        // if (this.props.updateCanvasUrl === true) {
        logger.warn('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', this.props.canvasUrl);
        // }
    }


    uploadFileToServer = async (file, callback) => {
        try {
            const blob = file;
            const params = {
                Body: blob,
                Bucket: digitalOceanSpaces.bucketName,
                Key: `${new Date().getTime()}${blob.name}`
            };
            // Sending the file to the Spaces
            digitalOceanSpaces.s3.putObject(params)
                .on('build', request => {
                    request.httpRequest.headers.Host = digitalOceanSpaces.bucketUrl;
                    request.httpRequest.headers['Content-Length'] = blob.size;
                    request.httpRequest.headers['Content-Type'] = blob.type;
                    // request.httpRequest.headers['x-amz-acl'] = 'public-read';
                })
                .send((err) => {
                    if (err) logger.error('Error sending request', err);//errorCallback();
                    else {
                        // If there is no error updating the editor with the imageUrl
                        const imageUrl = digitalOceanSpaces.bucketUrl + blob.name
                        logger.log(imageUrl, blob);
                        callback(imageUrl, params.Key);
                    }
                });
        }
        catch (err) {
            logger.error('Error() [error:"%o"]', err);
        }
    }

    downloadFileFromServer = async (key, cb) => {
        try {
            let params = {
                Bucket: digitalOceanSpaces.bucketName,
                Key: key
            }
            digitalOceanSpaces.s3.getObject(params, (err, data) => {
                if (err) {
                    logger.error('There was an error getting a file: ' + err.message);
                } else {
                    logger.log('Data from server', data);
                    let arrayBufferView = new Uint8Array(data.Body);
                    let blob = new Blob([arrayBufferView], { type: data.ContentType });
                    let imageUrl = this.fileToUrl(blob);
                    cb(imageUrl);
                }
            });
        } catch (error) {
            logger.error('downloadFileFromServer() [error:"%o"]', error);
        }
    }

    async compresseFile(file) {

        const imageFile = file;
        console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
        console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
        }
        try {
            const compressedFile = await imageCompression(imageFile, options);
            console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
            console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`); // smaller than maxSizeMB
            return compressedFile;

            //   await uploadToServer(compressedFile); // write your own logic
        } catch (error) {
            console.log(error);
        }

    }

    handleDrop = (files) => {
        logger.log(`Dropping`, files);
        if (!files || files.length === 0) return;
        const file = files[0];
        const fileType = file.type.includes("image") ? ChatType.IMAGE : ChatType.FILE;
        this.handleUploadFile(null, file, fileType);
    }


    render() {
        const darkmode=this.context;
        const { message, messages, emoji, selectSender, file, sizeAlert } = this.state;
        logger.log('This is the messages list', messages, selectSender);
        const { classes, peers, canvasUrl, chatHistory } = this.props;
        // logger.log('canvasUrl', canvasUrl);
        // logger.log('chat History', chatHistory);
        return (
            <>

                <DragAndDrop handleDrop={this.handleDrop}>
                    <div className="cb-outerdiv">
                        <div className="cb-usericons custom-scrollbar.light ">
                            
                        <div className="cb-usericon" onClick={()=>this.handleSenderSelect("Everyone")}> <EarthIcon/><div className="cb-usericon-alert"></div></div>
                            {
                                this.state.chatarray.map((value,index)=>{
                                    return(
                                        <div key ={index} onClick={()=>this.handleSenderSelect(value)} className="cb-usericon cb-selecter" >{value} <div className="cb-usericon-alert"></div></div>

                                    )
                                })
                            }
                            
                            <div className="cb-usericon cb-selecter" onClick={this.DropDownMembers}> {darkmode?"+":"-"} <div className="cb-usericon-alert"></div></div>




                            {/*<div className="cb-usericon">
                                <p>
                                    <select
                                        value={selectSender}
                                        onChange={this.handleSenderSelect}
                                        className="cb-select">
                                     <option value="Everyone">Everyone</option>
                                {Object.values(peers).map((peer) => {
                                    return (
                                        <option value={peer.id} key={peer.id}>{peer.id}</option>
                                    );
                                })}
                            </select></p>
                               
                            </div>*/}
                           
                           
                        </div>
                        {/*  <Toolbar className={classes.toolBar}>
                            <select
                                value={selectSender}
                                onChange={this.handleSenderSelect}
                            >
                                <option value="Everyone">Everyone</option>
                                {Object.values(peers).map((peer) => {
                                    return (
                                        <option value={peer.id} key={peer.id}>{peer.id}</option>
                                    ); 
                                })}
                            </select>
                            <div>
                                <IconButton onClick={() => this.canvasSnapshot()} style={{ color: 'white' }}>
                                    <InsertChartIcon />
                                    {/* <a id='saveChatTag' /> */}
                        {/*   </IconButton>
                                <IconButton onClick={this.saveChat} style={{ color: 'white' }}>
                                    <SaveAltIcon />
                                    <a id='downloadATag' />
                                </IconButton>
                            </div>
                        </Toolbar>*/}


                            <div className="cb-messagebox">
                            {this.state.dropdown?
                                     <div className="cb-drops">
                                     {Object.values(peers).map((peer) => {
                                         return (
                                             <li value={peer.id} key={peer.id}  onClick={()=>this.handleSenderSelectShuja(peer.id)} >{peer.id}</li>
                                         );
                                     })}
                                      
                                 </div>     :null
                            }
                                {/* {.map} */}
                                <ScrollableFeed className="cb-messagebox-in" >                                 {messages[selectSender] ? messages[selectSender].map((message, i) => <Message key={i} message={message} />) : null}
</ScrollableFeed>
                            </div>
                        <div className="cb-textarea">
                            {/*<div className="cb-r1"><p>To: <select
                                value={selectSender}
                                onChange={this.handleSenderSelect}
                                className="cb-select"
                            >
                                <option value="Everyone">All members</option>
                                {Object.values(peers).map((peer) => {
                                    return (
                                        <option value={peer.id} key={peer.id}>{peer.id}</option>
                                    );
                                })}
                            </select></p>
                                <div className="cb-icon-div">
                                    <MusicIcon className="cb-icon" />
                                    <GalleryIcon className="cb-icon" onClick={() => this.uploadImg.click()} />
                                    <FileIcon className="cb-icon" onClick={() => this.uploadFile.click()} />
                                </div>
                            </div>*/}
                            <div className="cb-div">
                                <MdAttachFile value={{ size: "20px" }} onClick={() => this.uploadFile.click()} />
                                {emoji ?
                                    <CloseIcon onClick={() => this.handleSelectEomji()} />
                                    :
                                    <EmojiEmotionsIcon onClick={() => this.handleSelectEomji()} style={{ fill: '#733D47' }} />
                                }
                                <textarea id="cb-chatText" className="cb-chatText" onKeyDown={(e) => this.keyDown(e)} onChange={(e) => this.updateChat(e)} placeholder="Type your message" value={message} />
                                <SendIcon style={{ fill: '#733D47' }} onClick={() => this.handleSendChat()} />
                            </div>
                            <input id="myInput"
                                type="file"
                                accept="image/*"
                                ref={(ref) => this.uploadImg = ref}
                                style={{ display: 'none' }}
                                onChange={(e) => this.handleUploadFile(e, e.target.files[0], ChatType.IMAGE)}
                            />
                            <input id="myInput"
                                type="file"
                                ref={(ref) => this.uploadFile = ref}
                                style={{ display: 'none' }}
                                onChange={(e) => this.handleUploadFile(e, e.target.files[0], ChatType.FILE)}
                            />
                        </div>

                        {emoji ? <EmojiPicker onEmojiClick={this.handleEmojiClick} /> : null}
                        {/*This is commented for styling purposes only Mohit redo this 
                        <FormControl variant="outlined" className={classes.inputTextField}>
                            <OutlinedInput
                                id="outlined-adornment-weight"
                                value={message}
                                onChange={(e) => { this.setState({ message: (e.target.value) }) }}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => this.handleSendChat()} edge="end">
                                            {message.length > 0 ? <SendIcon /> : null}
                                        </IconButton>
                                    </InputAdornment>
                                }
                                startAdornment={
                                    <InputAdornment position="start">
                                        <IconButton onClick={this.handleSelectEomji}>
                                            {emoji ? <CloseIcon /> : <EmojiEmotionsIcon />}
                                        </IconButton>
                                        <IconButton onClick={() => this.uploadFile.click()}>
                                            <AttachFileIcon />
                                        </IconButton>
                                        <IconButton onClick={() => this.uploadImg.click()}>
                                            <ImageIcon />
                                        </IconButton>
                                    </InputAdornment>
                                }
                                
                                inputProps={{
                                    'aria-label': 'weight',
                                }}
                                labelWidth={0}
                            />

                            {emoji ? <EmojiPicker onEmojiClick={this.handleEmojiClick} /> : null}
                            <input id="myInput"
                                type="file"
                                accept="image/*"
                                ref={(ref) => this.uploadImg = ref}
                                style={{ display: 'none' }}
                                onChange={(e) => this.handleUploadFile(e, e.target.files[0], ChatType.IMAGE)}
                            />
                            <input id="myInput"
                                type="file"
                                ref={(ref) => this.uploadFile = ref}
                                style={{ display: 'none' }}
                                onChange={(e) => this.handleUploadFile(e, e.target.files[0], ChatType.FILE)}
                            />
                            </FormControl>*/}
                        {
                            sizeAlert ?
                                <Alert
                                    action={
                                        <IconButton
                                            aria-label="close"
                                            color="inherit"
                                            size="small"
                                            onClick={() => {
                                                this.setState({ sizeAlert: false })
                                            }}
                                        >
                                            <CloseIcon fontSize="inherit" />
                                        </IconButton>
                                    }
                                    severity="warning"
                                >
                                    <AlertTitle>Warning</AlertTitle>
                            File can not be larger than {FILE_SIZE_LIMIT / 1000000}MB!
              </Alert> : null
                        }
                    </div>
                </DragAndDrop>
            </>
        )
    }
}

const mapStateToProps = (state) => {
    logger.log(state);
    return {
        peers: state.peers,
        canvasUrl: state.canvas.canvasUrl,
        // updateCanvasUrl: state.canvas.updateCanvasUrl,
        isUrlReady: state.canvas.isUrlReady,
    }
};

// const mapDispatchToProps = (dispatch) => {
//     return {
//         updateCanvasUrl: dispatch(updateCanvasUrl()),
//     }
// }

ChatBox.contextType=ThemeContext

export default connect(mapStateToProps)(withStyles(styles)(withRoomContext(ChatBox)));
