import React,{useRef,useState} from 'react'
import IdleTimer from 'react-idle-timer'

const IdleTimerContainer = () => {
    const [mouseactivity, setMouseactivity] = useState(false)
    const idleTimerRef = useRef(null)
    const onIdle = ()=>{
       setMouseactivity(true);
    }
    

    return (
        <div>
<IdleTimer ref={idleTimerRef} timeout={2*1000} onIdle={onIdle} onActive={()=>setMouseactivity(false)}/>    
this is activity
{mouseactivity? <p>inactive</p>:<p>active</p>}        
        </div>
    )
}

export default IdleTimerContainer
