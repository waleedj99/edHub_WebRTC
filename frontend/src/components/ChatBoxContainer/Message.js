import React from 'react';
import { Box, makeStyles } from '@material-ui/core';
import Image from 'material-ui-image'
import { ChatType } from '../../Utils/Constants';

// const defaultProps = {
//     bgcolor: 'blue',
//     m: 1,
//     p: 1.5,
//     color: "white",
// };

const useStyles = makeStyles({
    selfChatContainer: {
        marginTop: '16px',
        marginBottom: '16px',
        marginLeft: 'auto',
        color: '#484848',
        width: 'fit-content',
        wordBreak: 'break-word',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'row-reverse',
    },
    chatContainer: {
        marginTop: '16px',
        marginBottom: '16px',
        marginRight: 'auto',
        width: 'fit-content',
        wordBreak: 'break-word',
        textAlign: 'left',
        display: 'flex',
        color: '#484848',
    },
    selfChatBubble: {
        backgroundColor: '#733D47',
        borderRadius: '16px',
        paddingTop: '8px',
        paddingBottom:'8px',
        paddingRight:'9px',
        paddingLeft:'9px',
        fontSize:'13px',
        color:"white"
    },
    chatBubble: {
        backgroundColor: '#F2D8D5',
        color: '#484848',
        borderRadius: '16px',
        paddingTop: '8px',
        paddingBottom:'8px',
        paddingRight:'9px',
        paddingLeft:'9px',
        fontSize:'13px',
        color:"#733D47"
    }
});

const Message = (props) => {
    const classes = useStyles();
    const { message } = props;
    return (
        message.sender === 'me' ?
            <div className={classes.selfChatContainer}>
                <div className="mess-maxwidth">
                    {message.type === ChatType.TEXT ?
                        <div className={classes.selfChatBubble}>
                            {message.chat}
                        </div> :
                        message.type === ChatType.IMAGE ?
                            <a href={message.chat} download>
                                <img src={message.chat} style={{
                                    height: 'auto', width: '200px', padding: '4px',
                                    backgroundColor: 'white',
                                    borderRadius: '16px'
                                }}
                                />
                            </a>
                            :
                            <div className={classes.selfChatBubble}>
                                <a href={message.chat} target="_blank">{message.chat}</a>
                            </div>
                    }
                </div>
                <div style={{ color:"#BF9B9B",fontSize:"10px",alignSelf: 'flex-end', margin: '8px' }}>
                    {message.dateTime}
                </div>
            </div>
            :
            <div className={classes.chatContainer}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    {message.to === 'Everyone' ?
                        <div className="mess-name" style={{ margin: '4px', }}>
                            {message.sender}
                        </div> :
                        null
                    }
                    <div className="mess-maxwidth">
                    {message.type === ChatType.TEXT ?
                        <div className={classes.chatBubble} >
                            {message.chat}
                        </div> :
                        message.type === ChatType.IMAGE ?
                            <a href={message.chat} download>
                                <img src={message.chat} style={{
                                    height: 'auto', width: '200px', padding: '4px',
                                    backgroundColor: '#efd5d2', color: '#484848',
                                    borderRadius: '16px'
                                }} /></a> :
                            <div className={classes.chatBubble}>
                                <a href={message.chat} target="_blank">{message.chat}</a>
                            </div>
                    }
                    </div>

                </div>
                <div className="mess-time" style={{color:"#BF9B9B",fontSize:"10px", alignSelf: 'flex-end', margin: '8px' }}>
                    {message.dateTime}
                </div>
            </div>
    );
}

export default Message;