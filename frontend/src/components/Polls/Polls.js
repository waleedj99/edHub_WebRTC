import React from 'react'
import "./Polls.css"

const Polls = () => {
    return (
        <div className="trial">
            {/* View One */}
<div className="pl-outdiv">
            <h2>Polls</h2>
            <div className="pl-b1">
                <h3>Select</h3>
                <button>Publish</button>
            </div>
            <div className="pl-white">
                <div className="pl-wd">
                <div><p className="pl-white-p">Option 1</p>
                    </div>
                <div className="pl-live">Live</div>
                    </div>
            </div>

            <div className="pl-bottom"><button className="button1">Create Poll</button></div>
            
        </div>


          {/* View two */}

        <div className="pl-outdiv">
            <h2>Polls</h2>
            <div className="pl-b1">
                <h3>Poll title</h3>

            </div>
            <div className="pl-white">
                <div className="pl-wd">
                <div><p className="pl-white-p">Who should sit on the Game of Throne?</p>
                <hr  className="pl-hr"/>
                    </div>
                    
                   
                    </div>

                    <div className="pl-wd">
                <div style={{width:"100%", display:'flex'}}><div className="pl-option"> A</div><p className="pl-white-p">Not JOffery</p>
                                    </div>
                    
                   
                    </div>  
                    <hr className="pl-hr"/>
            </div>

            <div className="pl-bottom"><button className="button1">Launch Poll</button></div>
            
        </div>

        </div>
        
    )
}

export default Polls
