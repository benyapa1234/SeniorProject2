import React, { useState, useEffect } from 'react';
import { GoogleLogin, GoogleLogout } from 'react-google-login';
import { gapi } from 'gapi-script';
import axios from 'axios';

function Login({ setRole }) { // รับ setRole เป็น props จาก App.js
  const clientId = "958902418959-llvaof6d4td6cicvdd27fltshv63rudo.apps.googleusercontent.com";
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const initClient = () => {
      gapi.client.init({
        clientId: clientId,
        scope: ''
      }).then(() => {
        console.log("GAPI client initialized");
      }).catch((error) => {
        console.error("Error initializing GAPI client", error);
      });
    };
    gapi.load("client:auth2", initClient);
  }, [clientId]);

  const fetchUserRole = async (email) => {
    try {
      const response = await axios.get('http://localhost:8000/getUserRole', { params: { email } });
      const role = response.data.role;
      setProfile(prevProfile => ({ ...prevProfile, role }));
      setRole(role); // อัพเดต role ใน App.js
    } catch (error) {
      console.error('Error fetching role:', error);
    }
  };

  const onGoogleSuccess = async (res) => {
    const { profileObj, tokenId } = res;

    try {
      const response = await axios.post('http://localhost:8000/login', {
        id: profileObj.googleId,
        email: profileObj.email,
        name: profileObj.name,
        token: tokenId
      });

      const role = response.data.role;
      setProfile({ ...profileObj, role });
      setRole(role); // อัพเดต role ใน App.js

      // Fetch updated role after login
      fetchUserRole(profileObj.email);
    } catch (error) {
      console.error('Error during backend authentication:', error.message);
    }
  };

  const onGoogleFailure = (res) => {
    console.log('Google login failed:', res);
  };

  const handleLogout = () => {
    setProfile(null);
    setRole(null); // รีเซ็ต role ใน App.js
    console.log('Google logout success');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>LOGIN</h1>
        <div className="login-buttons">
          {!profile ? (
            <GoogleLogin
              clientId={clientId}
              buttonText="Sign in with Google"
              onSuccess={onGoogleSuccess}
              onFailure={onGoogleFailure}
              cookiePolicy={'single_host_origin'}
              isSignedIn={true}
            />
          ) : (
            <div>
              <h2>Welcome, {profile.name}</h2>
              <p>Email: {profile.email}</p>
              <p>Role: {profile.role}</p>
              
              <GoogleLogout
                clientId={clientId}
                buttonText="Logout from Google"
                onLogoutSuccess={handleLogout}
              />
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default Login;
