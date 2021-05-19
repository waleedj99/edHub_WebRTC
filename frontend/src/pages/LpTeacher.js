import React,{useState} from 'react'
import {ReactComponent as VLogo} from "../Assets/Icons/Virtuoso-Logo.svg"
import Logger from '../Logger';
import {useThemeContent}from "../Utils/ThemeContext"
const limit = 150;
const logger = new Logger('LpTeacher');

const LpTeacher = () => {
    const darkmode=useThemeContent();
   const [count, setCount] = useState(limit);
   const [content, setContent] = React.useState("");
   function handleText(e){
       let text = e.target.value;
       text = text.slice(0,limit);
       logger.log(text.length,limit,text);
       setContent(text);
       setCount(limit-text.length);
    }
    return (
        <div className="lp-logo">
            <VLogo/>
            <p className={darkmode?"":"d3d3d3"}>Enter the topic</p>
            <textarea className="lp-text" onChange={e=>handleText(e)} value={content}/>
            <span className="lp-count">{count}</span>
            
        </div>
    )
}

export default LpTeacher
