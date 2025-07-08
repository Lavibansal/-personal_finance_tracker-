import React, { useEffect } from "react";
import "./styles.css";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../Firebase";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";
import LoanReminder from "../../LoanReminder";

function Header({ loans = [] }){
    const [user, loading] = useAuthState(auth);
    const navigate = useNavigate();
    
    useEffect(()=>{
        if(user){
            navigate("/dashboard");
        }
    },[user,loading]);

    function logoutfnc(){
        try{
            signOut(auth)
            .then(()=>{
                toast.success("Logout successfully");
                navigate("/");
            })
        }catch(error){
            console.error("Error during logout:", error);
            toast.error("Logout failed");   
        }
      console.log("logout");
        alert("logout");
    }

    return (
        <div className="navbar">
        <p className="logo">my buddy</p>
            {user && (
                <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                    <LoanReminder loans={loans} />
                    <img 
                        src={user.photoURL || "https://via.placeholder.com/32x32/6366f1/ffffff?text=U"}
                        height="2rem"
                        width="2rem"
                        style={{ borderRadius: "50%" }}
                        alt="User"
                    />
                    <p className="logo link" onClick={logoutfnc}>Logout</p>
                </div>
            )}
        </div>
    );
}

export default Header;