import { useEffect } from "react"; 
import { useNavigate } from "react-router-dom";

function Landing(){
    const navigate = useNavigate();

    useEffect(()=>{
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if(isMobile){
            navigate('/play')
        }else{
            navigate('/host')
        }
    },[])

    return(
        <></>
    )
}

export default Landing;
