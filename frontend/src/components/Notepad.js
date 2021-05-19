import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import Logger from '../Logger';
import { Button, IconButton, makeStyles, Toolbar } from '@material-ui/core';
import SaveAltIcon from '@material-ui/icons/SaveAlt';
import "./Notepad.css";

const logger = new Logger('Notepad');

const useStyles = makeStyles({
    outterDiv: {
        // position: 'relative',
        width: '500px',
        height: '600px',
        backgroundColor: 'white',
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
    text: {
        resize: 'none',
        outline: '0 none',
        width: '100%',
        padding: '0',
        border: '0 none',
        margin: '0',
        height: 'auto',
        maxHeight: '510px',
        fontSize: '1rem',
    }
});

const Notepad = (props) => {
    const classes = useStyles();
    const [value, setValue] = useState('');
    const handleTextarea = (val) => {
        // const textarea = document.getElementById('text');
        // textarea.style.height = textarea.scrollHeight + 'px';
        setValue(val);
    }
    const saveNotes = () => {
        const element = document.getElementById('saveNotepad');
        const file = new Blob([value], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = "EdvoraNotes.txt";
        element.click();
    }
    const focusTextarea = () => {
        logger.log('Div is clicked');
        const textarea = document.getElementById('text');
        textarea.focus();
    }
    return (
        <div className="CP" onClick={() => focusTextarea()}>
            <div className="room-CP as" >
                <h3>Notepad</h3>
                <IconButton disabled={value.length === 0} onClick={() => saveNotes()} style={{ color: 'white' }}>
                    <SaveAltIcon />
                    <a id='saveNotepad' />
                </IconButton>
            </div>
            <div className="notepad-box" onClick={() => focusTextarea()}>
                <textarea id="text" value={value} onChange={(e) => { handleTextarea(e.target.value) }}  placeholder="Type your Notes here..." />
            </div>
        </div>
    )
}

Notepad.propTypes = {

}

export default Notepad;

