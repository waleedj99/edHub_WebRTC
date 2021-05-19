import React from 'react'

const Pollsmodal = () => {
    
    return (
        <div className="poll-modal">
            <h1 className="plm-h1">Create Poll</h1>
            <input type="text" className="plm-textbox"></input>
        <div className="plm-div"> <div className="plm-option">A</div> Option </div>
    
        <span className="plm-addq"><u>+Add Question</u></span>
       <button className="plm-cancel">Cancel</button>
        <button className="plm-create">Create</button>
        </div>
    )
}

export default Pollsmodal
