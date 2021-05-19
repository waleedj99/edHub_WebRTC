import React from 'react'
import "./Modal.css"
const Modal = () => {
    return (
        <div className="trialstuff">
            All Modal Designs here 
            <div className="modal-savelecture">
                <div>
                    <h3 className="modal-h3">Save Lecture</h3>
                    <hr className="sl-hr"/>
                </div>
                <div className="modal-sldiv">
                <div className="modal-sldiv2">File Name <input type="text" className="sl-filename"/></div>
                <div className="modal-sldiv2">Description <textarea className="sl-desc"/></div>

                </div>

            </div> 

            {/*warnings*/}
            <div className="war-join"> <span style={{color:" #733D47"}}>Member one </span>  was'nt able to join</div>
            <div className="war-poll"> <span style={{color:" #733D47"}}>Your poll wasnt created. Try again in some time</span></div>

        </div>
    )
}

export default Modal
