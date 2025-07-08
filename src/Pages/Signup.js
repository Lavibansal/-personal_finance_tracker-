import React from "react";
import Header from "../components/Header/Header";
import SignupSignincomponent from "../components/SignupSignin";
function Signup(){
    return <div>
        <Header />
        <div className="wrapper">
            <SignupSignincomponent/>
        </div>
    </div>
}
export default Signup;