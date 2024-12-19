import React from "react";
import { PropTypes } from "prop-types";


const TeamMember =({name, role}) =>{
    return(
        <div className="col-md-8">
          <div className="card-body">
            <h5 className="card-title">{name}</h5>
            <p className="card-text"><small className="text-muted">{role}</small></p>
            
          </div>
        </div>

    );
};

TeamMember.propTypes ={
    name: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
};

export default TeamMember;