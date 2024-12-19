import React, { memo } from "react";
import TeamData from "./assets/TeamData.js"
import TeamMember from "./Component/TeamMember.jsx";

function AboutData (){
    return(
        <div className="container my-5">
            <h1 className="mb-4"> About</h1>
            <p className="mb-4">We are a team of passionate professionals dedicated to delivering high-quality solutions.</p>
            <div className="row">
                {TeamData.map(member =>(
                    <div key={member.id}  className="col-md-6">
                    <TeamMember
                    name={member.name}
                    role={member.role}
                    />
                    </div>
                ))}

            </div>
        </div>
    );
};

export default AboutData;