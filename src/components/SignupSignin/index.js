import React, { useState } from "react";
import "./styles.css";
import Input from "../input";
import Button from "../Button";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, provider } from "../../Firebase";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../Firebase";

function SignupSignincomponent() {
    const [name, setName] = useState("");
    const [Email, setEmail] = useState("");
    const [Password, setPassword] = useState("");
    const [Confirmpassword, setConfirmpassword] = useState("");
    const [loginForm, setLoginForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    function signupWithEmail(e) {
        e.preventDefault();
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(Email)) {
            toast.error('Please enter a valid email address.');
            setLoading(false);
            return;
        }
        // Password strength validation
        if (Password.length < 8 || !/[A-Z]/.test(Password) || !/[0-9]/.test(Password)) {
            toast.error('Password must be at least 8 characters, include a number and an uppercase letter.');
            setLoading(false);
            return;
        }
        console.log("Name", name);
        console.log("Email", Email);
        console.log("Password", Password);
        console.log("Confirmpassword", Confirmpassword);
        if (name !== "" && Email !== "" && Password !== "" && Confirmpassword !== "") {
            if (Password === Confirmpassword) {
                setLoading(true);
                createUserWithEmailAndPassword(auth, Email, Password)
                    .then((userCrential) => {
                        const user = userCrential.user;
                        console.log("user>>>", user);
                        toast.success("user created !");
                        setLoading(false);
                        setName("");
                        setPassword("");
                        setEmail("");
                        setConfirmpassword("");
                        createDoc(user);
                        navigate("/dashboard");
                    })
                    .catch((error) => {
                        const errorCode = error.code;
                        const errorMessage = error.message;
                        toast.error(errorMessage);
                        setLoading(false);
                    });
            } else {
                toast.error("Password and confirm Password don't match");
                setLoading(false);
            }
        } else {
            toast.error("All fields are mandatory");
            setLoading(false);
        }
    }
     
    function loginUsingEmail() {
        console.log("Email", Email);
        console.log("password", Password);
        setLoading(true);
        if (Email !== "" && Password !== "") {
            signInWithEmailAndPassword(auth, Email, Password)
                .then((userCrential) => {
                    const user = userCrential.user;
                    toast.success("user Logged in");
                    console.log("user Loggin in", user);
                    setLoading(false);
                    navigate("/dashboard");
                })
                .catch((error) => {
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    setLoading(false);
                    toast.error(errorMessage);
                });
        } else {
            toast.error("All fields are mandatory ");
            setLoading(false);
        }
    }

    async function createDoc(user) {
        setLoading(true);
        if (!user)
            return;
        const userRef = doc(db, "users", user.uid);
        const userData = await getDoc(userRef);
        if (!userData.exists()) {
            try {
                await setDoc(doc(db, "users", user.uid), {
                    name: user.displayName ? user.displayName : name,
                    Email: user.email,
                    photoURL: user.photoURL ? user.photoURL : "",
                    createdAt: new Date(),
                });
                toast.success("Doc created");
                setLoading(false);
            }
            catch (e) {
                toast.error('Failed to create user document: ' + e.message);
                setLoading(false);
            }
        } else {
            toast.error("Doc already exists");
            setLoading(false);
        }
    }

    function googleAuth() {
        setLoading(true);
        try {
            signInWithPopup(auth, provider)
                .then((result) => {
                    const credential = GoogleAuthProvider.credentialFromResult(result);
                    const token = credential.accessToken;
                    const user = result.user;
                    console.log("user>>>", user);
                    createDoc(user);
                    setLoading(false);
                    navigate("/dashboard");
                    toast.success("user AuthCredented! ")
                }).catch((error) => {
                    setLoading(false);
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    toast.error(errorMessage);
                    const email = error.customData.email;
                    const credential = GoogleAuthProvider.credentialFromError(error);
                });
        }
        catch (e) {
            toast.error(e.message);
        }
    }
    return (
        <>
            {loginForm ? (
                <div className="signup-wrapper">
                    <h2 className="title">
                        Login on <span style={{ color: "var(--theme)" }}>my buddy</span>
                    </h2>
                    <form onSubmit={loginUsingEmail}>
                        <Input
                            type="Email"
                            label={"Email"}
                            state={Email}
                            setState={setEmail}
                            placeholder={"lavibansal@37gmailcom"}
                        />
                        <Input
                            type="Password"
                            label={"Password"}
                            state={Password}
                            setState={setPassword}
                            placeholder={"@1234lavi"}
                        />
                        <Button 
                            disabled={loading}
                            text={loading ? "loading..." : "Login using Email and Password"}
                            onClick={loginUsingEmail}
                        />
                        <p className="p-login">OR</p>
                        <Button onClick={googleAuth} text={loading ? "loading..." : "Login Using Google "} blue={true} />
                        <p className="p-login" style={{cursor:"pointer"}} onClick={()=>setLoginForm(!loginForm)}>Or  Don't Have an account  ? click here</p>
                    </form>
                </div>
            ) : (
                <div className="signup-wrapper">
                    <h2 className="title">
                        signup on <span style={{ color: "var(--theme)" }}>my buddy</span>
                    </h2>
                    <form onSubmit={signupWithEmail}>
                        <Input
                            label={"full name"}
                            state={name}
                            setState={setName}
                            placeholder={"lavi bansal"}
                        />
                        <Input
                            type="Email"
                            label={"Email"}
                            state={Email}
                            setState={setEmail}
                            placeholder={"lavibansal@37gmailcom"}
                        />
                        <Input
                            type="Password"
                            label={"Password"}
                            state={Password}
                            setState={setPassword}
                            placeholder={"@1234lavi"}
                        />
                        <Input
                            type="Password"
                            label={"Confirm Password"}
                            state={Confirmpassword}
                            setState={setConfirmpassword}
                            placeholder={"@1234lavi"}
                        />
                        <Button 
                            disabled={loading}
                            text={loading ? "loading..." : "sign Up using Email and Password"}
                            onClick={signupWithEmail}
                        />
                        <p style={{textAlign:"center",margin:0}}>OR</p>
                        <Button onClick={googleAuth} text={loading ? "loading..." : "Sign Up Using Google "} blue={true} />
                        <p className="p-login" style={{cursor:"pointer"}} onClick={()=>setLoginForm(!loginForm)}>Or  Have an account  ? click here</p>
                    </form>
                </div>
            )}
        </>
    );
}
export default SignupSignincomponent;